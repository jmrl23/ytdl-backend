import { createLogger, transports, format, addColors } from 'winston';

const { combine, errors, timestamp, prettyPrint, colorize, printf, splat } =
  format;
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';

  return isDevelopment ? 'debug' : 'warn';
};

addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
});

export const logger = createLogger({
  level: level(),
  format: combine(
    errors({ stack: true }),
    format((info) => ({ ...info, level: info.level.toUpperCase() }))(),
    colorize({ level: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    prettyPrint(),
    splat(),
    printf((info) => `[${info.timestamp}] [${info.level}]: ${info.message}`),
  ),
  transports: [new transports.Console()],
});
