\# Intelligent Freight Quotation Generation System (PORTLINE)



Team 4 — a full-stack freight forwarding platform: instant freight quotes, live shipment

tracking, a customer portal, and JWT-secured authentication.



```

FRONTEND (React + Vite + Tailwind)  ──JWT + CORS──▶  BACKEND (Django REST Framework)  ──mongoengine──▶  MongoDB

```



\---



\## Contents



\- Features

\- Tech stack

\- Quick start

\- Environment variables

\- API reference

\- Project structure

\- Backend design notes

\- Troubleshooting

\- Known gaps

\- Team roles



\---



\## Features



\- \*\*Home\*\* — animated route hero, live stats, service previews, process steps

\- \*\*Services\*\* — six freight services plus a mode comparison table

\- \*\*Tracking\*\* — look up a shipment by tracking number, animated checkpoint timeline

\- \*\*Freight Quote Generator\*\* (`/ship`) — origin/destination, service type, repeatable cargo

items (package type, weight, quantity, dimensions), insurance and hazmat flags, contact

details, and a live cost/weight calculator that updates as you type

\- \*\*Customer Portal\*\* — profile card and recent shipments, gated behind login

\- \*\*Contact\*\* — enquiry form persisted to MongoDB

\- \*\*Login / Sign up\*\* — real accounts with hashed passwords and JWT sessions



\## Tech stack



| Layer | Technology |

| --- | --- |

| Build tool | Vite |

| UI | React 18, React Router v6, Tailwind CSS, lucide-react |

| Frontend state | React Context (`AppContext`, `ToastContext`) |

| HTTP | Native `fetch`, wrapped in `src/lib/api.js` |

| API layer | Django 6 + Django REST Framework |

| Auth | SimpleJWT (access + refresh tokens) |

| Data layer | MongoDB via mongoengine |

| Config | python-decouple (`.env`) |



\---



\## Quick start



You need \*\*Node.js 18+\*\*, \*\*Python 3.12+\*\*, and \*\*MongoDB\*\* running locally.



> Python 3.12 is a hard requirement — Django 6.0 will not install on anything older.

> 



\### 1. MongoDB



```bash

\# Windows

winget install MongoDB.Server

sc query MongoDB          # confirm STATE : 4 RUNNING



\# macOS

brew tap mongodb/brew \&\& brew install mongodb-community

brew services start mongodb-community

```



Or use a free MongoDB Atlas cluster and point `MONGO\_URI`

at it instead. Atlas is the better choice for a team — a local `mongod` gives everyone

their own isolated database, so nobody can reproduce anyone else's data.



\### 2. Backend



```bash

cd backend



python -m venv venv

source venv/bin/activate          # Windows: venv\\Scripts\\activate



pip install -r requirements.txt

cp .env.example .env               # Windows: copy .env.example .env

```



Generate a secret key and paste it into `backend/.env` as `SECRET\_KEY`:



```bash

python -c "import secrets; print(secrets.token\_urlsafe(50))"

```



Then:



```bash

python manage.py migrate       # SQLite: admin/sessions tables only

python manage.py seed\_rates    # loads the rate table into MongoDB

python manage.py runserver

```



`seed\_rates` printing four `created` lines confirms MongoDB is genuinely connected — it is

the first command that performs a write.



\### 3. Frontend



In a second terminal, from the repo root:



```bash

npm install

cp .env.example .env               # Windows: copy .env.example .env

```



Set the API base URL in the root `.env`:



```

VITE\_API\_BASE\_URL=http://localhost:8000

```



Then:



```bash

npm run dev

```



Open the URL Vite prints — normally `http://localhost:5173`.



\### Other scripts



```bash

npm run build     # production build → dist/

npm run preview   # preview the production build

npm run lint      # ESLint

```



\---



\## Environment variables



There are \*\*two\*\* `.env` files. They are separate and both are required.



\*\*Root `.env`\*\* — read by Vite:



| Variable | Purpose |

| --- | --- |

| `VITE\_API\_BASE\_URL` | Backend base URL. Leave \*\*empty\*\* to run the frontend in mock mode with no backend. |



\*\*`backend/.env`\*\* — read by Django:



| Variable | Purpose |

| --- | --- |

| `SECRET\_KEY` | Django signing key. No default — Django will not start without it. |

| `DEBUG` | `True` in development. |

| `MONGO\_URI` | e.g. `mongodb://localhost:27017/freight\_db` or an Atlas connection string. |

| `CORS\_ALLOWED\_ORIGIN` | Frontend origin, e.g. `http://localhost:5173`. |



Both are gitignored. Never commit real values — `.env.example` keeps the placeholders.



\---



\## API reference



| Method | Path | Auth | Notes |

| --- | --- | --- | --- |

| `POST` | `/api/auth/register/` | public | → `{access, refresh, user}` |

| `POST` | `/api/auth/login/` | public | → `{access, refresh, user}` |

| `POST` | `/api/auth/refresh/` | public | → `{access}` |

| `GET` | `/api/auth/me/` | JWT | current user |

| `GET` | `/api/shipments/` | JWT | caller's own shipments |

| `POST` | `/api/shipments/` | public | links to the user when a token is sent |

| `GET` | `/api/tracking/<tn>/` | public | `404` when not found |

| `GET` | `/api/rates/` | public | dict keyed by service |

| `POST` | `/api/quotes/` | public | price breakdown |

| `POST` | `/api/contact/` | public | → `{ok: true}` |



Credentials go in an `Authorization: Bearer <access>` header, which `src/lib/api.js`

already handles.



\### Example



```bash

curl -X POST http://localhost:8000/api/auth/register/ \\

&#x20; -H "Content-Type: application/json" \\

&#x20; -d '{"name":"Test","email":"test@example.com","password":"supersecret1"}'

```



Passwords must be at least 8 characters.



\---



\## Project structure



```

.

├── index.html

├── package.json

├── vite.config.js

├── tailwind.config.js

├── .env.example                 # frontend env template

├── src/

│   ├── main.jsx                 # React root

│   ├── App.jsx                  # router, layout, providers

│   ├── context/

│   │   ├── AppContext.jsx       # auth + shipments state

│   │   └── ToastContext.jsx     # toast notifications

│   ├── lib/

│   │   ├── api.js               # fetch layer, JWT handling, mock fallback

│   │   └── mockData.js          # seed shipments, demo user, rate table

│   ├── hooks/                   # useReveal, useCountUp

│   ├── components/              # Navbar, Footer, PageBanner, RouteHero, StatusBadge, Reveal

│   └── pages/                   # Home, Services, Tracking, Ship, Portal, Contact, Login

└── backend/

&#x20;   ├── manage.py

&#x20;   ├── requirements.txt

&#x20;   ├── .env.example             # backend env template

&#x20;   ├── core/

&#x20;   │   ├── settings.py

&#x20;   │   ├── urls.py

&#x20;   │   ├── authentication.py    # mongoengine-backed JWT auth

&#x20;   │   └── serializers.py       # RenamedFieldsMixin (from/to key mapping)

&#x20;   ├── users/                   # User + ContactMessage documents, auth views

&#x20;   ├── shipments/               # Shipment document, booking + tracking views

&#x20;   ├── rates/                   # RateConfiguration, seed\_rates command

&#x20;   └── quotes/                  # Quote document, pricing engine

```



\### MongoDB collections



`freight\_db` holds `users`, `shipments`, `quotes`, `rate\_configurations`, and

`contact\_messages`. Browse them with MongoDB Compass

at `mongodb://localhost:27017`.



\---



\## Backend design notes



\*\*No Django ORM for application data.\*\* mongoengine documents are not Django models, so

there is no `ModelSerializer` and no `ModelViewSet` here — every serializer is a plain

`serializers.Serializer` with an explicit `create()`, and every view is an `APIView`. The

four app `migrations/` folders stay empty by design. SQLite exists only because

`django.contrib.admin` and `sessions` will not boot without it.



\*\*`from` and `to` are Python keywords.\*\* Documents store `origin` and `destination`;

`core/serializers.py::RenamedFieldsMixin` swaps the keys in both directions so the

frontend contract is unchanged. This is why Compass shows `origin`/`destination` while the

API returns `from`/`to`.



\*\*Authentication.\*\* `core/authentication.py::MongoJWTAuthentication` subclasses SimpleJWT's

`JWTAuthentication` and overrides only `get\_user()` to resolve against MongoDB. Token

signing is untouched; the ObjectId is stringified into the `user\_id` claim. Passwords use

Django's PBKDF2 hasher.



\*\*Guest bookings.\*\* The Ship page lets users book without logging in, so

`POST /api/shipments/` is `AllowAny` and sets `owner` only when a valid token is present.

`GET /api/shipments/` requires authentication and filters by owner.



\*\*Pricing.\*\* `quotes/pricing.py` computes chargeable weight as `max(actual, volumetric)`

with a 5000 volumetric divisor, then `base + kg × rate`, ×1.1 for insurance, +75 for

hazmat. This module is the seam for the ML pricing model — keep `calculate\_quote()`'s

signature and swap the internals.



\---



\## Troubleshooting



| Symptom | Cause |

| --- | --- |

| `Could not find a version that satisfies the requirement Django==6.0.7` | Python older than 3.12. |

| `ServerSelectionTimeoutError` on `seed\_rates` | MongoDB is not running. Check `sc query MongoDB`. |

| `UndefinedValueError: SECRET\_KEY not found` | `backend/.env` missing, or saved as `.env.txt` by Notepad. |

| `404` on every API call | `VITE\_API\_BASE\_URL` malformed. It must be exactly `http://localhost:8000` — no trailing slash, no quotes, and the variable name must appear only once. |

| `400` with a JSON body | Validation error. The response names the field, e.g. `{"declValue":\["A valid number is required."]}`. |

| CORS error in the console | Vite picked a port other than 5173. Update `CORS\_ALLOWED\_ORIGIN` in `backend/.env` to match. |

| Collections missing in Compass | Compass caches the collection list. Right-click the connection → Refresh. |



Changes to either `.env` require a restart of the corresponding dev server.



\---



\## Known gaps



Open items, roughly in priority order:



1\. \*\*`AppContext` never calls `fetchShipments()`.\*\* The Portal renders seed data from

`mockData.js` mixed with local React state, so real bookings disappear on page refresh

while fake ones persist. Needs a load-on-login in `AppContext.jsx`.

2\. \*\*Blank `declValue` returns a 400.\*\* The field is optional in the UI but an empty input

sends `""`, which `FloatField` rejects. Needs a serializer field that coerces `""` to `0`.

3\. \*\*`ALLOWED\_HOSTS` is empty.\*\* Every request will be rejected once `DEBUG=False`. Must be

set before any deployment.

4\. \*\*`Ship.jsx` prices client-side.\*\* `POST /api/quotes/` returns identical figures and is

the authoritative source; the frontend should call it rather than duplicating the formula.

5\. \*\*Tracking numbers are generated in the browser.\*\* A collision returns a 400 instead of

retrying. Rare, but it should be server-side.

6\. \*\*The `docs/` folder referenced by earlier drafts of this README does not exist\*\* in the

repository. Either add those documents or remove the references.



\---



\## Team roles



\- \*\*Frontend Team\*\* — React screens, forms, quote calculator, portal

\- \*\*Backend Team\*\* — DRF API layer, mongoengine documents, JWT auth

\- \*\*ML / Data Team\*\* — the pricing model behind `quotes/pricing.py`; rates now live in

MongoDB and can be tuned without a frontend redeploy



> After pulling, run `python manage.py migrate` and `python manage.py seed\_rates`. The rate

table lives in MongoDB rather than in the code, so the app will look broken without it.

> 



\## License



Provided as-is for a team learning/demo project. Replace this section with your own license

before shipping to production.

