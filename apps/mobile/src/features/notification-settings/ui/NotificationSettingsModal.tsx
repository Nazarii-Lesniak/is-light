import { useAppStore, useAppTheme } from '@/entities/location/model/store';
import { REMINDER_MINUTES_OPTIONS, type ReminderMinutes } from '@is-light/shared';
import { Bell, Info, X } from 'lucide-react-native';
import { Modal, Pressable, Switch, Text, View } from 'react-native';

interface NotificationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const ACTIVE_INTERVALS = REMINDER_MINUTES_OPTIONS.filter(
  (value): value is Exclude<ReminderMinutes, 0> => value > 0,
);

export function NotificationSettingsModal({ visible, onClose }: NotificationSettingsModalProps) {
  const theme = useAppTheme();
  const reminderMinutes = useAppStore((s) => s.reminderMinutes);
  const setReminderMinutes = useAppStore((s) => s.setReminderMinutes);
  const toggleRemindersEnabled = useAppStore((s) => s.toggleRemindersEnabled);
  const expoPushToken = useAppStore((s) => s.expoPushToken);
  const remotePushNotice = useAppStore((s) => s.remotePushNotice);

  const isEnabled = reminderMinutes > 0;

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
              <Bell size={20} color={theme.accent} />
              <Text className="text-lg font-bold" style={{ color: theme.text }}>
                Сповіщення
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
            Нагадування працюють для основної локації навіть без інтернету
          </Text>

          <View
            className="mt-4 flex-row items-center justify-between rounded-2xl border p-4"
            style={{
              backgroundColor: theme.surfaceInput,
              borderColor: theme.border,
            }}
          >
            <View className="flex-1 pr-3">
              <Text className="text-base font-semibold" style={{ color: theme.text }}>
                Нагадувати перед відключенням
              </Text>
              <Text className="mt-0.5 text-xs" style={{ color: theme.textMuted }}>
                {isEnabled
                  ? `Сповіщення прийде за ${reminderMinutes} хв до вимкнення світла`
                  : 'Локальні нагадування вимкнено'}
              </Text>
            </View>

            <Switch
              value={isEnabled}
              onValueChange={toggleRemindersEnabled}
              trackColor={{ false: theme.border, true: theme.accentSoft }}
              thumbColor={isEnabled ? theme.accent : theme.surfaceMuted}
            />
          </View>

          <Text
            className="mt-4 text-xs font-semibold uppercase tracking-wide"
            style={{ color: theme.textMuted }}
          >
            Інтервал нагадування
          </Text>

          <View className="mt-2.5 flex-row flex-wrap gap-2">
            {ACTIVE_INTERVALS.map((minutes) => {
              const selected = reminderMinutes === minutes;
              return (
                <Pressable
                  key={minutes}
                  onPress={() => setReminderMinutes(minutes)}
                  className="rounded-xl border px-4 py-2.5"
                  style={{
                    backgroundColor: selected ? theme.accent : theme.surfaceInput,
                    borderColor: selected ? theme.accent : theme.border,
                  }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{
                      color: selected ? theme.accentOnSolid : theme.textSecondary,
                    }}
                  >
                    {minutes} хв
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => setReminderMinutes(0)}
              className="rounded-xl border px-4 py-2.5"
              style={{
                backgroundColor: reminderMinutes === 0 ? theme.text : theme.surfaceInput,
                borderColor: reminderMinutes === 0 ? theme.text : theme.border,
              }}
            >
              <Text
                className="text-sm font-semibold"
                style={{
                  color: reminderMinutes === 0 ? theme.bg : theme.textSecondary,
                }}
              >
                Вимкнено
              </Text>
            </Pressable>
          </View>

          <View
            className="mt-5 rounded-2xl border p-3.5"
            style={{
              backgroundColor: theme.surfaceInput,
              borderColor: theme.border,
            }}
          >
            <View className="flex-row items-start gap-2.5">
              <Info size={16} color={expoPushToken ? theme.onIcon : theme.partialIcon} />
              <View className="flex-1">
                <Text className="text-xs font-semibold" style={{ color: theme.text }}>
                  {expoPushToken
                    ? 'Фонові push-сповіщення про зміну графіка активні'
                    : 'Фонові push-сповіщення обмежені'}
                </Text>
                <Text className="mt-0.5 text-xs leading-4" style={{ color: theme.textSecondary }}>
                  {expoPushToken
                    ? 'Ви автоматично отримаєте повідомлення, щойно Львівобленерго оновить графік для вашої основної групи.'
                    : (remotePushNotice ??
                      'Віддалені push-сповіщення наразі недоступні, але локальні нагадування перед відключенням працюють у звичайному режимі.')}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            className="mt-5 items-center rounded-2xl py-3.5"
            style={{ backgroundColor: theme.accent }}
          >
            <Text className="text-sm font-semibold" style={{ color: theme.accentOnSolid }}>
              Готово
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
