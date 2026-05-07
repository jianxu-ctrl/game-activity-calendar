import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const clientDir = join(process.cwd(), 'dist/client');
const assetsDir = join(clientDir, 'assets');
const existingHtml = await readFile(join(clientDir, 'index.html'), 'utf8');
const assets = await readdir(assetsDir);
const jsFile =
  existingHtml.match(/src="\/assets\/(index-[^"]+\.js)"/)?.[1] ||
  assets.find((file) => file.startsWith('index-') && file.endsWith('.js'));
const cssFile =
  existingHtml.match(/href="\/assets\/(index-[^"]+\.css)"/)?.[1] ||
  assets.find((file) => file.startsWith('index-') && file.endsWith('.css'));

if (!jsFile || !cssFile) {
  throw new Error('Unable to find Netlify client assets.');
}

const titleMatch = existingHtml.match(/<title>(.*?)<\/title>/);
const appName =
  process.env.APP_NAME ||
  (titleMatch?.[1]?.includes('{{') ? undefined : titleMatch?.[1]) ||
  'Game Events Calendar';
const appDescription =
  process.env.APP_DESCRIPTION || 'Game activity calendar preview';

const html = `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="/favicon.svg">
  <link rel="stylesheet" href="/assets/${cssFile}">
  <title>${escapeHtml(appName)}</title>
  <meta name="description" content="${escapeHtml(appDescription)}">
  <meta property="og:title" content="${escapeHtml(appName)}">
  <meta property="og:description" content="${escapeHtml(appDescription)}">
  <meta property="og:image" content="/favicon.svg">
  <script>
    window.csrfToken = "";
    window.userId = "";
    window.tenantId = "";
    window.appId = "";
    window.ENVIRONMENT = "production";
    window.__platform__ = {};
    window._appInfo = {
      name: ${JSON.stringify(appName)},
      avatar: "/favicon.svg",
      description: ${JSON.stringify(appDescription)}
    };
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module" crossorigin src="/assets/${jsFile}"></script>
</body>
</html>
`;

await writeFile(join(clientDir, 'index.html'), html, 'utf8');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
