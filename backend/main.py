from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import engine, Base, get_db, SessionLocal
from models import (
    Vendor, VehicleCategory, Vehicle, Driver, Customer,
    PricingRule, Booking, AdminUser
)
from datetime import datetime, timedelta
from typing import Optional
import hashlib
import json
import jwt
import os
import uvicorn

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="WheelSync API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ AUTH CONFIG ============
JWT_SECRET = os.environ.get("JWT_SECRET", "wheelsync-secret-key-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 72


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_token(user_id: int, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired, please login again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_role(role: str):
    def checker(payload: dict = Depends(verify_token)):
        if payload["role"] != role:
            raise HTTPException(status_code=403, detail="Forbidden")
        return payload
    return checker


# ============ SEED DATA ============
@app.on_event("startup")
def seed_data():
    db = SessionLocal()
    try:
        # Categories (platform-wide)
        if db.query(VehicleCategory).count() == 0:
            db.add_all([
                VehicleCategory(name="Sedan", description="Comfortable sedan cars for 4 passengers",
                                min_seats=4, max_seats=4, icon="car"),
                VehicleCategory(name="SUV", description="Spacious SUVs for up to 7 passengers",
                                min_seats=6, max_seats=7, icon="suv"),
                VehicleCategory(name="Mini Bus", description="Mini buses for group travel",
                                min_seats=12, max_seats=18, icon="bus"),
                VehicleCategory(name="Tempo Traveller", description="Tempo travellers for large groups",
                                min_seats=12, max_seats=26, icon="tempo"),
                VehicleCategory(name="Hatchback", description="Budget-friendly compact cars",
                                min_seats=4, max_seats=4, icon="car"),
                VehicleCategory(name="Luxury", description="Premium luxury vehicles",
                                min_seats=4, max_seats=4, icon="car"),
            ])
            db.commit()

        # Admin user
        if db.query(AdminUser).count() == 0:
            db.add(AdminUser(username="admin", password_hash=hash_password("admin123"),
                             name="WheelSync Admin", role="admin"))
            db.commit()

        # Sample vendors across India with vehicles & pricing
        if db.query(Vendor).count() == 0:
            _seed_vendors(db)
    finally:
        db.close()


def _seed_vendors(db):
    sedan = db.query(VehicleCategory).filter_by(name="Sedan").first()
    suv = db.query(VehicleCategory).filter_by(name="SUV").first()
    tempo = db.query(VehicleCategory).filter_by(name="Tempo Traveller").first()

    vendors_data = [
        {
            "business_name": "Sri Balaji Travels", "owner_name": "Ramesh Kumar",
            "phone": "9876500001", "email": "balaji@example.com",
            "city": "Hyderabad", "state": "Telangana", "pincode": "500072",
            "description": "Trusted fleet operator with 15+ years in Hyderabad.",
            "is_verified": True, "rating": 4.7,
            "vehicles": [
                {"cat": sedan, "name": "Swift Dzire", "reg": "TS09AB1234", "seats": 4, "fuel": "Diesel"},
                {"cat": suv, "name": "Toyota Innova Crysta", "reg": "TS09AB5678", "seats": 7, "fuel": "Diesel"},
            ],
            "pricing": [
                {"cat": sedan, "trip": "local", "base": 500, "km": 12, "hr": 100, "minkm": 25, "minhr": 4, "da": 300},
                {"cat": sedan, "trip": "outstation", "base": 1500, "km": 12, "minkm": 250, "da": 400, "night": 300},
                {"cat": sedan, "trip": "airport", "base": 800, "km": 14, "minkm": 20},
                {"cat": suv, "trip": "local", "base": 800, "km": 16, "hr": 150, "minkm": 25, "minhr": 4, "da": 300},
                {"cat": suv, "trip": "outstation", "base": 2500, "km": 16, "minkm": 250, "da": 400, "night": 300},
                {"cat": suv, "trip": "airport", "base": 1200, "km": 18, "minkm": 20},
            ],
        },
        {
            "business_name": "Mumbai Cab Services", "owner_name": "Suresh Patil",
            "phone": "9876500002", "email": "mumbaicabs@example.com",
            "city": "Mumbai", "state": "Maharashtra", "pincode": "400001",
            "description": "Reliable cabs across Mumbai and Pune.",
            "is_verified": True, "rating": 4.5,
            "vehicles": [
                {"cat": sedan, "name": "Honda Amaze", "reg": "MH01CD2345", "seats": 4, "fuel": "Petrol"},
                {"cat": suv, "name": "Mahindra XUV700", "reg": "MH01CD6789", "seats": 7, "fuel": "Diesel"},
            ],
            "pricing": [
                {"cat": sedan, "trip": "local", "base": 600, "km": 14, "hr": 120, "minkm": 25, "minhr": 4, "da": 350},
                {"cat": sedan, "trip": "airport", "base": 900, "km": 16, "minkm": 20},
                {"cat": suv, "trip": "outstation", "base": 3000, "km": 18, "minkm": 250, "da": 500, "night": 400},
            ],
        },
        {
            "business_name": "Delhi Tempo Travellers", "owner_name": "Vikram Singh",
            "phone": "9876500003", "email": "delhitempo@example.com",
            "city": "Delhi", "state": "Delhi", "pincode": "110001",
            "description": "Specialists in group travel and tempo travellers.",
            "is_verified": True, "rating": 4.6,
            "vehicles": [
                {"cat": tempo, "name": "Force Tempo Traveller 17-seater", "reg": "DL01EF3456", "seats": 17, "fuel": "Diesel"},
                {"cat": tempo, "name": "Force Tempo Traveller 26-seater", "reg": "DL01EF7890", "seats": 26, "fuel": "Diesel"},
            ],
            "pricing": [
                {"cat": tempo, "trip": "local", "base": 2000, "km": 22, "hr": 250, "minkm": 50, "minhr": 5, "da": 500},
                {"cat": tempo, "trip": "outstation", "base": 5000, "km": 24, "minkm": 300, "da": 700, "night": 500},
            ],
        },
        {
            "business_name": "Bangalore Rides", "owner_name": "Anil Reddy",
            "phone": "9876500004", "email": "blrides@example.com",
            "city": "Bangalore", "state": "Karnataka", "pincode": "560001",
            "description": "Tech city rides - airport, local and outstation.",
            "is_verified": True, "rating": 4.8,
            "vehicles": [
                {"cat": sedan, "name": "Hyundai Aura", "reg": "KA01GH4567", "seats": 4, "fuel": "CNG"},
                {"cat": suv, "name": "Toyota Fortuner", "reg": "KA01GH8901", "seats": 7, "fuel": "Diesel"},
            ],
            "pricing": [
                {"cat": sedan, "trip": "airport", "base": 850, "km": 15, "minkm": 20},
                {"cat": sedan, "trip": "local", "base": 550, "km": 13, "hr": 110, "minkm": 25, "minhr": 4, "da": 300},
                {"cat": suv, "trip": "outstation", "base": 2800, "km": 17, "minkm": 250, "da": 450, "night": 350},
            ],
        },
    ]

    for vd in vendors_data:
        vendor = Vendor(
            business_name=vd["business_name"], owner_name=vd["owner_name"],
            phone=vd["phone"], email=vd["email"],
            password_hash=hash_password("password123"),
            city=vd["city"], state=vd["state"], pincode=vd["pincode"],
            description=vd["description"], is_verified=vd["is_verified"], rating=vd["rating"],
        )
        db.add(vendor)
        db.commit()
        db.refresh(vendor)

        for v in vd["vehicles"]:
            db.add(Vehicle(
                vendor_id=vendor.id, category_id=v["cat"].id, name=v["name"],
                registration_number=v["reg"], seating_capacity=v["seats"],
                ac_available=True, fuel_type=v["fuel"],
                amenities=json.dumps(["AC", "Music System", "USB Charging"]),
            ))

        for p in vd["pricing"]:
            db.add(PricingRule(
                vendor_id=vendor.id, category_id=p["cat"].id, trip_type=p["trip"],
                base_fare=p["base"], per_km_rate=p["km"], per_hour_rate=p.get("hr", 0),
                min_km=p.get("minkm", 0), min_hours=p.get("minhr", 0),
                driver_allowance=p.get("da", 0), night_charge=p.get("night", 0),
            ))
        db.commit()


# ============ AUTH ENDPOINTS ============
@app.post("/api/auth/vendor/register")
def vendor_register(request: dict, db: Session = Depends(get_db)):
    if db.query(Vendor).filter_by(phone=request.get("phone")).first():
        raise HTTPException(status_code=400, detail="Phone already registered")
    vendor = Vendor(
        business_name=request.get("business_name"),
        owner_name=request.get("owner_name"),
        phone=request.get("phone"),
        email=request.get("email"),
        password_hash=hash_password(request.get("password", "password123")),
        city=request.get("city"),
        state=request.get("state"),
        address=request.get("address"),
        pincode=request.get("pincode"),
        gst_number=request.get("gst_number"),
        description=request.get("description", ""),
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    token = create_token(vendor.id, "vendor")
    return {"message": "Vendor registered successfully", "token": token,
            "user": {"id": vendor.id, "name": vendor.business_name, "role": "vendor",
                     "phone": vendor.phone, "city": vendor.city, "is_verified": vendor.is_verified}}


@app.post("/api/auth/vendor/login")
def vendor_login(request: dict, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter_by(phone=request.get("phone")).first()
    if not vendor or vendor.password_hash != hash_password(request.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    token = create_token(vendor.id, "vendor")
    return {"token": token,
            "user": {"id": vendor.id, "name": vendor.business_name, "role": "vendor",
                     "phone": vendor.phone, "city": vendor.city, "is_verified": vendor.is_verified}}


@app.post("/api/auth/customer/register")
def customer_register(request: dict, db: Session = Depends(get_db)):
    if db.query(Customer).filter_by(phone=request.get("phone")).first():
        raise HTTPException(status_code=400, detail="Phone already registered")
    customer = Customer(
        name=request.get("name"), phone=request.get("phone"),
        email=request.get("email"),
        password_hash=hash_password(request.get("password", "password123")),
        city=request.get("city"),
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    token = create_token(customer.id, "customer")
    return {"message": "Registered successfully", "token": token,
            "user": {"id": customer.id, "name": customer.name, "role": "customer",
                     "phone": customer.phone, "city": customer.city}}


@app.post("/api/auth/customer/login")
def customer_login(request: dict, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter_by(phone=request.get("phone")).first()
    if not customer or customer.password_hash != hash_password(request.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    token = create_token(customer.id, "customer")
    return {"token": token,
            "user": {"id": customer.id, "name": customer.name, "role": "customer",
                     "phone": customer.phone, "city": customer.city}}


@app.post("/api/auth/admin/login")
def admin_login(request: dict, db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter_by(username=request.get("username")).first()
    if not admin or admin.password_hash != hash_password(request.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(admin.id, "admin")
    return {"token": token, "user": {"id": admin.id, "name": admin.name, "role": "admin"}}


# ============ CATEGORY ENDPOINTS ============
@app.get("/api/categories")
def get_categories(db: Session = Depends(get_db)):
    cats = db.query(VehicleCategory).filter_by(is_active=True).all()
    return [{"id": c.id, "name": c.name, "description": c.description,
             "min_seats": c.min_seats, "max_seats": c.max_seats, "icon": c.icon} for c in cats]


@app.post("/api/categories")
def create_category(request: dict, db: Session = Depends(get_db),
                    payload: dict = Depends(require_role("admin"))):
    cat = VehicleCategory(**request)
    db.add(cat)
    db.commit()
    return {"message": "Category created", "id": cat.id}


# ============ CITIES ============
@app.get("/api/cities")
def get_cities(db: Session = Depends(get_db)):
    """Return list of cities that have active, verified vendors."""
    rows = db.query(Vendor.city).filter(
        Vendor.is_active == True, Vendor.is_verified == True, Vendor.city.isnot(None)
    ).distinct().all()
    cities = sorted({r[0] for r in rows if r[0]})
    # Always include common metros as options even if empty
    common = ["Hyderabad", "Mumbai", "Delhi", "Bangalore", "Chennai", "Pune", "Kolkata", "Ahmedabad"]
    for c in common:
        if c not in cities:
            cities.append(c)
    return sorted(cities)


# ============ CUSTOMER-FACING SEARCH ============
@app.get("/api/search")
def search_vehicles(city: str = None, category_id: int = None, trip_type: str = None,
                    db: Session = Depends(get_db)):
    """Customer search: find available vehicles from verified vendors, optionally by city."""
    q = db.query(Vehicle).join(Vendor).filter(
        Vehicle.is_active == True, Vehicle.is_available == True,
        Vendor.is_active == True, Vendor.is_verified == True
    )
    if city:
        q = q.filter(Vendor.city.ilike(f"%{city}%"))
    if category_id:
        q = q.filter(Vehicle.category_id == category_id)
    vehicles = q.all()

    results = []
    for v in vehicles:
        # Get a representative price for the requested (or any) trip type
        price_q = db.query(PricingRule).filter_by(
            vendor_id=v.vendor_id, category_id=v.category_id, is_active=True)
        if trip_type:
            price_q = price_q.filter_by(trip_type=trip_type)
        pricing = price_q.first()

        results.append({
            "vehicle_id": v.id, "name": v.name,
            "category": v.category.name, "category_id": v.category_id,
            "seating_capacity": v.seating_capacity, "ac_available": v.ac_available,
            "fuel_type": v.fuel_type, "photo_url": v.photo_url,
            "amenities": json.loads(v.amenities) if v.amenities else [],
            "vendor_id": v.vendor_id, "vendor_name": v.vendor.business_name,
            "vendor_city": v.vendor.city, "vendor_rating": v.vendor.rating,
            "vendor_verified": v.vendor.is_verified,
            "base_fare": pricing.base_fare if pricing else None,
            "per_km_rate": pricing.per_km_rate if pricing else None,
        })
    # Sort by vendor rating desc
    results.sort(key=lambda x: x["vendor_rating"] or 0, reverse=True)
    return results


# ============ FARE ESTIMATE ============
@app.get("/api/pricing/estimate")
def estimate_fare(vendor_id: int, category_id: int, trip_type: str,
                  km: float = 0, hours: float = 0, days: int = 1,
                  db: Session = Depends(get_db)):
    rule = db.query(PricingRule).filter_by(
        vendor_id=vendor_id, category_id=category_id, trip_type=trip_type, is_active=True
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Pricing not available for this option")

    chargeable_km = max(km, rule.min_km)

    if trip_type == "local":
        fare = rule.base_fare + (chargeable_km * rule.per_km_rate)
        if hours > rule.min_hours:
            fare += (hours - rule.min_hours) * rule.per_hour_rate
    elif trip_type == "outstation":
        fare = rule.base_fare + (chargeable_km * rule.per_km_rate)
        fare += rule.driver_allowance * days
        if days > 1:
            fare += rule.night_charge * (days - 1)
    elif trip_type == "airport":
        fare = rule.base_fare + (chargeable_km * rule.per_km_rate)
    else:
        fare = rule.base_fare

    return {
        "estimated_fare": round(fare, 2),
        "base_fare": rule.base_fare,
        "per_km_rate": rule.per_km_rate,
        "chargeable_km": chargeable_km,
        "driver_allowance": rule.driver_allowance * days if trip_type == "outstation" else 0,
        "night_charge": rule.night_charge * max(0, days - 1) if trip_type == "outstation" else 0,
        "breakdown": f"Base Rs.{rule.base_fare} + {chargeable_km}km x Rs.{rule.per_km_rate}"
    }


# ============ VENDOR: MANAGE OWN VEHICLES ============
@app.get("/api/vendor/vehicles")
def vendor_vehicles(db: Session = Depends(get_db), payload: dict = Depends(require_role("vendor"))):
    vehicles = db.query(Vehicle).filter_by(vendor_id=payload["user_id"]).all()
    return [{"id": v.id, "name": v.name, "category": v.category.name, "category_id": v.category_id,
             "registration_number": v.registration_number, "seating_capacity": v.seating_capacity,
             "ac_available": v.ac_available, "fuel_type": v.fuel_type,
             "is_available": v.is_available, "is_active": v.is_active,
             "amenities": json.loads(v.amenities) if v.amenities else []} for v in vehicles]


@app.post("/api/vendor/vehicles")
def vendor_add_vehicle(request: dict, db: Session = Depends(get_db),
                       payload: dict = Depends(require_role("vendor"))):
    if db.query(Vehicle).filter_by(registration_number=request.get("registration_number")).first():
        raise HTTPException(status_code=400, detail="Vehicle with this registration already exists")
    vehicle = Vehicle(
        vendor_id=payload["user_id"],
        category_id=request.get("category_id"),
        name=request.get("name"),
        registration_number=request.get("registration_number"),
        seating_capacity=request.get("seating_capacity"),
        ac_available=request.get("ac_available", True),
        fuel_type=request.get("fuel_type", "Petrol"),
        amenities=json.dumps(request.get("amenities", [])),
    )
    db.add(vehicle)
    db.commit()
    return {"message": "Vehicle added", "id": vehicle.id}


@app.put("/api/vendor/vehicles/{vehicle_id}")
def vendor_update_vehicle(vehicle_id: int, request: dict, db: Session = Depends(get_db),
                          payload: dict = Depends(require_role("vendor"))):
    vehicle = db.query(Vehicle).filter_by(id=vehicle_id, vendor_id=payload["user_id"]).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    for key in ["name", "category_id", "seating_capacity", "ac_available", "fuel_type",
                "is_available", "is_active"]:
        if key in request:
            setattr(vehicle, key, request[key])
    if "amenities" in request:
        vehicle.amenities = json.dumps(request["amenities"])
    db.commit()
    return {"message": "Vehicle updated"}


@app.delete("/api/vendor/vehicles/{vehicle_id}")
def vendor_delete_vehicle(vehicle_id: int, db: Session = Depends(get_db),
                          payload: dict = Depends(require_role("vendor"))):
    vehicle = db.query(Vehicle).filter_by(id=vehicle_id, vendor_id=payload["user_id"]).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    vehicle.is_active = False
    db.commit()
    return {"message": "Vehicle removed"}


# ============ VENDOR: MANAGE PRICING ============
@app.get("/api/vendor/pricing")
def vendor_pricing(db: Session = Depends(get_db), payload: dict = Depends(require_role("vendor"))):
    rules = db.query(PricingRule).filter_by(vendor_id=payload["user_id"], is_active=True).all()
    return [{"id": r.id, "category": r.category.name, "category_id": r.category_id,
             "trip_type": r.trip_type, "base_fare": r.base_fare, "per_km_rate": r.per_km_rate,
             "per_hour_rate": r.per_hour_rate, "min_km": r.min_km, "min_hours": r.min_hours,
             "driver_allowance": r.driver_allowance, "night_charge": r.night_charge} for r in rules]


@app.post("/api/vendor/pricing")
def vendor_set_pricing(request: dict, db: Session = Depends(get_db),
                       payload: dict = Depends(require_role("vendor"))):
    # Upsert: if a rule exists for this category+trip, update it
    existing = db.query(PricingRule).filter_by(
        vendor_id=payload["user_id"], category_id=request.get("category_id"),
        trip_type=request.get("trip_type"), is_active=True
    ).first()
    if existing:
        for key in ["base_fare", "per_km_rate", "per_hour_rate", "min_km", "min_hours",
                    "driver_allowance", "night_charge"]:
            if key in request:
                setattr(existing, key, request[key])
        db.commit()
        return {"message": "Pricing updated", "id": existing.id}

    rule = PricingRule(
        vendor_id=payload["user_id"],
        category_id=request.get("category_id"),
        trip_type=request.get("trip_type"),
        base_fare=request.get("base_fare", 0),
        per_km_rate=request.get("per_km_rate", 0),
        per_hour_rate=request.get("per_hour_rate", 0),
        min_km=request.get("min_km", 0),
        min_hours=request.get("min_hours", 0),
        driver_allowance=request.get("driver_allowance", 0),
        night_charge=request.get("night_charge", 0),
    )
    db.add(rule)
    db.commit()
    return {"message": "Pricing set", "id": rule.id}


# ============ VENDOR: DASHBOARD & BOOKINGS ============
@app.get("/api/vendor/dashboard")
def vendor_dashboard(db: Session = Depends(get_db), payload: dict = Depends(require_role("vendor"))):
    vid = payload["user_id"]
    vendor = db.query(Vendor).get(vid)
    bookings = db.query(Booking).filter_by(vendor_id=vid).order_by(Booking.created_at.desc()).all()
    return {
        "profile": {"id": vendor.id, "business_name": vendor.business_name,
                    "city": vendor.city, "rating": vendor.rating,
                    "is_verified": vendor.is_verified},
        "stats": {
            "total_vehicles": db.query(Vehicle).filter_by(vendor_id=vid, is_active=True).count(),
            "total_bookings": len(bookings),
            "pending": len([b for b in bookings if b.status == "pending"]),
            "completed": len([b for b in bookings if b.status == "completed"]),
        },
        "bookings": [_booking_dict(b, db) for b in bookings[:20]],
    }


@app.put("/api/vendor/bookings/{booking_id}/respond")
def vendor_respond_booking(booking_id: str, request: dict, db: Session = Depends(get_db),
                           payload: dict = Depends(require_role("vendor"))):
    booking = db.query(Booking).filter_by(booking_id=booking_id, vendor_id=payload["user_id"]).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    status = request.get("status")  # confirmed, cancelled, completed
    booking.status = status
    if request.get("vehicle_id"):
        booking.vehicle_id = request["vehicle_id"]
    if request.get("driver_id"):
        booking.driver_id = request["driver_id"]
    if request.get("final_fare"):
        booking.final_fare = request["final_fare"]
    db.commit()
    return {"message": f"Booking {status}"}


# ============ VENDOR: DRIVERS ============
@app.get("/api/vendor/drivers")
def vendor_drivers(db: Session = Depends(get_db), payload: dict = Depends(require_role("vendor"))):
    drivers = db.query(Driver).filter_by(vendor_id=payload["user_id"], is_active=True).all()
    return [{"id": d.id, "name": d.name, "phone": d.phone, "license_number": d.license_number,
             "is_available": d.is_available, "rating": d.rating, "total_trips": d.total_trips}
            for d in drivers]


@app.post("/api/vendor/drivers")
def vendor_add_driver(request: dict, db: Session = Depends(get_db),
                      payload: dict = Depends(require_role("vendor"))):
    driver = Driver(
        vendor_id=payload["user_id"], name=request.get("name"), phone=request.get("phone"),
        email=request.get("email"), license_number=request.get("license_number"),
        address=request.get("address"),
    )
    db.add(driver)
    db.commit()
    return {"message": "Driver added", "id": driver.id}


# ============ CUSTOMER: BOOKINGS ============
def _booking_dict(b, db):
    return {
        "id": b.id, "booking_id": b.booking_id,
        "customer_name": b.customer.name if b.customer else "",
        "customer_phone": b.customer.phone if b.customer else "",
        "vendor_name": b.vendor.business_name if b.vendor else "",
        "vendor_phone": b.vendor.phone if b.vendor else "",
        "category": db.query(VehicleCategory).get(b.category_id).name if b.category_id else "",
        "trip_type": b.trip_type, "city": b.city,
        "pickup_location": b.pickup_location, "drop_location": b.drop_location,
        "pickup_date": b.pickup_date.isoformat() if b.pickup_date else "",
        "return_date": b.return_date.isoformat() if b.return_date else "",
        "passenger_count": b.passenger_count,
        "estimated_km": b.estimated_km, "estimated_fare": b.estimated_fare,
        "final_fare": b.final_fare, "status": b.status,
        "vehicle": b.vehicle.name if b.vehicle else "Not assigned",
        "driver": b.driver.name if b.driver else "Not assigned",
        "notes": b.notes,
        "created_at": b.created_at.isoformat() if b.created_at else "",
    }


@app.post("/api/bookings")
def create_booking(request: dict, db: Session = Depends(get_db)):
    today = datetime.now().strftime("%Y%m%d")
    count = db.query(Booking).filter(Booking.booking_id.like(f"WS-{today}%")).count() + 1
    booking_id = f"WS-{today}-{count:03d}"

    # Find or create customer by phone
    customer = db.query(Customer).filter_by(phone=request.get("phone")).first()
    if not customer:
        customer = Customer(
            name=request.get("customer_name", ""), phone=request.get("phone", ""),
            email=request.get("email", ""), city=request.get("city", ""),
            password_hash=hash_password("password123"),
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

    vendor_id = request.get("vendor_id")
    category_id = request.get("category_id")
    trip_type = request.get("trip_type")
    km = request.get("estimated_km", 0)

    # Compute estimated fare from vendor pricing
    estimated_fare = 0
    rule = db.query(PricingRule).filter_by(
        vendor_id=vendor_id, category_id=category_id, trip_type=trip_type, is_active=True
    ).first()
    if rule:
        chargeable_km = max(km, rule.min_km)
        estimated_fare = rule.base_fare + (chargeable_km * rule.per_km_rate)

    booking = Booking(
        booking_id=booking_id, customer_id=customer.id, vendor_id=vendor_id,
        vehicle_id=request.get("vehicle_id"), category_id=category_id,
        trip_type=trip_type, city=request.get("city", ""),
        pickup_location=request.get("pickup_location", ""),
        drop_location=request.get("drop_location", ""),
        pickup_date=datetime.fromisoformat(request.get("pickup_date")),
        return_date=datetime.fromisoformat(request["return_date"]) if request.get("return_date") else None,
        passenger_count=request.get("passenger_count", 1),
        estimated_km=km, estimated_fare=estimated_fare,
        notes=request.get("notes", ""), status="pending",
    )
    db.add(booking)
    db.commit()
    return {"message": "Booking created successfully", "booking_id": booking_id,
            "estimated_fare": estimated_fare}


@app.get("/api/bookings/my")
def my_bookings(phone: str, db: Session = Depends(get_db)):
    """Customer looks up their bookings by phone (no login needed for quick tracking)."""
    customer = db.query(Customer).filter_by(phone=phone).first()
    if not customer:
        return []
    bookings = db.query(Booking).filter_by(customer_id=customer.id).order_by(
        Booking.created_at.desc()).all()
    return [_booking_dict(b, db) for b in bookings]


@app.put("/api/bookings/{booking_id}/cancel")
def customer_cancel_booking(booking_id: str, request: dict, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter_by(booking_id=booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    # verify by phone
    if booking.customer.phone != request.get("phone"):
        raise HTTPException(status_code=403, detail="Not authorized")
    if booking.status in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel a {booking.status} booking")
    booking.status = "cancelled"
    db.commit()
    return {"message": "Booking cancelled"}


# ============ ADMIN ENDPOINTS ============
@app.get("/api/admin/dashboard")
def admin_dashboard(db: Session = Depends(get_db), payload: dict = Depends(require_role("admin"))):
    return {
        "total_vendors": db.query(Vendor).count(),
        "pending_vendors": db.query(Vendor).filter_by(is_verified=False).count(),
        "total_vehicles": db.query(Vehicle).filter_by(is_active=True).count(),
        "total_customers": db.query(Customer).count(),
        "total_bookings": db.query(Booking).count(),
        "pending_bookings": db.query(Booking).filter_by(status="pending").count(),
        "total_revenue": db.query(func.sum(Booking.final_fare)).filter_by(status="completed").scalar() or 0,
    }


@app.get("/api/admin/vendors")
def admin_vendors(db: Session = Depends(get_db), payload: dict = Depends(require_role("admin"))):
    vendors = db.query(Vendor).order_by(Vendor.created_at.desc()).all()
    return [{"id": v.id, "business_name": v.business_name, "owner_name": v.owner_name,
             "phone": v.phone, "email": v.email, "city": v.city, "state": v.state,
             "is_verified": v.is_verified, "is_active": v.is_active, "rating": v.rating,
             "total_vehicles": db.query(Vehicle).filter_by(vendor_id=v.id, is_active=True).count(),
             "created_at": v.created_at.isoformat() if v.created_at else ""} for v in vendors]


@app.put("/api/admin/vendors/{vendor_id}/verify")
def admin_verify_vendor(vendor_id: int, request: dict, db: Session = Depends(get_db),
                        payload: dict = Depends(require_role("admin"))):
    vendor = db.query(Vendor).get(vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor.is_verified = request.get("is_verified", True)
    db.commit()
    return {"message": "Vendor verification updated"}


@app.get("/api/admin/bookings")
def admin_bookings(status: str = None, db: Session = Depends(get_db),
                   payload: dict = Depends(require_role("admin"))):
    q = db.query(Booking)
    if status:
        q = q.filter_by(status=status)
    bookings = q.order_by(Booking.created_at.desc()).limit(100).all()
    return [_booking_dict(b, db) for b in bookings]


# ============ SERVE FRONTEND ============
# Resolve directories from this file's location (independent of working directory)
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(BACKEND_DIR)
CUSTOMER_DIR = os.path.join(BASE_DIR, "frontend")
VENDOR_DIR = os.path.join(BASE_DIR, "vendor")
ADMIN_DIR = os.path.join(BASE_DIR, "admin")

print(f"[WheelSync] BASE_DIR={BASE_DIR}")
print(f"[WheelSync] frontend exists: {os.path.isdir(CUSTOMER_DIR)} | vendor: {os.path.isdir(VENDOR_DIR)} | admin: {os.path.isdir(ADMIN_DIR)}")


# Redirect /admin and /vendor (no trailing slash) to their index
@app.get("/admin")
def admin_redirect():
    return RedirectResponse(url="/admin/")


@app.get("/vendor")
def vendor_redirect():
    return RedirectResponse(url="/vendor/")


# Explicit root route as a reliable fallback (serves customer index.html)
@app.get("/")
def serve_root():
    index = os.path.join(CUSTOMER_DIR, "index.html")
    if os.path.isfile(index):
        return FileResponse(index)
    raise HTTPException(status_code=404, detail="Frontend not found")


# Mount sub-apps first (more specific paths), customer last (catch-all)
if os.path.isdir(VENDOR_DIR):
    app.mount("/vendor", StaticFiles(directory=VENDOR_DIR, html=True), name="vendor")
if os.path.isdir(ADMIN_DIR):
    app.mount("/admin", StaticFiles(directory=ADMIN_DIR, html=True), name="admin")
if os.path.isdir(CUSTOMER_DIR):
    app.mount("/", StaticFiles(directory=CUSTOMER_DIR, html=True), name="customer")


# ============ RUN SERVER ============
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
