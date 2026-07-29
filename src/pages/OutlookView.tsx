import { useMemo, useState } from 'react';
import { Download, Mail, RefreshCw } from 'lucide-react';
import { useOutlookLists, useOutlookTasks, useConnectMicrosoft, useSyncOutlook } from '@/hooks/useOutlookTasks';
import { useWorkspaces, useLists } from '@/hooks/useProjects';
import { useImportOutlookTask } from '@/hooks/useTasks';
import { LoadingState } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { formatDueDate } from '@/lib/format';
import clsx from 'clsx';

export default function OutlookView() {
  const { data: outlook, isLoading, isError } = useOutlookLists();
  const connect = useConnectMicrosoft();
  const sync = useSyncOutlook();
  const [selectedList, setSelectedList] = useState<string>('');

  if (isLoading) return <LoadingState label="Loading Outlook…" />;

  if (isError) {
    return <EmptyState icon={Mail} title="Couldn't reach Microsoft Graph" description="Try syncing again in a moment." />;
  }

  if (!outlook?.connected) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Mail}
          title="Connect your Microsoft account"
          description="Link Outlook to see your Microsoft To Do tasks and calendar events here, and import them into your projects."
          action={
            <button className="btn-primary" onClick={() => connect.mutate()} disabled={connect.isPending}>
              Connect Microsoft
            </button>
          }
        />
      </div>
    );
  }

  const activeList = selectedList || outlook.lists[0]?.id || '';

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Outlook Tasks</h1>
          <p className="text-sm text-slate-500">Live from Microsoft To Do — not stored until you import.</p>
        </div>
        <button className="btn-secondary" onClick={sync}>
          <RefreshCw className="h-4 w-4" /> Sync now
        </button>
      </div>

      {outlook.lists.length === 0 ? (
        <EmptyState icon={Mail} title="No Outlook task lists found" />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {outlook.lists.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedList(l.id)}
                className={clsx(
                  'rounded-full px-3 py-1.5 text-sm font-medium',
                  activeList === l.id ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200',
                )}
              >
                {l.displayName}
              </button>
            ))}
          </div>
          <OutlookTaskTable listId={activeList} />
        </>
      )}
    </div>
  );
}

function OutlookTaskTable({ listId }: { listId: string }) {
  const { data: tasks, isLoading } = useOutlookTasks(listId);
  const { data: workspaces } = useWorkspaces();
  const [wsId, setWsId] = useState<string>('');
  const activeWs = wsId || workspaces?.[0]?.id;
  const { data: lists } = useLists(activeWs);
  const [targetList, setTargetList] = useState<string>('');
  const { notify } = useToast();
  const importTask = useImportOutlookTask(targetList || lists?.[0]?.id || '');

  const target = targetList || lists?.[0]?.id || '';

  const rows = useMemo(() => tasks ?? [], [tasks]);

  if (isLoading) return <LoadingState label="Loading tasks…" />;

  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap items-end gap-3 p-3">
        <div>
          <label className="label">Import into workspace</label>
          <select className="input" value={activeWs} onChange={(e) => setWsId(e.target.value)}>
            {workspaces?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">List</label>
          <select className="input" value={target} onChange={(e) => setTargetList(e.target.value)}>
            {lists?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Mail} title="No tasks in this list" />
      ) : (
        <div className="card divide-y divide-slate-100">
          {rows.map((t) => {
            const due = formatDueDate(t.dueDateTime ?? null);
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <div className={clsx('font-medium text-slate-800', t.status === 'completed' && 'line-through opacity-60')}>
                    {t.title}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                    <span className="capitalize">{t.importance} importance</span>
                    {due && <span className={due.overdue ? 'text-red-600' : ''}>Due {due.label}</span>}
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  disabled={!target || importTask.isPending}
                  onClick={() =>
                    importTask.mutate(t, {
                      onSuccess: () => notify(`Imported "${t.title}"`, 'success'),
                      onError: (e) => notify((e as Error).message, 'error'),
                    })
                  }
                >
                  <Download className="h-4 w-4" /> Import
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
