# 方舟项目管理系统 — Agent 指南

## Dev Commands

```bash
npm run dev       # 同时启动 Vite (前端 :3000) + Express (后端 :3001)
npm run build     # Vite 构建前端到 dist/
npm run server    # 仅启动后端
npm run db:push   # Drizzle schema push (常用迁移命令)
npm run db:seed   # 初始化数据 tsx seed.ts
```

## Architecture

- **Frontend**: React + Vite, hash 路由 (`window.location.hash`), 组件在 `components/`
- **Backend**: Express API 在 `server/index.ts`, 监听 `:3001`
- **Database**: SQLite (`better-sqlite3`) + Drizzle ORM, schema 在 `db/schema.ts`
- **AI Chat**: 调用 DeepSeek API (`https://api.deepseek.com/chat/completions`), context 由项目数据实时构建

## Critical Quirks

- `drizzle.config.ts` 加载 `.env.local`（不是 `.env`）：运行 db 命令前确认该文件存在
- 前端开发服务器将 `/api` 代理到 `http://localhost:3001`（后端地址）
- 项目软删除：`DELETE /api/projects/:id` 只设 `deletedAt`，不过滤 `deleted=true` 查询参数则显示已删除项目
- `deploy.sh` 从 `docker` 分支拉取，容器内迁移命令为 `docker exec fangzhou npx drizzle-kit push`

## Database Schema Notes

- `projects.deletedAt` — 软删除时间戳，为 null 表示正常项目
- JSON 字段（SQLite 存为字符串）：`timeline`, `nextPlan`, `annualData`, `collectionPlan` — 读取时需 `safeParseJSON`
- 默认密码 `123`（users 表）

## Deployment

- 腾讯云服务器，Docker 部署，容器端口映射 `80:3001`
- 数据持久化：`/root/fangzhou-data` -> `/app/data`，`/root/fangzhou-uploads` -> `/app/uploads`