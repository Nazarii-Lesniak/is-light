import { selectPrimaryLocation, useAppStore, useAppTheme } from '@/entities/location/model/store';
import { fetchGroupSchedule } from '@/entities/schedule/api/scheduleApi';
import { CurrentStatusCard } from '@/entities/schedule/ui/CurrentStatusCard';
import { OutageGrid } from '@/entities/schedule/ui/OutageGrid';
import { LocationPickerModal } from '@/features/location-picker/ui/LocationPickerModal';
import { NotificationSettingsModal } from '@/features/notification-settings/ui/NotificationSettingsModal';
import { ThemePickerModal } from '@/features/theme-picker/ui/ThemePickerModal';
import {
  CONTINUOUS_CORNER,
  LAYOUT,
  MOTION,
  RADII,
  SPACING,
  TYPOGRAPHY,
  getElevation,
} from '@/shared/theme/tokens';
import { GlassBackdrop } from '@/shared/ui/GlassBackdrop';
import { InteractiveSurface } from '@/shared/ui/InteractiveSurface';
import { type SegmentOption, SegmentedControl } from '@/shared/ui/SegmentedControl';
import { formatKyivDate, formatUkrainianDateLabel } from '@is-light/shared';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  ChevronDown,
  MapPin,
  Palette,
  Plus,
  RefreshCw,
  Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DayTab = 'today' | 'tomorrow';

export function HomeDashboard() {
  const router = useRouter();
  const theme = useAppTheme();
  const elevation = getElevation(theme);
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

  const dayTransition = useRef(new Animated.Value(1)).current;
  const prevDayRef = useRef<DayTab>(selectedDay);

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

  useEffect(() => {
    if (prevDayRef.current === selectedDay) {
      return;
    }
    prevDayRef.current = selectedDay;
    dayTransition.setValue(0);
    Animated.timing(dayTransition, {
      toValue: 1,
      duration: MOTION.durationNormal,
      useNativeDriver: true,
    }).start();
  }, [selectedDay, dayTransition]);

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
  const isTomorrowPublished = Boolean(
    tomorrowSchedule?.isPublished && tomorrowSchedule.slots.length === 48,
  );

  const dayOptions = useMemo<readonly SegmentOption<DayTab>[]>(
    () => [
      { value: 'today', label: 'Сьогодні' },
      { value: 'tomorrow', label: 'Завтра', hasIndicator: isTomorrowPublished },
    ],
    [isTomorrowPublished],
  );

  if (!primaryLocation) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]} edges={['top']}>
        <GlassBackdrop />
        <View style={styles.emptyTopBar}>
          <InteractiveSurface
            onPress={() => setThemePickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Змінити тему"
            borderRadius={RADII.pill}
            style={elevation.subtle}
            contentStyle={[
              styles.iconActionButton,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Palette size={20} color={theme.textSecondary} />
          </InteractiveSurface>
        </View>

        <View style={styles.emptyCenter}>
          <View
            style={[
              styles.emptyIconBadge,
              CONTINUOUS_CORNER,
              { backgroundColor: theme.accentSoft },
            ]}
          >
            <MapPin size={34} color={theme.accent} strokeWidth={2} />
          </View>

          <Text style={[TYPOGRAPHY.largeTitle, styles.emptyTitle, { color: theme.text }]}>
            Вітаємо в «Є Світло»
          </Text>

          <Text style={[TYPOGRAPHY.body, styles.emptySubtitle, { color: theme.textSecondary }]}>
            {locationsCount > 0
              ? 'Оберіть основну адресу у Львівській області, щоб бачити актуальний графік відключень та отримувати сповіщення.'
              : 'Додайте вашу адресу у Львові або Львівській області, щоб бачити погодинний графік відключень і отримувати нагадування.'}
          </Text>

          <View style={styles.emptyActions}>
            <InteractiveSurface
              onPress={() => router.push('/(tabs)/add')}
              accessibilityRole="button"
              rippleTone="accent"
              borderRadius={RADII.lg}
              style={[styles.fullWidthAction, elevation.subtle]}
              contentStyle={[
                styles.primaryButton,
                {
                  backgroundColor: theme.accent,
                },
              ]}
            >
              <Plus size={19} color={theme.accentOnSolid} strokeWidth={2.4} />
              <Text style={[TYPOGRAPHY.headline, { color: theme.accentOnSolid }]}>
                Додати адресу
              </Text>
            </InteractiveSurface>

            {locationsCount > 0 ? (
              <InteractiveSurface
                onPress={() => setPickerVisible(true)}
                accessibilityRole="button"
                borderRadius={RADII.lg}
                style={styles.fullWidthAction}
                contentStyle={[
                  styles.secondaryButton,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[TYPOGRAPHY.headline, { color: theme.text }]}>
                  Обрати зі збережених адрес
                </Text>
              </InteractiveSurface>
            ) : null}
          </View>
        </View>

        <LocationPickerModal visible={pickerVisible} onClose={() => setPickerVisible(false)} />
        <ThemePickerModal
          visible={themePickerVisible}
          onClose={() => setThemePickerVisible(false)}
        />
      </SafeAreaView>
    );
  }

  const formattedDate = activeDaySchedule?.date
    ? formatUkrainianDateLabel(activeDaySchedule.date)
    : null;
  const dayTitle = selectedDay === 'today' ? 'Графік на сьогодні' : 'Графік на завтра';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]} edges={['top']}>
      <GlassBackdrop />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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
        <View style={styles.headerRow}>
          <InteractiveSurface
            onPress={() => setPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Змінити локацію: ${primaryLocation.label || primaryLocation.fullAddress}, Група ${primaryLocation.groupId}`}
            scaleVariant="card"
            borderRadius={RADII.lg}
            style={styles.locationTriggerOuter}
            contentStyle={styles.locationTriggerInner}
          >
            <View style={styles.locationTitleRow}>
              <Text
                style={[TYPOGRAPHY.title3, styles.locationTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                {primaryLocation.label || primaryLocation.fullAddress}
              </Text>
              <ChevronDown size={18} color={theme.textMuted} strokeWidth={2.2} />
            </View>

            <View style={styles.locationMetaRow}>
              <View
                style={[
                  styles.groupBadge,
                  CONTINUOUS_CORNER,
                  { backgroundColor: theme.accentSoft },
                ]}
              >
                <Text style={[TYPOGRAPHY.caption, { color: theme.accentText }]}>
                  Група {primaryLocation.groupId}
                </Text>
              </View>

              {primaryLocation.label ? (
                <Text
                  style={[TYPOGRAPHY.footnote, styles.addressSubtitle, { color: theme.textMuted }]}
                  numberOfLines={1}
                >
                  {primaryLocation.fullAddress}
                </Text>
              ) : null}
            </View>
          </InteractiveSurface>

          <View style={styles.headerActions}>
            <InteractiveSurface
              onPress={() => setThemePickerVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Змінити тему"
              borderRadius={RADII.pill}
              style={elevation.subtle}
              contentStyle={[
                styles.iconActionButton,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <Palette size={19} color={theme.textSecondary} strokeWidth={2} />
            </InteractiveSurface>

            <InteractiveSurface
              onPress={() => setSettingsVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Налаштування сповіщень"
              borderRadius={RADII.pill}
              style={elevation.subtle}
              contentStyle={[
                styles.iconActionButton,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <Bell size={19} color={theme.textSecondary} strokeWidth={2} />
              {reminderMinutes > 0 ? (
                <View
                  style={[
                    styles.reminderDot,
                    {
                      backgroundColor: theme.accent,
                      borderColor: theme.surface,
                    },
                  ]}
                />
              ) : null}
            </InteractiveSurface>
          </View>
        </View>

        <CurrentStatusCard
          today={todaySchedule}
          tomorrow={tomorrowSchedule}
          isOffline={isOfflineCache}
          isLoading={isInitialLoading && !currentSchedule}
        />

        {fetchError ? (
          <View
            style={[
              styles.errorBanner,
              CONTINUOUS_CORNER,
              {
                backgroundColor: theme.warningBg,
                borderColor: theme.warningBorder,
              },
            ]}
          >
            <AlertTriangle size={16} color={theme.warningText} strokeWidth={2.2} />
            <Text
              style={[TYPOGRAPHY.footnote, styles.errorText, { color: theme.warningText }]}
              numberOfLines={2}
            >
              {fetchError}
            </Text>
            <InteractiveSurface
              onPress={() => {
                void loadSchedule('refresh');
              }}
              accessibilityRole="button"
              accessibilityLabel="Повторити оновлення"
              borderRadius={RADII.sm}
              contentStyle={[
                styles.retryButton,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.warningBorder,
                },
              ]}
            >
              <RefreshCw size={12} color={theme.warningText} strokeWidth={2.4} />
              <Text style={[TYPOGRAPHY.caption, { color: theme.warningText }]}>Ще раз</Text>
            </InteractiveSurface>
          </View>
        ) : null}

        <SegmentedControl options={dayOptions} value={selectedDay} onChange={setSelectedDay} />

        <Animated.View
          style={{
            opacity: dayTransition,
            transform: [
              {
                translateY: dayTransition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [6, 0],
                }),
              },
            ],
          }}
        >
          {isInitialLoading && !currentSchedule ? (
            <View
              style={[
                styles.stateCard,
                CONTINUOUS_CORNER,
                elevation.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[TYPOGRAPHY.callout, styles.loadingLabel, { color: theme.textMuted }]}>
                Завантаження погодинного графіка…
              </Text>
            </View>
          ) : hasActiveSchedule && activeDaySchedule ? (
            <View key={`grid-${selectedDay}`}>
              <OutageGrid
                slots={activeDaySchedule.slots}
                highlightCurrentHour={selectedDay === 'today'}
                dayTitle={dayTitle}
                dateLabel={formattedDate}
              />
            </View>
          ) : selectedDay === 'tomorrow' ? (
            <View
              key="tomorrow-empty"
              style={[
                styles.stateCard,
                CONTINUOUS_CORNER,
                elevation.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.stateIconWrap,
                  CONTINUOUS_CORNER,
                  { backgroundColor: theme.surfaceMuted },
                ]}
              >
                <CalendarClock size={24} color={theme.textMuted} strokeWidth={2} />
              </View>
              <Text style={[TYPOGRAPHY.headline, styles.stateTitle, { color: theme.text }]}>
                Графік на завтра буде пізніше
              </Text>
              <Text style={[TYPOGRAPHY.subhead, styles.stateBody, { color: theme.textMuted }]}>
                Львівобленерго ще не опублікувало графік на наступну добу. Потягніть вниз для
                перевірки або дочекайтесь сповіщення.
              </Text>
            </View>
          ) : (
            <View
              key="today-no-schedule"
              style={[
                styles.stateCard,
                CONTINUOUS_CORNER,
                elevation.card,
                {
                  backgroundColor: theme.onBg,
                  borderColor: theme.onBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.stateIconWrap,
                  CONTINUOUS_CORNER,
                  { backgroundColor: theme.onHalfBg },
                ]}
              >
                <Zap size={24} color={theme.onIcon} strokeWidth={2.2} />
              </View>
              <Text style={[TYPOGRAPHY.title3, styles.stateTitle, { color: theme.onText }]}>
                Є світло
              </Text>
              <Text style={[TYPOGRAPHY.subhead, styles.stateBody, { color: theme.onText }]}>
                Графік відключень на сьогодні наразі відсутній — електроенергія подається без
                обмежень.
              </Text>
            </View>
          )}
        </Animated.View>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenHorizontal,
    paddingTop: SPACING.xs,
    paddingBottom: LAYOUT.tabBarClearance,
    gap: SPACING.sm + 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    minHeight: 52,
  },
  locationTriggerOuter: {
    flex: 1,
  },
  locationTriggerInner: {
    paddingVertical: SPACING.xxs,
    paddingRight: SPACING.xs,
    borderRadius: RADII.md,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  locationTitle: {
    flexShrink: 1,
  },
  locationMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  groupBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.pill,
  },
  addressSubtitle: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  iconActionButton: {
    width: LAYOUT.iconButtonVisualSize,
    height: LAYOUT.iconButtonVisualSize,
    borderRadius: RADII.pill,
    borderWidth: LAYOUT.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  reminderDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: RADII.pill,
    borderWidth: 1.5,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderRadius: RADII.lg,
    borderWidth: LAYOUT.borderWidth,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    lineHeight: 17,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADII.sm,
    borderWidth: LAYOUT.borderWidth,
  },
  stateCard: {
    alignItems: 'center',
    borderRadius: RADII.xl,
    borderWidth: LAYOUT.borderWidth,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },
  stateIconWrap: {
    width: 52,
    height: 52,
    borderRadius: RADII.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    marginTop: SPACING.sm + 2,
    textAlign: 'center',
  },
  stateBody: {
    marginTop: 6,
    textAlign: 'center',
    opacity: 0.88,
  },
  loadingLabel: {
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  emptyTopBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: LAYOUT.screenHorizontal,
    paddingTop: SPACING.xs,
  },
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: 96,
  },
  emptyIconBadge: {
    width: 76,
    height: 76,
    borderRadius: RADII.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: SPACING.xs + 2,
    textAlign: 'center',
  },
  emptyActions: {
    marginTop: SPACING.xl + 4,
    width: '100%',
    maxWidth: 320,
    gap: SPACING.sm,
  },
  fullWidthAction: {
    width: '100%',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: RADII.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: RADII.lg,
    borderWidth: LAYOUT.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
});
