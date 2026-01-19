# 项目部署记录 (TencentOS + Docker + SQLite)

本文档记录了在腾讯云服务器 (TencentOS) 上部署本项目的完整过程及常见问题解决。

## 0. 环境准备 (已完成)

### Docker 安装与优化
服务器已安装 Docker `26.1.3`。

**配置腾讯云镜像加速 (解决构建超时):**
```bash
echo '{"registry-mirrors": ["https://mirror.ccs.tencentyun.com"]}' > /etc/docker/daemon.json
systemctl restart docker
```

**配置虚拟内存 (解决 2G/4G 内存构建时崩溃):**
```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 1. 首次部署流程

### 获取代码
```bash
cd /root
git clone -b docker https://github.com/iProgramme/fangzhou.git
cd fangzhou
```

### 构建镜像
```bash
# 构建过程中如果遇到 COPY public 报错，请确保 Dockerfile 中已删除相关行
docker build -t fangzhou-app .
```

### 启动容器
```bash
mkdir -p /root/fangzhou-data
mkdir -p /root/fangzhou-uploads

docker run -d \
  --name fangzhou \
  -p 80:3001 \
  -v /root/fangzhou-data:/app/data \
  -v /root/fangzhou-uploads:/app/uploads \
  --restart unless-stopped \
  fangzhou-app
```

### 初始化数据库 (关键)
```bash
# 同步表结构
docker exec -it fangzhou npx drizzle-kit push
# 填充初始数据
docker exec -it fangzhou npx tsx seed.ts
```

---

## 2. 常见部署问题 (FAQ)

1. **构建失败：`node:20-alpine` 无法拉取**
   - 解决：配置腾讯云镜像源，或将 Dockerfile 基础镜像改为 `node:20-slim`。
2. **构建失败：`COPY /app/public ./public` not found**
   - 原因：项目根目录下没有 `public` 目录。
   - 解决：在 Dockerfile 中删除该复制指令。
3. **构建失败：`RUN npm run build` 卡死或报错**
   - 原因：通常是内存不足导致编译进程被杀。
   - 解决：按照步骤 0 配置 2G 的 Swap 虚拟内存。

---

## 3. 日常更新流程

1. 本地代码 `git push`
2. 服务器执行更新脚本 (建议存为 `deploy.sh`):
```bash
git pull
docker build -t fangzhou-app .
docker stop fangzhou
docker rm fangzhou
# 重新运行启动命令
```