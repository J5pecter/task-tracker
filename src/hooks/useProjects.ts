import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '@/lib/apiClient';
import { qk } from '@/lib/queryClient';
import type { List, Workspace } from '@/types';

export function useWorkspaces() {
  return useQuery({
    queryKey: qk.workspaces,
    queryFn: () =>
      callFunction<{ workspaces: Workspace[] }>('projects', {
        query: { resource: 'workspaces' },
      }).then((r) => r.workspaces),
  });
}

export function useLists(workspaceId: string | undefined) {
  return useQuery({
    queryKey: qk.lists(workspaceId ?? 'none'),
    enabled: !!workspaceId,
    queryFn: () =>
      callFunction<{ lists: List[] }>('projects', {
        query: { resource: 'lists', workspaceId: workspaceId! },
      }).then((r) => r.lists),
  });
}

export function useList(listId: string | undefined) {
  return useQuery({
    queryKey: qk.list(listId ?? 'none'),
    enabled: !!listId,
    queryFn: () =>
      callFunction<{ list: List }>('projects', {
        query: { resource: 'list', id: listId! },
      }).then((r) => r.list),
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; color?: string }) =>
      callFunction<{ workspace: Workspace }>('projects', {
        method: 'POST',
        query: { resource: 'workspace' },
        body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.workspaces }),
  });
}

export function useCreateList(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; workspace_id: string; folder_id?: string | null }) =>
      callFunction<{ list: List }>('projects', {
        method: 'POST',
        query: { resource: 'list' },
        body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.lists(workspaceId) }),
  });
}

export function useUpdateList(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<List> }) =>
      callFunction<{ list: List }>('projects', {
        method: 'PATCH',
        query: { resource: 'list', id },
        body: patch,
      }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: qk.lists(workspaceId) });
      qc.invalidateQueries({ queryKey: qk.list(v.id) });
    },
  });
}

export function useDeleteList(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      callFunction('projects', { method: 'DELETE', query: { resource: 'list', id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.lists(workspaceId) }),
  });
}
