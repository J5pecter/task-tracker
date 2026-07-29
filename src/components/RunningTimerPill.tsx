import { useEffect, useState } from 'react';
import { Square, Timer as TimerIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRunningTimer, useStopTimer } from '@/hooks/useTimeTracking';
import { formatDuration } from '@/lib/format';

/** Global indicator + stop control for the currently running timer, if any. */
export function RunningTimerPill() {
  const { data: entry } = useRunningTimer();
  const stop = useStopTimer();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!entry) return;
    const tick = () =>
      setElapsed(Math.max(0, Math.round((Date.now() - Date.parse(entry.started_at)) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [entry]);

  if (!entry) return null;

  return (
    <div className="flex items-center gap-2 rounded-full bg-brand-50 py-1 pl-3 pr-1 text-sm text-brand-700">
      <button
        className="flex items-center gap-1.5 font-medium"
        onClick={() => navigate(`/task/${entry.task_id}`)}
        title="Go to task"
      >
        <TimerIcon className="h-4 w-4 animate-pulse" />
        {formatDuration(elapsed)}
      </button>
      <button
        onClick={() => stop.mutate(undefined)}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700"
        title="Stop timer"
      >
        <Square className="h-3 w-3" fill="currentColor" />
      </button>
    </div>
  );
}
