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

// Store transports by session ID
const transports: Map<string, StreamableHTTPServerTransport> = new Map();

// Fix Accept header for Meta-MCP proxy compatibility
app.use("/mcp", (req, res, next) => {
  const accept = req.headers.accept;
  if (!accept || accept === "*/*") {
    req.headers.accept = "application/json, text/event-stream";
  }
  next();
});

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  // If we have a session ID, use existing transport
  if (sessionId && transports.has(sessionId)) {
    transport = transports.get(sessionId)!;
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
      transports.delete(transport.sessionId!);
    };

    transport.onerror = (error) => {
      console.error(`[MCP] Transport error: ${error}`);
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

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.error(`Agent Browser MCP server running on http://0.0.0.0:${PORT}/mcp`);
});
