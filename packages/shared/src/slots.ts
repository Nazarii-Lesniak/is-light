import {
  type DaySchedule,
  GROUP_IDS,
  type GroupId,
  type HourCellState,
  SLOT_COUNT,
  type SlotStatus,
} from './schemas.js';

export const LVIV_TIMEZONE = 'Europe/Kyiv';

const GROUP_ID_SET: ReadonlySet<string> = new Set(GROUP_IDS);

export interface HourCell {
  hour: number;
  label: string;
  state: HourCellState;
  firstHalf: SlotStatus;
  secondHalf: SlotStatus;
}

export interface PowerStatusSummary {
  status: SlotStatus;
  nextChangeAt: Date | null;
  nextStatus: SlotStatus | null;
  msUntilChange: number | null;
}

export interface OutageTransition {
  startAt: Date;
  endAt: Date | null;
  date: string;
  startLabel: string;
  endLabel: string | null;
}

export interface KyivDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function normalizeGroupId(raw: string | null | undefined): GroupId | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (GROUP_ID_SET.has(trimmed)) {
    return trimmed as GroupId;
  }

  const dottedMatch = trimmed.match(/([1-6])\.([12])/);
  if (dottedMatch?.[1] && dottedMatch[2]) {
    const candidate = `${dottedMatch[1]}.${dottedMatch[2]}`;
    if (GROUP_ID_SET.has(candidate)) {
      return candidate as GroupId;
    }
  }

  const compactMatch = trimmed.match(/^([1-6])([12])$/);
  if (compactMatch?.[1] && compactMatch[2]) {
    const candidate = `${compactMatch[1]}.${compactMatch[2]}`;
    if (GROUP_ID_SET.has(candidate)) {
      return candidate as GroupId;
    }
  }

  return null;
}

export function createSlots(fill: SlotStatus = 'unknown'): SlotStatus[] {
  return Array.from({ length: SLOT_COUNT }, () => fill);
}

export function formatHourRange(hour: number): string {
  const start = String(hour).padStart(2, '0');
  const end = String(hour + 1).padStart(2, '0');
  return `${start}-${end}`;
}

export function formatSlotTime(slotIndex: number): string {
  const totalMinutes = slotIndex * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function slotsToHourCells(slots: readonly SlotStatus[]): HourCell[] {
  const cells: HourCell[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const firstHalf: SlotStatus = slots[hour * 2] ?? 'unknown';
    const secondHalf: SlotStatus = slots[hour * 2 + 1] ?? 'unknown';

    let state: HourCellState;
    if (firstHalf === 'unknown' && secondHalf === 'unknown') {
      state = 'unknown';
    } else if (firstHalf === 'off' && secondHalf === 'off') {
      state = 'off';
    } else if (firstHalf === 'on' && secondHalf === 'on') {
      state = 'on';
    } else if (firstHalf === 'off') {
      state = 'off_first_half';
    } else if (secondHalf === 'off') {
      state = 'off_second_half';
    } else {
      state = 'unknown';
    }

    cells.push({
      hour,
      label: formatHourRange(hour),
      state,
      firstHalf,
      secondHalf,
    });
  }

  return cells;
}

export function getKyivDateParts(date: Date): KyivDateParts {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: LVIV_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = Number.parseInt(part.value, 10);
    }
  }

  const rawHour = map.hour ?? 0;

  return {
    year: map.year ?? date.getUTCFullYear(),
    month: map.month ?? date.getUTCMonth() + 1,
    day: map.day ?? date.getUTCDate(),
    hour: rawHour === 24 ? 0 : rawHour,
    minute: map.minute ?? 0,
    second: map.second ?? 0,
  };
}

export function formatKyivDate(date: Date): string {
  const p = getKyivDateParts(date);
  return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [yStr, mStr, dStr] = dateStr.split('-');
  const y = Number.parseInt(yStr ?? '1970', 10);
  const m = Number.parseInt(mStr ?? '1', 10);
  const d = Number.parseInt(dStr ?? '1', 10);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return `${String(utc.getUTCFullYear()).padStart(4, '0')}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`;
}

export function formatKyivTime(dateOrIso: Date | string): string {
  const date = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }
  const p = getKyivDateParts(date);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

export function formatUkrainianDateLabel(dateStr: string): string {
  const [yStr, mStr, dStr] = dateStr.split('-');
  if (!yStr || !mStr || !dStr) {
    return dateStr;
  }
  return `${dStr}.${mStr}.${yStr}`;
}

export function getKyivSlotIndex(date: Date): number {
  const p = getKyivDateParts(date);
  return p.hour * 2 + (p.minute >= 30 ? 1 : 0);
}

export function getKyivCurrentHour(date: Date): number {
  return getKyivDateParts(date).hour;
}

/**
 * Converts a Kyiv local date string (YYYY-MM-DD) and half-hour slot index (0..48)
 * to an exact UTC Date instance, respecting EET (UTC+2) / EEST (UTC+3) DST offsets.
 */
export function kyivDateAndSlotToUtcDate(dateStr: string, slotIndex: number): Date {
  const dayOffset = Math.floor(slotIndex / SLOT_COUNT);
  const slotInDay = ((slotIndex % SLOT_COUNT) + SLOT_COUNT) % SLOT_COUNT;
  const targetDateStr = dayOffset === 0 ? dateStr : addDaysToDateString(dateStr, dayOffset);

  const [yStr, mStr, dStr] = targetDateStr.split('-');
  const year = Number.parseInt(yStr ?? '1970', 10);
  const month = Number.parseInt(mStr ?? '1', 10);
  const day = Number.parseInt(dStr ?? '1', 10);
  const hour = Math.floor(slotInDay / 2);
  const minute = (slotInDay % 2) * 30;

  // Start with UTC guess and adjust iteratively using Kyiv wall clock difference
  const desiredUtcWallMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let candidateMs = desiredUtcWallMs - 2 * 60 * 60 * 1000;

  for (let i = 0; i < 3; i++) {
    const parts = getKyivDateParts(new Date(candidateMs));
    const observedWallMs = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      0,
    );
    const diff = desiredUtcWallMs - observedWallMs;
    if (diff === 0) {
      break;
    }
    candidateMs += diff;
  }

  return new Date(candidateMs);
}

interface TimelineEntry {
  date: string;
  slotIndex: number;
  status: SlotStatus;
}

function buildTimeline(today: DaySchedule | null, tomorrow: DaySchedule | null): TimelineEntry[] {
  const timeline: TimelineEntry[] = [];

  if (today?.isPublished) {
    for (let i = 0; i < SLOT_COUNT; i++) {
      timeline.push({
        date: today.date,
        slotIndex: i,
        status: today.slots[i] ?? 'unknown',
      });
    }
  }

  if (tomorrow?.isPublished) {
    for (let i = 0; i < SLOT_COUNT; i++) {
      timeline.push({
        date: tomorrow.date,
        slotIndex: i,
        status: tomorrow.slots[i] ?? 'unknown',
      });
    }
  }

  return timeline;
}

export function getCurrentPowerStatus(
  today: DaySchedule | null,
  tomorrow: DaySchedule | null,
  now: Date = new Date(),
): PowerStatusSummary {
  if (!today?.isPublished) {
    return {
      status: 'unknown',
      nextChangeAt: null,
      nextStatus: null,
      msUntilChange: null,
    };
  }

  const todayKyiv = formatKyivDate(now);
  if (today.date !== todayKyiv) {
    return {
      status: 'unknown',
      nextChangeAt: null,
      nextStatus: null,
      msUntilChange: null,
    };
  }

  const currentSlot = getKyivSlotIndex(now);
  const currentStatus: SlotStatus = today.slots[currentSlot] ?? 'unknown';

  if (currentStatus === 'unknown') {
    return {
      status: 'unknown',
      nextChangeAt: null,
      nextStatus: null,
      msUntilChange: null,
    };
  }

  const timeline = buildTimeline(today, tomorrow);
  const startIdx = currentSlot;

  for (let i = startIdx + 1; i < timeline.length; i++) {
    const entry = timeline[i];
    if (!entry || entry.status === 'unknown') {
      break;
    }
    if (entry.status !== currentStatus) {
      const nextChangeAt = kyivDateAndSlotToUtcDate(entry.date, entry.slotIndex);
      const msUntilChange = Math.max(0, nextChangeAt.getTime() - now.getTime());
      return {
        status: currentStatus,
        nextChangeAt,
        nextStatus: entry.status,
        msUntilChange,
      };
    }
  }

  return {
    status: currentStatus,
    nextChangeAt: null,
    nextStatus: null,
    msUntilChange: null,
  };
}

export function getUpcomingOutageTransitions(
  today: DaySchedule | null,
  tomorrow: DaySchedule | null,
  now: Date = new Date(),
): OutageTransition[] {
  const timeline = buildTimeline(today, tomorrow);
  const transitions: OutageTransition[] = [];

  for (let i = 0; i < timeline.length; i++) {
    const current = timeline[i];
    if (!current || current.status !== 'off') {
      continue;
    }

    const prev = i > 0 ? timeline[i - 1] : null;
    const isStartOfOutage = !prev || prev.status !== 'off';
    if (!isStartOfOutage) {
      continue;
    }

    const startAt = kyivDateAndSlotToUtcDate(current.date, current.slotIndex);
    if (startAt.getTime() <= now.getTime()) {
      continue;
    }

    let endIndex = i + 1;
    while (endIndex < timeline.length && timeline[endIndex]?.status === 'off') {
      endIndex++;
    }

    let endAt: Date | null = null;
    let endLabel: string | null = null;
    const endEntry = timeline[endIndex];
    if (endEntry) {
      endAt = kyivDateAndSlotToUtcDate(endEntry.date, endEntry.slotIndex);
      endLabel = formatSlotTime(endEntry.slotIndex);
    } else {
      const lastOff = timeline[endIndex - 1];
      if (lastOff) {
        endAt = kyivDateAndSlotToUtcDate(lastOff.date, lastOff.slotIndex + 1);
        endLabel = formatSlotTime(lastOff.slotIndex + 1);
      }
    }

    transitions.push({
      startAt,
      endAt,
      date: current.date,
      startLabel: formatSlotTime(current.slotIndex),
      endLabel,
    });
  }

  return transitions;
}

export function formatCountdownUk(ms: number): string {
  if (ms <= 0) {
    return 'менше хвилини';
  }

  const totalMinutes = Math.ceil(ms / 60_000);
  if (totalMinutes < 1) {
    return 'менше хвилини';
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} хв`;
  }
  if (minutes === 0) {
    return `${hours} год`;
  }
  return `${hours} год ${minutes} хв`;
}
