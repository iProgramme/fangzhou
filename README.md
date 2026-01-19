# 项目部署指南 (Docker + SQLite)

本项目已针对单机 Docker 部署进行优化，集成了 SQLite 数据库，无需额外部署数据库服务。

## 前置要求

- 一台 Linux 服务器 (推荐 Ubuntu 22.04/24.04, 2核 2G 内存)
- 已安装 Docker 和 Docker Compose (或直接使用 Docker 命令)

## 快速部署 (一键命令)

### 1. 构建镜像

在项目根目录下运行：

```bash
docker build -t fangzhou-app .
```

### 2. 运行容器

运行以下命令启动服务。我们映射了两个目录到宿主机，以保证数据持久化：
- `/root/fangzhou-data`: 存放 SQLite 数据库文件
- `/root/fangzhou-uploads`: 存放上传的图片/文件 (预留)

```bash
# 确保宿主机目录存在
mkdir -p /root/fangzhou-data
mkdir -p /root/fangzhou-uploads

# 启动容器
docker run -d \
  --name fangzhou \
  -p 80:3001 \
  -v /root/fangzhou-data:/app/data \
  -v /root/fangzhou-uploads:/app/uploads \
  --restart unless-stopped \
  fangzhou-app
```

现在，你可以通过浏览器访问 `http://你的服务器IP` 使用系统了。

---

## 数据库迁移 (首次部署或更新结构后)

由于 SQLite 是文件型数据库，首次启动或更新表结构后，需要在容器内执行迁移命令：

```bash
# 进入容器执行迁移
docker exec -it fangzhou npx drizzle-kit push
```

或者初始化种子数据 (可选):
```bash
docker exec -it fangzhou npx tsx seed.ts
```

---

## 运维指南

### 查看日志
```bash
docker logs -f fangzhou
```

### 备份数据 (非常简单)
因为使用的是 SQLite，备份只需要复制文件即可。

```bash
# 备份数据库
cp /root/fangzhou-data/local.db /root/fangzhou-data/local.db.backup_$(date +%Y%m%d)

# 恢复数据库
cp /root/fangzhou-data/local.db.backup_20240101 /root/fangzhou-data/local.db
# 然后重启容器
docker restart fangzhou
```

### 更新部署
1. `git pull` 拉取最新代码
2. `docker stop fangzhou` 停止旧容器
3. `docker rm fangzhou` 删除旧容器
4. `docker build -t fangzhou-app .` 重新构建
5. 再次运行启动命令

## 本地开发

1. 安装依赖: `npm install`
2. 启动开发服务器: `npm run dev`
3. 数据库会自动在 `data/local.db` 生成。