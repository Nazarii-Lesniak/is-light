import { Platform, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import type { AppTheme } from './themes';

export const SPACING = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const LAYOUT = {
  screenHorizontal: SPACING.md,
  sectionGap: SPACING.md,
  cardPadding: SPACING.md,
  cardPaddingCompact: SPACING.sm,
  tabBarClearance: 112,
  minTouchTarget: Platform.select({ ios: 44, android: 48, default: 44 }),
  iconButtonVisualSize: 44,
  borderWidth: Platform.select({
    ios: StyleSheet.hairlineWidth,
    android: 1,
    default: 1,
  }),
} as const;

export const RADII = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 9999,
} as const;

export const CONTINUOUS_CORNER: ViewStyle = Platform.select({
  ios: { borderCurve: 'continuous' } as ViewStyle,
  default: {},
});

export const TABULAR_NUMS: TextStyle = {
  fontVariant: ['tabular-nums'],
};

export const TYPOGRAPHY: Readonly<Record<string, TextStyle>> = {
  largeTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: Platform.select({ ios: -0.5, default: -0.25 }),
  },
  metricHero: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: Platform.select({ ios: -0.6, default: -0.3 }),
    ...TABULAR_NUMS,
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: Platform.select({ ios: -0.35, default: -0.15 }),
  },
  title3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: Platform.select({ ios: -0.25, default: 0 }),
  },
  headline: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: Platform.select({ ios: -0.2, default: 0 }),
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
    letterSpacing: Platform.select({ ios: -0.1, default: 0 }),
  },
  callout: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: Platform.select({ ios: -0.05, default: 0 }),
  },
  subhead: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0,
  },
  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
};

export const MOTION = {
  pressScaleButton: 0.96,
  pressScaleCard: 0.985,
  pressScaleCell: 0.94,
  pressOpacityIos: 0.86,
  disabledOpacity: 0.45,
  durationFast: 140,
  durationNormal: 220,
  springSnappy: {
    tension: 260,
    friction: 24,
    useNativeDriver: true,
  },
  springGentle: {
    tension: 180,
    friction: 22,
    useNativeDriver: true,
  },
} as const;

export const HIT_SLOP_STANDARD = {
  top: 6,
  right: 6,
  bottom: 6,
  left: 6,
} as const;

export interface ThemeElevation {
  card: ViewStyle;
  segmentThumb: ViewStyle;
  subtle: ViewStyle;
}

export interface InteractiveColorTokens {
  pressedSurface: string;
  rippleNeutral: string;
  rippleAccent: string;
  divider: string;
  skeletonBase: string;
}

export function getElevation(theme: AppTheme): ThemeElevation {
  if (Platform.OS === 'android') {
    return {
      card: {
        elevation: theme.isDark ? 1 : 2,
      },
      segmentThumb: {
        elevation: theme.isDark ? 1 : 2,
      },
      subtle: {
        elevation: theme.isDark ? 0 : 1,
      },
    };
  }

  return {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme.isDark ? 0.28 : 0.06,
      shadowRadius: 12,
    },
    segmentThumb: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: theme.isDark ? 0.3 : 0.1,
      shadowRadius: 3,
    },
    subtle: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDark ? 0.2 : 0.04,
      shadowRadius: 6,
    },
  };
}

export function getInteractiveTokens(theme: AppTheme): InteractiveColorTokens {
  return {
    pressedSurface: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.05)',
    rippleNeutral: theme.isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(15, 23, 42, 0.09)',
    rippleAccent: theme.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.28)',
    divider: theme.isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(15, 23, 42, 0.08)',
    skeletonBase: theme.surfaceMuted,
  };
}
