import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Centralized query keys keep cache invalidation consistent across hooks.
export const qk = {
  profile: ['profile'] as const,
  workspaces: ['workspaces'] as const,
  lists: (workspaceId: string) => ['lists', workspaceId] as const,
  list: (listId: string) => ['list', listId] as const,
  tasks: (listId: string) => ['tasks', listId] as const,
  task: (taskId: string) => ['task', taskId] as const,
  myTasks: ['my-tasks'] as const,
  search: (q: string) => ['search', q] as const,
  comments: (taskId: string) => ['comments', taskId] as const,
  timeEntries: (taskId: string) => ['time-entries', taskId] as const,
  customFields: (listId: string) => ['custom-fields', listId] as const,
  outlookLists: ['outlook', 'lists'] as const,
  outlookTasks: (listId: string) => ['outlook', 'tasks', listId] as const,
  outlookEvents: ['outlook', 'events'] as const,
};
