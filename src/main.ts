import server from './server';
import port from 'detect-port';
import { logger } from './utils';

async function main() {
  const PORT = await port(parseInt(process.env.PORT ?? '3001'));

  server.listen(PORT, () => {
    logger.info(`App is running on port %d`, PORT);
  });
}

void main();
