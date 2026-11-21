import { apiRequest } from '@/shared/api/client';
import type { UpsertSubscriptionInput } from '@is-light/shared';

export async function upsertPushSubscription(input: UpsertSubscriptionInput): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/subscriptions', {
    method: 'POST',
    body: input,
  });
}

export async function deletePushSubscription(expoPushToken: string): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/subscriptions', {
    method: 'DELETE',
    body: { expoPushToken },
  });
}
