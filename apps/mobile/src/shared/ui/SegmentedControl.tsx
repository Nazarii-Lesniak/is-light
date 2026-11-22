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

const TRACK_PADDING = 3;

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
                  TYPOGRAPHY.callout,
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
    borderRadius: RADII.lg,
    borderWidth: LAYOUT.borderWidth,
    minHeight: 46,
  },
  thumb: {
    position: 'absolute',
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: TRACK_PADDING,
    borderRadius: RADII.md + 1,
    borderWidth: LAYOUT.borderWidth,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.md + 1,
    overflow: 'hidden',
    paddingHorizontal: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: RADII.pill,
  },
});
