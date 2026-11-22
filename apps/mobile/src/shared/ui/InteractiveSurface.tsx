import { useAppTheme } from '@/entities/location/model/store';
import {
  CONTINUOUS_CORNER,
  HIT_SLOP_STANDARD,
  MOTION,
  getInteractiveTokens,
} from '@/shared/theme/tokens';
import { type ReactNode, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type PressScaleVariant = 'button' | 'card' | 'cell' | 'none';

interface InteractiveSurfaceProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  scaleVariant?: PressScaleVariant;
  rippleTone?: 'neutral' | 'accent';
  borderRadius?: number;
}

const SCALE_BY_VARIANT: Readonly<Record<PressScaleVariant, number>> = {
  button: MOTION.pressScaleButton,
  card: MOTION.pressScaleCard,
  cell: MOTION.pressScaleCell,
  none: 1,
};

export function InteractiveSurface({
  children,
  style,
  contentStyle,
  scaleVariant = 'button',
  rippleTone = 'neutral',
  borderRadius,
  disabled,
  onPressIn,
  onPressOut,
  hitSlop = HIT_SLOP_STANDARD,
  ...rest
}: InteractiveSurfaceProps) {
  const theme = useAppTheme();
  const interactive = getInteractiveTokens(theme);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const targetScale = SCALE_BY_VARIANT[scaleVariant];

  const handlePressIn: NonNullable<PressableProps['onPressIn']> = (event) => {
    if (!disabled) {
      const animations: Animated.CompositeAnimation[] = [];
      if (targetScale !== 1) {
        animations.push(
          Animated.spring(scaleAnim, {
            toValue: targetScale,
            tension: 340,
            friction: 22,
            useNativeDriver: true,
          }),
        );
      }
      if (Platform.OS === 'ios') {
        animations.push(
          Animated.timing(opacityAnim, {
            toValue: MOTION.pressOpacityIos,
            duration: 90,
            useNativeDriver: true,
          }),
        );
      }
      if (animations.length > 0) {
        Animated.parallel(animations).start();
      }
    }
    onPressIn?.(event);
  };

  const handlePressOut: NonNullable<PressableProps['onPressOut']> = (event) => {
    const animations: Animated.CompositeAnimation[] = [];
    if (targetScale !== 1) {
      animations.push(
        Animated.spring(scaleAnim, {
          toValue: 1,
          ...MOTION.springSnappy,
        }),
      );
    }
    if (Platform.OS === 'ios') {
      animations.push(
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: MOTION.durationFast,
          useNativeDriver: true,
        }),
      );
    }
    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }
    onPressOut?.(event);
  };

  const rippleColor =
    rippleTone === 'accent' ? interactive.rippleAccent : interactive.rippleNeutral;

  return (
    <Animated.View
      style={[
        CONTINUOUS_CORNER,
        borderRadius !== undefined ? { borderRadius } : undefined,
        style,
        {
          transform: [{ scale: scaleAnim }],
          opacity: disabled ? MOTION.disabledOpacity : opacityAnim,
        },
      ]}
    >
      <Pressable
        disabled={disabled}
        hitSlop={hitSlop}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={
          Platform.OS === 'android'
            ? {
                color: rippleColor,
                borderless: false,
                foreground: true,
              }
            : undefined
        }
        style={[
          CONTINUOUS_CORNER,
          borderRadius !== undefined ? { borderRadius, overflow: 'hidden' } : undefined,
          contentStyle,
        ]}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
