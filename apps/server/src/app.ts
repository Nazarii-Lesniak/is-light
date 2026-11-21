import { timingSafeEqual } from 'node:crypto';
import {
  deleteSubscriptionSchema,
  groupIdSchema,
  upsertSubscriptionSchema,
} from '@is-light/shared';
import cors from 'cors';
import { eq, sql } from 'drizzle-orm';
import express, { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { LoeAddressAdapter } from './adapters/loe-address.adapter.js';
import { LoeScheduleAdapter } from './adapters/loe-schedule.adapter.js';
import type { Env } from './config/env.js';
import type { Database } from './db/index.js';
import { pushSubscriptions } from './db/schema.js';
import { AddressSearchService } from './services/address-search.service.js';
import { PushService } from './services/push.service.js';
import { ScheduleSyncService } from './services/schedule-sync.service.js';

const testPushSchema = z
  .object({
    expoPushToken: z.string().min(10).optional(),
    groupId: groupIdSchema.optional(),
    title: z.string().max(120).optional(),
    body: z.string().max(300).optional(),
  })
  .refine((data) => Boolean(data.expoPushToken || data.groupId), {
    message: 'Вкажіть expoPushToken або groupId',
  });

function isCronSecretValid(req: Request, expectedSecret: string): boolean {
  const headerValue = req.header('x-cron-secret');
  const queryValue = typeof req.query.secret === 'string' ? req.query.secret : undefined;
  const provided = headerValue ?? queryValue ?? '';

  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expectedSecret, 'utf8');
  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(providedBuf, expectedBuf);
}

export function createApp(db: Database, env: Env): express.Express {
  const app = express();

  const addressAdapter = new LoeAddressAdapter({
    baseUrl: env.LOE_POWER_API_BASE_URL,
  });
  const scheduleAdapter = new LoeScheduleAdapter({
    baseUrl: env.LOE_API_BASE_URL,
  });

  const addressSearchService = new AddressSearchService(db, addressAdapter);
  const pushService = new PushService(db);
  const scheduleSyncService = new ScheduleSyncService(db, scheduleAdapter, pushService);

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', async (_req: Request, res: Response) => {
    try {
      await db.execute(sql`SELECT 1`);
      res.status(200).json({
        status: 'ok',
        db: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        db: 'disconnected',
        message: error instanceof Error ? error.message : 'Помилка підключення до БД',
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get('/api/cities/search', async (req: Request, res: Response) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const items = await addressSearchService.searchCities(query);
    res.status(200).json({ query, items });
  });

  app.get('/api/addresses/search', async (req: Request, res: Response) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const rawCityId =
      typeof req.query.cityId === 'string'
        ? Number.parseInt(req.query.cityId, 10)
        : env.LOE_LVIV_CITY_ID;
    const cityId = Number.isInteger(rawCityId) && rawCityId > 0 ? rawCityId : env.LOE_LVIV_CITY_ID;

    if (query.length < 2) {
      res.status(200).json({ query, cityId, items: [] });
      return;
    }

    const items = await addressSearchService.search(query, cityId);
    res.status(200).json({ query, cityId, items });
  });

  app.get('/api/schedules/:groupId', async (req: Request, res: Response) => {
    const parsedGroup = groupIdSchema.safeParse(req.params.groupId);
    if (!parsedGroup.success) {
      res.status(400).json({
        error: 'Некоректний ідентифікатор групи. Допустимі значення: 1.1–6.2.',
      });
      return;
    }

    const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const schedule = await scheduleSyncService.getGroupSchedule(parsedGroup.data, { forceRefresh });
    res.status(200).json(schedule);
  });

  app.post('/api/subscriptions', async (req: Request, res: Response) => {
    const parsed = upsertSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Некоректні дані підписки',
        details: parsed.error.flatten(),
      });
      return;
    }

    const { expoPushToken, groupId, platform } = parsed.data;
    const now = new Date();

    await db
      .insert(pushSubscriptions)
      .values({
        expoPushToken,
        groupId,
        platform,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.expoPushToken,
        set: {
          groupId,
          platform,
          updatedAt: now,
        },
      });

    res.status(200).json({
      ok: true,
      groupId,
      platform,
      updatedAt: now.toISOString(),
    });
  });

  app.delete('/api/subscriptions', async (req: Request, res: Response) => {
    const rawToken =
      typeof req.body?.expoPushToken === 'string'
        ? req.body.expoPushToken
        : typeof req.query.expoPushToken === 'string'
          ? req.query.expoPushToken
          : undefined;

    const parsed = deleteSubscriptionSchema.safeParse({ expoPushToken: rawToken });
    if (!parsed.success) {
      res.status(400).json({
        error: 'Некоректний expoPushToken для відписки',
      });
      return;
    }

    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.expoPushToken, parsed.data.expoPushToken));

    res.status(200).json({ ok: true });
  });

  app.post('/api/cron/sync', async (req: Request, res: Response) => {
    if (!isCronSecretValid(req, env.CRON_SECRET)) {
      res.status(401).json({ error: 'Невірний секретний ключ синхронізації' });
      return;
    }

    const result = await scheduleSyncService.syncAllSchedules();
    res.status(200).json(result);
  });

  app.post('/api/debug/test-push', async (req: Request, res: Response) => {
    const allowed = env.NODE_ENV !== 'production' || isCronSecretValid(req, env.CRON_SECRET);
    if (!allowed) {
      res.status(403).json({ error: 'Доступ заборонено' });
      return;
    }

    const parsed = testPushSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Некоректні параметри тестового сповіщення',
        details: parsed.error.flatten(),
      });
      return;
    }

    const sent = await pushService.sendTestPush(parsed.data);
    res.status(200).json({ ok: true, sent });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Необроблена помилка сервера:', err);
    res.status(500).json({
      error: 'Внутрішня помилка сервера',
      message:
        env.NODE_ENV === 'production'
          ? 'Спробуйте повторити запит пізніше'
          : err instanceof Error
            ? err.message
            : 'Невідома помилка',
    });
  });

  return app;
}
