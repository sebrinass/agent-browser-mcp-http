interface ExecOptions {
    [key: string]: unknown;
}
/**
 * Execute an agent-browser command and return the result
 */
export declare function execBrowser(command: string, options?: ExecOptions, sessionId?: string): Promise<string>;
/**
 * Check if agent-browser is available
 */
export declare function checkAgentBrowser(): Promise<boolean>;
export {};
