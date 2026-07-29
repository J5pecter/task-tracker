import { NavLink } from 'react-router-dom';
import { CalendarDays, KanbanSquare, List as ListIcon } from 'lucide-react';
import clsx from 'clsx';

export function ViewTabs({ listId }: { listId: string }) {
  const tabs = [
    { to: `/list/${listId}`, label: 'List', icon: ListIcon, end: true },
    { to: `/list/${listId}/board`, label: 'Board', icon: KanbanSquare, end: false },
    { to: `/list/${listId}/calendar`, label: 'Calendar', icon: CalendarDays, end: false },
  ];
  return (
    <div className="flex gap-1">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
              isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100',
            )
          }
        >
          <t.icon className="h-4 w-4" />
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}
