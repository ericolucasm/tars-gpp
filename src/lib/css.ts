import type { CSSProperties } from 'react';

// Converte CSS em texto (como no protótipo) para o objeto de estilo do React.
// Ex.: s('display: flex; gap: 8px') → { display: 'flex', gap: '8px' }. Resultado em cache.
const cache = new Map<string, CSSProperties>();

export function s(css: string): CSSProperties {
  const hit = cache.get(css);
  if (hit) return hit;
  const out: Record<string, string> = {};
  for (const decl of css.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!prop) continue;
    const key = prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = val;
  }
  cache.set(css, out as CSSProperties);
  return out as CSSProperties;
}
