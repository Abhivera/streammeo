# CDK (`backend/infrastructure`)

Deploys API Gateway, Lambda (Fastify API + email worker + SLA checker), DynamoDB, AppSync, S3/CloudFront, and SQS.

## `.env`

Load path: repo root `.env` (same folder as `docker-compose.yml`).

```bash
cp .env.example .env
```

**Required at deploy:** `JWT_SECRET` (16+ chars), `FRONTEND_URL`

**After deploy:** run `npm run postdeploy` and merge printed values into `.env`. Unset `DYNAMODB_ENDPOINT` in production.

AWS credentials via `aws configure` or shell env — not stored in `.env` by default.

## Commands

```bash
npm run cdk:deploy --prefix backend
# or: cd backend/infrastructure && npm run deploy
```

Also: `synth`, `diff`, `destroy`, `postdeploy`.
