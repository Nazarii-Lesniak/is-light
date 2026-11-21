import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { getDb, getPool } from './db/index.js';

const env = getEnv();
const db = getDb();
const app = createApp(db, env);

const server = app.listen(env.PORT, () => {
  console.log(`Сервер «Є Світло» запущено на порту ${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Отримано сигнал ${signal}. Завершення роботи...`);
  server.close(async () => {
    await getPool().end();
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
