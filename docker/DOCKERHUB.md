# Crettyard Digital Client Portal

A self-hosted client portal for managing projects, invoices, quotes, decisions, and file sharing.

## Features

- **Project management** — Customizable status pipeline per organization
- **Invoices** — Euro currency invoices with PDF upload and client viewing
- **Quotes** — PDF-based quotes with client accept/decline workflow
- **Decisions** — Multiple-choice or open questions for client input
- **File sharing** — Upload and deliver files via Cloudflare R2, S3, MinIO, or local storage
- **White-label branding** — Custom colors and logo applied to the client portal
- **Role-based access** — Owner/admin roles for your team, member role for clients
- **Email notifications** — Transactional email via Resend
- **Built-in database** — PostgreSQL included, no separate container needed

## Quick Start

The only required variable is `BETTER_AUTH_SECRET`:

```bash
docker run -d \
  --name crettyard \
  -p 8080:8080 \
  -v crettyard-db:/var/lib/postgresql/data \
  -v crettyard-uploads:/app/uploads \
  -e BETTER_AUTH_SECRET=$(openssl rand -base64 32) \
  joeyegberink/client-portal:latest
```

Open `http://localhost:8080` and create your account.

## Docker Compose

```yaml
services:
  crettyard:
    image: joeyegberink/client-portal:latest
    ports:
      - "8080:8080"
    environment:
      BETTER_AUTH_SECRET: "change-me-to-a-random-string-at-least-32-chars"
      WEB_URL: "https://clients.yourdomain.com"
    volumes:
      - crettyard-db:/var/lib/postgresql/data
      - crettyard-uploads:/app/uploads
    restart: unless-stopped

volumes:
  crettyard-db:
  crettyard-uploads:
```

## Using an External Database

Disable the built-in PostgreSQL and provide your own connection string:

```yaml
environment:
  USE_BUILT_IN_DB: "false"
  DATABASE_URL: "postgresql://user:password@your-db-host:5432/crettyard"
  BETTER_AUTH_SECRET: "your-secret-here"
```

## Cloudflare R2 Storage

To use Cloudflare R2 for file storage instead of local disk:

```yaml
environment:
  STORAGE_PROVIDER: "r2"
  R2_ACCOUNT_ID: "your-account-id"
  R2_ACCESS_KEY: "your-access-key"
  R2_SECRET_KEY: "your-secret-key"
  R2_BUCKET: "your-bucket-name"
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | **Yes** | — | Random string (min 32 chars) for signing auth tokens |
| `WEB_URL` | No | `http://localhost:8080` | Public URL where clients access the portal (used in email links) |
| `USE_BUILT_IN_DB` | No | `true` | Set to `false` to use an external database |
| `DATABASE_URL` | No | auto | PostgreSQL connection string (required when built-in DB is disabled) |
| `STORAGE_PROVIDER` | No | `local` | File storage: `local`, `s3`, `minio`, or `r2` |
| `R2_ACCOUNT_ID` | No | — | Cloudflare R2 account ID |
| `R2_ACCESS_KEY` | No | — | Cloudflare R2 access key |
| `R2_SECRET_KEY` | No | — | Cloudflare R2 secret key |
| `R2_BUCKET` | No | — | Cloudflare R2 bucket name |
| `S3_ENDPOINT` | No | — | S3-compatible endpoint URL |
| `S3_REGION` | No | `us-east-1` | S3 region |
| `S3_BUCKET` | No | — | S3 bucket name |
| `S3_ACCESS_KEY` | No | — | S3 access key |
| `S3_SECRET_KEY` | No | — | S3 secret key |
| `RESEND_API_KEY` | No | — | Resend API key for email |
| `EMAIL_FROM` | No | `noreply@yourdomain.com` | Sender address |
| `MAX_FILE_SIZE_MB` | No | `50` | Max upload size in MB |
| `SKIP_DB_PUSH` | No | `false` | Skip schema sync on startup |

## Volumes

| Path | Purpose |
|---|---|
| `/var/lib/postgresql/data` | Built-in PostgreSQL data |
| `/app/uploads` | Uploaded files (when using local storage) |

## Unraid

An Unraid Community Applications template is included in the repository at `docker/unraid-template.xml`.
