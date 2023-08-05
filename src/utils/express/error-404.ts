import type { RequestHandler } from 'express';
import { NotFound } from 'http-errors';

export const error404: RequestHandler = function error404(request) {
  throw new NotFound(`Cannot ${request.method} ${request.url}`);
};
