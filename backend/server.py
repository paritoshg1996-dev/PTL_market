from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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
client = AsyncIOMotorClient(mongo_url)
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
    cargo_types: List[str] = []  # legacy / optional
    cargo_placement: str = ""    # legacy / optional
    truck_type: str = ""
    weight_tons: float
    space_cuft: Optional[float] = None
    loading_date: str
    poster_name: str
    poster_phone: str
    poster_company: Optional[str] = ""
    images: List[str] = []  # base64-encoded data URLs (up to 3)


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


class GeoInfo(BaseModel):
    pincode: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    found: bool = False


@api_router.get("/geocode/{pincode}", response_model=GeoInfo)
async def geocode_pincode(pincode: str):
    """Resolve an Indian pincode to lat/lon. Cached in Mongo to respect Nominatim rate limits."""
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
        # Cache negative result briefly to avoid hammering on bad pincodes
        info = GeoInfo(pincode=pincode, found=False)
        return info
    except Exception as e:
        logger.warning(f"Geocode failed for {pincode}: {e}")
        return GeoInfo(pincode=pincode, found=False)


@api_router.post("/loads", response_model=Load)
async def create_load(payload: LoadCreate):
    load = Load(**payload.dict())
    doc = load.dict()
    await db.loads.insert_one(doc)
    return load


@api_router.get("/loads", response_model=List[Load])
async def list_loads(
    origin: Optional[str] = Query(None),
    destination: Optional[str] = Query(None),
):
    query = {}
    if origin:
        query["origin_pincode"] = origin
    if destination:
        query["destination_pincode"] = destination
    cursor = db.loads.find(query, {"_id": 0}).sort("created_at", -1).limit(500)
    docs = await cursor.to_list(500)
    return [Load(**d) for d in docs]


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
