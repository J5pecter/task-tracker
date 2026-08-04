import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '@/lib/apiClient';

export interface ManagedUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
}

const KEY = ['admin', 'users'] as const;

export function useManagedUsers(enabled: boolean) {
  return useQuery({
    queryKey: KEY,
    enabled,
    retry: false,
    queryFn: () => callFunction<{ users: ManagedUser[] }>('admin-users').then((r) => r.users),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string; full_name?: string }) =>
      callFunction('admin-users', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => callFunction('admin-users', { method: 'DELETE', query: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
