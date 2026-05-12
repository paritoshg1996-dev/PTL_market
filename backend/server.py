from fastapi import FastAPI, APIRouter, HTTPException, Query, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import requests


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(
    mongo_url,
    tlsAllowInvalidCertificates=True
)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===== Models =====
class LoadCreate(BaseModel):
    origin_pincode: str
    origin_city: Optional[str] = ""
    origin_state: Optional[str] = ""
    destination_pincode: str
    destination_city: Optional[str] = ""
    destination_state: Optional[str] = ""
    cargo_types: List[str] = []
    cargo_placement: str = ""
    truck_type: str = ""
    weight_tons: float
    space_cuft: Optional[float] = None
    loading_date: str
    poster_name: str
    poster_phone: str
    poster_company: Optional[str] = ""
    images: List[str] = []


class Load(LoadCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PincodeInfo(BaseModel):
    pincode: str
    city: str
    state: str
    valid: bool


# ===== Routes =====
@api_router.get("/")
async def root():
    return {"message": "Truck Load Marketplace API"}


@api_router.get("/pincode/{pincode}", response_model=PincodeInfo)
async def lookup_pincode(pincode: str):
    """Look up Indian pincode and return city/state."""
    if not (pincode.isdigit() and len(pincode) == 6):
        raise HTTPException(status_code=400, detail="Pincode must be 6 digits")
    try:
        resp = requests.get(
            f"https://api.postalpincode.in/pincode/{pincode}",
            timeout=8,
            headers={"User-Agent": "LoadLink/1.0"},
        )
        data = resp.json()
        if isinstance(data, list) and data and data[0].get("Status") == "Success":
            offices = data[0].get("PostOffice") or []
            if offices:
                first = offices[0]
                return PincodeInfo(
                    pincode=pincode,
                    city=first.get("District") or first.get("Block") or "",
                    state=first.get("State") or "",
                    valid=True,
                )
        return PincodeInfo(pincode=pincode, city="", state="", valid=False)
    except Exception as e:
        logger.warning(f"Pincode lookup failed: {e}")
        return PincodeInfo(pincode=pincode, city="", state="", valid=False)


class CitySuggestion(BaseModel):
    name: str
    city: str
    state: str
    pincode: str


@api_router.get("/city/{name}", response_model=List[CitySuggestion])
async def search_city(name: str):
    """Search post offices / areas by name and return matching pincodes."""
    name = (name or "").strip()
    if len(name) < 3:
        return []
    try:
        resp = requests.get(
            f"https://api.postalpincode.in/postoffice/{name}",
            timeout=8,
            headers={"User-Agent": "LoadLink/1.0"},
        )
        data = resp.json()
        out: List[CitySuggestion] = []
        if isinstance(data, list) and data and data[0].get("Status") == "Success":
            seen = set()
            for office in (data[0].get("PostOffice") or []):
                pin = office.get("Pincode") or ""
                area = office.get("Name") or ""
                key = (area, pin)
                if not pin or key in seen:
                    continue
                seen.add(key)
                out.append(CitySuggestion(
                    name=area,
                    city=office.get("District") or office.get("Block") or "",
                    state=office.get("State") or "",
                    pincode=pin,
                ))
                if len(out) >= 25:
                    break
        return out
    except Exception as e:
        logger.warning(f"City search failed: {e}")
        return []


class GeoInfo(BaseModel):
    pincode: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    found: bool = False


@api_router.get("/geocode/{pincode}", response_model=GeoInfo)
async def geocode_pincode(pincode: str):
    """Resolve an Indian pincode to lat/lon. Cached in Mongo."""
    if not (pincode.isdigit() and len(pincode) == 6):
        raise HTTPException(status_code=400, detail="Pincode must be 6 digits")

    cached = await db.pincode_geo.find_one({"pincode": pincode}, {"_id": 0})
    if cached:
        return GeoInfo(**cached)

    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"postalcode": pincode, "country": "India", "format": "json", "limit": 1},
            timeout=10,
            headers={"User-Agent": "LoadLink/1.0 (loadlink.app)"},
        )
        data = resp.json()
        if isinstance(data, list) and data:
            first = data[0]
            info = GeoInfo(
                pincode=pincode,
                lat=float(first["lat"]),
                lon=float(first["lon"]),
                found=True,
            )
            await db.pincode_geo.insert_one(info.dict())
            return info
        return GeoInfo(pincode=pincode, found=False)
    except Exception as e:
        logger.warning(f"Geocode failed for {pincode}: {e}")
        return GeoInfo(pincode=pincode, found=False)


@api_router.get("/places")
async def places_search(query: str = Query(..., min_length=2)):
    """Proxy Mappls Autosuggest using static key — avoids browser CORS issues."""
    MAPPLS_KEY = os.environ.get("MAPPLS_KEY", "")
    if not MAPPLS_KEY:
        raise HTTPException(status_code=500, detail="MAPPLS_KEY not configured")
    try:
        resp = requests.get(
            "https://atlas.mappls.com/api/places/search/json",
            params={"query": query, "region": "IND", "access_token": MAPPLS_KEY},
            timeout=8,
            headers={"User-Agent": "TruckTraffic/1.0 (trucktraffic.in)"},
        )
        return resp.json()
    except Exception as e:
        logger.warning(f"Places search failed: {e}")
        raise HTTPException(status_code=502, detail="Places search unavailable")


@api_router.post("/loads", response_model=Load)
async def create_load(payload: LoadCreate):
    load = Load(**payload.dict())
    doc = load.dict()
    await db.loads.insert_one(doc)
    return load


@api_router.get("/loads")
async def list_loads(
    origin: Optional[str] = Query(None),
    destination: Optional[str] = Query(None),
):
    today_str = datetime.now(timezone.utc).date().isoformat()
    await db.loads.delete_many({"loading_date": {"$lt": today_str}})

    query = {}
    if origin:
        query["origin_pincode"] = origin
    if destination:
        query["destination_pincode"] = destination

    cursor = db.loads.find(query, {"_id": 0, "images": 0}).sort("created_at", -1).limit(500)
    docs = await cursor.to_list(500)

    ids = [d["id"] for d in docs]
    counts: dict = {}
    if ids:
        cursor2 = db.loads.find({"id": {"$in": ids}}, {"_id": 0, "id": 1, "images": 1})
        async for d in cursor2:
            counts[d["id"]] = len(d.get("images") or [])
    out = []
    for d in docs:
        d["image_count"] = counts.get(d["id"], 0)
        d["images"] = []
        out.append(d)
    return out


@api_router.get("/loads/{load_id}/image/{idx}")
async def get_load_image(load_id: str, idx: int):
    doc = await db.loads.find_one({"id": load_id}, {"_id": 0, "images": 1})
    imgs = (doc or {}).get("images") or []
    if not doc or idx < 0 or idx >= len(imgs):
        raise HTTPException(status_code=404, detail="Image not found")
    data_url = imgs[idx]
    if "," in data_url:
        header, b64 = data_url.split(",", 1)
        mime = "image/jpeg"
        if header.startswith("data:") and ";" in header:
            mime = header[5:].split(";")[0] or "image/jpeg"
    else:
        b64 = data_url
        mime = "image/jpeg"
    try:
        img_bytes = base64.b64decode(b64)
    except Exception:
        raise HTTPException(status_code=500, detail="Bad image data")
    return Response(
        content=img_bytes,
        media_type=mime,
        headers={"Cache-Control": "public, max-age=86400"},
    )


class ShortenRequest(BaseModel):
    url: str


class ShortenResponse(BaseModel):
    url: str
    short: str


@api_router.post("/shorten", response_model=ShortenResponse)
async def shorten_url(payload: ShortenRequest):
    """Shorten a URL via TinyURL (free, no auth). Cached in Mongo."""
    long_url = payload.url
    cached = await db.short_urls.find_one({"url": long_url}, {"_id": 0})
    if cached and cached.get("short"):
        return ShortenResponse(**cached)
    try:
        resp = requests.get(
            "https://tinyurl.com/api-create.php",
            params={"url": long_url},
            timeout=8,
            headers={"User-Agent": "LoadLink/1.0"},
        )
        text = (resp.text or "").strip()
        if resp.status_code == 200 and text.startswith("http"):
            await db.short_urls.insert_one({"url": long_url, "short": text})
            return ShortenResponse(url=long_url, short=text)
    except Exception as e:
        logger.warning(f"Shorten failed: {e}")
    return ShortenResponse(url=long_url, short=long_url)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
