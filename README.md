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

### 启动脚本
首次拉取代码后，需要给部署脚本添加执行权限：
```bash
chmod +x deploy.sh
```

### 执行部署
```bash
./deploy.sh
```

### 初始化数据 (仅首次需要)
```bash
docker exec -it fangzhou npx tsx seed.ts
```

---

## 2. 日常更新流程 (极简版)

当你修改了代码并 push 到远程仓库后，登录服务器执行以下**一条命令**即可完成更新：

```bash
cd /root/fangzhou
./deploy.sh
```

脚本会自动执行：`git pull` -> `构建镜像` -> `重启容器` -> `数据库结构同步`。

---

## 3. 常见部署问题 (FAQ)

1. **构建失败：`node:20-alpine` 无法拉取**
   - 解决：配置腾讯云镜像源，或将 Dockerfile 基础镜像改为 `node:20-slim`。
2. **构建失败：`COPY /app/public ./public` not found**
   - 原因：项目根目录下没有 `public` 目录。
   - 解决：在 Dockerfile 中删除该复制指令。
3. **构建失败：`RUN npm run build` 卡死或报错**
   - 原因：通常是内存不足导致编译进程被杀。
   - 解决：按照步骤 0 配置 2G 的 Swap 虚拟内存。
