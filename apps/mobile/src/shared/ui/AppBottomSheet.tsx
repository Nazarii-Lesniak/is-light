import { useAppTheme } from '@/entities/location/model/store';
import {
  CONTINUOUS_CORNER,
  HIT_SLOP_STANDARD,
  LAYOUT,
  MOTION,
  RADII,
  SPACING,
  TYPOGRAPHY,
} from '@/shared/theme/tokens';
import { InteractiveSurface } from '@/shared/ui/InteractiveSurface';
import { X } from 'lucide-react-native';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  avoidKeyboard?: boolean;
  maxHeightRatio?: number;
  children: ReactNode;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function AppBottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  avoidKeyboard = false,
  maxHeightRatio = 0.85,
  children,
}: AppBottomSheetProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [rendered, setRendered] = useState(visible);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.45)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(48);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: MOTION.durationNormal,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          ...MOTION.springGentle,
        }),
      ]).start();
      return;
    }

    if (!rendered) {
      return;
    }

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: MOTION.durationFast,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 40,
        duration: MOTION.durationFast,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setRendered(false);
      }
    });
  }, [visible, rendered, backdropOpacity, sheetTranslateY]);

  if (!rendered) {
    return null;
  }

  const sheetContent = (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          {
            opacity: backdropOpacity,
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Закрити" />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          CONTINUOUS_CORNER,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            maxHeight: `${Math.round(maxHeightRatio * 100)}%`,
            paddingBottom: Math.max(insets.bottom, SPACING.md) + SPACING.xs,
            transform: [{ translateY: sheetTranslateY }],
            opacity: backdropOpacity,
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: theme.border }]} />

        <View style={styles.header}>
          <View style={styles.titleWrap}>
            {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
            <Text style={[TYPOGRAPHY.title3, styles.titleText, { color: theme.text }]}>
              {title}
            </Text>
          </View>

          <InteractiveSurface
            onPress={onClose}
            hitSlop={HIT_SLOP_STANDARD}
            accessibilityRole="button"
            accessibilityLabel="Закрити"
            borderRadius={RADII.pill}
            contentStyle={[styles.closeButton, { backgroundColor: theme.surfaceMuted }]}
          >
            <X size={17} color={theme.textSecondary} strokeWidth={2.2} />
          </InteractiveSurface>
        </View>

        {subtitle ? (
          <Text style={[TYPOGRAPHY.subhead, styles.subtitle, { color: theme.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}

        <View style={styles.body}>{children}</View>
      </Animated.View>
    </View>
  );

  return (
    <Modal
      visible={rendered}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {sheetContent}
        </KeyboardAvoidingView>
      ) : (
        sheetContent
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  sheet: {
    borderTopLeftRadius: RADII.xxl,
    borderTopRightRadius: RADII.xxl,
    borderTopWidth: LAYOUT.borderWidth,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: RADII.pill,
    alignSelf: 'center',
    marginBottom: SPACING.sm + 2,
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    flexShrink: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: SPACING.xxs + 1,
  },
  body: {
    marginTop: SPACING.md,
  },
});
