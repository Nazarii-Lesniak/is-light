import type { GroupId, PushPlatform, SlotStatus } from '@is-light/shared';
import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export interface CachedStreetBuilding {
  buildingName: string;
  groupId: GroupId;
}

export const schedules = pgTable(
  'schedules',
  {
    id: serial('id').primaryKey(),
    groupId: text('group_id').$type<GroupId>().notNull(),
    date: text('date').notNull(),
    slots: jsonb('slots').$type<SlotStatus[]>().notNull(),
    sourceInfo: text('source_info'),
    contentHash: text('content_hash').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('schedules_group_date_uidx').on(table.groupId, table.date),
    index('schedules_date_idx').on(table.date),
  ],
);

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: serial('id').primaryKey(),
    expoPushToken: text('expo_push_token').notNull().unique(),
    groupId: text('group_id').$type<GroupId>().notNull(),
    platform: text('platform').$type<PushPlatform>().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('push_subscriptions_group_idx').on(table.groupId)],
);

export const streetsCache = pgTable(
  'streets_cache',
  {
    streetId: integer('street_id').primaryKey(),
    cityId: integer('city_id').default(693).notNull(),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    buildingsJson: jsonb('buildings_json').$type<CachedStreetBuilding[] | null>(),
    buildingsUpdatedAt: timestamp('buildings_updated_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('streets_cache_city_id_idx').on(table.cityId),
    index('streets_cache_normalized_name_idx').on(table.normalizedName),
  ],
);

export type ScheduleRow = typeof schedules.$inferSelect;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type StreetCacheRow = typeof streetsCache.$inferSelect;
