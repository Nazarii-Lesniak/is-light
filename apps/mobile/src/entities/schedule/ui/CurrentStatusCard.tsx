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
  type DaySchedule,
  formatCountdownUk,
  formatKyivTime,
  getCurrentPowerStatus,
} from '@is-light/shared';
import { ChevronUp, Clock, HelpCircle, WifiOff, Zap, ZapOff } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface CurrentStatusCardProps {
  today: DaySchedule | null;
  tomorrow: DaySchedule | null;
  isOffline: boolean;
  isLoading?: boolean;
}

export function CurrentStatusCard({
  today,
  tomorrow,
  isOffline,
  isLoading = false,
}: CurrentStatusCardProps) {
  const theme = useAppTheme();
  const elevation = getElevation(theme);
  const interactive = getInteractiveTokens(theme);
  const [now, setNow] = useState(() => new Date());
  const [isExpanded, setIsExpanded] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const skeletonAnim = useRef(new Animated.Value(0.45)).current;
  const chevronAnim = useRef(new Animated.Value(0)).current;
  const detailsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const showSkeleton = isLoading && !today;

  useEffect(() => {
    if (!showSkeleton) {
      skeletonAnim.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnim, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonAnim, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [showSkeleton, skeletonAnim]);

  const summary = getCurrentPowerStatus(today, tomorrow, now);
  const hasPublishedToday = Boolean(today?.isPublished);
  const isOff = summary.status === 'off';
  const isUnknownWithSchedule = hasPublishedToday && summary.status === 'unknown';
  const isLiveKnown = hasPublishedToday && !isUnknownWithSchedule;

  useEffect(() => {
    if (!isLiveKnown || showSkeleton) {
      pulseAnim.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isLiveKnown, showSkeleton, pulseAnim]);

  useEffect(() => {
    Animated.spring(chevronAnim, {
      toValue: isExpanded ? 1 : 0,
      ...MOTION.springSnappy,
    }).start();

    if (isExpanded) {
      detailsAnim.setValue(0);
      Animated.timing(detailsAnim, {
        toValue: 1,
        duration: MOTION.durationNormal,
        useNativeDriver: true,
      }).start();
    } else {
      detailsAnim.setValue(0);
    }
  }, [isExpanded, chevronAnim, detailsAnim]);

  if (showSkeleton) {
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
        <View style={styles.topRow}>
          <Animated.View
            style={[
              styles.skeletonPill,
              { backgroundColor: interactive.skeletonBase, opacity: skeletonAnim },
            ]}
          />
          <Animated.View
            style={[
              styles.iconEmblem,
              CONTINUOUS_CORNER,
              { backgroundColor: interactive.skeletonBase, opacity: skeletonAnim },
            ]}
          />
        </View>
      </View>
    );
  }

  const bgColor = isOff ? theme.offBg : isUnknownWithSchedule ? theme.unknownBg : theme.onBg;
  const borderColor = isOff
    ? theme.offBorder
    : isUnknownWithSchedule
      ? theme.unknownBorder
      : theme.onBorder;
  const iconBgColor = isOff
    ? theme.offHalfBg
    : isUnknownWithSchedule
      ? theme.surfaceMuted
      : theme.onHalfBg;
  const iconColor = isOff
    ? theme.offIcon
    : isUnknownWithSchedule
      ? theme.unknownText
      : theme.onIcon;
  const textColor = isOff
    ? theme.offText
    : isUnknownWithSchedule
      ? theme.unknownText
      : theme.onText;

  const statusBadgeLabel = isOff
    ? 'Зараз немає світла'
    : isUnknownWithSchedule
      ? 'Немає актуальних даних'
      : hasPublishedToday
        ? 'Зараз є світло'
        : 'Є світло';

  const hasCountdown =
    hasPublishedToday &&
    !isUnknownWithSchedule &&
    summary.nextChangeAt !== null &&
    summary.msUntilChange !== null;

  const nextActionKicker =
    hasCountdown && summary.nextChangeAt
      ? `${summary.nextStatus === 'off' ? 'Відключення' : 'Увімкнення'} о ${formatKyivTime(
          summary.nextChangeAt,
        )}`
      : null;

  const countdownHeroValue =
    hasCountdown && summary.msUntilChange !== null
      ? `через ${formatCountdownUk(summary.msUntilChange)}`
      : null;

  let fallbackDescription: string | null = null;
  if (!hasPublishedToday) {
    fallbackDescription = 'Графік відключень на сьогодні не застосовується';
  } else if (isUnknownWithSchedule) {
    fallbackDescription = 'Потягніть вниз, щоб оновити графік на поточну добу';
  }

  const hasBodyContent = Boolean(
    (hasCountdown && nextActionKicker && countdownHeroValue) || fallbackDescription,
  );
  const hasFooterContent = isOffline || Boolean(today?.sourceInfo);

  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View
      accessibilityRole="summary"
      style={[
        styles.card,
        CONTINUOUS_CORNER,
        elevation.card,
        {
          backgroundColor: bgColor,
          borderColor,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.statusPill,
            CONTINUOUS_CORNER,
            {
              backgroundColor: iconBgColor,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.liveDot,
              {
                backgroundColor: iconColor,
                opacity: isLiveKnown ? pulseAnim : 0.75,
              },
            ]}
          />
          <Text style={[TYPOGRAPHY.subhead, styles.statusPillText, { color: textColor }]}>
            {statusBadgeLabel}
          </Text>
        </View>

        <View style={styles.rightControls}>
          <InteractiveSurface
            onPress={() => setIsExpanded((prev) => !prev)}
            hitSlop={HIT_SLOP_STANDARD}
            borderRadius={RADII.pill}
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
            accessibilityLabel={isExpanded ? 'Сховати деталі статусу' : 'Показати деталі статусу'}
            contentStyle={[
              styles.expandButton,
              {
                backgroundColor: iconBgColor,
              },
            ]}
          >
            <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
              <ChevronUp size={17} color={iconColor} strokeWidth={2.4} />
            </Animated.View>
          </InteractiveSurface>

          <View
            style={[
              styles.iconEmblem,
              CONTINUOUS_CORNER,
              {
                backgroundColor: iconBgColor,
              },
            ]}
          >
            {isOff ? (
              <ZapOff size={21} color={iconColor} strokeWidth={2.2} />
            ) : isUnknownWithSchedule ? (
              <HelpCircle size={21} color={iconColor} strokeWidth={2.2} />
            ) : (
              <Zap size={21} color={iconColor} strokeWidth={2.2} />
            )}
          </View>
        </View>
      </View>

      {isExpanded ? (
        <Animated.View
          style={{
            opacity: detailsAnim,
            transform: [
              {
                translateY: detailsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-4, 0],
                }),
              },
            ],
          }}
        >
          {hasBodyContent ? (
            <View style={styles.body}>
              {hasCountdown && nextActionKicker && countdownHeroValue ? (
                <>
                  <View style={styles.kickerRow}>
                    <Clock size={14} color={iconColor} strokeWidth={2} />
                    <Text
                      style={[
                        TYPOGRAPHY.callout,
                        TABULAR_NUMS,
                        { color: textColor, opacity: 0.88 },
                      ]}
                    >
                      {nextActionKicker}
                    </Text>
                  </View>
                  <Text style={[TYPOGRAPHY.metricHero, styles.heroText, { color: textColor }]}>
                    {countdownHeroValue}
                  </Text>
                </>
              ) : fallbackDescription ? (
                <Text style={[TYPOGRAPHY.callout, styles.fallbackDesc, { color: textColor }]}>
                  {fallbackDescription}
                </Text>
              ) : null}
            </View>
          ) : !hasFooterContent ? (
            <View style={styles.body}>
              <Text style={[TYPOGRAPHY.callout, styles.fallbackDesc, { color: textColor }]}>
                Змін найближчим часом не заплановано
              </Text>
            </View>
          ) : null}

          {hasFooterContent ? (
            <View
              style={[
                styles.footer,
                {
                  borderTopColor: borderColor,
                },
              ]}
            >
              {isOffline ? (
                <View
                  style={[
                    styles.offlinePill,
                    CONTINUOUS_CORNER,
                    {
                      backgroundColor: theme.warningBg,
                      borderColor: theme.warningBorder,
                    },
                  ]}
                >
                  <WifiOff size={11} color={theme.warningText} />
                  <Text style={[TYPOGRAPHY.caption, { color: theme.warningText }]}>Офлайн-кеш</Text>
                </View>
              ) : today?.sourceInfo ? (
                <Text
                  style={[TYPOGRAPHY.footnote, styles.sourceInfo, { color: theme.textMuted }]}
                  numberOfLines={2}
                >
                  {today.sourceInfo}
                </Text>
              ) : null}
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADII.xl,
    borderWidth: LAYOUT.borderWidth,
    padding: LAYOUT.cardPadding,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADII.pill,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: RADII.pill,
  },
  statusPillText: {
    fontWeight: '600',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  expandButton: {
    width: 34,
    height: 34,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmblem: {
    width: 42,
    height: 42,
    borderRadius: RADII.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    marginTop: SPACING.sm + 2,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroText: {
    marginTop: SPACING.xxs,
  },
  fallbackDesc: {
    opacity: 0.85,
  },
  footer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: LAYOUT.borderWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADII.pill,
    borderWidth: LAYOUT.borderWidth,
  },
  sourceInfo: {
    flexShrink: 1,
  },
  skeletonPill: {
    width: 152,
    height: 30,
    borderRadius: RADII.pill,
  },
});
