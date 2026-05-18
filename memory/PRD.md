# LoadLink - Truck Load Marketplace

## Overview
Mobile app (Expo React Native) for Indian truck operators to monetize excess truck space by posting available loads and discovering loads from others.

## Features
- **Phone OTP Verification** (first launch): Firebase Phone Auth — user enters 10-digit number with +91 prefix, receives SMS OTP, verifies with 6-digit code. Backend verifies Firebase ID token via firebase-admin.
- **Profile Setup**: Name, phone (auto-filled & read-only from verified Firebase phone), company name stored in AsyncStorage. Both `profile` AND `phoneVerified` must exist to skip OTP on next launch.
- **Post Load Screen**: Origin/Destination Pincode (with India Post API city/state lookup), Cargo Types (multi-select chips: Bags/Carton/Pipes/Drums/Irregular), Cargo Placement (Stackable/Floor Only segmented control), Weight (tons), Space (cu ft), Loading Date (date picker).
- **Load Market Screen**: Lists all posted loads (shared via backend MongoDB), with poster name/company/phone, route info (city/state from pincode), cargo specs, "Call" button (opens dialer), filter by origin/destination pincode, pull-to-refresh.
- Tab navigation between Post Load and Load Market.
- Edit profile via header avatar (keeps verified phone intact — only name/company can be changed).

## Tech Stack
- Frontend: Expo (React Native), expo-router, AsyncStorage, @react-native-community/datetimepicker, @expo/vector-icons.
- Backend: FastAPI + MongoDB (motor).
- External API: api.postalpincode.in (free, no auth) for pincode → city/state.

## API Endpoints
- `GET /api/` — health check
- `GET /api/pincode/{pincode}` — returns `{pincode, city, state, valid}`
- `POST /api/loads` — create a load
- `GET /api/loads?origin=...&destination=...` — list loads (newest first), optional filters

## Data Model (`loads` collection)
```
id, origin_pincode, origin_city, origin_state, destination_pincode,
destination_city, destination_state, cargo_types[], cargo_placement,
weight_tons, space_cuft, loading_date, poster_name, poster_phone,
poster_company, created_at
```

## Design
Theme: Light "Swiss/High-Contrast" — Navy primary `#0A2463`, safety orange accent `#FF6B35`, success green `#248232`, large 44pt+ tap targets, system font.
