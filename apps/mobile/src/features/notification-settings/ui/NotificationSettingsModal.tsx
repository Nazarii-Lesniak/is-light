import { useAppStore, useAppTheme } from '@/entities/location/model/store';
import {
  CONTINUOUS_CORNER,
  LAYOUT,
  RADII,
  SPACING,
  TABULAR_NUMS,
  TYPOGRAPHY,
} from '@/shared/theme/tokens';
import { AppBottomSheet } from '@/shared/ui/AppBottomSheet';
import { InteractiveSurface } from '@/shared/ui/InteractiveSurface';
import { REMINDER_MINUTES_OPTIONS, type ReminderMinutes } from '@is-light/shared';
import { Bell, Info } from 'lucide-react-native';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';

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
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title="Сповіщення"
      subtitle="Нагадування працюють для основної локації навіть без інтернету"
      icon={<Bell size={20} color={theme.accent} strokeWidth={2.2} />}
    >
      <View
        style={[
          styles.switchCard,
          CONTINUOUS_CORNER,
          {
            backgroundColor: theme.surfaceInput,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.switchTextWrap}>
          <Text style={[TYPOGRAPHY.headline, { color: theme.text }]}>
            Нагадувати перед відключенням
          </Text>
          <Text style={[TYPOGRAPHY.footnote, TABULAR_NUMS, { color: theme.textMuted }]}>
            {isEnabled
              ? `Сповіщення прийде за ${reminderMinutes} хв до вимкнення світла`
              : 'Локальні нагадування вимкнено'}
          </Text>
        </View>

        <Switch
          value={isEnabled}
          onValueChange={toggleRemindersEnabled}
          trackColor={{
            false: theme.border,
            true: Platform.OS === 'ios' ? theme.accent : theme.accentSoft,
          }}
          thumbColor={
            Platform.OS === 'android' ? (isEnabled ? theme.accent : theme.surfaceMuted) : undefined
          }
          ios_backgroundColor={theme.border}
        />
      </View>

      <Text style={[TYPOGRAPHY.caption, styles.sectionLabel, { color: theme.textMuted }]}>
        ІНТЕРВАЛ НАГАДУВАННЯ
      </Text>

      <View style={styles.chipsWrap}>
        {ACTIVE_INTERVALS.map((minutes) => {
          const selected = reminderMinutes === minutes;
          return (
            <InteractiveSurface
              key={minutes}
              onPress={() => setReminderMinutes(minutes)}
              rippleTone={selected ? 'accent' : 'neutral'}
              borderRadius={RADII.md}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              contentStyle={[
                styles.chip,
                {
                  backgroundColor: selected ? theme.accent : theme.surfaceInput,
                  borderColor: selected ? theme.accent : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  TYPOGRAPHY.callout,
                  TABULAR_NUMS,
                  {
                    fontWeight: '600',
                    color: selected ? theme.accentOnSolid : theme.textSecondary,
                  },
                ]}
              >
                {minutes} хв
              </Text>
            </InteractiveSurface>
          );
        })}

        <InteractiveSurface
          onPress={() => setReminderMinutes(0)}
          borderRadius={RADII.md}
          accessibilityRole="button"
          accessibilityState={{ selected: reminderMinutes === 0 }}
          contentStyle={[
            styles.chip,
            {
              backgroundColor: reminderMinutes === 0 ? theme.text : theme.surfaceInput,
              borderColor: reminderMinutes === 0 ? theme.text : theme.border,
            },
          ]}
        >
          <Text
            style={[
              TYPOGRAPHY.callout,
              {
                fontWeight: '600',
                color: reminderMinutes === 0 ? theme.bg : theme.textSecondary,
              },
            ]}
          >
            Вимкнено
          </Text>
        </InteractiveSurface>
      </View>

      <View
        style={[
          styles.infoCard,
          CONTINUOUS_CORNER,
          {
            backgroundColor: theme.surfaceInput,
            borderColor: theme.border,
          },
        ]}
      >
        <Info
          size={17}
          color={expoPushToken ? theme.onIcon : theme.partialIcon}
          style={styles.infoIcon}
        />
        <View style={styles.infoTextWrap}>
          <Text style={[TYPOGRAPHY.subhead, styles.infoTitle, { color: theme.text }]}>
            {expoPushToken
              ? 'Фонові push-сповіщення про зміну графіка активні'
              : 'Фонові push-сповіщення обмежені'}
          </Text>
          <Text style={[TYPOGRAPHY.footnote, styles.infoBody, { color: theme.textSecondary }]}>
            {expoPushToken
              ? 'Ви автоматично отримаєте повідомлення, щойно Львівобленерго оновить графік для вашої основної групи.'
              : (remotePushNotice ??
                'Віддалені push-сповіщення наразі недоступні, але локальні нагадування перед відключенням працюють у звичайному режимі.')}
          </Text>
        </View>
      </View>

      <InteractiveSurface
        onPress={onClose}
        rippleTone="accent"
        borderRadius={RADII.lg}
        accessibilityRole="button"
        style={styles.doneOuter}
        contentStyle={[styles.doneButton, { backgroundColor: theme.accent }]}
      >
        <Text style={[TYPOGRAPHY.headline, { color: theme.accentOnSolid }]}>Готово</Text>
      </InteractiveSurface>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    borderRadius: RADII.lg,
    borderWidth: LAYOUT.borderWidth,
    padding: SPACING.md,
  },
  switchTextWrap: {
    flex: 1,
    gap: 3,
  },
  sectionLabel: {
    marginTop: SPACING.md,
    letterSpacing: 0.6,
  },
  chipsWrap: {
    marginTop: SPACING.xs + 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 1,
    borderRadius: RADII.md,
    borderWidth: LAYOUT.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm - 2,
    borderRadius: RADII.lg,
    borderWidth: LAYOUT.borderWidth,
    padding: SPACING.sm + 2,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoTextWrap: {
    flex: 1,
    gap: 3,
  },
  infoTitle: {
    fontWeight: '600',
  },
  infoBody: {
    lineHeight: 17,
  },
  doneOuter: {
    marginTop: SPACING.lg,
  },
  doneButton: {
    minHeight: 50,
    borderRadius: RADII.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
