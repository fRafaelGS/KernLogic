/**
 * Logger utility for consistent logging across the application
 * This can be expanded to add external logging services in the future
 */

/**
 * Log level enum
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Simple logger utility to standardize logging
 */
const logger = {
  /**
   * Log debug message
   * @param message The message to log
   * @param data Optional data to include
   */
  debug: (message: string, data?: any) => {
    console.debug(`[DEBUG] ${message}`, data || '');
  },

  /**
   * Log info message
   * @param message The message to log
   * @param data Optional data to include
   */
  info: (message: string, data?: any) => {
    console.info(`[INFO] ${message}`, data || '');
  },

  /**
   * Log warning message
   * @param message The message to log
   * @param data Optional data to include
   */
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data || '');
  },

  /**
   * Log error message
   * @param message The message to log
   * @param error The error object
   */
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || '');
  },
};

export default logger; 