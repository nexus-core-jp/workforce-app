/**
 * Structured logging utility.
 *
 * Outputs JSON in production for log aggregators (Datadog, CloudWatch, etc.)
 * and human-readable format in development.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("user.login", { userId: "abc", tenantId: "xyz" });
 *   logger.error("stripe.webhook_failed", { eventId: "evt_123" }, err);
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  event: string;
  data?: Record<string, unknown>;
  error?: string;
  stack?: string;
  timestamp: string;
}

const isProd = process.env.NODE_ENV === "production";

function write(level: LogLevel, event: string, data?: Record<string, unknown>, err?: unknown) {
  const entry: LogEntry = {
    level,
    event,
    data,
    timestamp: new Date().toISOString(),
  };

  if (err instanceof Error) {
    entry.error = err.message;
    entry.stack = err.stack;
  } else if (err !== undefined) {
    entry.error = String(err);
  }

  const method = level === "error" ? console.error : level === "warn" ? console.warn : console.log;

  if (isProd) {
    method(JSON.stringify(entry));
  } else {
    const prefix = `[${level.toUpperCase()}] ${event}`;
    if (entry.error) {
      method(prefix, data ?? "", `| Error: ${entry.error}`);
    } else {
      method(prefix, data ?? "");
    }
  }
}

export const logger = {
  debug: (event: string, data?: Record<string, unknown>) => write("debug", event, data),
  info: (event: string, data?: Record<string, unknown>) => write("info", event, data),
  warn: (event: string, data?: Record<string, unknown>, err?: unknown) => write("warn", event, data, err),
  error: (event: string, data?: Record<string, unknown>, err?: unknown) => write("error", event, data, err),
};
