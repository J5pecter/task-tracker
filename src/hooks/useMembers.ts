import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '@/lib/apiClient';
import type { WorkspaceInvite, WorkspaceMember } from '@/types';

function key(workspaceId: string) {
  return ['members', workspaceId] as const;
}

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: key(workspaceId ?? 'none'),
    enabled: !!workspaceId,
    queryFn: () =>
      callFunction<{ members: WorkspaceMember[]; invites: WorkspaceInvite[] }>('members', {
        query: { workspaceId: workspaceId! },
      }),
  });
}

export function useInviteMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; role?: string }) =>
      callFunction<{ added?: boolean; invited?: boolean }>('members', {
        method: 'POST',
        query: { workspaceId },
        body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(workspaceId) }),
  });
}

export function useRemoveMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      callFunction('members', { method: 'DELETE', query: { workspaceId, userId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(workspaceId) }),
  });
}

export function useCancelInvite(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      callFunction('members', { method: 'DELETE', query: { action: 'invite', id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(workspaceId) }),
  });
}
