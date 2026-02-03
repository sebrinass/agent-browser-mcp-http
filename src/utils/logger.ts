import { appendFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  sessionId?: string;
  error?: Error;
}

class Logger {
  private logDir: string;
  private logFile: string;
  private logLevel: LogLevel;
  private enableConsole: boolean;
  private enableFile: boolean;

  constructor() {
    // 日志目录：~/.agent-browser-mcp/logs
    this.logDir = process.env.MCP_LOG_DIR || join(homedir(), ".agent-browser-mcp", "logs");
    
    // 日志文件按日期命名
    const date = new Date().toISOString().split("T")[0];
    this.logFile = join(this.logDir, `mcp-${date}.log`);
    
    // 日志级别从环境变量读取，默认 INFO
    const envLevel = process.env.MCP_LOG_LEVEL?.toUpperCase() as LogLevel;
    this.logLevel = ["DEBUG", "INFO", "WARN", "ERROR"].includes(envLevel) ? envLevel : "INFO";
    
    // 是否启用控制台和文件输出
    this.enableConsole = process.env.MCP_LOG_CONSOLE !== "false";
    this.enableFile = process.env.MCP_LOG_FILE !== "false";
    
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    if (!existsSync(this.logDir)) {
      try {
        mkdirSync(this.logDir, { recursive: true });
      } catch (err) {
        console.error(`[Logger] Failed to create log directory: ${err}`);
      }
    }
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatLogEntry(entry: LogEntry): string {
    const parts: string[] = [
      `[${entry.timestamp}]`,
      `[${entry.level}]`,
    ];
    
    if (entry.sessionId) {
      parts.push(`[Session: ${entry.sessionId}]`);
    }
    
    parts.push(entry.message);
    
    if (entry.data !== undefined) {
      try {
        const dataStr = typeof entry.data === "object" 
          ? JSON.stringify(entry.data, null, 2) 
          : String(entry.data);
        parts.push(`\nData: ${dataStr}`);
      } catch {
        parts.push(`\nData: [Unable to serialize]`);
      }
    }
    
    if (entry.error) {
      parts.push(`\nError: ${entry.error.message}`);
      if (entry.error.stack) {
        parts.push(`\nStack: ${entry.error.stack}`);
      }
    }
    
    return parts.join(" ") + "\n";
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR"];
    const currentIndex = levels.indexOf(this.logLevel);
    const targetIndex = levels.indexOf(level);
    return targetIndex >= currentIndex;
  }

  private write(entry: LogEntry): void {
    const formatted = this.formatLogEntry(entry);
    
    if (this.enableConsole) {
      const consoleMethod = entry.level === "ERROR" ? console.error 
        : entry.level === "WARN" ? console.warn 
        : entry.level === "DEBUG" ? console.debug 
        : console.log;
      consoleMethod(formatted.trim());
    }
    
    if (this.enableFile) {
      try {
        appendFileSync(this.logFile, formatted);
      } catch (err) {
        console.error(`[Logger] Failed to write to log file: ${err}`);
      }
    }
  }

  debug(message: string, data?: unknown, sessionId?: string): void {
    if (this.shouldLog("DEBUG")) {
      this.write({
        timestamp: this.getTimestamp(),
        level: "DEBUG",
        message,
        data,
        sessionId,
      });
    }
  }

  info(message: string, data?: unknown, sessionId?: string): void {
    if (this.shouldLog("INFO")) {
      this.write({
        timestamp: this.getTimestamp(),
        level: "INFO",
        message,
        data,
        sessionId,
      });
    }
  }

  warn(message: string, data?: unknown, sessionId?: string): void {
    if (this.shouldLog("WARN")) {
      this.write({
        timestamp: this.getTimestamp(),
        level: "WARN",
        message,
        data,
        sessionId,
      });
    }
  }

  error(message: string, error?: Error, data?: unknown, sessionId?: string): void {
    if (this.shouldLog("ERROR")) {
      this.write({
        timestamp: this.getTimestamp(),
        level: "ERROR",
        message,
        data,
        sessionId,
        error,
      });
    }
  }

  // 记录命令执行
  logCommand(
    command: string, 
    args: string[], 
    sessionId?: string, 
    options?: Record<string, unknown>
  ): void {
    this.info(`Executing command: ${command}`, {
      args,
      options,
      executable: process.env.AGENT_BROWSER_PATH || "agent-browser",
    }, sessionId);
  }

  // 记录命令结果
  logCommandResult(
    command: string, 
    duration: number, 
    success: boolean, 
    result?: string, 
    error?: string,
    sessionId?: string
  ): void {
    const level = success ? "DEBUG" : "ERROR";
    const message = `Command ${command} ${success ? "completed" : "failed"} in ${duration}ms`;
    
    this.write({
      timestamp: this.getTimestamp(),
      level,
      message,
      data: {
        command,
        duration,
        success,
        result: result?.substring(0, 1000), // 限制长度
        error,
      },
      sessionId,
    });
  }

  // 获取当前日志文件路径
  getLogFilePath(): string {
    return this.logFile;
  }

  // 获取日志目录
  getLogDir(): string {
    return this.logDir;
  }
}

// 导出单例
export const logger = new Logger();
