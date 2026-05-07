# Audio Agent

A real-time voice AI agent built with SarvamAI for STT/TTS/LLM, with optional Groq LLM support and Tavily web search.

## Prerequisites

- Node.js (v22+)
- npm (v10+)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create the backend `.env` file:

```bash
cp apps/backend/.env.example apps/backend/.env
```

3. Fill in your API keys in `apps/backend/.env`:

```
SARVAM_API_KEY="your-sarvam-api-key"
TAVILY_API_KEY="your-tavily-api-key"

LLM_PROVIDER=sarvam
GROQ_API_KEY=""
GROQ_MODEL=qwen/qwen3-32b
```

## Running

Start backend and frontend in separate terminals:

```bash
npm run dev:backend    # Express + Socket.IO on http://localhost:8880
npm run dev:frontend   # Vite + React on http://localhost:5173
```

## Tech Stack

- **Backend:** Express 5, Socket.IO, SarvamAI SDK, TypeScript
- **Frontend:** React 19, Vite 8, Socket.IO Client
- **Monorepo:** npm workspaces
