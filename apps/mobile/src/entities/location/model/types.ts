import type { GroupId } from '@is-light/shared';

export interface SavedLocation {
  id: string;
  cityId?: number;
  cityName?: string;
  streetId: number;
  streetName: string;
  buildingName: string;
  fullAddress: string;
  groupId: GroupId;
  label: string | null;
  createdAt: string;
}

export function getLocationDisplayTitle(location: SavedLocation): string {
  return location.label?.trim() ? location.label.trim() : location.fullAddress;
}
