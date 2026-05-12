# Streammeo — agent notes

Monorepo (**npm** workspaces): `apps/backend`, `apps/frontend`, `apps/widget`, `packages/db`, `packages/shared`.

## Stack (current)

- **Backend:** Express, Socket.IO, Zod config, JWT auth, optional Firebase Admin for `POST /auth/firebase-session` (Google → app JWT).
- **Persistence:** MongoDB via `packages/db` (`StreammeoStore`, repos under `packages/db/src/repos/`, connection in `packages/db/src/mongo/connect.ts`). No Redis; usage minutes live on workspace documents.
- **Voice:** Deepgram STT/TTS, Groq LLM (both required in production config).
- **Frontend:** Vite + React; `VITE_API_URL` for production API origin; optional `VITE_FIREBASE_*` for Google button.

## Setup pointers

- Copy **`.env.example`** → **`.env`** and **`apps/frontend/.env.example`** → **`apps/frontend/.env`**.
- Run MongoDB; set **`MONGODB_URI`** (and optional **`MONGODB_DB_NAME`**).
- **`npm run db:seed`** clears app collections and inserts test data (destructive).

Full install, env table, Docker, and widget embedding: see repository **`README.md`**.
