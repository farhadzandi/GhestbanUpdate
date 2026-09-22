# Ghestban Server (pilot)

This folder is the VPS-side companion for Ghestban Next. The mobile app remains local-first. The VPS is the primary online sync/identity/license path; GitHub remains an independent off-site backup/release path.

## Current pilot scope

- FastAPI API
- PostgreSQL 16
- `/v1/health`
- authenticated PUT/GET snapshot sync
- Docker Compose
- local PostgreSQL backup/restore scripts
- reverse-proxy template

Identity/OTP, tenant JWTs, device registration, license plans and production-grade conflict resolution are intentionally not implemented yet.

## VPS layout

Recommended path:

```text
/opt/apps/ghestban/
  app/
  scripts/
  nginx/
  backups/
  docker-compose.yml
  .env
```

## First deployment

```bash
sudo mkdir -p /opt/apps/ghestban
sudo chown -R "$USER":"$USER" /opt/apps/ghestban
cd /opt/apps/ghestban
# copy/clone the server folder here
cp .env.example .env
chmod 600 .env
```

Generate secrets on the VPS, do not commit them:

```bash
openssl rand -base64 36
openssl rand -hex 32
```

Put separate strong values into `POSTGRES_PASSWORD` and `GH_API_BEARER` in `.env`.

Start:

```bash
docker compose build --pull
docker compose up -d
docker compose ps
curl http://127.0.0.1:18080/v1/health
```

The API container is bound only to `127.0.0.1:18080`. Publish it through Nginx/HTTPS; do not expose PostgreSQL to the Internet.

## Reverse proxy

Copy `nginx/ghestban.conf.example`, replace `api.example.com` with the actual API domain, enable it in Nginx, then obtain TLS with Certbot or another ACME client.

The Android client should be configured with the HTTPS URL only, for example:

```js
GhestbanProviders.configureVps({baseUrl:'https://api.example.com',enabled:true})
```

A session bearer can be supplied at runtime during the pilot:

```js
GhestbanProviders.setAccessToken('SESSION_TOKEN')
```

Do not hard-code the bearer token in the APK. This pilot bearer is temporary; public/commercial builds must replace it with per-user/per-device short-lived tokens issued by the Identity service.

## Backup

```bash
chmod +x scripts/*.sh
./scripts/backup.sh
```

Backups are retained locally for 14 days by the script. A second copy should be transferred off the VPS. GitHub backup in the client is optional and session-token based; for production, encrypted off-site backup should be automated server-side or through a dedicated secure backup target.

Restore is guarded by an explicit confirmation:

```bash
./scripts/restore.sh backups/ghestban-YYYYMMDDTHHMMSSZ.dump
```

## Failover policy

```text
Local data = always writable
VPS        = primary sync / identity / license
GitHub     = secondary off-site backup / releases
```

If the VPS is unavailable, writes remain local and one deduplicated snapshot-sync job is kept in the outbox. When connectivity returns, the outbox is flushed. Identity/license may use their future cached offline grants, but GitHub is not allowed to become an alternative identity authority.

## Security before public release

Before exposing this to customers, add tenant-scoped JWT authentication, OTP provider integration, device registration, role authorization, rate limiting, audit logging, encrypted backup, conflict/version checks, production TLS, firewall rules, secret rotation, monitoring and tested disaster recovery.
