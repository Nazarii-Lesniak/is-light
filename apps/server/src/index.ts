import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { getDb, getPool } from './db/index.js';

const env = getEnv();
const db = getDb();
const app = createApp(db, env);

const server = app.listen(env.PORT, () => {
  console.log(`Сервер «Є Світло» запущено на порту ${env.PORT} (${env.NODE_ENV})`);
});

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`Отримано сигнал ${signal}. Завершення роботи...`);

  const forceExitTimer = setTimeout(() => {
    console.error('Примусове завершення роботи сервера через таймаут.');
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  server.close(async () => {
    try {
      await getPool().end();
      process.exit(0);
    } catch (error) {
      console.error('Помилка при закритті пулу БД:', error);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
