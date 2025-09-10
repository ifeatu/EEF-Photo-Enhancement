/**
 * Structured logging system for production applications
 * 
 * This module provides a comprehensive logging solution that replaces
 * console.log calls with structured, level-based logging. It includes:
 * - Multiple log levels (debug, info, warn, error)
 * - Structured metadata support
 * - Environment-aware logging
 * - Performance-optimized for production
 * 
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger';
 * 
 * // Basic logging
 * logger.info('User logged in', { userId: '123', timestamp: Date.now() });
 * 
 * // Error logging with context
 * logger.error('API request failed', new Error('Network error'), { 
 *   url: '/api/photos',
 *   status: 500
 * });
 * 
 * // Performance tracking
 * logger.debug('Query executed', { query: 'SELECT * FROM photos', duration: 150 });
 * ```
 * 
 * @module Logger
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      error: 0,
      warn: 1, 
      info: 2,
      debug: 3
    };
    return levels[level] <= levels[this.logLevel];
  }

  private formatLog(entry: LogEntry): string {
    if (this.isDevelopment) {
      return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;
    }
    return JSON.stringify(entry);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return;

    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } as Error : undefined
    };

    console.error(this.formatLog(entry));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;

    const entry: LogEntry = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      context
    };

    console.warn(this.formatLog(entry));
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;

    const entry: LogEntry = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      context
    };

    console.log(this.formatLog(entry));
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;

    const entry: LogEntry = {
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      context
    };

    console.log(this.formatLog(entry));
  }
}

export const logger = new Logger();