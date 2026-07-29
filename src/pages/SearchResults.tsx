import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useSearchTasks, useUpdateTask } from '@/hooks/useTasks';
import { TaskCard } from '@/components/TaskCard';
import { LoadingState } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

export default function SearchResults() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const { data: tasks, isLoading } = useSearchTasks(q);
  const update = useUpdateTask();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-800">Search</h1>
      <p className="mb-6 text-sm text-slate-500">
        Results for “<span className="font-medium">{q}</span>”
      </p>

      {isLoading ? (
        <LoadingState />
      ) : !tasks || tasks.length === 0 ? (
        <EmptyState icon={Search} title="No matching tasks" description="Try a different search term." />
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              showStatus
              onToggleComplete={() => update.mutate({ id: t.id, patch: { is_completed: !t.is_completed } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
