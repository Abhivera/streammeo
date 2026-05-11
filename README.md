# Streammeo

**AI voice customer support** for your website: add a script tag or use the dashboard playground; visitors tap a mic, speak in **English**, and get answers grounded in **your FAQs and tools**—with full **session transcripts** for your team. Audio flows in real time over **Socket.IO**; **Deepgram** powers English speech-to-text and text-to-speech, **Groq** powers the conversation and tool use, and **SQLite** (single file via `better-sqlite3`) stores users, workspaces, sessions, messages, FAQs, and tool-call rows.

---

## What’s in the box

| Piece | Role |
| ----- | ---- |
| **`apps/backend`** | Express REST (auth, workspace) + Socket.IO voice pipeline (STT → LLM → tools → TTS). |
| **`apps/frontend`** | Support console: login, analytics, sessions, agent settings, FAQ editor, widget playground. |
| **`apps/widget`** | Single-file embeddable bundle (`dist/widget.js`): Shadow DOM UI, MediaRecorder, energy-based VAD, Socket.IO client. |
| **`packages/db`** | SQLite schema + repos (`packages/db/src/sqlite/schema.ts`), transactional helpers. |
| **`packages/shared`** | Shared helpers (e.g. usage-cap check for optional minute limits). |

---

## Tech stack

- **Runtime:** Node.js 20+
- **Package manager:** npm workspaces
- **Voice / LLM:** Deepgram API (STT + Aura TTS) · Groq Chat Completions API (tool use)
- **Optional web search:** [Tavily](https://docs.tavily.com/) — registers a `web_search` tool for the LLM when `TAVILY_API_KEY` is set
- **Data:** SQLite · Redis 7 (usage keys, optional patterns)

---

## Prerequisites

- **Node.js** ≥ 20 and **npm**.
- **Docker** (optional Redis + compose; SQLite path is configurable via `SQLITE_PATH`).

---

## Repository layout

```
streammeo/
├── apps/
│   ├── backend/      # API + Socket.IO
│   ├── frontend/     # Vite + React dashboard
│   └── widget/       # esbuild → dist/widget.js
├── packages/
│   ├── db/           # SQLite repos + `scripts/seed.ts`
│   └── shared/
├── docs/
│   └── AGENTS.md     # agent / build-order notes
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

2. Start Redis (required by backend usage tracking):

```bash
docker compose up -d redis
```

3. Create env files:

```bash
cp .env.example .env
cp apps/frontend/.env.example apps/frontend/.env
```

4. Start apps in separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

5. Open `http://localhost:5173`, register/login, then copy workspace API key from Settings for widget testing.

---

## .env Guide

- Root `.env` is used by backend and docker compose.
- `apps/frontend/.env` is only for frontend `VITE_*` variables.
- Never commit real secrets.

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `DEEPGRAM_API_KEY` | Yes | STT + TTS ([Deepgram](https://developers.deepgram.com/)). |
| `DEEPGRAM_STT_MODEL` | No | Pre-recorded STT model (default **`nova-2`**). |
| `DEEPGRAM_TTS_MODEL` | No | Aura voice id (default **`aura-2-thalia-en`**). STT and TTS are **English**; override with any Aura model your account supports. |
| `GROQ_API_KEY` | Yes | Groq API key for LLM calls ([Groq docs](https://console.groq.com/docs/overview)). |
| `SQLITE_PATH` | No | SQLite database file path (default **`./data/streammeo.db`**); parent directories are created at startup. |
| `REDIS_URL` | Yes | Redis connection string. |
| `JWT_SECRET` | Yes | Min. 16 chars; signs dashboard JWTs. |
| `PORT` | No | API port (default **3001**). |
| `FRONTEND_URL` | Yes | Dashboard origin for CORS (e.g. `http://localhost:5173`). |
| `WIDGET_ALLOWED_ORIGINS` | No | `*` or comma-separated origins for widget Socket.IO / CORS. |
| `TAVILY_API_KEY` | No | If set, registers **`web_search`** for up-to-date web answers ([Tavily API](https://docs.tavily.com/docs/tavily-api/rest-api/api-reference)). |

Docker Compose also passes through `DEEPGRAM_API_KEY`, `GROQ_API_KEY`, and `TAVILY_API_KEY` — set them in `.env` beside `docker compose` or export them in your shell.

---

## Root scripts

| Command | Description |
| ------- | ----------- |
| `npm install` | Install all workspace dependencies. |
| `npm run dev:backend` | API + Socket.IO on `http://localhost:3001`. |
| `npm run dev:frontend` | Dashboard on `http://localhost:5173` (proxies REST + `/socket.io` to 3001 — see [Local widget testing](#local-widget-testing)). |
| `npm run dev:widget` | Watch build of `apps/widget/dist/widget.js`. |
| `npm run build` | Build all packages that define a `build` script. |
| `npm run db:seed` | **Wipes SQLite** and inserts fixed test users + sample data (`packages/db/scripts/seed.ts`). |
| `npm run db:seed:demo` | Same as `db:seed` but loads `scripts/demo.local.env` if present (copy from `scripts/demo-env.example`). |
| `npm run lint` | Typecheck backend + lint frontend. |

---

## Local development

**Test database reset** (wipes SQLite, inserts fixed users — see `packages/db/scripts/seed.ts`):

```bash
npm run db:seed
```

**Optional demo env** (`DEMO_MODE`, seed email/password for `POST /auth/demo-login` and seed overrides) lives outside root `.env`:

```bash
cp scripts/demo-env.example scripts/demo.local.env
./scripts/with-demo-env.sh npm run db:seed
# optional: run backend with demo vars inherited
./scripts/with-demo-env.sh npm run dev:backend
```

Use another file path: `STREAMMEO_DEMO_ENV=/path/to/file ./scripts/with-demo-env.sh npm run db:seed`

---

## Docker: full stack

```bash
docker compose up --build
```

- **Redis** → `localhost:6379`
- **Backend** starts on **3001**; SQLite is persisted on the **`streammeo-sqlite`** volume at **`/repo/data/streammeo.db`** unless you override `SQLITE_PATH`.
- **Frontend** image serves the static build behind **nginx** on **5173** and proxies REST to the API at **`/api-proxy/...`** (see `apps/frontend/nginx.conf`)

Production dashboard builds should set **`VITE_API_URL=/api-proxy`** (already done in `apps/frontend/Dockerfile`) so the SPA talks to the same host.

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
| `data-lang` | Optional; use `en` (default). Workspace language is English; TTS voice is `DEEPGRAM_TTS_MODEL`. |

The widget runs inside a **Shadow DOM** so host-page CSS does not clash with the floating mic + transcript UI.

---

## Local widget testing

With **`npm run dev:frontend`** and **`npm run dev:backend`** running:

- Point the script at **`http://localhost:5173`** for `data-backend-url` so the Vite dev server proxies **`/socket.io`** WebSocket traffic to port **3001** (`apps/frontend/vite.config.ts`).
- Or set **`data-backend-url`** to **`http://localhost:3001`** and ensure CORS / `WIDGET_ALLOWED_ORIGINS` allows your test page origin.

---

## LLM tools (backend)

When the pipeline runs, the LLM may call:

| Tool | Source |
| ---- | ------ |
| `get_order_status` | Order lookup — Shopify-backed if workspace keys are configured, else mock. |
| `search_faq` | Keyword-style search over workspace FAQ rows. |
| `web_search` | **Only if `TAVILY_API_KEY` is set.** Calls Tavily’s search API and returns summaries + snippets for the model to cite conversationally.

---

## Security notes

- Rotate any API key that was pasted into chats, logs, or CI artifacts.
- Use a strong `JWT_SECRET` in production.
- Lock down `WIDGET_ALLOWED_ORIGINS` to real store domains when you go live.

---

## Further reading

- High-level MVP spec and phased roadmap: **`docs/AGENTS.md`**.
