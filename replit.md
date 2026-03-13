# Crettyard Digital — Client Portal (Replit)

## Overview
Crettyard Digital client portal for agencies and freelancers. Monorepo with:
- **Frontend**: Next.js 15 + React 19 + Tailwind CSS (`apps/web`, port 5000)
- **Backend**: NestJS 11 + Prisma (`apps/api`, port 3001)
- **Database**: Replit PostgreSQL (via Prisma ORM)
- **Package manager**: Bun (workspace monorepo)
- **Build tool**: Turborepo

## Branding
- **Primary color**: `#12B388` (teal green)
- **Accent/foreground color**: `#0C2366` (navy)
- **Font**: Inter (Google Fonts)
- **Border radius**: 4px
- **Logo**: `apps/web/public/logo.png`
- **Favicon**: `apps/web/public/icon.png` + `apps/web/src/app/icon.png`

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

## Admin Bootstrap
To create the admin account (idempotent):
```
bash scripts/seed-admin.sh
```
Default credentials: `info@crettyard.com` / `eb9n2V2%ZKAX`, org "Crettyard Digital".

## Key Ports
- **5000** — Next.js frontend (webview)
- **3001** — NestJS API backend

## Environment Variables (set in Replit Secrets)
- `DATABASE_URL` — Replit PostgreSQL connection string (auto-set)
- `BETTER_AUTH_SECRET` — 64-char hex secret for session signing
- `WEB_URL` / `API_URL` / `BETTER_AUTH_URL` — set to Replit dev domain
- `NODE_ENV` — "development"
- `PORT` — 3001 (API port)
- `RESEND_API_KEY` — Resend API key for email delivery
- `EMAIL_FROM` — Sender address (`clientportal@digital.crettyard.com`)

Optional:
- `STRIPE_*` — for billing features
- `S3_*` — for S3-compatible file storage (default: local storage)

## Workspace Packages
- `packages/shared` — shared constants/types (builds to CommonJS dist/)
- `packages/database` — Prisma client wrapper (builds to CommonJS dist/)
- `packages/email` — React Email templates

## Feature Additions
- **Invoices**: Euro currency (EUR), PDF file upload/download (replaces generated PDFs), admin + portal UI
- **Quotes**: Admin can create/send quotes; clients can accept/decline with optional notes
- **Decisions**: Admin creates multiple-choice or open questions; clients respond via portal

## API Modules
- `apps/api/src/invoices/` — Invoice CRUD + PDF upload/download endpoints
- `apps/api/src/quotes/` — Quote CRUD + client respond endpoint
- `apps/api/src/decisions/` — Decision CRUD + client respond endpoint

## Database Schema (key models)
- `Invoice` — with `pdfFileKey`, `pdfFileName` for uploaded PDFs
- `Quote` — status: draft → sent → accepted/declined
- `Decision` — type: multiple_choice or open; status: open → closed
- `DecisionOption` — options for multiple-choice decisions

## Replit-Specific Changes Made
1. Next.js dev/start scripts updated to use port 5000 and host 0.0.0.0
2. `allowedDevOrigins: ["*"]` added to next.config.ts for Replit proxy
3. Prisma schema `directUrl` removed (not needed for Replit's PostgreSQL)
4. `packages/database` and `packages/shared` tsconfig updated to output CommonJS
5. Package `main`/`types` fields updated to point to compiled dist/ output
6. `scripts/replit-start.sh` created as the unified startup script
7. All "Atrium" references rebranded to "Crettyard Digital"
8. Brand colors updated from `#006b68`/`#ff6b5c` to `#12B388`/`#0C2366`
9. Email templates updated with new brand colors and name
10. `scripts/seed-admin.sh` created for reproducible admin bootstrap
