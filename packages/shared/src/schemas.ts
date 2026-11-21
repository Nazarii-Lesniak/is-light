import { z } from 'zod';

export const GROUP_IDS = [
  '1.1',
  '1.2',
  '2.1',
  '2.2',
  '3.1',
  '3.2',
  '4.1',
  '4.2',
  '5.1',
  '5.2',
  '6.1',
  '6.2',
] as const;

export type GroupId = (typeof GROUP_IDS)[number];

export const groupIdSchema = z.enum(GROUP_IDS);

export const SLOT_COUNT = 48;

export const SLOT_STATUSES = ['on', 'off', 'unknown'] as const;
export type SlotStatus = (typeof SLOT_STATUSES)[number];
export const slotStatusSchema = z.enum(SLOT_STATUSES);

export const HOUR_CELL_STATES = [
  'on',
  'off',
  'off_first_half',
  'off_second_half',
  'unknown',
] as const;
export type HourCellState = (typeof HOUR_CELL_STATES)[number];

export const THEME_IDS = ['light', 'midnight', 'graphite', 'ocean', 'cream'] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const themeIdSchema = z.enum(THEME_IDS);

export const LVIV_CITY_ID = 693;

export const dayScheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slots: z.array(slotStatusSchema).length(SLOT_COUNT),
  updatedAt: z.string(),
  sourceInfo: z.string().nullable().optional(),
  isPublished: z.boolean(),
});

export type DaySchedule = z.infer<typeof dayScheduleSchema>;

export const groupScheduleResponseSchema = z.object({
  groupId: groupIdSchema,
  today: dayScheduleSchema.nullable(),
  tomorrow: dayScheduleSchema.nullable(),
  updatedAt: z.string(),
});

export type GroupScheduleResponse = z.infer<typeof groupScheduleResponseSchema>;

export const cityItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  otgName: z.string().nullable().optional(),
});

export type CityItem = z.infer<typeof cityItemSchema>;

export const citySearchResponseSchema = z.object({
  query: z.string(),
  items: z.array(cityItemSchema),
});

export type CitySearchResponse = z.infer<typeof citySearchResponseSchema>;

export const addressSearchItemSchema = z.object({
  id: z.string(),
  cityId: z.number().int().positive().default(LVIV_CITY_ID),
  cityName: z.string().min(1).default('Львів'),
  streetId: z.number().int().positive(),
  streetName: z.string().min(1),
  buildingName: z.string().min(1),
  fullAddress: z.string().min(1),
  groupId: groupIdSchema,
});

export type AddressSearchItem = z.infer<typeof addressSearchItemSchema>;

export const addressSearchResponseSchema = z.object({
  query: z.string(),
  cityId: z.number().int().positive().optional(),
  items: z.array(addressSearchItemSchema),
});

export type AddressSearchResponse = z.infer<typeof addressSearchResponseSchema>;

export const pushPlatformSchema = z.enum(['android', 'ios']);
export type PushPlatform = z.infer<typeof pushPlatformSchema>;

export const upsertSubscriptionSchema = z.object({
  expoPushToken: z.string().min(10).max(255),
  groupId: groupIdSchema,
  platform: pushPlatformSchema,
});

export type UpsertSubscriptionInput = z.infer<typeof upsertSubscriptionSchema>;

export const deleteSubscriptionSchema = z.object({
  expoPushToken: z.string().min(10).max(255),
});

export type DeleteSubscriptionInput = z.infer<typeof deleteSubscriptionSchema>;

export const syncResultSchema = z.object({
  syncedAt: z.string(),
  updatedGroups: z.array(groupIdSchema),
  notificationsSent: z.number().int().nonnegative(),
  skippedBecauseInFlight: z.boolean(),
});

export type SyncResult = z.infer<typeof syncResultSchema>;

export const REMINDER_MINUTES_OPTIONS = [30, 25, 20, 15, 10, 5, 0] as const;
export type ReminderMinutes = (typeof REMINDER_MINUTES_OPTIONS)[number];
