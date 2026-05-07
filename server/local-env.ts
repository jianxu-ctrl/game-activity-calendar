import 'dotenv/config';

const hasDatabaseUrl = Boolean(process.env.SUDA_DATABASE_URL?.trim());

if (!process.env.FORCE_AUTHN_INNERAPI_DOMAIN) {
  const host = process.env.SERVER_HOST || 'localhost';
  const port = process.env.SERVER_PORT || '3000';
  process.env.FORCE_AUTHN_INNERAPI_DOMAIN = `http://${host}:${port}`;
}

if (!hasDatabaseUrl && !process.env.FORCE_FRAMEWORK_DISABLE_DATAPASS) {
  process.env.FORCE_FRAMEWORK_DISABLE_DATAPASS = 'true';
}

if (!process.env.LOCAL_ACTIVITY_STORE_PATH) {
  process.env.LOCAL_ACTIVITY_STORE_PATH = 'data/game-activities.json';
}
