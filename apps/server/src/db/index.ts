import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getEnv } from '../config/env.js';
import * as schema from './schema.js';

let poolInstance: Pool | null = null;

export function getPool(): Pool {
  if (!poolInstance) {
    const env = getEnv();
    const needsSsl =
      env.DATABASE_URL.includes('neon.tech') || env.DATABASE_URL.includes('sslmode=require');

    poolInstance = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    });
  }
  return poolInstance;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export type Database = ReturnType<typeof getDb>;
