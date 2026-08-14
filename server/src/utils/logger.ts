const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 } as const;
type Level = keyof typeof LOG_LEVELS;

const currentLevel = LOG_LEVELS[(process.env.LOG_LEVEL as Level) || 'info'] || 2;

function log(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (LOG_LEVELS[level] > currentLevel) return;
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  if (meta && Object.keys(meta).length) {
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`${prefix} ${msg}`, meta);
  } else {
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`${prefix} ${msg}`);
  }
}

const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
};

export const stream = { write: (msg: string) => logger.info(msg.trim()) };

export default logger;
