/**
 * Action Items — the standalone tracker embedded inside the app shell (same tab,
 * no new window). The tracker is a prebuilt bundle served from /action-tracker/,
 * so we frame it here and apply a smart-invert filter to bring it into the dark
 * Aurora look. (A pixel-perfect re-theme would require rebuilding it natively.)
 */
export default function ActionItems() {
  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-slate-800">Action Items</h1>
        <p className="text-sm text-slate-500">Owners, status, and due dates for every action item.</p>
      </div>
      <div className="min-h-0 flex-1 p-3">
        <iframe
          src="/action-tracker/"
          title="Action Items tracker"
          className="h-full w-full rounded-2xl border border-slate-200"
          style={{
            background: '#1a103a',
            // Smart dark mode: flip lightness but keep hues (softened for a
            // "slightly dark" feel rather than pure black).
            filter: 'invert(0.92) hue-rotate(180deg)',
          }}
        />
      </div>
    </div>
  );
}
