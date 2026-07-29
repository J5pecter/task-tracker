import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction, ApiError } from '@/lib/apiClient';
import { qk } from '@/lib/queryClient';
import type { OutlookEvent, OutlookTask, OutlookTaskList } from '@/types';

/** Returns `connected: false` (via 409) when the user hasn't linked Microsoft. */
export function useOutlookLists() {
  return useQuery({
    queryKey: qk.outlookLists,
    retry: false,
    queryFn: async () => {
      try {
        const r = await callFunction<{ lists: OutlookTaskList[] }>('outlook-tasks', {
          query: { resource: 'lists' },
        });
        return { connected: true as const, lists: r.lists };
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          return { connected: false as const, lists: [] as OutlookTaskList[] };
        }
        throw e;
      }
    },
  });
}

export function useOutlookTasks(listId: string | undefined) {
  return useQuery({
    queryKey: qk.outlookTasks(listId ?? 'none'),
    enabled: !!listId,
    queryFn: () =>
      callFunction<{ tasks: OutlookTask[] }>('outlook-tasks', {
        query: { resource: 'tasks', listId: listId! },
      }).then((r) => r.tasks),
  });
}

export function useOutlookEvents(start?: string, end?: string) {
  return useQuery({
    queryKey: [...qk.outlookEvents, start, end],
    retry: false,
    queryFn: async () => {
      try {
        const r = await callFunction<{ events: OutlookEvent[] }>('outlook-tasks', {
          query: { resource: 'events', start, end },
        });
        return r.events;
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) return [] as OutlookEvent[];
        throw e;
      }
    },
  });
}

/** Kick off the Microsoft Graph OAuth linking flow. */
export function useConnectMicrosoft() {
  return useMutation({
    mutationFn: async () => {
      const { url } = await callFunction<{ url: string }>('auth', { query: { action: 'url' } });
      window.location.href = url;
    },
  });
}

/** Force a refresh of cached Outlook data ("Sync now"). */
export function useSyncOutlook() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['outlook'] });
  };
}
