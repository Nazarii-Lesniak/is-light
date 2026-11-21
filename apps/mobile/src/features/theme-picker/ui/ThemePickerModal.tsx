import { useAppStore, useAppTheme } from '@/entities/location/model/store';
import { THEME_LIST } from '@/shared/theme/themes';
import { Check, Palette, X } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';

interface ThemePickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ThemePickerModal({ visible, onClose }: ThemePickerModalProps) {
  const theme = useAppTheme();
  const currentThemeId = useAppStore((s) => s.themeId);
  const setThemeId = useAppStore((s) => s.setThemeId);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable
          className="rounded-t-3xl px-5 pb-8 pt-4"
          style={{
            backgroundColor: theme.surface,
            borderTopWidth: 1,
            borderTopColor: theme.border,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            className="mb-3 h-1.5 w-12 self-center rounded-full"
            style={{ backgroundColor: theme.border }}
          />

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Palette size={20} color={theme.accent} />
              <Text className="text-lg font-bold" style={{ color: theme.text }}>
                Тема оформлення
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.surfaceMuted }}
              accessibilityLabel="Закрити"
            >
              <X size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

          <Text className="mt-1 text-sm" style={{ color: theme.textMuted }}>
            Оберіть комфортну палітру для екрану
          </Text>

          <View className="mt-4 gap-2.5">
            {THEME_LIST.map((item) => {
              const isSelected = item.id === currentThemeId;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setThemeId(item.id);
                    onClose();
                  }}
                  className="flex-row items-center rounded-2xl border p-3.5"
                  style={{
                    backgroundColor: isSelected ? theme.accentSoft : theme.surfaceInput,
                    borderColor: isSelected ? theme.accent : theme.border,
                  }}
                >
                  <View className="flex-row items-center gap-1.5">
                    {item.previewColors.map((swatchColor) => (
                      <View
                        key={`${item.id}-${swatchColor}`}
                        className="h-7 w-7 rounded-full border"
                        style={{
                          backgroundColor: swatchColor,
                          borderColor: theme.border,
                        }}
                      />
                    ))}
                  </View>

                  <View className="ml-3.5 flex-1">
                    <Text className="text-sm font-bold" style={{ color: theme.text }}>
                      {item.name}
                    </Text>
                    <Text className="text-xs" style={{ color: theme.textMuted }}>
                      {item.subtitle}
                    </Text>
                  </View>

                  {isSelected ? (
                    <View
                      className="h-7 w-7 items-center justify-center rounded-full"
                      style={{ backgroundColor: theme.accent }}
                    >
                      <Check size={15} color={theme.accentOnSolid} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
