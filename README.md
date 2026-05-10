# VoiceWidget

Embeddable AI voice support for Indian SMBs: store owners add a script tag; customers tap a mic, speak in **Tamil**, **Hindi**, or **English**, and hear spoken replies. Audio flows in real time over **Socket.IO**; **Sarvam** powers speech-to-text and text-to-speech, **Anthropic Claude** powers the conversation and tool use, and **Amazon DynamoDB** stores users, workspaces, sessions, messages, FAQs, and tool-call rows.

---

## What’s in the box

| Piece | Role |
| ----- | ---- |
| **`apps/backend`** | Express REST (auth, workspace, billing stubs) + Socket.IO voice pipeline (STT → LLM → tools → TTS). |
| **`apps/frontend`** | Merchant dashboard: login, analytics, sessions, settings, FAQ editor, billing hooks. |
| **`apps/widget`** | Single-file embeddable bundle (`dist/widget.js`): Shadow DOM UI, MediaRecorder, energy-based VAD, Socket.IO client. |
| **`packages/db`** | DynamoDB document client wrappers: entities, repos, transactional helpers (see **`docs/dynamodb-tables.md`**). |
| **`packages/shared`** | Shared constants (e.g. billing plan metadata). |

---

## Tech stack

- **Runtime:** Node.js 20+
- **Package manager:** [pnpm](https://pnpm.io/) 9 workspaces
- **Voice / LLM:** Sarvam API · Anthropic Messages API (streaming, tool use)
- **Optional web search:** [Tavily](https://docs.tavily.com/) — registers a `web_search` tool for Claude when `TAVILY_API_KEY` is set
- **Data:** DynamoDB · Redis 7 (usage keys, optional patterns)
- **Billing:** Razorpay (order creation + webhook path; configure keys to go live)

---

## Prerequisites

- **Node.js** ≥ 20 and **pnpm** (enable with `corepack enable` + `corepack prepare pnpm@9.14.4 --activate`, or use `npx pnpm@9.14.4`).
- **Docker** (optional Redis + compose; DynamoDB is usually AWS or [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)).

---

## Repository layout

```
voicewidget/
├── apps/
│   ├── backend/      # API + Socket.IO
│   ├── frontend/     # Vite + React dashboard
│   └── widget/       # esbuild → dist/widget.js
├── packages/
│   ├── db/           # DynamoDB repos + `scripts/seed.ts`
│   └── shared/
├── docs/
│   └── AGENTS.md     # agent / build-order notes
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Environment variables

Copy the templates and fill in secrets (never commit real keys):

```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
```

Use the **same values** in both files for local dev (`tsx` loads `apps/backend/.env`).

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `SARVAM_API_KEY` | Yes | STT + TTS ([Sarvam](https://docs.sarvam.ai/)). |
| `ANTHROPIC_API_KEY` | Yes | Claude ([Anthropic](https://docs.anthropic.com/)). |
| `AWS_REGION` | Yes (default `us-east-1`) | DynamoDB region. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | If not using IAM role | Static credentials for local/dev; omit on ECS/EC2 with a task/instance role. |
| `DYNAMODB_ENDPOINT` | No | Point at DynamoDB Local, e.g. `http://localhost:8000`. |
| `DYNAMODB_TABLE_PREFIX` | No | Prefix for table names (default **`VoiceWidget`**). |
| `REDIS_URL` | Yes | Redis connection string. |
| `JWT_SECRET` | Yes | Min. 16 chars; signs dashboard JWTs. |
| `PORT` | No | API port (default **3001**). |
| `FRONTEND_URL` | Yes | Dashboard origin for CORS (e.g. `http://localhost:5173`). |
| `WIDGET_ALLOWED_ORIGINS` | No | `*` or comma-separated origins for widget Socket.IO / CORS. |
| `TAVILY_API_KEY` | No | If set, registers **`web_search`** for up-to-date web answers ([Tavily API](https://docs.tavily.com/docs/tavily-api/rest-api/api-reference)). |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | No | Razorpay Checkout / orders. |
| `RAZORPAY_WEBHOOK_SECRET` | No | Verifies `POST /billing/webhook` payloads. |

Docker Compose also passes through `SARVAM_API_KEY`, `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, and Razorpay vars — set them in `.env` beside `docker compose` or export them in your shell.

---

## Root scripts

| Command | Description |
| ------- | ----------- |
| `pnpm install` | Install all workspace dependencies. |
| `pnpm dev:backend` | API + Socket.IO on `http://localhost:3001`. |
| `pnpm dev:frontend` | Dashboard on `http://localhost:5173` (proxies REST + `/socket.io` to 3001 — see [Local widget testing](#local-widget-testing)). |
| `pnpm dev:widget` | Watch build of `apps/widget/dist/widget.js`. |
| `pnpm build` | Build all packages that define a `build` script. |
| `pnpm db:seed` | Optional demo workspace (`packages/db/scripts/seed.ts`; needs tables created first). |
| `pnpm lint` | Typecheck backend + lint frontend. |

---

## Local development

1. **Create DynamoDB tables** matching **`docs/dynamodb-tables.md`** (same prefix as `DYNAMODB_TABLE_PREFIX`).

2. Start **Redis** (and optionally DynamoDB Local)  
   ```bash
   docker compose up -d redis
   ```

3. Install deps and configure `.env` (see [.env.example](.env.example)).

4. Run backend and frontend in two terminals  
   ```bash
   pnpm install
   pnpm dev:backend
   pnpm dev:frontend
   ```

5. Open the dashboard at **http://localhost:5173**, register or log in, and copy the **workspace API key** from **Settings** for the widget.

6. (Optional) Seed a demo owner after tables exist  
   ```bash
   pnpm db:seed
   ```

---

## Docker: full stack

```bash
docker compose up --build
```

- **Redis** → `localhost:6379`
- **Backend** starts on **3001**; configure AWS/Dynamo env so it can reach your tables (or DynamoDB-compatible endpoint).
- **Frontend** image serves the static build behind **nginx** on **5173** and proxies REST to the API at **`/api-proxy/...`** (see `apps/frontend/nginx.conf`)

Production dashboard builds should set **`VITE_API_URL=/api-proxy`** (already done in `apps/frontend/Dockerfile`) so the SPA talks to the same host.

---

## Embedding the widget

Build the bundle:

```bash
pnpm --filter @voicewidget/widget build
```

Serve `apps/widget/dist/widget.js` from your CDN or static host, then embed:

```html
<script
  src="https://your-cdn.example/voice-widget/widget.js"
  data-api-key="YOUR_WORKSPACE_API_KEY"
  data-backend-url="https://api.yourdomain.com"
  data-lang="ta"
  async
></script>
```

| Attribute | Description |
| --------- | ----------- |
| `data-api-key` | **Required.** Workspace API key from the dashboard. |
| `data-backend-url` | **Required in production.** Origin of the Socket.IO server (scheme + host + optional port). |
| `data-lang` | Optional hint: `ta` \| `hi` \| `en` (workspace STT/TTS locale still comes from dashboard config). |

The widget runs inside a **Shadow DOM** so host-page CSS does not clash with the floating mic + transcript UI.

---

## Local widget testing

With **`pnpm dev:frontend`** and **`pnpm dev:backend`** running:

- Point the script at **`http://localhost:5173`** for `data-backend-url` so the Vite dev server proxies **`/socket.io`** WebSocket traffic to port **3001** (`apps/frontend/vite.config.ts`).
- Or set **`data-backend-url`** to **`http://localhost:3001`** and ensure CORS / `WIDGET_ALLOWED_ORIGINS` allows your test page origin.

---

## Claude tools (backend)

When the pipeline runs, Claude may call:

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
- Razorpay webhooks depend on verifying signatures with **`RAZORPAY_WEBHOOK_SECRET`** and raw JSON body handling on **`POST /billing/webhook`**.

---

## Further reading

- High-level MVP spec and phased roadmap: **`docs/AGENTS.md`**.
