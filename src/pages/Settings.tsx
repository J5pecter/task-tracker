import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOutlookLists, useConnectMicrosoft } from '@/hooks/useOutlookTasks';
import { useToast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Badges';

export default function Settings() {
  const { user } = useAuth();
  const { data: outlook } = useOutlookLists();
  const connect = useConnectMicrosoft();
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();

  // Surface the result of the Microsoft OAuth redirect.
  useEffect(() => {
    if (params.get('ms_connected')) {
      notify('Microsoft account connected!', 'success');
      params.delete('ms_connected');
      setParams(params, { replace: true });
    }
    const err = params.get('ms_error');
    if (err) {
      notify(`Microsoft connection failed: ${err}`, 'error');
      params.delete('ms_error');
      setParams(params, { replace: true });
    }
  }, [params, notify, setParams]);

  const connected = !!outlook?.connected;

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
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Integrations
        </h2>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <Mail className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-slate-800">Microsoft Outlook</div>
            <div className="text-sm text-slate-500">
              Sync Microsoft To Do tasks and calendar events.
            </div>
          </div>
          {connected ? (
            <div className="flex flex-col items-end gap-1">
              <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                <CheckCircle2 className="h-4 w-4" /> Connected
              </span>
              <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => connect.mutate()}>
                Reconnect
              </button>
            </div>
          ) : (
            <button className="btn-primary" onClick={() => connect.mutate()} disabled={connect.isPending}>
              Connect
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
