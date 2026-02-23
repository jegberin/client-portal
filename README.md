# Atrium

**Open-source client portal for agencies and freelancers.**

[![License: ELv2](https://img.shields.io/badge/License-ELv2-blue.svg)](https://www.elastic.co/licensing/elastic-license)

## What is Atrium?

Atrium is a self-hosted client portal where agencies and freelancers manage projects, share files, and communicate deliverables. Your clients get a branded portal to track project progress, view updates, and download files -- all under your own domain and branding.

## Features

- **Project management** -- Customizable status pipeline per organization
- **File sharing** -- Upload and deliver files via S3, MinIO, Cloudflare R2, or local storage
- **White-label branding** -- Custom colors and logo applied to the client portal
- **Role-based access** -- Owner/admin roles for your team, member role for clients
- **Authentication** -- Magic link and email/password auth via Better Auth
- **Multi-tenant** -- Each agency operates as its own isolated organization

## Tech Stack

| Layer     | Technology                  |
|-----------|-----------------------------|
| API       | NestJS 11                   |
| Frontend  | Next.js 15, React 19        |
| Database  | PostgreSQL 16, Prisma ORM   |
| Auth      | Better Auth                 |
| Styling   | Tailwind CSS                |
| Email     | Resend + React Email        |
| Monorepo  | Turborepo + Bun             |

## Quick Start

**Prerequisites:** [Bun](https://bun.sh) (v1.0+) and [Docker](https://docs.docker.com/get-docker/) (for PostgreSQL).

```bash
git clone https://github.com/your-org/atrium.git
cd atrium
bun run setup
bun run dev
```

That's it. The `setup` script handles everything:

1. Copies `.env.example` to `.env`
2. Starts PostgreSQL via Docker Compose
3. Installs all dependencies
4. Generates the Prisma client
5. Pushes the database schema
6. Seeds demo data (sample org, project, and default statuses)

Once running:

| Service  | URL                     |
|----------|-------------------------|
| Web app  | http://localhost:3000   |
| API      | http://localhost:3001   |

## First Use

1. Go to [http://localhost:3000/signup](http://localhost:3000/signup) and create your account and organization
2. You land in the **dashboard** -- create projects, upload files, manage statuses
3. Invite clients by email; they access the **client portal** at `/portal`

Clients see only their assigned projects and files, styled with your branding.

## Project Structure

```
atrium/
  apps/
    api/              NestJS REST API
    web/              Next.js frontend (dashboard + portal)
  packages/
    database/         Prisma schema, client, migrations, seed
    shared/           Shared types, constants, utilities
    email/            Email templates (React Email)
  e2e/                Playwright end-to-end tests
  docker/             Production Dockerfiles
```

## Environment Variables

All configuration lives in a single `.env` file. See [`.env.example`](.env.example) for the full list.

| Variable             | Description                                      | Default                          |
|----------------------|--------------------------------------------------|----------------------------------|
| `DATABASE_URL`       | PostgreSQL connection string                     | `postgresql://atrium:atrium@localhost:5432/atrium` |
| `BETTER_AUTH_SECRET` | Secret key for auth token signing                | `change-me-in-production`        |
| `BETTER_AUTH_URL`    | API base URL (used by Better Auth)               | `http://localhost:3001`          |
| `API_URL`            | API URL                                          | `http://localhost:3001`          |
| `WEB_URL`            | Web app URL                                      | `http://localhost:3000`          |
| `STORAGE_PROVIDER`   | File storage backend: `local`, `s3`, `minio`, `r2` | `local`                       |
| `UPLOAD_DIR`         | Local upload directory (when using local storage) | `./uploads`                     |
| `S3_ENDPOINT`        | S3-compatible endpoint (for MinIO/R2)            | --                               |
| `S3_BUCKET`          | Bucket name                                      | `atrium`                         |
| `S3_ACCESS_KEY`      | S3 access key                                    | --                               |
| `S3_SECRET_KEY`      | S3 secret key                                    | --                               |
| `RESEND_API_KEY`     | Resend API key for transactional email           | --                               |
| `EMAIL_FROM`         | Sender address for outbound email                | `noreply@atrium.local`           |
| `MAX_FILE_SIZE_MB`   | Maximum upload size in megabytes                 | `50`                             |

## Storage Providers

Set `STORAGE_PROVIDER` in your `.env`:

- **`local`** -- Files saved to `UPLOAD_DIR`. Default for development.
- **`s3`** -- Amazon S3. Set `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, and `S3_REGION`.
- **`minio`** -- Self-hosted S3-compatible storage. Set `S3_ENDPOINT` and credentials.
- **`r2`** -- Cloudflare R2. Set `S3_ENDPOINT`, `S3_BUCKET`, and credentials.

## Docker Production

Run the full stack (PostgreSQL + API + Web) in production with:

```bash
docker compose up --build
```

This uses `docker-compose.yml` which builds both the API and web app from their respective Dockerfiles and wires them to a PostgreSQL instance. Configure environment variables in the compose file or via a `.env` file.

## Scripts Reference

Run from the repository root with `bun run <script>`.

| Script       | Description                                          |
|--------------|------------------------------------------------------|
| `setup`      | One-command bootstrap (env, Docker, deps, DB, seed)  |
| `dev`        | Start all services in development mode               |
| `build`      | Build all packages and apps                          |
| `test`       | Run unit tests across all packages                   |
| `test:e2e`   | Run Playwright end-to-end tests                      |
| `test:all`   | Run unit tests + e2e tests                           |
| `lint`       | Lint all packages                                    |
| `db:generate`| Regenerate the Prisma client                         |
| `db:push`    | Push schema changes to the database                  |
| `db:migrate` | Run Prisma migrations (development)                  |
| `db:migrate:deploy` | Apply pending migrations (production)          |
| `db:seed`    | Seed the database with demo data                     |
| `clean`      | Remove build artifacts                               |

## License

Atrium is source-available software licensed under the [Elastic License 2.0 (ELv2)](LICENSE).
