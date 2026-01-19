#!/bin/bash

# 部署脚本 (TencentOS + Docker)

echo "🚀 开始部署..."

# 1. 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin docker

# 2. 构建镜像
echo "🏗️  构建 Docker 镜像..."
# 使用腾讯云镜像源加速构建
docker build -t fangzhou-app .

if [ $? -ne 0 ]; then
    echo "❌ 镜像构建失败，终止部署"
    exit 1
fi

# 3. 重启容器
echo "cel 🔄 重启容器..."
docker stop fangzhou || true
docker rm fangzhou || true

# 重新启动
docker run -d \
  --name fangzhou \
  -p 80:3001 \
  -v /root/fangzhou-data:/app/data \
  -v /root/fangzhou-uploads:/app/uploads \
  --restart unless-stopped \
  fangzhou-app

# 4. 数据库迁移
echo "🗄️  执行数据库迁移..."
docker exec fangzhou npx drizzle-kit push

# 5. 清理旧镜像
echo "🧹 清理无用镜像..."
docker image prune -f

echo "✅ 部署完成！"
