import { selectPrimaryLocation, useAppStore, useAppTheme } from '@/entities/location/model/store';
import { fetchGroupSchedule } from '@/entities/schedule/api/scheduleApi';
import { CurrentStatusCard } from '@/entities/schedule/ui/CurrentStatusCard';
import { OutageGrid } from '@/entities/schedule/ui/OutageGrid';
import { LocationPickerModal } from '@/features/location-picker/ui/LocationPickerModal';
import { NotificationSettingsModal } from '@/features/notification-settings/ui/NotificationSettingsModal';
import { ThemePickerModal } from '@/features/theme-picker/ui/ThemePickerModal';
import { formatKyivDate, formatUkrainianDateLabel } from '@is-light/shared';
import { useRouter } from 'expo-router';
import {
  Bell,
  CalendarClock,
  ChevronDown,
  MapPin,
  Palette,
  Plus,
  RefreshCw,
  Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DayTab = 'today' | 'tomorrow';

export function HomeDashboard() {
  const router = useRouter();
  const theme = useAppTheme();
  const primaryLocation = useAppStore(selectPrimaryLocation);
  const locationsCount = useAppStore((s) => s.locations.length);
  const schedulesByGroup = useAppStore((s) => s.schedulesByGroup);
  const setScheduleForGroup = useAppStore((s) => s.setScheduleForGroup);
  const setOfflineCache = useAppStore((s) => s.setOfflineCache);
  const isOfflineCache = useAppStore((s) => s.isOfflineCache);
  const reminderMinutes = useAppStore((s) => s.reminderMinutes);

  const [selectedDay, setSelectedDay] = useState<DayTab>('today');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);

  const primaryGroupId = primaryLocation?.groupId ?? null;
  const currentSchedule = primaryGroupId ? (schedulesByGroup[primaryGroupId] ?? null) : null;
  const activeRequestRef = useRef<AbortController | null>(null);

  const loadSchedule = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!primaryGroupId) {
        return;
      }

      activeRequestRef.current?.abort();
      const controller = new AbortController();
      activeRequestRef.current = controller;

      if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }
      setFetchError(null);

      try {
        const data = await fetchGroupSchedule(primaryGroupId, {
          forceRefresh: mode === 'refresh',
          signal: controller.signal,
        });
        if (controller.signal.aborted) {
          return;
        }
        setScheduleForGroup(primaryGroupId, data);
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          return;
        }
        setOfflineCache(true);
        setFetchError(
          err instanceof Error
            ? err.message
            : 'Не вдалося оновити графік. Показано останні збережені дані.',
        );
      } finally {
        if (activeRequestRef.current === controller) {
          setIsRefreshing(false);
          setIsInitialLoading(false);
          activeRequestRef.current = null;
        }
      }
    },
    [primaryGroupId, setOfflineCache, setScheduleForGroup],
  );

  useEffect(() => {
    if (!primaryGroupId) {
      return;
    }
    void loadSchedule('initial');
    return () => {
      activeRequestRef.current?.abort();
    };
  }, [primaryGroupId, loadSchedule]);

  if (!primaryLocation) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }} edges={['top']}>
        <View className="flex-row justify-end px-4 pt-2">
          <Pressable
            onPress={() => setThemePickerVisible(true)}
            accessibilityLabel="Змінити тему"
            className="h-11 w-11 items-center justify-center rounded-2xl border"
            style={{ backgroundColor: theme.surface, borderColor: theme.border }}
          >
            <Palette size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center px-7 pb-24">
          <View
            className="h-20 w-20 items-center justify-center rounded-3xl"
            style={{ backgroundColor: theme.accentSoft }}
          >
            <MapPin size={36} color={theme.accent} />
          </View>
          <Text className="mt-5 text-center text-2xl font-bold" style={{ color: theme.text }}>
            Вітаємо в «Є Світло»
          </Text>
          <Text
            className="mt-2.5 text-center text-sm leading-5"
            style={{ color: theme.textSecondary }}
          >
            {locationsCount > 0
              ? 'Оберіть основну адресу у Львівській області, щоб бачити актуальний графік відключень та отримувати сповіщення.'
              : 'Додайте вашу адресу у Львові або Львівській області, щоб бачити погодинний графік відключень і отримувати нагадування.'}
          </Text>

          <Pressable
            onPress={() => router.push('/(tabs)/add')}
            className="mt-7 flex-row items-center gap-2 rounded-2xl px-6 py-4"
            style={{ backgroundColor: theme.accent }}
          >
            <Plus size={18} color={theme.accentOnSolid} />
            <Text className="text-base font-semibold" style={{ color: theme.accentOnSolid }}>
              Додати адресу
            </Text>
          </Pressable>

          {locationsCount > 0 ? (
            <Pressable
              onPress={() => setPickerVisible(true)}
              className="mt-3 rounded-2xl border px-6 py-3.5"
              style={{ backgroundColor: theme.surface, borderColor: theme.border }}
            >
              <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                Обрати зі збережених адрес
              </Text>
            </Pressable>
          ) : null}
        </View>

        <LocationPickerModal visible={pickerVisible} onClose={() => setPickerVisible(false)} />
        <ThemePickerModal
          visible={themePickerVisible}
          onClose={() => setThemePickerVisible(false)}
        />
      </SafeAreaView>
    );
  }

  const todayKyivDate = formatKyivDate(new Date());
  const rawToday = currentSchedule?.today ?? null;
  const rawTomorrow = currentSchedule?.tomorrow ?? null;
  const rolledOverFromCache =
    rawToday?.date !== todayKyivDate && rawTomorrow?.date === todayKyivDate;
  const todaySchedule = rolledOverFromCache ? rawTomorrow : rawToday;
  const tomorrowSchedule = rolledOverFromCache ? null : rawTomorrow;
  const activeDaySchedule = selectedDay === 'today' ? todaySchedule : tomorrowSchedule;
  const hasActiveSchedule = Boolean(
    activeDaySchedule?.isPublished && activeDaySchedule.slots.length === 48,
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingTop: 8,
          paddingBottom: 108,
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadSchedule('refresh');
            }}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
      >
        <View className="flex-row items-center justify-between gap-2">
          <Pressable
            onPress={() => setPickerVisible(true)}
            className="flex-1 flex-row items-center rounded-2xl border px-3 py-2"
            style={{ backgroundColor: theme.surface, borderColor: theme.border }}
          >
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-sm font-bold" style={{ color: theme.text }} numberOfLines={1}>
                  {primaryLocation.label || primaryLocation.fullAddress}
                </Text>
                <View
                  className="rounded-md px-2 py-0.5"
                  style={{ backgroundColor: theme.accentSoft }}
                >
                  <Text className="text-[11px] font-bold" style={{ color: theme.accentText }}>
                    Група {primaryLocation.groupId}
                  </Text>
                </View>
              </View>
              {primaryLocation.label ? (
                <Text
                  className="mt-0.5 text-xs"
                  style={{ color: theme.textMuted }}
                  numberOfLines={1}
                >
                  {primaryLocation.fullAddress}
                </Text>
              ) : null}
            </View>

            <ChevronDown size={17} color={theme.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => setThemePickerVisible(true)}
            accessibilityLabel="Змінити тему"
            className="h-11 w-11 items-center justify-center rounded-2xl border"
            style={{ backgroundColor: theme.surface, borderColor: theme.border }}
          >
            <Palette size={19} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => setSettingsVisible(true)}
            accessibilityLabel="Налаштування сповіщень"
            className="relative h-11 w-11 items-center justify-center rounded-2xl border"
            style={{ backgroundColor: theme.surface, borderColor: theme.border }}
          >
            <Bell size={19} color={theme.textSecondary} />
            {reminderMinutes > 0 ? (
              <View
                className="absolute right-2 top-2 h-2 w-2 rounded-full"
                style={{ backgroundColor: theme.accent }}
              />
            ) : null}
          </Pressable>
        </View>

        <CurrentStatusCard
          today={todaySchedule}
          tomorrow={tomorrowSchedule}
          updatedAt={currentSchedule?.updatedAt ?? null}
          isOffline={isOfflineCache}
        />

        {fetchError ? (
          <View
            className="flex-row items-center justify-between rounded-xl border px-3 py-2"
            style={{ backgroundColor: theme.warningBg, borderColor: theme.warningBorder }}
          >
            <Text
              className="flex-1 pr-2 text-xs"
              style={{ color: theme.warningText }}
              numberOfLines={2}
            >
              {fetchError}
            </Text>
            <Pressable
              onPress={() => {
                void loadSchedule('refresh');
              }}
              className="flex-row items-center gap-1 rounded-lg px-2 py-1"
              style={{ backgroundColor: theme.surfaceMuted }}
            >
              <RefreshCw size={12} color={theme.warningText} />
              <Text className="text-xs font-semibold" style={{ color: theme.warningText }}>
                Ще раз
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View className="flex-row rounded-xl p-1" style={{ backgroundColor: theme.segmentTrack }}>
          <Pressable
            onPress={() => setSelectedDay('today')}
            className="flex-1 items-center rounded-lg border py-1.5"
            style={{
              backgroundColor: selectedDay === 'today' ? theme.segmentActiveBg : 'transparent',
              borderColor: selectedDay === 'today' ? theme.segmentActiveBorder : 'transparent',
            }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: selectedDay === 'today' ? theme.text : theme.textMuted }}
            >
              Сьогодні
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedDay('tomorrow')}
            className="flex-1 items-center rounded-lg border py-1.5"
            style={{
              backgroundColor: selectedDay === 'tomorrow' ? theme.segmentActiveBg : 'transparent',
              borderColor: selectedDay === 'tomorrow' ? theme.segmentActiveBorder : 'transparent',
            }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: selectedDay === 'tomorrow' ? theme.text : theme.textMuted }}
            >
              Завтра
            </Text>
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between px-1">
          <Text className="text-xs font-bold" style={{ color: theme.text }}>
            {selectedDay === 'today' ? 'Графік на сьогодні' : 'Графік на завтра'}
            {activeDaySchedule?.date
              ? ` (${formatUkrainianDateLabel(activeDaySchedule.date)})`
              : ''}
          </Text>
          {isInitialLoading && !currentSchedule ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : hasActiveSchedule ? (
            <Text className="text-[11px]" style={{ color: theme.textMuted }}>
              Натисніть на годину для деталей
            </Text>
          ) : null}
        </View>

        {hasActiveSchedule && activeDaySchedule ? (
          <View key={`grid-${selectedDay}`}>
            <OutageGrid
              slots={activeDaySchedule.slots}
              highlightCurrentHour={selectedDay === 'today'}
            />
          </View>
        ) : selectedDay === 'tomorrow' ? (
          <View
            key="tomorrow-empty"
            className="items-center rounded-2xl border px-6 py-8"
            style={{ backgroundColor: theme.surface, borderColor: theme.border }}
          >
            <View
              className="h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: theme.surfaceMuted }}
            >
              <CalendarClock size={24} color={theme.textMuted} />
            </View>
            <Text className="mt-3 text-center text-base font-bold" style={{ color: theme.text }}>
              Графік на завтра буде пізніше
            </Text>
            <Text
              className="mt-1.5 text-center text-xs leading-5"
              style={{ color: theme.textMuted }}
            >
              Львівобленерго ще не опублікувало графік на наступну добу. Потягніть вниз для
              перевірки або дочекайтесь сповіщення.
            </Text>
          </View>
        ) : (
          <View
            key="today-no-schedule"
            className="items-center rounded-2xl border px-6 py-8"
            style={{ backgroundColor: theme.onBg, borderColor: theme.onBorder }}
          >
            <View
              className="h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: theme.onHalfBg }}
            >
              <Zap size={24} color={theme.onIcon} />
            </View>
            <Text className="mt-3 text-center text-lg font-bold" style={{ color: theme.onText }}>
              Є світло
            </Text>
            <Text className="mt-1 text-center text-xs leading-5" style={{ color: theme.onText }}>
              Графік відключень на сьогодні наразі відсутній — електроенергія подається без
              обмежень.
            </Text>
          </View>
        )}
      </ScrollView>

      <LocationPickerModal visible={pickerVisible} onClose={() => setPickerVisible(false)} />

      <NotificationSettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />

      <ThemePickerModal visible={themePickerVisible} onClose={() => setThemePickerVisible(false)} />
    </SafeAreaView>
  );
}
