import { Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { RunningTimerPill } from './RunningTimerPill';
import { useDueReminders } from '@/hooks/useDueReminders';

export function AppLayout() {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');

  // Background: browser notifications for tasks due soon.
  useDueReminders();

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (term.trim().length >= 2) navigate(`/search?q=${encodeURIComponent(term.trim())}`);
  }

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-3">
          <form onSubmit={onSearch} className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search tasks…"
              className="input pl-9"
            />
          </form>
          <div className="ml-auto flex items-center gap-3">
            <RunningTimerPill />
          </div>
        </header>
        <main className="scrollbar-thin flex-1 overflow-auto bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
