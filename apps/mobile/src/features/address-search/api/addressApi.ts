import { apiRequest } from '@/shared/api/client';
import {
  type AddressSearchResponse,
  type CitySearchResponse,
  LVIV_CITY_ID,
  addressSearchResponseSchema,
  citySearchResponseSchema,
} from '@is-light/shared';

export async function searchOblastCities(
  query: string,
  signal?: AbortSignal,
): Promise<CitySearchResponse> {
  const data = await apiRequest<unknown>(
    `/api/cities/search?q=${encodeURIComponent(query.trim())}`,
    { signal },
  );
  return citySearchResponseSchema.parse(data);
}

export async function searchLvivAddresses(
  query: string,
  cityId: number = LVIV_CITY_ID,
  signal?: AbortSignal,
): Promise<AddressSearchResponse> {
  const data = await apiRequest<unknown>(
    `/api/addresses/search?q=${encodeURIComponent(query.trim())}&cityId=${cityId}`,
    { signal },
  );
  return addressSearchResponseSchema.parse(data);
}
