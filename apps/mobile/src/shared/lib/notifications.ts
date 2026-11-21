import {
  type GroupId,
  type GroupScheduleResponse,
  type PushPlatform,
  type ReminderMinutes,
  getUpcomingOutageTransitions,
} from '@is-light/shared';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const OUTAGE_REMINDER_CHANNEL_ID = 'outage-reminders';
export const SCHEDULE_UPDATES_CHANNEL_ID = 'schedule-updates';

export interface PushRegistrationResult {
  token: string | null;
  platform: PushPlatform;
  permissionGranted: boolean;
  remoteUnavailableReason: string | null;
}

export function configureForegroundNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(OUTAGE_REMINDER_CHANNEL_ID, {
    name: 'Нагадування перед відключенням',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#E11D48',
  });

  await Notifications.setNotificationChannelAsync(SCHEDULE_UPDATES_CHANNEL_ID, {
    name: 'Оновлення графіків',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4F46E5',
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

export async function registerForPushNotificationsSafe(): Promise<PushRegistrationResult> {
  const platform: PushPlatform = Platform.OS === 'ios' ? 'ios' : 'android';

  try {
    await ensureNotificationChannels();
    const granted = await requestNotificationPermission();

    if (!granted) {
      return {
        token: null,
        platform,
        permissionGranted: false,
        remoteUnavailableReason:
          'Дозвіл на сповіщення не надано. Увімкніть сповіщення в налаштуваннях пристрою.',
      };
    }

    if (!Device.isDevice) {
      return {
        token: null,
        platform,
        permissionGranted: true,
        remoteUnavailableReason:
          'Віддалені push-сповіщення працюють лише на фізичному пристрої (локальні нагадування активні).',
      };
    }

    const projectId =
      Constants.easConfig?.projectId ??
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;

    if (!projectId) {
      return {
        token: null,
        platform,
        permissionGranted: true,
        remoteUnavailableReason:
          'Для віддалених push-сповіщень у режимі збірки потрібен EAS Project ID. Локальні нагадування працюють без обмежень.',
      };
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return {
      token: tokenData.data,
      platform,
      permissionGranted: true,
      remoteUnavailableReason: null,
    };
  } catch (error) {
    // Gracefully handle Expo Go iOS/Android limitations without crashing or blocking local reminders
    const isIosExpoGo = Platform.OS === 'ios' && Constants.appOwnership === 'expo';
    const reason = isIosExpoGo
      ? 'У Expo Go на iOS віддалені push-сповіщення недоступні без платного Apple Developer Account. Локальні нагадування перед відключенням працюють у звичайному режимі.'
      : error instanceof Error
        ? `Не вдалося зареєструвати віддалені push-сповіщення (${error.message}). Локальні нагадування залишаються активними.`
        : 'Віддалені push-сповіщення тимчасово недоступні. Локальні нагадування залишаються активними.';

    return {
      token: null,
      platform,
      permissionGranted: true,
      remoteUnavailableReason: reason,
    };
  }
}

export async function cancelScheduledOutageReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const outageIds = scheduled
    .filter((item) => {
      const data = item.content.data as { kind?: string } | undefined;
      return data?.kind === 'outage_reminder';
    })
    .map((item) => item.identifier);

  await Promise.all(
    outageIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
  );
}

export async function rescheduleLocalOutageReminders(params: {
  schedule: GroupScheduleResponse | null;
  reminderMinutes: ReminderMinutes;
  locationTitle: string;
  groupId: GroupId;
}): Promise<number> {
  await cancelScheduledOutageReminders();

  if (params.reminderMinutes <= 0 || !params.schedule) {
    return 0;
  }

  const granted = await requestNotificationPermission().catch(() => false);
  if (!granted) {
    return 0;
  }

  await ensureNotificationChannels().catch(() => {});

  const now = new Date();
  const transitions = getUpcomingOutageTransitions(
    params.schedule.today,
    params.schedule.tomorrow,
    now,
  );

  let scheduledCount = 0;

  for (const transition of transitions) {
    const triggerTimeMs = transition.startAt.getTime() - params.reminderMinutes * 60_000;
    if (triggerTimeMs <= now.getTime() + 5_000) {
      continue;
    }

    const timeRange = transition.endLabel
      ? `з ${transition.startLabel} до ${transition.endLabel}`
      : `о ${transition.startLabel}`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Через ${params.reminderMinutes} хв відключення світла`,
        body: `${params.locationTitle} (Група ${params.groupId}): вимкнення ${timeRange}.`,
        sound: true,
        data: {
          kind: 'outage_reminder',
          groupId: params.groupId,
          startAt: transition.startAt.toISOString(),
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(triggerTimeMs),
        channelId: Platform.OS === 'android' ? OUTAGE_REMINDER_CHANNEL_ID : undefined,
      },
    });
    scheduledCount += 1;
  }

  return scheduledCount;
}
