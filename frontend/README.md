# Freight Quote Generator (PORTLINE) — Frontend

The **frontend half** of the Freight Quote Generator platform: instant freight quotes, live shipment tracking, a customer portal, and login/signup — built with **React + Vite + Tailwind CSS**, ready to connect to the team's **Django REST Framework + MongoDB** backend over a JWT-secured API.

```
FRONTEND (React + Vite + Tailwind)  --JWT + CORS-->  BACKEND (Django REST Framework)  --mongoengine-->  MongoDB
```

> **Status:** the backend doesn't exist yet in this repo. The app runs today in **mock mode** — all data (login, shipments, quotes) is handled locally in the browser so the UI is fully clickable and demo-able on day one. See [`docs/API-INTEGRATION.md`](docs/API-INTEGRATION.md) for exactly how to point it at the real Django API once it's ready.

## Features

- **Home** — animated route hero, live stats, service previews, process steps
- **Services** — six freight services + a mode comparison table
- **Tracking** — look up a shipment by tracking number, see an animated checkpoint timeline
- **Freight Quote Generator** (the `/ship` route) — one page with every required field: origin/destination, service type, repeatable cargo items (package type, weight, quantity, length/width/height), insurance/hazmat flags, contact info — plus a **live cost & weight calculator** that updates as you type
- **Customer Portal** — profile card + recent shipments, gated behind login
- **Contact** — contact form + office directory
- **Login / Sign up** — split-screen auth screen with a one-click demo account

## Tech stack (frontend)

| Layer | Technology |
|---|---|
| Build tool | Vite |
| UI library | React 18 |
| Routing | React Router v6 |
| Styling | Tailwind CSS |
| Icons | lucide-react |
| Fonts | Space Grotesk, Inter, IBM Plex Mono (Google Fonts) |
| State | React Context (`AppContext`, `ToastContext`) — no Redux needed at this scale |
| HTTP | Native `fetch`, wrapped in `src/lib/api.js` |

Full rationale in [`docs/TECH-STACK.md`](docs/TECH-STACK.md).

## Quick start

**Requirements:** Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Other scripts

```bash
npm run build     # production build → dist/
npm run preview   # preview the production build locally
npm run lint      # run ESLint
```

## Environment variables

Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` once the Django backend is deployed:

```bash
cp .env.example .env
```

- **Unset / empty** → the app runs in **mock mode** (default, no backend required)
- **Set** (e.g. `VITE_API_BASE_URL=http://localhost:8000`) → the app calls the real Django REST API and stores the JWT it receives

See [`docs/API-INTEGRATION.md`](docs/API-INTEGRATION.md) for the exact endpoint contract the Backend Team should implement.

## Project structure

```
.
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json
├── .env.example
└── src/
    ├── main.jsx              # React root
    ├── App.jsx                # Router + layout (Navbar/Footer) + providers
    ├── index.css               # Tailwind directives + custom keyframes/utilities
    ├── context/
    │   ├── AppContext.jsx      # auth + shipments state
    │   └── ToastContext.jsx    # toast notifications
    ├── lib/
    │   ├── api.js               # fetch layer → Django REST (JWT-ready), mock fallback
    │   └── mockData.js          # seed shipments, demo user, rate table
    ├── hooks/
    │   ├── useReveal.js         # scroll-reveal animation hook
    │   └── useCountUp.js        # animated stat counters
    ├── components/              # Navbar, Footer, PageBanner, RouteHero, StatusBadge, Reveal
    └── pages/                    # Home, Services, Tracking, Ship, Portal, Contact, Login
```

## Try it

- Demo login: "Continue with demo account" on the Login page, or "Try demo account" on the Customer Portal gate.
- Sample tracking numbers: `PORT-58213-IN`, `PORT-91177-IN`.
- Book a quote on **Freight Quote Generator** (`/ship`) — it generates a tracking number that immediately works in Tracking and the Portal.

## Documentation

| Document | Covers |
|---|---|
| [`docs/TECH-STACK.md`](docs/TECH-STACK.md) | Full frontend tech stack and why each piece was chosen |
| [`docs/CODE-DOCUMENTATION.md`](docs/CODE-DOCUMENTATION.md) | Every file explained: what it does, how it works |
| [`docs/PROJECT-DOCUMENTATION.md`](docs/PROJECT-DOCUMENTATION.md) | Architecture, state model, routing, design system, user flows |
| [`docs/API-INTEGRATION.md`](docs/API-INTEGRATION.md) | The exact REST/JWT contract for the Django backend team |
| [`docs/DEPLOY-VERCEL.md`](docs/DEPLOY-VERCEL.md) | Deploying this Vite app to Vercel |

## Team roles (per the project's tech-stack plan)

- **Frontend Team** — owns everything in this repo: React screens, forms, the quote calculator, the dashboard/portal
- **Backend Team** — Django REST APIs, MongoDB models (via mongoengine), JWT auth, admin panel (see `docs/API-INTEGRATION.md` for the contract this frontend expects)
- **ML / Data Team** — the pricing model behind shipment rates; today the frontend uses the placeholder rate table in `src/lib/mockData.js`, meant to be replaced by a real `/api/rates/` endpoint

## License

Provided as-is for a team learning/demo project. Replace this section with your own license before shipping to production.
