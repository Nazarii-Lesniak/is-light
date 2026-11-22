import { APP_THEMES, type AppTheme } from '@/shared/theme/themes';
import type {
  GroupId,
  GroupScheduleResponse,
  PushPlatform,
  ReminderMinutes,
  ThemeId,
} from '@is-light/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SavedLocation } from './types';

interface AppState {
  locations: SavedLocation[];
  primaryLocationId: string | null;
  schedulesByGroup: Partial<Record<GroupId, GroupScheduleResponse>>;
  reminderMinutes: ReminderMinutes;
  lastActiveReminderMinutes: Exclude<ReminderMinutes, 0>;
  themeId: ThemeId;
  expoPushToken: string | null;
  pushPlatform: PushPlatform | null;
  remotePushNotice: string | null;
  isOfflineCache: boolean;
  hasHydrated: boolean;

  addLocation: (location: SavedLocation, makePrimary: boolean) => void;
  removeLocation: (id: string) => {
    removedWasPrimary: boolean;
    nextPrimaryLocation: SavedLocation | null;
  };
  setPrimaryLocation: (id: string) => void;
  updateLocationLabel: (id: string, label: string | null) => void;
  setScheduleForGroup: (groupId: GroupId, schedule: GroupScheduleResponse) => void;
  setReminderMinutes: (minutes: ReminderMinutes) => void;
  toggleRemindersEnabled: (enabled: boolean) => void;
  setThemeId: (themeId: ThemeId) => void;
  setPushRegistration: (params: {
    token: string | null;
    platform: PushPlatform;
    notice: string | null;
  }) => void;
  setOfflineCache: (isOffline: boolean) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      locations: [],
      primaryLocationId: null,
      schedulesByGroup: {},
      reminderMinutes: 15,
      lastActiveReminderMinutes: 15,
      themeId: 'light',
      expoPushToken: null,
      pushPlatform: null,
      remotePushNotice: null,
      isOfflineCache: false,
      hasHydrated: false,

      addLocation: (location, makePrimary) => {
        set((state) => {
          const existing = state.locations.find(
            (item) =>
              item.id === location.id ||
              (item.streetId === location.streetId && item.buildingName === location.buildingName),
          );
          if (existing) {
            return {
              primaryLocationId: makePrimary ? existing.id : state.primaryLocationId,
            };
          }

          return {
            locations: [...state.locations, location],
            primaryLocationId: makePrimary ? location.id : state.primaryLocationId,
          };
        });
      },

      removeLocation: (id) => {
        const current = get();
        const removedWasPrimary = current.primaryLocationId === id;
        const remaining = current.locations.filter((item) => item.id !== id);
        const nextPrimaryLocation = removedWasPrimary
          ? (remaining[0] ?? null)
          : (remaining.find((item) => item.id === current.primaryLocationId) ?? null);

        set({
          locations: remaining,
          primaryLocationId: nextPrimaryLocation?.id ?? null,
        });

        return {
          removedWasPrimary,
          nextPrimaryLocation,
        };
      },

      setPrimaryLocation: (id) => {
        set((state) => {
          const exists = state.locations.some((item) => item.id === id);
          if (!exists) {
            return state;
          }
          return { primaryLocationId: id };
        });
      },

      updateLocationLabel: (id, label) => {
        const normalized = label?.trim() ? label.trim() : null;
        set((state) => ({
          locations: state.locations.map((item) =>
            item.id === id ? { ...item, label: normalized } : item,
          ),
        }));
      },

      setScheduleForGroup: (groupId, schedule) => {
        set((state) => ({
          schedulesByGroup: {
            ...state.schedulesByGroup,
            [groupId]: schedule,
          },
          isOfflineCache: false,
        }));
      },

      setReminderMinutes: (minutes) => {
        set((state) => ({
          reminderMinutes: minutes,
          lastActiveReminderMinutes: minutes !== 0 ? minutes : state.lastActiveReminderMinutes,
        }));
      },

      toggleRemindersEnabled: (enabled) => {
        set((state) => ({
          reminderMinutes: enabled ? state.lastActiveReminderMinutes : 0,
        }));
      },

      setThemeId: (themeId) => {
        set({ themeId });
      },

      setPushRegistration: ({ token, platform, notice }) => {
        set({
          expoPushToken: token,
          pushPlatform: platform,
          remotePushNotice: notice,
        });
      },

      setOfflineCache: (isOffline) => {
        set({ isOfflineCache: isOffline });
      },

      setHasHydrated: (hydrated) => {
        set({ hasHydrated: hydrated });
      },
    }),
    {
      name: 'is-light-lviv-storage-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        locations: state.locations,
        primaryLocationId: state.primaryLocationId,
        schedulesByGroup: state.schedulesByGroup,
        reminderMinutes: state.reminderMinutes,
        lastActiveReminderMinutes: state.lastActiveReminderMinutes,
        themeId: state.themeId,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          useAppStore.getState().setHasHydrated(true);
          return;
        }
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function selectPrimaryLocation(state: AppState): SavedLocation | null {
  if (!state.primaryLocationId) {
    return null;
  }
  return state.locations.find((item) => item.id === state.primaryLocationId) ?? null;
}

export function useAppTheme(): AppTheme {
  const themeId = useAppStore((s) => s.themeId);
  return APP_THEMES[themeId] ?? APP_THEMES.light;
}
