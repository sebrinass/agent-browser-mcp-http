FROM node:20

# 安装浏览器所需的系统依赖
RUN apt-get update && apt-get install -y \
    libnspr4 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 创建非 root 用户
RUN useradd -m -s /bin/bash nodeuser && \
    mkdir -p /home/node/.npm /home/node/npm-global && \
    chown -R nodeuser:nodeuser /home/node

USER nodeuser
WORKDIR /home/node

# 使用自定义前缀安装全局包
ENV PATH=/home/node/npm-global/bin:$PATH
RUN npm config set prefix /home/node/npm-global

# 1. 安装 agent-browser (官方引擎)
RUN npm install -g agent-browser

# 2. 复制 MCP 封装代码并安装依赖
COPY --chown=nodeuser:nodeuser package*.json tsconfig.json ./
RUN npm install

# 3. 复制源代码
COPY --chown=nodeuser:nodeuser src ./src

# 4. 编译 TypeScript
RUN npm run build

# 5. 安装浏览器依赖
RUN agent-browser install --with-deps

# 设置端口
EXPOSE 3000

# 启动 HTTP 服务
CMD ["node", "dist/index-http.js"]
