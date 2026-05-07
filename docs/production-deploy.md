# Production Deploy

This app is deployed as one Node service. In production, do not expose the Vite
development port `5180`; expose only the built server port, usually `3000`,
behind HTTPS.

## Build And Run

```bash
npm install
npm run build
npm start
```

Required production environment:

```env
NODE_ENV=production
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
FORCE_AUTHN_INNERAPI_DOMAIN=https://calendar.example.com
FORCE_FRAMEWORK_DISABLE_DATAPASS=true
LOCAL_ACTIVITY_STORE_PATH=/data/game-activities.json
ADMIN_SYNC_TOKEN=replace-with-a-long-random-secret
```

## Docker

Use the included `Dockerfile` and `docker-compose.example.yml` as the baseline:

```bash
docker compose -f docker-compose.example.yml up --build -d
```

Before using it, replace:

- `calendar.example.com` with the real HTTPS domain.
- `change-this-admin-token` with a long random secret.

The compose file mounts a named volume at `/data`. The local JSON activity
store writes to `/data/game-activities.json`, so data survives container
rebuilds and restarts.

## Public And Admin URLs

Public users should open:

```text
https://calendar.example.com/
```

Admin sync users should open:

```text
https://calendar.example.com/?admin=1
```

The upload button is hidden on the normal public URL. In admin mode, upload
prompts for the `ADMIN_SYNC_TOKEN` and sends it to
`POST /api/game-activities/sync` as `X-Admin-Sync-Token`.

## Reverse Proxy

Terminate HTTPS at a reverse proxy and forward traffic to the Node service:

```text
https://calendar.example.com -> http://127.0.0.1:3000
```

The health endpoint is:

```text
GET /healthz
```

## Data Options

For a small public calendar, the mounted JSON store is enough if the service
runs as a single instance.

For multiple instances or higher write volume, use a database and set
`SUDA_DATABASE_URL`. Keep `GET /api/game-activities` public, and keep
`POST /api/game-activities/sync` protected by `ADMIN_SYNC_TOKEN`.
