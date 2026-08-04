import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { KeyRound, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isAdminEmail } from '@/lib/admin';
import { useManagedUsers, useCreateUser, useDeleteUser, type ManagedUser } from '@/hooks/useAdminUsers';
import { useToast } from '@/components/ui/Toast';
import { LoadingState } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Badges';
import { timeAgo } from '@/lib/format';

export default function AdminUsers() {
  const { user } = useAuth();
  const admin = isAdminEmail(user?.email);
  const { data: users, isLoading, isError } = useManagedUsers(admin);
  const create = useCreateUser();
  const del = useDeleteUser();
  const { notify } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  if (!admin) return <Navigate to="/" replace />;

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      notify('Enter an email and a password of at least 6 characters.', 'error');
      return;
    }
    try {
      await create.mutateAsync({ email: email.trim(), password, full_name: fullName.trim() });
      notify(`User created — they can sign in with ${email.trim()} now.`, 'success');
      setEmail('');
      setPassword('');
      setFullName('');
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  function removeUser(u: ManagedUser) {
    if (confirm(`Delete ${u.email}? This removes their account and workspaces.`)) {
      del.mutate(u.id, {
        onSuccess: () => notify('User deleted', 'success'),
        onError: (err) => notify((err as Error).message, 'error'),
      });
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-1 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-brand-500" />
        <h1 className="text-2xl font-bold text-slate-800">Users</h1>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Create accounts for your team. New users can sign in immediately with the email and password
        you set — no confirmation email is sent.
      </p>

      <form onSubmit={addUser} className="card mb-6 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <UserPlus className="h-4 w-4" /> Add a user
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="label">Full name</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Optional" />
          </div>
          <div className="sm:col-span-1">
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="sm:col-span-1">
            <label className="label">Password</label>
            <input type="text" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min 6 chars" required />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <KeyRound className="h-3.5 w-3.5" /> Share the password with the user securely.
          </p>
          <button className="btn-primary" type="submit" disabled={create.isPending}>
            <UserPlus className="h-4 w-4" /> Create user
          </button>
        </div>
      </form>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        All users {users ? `(${users.length})` : ''}
      </h2>
      {isLoading ? (
        <LoadingState label="Loading users…" />
      ) : isError ? (
        <EmptyState icon={ShieldCheck} title="Couldn't load users" description="Check that ADMIN_EMAILS is set on the server and includes your email." />
      ) : !users || users.length === 0 ? (
        <EmptyState icon={UserPlus} title="No users yet" description="Add your first user above." />
      ) : (
        <div className="card divide-y divide-slate-100">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={u.full_name} email={u.email} size={34} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate text-sm font-medium text-slate-800">
                  {u.full_name || u.email}
                  {u.is_admin && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                      admin
                    </span>
                  )}
                  {u.id === user?.id && <span className="text-xs text-slate-400">(you)</span>}
                </div>
                <div className="truncate text-xs text-slate-400">
                  {u.email} · {u.last_sign_in_at ? `last seen ${timeAgo(u.last_sign_in_at)}` : 'never signed in'}
                </div>
              </div>
              {u.id !== user?.id && (
                <button
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#ff6b8b]"
                  title="Delete user"
                  onClick={() => removeUser(u)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
