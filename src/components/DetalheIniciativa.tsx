import { s } from '@/lib/css';
import type { Detalhe } from '@/lib/detalhe';

// Bloco de detalhe que abre abaixo da linha da iniciativa/projeto (estilo da Avaliação do PMO).

function Campos({ campos }: { campos: [string, string][] }) {
  return (
    <dl style={s('margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px 16px')}>
      {campos.map(([k, v]) => (
        <div key={k} style={s('display: flex; flex-direction: column; gap: 2px')}><dt style={s('font-size: 11px; color: #5E5770')}>{k}</dt><dd style={s('margin: 0; font-size: 13px; color: #26213A')}>{v}</dd></div>
      ))}
    </dl>
  );
}

export function DetalheIniciativa({ id, titulo, det }: { id: string; titulo: string; det: Detalhe }) {
  return (
    <div id={`det-${id}`} role="region" aria-label={`Detalhes de ${titulo}`} style={s('display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 12px; background: #FFFFFF; border: 1px solid #EFEBE3; cursor: default')}>
      {det.problema && <div style={s('display: flex; flex-direction: column; gap: 4px')}><span style={s('font-size: 12px; font-weight: 700')}>Problema ou oportunidade</span><span style={s('font-size: 13px; color: #4A4458; line-height: 1.5')}>{det.problema}</span></div>}
      {det.resultado && <div style={s('display: flex; flex-direction: column; gap: 4px')}><span style={s('font-size: 12px; font-weight: 700')}>Resultado esperado</span><span style={s('font-size: 13px; color: #4A4458; line-height: 1.5')}>{det.resultado}</span></div>}
      {det.projeto.length > 0 && (
        <div style={s('display: flex; flex-direction: column; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid #EFEBE3')}>
          <span style={s('font-size: 12px; font-weight: 700; color: #4B2FD1')}>Andamento do projeto</span>
          <Campos campos={det.projeto} />
        </div>
      )}
      <Campos campos={det.campos} />
    </div>
  );
}

/** Seta ▸/▾ + título clicável que abre e fecha o detalhe. */
export function TituloExpansivel({ id, titulo, aberto, alternar, tamanho = 14 }: { id: string; titulo: string; aberto: boolean; alternar: () => void; tamanho?: number }) {
  return (
    <button type="button" aria-expanded={aberto} aria-controls={`det-${id}`} onClick={alternar}
      style={{ ...s('border: 0; background: transparent; padding: 0; text-align: left; font-weight: 600; color: #26213A; display: flex; gap: 6px; align-items: baseline; cursor: pointer'), fontSize: tamanho }}>
      <span aria-hidden style={s('font-size: 10px; color: #6D4AFF')}>{aberto ? '▾' : '▸'}</span>{titulo}
    </button>
  );
}

/** Clique na linha (fora de botões, campos e links) também abre/fecha o detalhe. */
export function cliqueNaLinha(alternar: () => void) {
  return (e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest('button, select, label, a, input, textarea')) alternar(); };
}
