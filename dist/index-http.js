#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { registerBrowserTools } from "./tools/browser.js";
import express from "express";
const server = new McpServer({
    name: "agent-browser-mcp",
    version: "0.1.0",
});
registerBrowserTools(server);
const app = express();
app.use(express.json());
const transports = {};
app.post("/mcp", async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    let transport;
    if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
    }
    else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => Math.random().toString(36).substring(7),
            onsessioninitialized: (newSessionId) => {
                transports[newSessionId] = transport;
            },
        });
        transport.onclose = () => {
            if (transport.sessionId) {
                delete transports[transport.sessionId];
            }
        };
        await server.connect(transport);
    }
    else {
        res.status(400).json({ error: "Invalid request: missing or invalid session ID" });
        return;
    }
    await transport.handleRequest(req, res, req.body);
});
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, '0.0.0.0', () => {
    console.error(`Agent Browser MCP server running on http://0.0.0.0:${PORT}/mcp`);
});
