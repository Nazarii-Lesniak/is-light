import { createHash } from 'node:crypto';
import {
  type DaySchedule,
  GROUP_IDS,
  type GroupId,
  type GroupScheduleResponse,
  type SlotStatus,
  type SyncResult,
  addDaysToDateString,
  formatKyivDate,
} from '@is-light/shared';
import { and, eq, inArray } from 'drizzle-orm';
import type { ParsedDaySchedules, ScheduleSourceAdapter } from '../adapters/types.js';
import type { Database } from '../db/index.js';
import { schedules } from '../db/schema.js';
import type { PushService } from './push.service.js';

const AUTO_STALE_TTL_MS = 5 * 60_000;
const REFRESH_COOLDOWN_MS = 30_000;

export function computeScheduleHash(date: string, slots: readonly SlotStatus[]): string {
  return createHash('sha256').update(JSON.stringify({ date, slots })).digest('hex');
}

export class ScheduleSyncService {
  private inFlightSync: Promise<SyncResult> | null = null;
  private lastSyncedAtMs = 0;

  constructor(
    private readonly db: Database,
    private readonly scheduleAdapter: ScheduleSourceAdapter,
    private readonly pushService: PushService,
  ) {}

  async syncAllSchedules(): Promise<SyncResult> {
    if (this.inFlightSync) {
      return {
        syncedAt: new Date().toISOString(),
        updatedGroups: [],
        notificationsSent: 0,
        skippedBecauseInFlight: true,
      };
    }

    const promise = this.performSync().finally(() => {
      this.inFlightSync = null;
    });
    this.inFlightSync = promise;
    return promise;
  }

  private async ensureFreshSync(): Promise<void> {
    if (this.inFlightSync) {
      await this.inFlightSync;
      return;
    }
    await this.syncAllSchedules();
  }

  private async performSync(): Promise<SyncResult> {
    const payload = await this.scheduleAdapter.fetchSchedules();
    const daysToProcess: ParsedDaySchedules[] = [];

    if (payload.today) {
      daysToProcess.push(payload.today);
    }
    if (payload.tomorrow) {
      daysToProcess.push(payload.tomorrow);
    }

    const syncedAt = new Date();
    this.lastSyncedAtMs = syncedAt.getTime();

    if (daysToProcess.length === 0) {
      return {
        syncedAt: syncedAt.toISOString(),
        updatedGroups: [],
        notificationsSent: 0,
        skippedBecauseInFlight: false,
      };
    }

    const targetDates = daysToProcess.map((d) => d.date);
    const existingRows = await this.db
      .select()
      .from(schedules)
      .where(inArray(schedules.date, targetDates));

    const existingMap = new Map<string, { contentHash: string; sourceInfo: string | null }>();
    for (const row of existingRows) {
      existingMap.set(`${row.groupId}:${row.date}`, {
        contentHash: row.contentHash,
        sourceInfo: row.sourceInfo ?? null,
      });
    }

    const changedDatesByGroup = new Map<GroupId, string[]>();

    for (const day of daysToProcess) {
      for (const groupId of GROUP_IDS) {
        const slots = day.groups[groupId];
        if (!slots) {
          continue;
        }

        const newHash = computeScheduleHash(day.date, slots);
        const key = `${groupId}:${day.date}`;
        const prev = existingMap.get(key);
        const slotsChanged = prev?.contentHash !== newHash;
        const sourceInfoChanged = prev?.sourceInfo !== day.sourceInfo;

        if (!slotsChanged && !sourceInfoChanged) {
          continue;
        }

        await this.db
          .insert(schedules)
          .values({
            groupId,
            date: day.date,
            slots,
            sourceInfo: day.sourceInfo,
            contentHash: newHash,
            updatedAt: syncedAt,
          })
          .onConflictDoUpdate({
            target: [schedules.groupId, schedules.date],
            set: {
              slots,
              sourceInfo: day.sourceInfo,
              contentHash: newHash,
              updatedAt: syncedAt,
            },
          });

        if (slotsChanged) {
          const existingDates = changedDatesByGroup.get(groupId) ?? [];
          existingDates.push(day.date);
          changedDatesByGroup.set(groupId, existingDates);
        }
      }
    }

    const updatedGroups = Array.from(changedDatesByGroup.keys());
    let notificationsSent = 0;

    for (const [groupId, changedDates] of changedDatesByGroup.entries()) {
      notificationsSent += await this.pushService.notifyGroupScheduleUpdated({
        groupId,
        changedDates,
      });
    }

    return {
      syncedAt: syncedAt.toISOString(),
      updatedGroups,
      notificationsSent,
      skippedBecauseInFlight: false,
    };
  }

  async getGroupSchedule(
    groupId: GroupId,
    options: { forceRefresh?: boolean } = {},
  ): Promise<GroupScheduleResponse> {
    const now = new Date();
    const nowMs = now.getTime();
    const todayDate = formatKyivDate(now);
    const tomorrowDate = addDaysToDateString(todayDate, 1);

    let rows = await this.db
      .select()
      .from(schedules)
      .where(
        and(eq(schedules.groupId, groupId), inArray(schedules.date, [todayDate, tomorrowDate])),
      );

    const todayRowInitial = rows.find((r) => r.date === todayDate);
    const msSinceLastSync = nowMs - this.lastSyncedAtMs;
    const msSinceDbUpdate = todayRowInitial
      ? nowMs - todayRowInitial.updatedAt.getTime()
      : Number.POSITIVE_INFINITY;

    const shouldSync =
      !todayRowInitial ||
      (options.forceRefresh && msSinceLastSync >= REFRESH_COOLDOWN_MS) ||
      (msSinceLastSync >= AUTO_STALE_TTL_MS && msSinceDbUpdate >= AUTO_STALE_TTL_MS);

    if (shouldSync) {
      try {
        await this.ensureFreshSync();
        rows = await this.db
          .select()
          .from(schedules)
          .where(
            and(eq(schedules.groupId, groupId), inArray(schedules.date, [todayDate, tomorrowDate])),
          );
      } catch (error) {
        console.error('Не вдалося оновити графік з API Львівобленерго, повертаємо кеш БД:', error);
      }
    }

    const todayRow = rows.find((r) => r.date === todayDate);
    const tomorrowRow = rows.find((r) => r.date === tomorrowDate);

    const toDaySchedule = (row: typeof todayRow): DaySchedule | null => {
      if (!row) {
        return null;
      }
      return {
        date: row.date,
        slots: row.slots,
        updatedAt: row.updatedAt.toISOString(),
        sourceInfo: row.sourceInfo ?? null,
        isPublished: true,
      };
    };

    const latestUpdatedAt =
      [todayRow?.updatedAt, tomorrowRow?.updatedAt]
        .filter((d): d is Date => d instanceof Date)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? now;

    return {
      groupId,
      today: toDaySchedule(todayRow),
      tomorrow: toDaySchedule(tomorrowRow),
      updatedAt: latestUpdatedAt.toISOString(),
    };
  }
}
