# Netlify Deploy

This project can deploy to Netlify as:

- Static frontend from `dist/client`
- API routes from Netlify Functions
- Activity data persisted in Netlify Blobs

## Existing Netlify Site

For `https://luminous-begonia-498426.netlify.app/`, connect this repository to
that Netlify site, then use these build settings:

```text
Build command: npm run build:netlify
Publish directory: dist/client
Functions directory: netlify/functions
```

The same settings are also committed in `netlify.toml`.

## Environment Variables

Set these in Netlify Project configuration > Environment variables:

```env
ADMIN_SYNC_TOKEN=replace-with-a-long-random-secret
APP_NAME=Game Events Calendar
APP_DESCRIPTION=Game activity calendar preview
```

Optional:

```env
GOOGLE_SHEETS_CSV_URL=https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0
```

## Public And Admin URLs

Public calendar:

```text
https://luminous-begonia-498426.netlify.app/
```

Admin upload/sync:

```text
https://luminous-begonia-498426.netlify.app/?admin=1
```

The normal public page hides the upload button. The admin page prompts for
`ADMIN_SYNC_TOKEN` before calling `POST /api/game-activities/sync`.

## API Routes

`netlify.toml` rewrites these routes:

```text
GET  /api/game-activities      -> netlify/functions/game-activities.cjs
POST /api/game-activities/sync -> netlify/functions/game-activities-sync.cjs
```

The Functions use a Netlify Blobs store named `game-activity-calendar` and store
the data under `activities.json`.
