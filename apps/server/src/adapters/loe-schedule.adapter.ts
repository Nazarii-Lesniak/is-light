import {
  type GroupId,
  SLOT_COUNT,
  type SlotStatus,
  createSlots,
  normalizeGroupId,
} from '@is-light/shared';
import { z } from 'zod';
import type {
  ExternalSchedulesPayload,
  ParsedDaySchedules,
  ScheduleSourceAdapter,
} from './types.js';

const menuItemSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  rawHtml: z.string().nullable().optional(),
  rawMobileHtml: z.string().nullable().optional(),
});

const menusResponseSchema = z.object({
  'hydra:member': z.array(
    z.object({
      type: z.string().optional(),
      menuItems: z.array(menuItemSchema).default([]),
    }),
  ),
});

const DEFAULT_TODAY_MENU_ITEM_ID = 238;
const DEFAULT_TOMORROW_MENU_ITEM_ID = 256;

function htmlToPlainLines(rawHtml: string): string[] {
  const withNewlines = rawHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ndash;|&mdash;/gi, '-')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  return withNewlines
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
}

function timeToSlotIndex(hoursStr: string, minutesStr: string): number {
  const hours = Number.parseInt(hoursStr, 10);
  const minutes = Number.parseInt(minutesStr, 10);
  const raw = hours * 2 + Math.round(minutes / 30);
  return Math.max(0, Math.min(SLOT_COUNT, raw));
}

export function parseLoeScheduleHtml(
  rawHtml: string | null | undefined,
): ParsedDaySchedules | null {
  if (!rawHtml || rawHtml.trim().length === 0) {
    return null;
  }

  const lines = htmlToPlainLines(rawHtml);
  if (lines.length === 0) {
    return null;
  }

  let date: string | null = null;
  let sourceInfo: string | null = null;
  const groups: Partial<Record<GroupId, SlotStatus[]>> = {};

  for (const line of lines) {
    if (!date) {
      const dateMatch = line.match(
        /Графік\s+погодинних\s+відключень\s+на\s+(\d{2})\.(\d{2})\.(\d{4})/i,
      );
      if (dateMatch?.[1] && dateMatch[2] && dateMatch[3]) {
        date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        continue;
      }
    }

    if (!sourceInfo && /Інформація\s+станом\s+на/i.test(line)) {
      sourceInfo = line;
      if (!date) {
        const fallbackDateMatch = line.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (fallbackDateMatch?.[1] && fallbackDateMatch[2] && fallbackDateMatch[3]) {
          date = `${fallbackDateMatch[3]}-${fallbackDateMatch[2]}-${fallbackDateMatch[1]}`;
        }
      }
      continue;
    }

    const groupMatch = line.match(/Група\s+(\d\.\d)[:.\-–—]?\s*(.*)$/i);
    if (!groupMatch?.[1]) {
      continue;
    }

    const groupId = normalizeGroupId(groupMatch[1]);
    if (!groupId) {
      continue;
    }

    const body = groupMatch[2] ?? '';
    const slots = createSlots('on');

    const hasOutageKeyword = /немає|відключ|вимкн/i.test(body);
    if (hasOutageKeyword) {
      const rangeRegex = /(?:з\s*)?(\d{1,2}):(\d{2})\s*(?:до|-|–|—)\s*(\d{1,2}):(\d{2})/gi;
      let match = rangeRegex.exec(body);
      while (match !== null) {
        const startSlot = timeToSlotIndex(match[1] ?? '0', match[2] ?? '0');
        const rawEndSlot = timeToSlotIndex(match[3] ?? '0', match[4] ?? '0');
        const endSlot = rawEndSlot === 0 && startSlot > 0 ? SLOT_COUNT : rawEndSlot;

        for (let idx = startSlot; idx < endSlot; idx++) {
          slots[idx] = 'off';
        }
        match = rangeRegex.exec(body);
      }
    }

    groups[groupId] = slots;
  }

  if (!date || Object.keys(groups).length === 0) {
    return null;
  }

  return {
    date,
    sourceInfo,
    groups,
  };
}

export interface LoeScheduleAdapterConfig {
  baseUrl: string;
  timeoutMs?: number;
}

export class LoeScheduleAdapter implements ScheduleSourceAdapter {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private todayItemId: number = DEFAULT_TODAY_MENU_ITEM_ID;
  private tomorrowItemId: number = DEFAULT_TOMORROW_MENU_ITEM_ID;

  constructor(config: LoeScheduleAdapterConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs ?? 20_000;
  }

  private async fetchMenuItem(itemId: number): Promise<z.infer<typeof menuItemSchema> | null> {
    const url = `${this.baseUrl}/menu_items/${itemId}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/ld+json, application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      return null;
    }

    const json: unknown = await response.json();
    const parsed = menuItemSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  }

  private async fetchViaFullMenuFallback(): Promise<{
    todayItem: z.infer<typeof menuItemSchema> | null;
    tomorrowItem: z.infer<typeof menuItemSchema> | null;
  }> {
    const url = `${this.baseUrl}/menus?page=1&type=photo-grafic`;
    const response = await fetch(url, {
      headers: { Accept: 'application/ld+json, application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Помилка завантаження графіків Львівобленерго (HTTP ${response.status})`);
    }

    const json: unknown = await response.json();
    const parsed = menusResponseSchema.parse(json);
    const items = parsed['hydra:member'][0]?.menuItems ?? [];

    const todayItem = items.find((item) => item.name.toLowerCase() === 'today') ?? null;
    const tomorrowItem = items.find((item) => item.name.toLowerCase() === 'tomorrow') ?? null;

    if (todayItem?.id) {
      this.todayItemId = todayItem.id;
    }
    if (tomorrowItem?.id) {
      this.tomorrowItemId = tomorrowItem.id;
    }

    return { todayItem, tomorrowItem };
  }

  async fetchSchedules(): Promise<ExternalSchedulesPayload> {
    const fetchedAt = new Date();

    let [todayItem, tomorrowItem] = await Promise.all([
      this.fetchMenuItem(this.todayItemId).catch(() => null),
      this.fetchMenuItem(this.tomorrowItemId).catch(() => null),
    ]);

    const fastPathValid =
      todayItem?.name.toLowerCase() === 'today' && tomorrowItem?.name.toLowerCase() === 'tomorrow';

    if (!fastPathValid) {
      const fallback = await this.fetchViaFullMenuFallback();
      todayItem = fallback.todayItem;
      tomorrowItem = fallback.tomorrowItem;
    }

    const todayHtml = todayItem?.rawHtml || todayItem?.rawMobileHtml;
    const tomorrowHtml = tomorrowItem?.rawHtml || tomorrowItem?.rawMobileHtml;

    return {
      today: parseLoeScheduleHtml(todayHtml),
      tomorrow: parseLoeScheduleHtml(tomorrowHtml),
      fetchedAt,
    };
  }
}
