# Intelligent Freight Quotation Generation System (PORTLINE)

Team 4 — A full-stack freight forwarding platform featuring instant freight quotes, live shipment tracking, a customer portal, and JWT-secured authentication.

---

## Architecture

```text
FRONTEND (React + Vite + Tailwind)
                │
           JWT + CORS
                │
                ▼
BACKEND (Django REST Framework)
                │
          mongoengine
                │
                ▼
             MongoDB
```

---

# Contents

- Features
- Tech Stack
- Quick Start
- Environment Variables
- API Reference
- Project Structure
- Backend Design Notes
- Troubleshooting
- Known Gaps
- Team Roles

---

# Features

- **Home** – Animated route hero, live statistics, service previews and workflow overview.
- **Services** – Six freight services with comparison table.
- **Tracking** – Shipment tracking using tracking number with timeline.
- **Freight Quote Generator** – Calculates freight cost based on package details.
- **Customer Portal** – User profile and shipment history.
- **Contact** – Stores enquiries in MongoDB.
- **Login / Sign Up** – JWT authentication with hashed passwords.

---

# Tech Stack

| Layer | Technology |
|-------|------------|
| Build Tool | Vite |
| UI | React 18, React Router v6, Tailwind CSS |
| Frontend State | React Context |
| HTTP | Fetch API |
| Backend | Django REST Framework |
| Authentication | JWT (SimpleJWT) |
| Database | MongoDB (mongoengine) |
| Configuration | python-decouple |

---

# Quick Start

## Backend

```bash
cd backend

python -m venv venv

# Linux / macOS
source venv/bin/activate

# Windows
venv\Scripts\activate

pip install -r requirements.txt

# Linux / macOS
cp .env.example .env

# Windows
copy .env.example .env
```

Generate a Django Secret Key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

Add the generated key to:

```
backend/.env
```

Run the backend:

```bash
python manage.py migrate
python manage.py seed_rates
python manage.py runserver
```

---

## Frontend

Open another terminal.

```bash
npm install
```

Create `.env`

```
VITE_API_BASE_URL=http://localhost:8000
```

Run the frontend.

```bash
npm run dev
```

---

# Environment Variables

## Root `.env`

| Variable | Purpose |
|----------|---------|
| VITE_API_BASE_URL | Backend API URL |

---

## backend/.env

| Variable | Purpose |
|----------|---------|
| SECRET_KEY | Django Secret Key |
| DEBUG | Development Mode |
| MONGO_URI | MongoDB Connection String |
| CORS_ALLOWED_ORIGIN | Frontend URL |

---

# API Reference

| Method | Endpoint | Authentication | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/register/` | Public | Register User |
| POST | `/api/auth/login/` | Public | Login |
| POST | `/api/auth/refresh/` | Public | Refresh Token |
| GET | `/api/auth/me/` | JWT | Current User |
| GET | `/api/shipments/` | JWT | User Shipments |
| POST | `/api/shipments/` | Public | Create Shipment |
| GET | `/api/tracking/<tn>/` | Public | Shipment Tracking |
| GET | `/api/rates/` | Public | Shipping Rates |
| POST | `/api/quotes/` | Public | Freight Quote |
| POST | `/api/contact/` | Public | Contact Form |

Authentication Header

```text
Authorization: Bearer <access_token>
```

---

# Project Structure

```text
.
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── lib/
│   └── pages/
│
├── backend/
│   ├── core/
│   ├── users/
│   ├── shipments/
│   ├── quotes/
│   ├── rates/
│   ├── manage.py
│   └── requirements.txt
│
├── package.json
├── vite.config.js
└── README.md
```

---

# Backend Design Notes

## MongoDB

- Uses **mongoengine**
- No Django ORM for application data.
- SQLite is only used for Django admin and sessions.

## Authentication

- JWT Authentication using SimpleJWT.
- Custom `MongoJWTAuthentication`.
- Passwords hashed using Django PBKDF2.

## Shipment Booking

- Guests can create shipments.
- Logged-in users automatically become shipment owners.

## Pricing

Pricing is calculated in:

```
quotes/pricing.py
```

Formula:

- Chargeable Weight = max(actual, volumetric)
- Base Cost + Weight × Rate
- Insurance × 1.1
- Hazmat + 75

---

# Troubleshooting

| Issue | Solution |
|--------|----------|
| Django won't install | Use Python 3.12+ |
| MongoDB timeout | Ensure MongoDB service is running |
| SECRET_KEY error | Create `backend/.env` |
| API returns 404 | Verify `VITE_API_BASE_URL` |
| CORS error | Set `CORS_ALLOWED_ORIGIN` correctly |

---

# Known Gaps

1. Portal still uses mock shipment data.
2. Blank `declValue` validation.
3. `ALLOWED_HOSTS` must be configured before deployment.
4. Frontend still calculates quotes locally.
5. Tracking numbers generated client-side.

---

# Team Roles

### Frontend Team
- React UI
- Quote Generator
- Customer Portal

### Backend Team
- Django REST API
- MongoDB Integration
- JWT Authentication

### ML Team
- Freight Pricing Model
- Rate Prediction

---

# License

This project is intended for educational purposes.
Replace this section with an appropriate license before production deployment.
