import { useEffect, useState } from 'react';
import { Play, Square } from 'lucide-react';
import { useRunningTimer, useStartTimer, useStopTimer, useTimeEntries } from '@/hooks/useTimeTracking';
import { formatDuration } from '@/lib/format';

/** Per-task start/stop timer + a summary of logged time. */
export function Timer({ taskId }: { taskId: string }) {
  const { data: running } = useRunningTimer();
  const { data: entries } = useTimeEntries(taskId);
  const start = useStartTimer(taskId);
  const stop = useStopTimer(taskId);
  const [elapsed, setElapsed] = useState(0);

  const isRunningThis = running?.task_id === taskId && !running?.ended_at;

  useEffect(() => {
    if (!isRunningThis || !running) return;
    const tick = () =>
      setElapsed(Math.round((Date.now() - Date.parse(running.started_at)) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isRunningThis, running]);

  const logged =
    (entries || []).reduce((sum, e) => sum + (e.duration_seconds || 0), 0) +
    (isRunningThis ? elapsed : 0);

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="label mb-0">Time tracking</span>
        <span className="font-mono text-sm text-slate-700">{formatDuration(logged)}</span>
      </div>
      {isRunningThis ? (
        <button className="btn-secondary w-full text-red-600" onClick={() => stop.mutate(undefined)}>
          <Square className="h-4 w-4" fill="currentColor" /> Stop ({formatDuration(elapsed)})
        </button>
      ) : (
        <button className="btn-secondary w-full" onClick={() => start.mutate()} disabled={start.isPending}>
          <Play className="h-4 w-4" /> Start timer
        </button>
      )}
    </div>
  );
}
