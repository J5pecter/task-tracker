import { useState } from 'react';
import { Clock, Trash2, UserPlus } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Avatar } from './ui/Badges';
import { useToast } from './ui/Toast';
import { LoadingState } from './ui/Spinner';
import {
  useWorkspaceMembers,
  useInviteMember,
  useRemoveMember,
  useCancelInvite,
} from '@/hooks/useMembers';
import { useAuth } from '@/hooks/useAuth';

export function MembersModal({
  workspaceId,
  workspaceName,
  open,
  onClose,
}: {
  workspaceId: string;
  workspaceName: string;
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { data, isLoading } = useWorkspaceMembers(open ? workspaceId : undefined);
  const invite = useInviteMember(workspaceId);
  const removeMember = useRemoveMember(workspaceId);
  const cancelInvite = useCancelInvite(workspaceId);
  const { notify } = useToast();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');

  const isOwner = data?.members.some((m) => m.user_id === user?.id && m.role === 'owner');

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      const res = await invite.mutateAsync({ email: email.trim(), role });
      notify(res.added ? 'Member added' : 'Invite sent — they’ll join when they sign up', 'success');
      setEmail('');
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Members · ${workspaceName}`} size="lg">
      {isOwner && (
        <form onSubmit={submitInvite} className="mb-5 flex flex-wrap gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            className="input min-w-0 flex-1"
            required
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="input w-32 shrink-0">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="guest">Guest</option>
          </select>
          <button className="btn-primary shrink-0" type="submit" disabled={invite.isPending}>
            <UserPlus className="h-4 w-4" /> Invite
          </button>
        </form>
      )}

      {isLoading ? (
        <LoadingState label="Loading members…" />
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Members ({data?.members.length ?? 0})
            </h3>
            <div className="space-y-1">
              {data?.members.map((m) => (
                <div key={m.user_id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50">
                  <Avatar name={m.profile?.full_name} email={m.profile?.email} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-700">
                      {m.profile?.full_name || m.profile?.email || 'User'}
                      {m.user_id === user?.id && <span className="text-slate-400"> (you)</span>}
                    </div>
                    <div className="truncate text-xs text-slate-400">{m.profile?.email}</div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
                    {m.role}
                  </span>
                  {isOwner && m.role !== 'owner' && (
                    <button
                      className="text-slate-300 hover:text-red-600"
                      title="Remove member"
                      onClick={() => removeMember.mutate(m.user_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {data && data.invites.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Pending invites ({data.invites.length})
              </h3>
              <div className="space-y-1">
                {data.invites.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{inv.email}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-500">
                      {inv.role}
                    </span>
                    {isOwner && (
                      <button
                        className="text-slate-300 hover:text-red-600"
                        title="Cancel invite"
                        onClick={() => cancelInvite.mutate(inv.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isOwner && (
            <p className="text-xs text-slate-400">Only the workspace owner can invite or remove members.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
