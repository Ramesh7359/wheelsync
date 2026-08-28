# WheelSync — Vehicle Booking Platform

## About
WheelSync is a vehicle booking platform for Hyderabad, offering local rides, outstation trips, and airport transfers across cars, mini buses, and tempo travellers.

## Tech Stack
- **Backend:** Python (FastAPI)
- **Database:** SQLite (dev) / PostgreSQL (production)
- **Frontend:** HTML, CSS, JavaScript (mobile-friendly web app)
- **Payment:** Razorpay integration

## Project Structure
```
wheelsync/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── database.py          # Database connection and models
│   ├── models.py            # SQLAlchemy ORM models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── routes/
│   │   ├── vehicles.py      # Vehicle CRUD endpoints
│   │   ├── bookings.py      # Booking endpoints
│   │   ├── drivers.py       # Driver management
│   │   ├── pricing.py       # Pricing rules
│   │   └── auth.py          # Authentication
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── index.html           # Customer landing page
│   ├── booking.html         # Booking flow
│   ├── my-bookings.html     # Customer booking history
│   ├── css/
│   │   └── style.css        # Styling
│   └── js/
│       └── app.js           # Frontend logic
├── admin/
│   ├── index.html           # Admin dashboard
│   ├── vehicles.html        # Vehicle management
│   ├── drivers.html         # Driver management
│   ├── bookings.html        # Booking management
│   └── pricing.html         # Pricing configuration
└── README.md
```

## Setup Instructions
1. Install Python 3.9+
2. `pip install -r backend/requirements.txt`
3. `cd backend && python main.py`
4. Open `http://localhost:8000` in browser

## Features
- Generic vehicle categories (admin-configurable)
- Local, Outstation, Airport transfer trip types
- Per-km and package-based pricing
- Driver management and assignment
- Customer booking with payment
- Admin dashboard for fleet management
