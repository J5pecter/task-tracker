import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Badges';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Settings</h1>

      <section className="card mb-6 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Profile</h2>
        <div className="flex items-center gap-3">
          <Avatar name={user?.user_metadata?.full_name} email={user?.email} size={48} />
          <div>
            <div className="font-medium text-slate-800">
              {user?.user_metadata?.full_name || 'Unnamed user'}
            </div>
            <div className="text-sm text-slate-500">{user?.email}</div>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">About</h2>
        <p className="text-sm text-slate-600">
          TaskTracker is your personal work tracker — create tasks, set their status (Open /
          In Progress / Done), estimate how long they'll take, and track the time you actually
          spend with the built-in timer.
        </p>
      </section>
    </div>
  );
}
