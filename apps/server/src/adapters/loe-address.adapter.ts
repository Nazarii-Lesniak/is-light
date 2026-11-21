import { normalizeGroupId } from '@is-light/shared';
import { z } from 'zod';
import type {
  AddressSourceAdapter,
  ExternalBuilding,
  ExternalCity,
  ExternalStreet,
} from './types.js';

const pwCitySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().nullable().optional(),
  otg: z
    .object({
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const pwCitiesResponseSchema = z.object({
  'hydra:member': z.array(pwCitySchema),
});

const pwStreetSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().nullable().optional(),
});

const pwStreetsResponseSchema = z.object({
  'hydra:member': z.array(pwStreetSchema),
});

const pwAccountSchema = z.object({
  buildingName: z.string().nullable().optional(),
  chergGpv: z.string().nullable().optional(),
});

const pwAccountsResponseSchema = z.object({
  'hydra:member': z.array(pwAccountSchema),
});

export interface LoeAddressAdapterConfig {
  baseUrl: string;
  timeoutMs?: number;
}

export class LoeAddressAdapter implements AddressSourceAdapter {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: LoeAddressAdapterConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs ?? 20_000;
  }

  async fetchOblastCities(): Promise<ExternalCity[]> {
    const url = `${this.baseUrl}/pw_cities?pagination=false`;
    const response = await fetch(url, {
      headers: { Accept: 'application/ld+json, application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(
        `Помилка завантаження населених пунктів Львівської області (HTTP ${response.status})`,
      );
    }

    const json: unknown = await response.json();
    const parsed = pwCitiesResponseSchema.parse(json);

    return parsed['hydra:member']
      .map((item) => ({
        cityId: item.id,
        name: (item.name ?? '').trim(),
        otgName: item.otg?.name?.trim() || null,
      }))
      .filter((item) => item.name.length > 0);
  }

  async fetchCityStreets(cityId: number): Promise<ExternalStreet[]> {
    const url = `${this.baseUrl}/pw_streets?pagination=false&city.id=${cityId}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/ld+json, application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(
        `Помилка завантаження вулиць для населеного пункту #${cityId} (HTTP ${response.status})`,
      );
    }

    const json: unknown = await response.json();
    const parsed = pwStreetsResponseSchema.parse(json);

    return parsed['hydra:member']
      .map((item) => ({
        streetId: item.id,
        cityId,
        name: (item.name ?? '').trim(),
      }))
      .filter((item) => item.name.length > 0);
  }

  async fetchStreetBuildings(cityId: number, streetId: number): Promise<ExternalBuilding[]> {
    const url = `${this.baseUrl}/pw_accounts?pagination=false&city.id=${cityId}&street.id=${streetId}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/ld+json, application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(
        `Помилка завантаження будинків для вулиці #${streetId} (HTTP ${response.status})`,
      );
    }

    const json: unknown = await response.json();
    const parsed = pwAccountsResponseSchema.parse(json);

    const buildingsMap = new Map<string, ExternalBuilding>();

    for (const account of parsed['hydra:member']) {
      const buildingName = account.buildingName?.trim();
      if (!buildingName) {
        continue;
      }

      const groupId = normalizeGroupId(account.chergGpv);
      if (!groupId) {
        continue;
      }

      if (!buildingsMap.has(buildingName)) {
        buildingsMap.set(buildingName, { buildingName, groupId });
      }
    }

    return Array.from(buildingsMap.values()).sort((a, b) =>
      a.buildingName.localeCompare(b.buildingName, 'uk', { numeric: true }),
    );
  }
}
