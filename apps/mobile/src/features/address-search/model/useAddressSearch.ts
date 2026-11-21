import { type AddressSearchItem, LVIV_CITY_ID } from '@is-light/shared';
import { useEffect, useState } from 'react';
import { searchLvivAddresses } from '../api/addressApi';

const DEBOUNCE_MS = 350;

export interface AddressSearchState {
  items: AddressSearchItem[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
}

export function useAddressSearch(query: string, cityId: number = LVIV_CITY_ID): AddressSearchState {
  const [items, setItems] = useState<AddressSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setItems([]);
      setIsLoading(false);
      setError(null);
      setHasSearched(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      searchLvivAddresses(trimmed, cityId, controller.signal)
        .then((res) => {
          if (controller.signal.aborted) {
            return;
          }
          setItems(res.items);
          setHasSearched(true);
          setIsLoading(false);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) {
            return;
          }
          setItems([]);
          setHasSearched(true);
          setIsLoading(false);
          setError(
            err instanceof Error
              ? err.message
              : 'Не вдалося виконати пошук. Перевірте підключення до інтернету.',
          );
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, cityId]);

  return { items, isLoading, error, hasSearched };
}
