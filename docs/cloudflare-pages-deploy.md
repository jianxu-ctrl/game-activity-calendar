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
TRANSIFY_AUTH_TOKEN=replace-with-your-transify-token
```

Optional:

```env
GOOGLE_SHEETS_CSV_URL=https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0
TRANSIFY_RESOURCE_ID=4115
TRANSIFY_HANDLER_TYPE=json
TRANSIFY_LANGUAGE_IDS=EN:1,CN:5,ES:26,MY:12,ID:6,TH:4,VI:3
```

Use encrypted secrets for `ADMIN_SYNC_TOKEN` and `TRANSIFY_AUTH_TOKEN` if the
dashboard offers that option. Do not put the Transify token in the frontend or
commit it to GitHub.

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

Transify import:

```text
/preview
```

Open the Localization Files section, then use:

- `Import Used Keys` to import only keys found in the current Preview config.
- `Import Full Language` to import the whole Transify resource for the current language.
- `Import Full All Languages` to import the whole Transify resource for every configured language.

The page prompts for the same `ADMIN_SYNC_TOKEN`, then the Pages Function calls
Transify with `TRANSIFY_AUTH_TOKEN`.

## Data Migration Note

Cloudflare KV starts empty. After the first deployment, open
`/calendar?admin=1` and sync the spreadsheet once. That writes the current
activity data into the `GAME_ACTIVITY_CALENDAR` KV namespace.
