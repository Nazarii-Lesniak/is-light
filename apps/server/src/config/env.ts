import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'Змінна DATABASE_URL обовʼязкова'),
  CRON_SECRET: z.string().min(8, 'Змінна CRON_SECRET має містити щонайменше 8 символів'),
  LOE_API_BASE_URL: z.string().url().default('https://api.loe.lviv.ua/api'),
  LOE_POWER_API_BASE_URL: z.string().url().default('https://power-api.loe.lviv.ua/api'),
  LOE_LVIV_CITY_ID: z.coerce.number().int().positive().default(693),
  CORS_ORIGIN: z.string().default('*'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Помилка конфігурації середовища: ${details}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
