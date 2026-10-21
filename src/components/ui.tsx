import Link from 'next/link';
import { s } from '@/lib/css';
import { FAROL, type Farol } from '@/lib/regras/projeto';

// Peças visuais repetidas nas telas (estilos copiados do protótipo).

export function Cabecalho({ trilha, titulo, texto, tamanho = 28, children }: { trilha: string; titulo: string; texto?: string; tamanho?: number; children?: React.ReactNode }) {
  const bloco = (
    <div style={s('display: flex; flex-direction: column; gap: 4px')}>
      <span style={s('font-size: 12px; color: #5E5770')}>{trilha}</span>
      <h1 style={{ ...s('margin: 0; font-weight: 700; letter-spacing: -0.3px'), fontSize: tamanho }}>{titulo}</h1>
      {texto && <p style={s('margin: 0; font-size: 14px; color: #5E5770')}>{texto}</p>}
    </div>
  );
  if (!children) return bloco;
  return (
    <div style={s('display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: flex-end')}>
      {bloco}
      {children}
    </div>
  );
}

export function Kpi({ rotulo, valor, cor, href, tamanho = 26 }: { rotulo: string; valor: React.ReactNode; cor?: string; href?: string; tamanho?: number }) {
  const conteudo = (
    <>
      <span style={s('font-size: 12px; color: #5E5770')}>{rotulo}</span>
      <span style={{ ...s('font-weight: 700'), fontSize: tamanho, color: cor }}>{valor}</span>
    </>
  );
  const st = s('background: #FFFFFF; border: 1px solid #E8E3D9; border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; color: #26213A');
  return href ? <Link href={href} style={st}>{conteudo}</Link> : <div style={st}>{conteudo}</div>;
}

export function GradeKpi({ min = 150, children }: { min?: number; children: React.ReactNode }) {
  return <div style={{ ...s('display: grid; gap: 12px'), gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` }}>{children}</div>;
}

export function Painel({ rotulo, titulo, sub, estilo, children }: { rotulo?: string; titulo?: string; sub?: string; estilo?: string; children: React.ReactNode }) {
  return (
    <section aria-label={rotulo ?? titulo} style={s(estilo ?? 'background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px')}>
      {titulo && (sub
        ? <div style={s('display: flex; flex-direction: column; gap: 2px')}><h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>{titulo}</h2><span style={s('font-size: 12px; color: #5E5770')}>{sub}</span></div>
        : <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>{titulo}</h2>)}
      {children}
    </section>
  );
}

type Tom = 'roxo' | 'vermelho' | 'ambar' | 'neutro';
const TOM: Record<Tom, { borda: string; fundo?: string; badgeBg: string; badgeFg: string }> = {
  roxo: { borda: '#EFEBE3', badgeBg: '#EFEAFE', badgeFg: '#4B2FD1' },
  vermelho: { borda: '#F5D2D2', fundo: '#FFFAFA', badgeBg: '#FDE8E8', badgeFg: '#B42318' },
  ambar: { borda: '#F0D9A8', fundo: '#FFFCF5', badgeBg: '#FEF3DC', badgeFg: '#9A5B05' },
  neutro: { borda: '#EFEBE3', badgeBg: '#EFEAFE', badgeFg: '#4B2FD1' },
};

/** Linha da lista "Precisa de você". */
export function ItemAcao({ href, titulo, sub, acao, numero, tom = 'roxo', badgeTom }: { href: string; titulo: string; sub: string; acao: string; numero?: number; tom?: Tom; badgeTom?: Tom }) {
  const t = TOM[tom];
  const b = TOM[badgeTom ?? tom];
  return (
    <Link href={href} style={{ ...s('display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; color: #26213A'), border: `1px solid ${t.borda}`, background: t.fundo }}>
      {numero !== undefined && <span style={{ ...s('width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex: 0 0 32px'), background: b.badgeBg, color: b.badgeFg }}>{numero}</span>}
      <span style={s('display: flex; flex-direction: column; flex: 1; min-width: 0')}><span style={s('font-size: 14px; font-weight: 600')}>{titulo}</span><span style={s('font-size: 12px; color: #5E5770')}>{sub}</span></span>
      <span style={s('font-size: 13px; font-weight: 600; color: #4B2FD1; white-space: nowrap')}>{acao}</span>
    </Link>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <div style={s('border: 1px dashed #D6CFC2; border-radius: 12px; padding: 18px; font-size: 13px; color: #5E5770; text-align: center')}>{children}</div>;
}

export function PillFarol({ farol, ponto = true, estilo }: { farol: string | null | undefined; ponto?: boolean; estilo?: string }) {
  const f = FAROL[(farol as Farol) ?? 'ok'] ?? FAROL.ok;
  return (
    <span style={{ ...s(estilo ?? 'display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px'), background: f.bg, color: f.fg }}>
      {ponto && <span style={{ ...s('width: 7px; height: 7px; border-radius: 50%'), background: f.fg }} />}{f.rotulo}
    </span>
  );
}

export function Barra({ pct, cor = '#6D4AFF', altura = 6 }: { pct: number; cor?: string; altura?: number }) {
  return (
    <div style={{ ...s('border-radius: 3px; background: #EFEBE3; overflow: hidden'), height: altura }}>
      <div style={{ height: altura, width: `${Math.max(0, Math.min(100, pct))}%`, background: cor }} />
    </div>
  );
}

/** Barrinhas de etapas (ciclo, caminho da iniciativa). */
export function Etapas({ etapas, atual, colunas, alerta }: { etapas: { nome: string; data?: string }[]; atual: number; colunas?: number; alerta?: boolean }) {
  return (
    <div style={{ ...s('display: grid; gap: 6px'), gridTemplateColumns: `repeat(${colunas ?? etapas.length}, minmax(0, 1fr))` }}>
      {etapas.map((e, i) => {
        const feito = i < atual, agora = i === atual;
        const cor = feito ? '#9C8CF0' : agora ? (alerta ? '#C27A0A' : '#6D4AFF') : '#EFEBE3';
        return (
          <div key={i} style={s('display: flex; flex-direction: column; gap: 6px')}>
            <div style={{ height: 6, borderRadius: 3, background: cor }} />
            <span style={{ fontSize: 12, fontWeight: agora ? 700 : 500, color: agora ? (alerta ? '#7A4A04' : '#3A22A8') : '#5E5770', lineHeight: 1.2 }}>{e.nome}</span>
            {e.data && <span style={s('font-size: 11px; color: #5E5770')}>{e.data}</span>}
          </div>
        );
      })}
    </div>
  );
}

export const estiloPill = (on: boolean) => s(on
  ? 'min-height: 40px; padding: 0 14px; border-radius: 20px; font-size: 13px; border: 1px solid #6D4AFF; background: #EFEAFE; color: #3A22A8; font-weight: 600'
  : 'min-height: 40px; padding: 0 14px; border-radius: 20px; font-size: 13px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-weight: 400');

export const sBtnPrim = s('height: 40px; padding: 0 16px; border-radius: 10px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px');
export const sBtnSec = s('height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px');
export const sInput = s('height: 42px; padding: 0 12px; border-radius: 10px; border: 1px solid #E2DCD0; font-size: 14px; color: #26213A; background: #FFFFFF');
export const sLabel = s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600');
export const sToast = s('padding: 12px 16px; border-radius: 12px; background: #EFEAFE; color: #3A22A8; font-size: 13px; font-weight: 600');
export const sErro = s('font-size: 13px; color: #B42318');
