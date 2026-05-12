# Cloudflare Pages Deploy

This project can deploy to Cloudflare Pages as:

- Static frontend from `dist/client`
- API routes from Pages Functions in `functions/`
- Activity data persisted in Workers KV

## Build Settings

Create a Cloudflare Pages project from the GitHub repository, then use:

```text
Framework preset: None
Build command: npm run build:cloudflare
Build output directory: dist/client
Root directory: /
```

Cloudflare Pages will automatically detect the `functions/` directory.

## KV Binding

Create a Workers KV namespace, for example:

```text
game-activity-calendar
```

Then bind it to the Pages project:

```text
Settings > Bindings > Add > KV namespace
Variable name: GAME_ACTIVITY_CALENDAR
KV namespace: game-activity-calendar
```

Redeploy the project after adding the binding.

## Environment Variables And Secrets

Set these in the Pages project:

```env
ADMIN_SYNC_TOKEN=replace-with-a-long-random-secret
APP_NAME=Game Tools Center
APP_DESCRIPTION=Game tools center
```

Optional:

```env
GOOGLE_SHEETS_CSV_URL=https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0
```

Use an encrypted secret for `ADMIN_SYNC_TOKEN` if the dashboard offers that
option.

## URLs

After deployment:

```text
/          Tools center
/calendar  Event Pop-Up Calendar
/preview   Event Calendar Preview
```

Admin sync:

```text
/calendar?admin=1
```

## Data Migration Note

Cloudflare KV starts empty. After the first deployment, open
`/calendar?admin=1` and sync the spreadsheet once. That writes the current
activity data into the `GAME_ACTIVITY_CALENDAR` KV namespace.
