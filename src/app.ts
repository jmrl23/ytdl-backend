import express from 'express';
import controllers from './controllers';
import { join } from 'node:path';
import {
  corsMiddleware,
  helmetMiddleware,
  morganMiddleware,
} from './middlewares';
import { errorHandler, error404, wrapper } from './utils/express';

const app = express();

// middlewares
app.use(
  morganMiddleware(),
  corsMiddleware({
    origin: '*',
  }),
  helmetMiddleware({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ['cdn.rawgit.com', 'cdn.jsdelivr.net', 'localhost:3001'],
      },
    },
  }),
  express.static(join(__dirname, '../public')),
  express.json(),
  express.urlencoded({ extended: false }),
);

// controllers/ routes
app.use(controllers);

app.use(wrapper(error404), errorHandler(/** error handlers */));

export default app;
