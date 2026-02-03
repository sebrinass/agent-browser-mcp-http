import { z } from "zod";
import { execBrowser } from "./executor.js";
import { randomUUID } from "crypto";
import { logger } from "../utils/logger.js";
// 包装工具执行，添加日志记录
async function executeTool(toolName, params, execFn, sessionId) {
    logger.info(`Tool called: ${toolName}`, { params }, sessionId);
    const startTime = Date.now();
    try {
        const result = await execFn();
        const duration = Date.now() - startTime;
        logger.info(`Tool ${toolName} completed in ${duration}ms`, { resultLength: result.length }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    }
    catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Tool ${toolName} failed after ${duration}ms`, error instanceof Error ? error : new Error(errorMsg), { params }, sessionId);
        throw error;
    }
}
export function registerBrowserTools(server) {
    // Navigation Tools
    server.tool("browser_navigate", "Navigate to a URL in the browser", {
        url: z.string().url().describe("The URL to navigate to"),
        sessionId: z.string().optional().describe("Browser session ID for isolation"),
    }, async ({ url, sessionId }) => {
        return executeTool("browser_navigate", { url, sessionId }, () => execBrowser("navigate", { url }, sessionId), sessionId);
    });
    server.tool("browser_go_back", "Navigate back in browser history", {
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ sessionId }) => {
        const result = await execBrowser("go_back", {}, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_go_forward", "Navigate forward in browser history", {
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ sessionId }) => {
        const result = await execBrowser("go_forward", {}, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_reload", "Reload the current page", {
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ sessionId }) => {
        const result = await execBrowser("reload", {}, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    // Interaction Tools
    server.tool("browser_click", "Click on an element. IMPORTANT: Use browser_snapshot first to get element refs, then use the ref (e.g., '@e12') for reliable interaction.", {
        selector: z.string().describe("Element reference from snapshot (e.g., '@e12') or CSS selector (e.g., '#id', '.class'). Must use ref format '@eN' for best results."),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ selector, sessionId }) => {
        return executeTool("browser_click", { selector, sessionId }, () => execBrowser("click", { selector }, sessionId), sessionId);
    });
    server.tool("browser_fill", "Fill a text input field. IMPORTANT: Use browser_snapshot first to get element refs, then use the ref (e.g., '@e12') for reliable interaction.", {
        selector: z.string().describe("Element reference from snapshot (e.g., '@e12') or CSS selector (e.g., '#id', '.class'). Must use ref format '@eN' for best results."),
        value: z.string().describe("Text value to fill in"),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ selector, value, sessionId }) => {
        return executeTool("browser_fill", { selector, value, sessionId }, () => execBrowser("fill", { selector, value }, sessionId), sessionId);
    });
    server.tool("browser_type", "Type text character by character. IMPORTANT: Use browser_snapshot first to get element refs, then use the ref (e.g., '@e12') for reliable interaction.", {
        selector: z.string().describe("Element reference from snapshot (e.g., '@e12') or CSS selector (e.g., '#id', '.class'). Must use ref format '@eN' for best results."),
        text: z.string().describe("Text to type"),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ selector, text, sessionId }) => {
        const result = await execBrowser("type", { selector, text }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_hover", "Hover over an element. IMPORTANT: Use browser_snapshot first to get element refs, then use the ref (e.g., '@e12') for reliable interaction.", {
        selector: z.string().describe("Element reference from snapshot (e.g., '@e12') or CSS selector (e.g., '#id', '.class'). Must use ref format '@eN' for best results."),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ selector, sessionId }) => {
        const result = await execBrowser("hover", { selector }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_scroll", "Scroll the page or an element", {
        direction: z.enum(["up", "down", "left", "right"]).describe("Scroll direction"),
        amount: z.number().optional().describe("Scroll amount in pixels"),
        selector: z.string().optional().describe("Selector for element to scroll (scrolls page if not provided)"),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ direction, amount, selector, sessionId }) => {
        const result = await execBrowser("scroll", { direction, amount, selector }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_select", "Select an option from a dropdown. IMPORTANT: Use browser_snapshot first to get element refs, then use the ref (e.g., '@e12') for reliable interaction.", {
        selector: z.string().describe("Element reference from snapshot (e.g., '@e12') or CSS selector (e.g., '#id', '.class'). Must use ref format '@eN' for best results."),
        value: z.string().describe("Value or label of the option to select"),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ selector, value, sessionId }) => {
        const result = await execBrowser("select", { selector, value }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_check", "Check a checkbox or radio button. IMPORTANT: Use browser_snapshot first to get element refs, then use the ref (e.g., '@e12') for reliable interaction.", {
        selector: z.string().describe("Element reference from snapshot (e.g., '@e12') or CSS selector (e.g., '#id', '.class'). Must use ref format '@eN' for best results."),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ selector, sessionId }) => {
        const result = await execBrowser("check", { selector }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_uncheck", "Uncheck a checkbox. IMPORTANT: Use browser_snapshot first to get element refs, then use the ref (e.g., '@e12') for reliable interaction.", {
        selector: z.string().describe("Element reference from snapshot (e.g., '@e12') or CSS selector (e.g., '#id', '.class'). Must use ref format '@eN' for best results."),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ selector, sessionId }) => {
        const result = await execBrowser("uncheck", { selector }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_press", "Press a keyboard key", {
        key: z.string().describe("Key to press (e.g., 'Enter', 'Escape', 'Tab')"),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ key, sessionId }) => {
        const result = await execBrowser("press", { key }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    // Information Retrieval Tools
    server.tool("browser_get_text", "Get text content from an element or the entire page. IMPORTANT: Use browser_snapshot first to get element refs, then use the ref (e.g., '@e12') for reliable interaction.", {
        selector: z.string().optional().describe("Element reference from snapshot (e.g., '@e12') or CSS selector (e.g., '#id', '.class'). Must use ref format '@eN' for best results. Omit to get full page text."),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ selector, sessionId }) => {
        const result = await execBrowser("get_text", { selector }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_get_html", "Get HTML content from an element or the entire page. IMPORTANT: Use browser_snapshot first to get element refs, then use the ref (e.g., '@e12') for reliable interaction. NOTE: selector parameter is REQUIRED for element HTML. To get full page HTML, use browser_evaluate instead.", {
        selector: z.string().describe("Element reference from snapshot (e.g., '@e12') or CSS selector (e.g., '#id', '.class'). Must use ref format '@eN' for best results. REQUIRED parameter - this tool requires a selector to get HTML from a specific element."),
        outer: z.boolean().optional().describe("Get outer HTML instead of inner HTML"),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ selector, outer, sessionId }) => {
        const result = await execBrowser("get_html", { selector, outer }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_get_attribute", "Get an attribute value from an element. IMPORTANT: Use browser_snapshot first to get element refs, then use the ref (e.g., '@e12') for reliable interaction.", {
        selector: z.string().describe("Element reference from snapshot (e.g., '@e12') or CSS selector (e.g., '#id', '.class'). Must use ref format '@eN' for best results."),
        attribute: z.string().describe("Name of the attribute to get"),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ selector, attribute, sessionId }) => {
        const result = await execBrowser("get_attribute", { selector, attribute }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_get_url", "Get the current page URL", {
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ sessionId }) => {
        const result = await execBrowser("get_url", {}, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_get_title", "Get the current page title", {
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ sessionId }) => {
        const result = await execBrowser("get_title", {}, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_snapshot", "Get an accessibility tree snapshot of the page for AI-friendly element references", {
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ sessionId }) => {
        const result = await execBrowser("snapshot", {}, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    // Element State Tools
    server.tool("browser_is_visible", "Check if an element is visible. IMPORTANT: Use browser_snapshot first to get element refs, then use the ref (e.g., '@e12') for reliable interaction.", {
        selector: z.string().describe("Element reference from snapshot (e.g., '@e12') or CSS selector (e.g., '#id', '.class'). Must use ref format '@eN' for best results."),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ selector, sessionId }) => {
        const result = await execBrowser("is_visible", { selector }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_is_enabled", "Check if an element is enabled. IMPORTANT: Use browser_snapshot first to get element refs, then use the ref (e.g., '@e12') for reliable interaction.", {
        selector: z.string().describe("Element reference from snapshot (e.g., '@e12') or CSS selector (e.g., '#id', '.class'). Must use ref format '@eN' for best results."),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ selector, sessionId }) => {
        const result = await execBrowser("is_enabled", { selector }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_is_checked", "Check if a checkbox/radio is checked. IMPORTANT: Use browser_snapshot first to get element refs, then use the ref (e.g., '@e12') for reliable interaction.", {
        selector: z.string().describe("Element reference from snapshot (e.g., '@e12') or CSS selector (e.g., '#id', '.class'). Must use ref format '@eN' for best results."),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ selector, sessionId }) => {
        const result = await execBrowser("is_checked", { selector }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    // Screenshot and PDF Tools
    server.tool("browser_screenshot", "Take a screenshot of the page or an element. IMPORTANT: Use browser_snapshot first to get element refs, then use the ref (e.g., '@e12') for reliable interaction.", {
        path: z.string().optional().describe("File path to save the screenshot"),
        selector: z.string().optional().describe("Element reference from snapshot (e.g., '@e12') or CSS selector (e.g., '#id', '.class'). Must use ref format '@eN' for best results. Omit for full page."),
        fullPage: z.boolean().optional().describe("Capture the full scrollable page"),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ path, selector, fullPage, sessionId }) => {
        const result = await execBrowser("screenshot", { path, selector, fullPage }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_pdf", "Generate a PDF of the current page", {
        path: z.string().describe("File path to save the PDF"),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ path, sessionId }) => {
        const result = await execBrowser("pdf", { path }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    // Session Management Tools
    server.tool("browser_new_session", "Create a new isolated browser session", {
        viewport: z.object({
            width: z.number().describe("Viewport width in pixels"),
            height: z.number().describe("Viewport height in pixels"),
        }).optional().describe("Viewport size configuration"),
    }, async ({ viewport }) => {
        // Generate a unique session ID
        const sessionId = randomUUID();
        logger.info("Creating new browser session", { viewport }, sessionId);
        // Initialize the session by running a simple command
        // This creates the browser instance for this session
        try {
            await execBrowser("get_title", {}, sessionId);
            logger.info("New session created successfully", { sessionId }, sessionId);
        }
        catch (error) {
            // Session initialized (browser may not be open yet, which is fine)
            logger.debug("Session initialization (browser not open yet)", { error }, sessionId);
        }
        return {
            content: [{ type: "text", text: sessionId }],
        };
    });
    server.tool("browser_close_session", "Close a browser session", {
        sessionId: z.string().describe("Session ID to close"),
    }, async ({ sessionId }) => {
        const result = await execBrowser("close_session", {}, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    // Wait Tools
    server.tool("browser_wait_for_selector", "Wait for an element to appear in the page. IMPORTANT: This tool only supports CSS selectors (e.g., '#id', '.class'), NOT ref selectors (e.g., '@e12'). Use browser_snapshot first to find the correct CSS selector for your target element.", {
        selector: z.string().describe("CSS selector for the element (e.g., '#id', '.class'). NOTE: Ref selectors like '@e12' are NOT supported - use CSS selector only."),
        timeout: z.number().optional().describe("Maximum wait time in milliseconds"),
        state: z.enum(["attached", "detached", "visible", "hidden"]).optional().describe("Element state to wait for"),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ selector, timeout, state, sessionId }) => {
        const result = await execBrowser("wait_for_selector", { selector, timeout, state }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_wait_for_navigation", "Wait for navigation to complete", {
        timeout: z.number().optional().describe("Maximum wait time in milliseconds"),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ timeout, sessionId }) => {
        const result = await execBrowser("wait_for_navigation", { timeout }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    // Cookie and Storage Tools
    server.tool("browser_get_cookies", "Get cookies from the browser", {
        urls: z.array(z.string()).optional().describe("URLs to get cookies for"),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ urls, sessionId }) => {
        const result = await execBrowser("get_cookies", { urls }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_set_cookies", "Set cookies in the browser", {
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
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ cookies, sessionId }) => {
        const result = await execBrowser("set_cookies", { cookies }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_clear_cookies", "Clear all cookies", {
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ sessionId }) => {
        const result = await execBrowser("clear_cookies", {}, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    // Evaluate JavaScript
    server.tool("browser_evaluate", "Execute JavaScript code in the browser context", {
        script: z.string().describe("JavaScript code to execute"),
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ script, sessionId }) => {
        const result = await execBrowser("evaluate", { script }, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    // Console and Network Tools
    server.tool("browser_get_console", "Get console messages from the browser", {
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ sessionId }) => {
        const result = await execBrowser("get_console", {}, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
    server.tool("browser_get_network", "Get network requests made by the browser", {
        sessionId: z.string().optional().describe("Browser session ID"),
    }, async ({ sessionId }) => {
        const result = await execBrowser("get_network", {}, sessionId);
        return {
            content: [{ type: "text", text: result }],
        };
    });
}
