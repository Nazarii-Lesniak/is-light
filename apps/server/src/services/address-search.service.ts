import { type AddressSearchItem, type CityItem, LVIV_CITY_ID } from '@is-light/shared';
import { eq, sql } from 'drizzle-orm';
import type {
  AddressSourceAdapter,
  ExternalBuilding,
  ExternalCity,
  ExternalStreet,
} from '../adapters/types.js';
import type { Database } from '../db/index.js';
import { streetsCache } from '../db/schema.js';

const CITIES_TTL_MS = 24 * 60 * 60 * 1000;
const STREETS_TTL_MS = 24 * 60 * 60 * 1000;
const BUILDINGS_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_RESULTS = 20;
const MAX_CITY_RESULTS = 25;

// Популярні населені пункти Львівської області для швидкого вибору
const POPULAR_CITY_IDS = [693, 65, 63, 1460, 2686, 1176, 1174, 789] as const;

const LATIN_TO_CYRILLIC: Readonly<Record<string, string>> = {
  a: 'а',
  b: 'б',
  v: 'в',
  g: 'г',
  d: 'д',
  e: 'е',
  k: 'к',
  m: 'м',
  o: 'о',
  p: 'р',
  c: 'с',
  t: 'т',
  x: 'х',
};

export interface ParsedAddressQuery {
  streetQuery: string;
  buildingQuery: string;
}

export function normalizeUkrainianText(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’ʼ`]/g, '')
    .replace(/ё/g, 'е')
    .replace(/[^а-яіїєґa-z0-9/\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeBuildingToken(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\s\-–—]+/g, '')
    .replace(/[abvgdekmpctxo]/g, (char) => LATIN_TO_CYRILLIC[char] ?? char)
    .trim();
}

export function parseAddressQuery(rawQuery: string): ParsedAddressQuery {
  const cleaned = rawQuery
    .trim()
    .replace(
      /^(?:вул\.?|вулиця|просп\.?|пр-т\.?|проспект|пл\.?|площа|бульв\.?|бульвар|пров\.?|провулок)\s+/i,
      '',
    )
    .replace(/[,;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return { streetQuery: '', buildingQuery: '' };
  }

  const buildingMatch = cleaned.match(/^(.*?)\s+(\d+[а-яіїєґa-z0-9/\-]*)$/i);
  if (buildingMatch?.[1] && buildingMatch[2]) {
    return {
      streetQuery: normalizeUkrainianText(buildingMatch[1]),
      buildingQuery: buildingMatch[2].trim(),
    };
  }

  return {
    streetQuery: normalizeUkrainianText(cleaned),
    buildingQuery: '',
  };
}

export function formatLvivAddress(
  streetName: string,
  buildingName: string,
  cityName?: string,
): string {
  const hasPrefix = /^(?:вул\.|просп\.|пл\.|бульв\.|пров\.|наб\.|дорога)/i.test(streetName);
  const streetPart = `${hasPrefix ? '' : 'вул. '}${streetName}, ${buildingName}`;
  if (cityName && cityName.trim().toLowerCase() !== 'львів') {
    return `${cityName.trim()}, ${streetPart}`;
  }
  return streetPart;
}

interface CachedCityEntry {
  cityId: number;
  name: string;
  otgName: string | null;
  normalizedName: string;
}

interface CachedStreetEntry {
  streetId: number;
  cityId: number;
  name: string;
  normalizedName: string;
}

interface CachedCityStreets {
  streets: CachedStreetEntry[];
  loadedAt: number;
}

interface CachedBuildingsEntry {
  buildings: ExternalBuilding[];
  loadedAt: number;
}

export class AddressSearchService {
  private citiesMemory: CachedCityEntry[] | null = null;
  private citiesLoadedAt = 0;
  private citiesInFlight: Promise<CachedCityEntry[]> | null = null;

  private readonly streetsMemoryByCity = new Map<number, CachedCityStreets>();
  private readonly streetsInFlightByCity = new Map<number, Promise<CachedStreetEntry[]>>();

  private readonly buildingsMemory = new Map<string, CachedBuildingsEntry>();
  private readonly buildingsInFlight = new Map<string, Promise<ExternalBuilding[]>>();

  constructor(
    private readonly db: Database,
    private readonly adapter: AddressSourceAdapter,
  ) {}

  private async ensureCitiesLoaded(): Promise<CachedCityEntry[]> {
    const now = Date.now();
    if (this.citiesMemory && now - this.citiesLoadedAt < CITIES_TTL_MS) {
      return this.citiesMemory;
    }

    if (this.citiesInFlight) {
      return this.citiesInFlight;
    }

    this.citiesInFlight = this.adapter
      .fetchOblastCities()
      .then((externalCities: ExternalCity[]) => {
        const entries: CachedCityEntry[] = externalCities.map((c) => ({
          cityId: c.cityId,
          name: c.name,
          otgName: c.otgName,
          normalizedName: normalizeUkrainianText(c.name),
        }));
        this.citiesMemory = entries;
        this.citiesLoadedAt = Date.now();
        return entries;
      })
      .finally(() => {
        this.citiesInFlight = null;
      });

    return this.citiesInFlight;
  }

  async searchCities(rawQuery: string): Promise<CityItem[]> {
    const cities = await this.ensureCitiesLoaded();
    const normQuery = normalizeUkrainianText(rawQuery);

    if (!normQuery) {
      const byId = new Map(cities.map((c) => [c.cityId, c]));
      const popular: CityItem[] = [];
      for (const id of POPULAR_CITY_IDS) {
        const found = byId.get(id);
        if (found) {
          popular.push({ id: found.cityId, name: found.name, otgName: found.otgName });
        }
      }
      return popular;
    }

    const scored: Array<{ city: CachedCityEntry; score: number }> = [];
    for (const city of cities) {
      if (!city.normalizedName.includes(normQuery)) {
        continue;
      }

      let score = 100;
      if (city.normalizedName === normQuery) {
        score = 1000;
      } else if (city.normalizedName.startsWith(normQuery)) {
        score = 700 - Math.min(200, city.normalizedName.length - normQuery.length);
      }
      if (city.cityId === LVIV_CITY_ID) {
        score += 150;
      } else if (POPULAR_CITY_IDS.includes(city.cityId as (typeof POPULAR_CITY_IDS)[number])) {
        score += 60;
      }

      scored.push({ city, score });
    }

    scored.sort((a, b) => b.score - a.score || a.city.name.localeCompare(b.city.name, 'uk'));

    return scored.slice(0, MAX_CITY_RESULTS).map(({ city }) => ({
      id: city.cityId,
      name: city.name,
      otgName: city.otgName,
    }));
  }

  private async resolveCityName(cityId: number): Promise<string> {
    if (cityId === LVIV_CITY_ID) {
      return 'Львів';
    }
    try {
      const cities = await this.ensureCitiesLoaded();
      return cities.find((c) => c.cityId === cityId)?.name ?? 'Львівська область';
    } catch {
      return 'Львівська область';
    }
  }

  private async ensureCityStreetsLoaded(cityId: number): Promise<CachedStreetEntry[]> {
    const now = Date.now();
    const mem = this.streetsMemoryByCity.get(cityId);
    if (mem && now - mem.loadedAt < STREETS_TTL_MS) {
      return mem.streets;
    }

    const existing = this.streetsInFlightByCity.get(cityId);
    if (existing) {
      return existing;
    }

    const promise = this.loadCityStreetsInternal(cityId).finally(() => {
      this.streetsInFlightByCity.delete(cityId);
    });
    this.streetsInFlightByCity.set(cityId, promise);
    return promise;
  }

  private async loadCityStreetsInternal(cityId: number): Promise<CachedStreetEntry[]> {
    const now = Date.now();

    try {
      const dbRows = await this.db
        .select({
          streetId: streetsCache.streetId,
          cityId: streetsCache.cityId,
          name: streetsCache.name,
          normalizedName: streetsCache.normalizedName,
          updatedAt: streetsCache.updatedAt,
        })
        .from(streetsCache)
        .where(eq(streetsCache.cityId, cityId));

      const newestRow = dbRows[0];
      if (dbRows.length > 0 && newestRow && now - newestRow.updatedAt.getTime() < STREETS_TTL_MS) {
        const entries: CachedStreetEntry[] = dbRows.map((row) => ({
          streetId: row.streetId,
          cityId: row.cityId,
          name: row.name,
          normalizedName: row.normalizedName,
        }));
        this.streetsMemoryByCity.set(cityId, { streets: entries, loadedAt: now });
        return entries;
      }
    } catch {
      // Fallback to live adapter
    }

    const externalStreets: ExternalStreet[] = await this.adapter.fetchCityStreets(cityId);
    const entries: CachedStreetEntry[] = externalStreets.map((street) => ({
      streetId: street.streetId,
      cityId,
      name: street.name,
      normalizedName: normalizeUkrainianText(street.name),
    }));

    this.streetsMemoryByCity.set(cityId, { streets: entries, loadedAt: now });
    this.persistStreetsCache(entries).catch(() => {});

    return entries;
  }

  private async persistStreetsCache(entries: CachedStreetEntry[]): Promise<void> {
    const chunkSize = 250;
    const now = new Date();

    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, i + chunkSize);
      await this.db
        .insert(streetsCache)
        .values(
          chunk.map((item) => ({
            streetId: item.streetId,
            cityId: item.cityId,
            name: item.name,
            normalizedName: item.normalizedName,
            updatedAt: now,
          })),
        )
        .onConflictDoUpdate({
          target: streetsCache.streetId,
          set: {
            cityId: sql`excluded.city_id`,
            name: sql`excluded.name`,
            normalizedName: sql`excluded.normalized_name`,
            updatedAt: now,
          },
        });
    }
  }

  private async getStreetBuildings(cityId: number, streetId: number): Promise<ExternalBuilding[]> {
    const cacheKey = `${cityId}:${streetId}`;
    const now = Date.now();
    const mem = this.buildingsMemory.get(cacheKey);
    if (mem && now - mem.loadedAt < BUILDINGS_TTL_MS) {
      return mem.buildings;
    }

    const existingPromise = this.buildingsInFlight.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    const promise = this.loadStreetBuildingsInternal(cityId, streetId).finally(() => {
      this.buildingsInFlight.delete(cacheKey);
    });
    this.buildingsInFlight.set(cacheKey, promise);
    return promise;
  }

  private async loadStreetBuildingsInternal(
    cityId: number,
    streetId: number,
  ): Promise<ExternalBuilding[]> {
    const cacheKey = `${cityId}:${streetId}`;
    const now = Date.now();

    try {
      const [row] = await this.db
        .select({
          buildingsJson: streetsCache.buildingsJson,
          buildingsUpdatedAt: streetsCache.buildingsUpdatedAt,
        })
        .from(streetsCache)
        .where(eq(streetsCache.streetId, streetId))
        .limit(1);

      if (
        row?.buildingsJson &&
        row.buildingsUpdatedAt &&
        now - row.buildingsUpdatedAt.getTime() < BUILDINGS_TTL_MS
      ) {
        this.buildingsMemory.set(cacheKey, {
          buildings: row.buildingsJson,
          loadedAt: now,
        });
        return row.buildingsJson;
      }
    } catch {
      // Fallback to live adapter
    }

    const buildings = await this.adapter.fetchStreetBuildings(cityId, streetId);
    this.buildingsMemory.set(cacheKey, { buildings, loadedAt: now });

    this.db
      .update(streetsCache)
      .set({
        buildingsJson: buildings,
        buildingsUpdatedAt: new Date(now),
      })
      .where(eq(streetsCache.streetId, streetId))
      .catch(() => {});

    return buildings;
  }

  private rankStreets(
    streets: readonly CachedStreetEntry[],
    streetQuery: string,
  ): CachedStreetEntry[] {
    if (streetQuery.length < 2) {
      return [];
    }

    const tokens = streetQuery.split(' ').filter((t) => t.length > 0);
    const scored: Array<{ street: CachedStreetEntry; score: number }> = [];

    for (const street of streets) {
      const target = street.normalizedName;
      if (!tokens.every((token) => target.includes(token))) {
        continue;
      }

      let score = 0;
      if (target === streetQuery) {
        score = 1000;
      } else if (target.startsWith(streetQuery)) {
        score = 700 - Math.min(200, target.length - streetQuery.length);
      } else {
        const words = target.split(/[\s\-]+/);
        const wordStartMatch = words.some((word) => word.startsWith(tokens[0] ?? ''));
        score = wordStartMatch ? 400 : 150;
      }

      if (!streetQuery.includes('-') && street.name.includes('-')) {
        score -= 80;
      }

      scored.push({ street, score });
    }

    scored.sort((a, b) => b.score - a.score || a.street.name.localeCompare(b.street.name, 'uk'));
    return scored.map((item) => item.street);
  }

  private scoreBuilding(buildingName: string, buildingQuery: string): number {
    if (!buildingQuery) {
      return 100;
    }

    const normBuilding = normalizeBuildingToken(buildingName);
    const normQuery = normalizeBuildingToken(buildingQuery);

    if (normBuilding === normQuery) {
      return 1000;
    }
    if (normBuilding.startsWith(normQuery)) {
      return 700 - Math.min(200, normBuilding.length - normQuery.length);
    }
    if (normBuilding.includes(normQuery)) {
      return 300;
    }

    return 0;
  }

  async search(rawQuery: string, cityId: number = LVIV_CITY_ID): Promise<AddressSearchItem[]> {
    const { streetQuery, buildingQuery } = parseAddressQuery(rawQuery);
    if (streetQuery.length < 2) {
      return [];
    }

    const [streets, cityName] = await Promise.all([
      this.ensureCityStreetsLoaded(cityId),
      this.resolveCityName(cityId),
    ]);

    const candidateStreets = this.rankStreets(streets, streetQuery).slice(0, buildingQuery ? 4 : 2);

    if (candidateStreets.length === 0) {
      return [];
    }

    const streetsWithBuildings = await Promise.all(
      candidateStreets.map(async (street) => {
        try {
          const buildings = await this.getStreetBuildings(cityId, street.streetId);
          return { street, buildings };
        } catch {
          return { street, buildings: [] as ExternalBuilding[] };
        }
      }),
    );

    const results: Array<{ item: AddressSearchItem; score: number }> = [];

    for (let sIdx = 0; sIdx < streetsWithBuildings.length; sIdx++) {
      const entry = streetsWithBuildings[sIdx];
      if (!entry) {
        continue;
      }
      const streetBonus = (candidateStreets.length - sIdx) * 100;

      for (const building of entry.buildings) {
        const bScore = this.scoreBuilding(building.buildingName, buildingQuery);
        if (bScore <= 0) {
          continue;
        }

        const fullAddress = formatLvivAddress(entry.street.name, building.buildingName, cityName);
        results.push({
          score: bScore + streetBonus,
          item: {
            id: `${cityId}:${entry.street.streetId}:${building.buildingName}`,
            cityId,
            cityName,
            streetId: entry.street.streetId,
            streetName: entry.street.name,
            buildingName: building.buildingName,
            fullAddress,
            groupId: building.groupId,
          },
        });
      }
    }

    results.sort(
      (a, b) =>
        b.score - a.score ||
        a.item.streetName.localeCompare(b.item.streetName, 'uk') ||
        a.item.buildingName.localeCompare(b.item.buildingName, 'uk', { numeric: true }),
    );

    return results.slice(0, MAX_RESULTS).map((r) => r.item);
  }
}
