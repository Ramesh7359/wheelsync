# WheelSync — Setup & Startup Guide

## Prerequisites

- Python 3.9+ installed (check: `python --version`)
- A web browser (Chrome, Edge, Firefox)

---

## Step 1: Open PowerShell / Command Prompt

Open PowerShell as Administrator or regular Command Prompt.

---

## Step 2: Navigate to the Backend Folder

```powershell
cd "c:\Users\rpusala\Downloads\kiro-workshop-assets\kiro-workshop\wheelsync\backend"
```

---

## Step 3: Install Python Dependencies (First Time Only)

```powershell
pip install fastapi uvicorn sqlalchemy python-jose python-multipart aiofiles jinja2
```

> Note: You only need to do this once. After the first install, skip this step.

---

## Step 4: Start the Backend Server

```powershell
python main.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

> Keep this window open! The server must be running for the app to work.

---

## Step 5: Open the Customer Booking Page

Open this file in your browser (double-click or right-click → Open with Chrome):

```
c:\Users\rpusala\Downloads\kiro-workshop-assets\kiro-workshop\wheelsync\frontend\index.html
```

This is the customer-facing booking website.

---

## Step 6: Open the Admin Dashboard

Open this file in your browser:

```
c:\Users\rpusala\Downloads\kiro-workshop-assets\kiro-workshop\wheelsync\admin\index.html
```

This is your fleet management admin panel.

---

## Step 7: View API Documentation (Optional)

Open in browser:

```
http://localhost:8000/docs
```

This shows all available API endpoints with test functionality.

---

## How to Stop the Server

In the PowerShell window where the server is running, press:

```
Ctrl + C
```

---

## How to Restart the Server

```powershell
cd "c:\Users\rpusala\Downloads\kiro-workshop-assets\kiro-workshop\wheelsync\backend"
python main.py
```

---

## Quick Start (After First Setup)

Every time you want to use the app, just run these two commands:

```powershell
cd "c:\Users\rpusala\Downloads\kiro-workshop-assets\kiro-workshop\wheelsync\backend"
python main.py
```

Then open the frontend and admin HTML files in your browser.

---

## URLs Summary

| What | URL / Path |
|------|-----------|
| API Server | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Customer Site | `wheelsync\frontend\index.html` (open in browser) |
| Admin Panel | `wheelsync\admin\index.html` (open in browser) |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "python is not recognized" | Install Python from python.org and add to PATH |
| "No module named fastapi" | Run Step 3 again to install dependencies |
| Customer page shows no vehicle types | Make sure the server (Step 4) is running |
| "Address already in use" | Another instance is running. Kill it with Ctrl+C first |
| Database reset needed | Delete `wheelsync.db` file in backend folder and restart |

---

## Default Admin Login

- Username: `admin`
- Password: `admin123`

---

## Project File Structure

```
wheelsync/
├── backend/
│   ├── main.py              ← Main server application
│   ├── models.py            ← Database table definitions
│   ├── database.py          ← Database connection
│   ├── requirements.txt     ← Python package list
│   └── wheelsync.db         ← Database file (auto-created on first run)
├── frontend/
│   ├── index.html           ← Customer booking page
│   ├── css/style.css        ← Customer page styling
│   └── js/app.js            ← Customer page logic
├── admin/
│   └── index.html           ← Admin dashboard
├── README.md                ← Project overview
└── SETUP_GUIDE.md           ← This file
```
