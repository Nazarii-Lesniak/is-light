import { useAppStore, useAppTheme } from '@/entities/location/model/store';
import type { SavedLocation } from '@/entities/location/model/types';
import {
  CONTINUOUS_CORNER,
  LAYOUT,
  RADII,
  SPACING,
  TABULAR_NUMS,
  TYPOGRAPHY,
  getElevation,
  getInteractiveTokens,
} from '@/shared/theme/tokens';
import { AppBottomSheet } from '@/shared/ui/AppBottomSheet';
import { InteractiveSurface } from '@/shared/ui/InteractiveSurface';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  Check,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LABEL_PRESETS = ['Дім', 'Робота', 'Батьки', 'Офіс'] as const;

function getUkrainianLocationWord(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 19) {
    return 'локацій';
  }
  if (mod10 === 1) {
    return 'локація';
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return 'локації';
  }
  return 'локацій';
}

export function LocationsListView() {
  const router = useRouter();
  const theme = useAppTheme();
  const elevation = getElevation(theme);
  const interactive = getInteractiveTokens(theme);
  const locations = useAppStore((s) => s.locations);
  const primaryLocationId = useAppStore((s) => s.primaryLocationId);
  const setPrimaryLocation = useAppStore((s) => s.setPrimaryLocation);
  const removeLocation = useAppStore((s) => s.removeLocation);
  const updateLocationLabel = useAppStore((s) => s.updateLocationLabel);

  const [editingLocation, setEditingLocation] = useState<SavedLocation | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [isLabelFocused, setIsLabelFocused] = useState(false);

  const handleOpenLocation = (location: SavedLocation) => {
    if (location.id !== primaryLocationId) {
      setPrimaryLocation(location.id);
    }
    router.push('/(tabs)');
  };

  const handleOpenEdit = (location: SavedLocation) => {
    setEditingLocation(location);
    setLabelDraft(location.label ?? '');
  };

  const handleCloseEdit = () => {
    setEditingLocation(null);
    setLabelDraft('');
    setIsLabelFocused(false);
  };

  const handleSaveLabel = () => {
    if (!editingLocation) {
      return;
    }
    updateLocationLabel(editingLocation.id, labelDraft);
    handleCloseEdit();
  };

  const handleDeletePress = (location: SavedLocation) => {
    const isPrimary = location.id === primaryLocationId;
    const otherLocations = locations.filter((item) => item.id !== location.id);
    const nextLocation = otherLocations[0] ?? null;

    let message = `Видалити адресу «${location.fullAddress}» зі списку?`;
    if (isPrimary && nextLocation) {
      message = `Це ваша основна адреса. Після видалення основною автоматично стане «${
        nextLocation.label || nextLocation.fullAddress
      }» (Група ${nextLocation.groupId}), а підписку на сповіщення буде оновлено.`;
    } else if (isPrimary && !nextLocation) {
      message =
        'Це ваша остання та основна адреса. Після видалення головний екран буде очищено, а push-сповіщення вимкнено.';
    }

    Alert.alert('Видалити локацію?', message, [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: () => {
          removeLocation(location.id);
        },
      },
    ]);
  };

  const locationWord = getUkrainianLocationWord(locations.length);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Text style={[TYPOGRAPHY.largeTitle, { color: theme.text }]}>Збережені адреси</Text>
          <Text
            style={[TYPOGRAPHY.subhead, TABULAR_NUMS, styles.subtitle, { color: theme.textMuted }]}
          >
            Львівська область · {locations.length} {locationWord}
          </Text>
        </View>

        <InteractiveSurface
          onPress={() => router.push('/(tabs)/add')}
          accessibilityRole="button"
          accessibilityLabel="Додати нову адресу"
          rippleTone="accent"
          borderRadius={RADII.pill}
          style={elevation.subtle}
          contentStyle={[styles.addCircleButton, { backgroundColor: theme.accent }]}
        >
          <Plus size={20} color={theme.accentOnSolid} strokeWidth={2.4} />
        </InteractiveSurface>
      </View>

      {locations.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View
            style={[
              styles.emptyIconBadge,
              CONTINUOUS_CORNER,
              { backgroundColor: theme.surfaceMuted },
            ]}
          >
            <MapPin size={30} color={theme.textMuted} strokeWidth={2} />
          </View>
          <Text style={[TYPOGRAPHY.title2, styles.emptyTitle, { color: theme.text }]}>
            Список адрес порожній
          </Text>
          <Text style={[TYPOGRAPHY.body, styles.emptyBody, { color: theme.textSecondary }]}>
            Додайте одну або кілька адрес у Львові чи області, щоб швидко перемикатись між ними.
          </Text>
          <InteractiveSurface
            onPress={() => router.push('/(tabs)/add')}
            accessibilityRole="button"
            rippleTone="accent"
            borderRadius={RADII.lg}
            style={[styles.emptyCtaOuter, elevation.subtle]}
            contentStyle={[styles.emptyCtaButton, { backgroundColor: theme.accent }]}
          >
            <Plus size={19} color={theme.accentOnSolid} strokeWidth={2.4} />
            <Text style={[TYPOGRAPHY.headline, { color: theme.accentOnSolid }]}>
              Додати першу адресу
            </Text>
          </InteractiveSurface>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {locations.map((location) => {
            const isPrimary = location.id === primaryLocationId;

            return (
              <View
                key={location.id}
                style={[
                  styles.card,
                  CONTINUOUS_CORNER,
                  elevation.card,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isPrimary ? theme.accent : theme.border,
                    borderWidth: isPrimary ? 1.5 : LAYOUT.borderWidth,
                  },
                ]}
              >
                <InteractiveSurface
                  onPress={() => handleOpenLocation(location)}
                  scaleVariant="card"
                  hitSlop={0}
                  accessibilityRole="button"
                  accessibilityLabel={`Відкрити графік для ${location.label || location.fullAddress}`}
                  contentStyle={styles.cardTopPressable}
                >
                  <View style={styles.cardTopBody}>
                    <View style={styles.badgesRow}>
                      <View
                        style={[
                          styles.groupPill,
                          CONTINUOUS_CORNER,
                          { backgroundColor: theme.accentSoft },
                        ]}
                      >
                        <Text style={[TYPOGRAPHY.caption, { color: theme.accentText }]}>
                          Група {location.groupId}
                        </Text>
                      </View>

                      {isPrimary ? (
                        <View
                          style={[
                            styles.primaryPill,
                            CONTINUOUS_CORNER,
                            { backgroundColor: theme.onHalfBg },
                          ]}
                        >
                          <Star size={11} color={theme.onIcon} fill={theme.onIcon} />
                          <Text style={[TYPOGRAPHY.caption, { color: theme.onText }]}>Основна</Text>
                        </View>
                      ) : null}
                    </View>

                    {location.label ? (
                      <Text style={[TYPOGRAPHY.title3, styles.cardLabel, { color: theme.text }]}>
                        {location.label}
                      </Text>
                    ) : null}

                    <Text
                      style={[
                        location.label ? TYPOGRAPHY.callout : TYPOGRAPHY.headline,
                        styles.cardAddress,
                        { color: location.label ? theme.textSecondary : theme.text },
                      ]}
                    >
                      {location.fullAddress}
                    </Text>
                  </View>

                  <ChevronRight size={19} color={theme.textMuted} strokeWidth={2} />
                </InteractiveSurface>

                <View style={[styles.cardActions, { borderTopColor: interactive.divider }]}>
                  {!isPrimary ? (
                    <InteractiveSurface
                      onPress={() => setPrimaryLocation(location.id)}
                      accessibilityRole="button"
                      borderRadius={RADII.md}
                      style={styles.mainActionOuter}
                      contentStyle={[
                        styles.mainActionButton,
                        { backgroundColor: theme.accentSoft },
                      ]}
                    >
                      <Check size={16} color={theme.accent} strokeWidth={2.4} />
                      <Text
                        style={[
                          TYPOGRAPHY.callout,
                          styles.mainActionText,
                          { color: theme.accentText },
                        ]}
                      >
                        Зробити основною
                      </Text>
                    </InteractiveSurface>
                  ) : (
                    <InteractiveSurface
                      onPress={() => handleOpenLocation(location)}
                      accessibilityRole="button"
                      borderRadius={RADII.md}
                      style={styles.mainActionOuter}
                      contentStyle={[
                        styles.mainActionButton,
                        { backgroundColor: theme.surfaceMuted },
                      ]}
                    >
                      <Text
                        style={[
                          TYPOGRAPHY.callout,
                          styles.mainActionText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Відкрити графік
                      </Text>
                      <ArrowRight size={15} color={theme.textSecondary} strokeWidth={2.2} />
                    </InteractiveSurface>
                  )}

                  <InteractiveSurface
                    onPress={() => handleOpenEdit(location)}
                    accessibilityRole="button"
                    accessibilityLabel="Редагувати мітку"
                    borderRadius={RADII.md}
                    contentStyle={[
                      styles.iconButton,
                      {
                        backgroundColor: theme.surfaceInput,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Pencil size={16} color={theme.textSecondary} strokeWidth={2} />
                  </InteractiveSurface>

                  <InteractiveSurface
                    onPress={() => handleDeletePress(location)}
                    accessibilityRole="button"
                    accessibilityLabel="Видалити адресу"
                    borderRadius={RADII.md}
                    contentStyle={[
                      styles.iconButton,
                      {
                        backgroundColor: theme.dangerBg,
                        borderColor: theme.dangerBorder,
                      },
                    ]}
                  >
                    <Trash2 size={16} color={theme.dangerText} strokeWidth={2} />
                  </InteractiveSurface>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <AppBottomSheet
        visible={editingLocation !== null}
        onClose={handleCloseEdit}
        title="Мітка локації"
        subtitle={editingLocation?.fullAddress}
        avoidKeyboard
      >
        <TextInput
          value={labelDraft}
          onChangeText={setLabelDraft}
          onFocus={() => setIsLabelFocused(true)}
          onBlur={() => setIsLabelFocused(false)}
          placeholder="Наприклад: Дім, Робота, Батьки"
          placeholderTextColor={theme.textMuted}
          maxLength={32}
          autoFocus
          style={[
            TYPOGRAPHY.body,
            CONTINUOUS_CORNER,
            styles.labelInput,
            {
              backgroundColor: theme.surfaceInput,
              borderColor: isLabelFocused ? theme.accent : theme.border,
              borderWidth: isLabelFocused ? 1.5 : LAYOUT.borderWidth,
              color: theme.text,
            },
          ]}
        />

        <View style={styles.presetsWrap}>
          {LABEL_PRESETS.map((preset) => {
            const active = labelDraft === preset;
            return (
              <InteractiveSurface
                key={preset}
                onPress={() => setLabelDraft(preset)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                borderRadius={RADII.pill}
                contentStyle={[
                  styles.presetChip,
                  {
                    backgroundColor: active ? theme.accentSoft : theme.surfaceInput,
                    borderColor: active ? theme.accent : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    TYPOGRAPHY.subhead,
                    {
                      color: active ? theme.accentText : theme.textSecondary,
                      fontWeight: active ? '600' : '500',
                    },
                  ]}
                >
                  {preset}
                </Text>
              </InteractiveSurface>
            );
          })}
        </View>

        <View style={styles.sheetActions}>
          <InteractiveSurface
            onPress={handleCloseEdit}
            accessibilityRole="button"
            borderRadius={RADII.lg}
            style={styles.sheetActionFlex}
            contentStyle={[
              styles.sheetSecondaryBtn,
              {
                borderColor: theme.border,
                backgroundColor: theme.surfaceInput,
              },
            ]}
          >
            <Text style={[TYPOGRAPHY.headline, { color: theme.textSecondary }]}>Скасувати</Text>
          </InteractiveSurface>

          <InteractiveSurface
            onPress={handleSaveLabel}
            accessibilityRole="button"
            rippleTone="accent"
            borderRadius={RADII.lg}
            style={styles.sheetActionFlex}
            contentStyle={[styles.sheetPrimaryBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={[TYPOGRAPHY.headline, { color: theme.accentOnSolid }]}>Зберегти</Text>
          </InteractiveSurface>
        </View>
      </AppBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingHorizontal: LAYOUT.screenHorizontal,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  headerTitleWrap: {
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
  },
  addCircleButton: {
    width: LAYOUT.iconButtonVisualSize,
    height: LAYOUT.iconButtonVisualSize,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: 96,
  },
  emptyIconBadge: {
    width: 72,
    height: 72,
    borderRadius: RADII.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  emptyCtaOuter: {
    marginTop: SPACING.xl,
    width: '100%',
    maxWidth: 300,
  },
  emptyCtaButton: {
    minHeight: 52,
    borderRadius: RADII.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenHorizontal,
    paddingTop: SPACING.xxs,
    paddingBottom: LAYOUT.tabBarClearance,
    gap: SPACING.sm,
  },
  card: {
    borderRadius: RADII.xl,
    overflow: 'hidden',
  },
  cardTopPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    padding: LAYOUT.cardPadding,
    paddingBottom: SPACING.sm + 2,
  },
  cardTopBody: {
    flex: 1,
    gap: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  groupPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADII.pill,
  },
  primaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADII.pill,
  },
  cardLabel: {
    marginTop: 2,
  },
  cardAddress: {
    lineHeight: 20,
  },
  cardActions: {
    marginHorizontal: LAYOUT.cardPadding,
    paddingTop: SPACING.sm,
    paddingBottom: LAYOUT.cardPadding,
    borderTopWidth: LAYOUT.borderWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  mainActionOuter: {
    flex: 1,
  },
  mainActionButton: {
    minHeight: 42,
    borderRadius: RADII.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
  },
  mainActionText: {
    fontWeight: '600',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: RADII.md,
    borderWidth: LAYOUT.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelInput: {
    borderRadius: RADII.md + 2,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 13,
    minHeight: 48,
  },
  presetsWrap: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  presetChip: {
    minHeight: 36,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 7,
    borderRadius: RADII.pill,
    borderWidth: LAYOUT.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActions: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.sm - 2,
  },
  sheetActionFlex: {
    flex: 1,
  },
  sheetSecondaryBtn: {
    minHeight: 50,
    borderRadius: RADII.lg,
    borderWidth: LAYOUT.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPrimaryBtn: {
    minHeight: 50,
    borderRadius: RADII.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
