import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: undefined, // reduce noise on Vercel logs
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  } : undefined
});

export function withReqLog<T extends (...args: any[]) => any>(fn: T) {
  return async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (err) {
      logger.error({ err }, 'handler_error');
      throw err;
    }
  };
}
