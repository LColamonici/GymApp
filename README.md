# Digital Twin Gym

A full-stack gym management app built with Next.js 15 and a self-hosted Supabase stack, orchestrated via Docker Compose.

## Prerequisites

| Dependency | Minimum version | Notes |
|---|---|---|
| Docker | 24+ | Engine + CLI |
| Docker Compose | v2.20+ | Ships with Docker Desktop; `docker compose` (no hyphen) |

No Node.js installation is required to run — the app is built inside Docker.

## Quick start

```bash
# 1. Copy and configure the environment file
cp .env.docker .env

# 2. Build the Next.js image and start all services
docker compose up --build

# 3. Subsequent runs (no rebuild needed unless code changes)
docker compose up
```

On first run, Docker will:
1. Pull all service images (~2 GB total)
2. Build the Next.js app image (multi-stage, ~5 min on a cold cache)
3. Start PostgreSQL and wait for it to be healthy
4. Run the SQL migrations in `supabase/migrations/` in order
5. Start all remaining services

## Service ports

| Port | Service | URL |
|---|---|---|
| **3000** | Next.js app | http://localhost:3000 |
| **8000** | Kong (Supabase API gateway) | http://localhost:8000 |
| **3001** | Supabase Studio (admin UI) | http://localhost:3001 |
| 8443 | Kong HTTPS | — |

PostgreSQL (5432) is not exposed to the host by default. Uncomment the `ports` block in `docker-compose.yml` under the `db` service to enable it.

## Environment variables

All variables live in `.env` (copied from `.env.docker`). The defaults work out of the box for local development.

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | PostgreSQL superuser password |
| `JWT_SECRET` | Shared JWT signing secret (≥ 32 chars) |
| `ANON_KEY` | Supabase anon JWT — used by the browser client |
| `SERVICE_ROLE_KEY` | Supabase service-role JWT — used server-side only |
| `SITE_URL` | Public URL shown in auth emails (default: `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL reachable from the **browser** (default: `http://localhost:8000`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key embedded in the client bundle at build time |
| `SUPABASE_URL` | Supabase API URL used for **SSR** requests (docker-internal: `http://kong:8000`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for server-side Supabase calls |

> **Warning:** The default JWT values in `.env.docker` are the well-known Supabase local-dev keys. Replace all secrets before any internet-facing deployment.

## Services

| Service | Image | Purpose |
|---|---|---|
| `db` | `supabase/postgres:15.8.1` | PostgreSQL 15 with Supabase extensions |
| `migrations` | `postgres:15-alpine` | One-shot migration runner (exits after completion) |
| `auth` | `supabase/gotrue:v2.186.0` | Authentication (GoTrue) |
| `rest` | `postgrest/postgrest:v14.6` | Auto-generated REST API from the DB schema |
| `realtime` | `supabase/realtime:v2.76.5` | WebSocket subscriptions |
| `storage` | `supabase/storage-api:v1.44.2` | File storage API |
| `imgproxy` | `darthsim/imgproxy:v3.30.1` | On-the-fly image transformation |
| `meta` | `supabase/postgres-meta:v0.95.2` | Schema introspection (used by Studio) |
| `kong` | `kong/kong:3.9.1` | API gateway — all Supabase traffic enters here |
| `studio` | `supabase/studio:2026.03.16` | Admin dashboard |
| `app` | *(local build)* | Next.js 15 application |

## Teardown

```bash
# Stop all containers (preserves volumes)
docker compose down

# Stop and delete all data volumes (full reset)
docker compose down -v
```

## Tech stack

- **Framework:** Next.js 15 (React 19, TypeScript, Tailwind CSS)
- **Backend:** Self-hosted Supabase (PostgreSQL, GoTrue, PostgREST, Realtime, Storage)
- **State management:** Zustand
- **Drag and drop:** dnd-kit
- **Icons:** lucide-react
