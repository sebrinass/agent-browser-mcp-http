#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { registerBrowserTools } from "./tools/browser.js";
import { logger } from "./utils/logger.js";
import express from "express";
const server = new McpServer({
    name: "agent-browser-mcp",
    version: "0.1.0",
});
registerBrowserTools(server);
const app = express();
app.use(express.json());
// 记录请求日志
app.use((req, res, next) => {
    logger.debug(`HTTP ${req.method} ${req.path}`, { headers: req.headers });
    next();
});
// Store transports by session ID
const transports = new Map();
// Fix Accept header for Meta-MCP proxy compatibility
app.use("/mcp", (req, res, next) => {
    const accept = req.headers.accept;
    if (!accept || accept === "*/*") {
        req.headers.accept = "application/json, text/event-stream";
    }
    next();
});
// Handle POST requests for MCP messages
app.post("/mcp", async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    let transport;
    // If we have a session ID, use existing transport
    if (sessionId && transports.has(sessionId)) {
        transport = transports.get(sessionId);
    }
    // If no session ID and this is an initialize request, create new transport
    else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => Math.random().toString(36).substring(7),
            onsessioninitialized: (newSessionId) => {
                transports.set(newSessionId, transport);
            },
        });
        transport.onclose = () => {
            transports.delete(transport.sessionId);
        };
        transport.onerror = (error) => {
            logger.error("MCP Transport error", error instanceof Error ? error : new Error(String(error)));
        };
        await server.connect(transport);
    }
    else {
        res.status(400).json({ error: "Invalid request: missing or invalid session ID" });
        return;
    }
    // Fix Accept header before handleRequest for Meta-MCP proxy compatibility
    if (!req.headers.accept || req.headers.accept === "*/*") {
        req.headers.accept = "application/json, text/event-stream";
    }
    await transport.handleRequest(req, res, req.body);
});
// Handle GET requests for SSE stream (MCP Streamable HTTP requirement)
app.get("/mcp", async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports.has(sessionId)) {
        res.status(400).json({ error: "Invalid request: missing or invalid session ID" });
        return;
    }
    const transport = transports.get(sessionId);
    // Fix Accept header
    if (!req.headers.accept || req.headers.accept === "*/*") {
        req.headers.accept = "text/event-stream";
    }
    await transport.handleRequest(req, res);
});
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Agent Browser MCP server started`, {
        port: PORT,
        logLevel: process.env.MCP_LOG_LEVEL || "INFO",
        logDir: logger.getLogDir(),
        logFile: logger.getLogFilePath(),
    });
    console.error(`Agent Browser MCP server running on http://0.0.0.0:${PORT}/mcp`);
    console.error(`Log file: ${logger.getLogFilePath()}`);
});
