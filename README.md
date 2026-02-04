# agent-browser-mcp-http

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的浏览器自动化服务器，通过 Docker 容器提供 [Vercel agent-browser](https://github.com/vercel-labs/agent-browser) 能力，支持 HTTP 传输协议。

## 特性

- **AI 优化的浏览器控制** - 使用无障碍属性、文本匹配和数据属性的语义化元素定位
- **会话隔离** - 多个独立的浏览器会话，拥有独立的 Cookie、存储和浏览历史
- **全面自动化** - 导航、表单填写、点击、滚动、键盘输入等
- **数据提取** - 获取文本、HTML、属性、无障碍快照、截图和 PDF
- **Cookie 管理** - 完全控制浏览器 Cookie 和存储
- **HTTP 传输** - 支持通过 HTTP 接口访问，适合 Docker 部署

## 快速开始

### 拉取并运行 Docker 镜像

```bash
# 拉取镜像
docker pull sebrinass/agent-browser-mcp-http:latest

# 运行容器
docker run -d --name agent-browser-mcp \
  -p 3000:3000 \
  sebrinass/agent-browser-mcp-http:latest
```

### 配置 MCP 客户端

在客户端中配置 HTTP 端点：

```json
{
  "mcpServers": {
    "agent-browser": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## 可用的工具

### 导航

- `browser_navigate` - 导航到指定 URL
- `browser_go_back` - 后退一页
- `browser_go_forward` - 前进一页
- `browser_reload` - 刷新当前页面

### 交互

- `browser_click` - 点击元素
- `browser_fill` - 填充文本输入框
- `browser_type` - 逐字符输入文本
- `browser_hover` - 悬停在元素上
- `browser_scroll` - 滚动页面或特定元素
- `browser_select` - 从下拉菜单选择选项
- `browser_check` - 选中复选框或单选按钮
- `browser_uncheck` - 取消选中复选框
- `browser_press` - 按下键盘按键

### 数据提取

- `browser_get_text` - 获取元素或页面的文本内容
- `browser_get_html` - 获取 HTML 内容
- `browser_get_attribute` - 获取属性值
- `browser_get_url` - 获取当前页面 URL
- `browser_get_title` - 获取当前页面标题
- `browser_snapshot` - 获取无障碍树快照

### 会话管理

- `browser_new_session` - 创建新的独立浏览器会话
- `browser_close_session` - 关闭浏览器会话

### 截图和 PDF

- `browser_screenshot` - 截图
- `browser_pdf` - 生成当前页面的 PDF

### 下载

- `browser_download` - 点击元素触发下载并保存文件
- `browser_wait_for_download` - 等待下载完成（被动模式）

完整工具列表和参数请参考 [官方文档](https://github.com/vercel-labs/agent-browser)。

## Docker 部署

### 使用预构建镜像

```bash
# 拉取最新镜像
docker pull sebrinass/agent-browser-mcp-http:latest

# 运行容器
docker run -d \
  --name agent-browser-mcp \
  -p 3000:3000 \
  -v /path/to/screenshots:/tmp \
  sebrinass/agent-browser-mcp-http:latest
```

### 端口说明

- `3000` - HTTP 服务端口，提供 `/mcp` 端点和 `/health` 健康检查

### 数据持久化

如需保存截图，可以挂载目录：

```bash
docker run -d \
  --name agent-browser-mcp \
  -p 3000:3000 \
  -v /your/screenshots:/tmp \
  sebrinass/agent-browser-mcp-http:latest
```

## Unraid 部署

在 Unraid 的 Docker 页面添加以下配置：

### 基础设置

- 仓库：`sebrinass/agent-browser-mcp-http:latest`
- 容器名称：`agent-browser-mcp`

### 端口映射

| 主机端口 | 容器端口 | 说明 |
|---------|---------|------|
| 3000    | 3000    | HTTP 服务端口 |

### 可选：路径映射

| 主机路径         | 容器路径 | 说明 |
|----------------|---------|------|
| /mnt/user/appdata/agent-browser-mcp/screenshots | /tmp | 截图保存目录 |

### 环境变量

| 变量名   | 值   | 说明       |
|---------|------|-----------|
| PORT    | 3000 | HTTP 服务端口 |

## 本地构建

### 构建 Docker 镜像

```bash
docker build -t agent-browser-mcp-http:latest .
```

### 运行构建的镜像

```bash
docker run -d \
  --name agent-browser-mcp \
  -p 3000:3000 \
  agent-browser-mcp-http:latest
```

### 手动构建和测试

```bash
# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 运行本地测试
npm test
```

## 开发

```bash
# 克隆仓库
git clone https://github.com/sebrinass/agent-browser-mcp-http.git
cd agent-browser-mcp-http

# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 开发模式（监听变化）
npm run dev
```

## 技术架构

```
┌─────────────────────────────────────────────┐
│           Docker 容器                        │
│  ┌───────────────────────────────────────┐  │
│  │  HTTP 服务器                           │  │
│  │  (Express + StreamableHTTPServer)     │  │
│  └───────────────────────────────────────┘  │
│                   │                          │
│                   ▼                          │
│  ┌───────────────────────────────────────┐  │
│  │  MCP 服务器                            │  │
│  │  (@modelcontextprotocol/sdk)           │  │
│  └───────────────────────────────────────┘  │
│                   │                          │
│                   ▼                          │
│  ┌───────────────────────────────────────┐  │
│  │  agent-browser CLI                    │  │
│  │  (官方浏览器引擎，从 npm 安装)          │  │
│  └───────────────────────────────────────┘  │
│                   │                          │
│                   ▼                          │
│  ┌───────────────────────────────────────┐  │
│  │  Chromium 浏览器                       │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## 注意事项

- 每次构建容器时会自动从 npm 安装最新版的 `agent-browser`，确保获得官方最新功能
- 容器运行时会自动安装 Chromium 浏览器及其依赖
- HTTP 端点：`http://<容器IP>:3000/mcp`
- 健康检查端点：`http://<容器IP>:3000/health`

## License

MIT

## 致谢

基于 [Vercel agent-browser](https://github.com/vercel-labs/agent-browser) 和 [agent-browser-mcp](https://github.com/minhlucvan/agent-browser-mcp) 实现。
