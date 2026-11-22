import { useAppTheme } from '@/entities/location/model/store';
import {
  CONTINUOUS_CORNER,
  HIT_SLOP_STANDARD,
  LAYOUT,
  MOTION,
  RADII,
  SPACING,
  TABULAR_NUMS,
  TYPOGRAPHY,
  getElevation,
  getInteractiveTokens,
} from '@/shared/theme/tokens';
import { InteractiveSurface } from '@/shared/ui/InteractiveSurface';
import {
  type HourCell,
  type SlotStatus,
  createSlots,
  getKyivCurrentHour,
  slotsToHourCells,
} from '@is-light/shared';
import { Clock, HelpCircle, X, Zap, ZapOff } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

interface OutageGridProps {
  slots: readonly SlotStatus[] | null;
  highlightCurrentHour: boolean;
  dayTitle?: string;
  dateLabel?: string | null;
}

function getCellDescriptionUk(cell: HourCell): string {
  const hourStr = String(cell.hour).padStart(2, '0');
  const nextHourStr = String(cell.hour + 1).padStart(2, '0');

  switch (cell.state) {
    case 'on':
      return `${hourStr}:00–${nextHourStr}:00 — Світло є протягом усієї години`;
    case 'off':
      return `${hourStr}:00–${nextHourStr}:00 — Світла немає протягом усієї години`;
    case 'off_first_half':
      return `${hourStr}:00–${hourStr}:30 — Світла немає (30 хв), з ${hourStr}:30 до ${nextHourStr}:00 — світло є`;
    case 'off_second_half':
      return `${hourStr}:00–${hourStr}:30 — Світло є, з ${hourStr}:30 до ${nextHourStr}:00 — світла немає (30 хв)`;
    default:
      return `${hourStr}:00–${nextHourStr}:00 — Немає даних`;
  }
}

function formatHoursUk(halfHourSlots: number): string {
  const hours = halfHourSlots / 2;
  if (Number.isInteger(hours)) {
    return `${hours} год`;
  }
  return `${hours.toFixed(1).replace('.', ',')} год`;
}

export function OutageGrid({ slots, highlightCurrentHour, dayTitle, dateLabel }: OutageGridProps) {
  const theme = useAppTheme();
  const elevation = getElevation(theme);
  const interactive = getInteractiveTokens(theme);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());

  const detailAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!highlightCurrentHour) {
      return;
    }
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => clearInterval(interval);
  }, [highlightCurrentHour]);

  const currentHour = highlightCurrentHour ? getKyivCurrentHour(now) : -1;

  const { cells, onHalfCount, offHalfCount } = useMemo(() => {
    const resolved = slots && slots.length === 48 ? slots : createSlots('unknown');
    let onCount = 0;
    let offCount = 0;
    for (const slot of resolved) {
      if (slot === 'on') {
        onCount++;
      } else if (slot === 'off') {
        offCount++;
      }
    }
    return {
      cells: slotsToHourCells(resolved),
      onHalfCount: onCount,
      offHalfCount: offCount,
    };
  }, [slots]);

  const rows = useMemo(() => {
    const chunked: HourCell[][] = [];
    for (let i = 0; i < cells.length; i += 4) {
      chunked.push(cells.slice(i, i + 4));
    }
    return chunked;
  }, [cells]);

  const selectedCell = selectedHour !== null ? (cells[selectedHour] ?? null) : null;

  useEffect(() => {
    if (selectedHour === null) {
      detailAnim.setValue(0);
      return;
    }

    detailAnim.setValue(0);
    Animated.timing(detailAnim, {
      toValue: 1,
      duration: MOTION.durationFast + 40,
      useNativeDriver: true,
    }).start();
  }, [selectedHour, detailAnim]);

  const hasSummary = onHalfCount > 0 || offHalfCount > 0;

  return (
    <View
      style={[
        styles.card,
        CONTINUOUS_CORNER,
        elevation.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      {dayTitle || hasSummary ? (
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleBlock}>
            {dayTitle ? (
              <Text style={[TYPOGRAPHY.headline, { color: theme.text }]} numberOfLines={1}>
                {dayTitle}
              </Text>
            ) : null}
            {dateLabel ? (
              <Text style={[TYPOGRAPHY.footnote, TABULAR_NUMS, { color: theme.textMuted }]}>
                {dateLabel}
              </Text>
            ) : null}
          </View>

          {hasSummary ? (
            <View style={styles.summaryRow}>
              <View
                style={[
                  styles.summaryBadge,
                  CONTINUOUS_CORNER,
                  { backgroundColor: theme.onBg, borderColor: theme.onBorder },
                ]}
              >
                <Zap size={11} color={theme.onIcon} strokeWidth={2.4} />
                <Text style={[TYPOGRAPHY.caption, TABULAR_NUMS, { color: theme.onText }]}>
                  {formatHoursUk(onHalfCount)}
                </Text>
              </View>

              <View
                style={[
                  styles.summaryBadge,
                  CONTINUOUS_CORNER,
                  { backgroundColor: theme.offBg, borderColor: theme.offBorder },
                ]}
              >
                <ZapOff size={11} color={theme.offIcon} strokeWidth={2.4} />
                <Text style={[TYPOGRAPHY.caption, TABULAR_NUMS, { color: theme.offText }]}>
                  {formatHoursUk(offHalfCount)}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.grid}>
        {rows.map((row) => (
          <View key={row[0]?.label ?? 'row'} style={styles.gridRow}>
            {row.map((cell) => {
              const isCurrent = highlightCurrentHour && cell.hour === currentHour;
              const isSelected = selectedHour === cell.hour;
              const isPartial = cell.state === 'off_first_half' || cell.state === 'off_second_half';

              const bgColor =
                cell.state === 'on'
                  ? theme.onBg
                  : cell.state === 'off'
                    ? theme.offBg
                    : cell.state === 'unknown'
                      ? theme.unknownBg
                      : theme.surface;

              const borderColor = isSelected
                ? theme.text
                : isCurrent
                  ? theme.accent
                  : cell.state === 'on'
                    ? theme.onBorder
                    : cell.state === 'off'
                      ? theme.offBorder
                      : isPartial
                        ? theme.partialBorder
                        : theme.unknownBorder;

              const borderWidth = isCurrent || isSelected ? 2 : LAYOUT.borderWidth;

              const textColor =
                cell.state === 'on'
                  ? theme.onText
                  : cell.state === 'off'
                    ? theme.offText
                    : isPartial
                      ? theme.partialText
                      : theme.unknownText;

              const formattedLabel = cell.label.replace('-', '–');

              return (
                <InteractiveSurface
                  key={cell.label}
                  scaleVariant="cell"
                  borderRadius={RADII.md}
                  hitSlop={{ top: 2, right: 2, bottom: 2, left: 2 }}
                  onPress={() => setSelectedHour((prev) => (prev === cell.hour ? null : cell.hour))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={getCellDescriptionUk(cell)}
                  style={styles.cellOuter}
                  contentStyle={[
                    styles.cellInner,
                    {
                      backgroundColor: bgColor,
                      borderColor,
                      borderWidth,
                    },
                  ]}
                >
                  {isPartial ? (
                    <View
                      pointerEvents="none"
                      style={[StyleSheet.absoluteFill, styles.partialSplit]}
                    >
                      <View
                        style={[
                          styles.partialHalf,
                          {
                            backgroundColor:
                              cell.state === 'off_first_half' ? theme.offHalfBg : theme.onHalfBg,
                          },
                        ]}
                      />
                      <View
                        style={[styles.partialSeam, { backgroundColor: interactive.divider }]}
                      />
                      <View
                        style={[
                          styles.partialHalf,
                          {
                            backgroundColor:
                              cell.state === 'off_second_half' ? theme.offHalfBg : theme.onHalfBg,
                          },
                        ]}
                      />
                    </View>
                  ) : null}

                  <View style={styles.cellContent}>
                    {isCurrent ? (
                      <View
                        style={[
                          styles.currentDot,
                          {
                            backgroundColor: theme.accent,
                          },
                        ]}
                      />
                    ) : null}

                    {cell.state === 'on' ? (
                      <Zap size={14} color={theme.onIcon} strokeWidth={2.2} />
                    ) : cell.state === 'off' ? (
                      <ZapOff size={14} color={theme.offIcon} strokeWidth={2.2} />
                    ) : isPartial ? (
                      <Clock size={14} color={theme.partialIcon} strokeWidth={2.2} />
                    ) : (
                      <HelpCircle size={14} color={theme.unknownText} strokeWidth={2} />
                    )}

                    <Text
                      style={[
                        TYPOGRAPHY.subhead,
                        TABULAR_NUMS,
                        styles.cellLabel,
                        { color: textColor },
                      ]}
                    >
                      {formattedLabel}
                    </Text>
                  </View>
                </InteractiveSurface>
              );
            })}
          </View>
        ))}
      </View>

      {selectedCell ? (
        <Animated.View
          style={[
            styles.detailCard,
            CONTINUOUS_CORNER,
            {
              backgroundColor: theme.tooltipBg,
              opacity: detailAnim,
              transform: [
                {
                  translateY: detailAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text
            style={[
              TYPOGRAPHY.footnote,
              TABULAR_NUMS,
              styles.detailText,
              { color: theme.tooltipText },
            ]}
          >
            {getCellDescriptionUk(selectedCell)}
          </Text>
          <Pressable
            onPress={() => setSelectedHour(null)}
            hitSlop={HIT_SLOP_STANDARD}
            accessibilityRole="button"
            accessibilityLabel="Закрити деталі години"
            style={styles.detailClose}
          >
            <X size={15} color={theme.tooltipText} />
          </Pressable>
        </Animated.View>
      ) : (
        <Text style={[TYPOGRAPHY.footnote, styles.tapHint, { color: theme.textMuted }]}>
          Натисніть на годину для деталей інтервалу
        </Text>
      )}

      <View style={[styles.legend, { borderTopColor: interactive.divider }]}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              { backgroundColor: theme.onHalfBg, borderColor: theme.onBorder },
            ]}
          />
          <Text style={[TYPOGRAPHY.caption, styles.legendText, { color: theme.textMuted }]}>
            Є світло
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              { backgroundColor: theme.offHalfBg, borderColor: theme.offBorder },
            ]}
          />
          <Text style={[TYPOGRAPHY.caption, styles.legendText, { color: theme.textMuted }]}>
            Немає
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              styles.legendSwatchSplit,
              { borderColor: theme.partialBorder },
            ]}
          >
            <View style={{ flex: 1, backgroundColor: theme.offHalfBg }} />
            <View style={{ flex: 1, backgroundColor: theme.onHalfBg }} />
          </View>
          <Text style={[TYPOGRAPHY.caption, styles.legendText, { color: theme.textMuted }]}>
            30 хв
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              {
                borderWidth: 2,
                borderColor: theme.accent,
                backgroundColor: theme.surface,
              },
            ]}
          />
          <Text style={[TYPOGRAPHY.caption, styles.legendText, { color: theme.textMuted }]}>
            Зараз
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADII.xl,
    borderWidth: LAYOUT.borderWidth,
    padding: SPACING.sm + 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
    paddingHorizontal: 2,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: RADII.pill,
    borderWidth: LAYOUT.borderWidth,
  },
  grid: {
    gap: 7,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 7,
  },
  cellOuter: {
    flex: 1,
  },
  cellInner: {
    height: 60,
    borderRadius: RADII.md,
    position: 'relative',
    overflow: 'hidden',
  },
  partialSplit: {
    flexDirection: 'row',
  },
  partialHalf: {
    flex: 1,
  },
  partialSeam: {
    width: StyleSheet.hairlineWidth,
  },
  cellContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  currentDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: RADII.pill,
  },
  cellLabel: {
    marginTop: 4,
    fontWeight: '700',
  },
  detailCard: {
    marginTop: SPACING.sm,
    borderRadius: RADII.md,
    paddingLeft: SPACING.sm,
    paddingRight: SPACING.xs,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailText: {
    flex: 1,
    lineHeight: 18,
  },
  detailClose: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.pill,
    opacity: 0.8,
  },
  tapHint: {
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  legend: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: LAYOUT.borderWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendSwatchSplit: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  legendText: {
    fontWeight: '500',
  },
});
