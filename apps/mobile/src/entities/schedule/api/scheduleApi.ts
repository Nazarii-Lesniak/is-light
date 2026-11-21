import { apiRequest } from '@/shared/api/client';
import {
  type GroupId,
  type GroupScheduleResponse,
  groupScheduleResponseSchema,
} from '@is-light/shared';

export async function fetchGroupSchedule(
  groupId: GroupId,
  options: { forceRefresh?: boolean; signal?: AbortSignal } = {},
): Promise<GroupScheduleResponse> {
  const query = options.forceRefresh ? '?refresh=1' : '';
  const data = await apiRequest<unknown>(`/api/schedules/${encodeURIComponent(groupId)}${query}`, {
    signal: options.signal,
  });
  return groupScheduleResponseSchema.parse(data);
}
