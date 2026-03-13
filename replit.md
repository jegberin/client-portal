# Atrium — Replit Environment

## Overview
Atrium is a client portal for agencies and freelancers. It's a monorepo with:
- **Frontend**: Next.js 15 + React 19 + Tailwind CSS (`apps/web`, port 5000)
- **Backend**: NestJS 11 + Prisma (`apps/api`, port 3001)
- **Database**: Replit PostgreSQL (via Prisma ORM)
- **Package manager**: Bun (workspace monorepo)
- **Build tool**: Turborepo

## Running the App
The "Start application" workflow runs both services:
```
bash scripts/replit-start.sh
```
This script:
1. Builds the `@atrium/shared` package (CommonJS)
2. Generates the Prisma client
3. Builds the `@atrium/database` package (CommonJS)
4. Pushes the Prisma schema to the database
5. Starts both services via Turborepo

## Key Ports
- **5000** — Next.js frontend (webview)
- **3001** — NestJS API backend

## Environment Variables (set in Replit Secrets)
- `DATABASE_URL` — Replit PostgreSQL connection string (auto-set)
- `BETTER_AUTH_SECRET` — 64-char hex secret for session signing (auto-generated)
- `WEB_URL` / `API_URL` / `BETTER_AUTH_URL` — set to Replit dev domain
- `NODE_ENV` — "development"
- `PORT` — 3001 (API port)

Optional:
- `RESEND_API_KEY` — for email sending
- `STRIPE_*` — for billing features
- `S3_*` — for S3-compatible file storage (default: local storage)

## Workspace Packages
- `packages/shared` — shared constants/types (builds to CommonJS dist/)
- `packages/database` — Prisma client wrapper (builds to CommonJS dist/)
- `packages/email` — React Email templates

## Replit-Specific Changes Made
1. Next.js dev/start scripts updated to use port 5000 and host 0.0.0.0
2. `allowedDevOrigins: ["*"]` added to next.config.ts for Replit proxy
3. Prisma schema `directUrl` removed (not needed for Replit's PostgreSQL)
4. `packages/database` and `packages/shared` tsconfig updated to output CommonJS
5. Package `main`/`types` fields updated to point to compiled dist/ output
6. `scripts/replit-start.sh` created as the unified startup script
