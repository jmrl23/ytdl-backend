import type {
  ErrorRequestHandler,
  Request,
  Response,
  NextFunction,
} from 'express';
import { InternalServerError, HttpError } from 'http-errors';
import { logger } from '../logger';

const finalErrorHandler: ErrorRequestHandler = function finalErrorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  if (!(error instanceof HttpError) && error instanceof Error) {
    logger.error(error.stack);
    error = new InternalServerError(error.message);
  }

  if (error instanceof HttpError) {
    const responseData = {
      statusCode: error.statusCode,
      message: error.message,
      error: error.name.replace(/([A-Z])/g, ' $1').trim(),
    };

    if (error.statusCode > 499) logger.error(error.stack ?? error);

    return response.status(error.statusCode).json(responseData);
  }

  next(error);
};

/**
 * Use custom error handlers
 * @example
 * ```ts
 * const withCustomErrorHandler: ErrorRequestHandler = (...) => {...};
 * const withAnotherCustomErrorHandler: ErrorRequestHandler = (...) => {...};
 *
 * app.use(errorHandler(withCustomErrorHandler, withAnotherCustomErrorHandler));
 * ```
 */

export const errorHandler = function errorHandler(
  ...errorRequestHandlers: ErrorRequestHandler[]
) {
  return [...errorRequestHandlers, finalErrorHandler];
};
