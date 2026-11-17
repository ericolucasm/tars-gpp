'use client';

import { useRouter } from 'next/navigation';
import { s } from '@/lib/css';
import type { Filtro } from '@/lib/relatorios';

const TODOS = 'todos';
const sSelect = s('height: 36px; padding: 0 10px; border-radius: 9px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px; max-width: 240px');

/** Filtros de um relatório. Cada escolha vai para o endereço da página, então o link já leva filtrado. */
export function FiltrosRelatorio({ rel, filtros }: { rel: string; filtros: Filtro[] }) {
  const router = useRouter();
  if (!filtros.length) return null;

  function aplicar(mudar: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(window.location.search);
    mudar(p);
    const q = p.toString();
    router.replace(`/relatorios${q ? `?${q}` : ''}#${rel}`, { scroll: false });
  }
  const ativos = filtros.filter((f) => f.valor !== f.opcoes[0].valor);

  return (
    <div role="group" aria-label="Filtros" style={s('display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end')}>
      {filtros.map((f) => (
        <label key={f.param} style={s('display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; color: #4A4458')}>
          {f.rotulo}
          <select value={f.valor} onChange={(e) => { const v = e.target.value; aplicar((p) => (v === TODOS || v === f.opcoes[0].valor ? p.delete(f.param) : p.set(f.param, v))); }} style={sSelect}>
            {f.opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
          </select>
        </label>
      ))}
      {ativos.length > 0 && (
        <button type="button" data-sem-impressao onClick={() => aplicar((p) => filtros.forEach((f) => p.delete(f.param)))}
          style={s('height: 36px; padding: 0 12px; border: 0; background: transparent; color: #4B2FD1; font-size: 13px; font-weight: 600')}>
          Limpar filtros
        </button>
      )}
    </div>
  );
}
