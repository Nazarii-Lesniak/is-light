import { useAppTheme } from '@/entities/location/model/store';
import {
  CONTINUOUS_CORNER,
  LAYOUT,
  MOTION,
  RADII,
  TYPOGRAPHY,
  getElevation,
  getInteractiveTokens,
} from '@/shared/theme/tokens';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  hasIndicator?: boolean;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

const TRACK_PADDING = 2;
const SEGMENT_HIT_SLOP = { top: 6, bottom: 6, left: 0, right: 0 } as const;

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useAppTheme();
  const elevation = getElevation(theme);
  const interactive = getInteractiveTokens(theme);
  const [trackWidth, setTrackWidth] = useState(0);

  const selectedIndex = Math.max(
    0,
    options.findIndex((item) => item.value === value),
  );

  const translateX = useRef(new Animated.Value(0)).current;
  const hasMeasuredRef = useRef(false);

  const segmentWidth =
    trackWidth > 0 && options.length > 0 ? (trackWidth - TRACK_PADDING * 2) / options.length : 0;

  useEffect(() => {
    if (segmentWidth <= 0) {
      return;
    }

    const nextX = selectedIndex * segmentWidth;
    if (!hasMeasuredRef.current) {
      translateX.setValue(nextX);
      hasMeasuredRef.current = true;
      return;
    }

    Animated.spring(translateX, {
      toValue: nextX,
      ...MOTION.springSnappy,
    }).start();
  }, [selectedIndex, segmentWidth, translateX]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth > 0 && Math.abs(nextWidth - trackWidth) > 0.5) {
      setTrackWidth(nextWidth);
    }
  };

  return (
    <View
      onLayout={handleLayout}
      accessibilityRole="tablist"
      style={[
        styles.track,
        CONTINUOUS_CORNER,
        {
          backgroundColor: theme.segmentTrack,
          borderColor: interactive.divider,
        },
      ]}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            CONTINUOUS_CORNER,
            elevation.segmentThumb,
            {
              width: segmentWidth,
              backgroundColor: theme.segmentActiveBg,
              borderColor: theme.segmentActiveBorder,
              transform: [{ translateX }],
            },
          ]}
        />
      ) : null}

      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            hitSlop={SEGMENT_HIT_SLOP}
            onPress={() => {
              if (!isSelected) {
                onChange(option.value);
              }
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            android_ripple={
              Platform.OS === 'android'
                ? {
                    color: interactive.rippleNeutral,
                    borderless: false,
                    foreground: true,
                  }
                : undefined
            }
            style={[styles.segment, CONTINUOUS_CORNER]}
          >
            <View style={styles.labelRow}>
              <Text
                numberOfLines={1}
                style={[
                  TYPOGRAPHY.footnote,
                  {
                    fontWeight: isSelected ? '600' : '500',
                    color: isSelected ? theme.text : theme.textMuted,
                  },
                ]}
              >
                {option.label}
              </Text>
              {option.hasIndicator ? (
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isSelected ? theme.accent : theme.onIcon,
                    },
                  ]}
                />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    position: 'relative',
    padding: TRACK_PADDING,
    borderRadius: RADII.md,
    borderWidth: LAYOUT.borderWidth,
    minHeight: 32,
  },
  thumb: {
    position: 'absolute',
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: TRACK_PADDING,
    borderRadius: RADII.sm,
    borderWidth: LAYOUT.borderWidth,
  },
  segment: {
    flex: 1,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.sm,
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: RADII.pill,
  },
});
