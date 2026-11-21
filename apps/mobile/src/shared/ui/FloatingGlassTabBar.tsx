import { useAppTheme } from '@/entities/location/model/store';
import { BlurView } from 'expo-blur';
import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type TabBarProp = NonNullable<ComponentProps<typeof Tabs>['tabBar']>;
type FloatingGlassTabBarProps = Parameters<TabBarProp>[0];

export function FloatingGlassTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: FloatingGlassTabBarProps) {
  const theme = useAppTheme();
  const bottomOffset = Math.max(insets.bottom, 10) + 6;

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: bottomOffset }]}>
      <View
        style={[
          styles.shadowContainer,
          {
            shadowColor: theme.isDark ? '#000000' : '#0F172A',
            shadowOpacity: theme.isDark ? 0.45 : 0.16,
          },
        ]}
      >
        <View
          style={[
            styles.glassShell,
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

          <View style={styles.tabsRow}>
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
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={[
                    styles.tabButton,
                    isFocused && {
                      backgroundColor: theme.glassActivePill,
                    },
                  ]}
                >
                  {options?.tabBarIcon?.({
                    focused: isFocused,
                    color,
                    size: 22,
                  })}
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color,
                        fontWeight: isFocused ? '700' : '600',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </Pressable>
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
    borderRadius: 32,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 14,
  },
  glassShell: {
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 24,
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
  },
});
