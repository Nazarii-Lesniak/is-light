import { selectPrimaryLocation, useAppStore } from '@/entities/location/model/store';
import { getLocationDisplayTitle } from '@/entities/location/model/types';
import { fetchGroupSchedule } from '@/entities/schedule/api/scheduleApi';
import {
  cancelScheduledOutageReminders,
  configureForegroundNotificationHandler,
  registerForPushNotificationsSafe,
  rescheduleLocalOutageReminders,
} from '@/shared/lib/notifications';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { deletePushSubscription, upsertPushSubscription } from '../api/subscriptionApi';

const FOREGROUND_REFRESH_MIN_INTERVAL_MS = 2 * 60_000;

export function usePushSync(): void {
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const primaryLocation = useAppStore(selectPrimaryLocation);
  const schedulesByGroup = useAppStore((s) => s.schedulesByGroup);
  const setScheduleForGroup = useAppStore((s) => s.setScheduleForGroup);
  const reminderMinutes = useAppStore((s) => s.reminderMinutes);
  const expoPushToken = useAppStore((s) => s.expoPushToken);
  const pushPlatform = useAppStore((s) => s.pushPlatform);
  const setPushRegistration = useAppStore((s) => s.setPushRegistration);

  const lastForegroundRefreshRef = useRef<number>(Date.now());
  const appStateRef = useRef<string>(AppState.currentState ?? 'active');

  const primaryGroupId = primaryLocation?.groupId ?? null;
  const primaryTitle = primaryLocation ? getLocationDisplayTitle(primaryLocation) : null;
  const primarySchedule = primaryGroupId ? (schedulesByGroup[primaryGroupId] ?? null) : null;

  useEffect(() => {
    configureForegroundNotificationHandler();
    let active = true;

    registerForPushNotificationsSafe()
      .then((res) => {
        if (!active) {
          return;
        }
        setPushRegistration({
          token: res.token,
          platform: res.platform,
          notice: res.remoteUnavailableReason,
        });
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [setPushRegistration]);

  useEffect(() => {
    if (!hasHydrated || !expoPushToken || !pushPlatform) {
      return;
    }

    if (primaryGroupId) {
      upsertPushSubscription({
        expoPushToken,
        groupId: primaryGroupId,
        platform: pushPlatform,
      }).catch(() => {});
    } else {
      deletePushSubscription(expoPushToken).catch(() => {});
    }
  }, [hasHydrated, expoPushToken, pushPlatform, primaryGroupId]);

  useEffect(() => {
    if (!hasHydrated || !primaryGroupId) {
      return;
    }

    const refreshPrimarySchedule = (forceRefresh: boolean) => {
      lastForegroundRefreshRef.current = Date.now();
      fetchGroupSchedule(primaryGroupId, { forceRefresh })
        .then((data) => {
          setScheduleForGroup(primaryGroupId, data);
        })
        .catch(() => {});
    };

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as { type?: string } | undefined;
      if (data?.type === 'schedule_updated') {
        refreshPrimarySchedule(false);
      }
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { type?: string } | undefined;
      if (data?.type === 'schedule_updated') {
        refreshPrimarySchedule(false);
      }
    });

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      const cameFromBackground = prevState === 'background' || prevState === 'inactive';
      const isStale =
        Date.now() - lastForegroundRefreshRef.current >= FOREGROUND_REFRESH_MIN_INTERVAL_MS;

      if (cameFromBackground && nextState === 'active' && isStale) {
        refreshPrimarySchedule(false);
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
      appStateSub.remove();
    };
  }, [hasHydrated, primaryGroupId, setScheduleForGroup]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!primaryGroupId || !primaryTitle || reminderMinutes === 0) {
      cancelScheduledOutageReminders().catch(() => {});
      return;
    }

    rescheduleLocalOutageReminders({
      schedule: primarySchedule,
      reminderMinutes,
      locationTitle: primaryTitle,
      groupId: primaryGroupId,
    }).catch(() => {});
  }, [hasHydrated, primaryGroupId, primaryTitle, primarySchedule, reminderMinutes]);
}
