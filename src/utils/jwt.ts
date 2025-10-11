export function parseJwt(token: string): any {
  try {
    const [, payload] = token.split('.');
    const s = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
    const json = decodeURIComponent(escape(atob(s + pad)));
    return JSON.parse(json);
  } catch { return {}; }
}
export function getClaim(token: string, ...keys: string[]): any {
  const c = parseJwt(token);
  for (const k of keys) if (c[k] != null) return c[k];
  return undefined;
}