import { useAppStore, useAppTheme } from '@/entities/location/model/store';
import { THEME_LIST } from '@/shared/theme/themes';
import { LAYOUT, RADII, SPACING, TYPOGRAPHY } from '@/shared/theme/tokens';
import { AppBottomSheet } from '@/shared/ui/AppBottomSheet';
import { InteractiveSurface } from '@/shared/ui/InteractiveSurface';
import { Check, Palette } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

interface ThemePickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ThemePickerModal({ visible, onClose }: ThemePickerModalProps) {
  const theme = useAppTheme();
  const currentThemeId = useAppStore((s) => s.themeId);
  const setThemeId = useAppStore((s) => s.setThemeId);

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title="Тема оформлення"
      subtitle="Оберіть комфортну палітру для екрану"
      icon={<Palette size={20} color={theme.accent} strokeWidth={2.2} />}
    >
      <View style={styles.list}>
        {THEME_LIST.map((item) => {
          const isSelected = item.id === currentThemeId;

          return (
            <InteractiveSurface
              key={item.id}
              onPress={() => {
                setThemeId(item.id);
                onClose();
              }}
              scaleVariant="card"
              borderRadius={RADII.lg}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              contentStyle={[
                styles.themeRow,
                {
                  backgroundColor: isSelected ? theme.accentSoft : theme.surfaceInput,
                  borderColor: isSelected ? theme.accent : theme.border,
                  borderWidth: isSelected ? 1.5 : LAYOUT.borderWidth,
                },
              ]}
            >
              <View style={styles.swatches}>
                {item.previewColors.map((swatchColor, idx) => (
                  <View
                    key={`${item.id}-${swatchColor}`}
                    style={[
                      styles.swatch,
                      idx > 0 ? styles.swatchOverlap : undefined,
                      {
                        backgroundColor: swatchColor,
                        borderColor: theme.surface,
                      },
                    ]}
                  />
                ))}
              </View>

              <View style={styles.textWrap}>
                <Text style={[TYPOGRAPHY.headline, { color: theme.text }]}>{item.name}</Text>
                <Text style={[TYPOGRAPHY.footnote, { color: theme.textMuted }]}>
                  {item.subtitle}
                </Text>
              </View>

              {isSelected ? (
                <View style={[styles.checkCircle, { backgroundColor: theme.accent }]}>
                  <Check size={14} color={theme.accentOnSolid} strokeWidth={2.6} />
                </View>
              ) : null}
            </InteractiveSurface>
          );
        })}
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: SPACING.xs + 2,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm + 2,
  },
  swatches: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: RADII.pill,
    borderWidth: 2,
  },
  swatchOverlap: {
    marginLeft: -8,
  },
  textWrap: {
    flex: 1,
    gap: 1,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
