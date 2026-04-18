# 使用 Node.js 18 轻量级镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 先复制 package.json 安装依赖（利用缓存层）
COPY package*.json ./
RUN npm install --production

# 复制源代码
COPY src ./src

# 暴露 80 端口（云托管要求）
EXPOSE 80

# 启动命令
CMD ["npm", "start"]
