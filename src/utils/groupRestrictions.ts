export const RESTRICTED_ADMIN_ONLY_GROUP = '845 - METARH';

export function isRestrictedMetarhGroup(grupoEconomico?: string | null): boolean {
  const normalized = String(grupoEconomico || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  return normalized === RESTRICTED_ADMIN_ONLY_GROUP || /^845\s*-\s*METARH\b/.test(normalized);
}

export function isAdminRole(role?: string | null): boolean {
  return String(role || '').trim() === 'Administrador';
}
