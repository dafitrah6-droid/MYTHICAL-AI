# MYTHICAL AI

A premium autonomous AI platform built for reasoning, memory, automation, and intelligent execution.

## Overview

MYTHICAL AI is a full-stack AI application designed to deliver a secure, deployable platform with a dedicated frontend and backend workspace.

This repository uses npm workspaces so you can manage frontend and backend tasks from the root.

## Prerequisites

- Node.js 20+ and npm 10+
- Docker and Docker Compose for container orchestration
- PostgreSQL, Redis, and a vector database available locally or via Docker
- Google Cloud credentials for Vertex AI or an appropriate AI API key

## Quick Start

1. Clone the repository:

   ```bash
   git clone <repo-url> mythic-ai
   cd mythical-ai
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy environment settings:

   ```bash
   npm run setup
   ```

4. Update `.env` with your own values.

## Root Workspace Commands

From the root of the repository, you can run:

- `npm run dev` — start both frontend and backend in development mode
- `npm run build` — build the frontend app and validate the backend service
- `npm run lint` — run workspace-level checks for frontend and backend
- `npm run setup` — copy `.env.example` to `.env`

## Environment Variables

The root `.env.example` includes all required variables:

- `API_BACKEND_HOST`
- `API_BACKEND_PORT`
- `API_PAYLOAD_MAX_SIZE`
- `CORS_ALLOWED_ORIGINS`
- `PROXY_HEADER`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `API_KEY`
- `DATABASE_URL`
- `REDIS_URL`
- `VECTOR_DB_URL`
- `VECTOR_DB_API_KEY`
- `ENCRYPTION_MASTER_KEY`

Always keep sensitive secrets out of version control and rotate API keys as needed.

## Development

### Local development

Start frontend and backend together from the root:

```bash
npm run dev
```

This command uses npm workspaces and concurrently to launch both services.

### Build validation

Validate the entire workspace with:

```bash
npm run build
```

### Lint / validation

Run workspace-level checks with:

```bash
npm run lint
```

## Docker Compose

A `docker-compose.yml` file is provided in the root to launch the full stack:

```bash
docker compose up --build
```

This brings up:

- `postgres` (PostgreSQL)
- `redis`
- `vector-db` (Qdrant)
- `backend`
- `frontend`

## Service Layout

- `frontend/` — UI and frontend assets
- `backend/` — Express backend proxy and API service
- `docker-compose.yml` — local orchestration for dev/test
- `.env.example` — environment variable template

## Security Improvements

- Enforced JSON payload limits for backend requests
- Added secure response headers
- Added CORS origin restrictions
- Consolidated required environment variables
- Added root workspace automation for build and validation

## Notes

- Update `.env` after running `npm run setup`.
- Use `docker compose down` to stop the local stack.
- For production deployment, replace sample secrets with secure values and review the `.env` settings.

## License

MIT
