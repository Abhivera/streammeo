# Streammeo documentation

## Audiences

| Audience | In-app | Docs |
| -------- | ------ | ---- |
| **Customers** (end users) | [/help](http://localhost:5173/help) | [help/](./help/README.md) |
| **Your team** (agents, admins) | [/docs](http://localhost:5173/docs) | In-app guides (see below) |
| **Developers / ops** | — | This page + [README](../README.md) |

---

## Team guides (in-app)

Agent and admin guides render in the console at **/docs**. Content is defined in `frontend/src/docs/guides.ts` (not separate markdown files in this folder).

| Guide | Route |
| ----- | ----- |
| Getting started | [/docs/getting-started](http://localhost:5173/docs/getting-started) |
| Agent console | [/docs/agent-console](http://localhost:5173/docs/agent-console) |
| Workspace & settings | [/docs/settings](http://localhost:5173/docs/settings) |
| Live chat widget | [/docs/live-chat-widget](http://localhost:5173/docs/live-chat-widget) |
| Customer portal & CSAT | [/docs/customer-experience](http://localhost:5173/docs/customer-experience) |

To edit copy, update `frontend/src/docs/guides.ts`.

---

## Customer help (markdown)

End-user guides for people contacting a company for support.

| Guide | File |
| ----- | ---- |
| [Help center index](./help/README.md) | Overview |
| [How to get help](./help/getting-help.md) | Email, chat, ticket links |
| [Using live chat](./help/live-chat.md) | Chat bubble on a website |
| [Track your request](./help/track-your-request.md) | Portal link and status |
| [Rate your experience](./help/rate-your-experience.md) | CSAT surveys |
| [FAQ](./help/faq.md) | Common questions |

Share **/help** with customers (e.g. `https://your-app.com/help`).

---

## Local development

### Prerequisites

- Node.js 24+
- Docker (DynamoDB Local + Redis)

### Setup

```bash
cp .env.example .env    # repo root
docker compose up dynamodb redis -d

cd backend && npm install
npm run db:create-table
npm run db:seed
npm run dev

cd ../frontend && npm install
npm run dev
```

| Service | URL |
| ------- | --- |
| Agent console | http://localhost:5173 |
| Team docs | http://localhost:5173/docs |
| Customer help | http://localhost:5173/help |
| Widget demo | http://localhost:5173/widget-demo.html |
| API | http://localhost:3001 |

Demo logins after seed (password `password123`): `admin@streammeo.com`, `manager@streammeo.com`, `agent@streammeo.com`.

### Environment (`.env`)

Single file at the **repo root** — shared by backend, frontend (Vite `VITE_*`), and CDK deploy.

| Variable | Local | Production |
| -------- | ----- | ------------ |
| `JWT_SECRET` | Required (16+ chars) | Required; baked into Lambda at deploy |
| `FRONTEND_URL` | `http://localhost:5173` | Your app URL (API Gateway CORS) |
| `DYNAMODB_ENDPOINT` | `http://localhost:8000` | Unset (use AWS DynamoDB) |
| `REDIS_URL` | `redis://localhost:6379` | Local/Docker only (Socket.IO presence) |
| `VITE_API_URL` | Empty (Vite proxies `/api`) | CDK `ApiUrl` |
| `BREVO_API_KEY` | Optional | Baked into Lambda; email via SQS worker |
| `EMAIL_QUEUE_URL` | Omit (direct Brevo) | CDK `EmailQueueUrl` |
| `UPLOADS_*` | Optional | S3 + CloudFront from CDK |
| `APPSYNC_*` / `VITE_APPSYNC_*` | Optional | Ticket realtime in agent console |

Full list: [.env.example](../.env.example).

---

## Production deploy (AWS CDK)

Stack **StreammeoApi** — API Gateway, Lambda (REST API + email worker + SLA checker), DynamoDB, AppSync, S3/CloudFront, SQS.

```bash
cp .env.example .env
# Set JWT_SECRET + FRONTEND_URL (production URL)

cd backend && npm install && npm run cdk:deploy
npm run postdeploy --prefix backend/infrastructure
# Merge printed KEY=value lines into repo-root .env
```

Details: [backend/infrastructure/README.md](../backend/infrastructure/README.md).

| Lambda | Role |
| ------ | ---- |
| `ApiHandler` | Full Fastify REST API |
| `EmailWorker` | SQS → Brevo outbound email |
| `SlaChecker` | SLA breach detection (every 1 min) |

**Local vs Lambda:** Socket.IO live chat and presence run on the local/Docker Fastify server only. On Lambda, tickets use AppSync for realtime; chat REST works but push/typing need local server or future WebSocket work.

Webhook URLs (same `ApiUrl` base):

- `POST /api/v1/webhooks/email/inbound`
- `POST /api/v1/webhooks/email/status`
- `POST /api/v1/billing/webhook`

---

## Reference

| Topic | Location |
| ----- | -------- |
| API routes, roadmap, repo layout | [README](../README.md) |
| CDK commands & deploy env | [backend/infrastructure/README.md](../backend/infrastructure/README.md) |
| Widget embed source | `frontend/public/chat-widget.js` |
| Chat widget TypeScript | `frontend/src/chat-widget/` |
