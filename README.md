# Streammeo

**AI voice customer support** for your website: add a script tag or use the dashboard playground. Visitors tap a mic, speak in **English**, and get answers grounded in **your FAQs and tools**, with **session transcripts** for your team. Audio runs in real time over **Socket.IO**. **Deepgram** provides speech-to-text and TTS, **Groq** runs the LLM with tool use, and **MongoDB** stores users, workspaces, sessions, messages, FAQs, and tool calls. **Usage** (minutes used) is updated on the workspace document after each voice turn—there is **no Redis**.

**Auth:** email/password JWT by default; optional **Google sign-in** via Firebase (`POST /auth/firebase-session`) when you configure Firebase on the server and the `VITE_FIREBASE_*` variables on the frontend.

---

## What’s in the box

| Piece | Role |
| ----- | ---- |
| **`apps/backend`** | Express REST (auth, workspace) + Socket.IO voice pipeline (STT → LLM → tools → TTS). |
| **`apps/frontend`** | Support console: login/register, analytics, sessions, agent settings, FAQ editor, widget playground. |
| **`apps/widget`** | Single-file embeddable bundle (`dist/widget.js`): Shadow DOM UI, MediaRecorder, energy-based VAD, Socket.IO client. |
| **`packages/db`** | MongoDB access: connection helper, indexes, repos (`packages/db/src/repos/*`), `StreammeoStore`. |
| **`packages/shared`** | Shared helpers (e.g. usage-cap check for optional minute limits). |

---

## Tech stack

- **Runtime:** Node.js 20+
- **Package manager:** npm workspaces
- **Voice / LLM:** Deepgram (STT + Aura TTS) · Groq Chat Completions (tools)
- **Optional web search:** [Tavily](https://docs.tavily.com/) — registers `web_search` when `TAVILY_API_KEY` is set
- **Data:** MongoDB 6+ (official driver in `packages/db`). No Redis; no SQLite in the current codebase.

---

## Prerequisites

- **Node.js** ≥ 20 and **npm**
- **MongoDB** running locally or reachable via `MONGODB_URI`, **or** Docker (see below)

---

## Repository layout

```
streammeo/
├── apps/
│   ├── backend/      # API + Socket.IO
│   ├── frontend/     # Vite + React dashboard
│   └── widget/       # esbuild → dist/widget.js
├── packages/
│   ├── db/           # MongoDB store + repos + scripts/seed.ts
│   └── shared/
├── docs/
│   └── AGENTS.md     # Short agent / orientation notes
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Install Guide

1. Install dependencies from the repo root:

```bash
npm install
```

2. Start MongoDB (pick one):

```bash
# Example: Docker
docker compose up -d mongo
```

3. Create env files:

```bash
cp .env.example .env
cp apps/frontend/.env.example apps/frontend/.env
```

Edit `.env`: set `MONGODB_URI`, `JWT_SECRET`, `DEEPGRAM_API_KEY`, and `GROQ_API_KEY`.

4. (Optional) Seed test workspaces and sample data—**wipes all collections** in the configured database:

```bash
npm run db:seed
```

5. Start apps in separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

6. Open `http://localhost:5173`, register or sign in, then copy the workspace API key from Settings for widget testing.

---

## .env Guide

- Root **`.env`** is loaded by the backend (`tsx --env-file=../../.env` from `apps/backend`) and referenced by Docker Compose variable substitution.
- **`apps/frontend/.env`** (or `.env.local`) holds **`VITE_*`** only (baked in at build time).
- Never commit real secrets.

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `MONGODB_URI` | Yes | MongoDB connection string (DB name usually in the path, e.g. `.../streammeo`). |
| `MONGODB_DB_NAME` | No | Override database name if not taken from the URI. |
| `DEEPGRAM_API_KEY` | Yes | STT + TTS ([Deepgram](https://developers.deepgram.com/)). |
| `DEEPGRAM_STT_MODEL` | No | STT model (default **`nova-2`**). |
| `DEEPGRAM_TTS_MODEL` | No | Aura voice id (default **`aura-2-thalia-en`**). |
| `GROQ_API_KEY` | Yes | Groq API key ([Groq](https://console.groq.com/)). |
| `JWT_SECRET` | Yes | Min. 16 characters; signs dashboard JWTs. |
| `PORT` | No | API port (default **3001**). |
| `FRONTEND_URL` | Yes | Dashboard origin for CORS (e.g. `http://localhost:5173`). |
| `WIDGET_ALLOWED_ORIGINS` | No | `*` or comma-separated origins for widget CORS / Socket.IO. |
| `TAVILY_API_KEY` | No | Enables **`web_search`** tool ([Tavily](https://docs.tavily.com/)). |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | No | Firebase **service account** JSON string; enables `POST /auth/firebase-session` for Google sign-in. |

**Frontend (`VITE_*`):** `VITE_API_URL` — set to your public API origin in production (empty in dev uses the Vite proxy). For Google sign-in, set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` (see `apps/frontend/.env.example`).

Docker Compose passes `MONGODB_URI`, API keys, and JWT-related vars; add `FIREBASE_SERVICE_ACCOUNT_JSON` to your `.env` if you need Firebase in containers.

---

## Root scripts

| Command | Description |
| ------- | ----------- |
| `npm install` | Install all workspace dependencies. |
| `npm run dev:backend` | API + Socket.IO on `http://localhost:3001`. |
| `npm run dev:frontend` | Dashboard on `http://localhost:5173` (proxies REST + `/socket.io` to 3001 — see [Local widget testing](#local-widget-testing)). |
| `npm run dev:widget` | Watch build of `apps/widget/dist/widget.js`. |
| `npm run build` | Build all packages that define a `build` script. |
| `npm run db:seed` | **Wipes MongoDB app collections** and inserts test users + sample data (`packages/db/scripts/seed.ts`). Optional env **`SEED_TEST_PASSWORD`** sets the bcrypt input for those users. |
| `npm run lint` | Typecheck backend + lint frontend. |

---

## Local development

**Reset database** (destructive — see `packages/db/scripts/seed.ts`):

```bash
npm run db:seed
```

Override the seeded users’ password source: `SEED_TEST_PASSWORD='your-secret' npm run db:seed`

---

## Docker: full stack

```bash
docker compose up --build
```

- **MongoDB** → `localhost:27017` (data in Docker volume **`streammeo-mongo`**).
- **Backend** → `localhost:3001`, using `MONGODB_URI=mongodb://mongo:27017/streammeo` by default inside the stack.
- **Frontend** → static build behind **nginx** on **5173** (mapped to container port 80). The SPA uses **`VITE_API_URL=/api-proxy`** at build time (`apps/frontend/Dockerfile`); nginx proxies API routes to the backend (see `apps/frontend/nginx.conf`).

Ensure `.env` (or your shell) supplies `DEEPGRAM_API_KEY`, `GROQ_API_KEY`, and a long `JWT_SECRET` so the voice pipeline can call live APIs.

---

## Embedding the widget

Build the bundle:

```bash
npm run -w @streammeo/widget build
```

Serve `apps/widget/dist/widget.js` from your CDN or static host, then embed:

```html
<script
  src="https://your-cdn.example/voice-widget/widget.js"
  data-api-key="YOUR_WORKSPACE_API_KEY"
  data-backend-url="https://api.yourdomain.com"
  data-lang="en"
  async
></script>
```

| Attribute | Description |
| --------- | ----------- |
| `data-api-key` | **Required.** Workspace API key from the dashboard. |
| `data-backend-url` | **Required in production.** Origin of the Socket.IO server (scheme + host + optional port). |
| `data-lang` | Optional; default English; voice/model follow workspace and `DEEPGRAM_TTS_MODEL`. |

The widget uses a **Shadow DOM** so host-page CSS does not clash with the mic + transcript UI.

---

## Vercel (React dashboard only)

**Do not** use Vercel’s multi-service wizard to deploy **`apps/backend`** with this repo as-is. The API is a **long-lived Node process** (Express + **Socket.IO** + streaming voice). That pattern does not map cleanly to Vercel’s serverless / experimental “Web Service” split without a full backend redesign. Host the backend on a **container-friendly** or **Node host** (Railway, Render, Fly.io, a VPS, etc.) and point the SPA at it.

**Recommended Vercel project**

1. **Import the GitHub repo** → create **one** project.
2. **Root Directory:** leave **empty** (repository root — **not** `apps` and **not** `apps/frontend`). The build must run from the root so `npm ci` installs workspaces and the frontend **`prebuild`** can compile **`@streammeo/widget`**.
3. **Framework preset:** Other / no auto framework, or let Vercel read **`vercel.json`** at the repo root.
4. **Build:** `vercel.json` sets `installCommand` → `npm ci`, `buildCommand` → `npm run build -w @streammeo/frontend`, `outputDirectory` → `apps/frontend/dist`, plus SPA **`rewrites`** for client-side routing.

**Environment variables (Vercel → Project → Settings → Environment Variables)**

| Name | Notes |
| ---- | ----- |
| `VITE_API_URL` | **Required.** Public origin of your backend, e.g. `https://api.yourdomain.com` (no trailing slash). |
| `VITE_FIREBASE_*` | Only if you use Google sign-in; same as local frontend docs. |

On the **backend** host, set `FRONTEND_URL` (and `WIDGET_ALLOWED_ORIGINS` if needed) to your Vercel URL (e.g. `https://streammeo.vercel.app`).

---

## Local widget testing

With **`npm run dev:frontend`** and **`npm run dev:backend`** running:

- Use **`http://localhost:5173`** as `data-backend-url` if you want the Vite dev server to proxy **`/socket.io`** to port **3001** (`apps/frontend/vite.config.ts`).
- Or set **`data-backend-url`** to **`http://localhost:3001`** and ensure `WIDGET_ALLOWED_ORIGINS` allows your test page origin.

---

## LLM tools (backend)

| Tool | Behavior |
| ---- | -------- |
| `get_order_status` | Order lookup — Shopify-backed if workspace keys are set, else mock. |
| `search_faq` | Keyword-style search over workspace FAQ documents. |
| `web_search` | Only if `TAVILY_API_KEY` is set. |

---

## Security notes

- Rotate any API key exposed in chats, logs, or CI.
- Use a strong `JWT_SECRET` in production.
- Restrict `WIDGET_ALLOWED_ORIGINS` to real store domains when you go live.
- Treat `FIREBASE_SERVICE_ACCOUNT_JSON` like a private key: never commit it; use a secrets manager in production.

---

## Further reading

- **`docs/AGENTS.md`** — repository orientation for agents and contributors.
