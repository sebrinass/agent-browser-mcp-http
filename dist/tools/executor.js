import { spawn } from "child_process";
// Environment variable for agent-browser executable path
const AGENT_BROWSER_PATH = process.env.AGENT_BROWSER_PATH || "agent-browser";
/**
 * Execute an agent-browser command and return the result
 */
export async function execBrowser(command, options = {}, sessionId) {
    // Map command aliases to actual agent-browser commands
    const commandMap = {
        navigate: "open",
        get_text: "get text",
        get_html: "get html",
        get_attribute: "get attr",
        get_url: "get url",
        get_title: "get title",
        get_console: "console",
        get_network: "network requests",
        get_cookies: "cookies get",
        set_cookies: "cookies set",
        clear_cookies: "cookies clear",
        is_visible: "is visible",
        is_enabled: "is enabled",
        is_checked: "is checked",
        wait_for_selector: "wait",
        wait_for_navigation: "wait",
        new_session: "session",
        close_session: "close",
        go_back: "back",
        go_forward: "forward",
    };
    const actualCommand = commandMap[command] || command;
    const args = actualCommand.split(" ");
    // Add session ID if provided
    if (sessionId) {
        args.push("--session", sessionId);
    }
    // Define which parameters should be positional arguments for each command
    const positionalParams = {
        open: ["url"],
        click: ["selector"],
        fill: ["selector", "value"],
        type: ["selector", "text"],
        hover: ["selector"],
        focus: ["selector"],
        check: ["selector"],
        uncheck: ["selector"],
        select: ["selector", "value"],
        press: ["key"],
        scroll: ["direction"],
        screenshot: ["path"],
        pdf: ["path"],
        evaluate: ["script"],
        wait: ["selector"],
        "get text": ["selector"],
        "get html": ["selector"],
        "get attr": ["selector", "attribute"],
        "is visible": ["selector"],
        "is enabled": ["selector"],
        "is checked": ["selector"],
    };
    const positionalKeys = positionalParams[actualCommand] || [];
    const addedPositional = new Set();
    // Add positional arguments first
    for (const key of positionalKeys) {
        if (options[key] !== undefined && options[key] !== null) {
            args.push(String(options[key]));
            addedPositional.add(key);
        }
    }
    // Add remaining options as flags
    for (const [key, value] of Object.entries(options)) {
        if (value === undefined || value === null || addedPositional.has(key))
            continue;
        const flag = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
        if (typeof value === "boolean") {
            if (value)
                args.push(flag);
        }
        else if (Array.isArray(value)) {
            args.push(flag, JSON.stringify(value));
        }
        else if (typeof value === "object") {
            args.push(flag, JSON.stringify(value));
        }
        else {
            args.push(flag, String(value));
        }
    }
    return new Promise((resolve, reject) => {
        const proc = spawn(AGENT_BROWSER_PATH, args, {
            env: {
                ...process.env,
                // Ensure session is isolated if sessionId is provided
                ...(sessionId && { AGENT_BROWSER_SESSION: sessionId }),
            },
        });
        let stdout = "";
        let stderr = "";
        proc.stdout.on("data", (data) => {
            stdout += data.toString();
        });
        proc.stderr.on("data", (data) => {
            stderr += data.toString();
        });
        proc.on("close", (code) => {
            if (code === 0) {
                resolve(stdout.trim() || "Command executed successfully");
            }
            else {
                reject(new Error(`agent-browser exited with code ${code}: ${stderr || stdout}`));
            }
        });
        proc.on("error", (err) => {
            reject(new Error(`Failed to execute agent-browser: ${err.message}`));
        });
    });
}
/**
 * Check if agent-browser is available
 */
export async function checkAgentBrowser() {
    try {
        await execBrowser("--version", {});
        return true;
    }
    catch {
        return false;
    }
}
