# Streammeo

**Product:** AI Customer Service & Ticketing SaaS  
**Version:** 1.0  
**Target market:** B2B SaaS  
**Last updated:** June 2026

Streammeo is a B2B customer service and ticketing platform that helps companies resolve customer issues faster through unified inbox management, intelligent email routing, AI-assisted replies, and real-time analytics.

Companies subscribe to Streammeo as their central command centre for all customer support operations — from first contact to full resolution.

**Core value proposition:**

- One unified queue for all support channels (email, chat, social, SMS)
- AI that classifies, suggests, and deflects — reducing agent workload by 30%+
- SLA enforcement with real-time breach alerts
- Deep analytics so managers can act on data, not instinct

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Target personas](#target-personas)
3. [Feature modules](#feature-modules)
4. [User stories](#user-stories)
5. [Non-functional requirements](#non-functional-requirements)
6. [Success metrics](#success-metrics-north-star-kpis)
7. [Pricing tiers](#pricing-tiers)
8. [Delivery roadmap](#delivery-roadmap)
9. [Integrations](#integrations)
10. [Implementation status](#implementation-status)
11. [Quick start](#quick-start)
12. [API overview](#api-overview)
13. [Repository layout](#repository-layout)

---

## Tech stack

| Layer | Technology |
| ----- | ---------- |
| **Frontend** | React 18 · Vite · TypeScript · Tailwind CSS |
| **Backend / API** | Node.js · Fastify · REST |
| **Database** | PostgreSQL (primary) · Prisma ORM |
| **Cache / queues** | Redis |
| **Email infrastructure** | Brevo |
| **Real-time** | WebSockets via Socket.IO |
| **AI / ML** | Anthropic Claude *(MVP)* · Amazon Bedrock *(planned — Q2)* |
| **Infrastructure** | AWS *(planned — production)* |
| **Auth** | JWT *(Firebase SSO planned — Q3)* |
| **Payments** | Razorpay |
| **Monitoring** | CloudWatch *(planned — production)* |
| **Search** | Elasticsearch *(planned — Q3)* |

---

## Target personas

| Persona | Role | Primary needs |
| ------- | ---- | ------------- |
| **Support Manager** | Oversees agents and SLAs | Dashboards, escalation workflows, team performance |
| **Support Agent** | Handles daily tickets | Fast reply tools, collision detection, canned responses |
| **IT / Ops Admin** | Configures integrations | SSO, security policies, API access |
| **End Customer** | Submits support requests | Fast response, clear communication, self-service portal |

---

## Feature modules

### 3.1 Ticket Management — P0 (MVP)

The core ticketing engine. All other modules depend on this being solid.

**Features:**

- Multi-channel ticket creation (email, web form, API, live chat)
- Auto-assignment by team, skill, or round-robin rule
- Priority tiers: Low, Normal, High, Urgent
- Custom ticket fields with field validation
- Ticket tags, labels, and internal private notes
- Ticket merging, splitting, and cross-linking
- Collision detection — shows who is currently viewing or typing on a ticket
- SLA policies with configurable breach alerts
- Full ticket timeline and audit trail
- Bulk actions: assign, close, tag, delete
- Saved views and smart filter presets
- Auto re-open and re-assign on customer reply

### 3.2 Email Engine — P0 (MVP)

Shared inbox infrastructure that converts emails into tickets and enables branded outbound communication.

**Features:**

- Shared team inboxes with permission controls per inbox
- Custom email domain (e.g. `support@yourcompany.com`)
- Automatic email-to-ticket conversion on inbound
- CC / BCC support on ticket reply threads
- Canned responses and rich reply template library
- Auto-responder with business hours logic
- Email forwarding and conditional routing rules
- Bounce, spam, and out-of-office filtering
- Full HTML email composer with file attachments
- Delivery status tracking: sent, delivered, read, bounced
- Per-agent email signature manager
- DKIM / SPF / DMARC setup wizard

### 3.3 AI Assistant — P1 (Growth)

AI-powered layer that reduces manual effort for agents and deflects repetitive tickets automatically.

**Features:**

- Automatic ticket classification and tag suggestion
- AI-drafted suggested reply (agent reviews before sending)
- Sentiment detection: positive, neutral, frustrated, angry
- Long-thread summariser — one-click ticket summary for agents
- AI chatbot for self-service deflection before ticket creation
- Knowledge base article suggestions based on ticket content
- Intent detection for smart routing to the right team
- Automatic language detection and reply translation
- Real-time agent assist panel with live reply suggestions
- Auto-escalation trigger on highly negative sentiment
- CSAT prediction score before ticket is resolved
- Custom AI persona and tone of voice settings per workspace

### 3.4 Live Chat & Channels — P1 (Growth)

Real-time and asynchronous channels that feed into the unified Streammeo queue.

**Features:**

- Embeddable live chat widget (web and mobile SDK)
- AI chatbot → human agent handoff flow
- Chat-to-ticket conversion for async follow-up
- Typing indicators and read receipts in chat
- WhatsApp Business API integration
- Facebook Messenger shared inbox
- Twitter / X Direct Message support
- Instagram comments and DM inbox
- SMS via Twilio integration
- Voice call transcription (via third-party integration)
- Visitor tracking and pre-chat survey form
- Proactive chat triggers based on visitor behaviour

### 3.5 Knowledge Base & Portal — P1 (Growth)

Self-service layer that empowers customers to resolve issues without agent involvement.

**Features:**

- Rich text article editor (text, images, video embeds, tables)
- Category and subcategory organisation with drag-and-drop
- Article visibility: public, internal (agent-only), or customer-gated
- AI-powered semantic search for the KB portal
- Article helpfulness feedback (thumbs up / thumbs down)
- Customer self-service ticket portal (view, reply, reopen)
- Custom branding: logo, colours, domain for the portal
- Article version history and rollback
- SEO meta title and description per article
- In-widget KB article suggestions before ticket submission

### 3.6 Analytics & Reporting — P1 (Growth)

Data layer for managers to track team health, SLA compliance, and customer satisfaction.

**Features:**

- Real-time overview dashboard (live queue, active agents, open tickets)
- Ticket volume trends (daily, weekly, monthly breakdowns)
- First Response Time (FRT) tracking per team and agent
- Average Resolution Time (ART) trends
- SLA compliance report with breach drill-down
- CSAT survey automation and score tracking over time
- Agent leaderboard and individual performance stats
- Ticket source breakdown by channel
- Custom report builder with saved report templates
- Scheduled report delivery by email (CSV or PDF)
- Tag and category volume analytics
- AI deflection rate and chatbot resolution tracking

### 3.7 Admin, Security & Compliance — P2 (Enterprise)

Enterprise-grade controls for access management, data governance, and regulatory compliance.

**Features:**

- Role-based access control (RBAC) with custom role creation
- Single sign-on via Google Workspace, Okta, and SAML 2.0
- Two-factor authentication (2FA) with enforcement policy
- Full audit logs with searchable event history and export
- IP allowlist and denylist for workspace access
- Configurable data retention policies per workspace
- GDPR data deletion request handling
- SOC 2 Type II compliance (Business and Enterprise)
- HIPAA mode with BAA (Enterprise only)
- 99.99% uptime SLA with dedicated infrastructure (Enterprise)

**Priority legend**

| Priority | Label | Meaning |
| -------- | ----- | ------- |
| P0 | Must Have | Required for MVP launch. Blocking. |
| P1 | Should Have | Required for Growth plan and product differentiation. |
| P2 | Nice to Have | Adds significant value; required for Enterprise segment. |

---

## User stories

### P0 — Must have

> **US-01:** As a support agent, I want to see all incoming tickets in one unified queue so I can prioritise my work without switching between tools.

> **US-02:** As a support manager, I want to configure SLA breach alerts so my team never misses a response time target without being warned first.

> **US-03:** As an admin, I want to set up a custom email domain so customers receive replies from our brand email address, not a generic one.

> **US-04:** As a support agent, I want to see if a colleague is already viewing or typing on a ticket so we don't send duplicate replies.

### P1 — Should have

> **US-05:** As a support agent, I want AI to draft a suggested reply based on the ticket content so I can respond faster with less effort.

> **US-06:** As a customer, I want to check the status of my open ticket on a self-service portal without emailing support again.

> **US-07:** As a support manager, I want to see agent performance metrics and CSAT scores in one dashboard so I can identify coaching opportunities.

> **US-08:** As a support agent, I want WhatsApp and email tickets to appear in the same queue so I have one consistent workflow regardless of channel.

### P2 — Nice to have

> **US-09:** As an enterprise IT admin, I want SAML 2.0 SSO so agents sign in with our existing identity provider and I can manage access centrally.

> **US-10:** As a manager, I want scheduled PDF reports sent to my inbox every Monday so I can review weekly performance without logging in.

---

## Non-functional requirements

| Category | Requirement |
| -------- | ----------- |
| **Performance** | Page load under 2s (p95). Ticket actions under 300ms. Real-time updates via WebSocket. |
| **Security** | TLS 1.3 in transit. AES-256 at rest. Annual third-party penetration testing. |
| **Availability** | 99.9% uptime for Starter/Growth. 99.95% for Business. 99.99% for Enterprise with multi-region failover. |
| **Scalability** | Handle 1M+ tickets per month. Horizontal autoscaling. Queue-based async processing for email and webhooks. |
| **Accessibility** | WCAG 2.1 AA for the agent UI and customer portal. Fully keyboard-navigable. |
| **API** | REST API and webhooks on all paid plans. Rate-limited per tier. OpenAPI 3.0 spec published and versioned. |
| **Internationalisation** | UI available in English, Spanish, French, German, and Portuguese at launch. More via community contributions. |

---

## Success metrics (North Star KPIs)

| Metric | Target |
| ------ | ------ |
| Median first response time | < 4 hours |
| SLA compliance rate | > 90% |
| Average CSAT score | > 4.5 / 5 |
| Average resolution time | < 24 hours |
| AI deflection rate | > 30% |
| Platform monthly churn | < 2% |

---

## Pricing tiers

### Starter — $29 / month

- Up to 3 agents
- 500 tickets per month
- 1 shared inbox
- Basic email routing
- Standard reports
- Knowledge base (50 articles)

### Growth — $79 / month *(Most Popular)*

- Up to 10 agents
- 5,000 tickets per month
- 5 shared inboxes
- Live chat widget
- AI suggested replies (500 / month)
- CSAT surveys
- Full analytics dashboard
- Zapier integration

### Business — $199 / month

- Up to 50 agents
- Unlimited tickets
- Unlimited inboxes
- AI assistant (unlimited)
- Multi-brand support
- SSO / SAML 2.0
- REST API + webhooks
- SOC 2 Type II

### Enterprise — Custom pricing

- Unlimited agents
- Dedicated infrastructure
- Custom AI model (fine-tuning)
- 99.99% uptime SLA
- HIPAA compliance + BAA
- Dedicated Customer Success Manager
- Onboarding and agent training
- White-label portal option
- Custom data retention

> Annual billing: 20% discount applied across all plans.

---

## Delivery roadmap

### Q1 — MVP: Core Ticketing & Email

**Goal:** Acquire first paying customers on Starter plan.

**Deliverables:**

- Ticket CRUD with full state machine (new → open → pending → resolved → closed)
- Shared inbox with email-to-ticket conversion
- Email routing rules and auto-responder
- Agent dashboard and queue view
- User auth, workspace setup, and Razorpay billing

### Q2 — Growth: AI, Live Chat & SLAs

**Goal:** Drive Growth plan adoption and differentiate on AI.

**Deliverables:**

- Live chat embeddable widget
- AI suggested replies and ticket classification
- SLA policy engine with breach alerts
- CSAT post-resolution survey
- Knowledge base and self-service portal
- Zapier and Make (Integromat) connectors

### Q3 — Scale: Channels, Social & Advanced Analytics

**Goal:** Expand channel coverage; launch Business plan.

**Deliverables:**

- WhatsApp Business API and SMS (Twilio)
- Facebook Messenger, Twitter/X, Instagram inboxes
- Advanced analytics and custom report builder
- No-code chatbot flow builder with NLU
- SSO via Google and Okta
- Multi-brand workspace support

### Q4 — Enterprise: Compliance, Custom AI & Dedicated Infra

**Goal:** Enter regulated industries; close first Enterprise contracts.

**Deliverables:**

- SOC 2 Type II audit completion
- HIPAA mode with BAA
- Fine-tuned AI model per Enterprise workspace
- Dedicated infrastructure (single-tenant option)
- White-label portal with custom domain
- Custom SLA agreements and dedicated CSM portal

---

## Integrations

| Category | Integrations |
| -------- | ------------ |
| **Email** | Gmail, Outlook, Postmark, SendGrid, AWS SES |
| **CRM** | Salesforce, HubSpot, Pipedrive |
| **Collaboration** | Slack, Microsoft Teams |
| **Project Management** | Jira, Asana, Linear, Trello |
| **Messaging** | WhatsApp Business, Twilio SMS, Telegram |
| **Social** | Facebook Messenger, Twitter/X, Instagram |
| **Payments** | Razorpay |
| **Automation** | Zapier, Make (Integromat), n8n |
| **Auth** | Google Workspace SSO, Okta, SAML 2.0, Auth0 |
| **Developer** | REST API, Webhooks, OpenAPI 3 Spec |

---

## Implementation status

What exists in this repo today vs the PRD roadmap. Last audited against the codebase in **June 2026**.

**Legend:** ✅ Done · 🟡 Partial (works but incomplete) · ❌ Not started

### Core platform

| Area | Status | Notes |
| ---- | ------ | ----- |
| Monorepo layout (`backend/` + `frontend/`) | ✅ | Independent npm projects; shared root `.env` |
| Docker Compose (Postgres, Redis, API, UI) | ✅ | `docker-compose.yml` at repo root |
| Prisma schema + seed script | ✅ | No versioned `migrations/` yet — use `db push` or `migrate dev` locally |
| JWT auth (register / login / me) | ✅ | Email + password; roles: `admin`, `manager`, `agent` |
| Razorpay billing | ✅ | Checkout, verify, webhook; plan limits enforced on tickets + AI usage |
| Socket.IO presence (Redis-backed) | ✅ | Ticket view + typing collision detection |
| Webhook Lambda + AppSync fan-out | ✅ | Shared handlers; AWS CDK stack for production webhooks |

### Ticket management (P0)

| Area | Status | Notes |
| ---- | ------ | ----- |
| Ticket CRUD + state machine | ✅ | `new → open → pending → resolved → closed` with validated transitions |
| Unified queue + filters | ✅ | Status, priority, search, tag filter, cursor pagination |
| Ticket detail, replies, internal notes | ✅ | Agent console + full timeline/audit events |
| Priority tiers | ✅ | low / normal / high / urgent (API; read-only in ticket UI today) |
| Bulk actions | ✅ | Close, resolve, delete via queue UI; tag assign via API only |
| Portal auto re-open on customer reply | ✅ | Customer portal reply reopens resolved/pending tickets |
| Tags | 🟡 | List + bulk-assign API; no tag create API or tagging UI |
| Assignee management | 🟡 | API supports assign; UI shows assignee but cannot change it |
| Custom ticket fields | ❌ | — |
| Ticket merge / split / cross-link | ❌ | — |
| Saved views / smart filter presets | ❌ | Basic filters only |
| Auto-assignment (round-robin, skill, team) | ❌ | — |

### Email engine (P0)

| Area | Status | Notes |
| ---- | ------ | ----- |
| Shared inboxes (CRUD) | ✅ | API + settings UI (name, email) |
| Inbound email webhook → ticket | ✅ | `POST /api/v1/webhooks/email/inbound` |
| Outbound email on agent reply | 🟡 | Brevo send when `BREVO_API_KEY` set; stub otherwise; plain text only |
| Auto-responder | 🟡 | Adds an auto-reply comment on inbound ticket; does not email the customer |
| Email routing rules | 🟡 | Stored on inbox model; not evaluated on inbound mail |
| Business hours logic | 🟡 | Schema fields exist; not enforced |
| CC / BCC, HTML composer, attachments | ❌ | — |
| DKIM / SPF / DMARC wizard | ❌ | — |
| Bounce / spam / OOO filtering | ❌ | Status webhook logs only |
| Per-agent email signatures | ❌ | — |

### SLA & analytics (P0 / P1)

| Area | Status | Notes |
| ---- | ------ | ----- |
| SLA policies (CRUD) | ✅ | API + settings UI |
| SLA breach detection | ✅ | Background checker every 60s; breach flag + timeline event |
| Dashboard overview | ✅ | Open count, volume, resolution rate, SLA breaches, CSAT avg, recent tickets |
| CSAT surveys | ✅ | Triggered on resolve; email link + `/portal/csat/:token` page |
| CSAT summary API | ✅ | `GET /api/v1/csat/summary` |
| FRT / ART reports, agent leaderboard | ❌ | — |
| Custom reports + scheduled delivery | ❌ | — |

### AI assistant (P1)

| Area | Status | Notes |
| ---- | ------ | ----- |
| AI suggested reply | ✅ | Anthropic Claude when `ANTHROPIC_API_KEY` set; template fallback; Growth+ plan gate |
| Ticket classification / tagging | ❌ | — |
| Sentiment detection | ❌ | — |
| Thread summariser | ❌ | — |
| AI chatbot deflection | ❌ | Live chat uses a static bot message |
| KB article suggestions in tickets | ❌ | — |
| Amazon Bedrock integration | ❌ | Planned Q2 |

### Live chat & channels (P1)

| Area | Status | Notes |
| ---- | ------ | ----- |
| Embeddable live chat widget | ✅ | `frontend/public/chat-widget.js` — Shadow DOM, start/message/convert API |
| Chat → ticket conversion | ✅ | `POST /api/v1/chat/:sessionId/convert` |
| Real-time agent handoff | ❌ | Widget is visitor ↔ static bot only |
| WhatsApp / SMS / social inboxes | ❌ | Planned Q3 |

### Knowledge base & portal (P1)

| Area | Status | Notes |
| ---- | ------ | ----- |
| KB articles + categories (CRUD) | ✅ | Plain-text editor in agent console |
| Public KB search API | ✅ | Keyword search via `GET /api/v1/portal/:slug/kb` |
| Article helpfulness feedback | ✅ | API only |
| Customer ticket portal | ✅ | `/portal/ticket/:token` — view thread + reply |
| Public KB portal UI | ❌ | API exists; no customer-facing KB page in frontend |
| Rich text editor, version history, SEO | ❌ | — |
| Semantic / AI search | ❌ | Keyword match only |

### Agent console (frontend)

| Page | Status |
| ---- | ------ |
| Landing, login, register | ✅ |
| Dashboard | ✅ |
| Ticket queue + detail | ✅ |
| Settings (workspace, billing, widget embed) | ✅ |
| Inboxes, SLA, canned responses, knowledge base | ✅ |
| Customer portal + CSAT pages | ✅ |
| Team / agent management | ❌ |
| Tag management | ❌ |
| Assignee / priority pickers on tickets | ❌ |

### Infrastructure & enterprise (P2 / production)

| Area | Status | Notes |
| ---- | ------ | ----- |
| Local dev stack | ✅ | Docker Compose + Vite proxy |
| AWS webhook deploy (CDK + Lambda + AppSync) | ✅ | `backend/infrastructure/` — webhook routes only |
| Full AWS API deploy (entire Fastify app) | ❌ | Main API still runs on Node/Fastify or Docker |
| CloudWatch monitoring | ❌ | Planned |
| Elasticsearch search | ❌ | Planned Q3 |
| SSO / SAML / Google Workspace / 2FA | ❌ | Planned Q3–Q4 |
| RBAC custom roles, audit log UI, IP allowlist | ❌ | Basic role enum only |
| SOC 2 / HIPAA / GDPR tooling | ❌ | Planned Q4 |
| Zapier / CRM / Slack integrations | ❌ | — |

### Roadmap phase summary

| Phase | Goal | Progress |
| ----- | ---- | -------- |
| **Q1 — MVP** | Core ticketing + email + auth + billing | **~75%** — core flows work; email routing, assignee UI, and tag management remain |
| **Q2 — Growth** | AI, live chat, SLA, CSAT, KB, portal | **~60%** — most APIs + agent UI done; chat handoff, public KB UI, and advanced AI missing |
| **Q3 — Scale** | Social/SMS channels, SSO, advanced analytics | **Not started** |
| **Q4 — Enterprise** | Compliance, dedicated infra, white-label | **Not started** |

---

## Webhooks (Lambda + AppSync)

Inbound webhooks use **shared handler logic** in `backend/src/webhooks/`. The same code runs in two places:

| Environment | Entry point | Use when |
| ----------- | ----------- | -------- |
| **Local dev** | Fastify (`backend/src/index.ts`) | `npm run dev` — webhooks hit `http://localhost:3001/...` |
| **Production** | Lambda (`backend/src/lambda/webhook-handler.ts`) | Deployed via CDK — Brevo/Razorpay point at API Gateway URL |

After a webhook is processed, handlers publish events to **AWS AppSync** so the agent console can refresh in real time (e.g. new email ticket appears in the queue without polling).

### Webhook routes

| Provider | Path | Lambda | AppSync event |
| -------- | ---- | ------ | ------------- |
| Brevo (inbound email) | `POST /api/v1/webhooks/email/inbound` | ✅ | `publishTicketEvent` (`ticket.created`) |
| Brevo (delivery status) | `POST /api/v1/webhooks/email/status` | ✅ | `publishEmailStatus` |
| Razorpay (billing) | `POST /api/v1/billing/webhook` | ✅ | `publishBillingEvent` (`billing.plan_upgraded`) |

### Deploy webhook stack (AWS)

```bash
cd backend/infrastructure
npm install

# Required at deploy time (use your RDS / Secrets Manager URL in prod)
export DATABASE_URL=postgresql://...
export JWT_SECRET=...
export BREVO_WEBHOOK_SECRET=...
export RAZORPAY_KEY_ID=...
export RAZORPAY_KEY_SECRET=...
export RAZORPAY_WEBHOOK_SECRET=...

npm run deploy
```

CDK outputs:

- `WebhookApiUrl` — base URL; append route path for each provider
- `AppSyncGraphqlUrl` + `AppSyncApiKey` — set in root `.env` as `APPSYNC_*` and `VITE_APPSYNC_*`

### AppSync subscriptions (agent console)

When `VITE_APPSYNC_GRAPHQL_URL` and `VITE_APPSYNC_API_KEY` are set, the ticket queue subscribes to `onTicketEvent(workspaceId)` and auto-refreshes when webhooks create tickets.

---

## Quick start

### 1. Environment

```bash
cp .env.example .env
```

Set `DATABASE_URL` to match your Postgres instance. With root `docker compose up postgres`, use:

`postgresql://postgres:postgres@localhost:5432/streammeo`

### 2. Start Postgres + Redis

```bash
docker compose up postgres redis -d
# or use an existing Postgres + Redis on localhost
```

### 3. Backend

```bash
cd backend
npm install
npm run db:generate
npm run db:migrate   # or: cd packages/db && npx prisma db push
npm run db:seed
npm run dev
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Demo login after seed:

- Email: `demo@streammeo.com`
- Password: `password123`

---

## API overview

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/api/v1/auth/register` | Create user + workspace |
| POST | `/api/v1/auth/login` | Agent login |
| GET | `/api/v1/auth/me` | Current user + workspace |
| GET | `/api/v1/tickets` | List tickets (filters: status, search, priority) |
| GET | `/api/v1/tickets/:id` | Ticket detail + timeline |
| POST | `/api/v1/tickets` | Create ticket |
| PATCH | `/api/v1/tickets/:id` | Update status, priority, assignee |
| POST | `/api/v1/tickets/:id/comments` | Public reply or internal note |
| POST | `/api/v1/tickets/bulk` | Bulk assign / status / tag |
| GET | `/api/v1/inboxes` | List shared inboxes |
| POST | `/api/v1/inboxes` | Create inbox |
| PATCH | `/api/v1/inboxes/:id` | Update inbox + routing rules |
| GET | `/api/v1/sla-policies` | List SLA policies |
| POST | `/api/v1/sla-policies` | Create SLA policy |
| GET | `/api/v1/canned-responses` | List canned responses |
| POST | `/api/v1/canned-responses` | Create canned response |
| PATCH | `/api/v1/canned-responses/:id` | Update canned response |
| DELETE | `/api/v1/canned-responses/:id` | Delete canned response |
| POST | `/api/v1/ai/suggest-reply` | AI-drafted reply suggestion |
| GET | `/api/v1/kb/articles` | List knowledge base articles |
| POST | `/api/v1/kb/articles` | Create KB article |
| GET | `/api/v1/portal/:slug/kb` | Public KB search |
| GET | `/api/v1/portal/ticket/:token` | Customer ticket portal |
| POST | `/api/v1/billing/checkout` | Create Razorpay order |
| POST | `/api/v1/billing/verify` | Verify payment signature + upgrade plan |
| POST | `/api/v1/billing/webhook` | Razorpay webhook (payment.captured) |
| POST | `/api/v1/chat/start` | Start live chat (widget) |
| GET | `/api/v1/analytics/overview` | Dashboard metrics |
| GET | `/api/v1/billing/plans` | Plan definitions |
| GET | `/api/v1/billing/usage` | Workspace usage |
| POST | `/api/v1/webhooks/email/inbound` | Inbound email → ticket |
| POST | `/api/v1/webhooks/email/status` | Email delivery status |

**Realtime:** connect Socket.IO to `/socket.io` with JWT in `auth.token`.

| Event | Direction | Description |
| ----- | --------- | ----------- |
| `ticket:join` | Client → Server | Subscribe to ticket presence |
| `ticket:leave` | Client → Server | Unsubscribe |
| `ticket:typing` | Client → Server | Broadcast typing state |
| `ticket:presence` | Server → Client | List of agents viewing ticket |
| `ticket:typing` | Server → Client | Another agent is typing |

---

## Repository layout

```
streammeo/
├── .env.example
├── docker-compose.yml
├── backend/
│   ├── src/
│   │   ├── auth/           # Register, login, JWT middleware
│   │   ├── tickets/        # Ticket CRUD, comments, bulk actions
│   │   ├── inbox/          # Shared inboxes, canned responses
│   │   ├── sla/            # SLA policies, breach checker
│   │   ├── email/          # Brevo inbound webhook + outbound send
│   │   ├── analytics/      # Dashboard metrics
│   │   ├── billing/        # Razorpay plans + checkout
│   │   ├── ai/             # Suggested reply drafts
│   │   ├── kb/             # Knowledge base articles
│   │   ├── csat/           # Post-resolution surveys
│   │   ├── portal/         # Customer self-service portal
│   │   ├── chat/           # Live chat widget API
│   │   ├── presence/       # Socket.IO collision detection
│   │   ├── webhooks/       # Shared inbound webhook handlers
│   │   ├── realtime/       # AppSync publish client
│   │   └── lambda/         # AWS Lambda entry (webhook-handler)
│   ├── infrastructure/     # CDK: API Gateway + Lambda + AppSync
│   └── packages/
│       ├── db/             # Prisma schema + seed
│       └── shared/         # Plans, ticket status helpers
└── frontend/               # Agent console (Vite + React)
    └── src/pages/          # Dashboard, tickets, settings, inboxes, SLA
```

---

*Streammeo PRD v1.0 — internal product reference.*
