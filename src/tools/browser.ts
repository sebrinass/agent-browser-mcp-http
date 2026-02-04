import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execBrowser } from "./executor.js";
import { randomUUID } from "crypto";
import { logger } from "../utils/logger.js";

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  [key: string]: unknown;
}

async function executeTool<T extends Record<string, unknown>>(
  toolName: string,
  params: T,
  execFn: () => Promise<string>,
  sessionId?: string
): Promise<ToolResult> {
  logger.info(`Tool: ${toolName}`, { params }, sessionId);
  const start = Date.now();
  try {
    const result = await execFn();
    logger.info(`${toolName} done (${Date.now() - start}ms)`, { len: result.length }, sessionId);
    return { content: [{ type: "text" as const, text: result }] };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`${toolName} failed (${Date.now() - start}ms)`, error instanceof Error ? error : new Error(msg), { params }, sessionId);
    throw error;
  }
}

// Common descriptions
const REF = "Element ref (@eN) or CSS selector";
const SESSION = "Session ID for isolation";
const USE_SNAPSHOT = "Use browser_snapshot first to get @eN refs";

export function registerBrowserTools(server: McpServer): void {
  // Navigation
  server.tool("browser_navigate", "Navigate to URL", {
    url: z.string().url().describe("URL to navigate to"),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ url, sessionId }) => {
    return executeTool("navigate", { url, sessionId }, () => execBrowser("navigate", { url }, sessionId), sessionId);
  });

  server.tool("browser_go_back", "Go back in history", {
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ sessionId }) => {
    const result = await execBrowser("go_back", {}, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_go_forward", "Go forward in history", {
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ sessionId }) => {
    const result = await execBrowser("go_forward", {}, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_reload", "Reload page", {
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ sessionId }) => {
    const result = await execBrowser("reload", {}, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  // Interaction
  server.tool("browser_click", `Click element. ${USE_SNAPSHOT}`, {
    selector: z.string().describe(REF),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ selector, sessionId }) => {
    return executeTool("click", { selector, sessionId }, () => execBrowser("click", { selector }, sessionId), sessionId);
  });

  server.tool("browser_fill", `Fill input field. ${USE_SNAPSHOT}`, {
    selector: z.string().describe(REF),
    value: z.string().describe("Value to fill"),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ selector, value, sessionId }) => {
    return executeTool("fill", { selector, value, sessionId }, () => execBrowser("fill", { selector, value }, sessionId), sessionId);
  });

  server.tool("browser_type", `Type text char by char. ${USE_SNAPSHOT}`, {
    selector: z.string().describe(REF),
    text: z.string().describe("Text to type"),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ selector, text, sessionId }) => {
    const result = await execBrowser("type", { selector, text }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_hover", `Hover over element. ${USE_SNAPSHOT}`, {
    selector: z.string().describe(REF),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ selector, sessionId }) => {
    const result = await execBrowser("hover", { selector }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_scroll", "Scroll page or element", {
    direction: z.enum(["up", "down", "left", "right"]).describe("Direction"),
    amount: z.number().optional().describe("Pixels to scroll"),
    selector: z.string().optional().describe("Element to scroll (page if omitted)"),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ direction, amount, selector, sessionId }) => {
    const result = await execBrowser("scroll", { direction, amount, selector }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_select", `Select dropdown option. ${USE_SNAPSHOT}`, {
    selector: z.string().describe(REF),
    value: z.string().describe("Option value or label"),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ selector, value, sessionId }) => {
    const result = await execBrowser("select", { selector, value }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_check", `Check checkbox/radio. ${USE_SNAPSHOT}`, {
    selector: z.string().describe(REF),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ selector, sessionId }) => {
    const result = await execBrowser("check", { selector }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_uncheck", `Uncheck checkbox. ${USE_SNAPSHOT}`, {
    selector: z.string().describe(REF),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ selector, sessionId }) => {
    const result = await execBrowser("uncheck", { selector }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_press", "Press keyboard key", {
    key: z.string().describe("Key like Enter, Escape, Tab"),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ key, sessionId }) => {
    const result = await execBrowser("press", { key }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  // Information
  server.tool("browser_get_text", `Get element or page text. ${USE_SNAPSHOT}`, {
    selector: z.string().optional().describe(`${REF}. Omit for full page.`),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ selector, sessionId }) => {
    const result = await execBrowser("get_text", { selector }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_get_html", `Get element HTML. ${USE_SNAPSHOT}`, {
    selector: z.string().describe(REF),
    outer: z.boolean().optional().describe("Get outer HTML"),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ selector, outer, sessionId }) => {
    const result = await execBrowser("get_html", { selector, outer }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_get_attribute", `Get element attribute. ${USE_SNAPSHOT}`, {
    selector: z.string().describe(REF),
    attribute: z.string().describe("Attribute name"),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ selector, attribute, sessionId }) => {
    const result = await execBrowser("get_attribute", { selector, attribute }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_get_url", "Get current URL", {
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ sessionId }) => {
    const result = await execBrowser("get_url", {}, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_get_title", "Get page title", {
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ sessionId }) => {
    const result = await execBrowser("get_title", {}, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_snapshot", "Get page accessibility tree with element refs", {
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ sessionId }) => {
    const result = await execBrowser("snapshot", {}, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  // Element State
  server.tool("browser_is_visible", `Check if element is visible. ${USE_SNAPSHOT}`, {
    selector: z.string().describe(REF),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ selector, sessionId }) => {
    const result = await execBrowser("is_visible", { selector }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_is_enabled", `Check if element is enabled. ${USE_SNAPSHOT}`, {
    selector: z.string().describe(REF),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ selector, sessionId }) => {
    const result = await execBrowser("is_enabled", { selector }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_is_checked", `Check if checkbox is checked. ${USE_SNAPSHOT}`, {
    selector: z.string().describe(REF),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ selector, sessionId }) => {
    const result = await execBrowser("is_checked", { selector }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  // Screenshot & PDF
  server.tool("browser_screenshot", `Take screenshot. ${USE_SNAPSHOT}`, {
    path: z.string().optional().describe("Save path"),
    selector: z.string().optional().describe(`${REF}. Omit for full page.`),
    fullPage: z.boolean().optional().describe("Capture full scrollable page"),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ path, selector, fullPage, sessionId }) => {
    const result = await execBrowser("screenshot", { path, selector, fullPage }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_pdf", "Generate PDF of page", {
    path: z.string().describe("Save path"),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ path, sessionId }) => {
    const result = await execBrowser("pdf", { path }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  // Session Management
  server.tool("browser_new_session", "Create new browser session", {
    viewport: z.object({
      width: z.number().describe("Width in px"),
      height: z.number().describe("Height in px"),
    }).optional().describe("Viewport size"),
  }, async ({ viewport }) => {
    const sessionId = randomUUID();
    logger.info("New session", { viewport }, sessionId);
    try {
      await execBrowser("get_title", {}, sessionId);
      logger.info("Session ready", { sessionId }, sessionId);
    } catch {
      logger.debug("Session init", undefined, sessionId);
    }
    return { content: [{ type: "text", text: sessionId }] };
  });

  server.tool("browser_close_session", "Close browser session", {
    sessionId: z.string().describe("Session ID to close"),
  }, async ({ sessionId }) => {
    const result = await execBrowser("close_session", {}, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  // Wait
  server.tool("browser_wait_for_selector", "Wait for element (CSS only, not @eN)", {
    selector: z.string().describe("CSS selector (#id, .class)"),
    timeout: z.number().optional().describe("Timeout in ms"),
    state: z.enum(["attached", "detached", "visible", "hidden"]).optional().describe("Element state"),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ selector, timeout, state, sessionId }) => {
    const result = await execBrowser("wait_for_selector", { selector, timeout, state }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_wait_for_navigation", "Wait for navigation to complete", {
    timeout: z.number().optional().describe("Timeout in ms"),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ timeout, sessionId }) => {
    const result = await execBrowser("wait_for_navigation", { timeout }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  // Cookies
  server.tool("browser_get_cookies", "Get cookies", {
    urls: z.array(z.string()).optional().describe("URLs to get cookies for"),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ urls, sessionId }) => {
    const result = await execBrowser("get_cookies", { urls }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_set_cookies", "Set cookies", {
    cookies: z.array(z.object({
      name: z.string(),
      value: z.string(),
      domain: z.string().optional(),
      path: z.string().optional(),
      expires: z.number().optional(),
      httpOnly: z.boolean().optional(),
      secure: z.boolean().optional(),
      sameSite: z.enum(["Strict", "Lax", "None"]).optional(),
    })).describe("Cookies to set"),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ cookies, sessionId }) => {
    const result = await execBrowser("set_cookies", { cookies }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_clear_cookies", "Clear all cookies", {
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ sessionId }) => {
    const result = await execBrowser("clear_cookies", {}, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  // JavaScript
  server.tool("browser_evaluate", "Execute JavaScript in browser", {
    script: z.string().describe("JS code to execute"),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ script, sessionId }) => {
    const result = await execBrowser("evaluate", { script }, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  // Console & Network
  server.tool("browser_get_console", "Get console messages", {
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ sessionId }) => {
    const result = await execBrowser("get_console", {}, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  server.tool("browser_get_network", "Get network requests", {
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ sessionId }) => {
    const result = await execBrowser("get_network", {}, sessionId);
    return { content: [{ type: "text", text: result }] };
  });

  // Download
  server.tool("browser_download", `Click to trigger download. ${USE_SNAPSHOT}`, {
    selector: z.string().describe(`${REF}. Should be a download link/button`),
    path: z.string().describe("Save path"),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ selector, path, sessionId }) => {
    return executeTool("download", { selector, path, sessionId }, () =>
      execBrowser("download", { selector, path }, sessionId), sessionId);
  });

  server.tool("browser_wait_for_download", "Wait for auto-triggered download (use after click if download starts automatically)", {
    path: z.string().optional().describe("Save path (uses suggested name if omitted)"),
    timeout: z.number().optional().describe("Timeout in ms"),
    sessionId: z.string().optional().describe(SESSION),
  }, async ({ path, timeout, sessionId }) => {
    return executeTool("wait_for_download", { path, timeout, sessionId }, () =>
      execBrowser("waitfordownload", { path, timeout }, sessionId), sessionId);
  });
}
