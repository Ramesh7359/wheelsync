from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class TripType(str, enum.Enum):
    LOCAL = "local"
    OUTSTATION = "outstation"
    AIRPORT = "airport"


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Vendor(Base):
    """A fleet owner / vehicle operator who lists vehicles on the platform."""
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    business_name = Column(String(150), nullable=False)  # "Sri Travels", "Ramesh Cabs"
    owner_name = Column(String(100), nullable=False)
    phone = Column(String(15), unique=True, nullable=False, index=True)
    email = Column(String(100))
    password_hash = Column(String(200), nullable=False)

    # Location (pan-India)
    city = Column(String(100), index=True)  # Hyderabad, Mumbai, Delhi...
    state = Column(String(100))
    address = Column(Text)
    pincode = Column(String(10))

    # Business details
    gst_number = Column(String(30))
    description = Column(Text)
    logo_url = Column(String(500))

    # Status
    is_verified = Column(Boolean, default=False)  # admin verifies vendors
    is_active = Column(Boolean, default=True)
    rating = Column(Float, default=5.0)
    total_bookings = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    vehicles = relationship("Vehicle", back_populates="vendor")
    drivers = relationship("Driver", back_populates="vendor")
    pricing_rules = relationship("PricingRule", back_populates="vendor")
    bookings = relationship("Booking", back_populates="vendor")


class VehicleCategory(Base):
    """Platform-wide vehicle categories (admin-managed)."""
    __tablename__ = "vehicle_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # Sedan, SUV, Mini Bus, Tempo Traveller
    description = Column(Text)
    min_seats = Column(Integer, default=4)
    max_seats = Column(Integer, default=4)
    icon = Column(String(50))  # icon name for UI
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    vehicles = relationship("Vehicle", back_populates="category")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("vehicle_categories.id"), nullable=False)
    name = Column(String(100), nullable=False)  # e.g., "Swift Dzire", "Innova Crysta"
    registration_number = Column(String(20), unique=True, nullable=False)
    seating_capacity = Column(Integer, nullable=False)
    ac_available = Column(Boolean, default=True)
    fuel_type = Column(String(20), default="Petrol")  # Petrol, Diesel, CNG, Electric
    photo_url = Column(String(500))
    amenities = Column(Text)  # JSON string: ["AC", "Music System", "USB Charging"]
    is_available = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    vendor = relationship("Vendor", back_populates="vehicles")
    category = relationship("VehicleCategory", back_populates="vehicles")
    bookings = relationship("Booking", back_populates="vehicle")


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), index=True)  # drivers belong to a vendor
    name = Column(String(100), nullable=False)
    phone = Column(String(15), nullable=False)
    email = Column(String(100))
    license_number = Column(String(50), nullable=False)
    photo_url = Column(String(500))
    address = Column(Text)
    is_available = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    rating = Column(Float, default=5.0)
    total_trips = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    vendor = relationship("Vendor", back_populates="drivers")
    bookings = relationship("Booking", back_populates="driver")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(15), unique=True, nullable=False, index=True)
    email = Column(String(100))
    password_hash = Column(String(200))
    city = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    bookings = relationship("Booking", back_populates="customer")


class PricingRule(Base):
    """Pricing set per-vendor per-category per-trip-type."""
    __tablename__ = "pricing_rules"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("vehicle_categories.id"), nullable=False)
    trip_type = Column(String(20), nullable=False)  # local, outstation, airport
    base_fare = Column(Float, default=0)  # Fixed starting fare
    per_km_rate = Column(Float, default=0)  # Rate per kilometre
    per_hour_rate = Column(Float, default=0)  # Rate per hour (for local)
    min_km = Column(Integer, default=0)  # Minimum chargeable km
    min_hours = Column(Integer, default=0)  # Minimum chargeable hours
    driver_allowance = Column(Float, default=0)  # Per day driver allowance
    night_charge = Column(Float, default=0)  # Night halt charge
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    vendor = relationship("Vendor", back_populates="pricing_rules")
    category = relationship("VehicleCategory")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(String(20), unique=True, nullable=False, index=True)  # WS-20260814-001
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    driver_id = Column(Integer, ForeignKey("drivers.id"))
    category_id = Column(Integer, ForeignKey("vehicle_categories.id"), nullable=False)

    # Trip details
    trip_type = Column(String(20), nullable=False)  # local, outstation, airport
    city = Column(String(100), index=True)  # city of the trip
    pickup_location = Column(String(500), nullable=False)
    drop_location = Column(String(500))
    pickup_date = Column(DateTime, nullable=False)
    return_date = Column(DateTime)  # For round trips
    passenger_count = Column(Integer, default=1)

    # Pricing
    estimated_km = Column(Float, default=0)
    estimated_fare = Column(Float, default=0)
    final_fare = Column(Float)
    advance_paid = Column(Float, default=0)
    payment_status = Column(String(20), default="pending")  # pending, partial, paid

    # Status
    status = Column(String(20), default="pending", index=True)
    notes = Column(Text)
    customer_rating = Column(Integer)
    customer_review = Column(Text)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    customer = relationship("Customer", back_populates="bookings")
    vendor = relationship("Vendor", back_populates="bookings")
    vehicle = relationship("Vehicle", back_populates="bookings")
    driver = relationship("Driver", back_populates="bookings")


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    name = Column(String(100))
    role = Column(String(20), default="admin")  # admin, manager
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
