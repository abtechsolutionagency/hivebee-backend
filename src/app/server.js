import { app } from './app.js';
import { env } from '../config/env.js';
import { connectToDatabase, disconnectFromDatabase } from '../db/client.js';
import { logger } from '../logging/logger.js';
import { createServer } from 'node:http';
import { initSocket } from '../realtime/socket.js';

let server;

const start = async () => {
  await connectToDatabase();

  server = createServer(app);
  initSocket(server);

  server.listen(env.port, env.host, () => {
    logger.info(`API server listening at http://${env.host}:${env.port}${env.apiPrefix}`);
  });
};

const shutdown = async (signal) => {
  logger.warn(`Received ${signal}. Shutting down...`);

  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  await disconnectFromDatabase();
  process.exit(0);
};

process.on('SIGINT', () => {
  shutdown('SIGINT').catch((error) => {
    logger.error('Shutdown failed', { error: error.message });
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch((error) => {
    logger.error('Shutdown failed', { error: error.message });
    process.exit(1);
  });
});

start().catch((error) => {
  logger.error('Failed to start application', { error: error.message, stack: error.stack });
  process.exit(1);
});
