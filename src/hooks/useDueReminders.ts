import { useEffect, useRef } from 'react';
import { useMyTasks } from './useTasks';

/**
 * Basic due-date reminders via the browser Notification API. Fires once per
 * task when it becomes due within the next 15 minutes (checked every minute).
 */
export function useDueReminders() {
  const { data: tasks } = useMyTasks();
  const notified = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!tasks) return;
    const check = () => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      const now = Date.now();
      for (const t of tasks) {
        if (!t.due_date || t.is_completed || notified.current.has(t.id)) continue;
        const due = Date.parse(t.due_date);
        const minsAway = (due - now) / 60000;
        if (minsAway <= 15 && minsAway >= -1) {
          notified.current.add(t.id);
          new Notification('Task due soon', {
            body: `${t.title} is due ${minsAway <= 0 ? 'now' : `in ${Math.round(minsAway)} min`}.`,
          });
        }
      }
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [tasks]);
}
