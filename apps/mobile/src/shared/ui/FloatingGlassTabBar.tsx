import { useAppTheme } from '@/entities/location/model/store';
import { CONTINUOUS_CORNER, LAYOUT, MOTION, RADII, TYPOGRAPHY } from '@/shared/theme/tokens';
import { InteractiveSurface } from '@/shared/ui/InteractiveSurface';
import { BlurView } from 'expo-blur';
import type { Tabs } from 'expo-router';
import { type ComponentProps, useEffect, useRef, useState } from 'react';
import { Animated, type LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';

type TabBarProp = NonNullable<ComponentProps<typeof Tabs>['tabBar']>;
type FloatingGlassTabBarProps = Parameters<TabBarProp>[0];

const ROW_PADDING_H = 7;
const ROW_PADDING_V = 6;

export function FloatingGlassTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: FloatingGlassTabBarProps) {
  const theme = useAppTheme();
  const bottomOffset = Math.max(insets.bottom, 10) + 6;

  const [rowWidth, setRowWidth] = useState(0);
  const pillTranslateX = useRef(new Animated.Value(0)).current;
  const hasMeasuredRef = useRef(false);

  const tabCount = state.routes.length;
  const slotWidth = rowWidth > 0 && tabCount > 0 ? (rowWidth - ROW_PADDING_H * 2) / tabCount : 0;

  useEffect(() => {
    if (slotWidth <= 0) {
      return;
    }

    const targetX = state.index * slotWidth;
    if (!hasMeasuredRef.current) {
      pillTranslateX.setValue(targetX);
      hasMeasuredRef.current = true;
      return;
    }

    Animated.spring(pillTranslateX, {
      toValue: targetX,
      ...MOTION.springSnappy,
    }).start();
  }, [state.index, slotWidth, pillTranslateX]);

  const handleRowLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - rowWidth) > 0.5) {
      setRowWidth(width);
    }
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: bottomOffset }]}>
      <View
        style={[
          styles.shadowContainer,
          CONTINUOUS_CORNER,
          {
            shadowColor: theme.isDark ? '#000000' : '#0F172A',
            shadowOpacity: theme.isDark ? 0.45 : 0.16,
          },
        ]}
      >
        <View
          style={[
            styles.glassShell,
            CONTINUOUS_CORNER,
            {
              borderColor: theme.glassBorder,
            },
          ]}
        >
          <BlurView
            intensity={Platform.OS === 'ios' ? 75 : 55}
            tint={theme.glassTint}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: theme.glassOverlay,
              },
            ]}
          />

          <View style={styles.tabsRow} onLayout={handleRowLayout}>
            {slotWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.activePill,
                  CONTINUOUS_CORNER,
                  {
                    width: slotWidth,
                    backgroundColor: theme.glassActivePill,
                    transform: [{ translateX: pillTranslateX }],
                  },
                ]}
              />
            ) : null}

            {state.routes.map((route, index) => {
              const descriptor = descriptors[route.key];
              const options = descriptor?.options;
              const isFocused = state.index === index;

              const label =
                typeof options?.tabBarLabel === 'string'
                  ? options.tabBarLabel
                  : typeof options?.title === 'string'
                    ? options.title
                    : route.name;

              const color = isFocused ? theme.accent : theme.tabInactive;

              const onPress = () => {
                const event = emitter.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigateToTab(route.key);
                }
              };

              const onLongPress = () => {
                emitter.emit({
                  type: 'tabLongPress',
                  target: route.key,
                });
              };

              return (
                <InteractiveSurface
                  key={route.key}
                  scaleVariant="button"
                  borderRadius={RADII.xxl}
                  hitSlop={0}
                  accessibilityRole="tab"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={styles.tabSlot}
                  contentStyle={[
                    styles.tabButton,
                    slotWidth === 0 && isFocused
                      ? { backgroundColor: theme.glassActivePill }
                      : undefined,
                  ]}
                >
                  {options?.tabBarIcon?.({
                    focused: isFocused,
                    color,
                    size: 21,
                  })}
                  <Text
                    style={[
                      TYPOGRAPHY.caption,
                      {
                        color,
                        fontWeight: isFocused ? '700' : '600',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </InteractiveSurface>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 50,
  },
  shadowContainer: {
    width: '100%',
    borderRadius: 32,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 14,
  },
  glassShell: {
    width: '100%',
    borderRadius: 32,
    borderWidth: LAYOUT.borderWidth,
    overflow: 'hidden',
  },
  tabsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    paddingHorizontal: ROW_PADDING_H,
    paddingVertical: ROW_PADDING_V,
  },
  activePill: {
    position: 'absolute',
    top: ROW_PADDING_V,
    bottom: ROW_PADDING_V,
    left: ROW_PADDING_H,
    borderRadius: RADII.xxl,
  },
  tabSlot: {
    flex: 1,
    flexBasis: 0,
  },
  tabButton: {
    width: '100%',
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    gap: 3,
  },
});
