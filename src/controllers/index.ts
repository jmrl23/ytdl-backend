import { Router } from 'express';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../utils';

/**
 * Contains all the registered routes inside the `src/controllers` folder.
 *
 * - To register a controller, filename should be in `[name].controller.{ts|js}`
 * format.
 *   - example:
 *     - `foo.controller.ts` -> `http://localhost:3001/foo`
 * - You can register controller in a nested folder
 * - If a controller named as `index.controller`, it will register base on its
 *   location inside the `src/controllers` directory.
 *   - example:
 *     - `src/controller/foo/bar/index.controller.ts` -> `http://localhost:3001/foo/bar`
 * - Controllers (`express.Router`) must be exported as `controller`
 *
 *  @example
 * ```ts
 * // foo.controller.ts
 *
 * import { Router } from 'express';
 *
 * export const controller = Router();
 *
 * // base_url: http://localhost:3001/foo
 * controller
 *   // route: http://localhost:3001/foo/bar
 *   .get('/bar', requestHandler);
 * ```
 */

const router = Router();

function throughDirectory(dir: string) {
  const collection: string[] = [];
  for (const file of readdirSync(dir)) {
    const filePath = join(dir, file);
    if (statSync(filePath).isDirectory()) {
      collection.push(...throughDirectory(filePath));
      continue;
    }
    collection.push(filePath);
  }
  return collection;
}
const files = throughDirectory(__dirname);
for (const file of files) {
  const controllerPattern = /\.controller\.(ts|js)$/gi;
  const controllerSuffix = file.match(controllerPattern);
  const controllerName = file
    .replace(__dirname, '')
    .replace(controllerPattern, '')
    .replace(/\\/g, '/')
    .replace(/\/index$/i, '/');
  if (!controllerSuffix || controllerName.match(/\..+$/i)) continue;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(file);
  if (
    typeof mod !== 'object' ||
    Object.getPrototypeOf(mod?.controller) !== Router
  )
    continue;
  router.use(controllerName, mod.controller);
  logger.info(
    `Controller %s -> {%s}`,
    file.replace(__dirname, ''),
    controllerName,
  );
}

export default router;
