import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { isSupabaseConfigured } from './lib/supabase';
import { useAuth } from './hooks/useAuth';
import { AppLayout } from './components/AppLayout';
import { LoadingState } from './components/ui/Spinner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ListView from './pages/ListView';
import BoardView from './pages/BoardView';
import CalendarView from './pages/CalendarView';
import TaskDetail from './pages/TaskDetail';
import OutlookView from './pages/OutlookView';
import Settings from './pages/Settings';
import SearchResults from './pages/SearchResults';

function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingState label="Starting up…" />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

function ConfigNeeded() {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-6">
      <div className="card max-w-lg p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Setup needed</h1>
        <p className="mt-2 text-sm text-slate-600">
          This deployment is missing its Supabase configuration. Set{' '}
          <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code> in your
          Netlify environment variables, then trigger a new deploy (these are baked in at
          build time, so a rebuild is required).
        </p>
        <p className="mt-3 text-xs text-slate-400">
          See DEPLOY.md §5 for the full list of variables.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (!isSupabaseConfigured) return <ConfigNeeded />;
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="/list/:listId" element={<ListView />} />
        <Route path="/list/:listId/board" element={<BoardView />} />
        <Route path="/list/:listId/calendar" element={<CalendarView />} />
        <Route path="/task/:taskId" element={<TaskDetail />} />
        <Route path="/outlook" element={<OutlookView />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
