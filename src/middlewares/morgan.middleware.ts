import morgan from 'morgan';
import { logger } from '../utils';

export const morganMiddleware = function morganMiddleware() {
  return morgan(
    ':remote-addr :method :url :status :res[content-length] - :response-time ms',
    {
      stream: {
        write: (message) => {
          logger.http(message.trim());
        },
      },
      skip: () => {
        return false;
      },
    },
  );
};
