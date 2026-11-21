import type { GroupId, SlotStatus } from '@is-light/shared';

export interface ExternalCity {
  cityId: number;
  name: string;
  otgName: string | null;
}

export interface ExternalStreet {
  streetId: number;
  cityId: number;
  name: string;
}

export interface ExternalBuilding {
  buildingName: string;
  groupId: GroupId;
}

export interface AddressSourceAdapter {
  fetchOblastCities(): Promise<ExternalCity[]>;
  fetchCityStreets(cityId: number): Promise<ExternalStreet[]>;
  fetchStreetBuildings(cityId: number, streetId: number): Promise<ExternalBuilding[]>;
}

export interface ParsedDaySchedules {
  date: string;
  sourceInfo: string | null;
  groups: Partial<Record<GroupId, SlotStatus[]>>;
}

export interface ExternalSchedulesPayload {
  today: ParsedDaySchedules | null;
  tomorrow: ParsedDaySchedules | null;
  fetchedAt: Date;
}

export interface ScheduleSourceAdapter {
  fetchSchedules(): Promise<ExternalSchedulesPayload>;
}
