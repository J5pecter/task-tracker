import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useList } from '@/hooks/useProjects';
import { useTasks, useMyTasks } from '@/hooks/useTasks';
import { ListHeader } from '@/components/ListHeader';
import { LoadingState } from '@/components/ui/Spinner';
import { PRIORITY_META, type Task } from '@/types';

export default function CalendarView() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => new Date());

  const { data: list } = useList(listId);
  const listTasks = useTasks(listId);
  const myTasks = useMyTasks();
  const tasks = (listId ? listTasks.data : myTasks.data) ?? [];
  const loading = listId ? listTasks.isLoading : myTasks.isLoading;

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd],
  );

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const key = format(new Date(t.due_date), 'yyyy-MM-dd');
      (map.get(key) ?? map.set(key, []).get(key)!).push(t);
    });
    return map;
  }, [tasks]);

  const header = (
    <div className="flex items-center gap-2">
      <button className="btn-ghost" onClick={() => setCursor((c) => subMonths(c, 1))}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="w-40 text-center text-sm font-semibold text-slate-700">
        {format(cursor, 'MMMM yyyy')}
      </span>
      <button className="btn-ghost" onClick={() => setCursor((c) => addMonths(c, 1))}>
        <ChevronRight className="h-4 w-4" />
      </button>
      <button className="btn-secondary" onClick={() => setCursor(new Date())}>
        Today
      </button>
    </div>
  );

  if (loading) return <LoadingState />;

  const grid = (
    <div className="p-6">
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="px-2 py-2 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDay.get(key) ?? [];
            return (
              <div
                key={key}
                className={clsx(
                  'min-h-[110px] border-b border-r border-slate-100 p-1.5',
                  !isSameMonth(day, cursor) && 'bg-slate-50',
                )}
              >
                <div
                  className={clsx(
                    'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs',
                    isSameDay(day, new Date())
                      ? 'bg-brand-600 font-semibold text-white'
                      : 'text-slate-500',
                  )}
                >
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayTasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => navigate(`/task/${t.id}`)}
                      className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white"
                      style={{ backgroundColor: PRIORITY_META[t.priority].color }}
                      title={t.title}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (listId && list) {
    return (
      <div>
        <ListHeader list={list} right={header} />
        {grid}
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-slate-800">Calendar</h1>
        {header}
      </div>
      {grid}
    </div>
  );
}
