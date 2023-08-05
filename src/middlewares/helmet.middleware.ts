import helmet, { type HelmetOptions } from 'helmet';

export const helmetMiddleware = function helmetMiddleware(
  options: HelmetOptions = {},
) {
  return helmet({
    ...options,
  });
};
