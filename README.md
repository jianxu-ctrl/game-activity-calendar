# Game Activity Calendar

公开访问的游戏活动日历工具。它保留当前功能：月份切换、地区/语言筛选、活动图片卡片、悬停预览、详情弹窗，以及 CSV/Excel 上传同步。

## Local Run

```bash
npm install
npm run dev
```

默认地址：

- Frontend: `http://127.0.0.1:5180`
- Backend/API: `http://localhost:3000`

`npm run dev` 会同时启动 Nest 后端和 Vite 前端。脚本是跨平台 Node 脚本，适合 Windows 和 Codex 本地环境。

## Data Mode

应用支持两种数据来源：

- Local JSON store: 默认模式，不需要平台数据库。数据文件在 `data/game-activities.json`，首次启动会从 `server/modules/game-activity/default-game-activities.json` 初始化。
- Platform database: 设置 `SUDA_DATABASE_URL` 后，后端会继续使用原来的 Drizzle/DataPaas 数据库路径。

本地模式下上传 CSV/Excel 仍然可用，会把解析出的活动写入 `data/game-activities.json`。

## CSV Columns

上传文件建议包含这些列名：

- `id` 或 `activity_id`
- `region`
- `language`
- `start_datetime`
- `end_datetime`
- `image_url`

解析器也兼容部分中文列名，例如“地区”“语言”“开始”“结束”。

## Maintenance Notes

- 主页面：`client/src/pages/ActivityCalendarPage/ActivityCalendarPage.tsx`
- 前端 API：`client/src/api/index.ts`
- 后端 API：`server/modules/game-activity/game-activity.controller.ts`
- 数据服务：`server/modules/game-activity/game-activity.service.ts`
- 本地数据兜底：`server/modules/game-activity/local-game-activity.store.ts`
- 默认示例数据：`server/modules/game-activity/default-game-activities.json`

后续维护时优先保持 API 形状不变：

- `GET /api/game-activities`
- `POST /api/game-activities/sync`

这样前端、平台数据库模式和本地 JSON 模式可以继续共用同一套页面功能。

## Production Deploy

Production runs as one Node service:

```bash
npm install
npm run build
npm start
```

Do not expose the Vite dev port `5180` publicly. Put HTTPS in front of the
server port, usually `3000`.

Use `.env.production.example` as the production environment baseline. For a
small public deployment, mount a persistent volume and keep:

```env
LOCAL_ACTIVITY_STORE_PATH=/data/game-activities.json
ADMIN_SYNC_TOKEN=replace-with-a-long-random-secret
```

Public visitors use `/`. Admin sync users use `/?admin=1`, then enter the
`ADMIN_SYNC_TOKEN` before uploading CSV/Excel data.

See `docs/production-deploy.md` for Docker, reverse proxy, health check, and
persistence details.

## Netlify Deploy

This repository also supports Netlify-native deployment:

```text
Build command: npm run build:netlify
Publish directory: dist/client
Functions directory: netlify/functions
```

Set `ADMIN_SYNC_TOKEN` in Netlify environment variables. The public URL remains
read-only, while `/?admin=1` enables protected CSV/Excel upload.

See `docs/netlify-deploy.md` for the full setup for
`https://luminous-begonia-498426.netlify.app/`.
