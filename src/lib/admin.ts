/**
 * Client-side gate for showing the admin UI. This is only for hiding/showing
 * the nav — the real enforcement lives in the admin-users function (ADMIN_EMAILS).
 */
export function isAdminEmail(email?: string | null): boolean {
  const list = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}
