import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { List } from '@/types';
import { ViewTabs } from './ViewTabs';
import { TaskForm } from './TaskForm';

interface ListHeaderProps {
  list: List;
  right?: React.ReactNode;
}

/** Header shared by List/Board/Calendar views: name, view tabs, and New task. */
export function ListHeader({ list, right }: ListHeaderProps) {
  const [showForm, setShowForm] = useState(false);
  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded" style={{ backgroundColor: list.color }} />
          <h1 className="text-xl font-bold text-slate-800">{list.name}</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> New task
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <ViewTabs listId={list.id} />
        {right}
      </div>
      <TaskForm
        open={showForm}
        onClose={() => setShowForm(false)}
        listId={list.id}
        statuses={list.statuses}
      />
    </div>
  );
}
