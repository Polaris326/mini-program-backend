# 使用 Node.js 20 镜像（包含 Python）
FROM node:20

# 安装 Python 和 pip
RUN apt-get update && apt-get install -y python3 python3-pip

# 设置工作目录
WORKDIR /app

# 复制并安装 Python 依赖
COPY parser/requirements.txt ./parser/
RUN pip3 install -r parser/requirements.txt --break-system-packages

# 复制 Python 解析库
COPY parser ./parser
COPY parse_douyin.py ./

# 复制 Node.js 依赖
COPY package*.json ./
RUN npm install --production

# 复制源代码
COPY src ./src

# 暴露 80 端口（云托管要求）
EXPOSE 80

# 启动命令
CMD ["npm", "start"]
