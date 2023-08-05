import type { RequestHandler } from 'express';

type NestedArray<T> = Array<T> | Array<NestedArray<T>>;

/**
 * Wrapper function for express
 *
 * - Allowing to return a value  as a response inside a request handler
 * - Allowing to throw exceptions directly inside a request handler
 * - Prevent the application from crashing because of unhandled errors
 *
 * @example
 * ```ts
 * controller
 *   .get(
 *     '/foo',
 *     wrapper(middlewareThatMightThrowAnError),
 *     wrapper(function () {
 *       ...
 *       if (condition) throw SomeError(message)
 *       ...
 *       return 'Hello, World!';
 *     }, ...)
 *   );
 * ```
 */

export const wrapper = function wrapper(
  ...requestHandlers: NestedArray<RequestHandler | RequestHandler[]>
) {
  const wrappedRequestHandlers: RequestHandler[] = [];

  for (const requestHandler of requestHandlers) {
    if (Array.isArray(requestHandler)) {
      wrappedRequestHandlers.push(...wrapper(...requestHandler));

      continue;
    }

    const wrappedRequestHandler: RequestHandler =
      async function wrappedRequestHandler(request, response, next) {
        try {
          const data = await Promise.resolve(
            requestHandler(request, response, next),
          );
          if (data !== undefined) {
            if (typeof data === 'object') {
              response.json(data);
            } else {
              response.send((data as unknown)?.toString());
            }
          }
        } catch (error: unknown) {
          if (!response.headersSent) next(error);
        }
      };

    wrappedRequestHandlers.push(wrappedRequestHandler);
  }

  return wrappedRequestHandlers;
};
