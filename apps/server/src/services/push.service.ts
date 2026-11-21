import { type GroupId, formatUkrainianDateLabel } from '@is-light/shared';
import { eq, inArray } from 'drizzle-orm';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import type { Database } from '../db/index.js';
import { pushSubscriptions } from '../db/schema.js';

export interface GroupNotificationPayload {
  groupId: GroupId;
  changedDates: string[];
}

export class PushService {
  private readonly expo = new Expo();

  constructor(private readonly db: Database) {}

  async notifyGroupScheduleUpdated(payload: GroupNotificationPayload): Promise<number> {
    const subscribers = await this.db
      .select({
        expoPushToken: pushSubscriptions.expoPushToken,
      })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.groupId, payload.groupId));

    if (subscribers.length === 0) {
      return 0;
    }

    const formattedDates = payload.changedDates.map(formatUkrainianDateLabel).join(', ');
    const title = `Оновлено графік для групи ${payload.groupId}`;
    const body =
      formattedDates.length > 0
        ? `Перевірте актуальні години відключень на ${formattedDates}.`
        : 'Змінився графік відключень світла у Львові. Відкрийте додаток для деталей.';

    return this.sendMessagesToTokens(
      subscribers.map((sub) => sub.expoPushToken),
      {
        title,
        body,
        data: {
          type: 'schedule_updated',
          groupId: payload.groupId,
          dates: payload.changedDates,
        },
      },
    );
  }

  async sendTestPush(options: {
    expoPushToken?: string;
    groupId?: GroupId;
    title?: string;
    body?: string;
  }): Promise<number> {
    let tokens: string[] = [];

    if (options.expoPushToken) {
      tokens = [options.expoPushToken];
    } else if (options.groupId) {
      const rows = await this.db
        .select({ expoPushToken: pushSubscriptions.expoPushToken })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.groupId, options.groupId));
      tokens = rows.map((r) => r.expoPushToken);
    }

    if (tokens.length === 0) {
      return 0;
    }

    return this.sendMessagesToTokens(tokens, {
      title: options.title ?? 'Тестове сповіщення «Є Світло»',
      body: options.body ?? 'Push-сповіщення працюють коректно!',
      data: { type: 'test_push', groupId: options.groupId ?? null },
    });
  }

  private async sendMessagesToTokens(
    tokens: string[],
    content: { title: string; body: string; data: Record<string, unknown> },
  ): Promise<number> {
    const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));
    if (validTokens.length === 0) {
      return 0;
    }

    const messages: ExpoPushMessage[] = validTokens.map((to) => ({
      to,
      sound: 'default',
      title: content.title,
      body: content.body,
      data: content.data,
      priority: 'high',
      channelId: 'schedule-updates',
    }));

    const chunks = this.expo.chunkPushNotifications(messages);
    const invalidTokens: string[] = [];
    let sentCount = 0;

    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.forEach((ticket, index) => {
          if (ticket.status === 'ok') {
            sentCount += 1;
          } else if (ticket.details?.error === 'DeviceNotRegistered') {
            const msg = chunk[index];
            if (msg && typeof msg.to === 'string') {
              invalidTokens.push(msg.to);
            }
          }
        });
      } catch (error) {
        console.error('Помилка відправки чанку Expo Push:', error);
      }
    }

    if (invalidTokens.length > 0) {
      await this.db
        .delete(pushSubscriptions)
        .where(inArray(pushSubscriptions.expoPushToken, invalidTokens))
        .catch(() => {});
    }

    return sentCount;
  }
}
