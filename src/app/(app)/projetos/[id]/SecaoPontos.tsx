import { s } from '@/lib/css';
import type { DadosOrg } from '@/lib/dados';
import type { Sessao } from '@/lib/sessao';
import { temPerfil } from '@/lib/sessao';
import { pontoVM } from '@/lib/pontos-vm';
import { fasesDo } from '@/lib/visoes';
import { CartaoPonto, NovoPonto } from '@/components/Pontos';

/** Pontos de atenção do projeto: abrir (GP/PMO/participantes) e acompanhar a resolução. */
export function SecaoPontos({ d, sessao, iniId, hoje }: { d: DadosOrg; sessao: Sessao; iniId: string; hoje: string }) {
  const ehPmo = temPerfil(sessao, 'pmo');
  const pontos = d.pontos.filter((p) => p.iniciativaId === iniId).map((p) => pontoVM(d, p, sessao.pessoa.id, ehPmo, hoje));
  const abertos = pontos.filter((p) => p.status === 'aberto').sort((a, b) => Number(b.atrasado) - Number(a.atrasado));
  const resolvidos = pontos.filter((p) => p.status !== 'aberto').reverse();
  const gestores = d.pessoas.filter((p) => p.perfis.includes('gestor') && !p.externo).map((p) => ({ id: p.id, nome: p.nome }));
  return (
    <section id="pontos" aria-label="Pontos de atenção" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px; scroll-margin-top: 16px')}>
      <div style={s('display: flex; flex-direction: column; gap: 2px')}>
        <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Pontos de atenção</h2>
        <span style={s('font-size: 12px; color: #5E5770')}>Impedimentos e decisões que precisam do PMO ou de um gestor. Quem decide é avisado e responde aqui ou em "Pontos de atenção".</span>
      </div>
      <NovoPonto iniciativaId={iniId} fases={fasesDo(d, iniId).map((f) => ({ id: f.id, nome: f.nome }))} gestores={gestores} />
      {abertos.map((p) => <CartaoPonto key={p.id} p={p} />)}
      {abertos.length === 0 && <span style={s('font-size: 13px; color: #5E5770')}>Nenhum ponto de atenção aberto.</span>}
      {resolvidos.length > 0 && (
        <details>
          <summary style={s('cursor: pointer; font-size: 13px; font-weight: 600; color: #4B2FD1')}>Resolvidos ({resolvidos.length})</summary>
          <div style={s('display: flex; flex-direction: column; gap: 10px; margin-top: 10px')}>{resolvidos.map((p) => <CartaoPonto key={p.id} p={p} />)}</div>
        </details>
      )}
    </section>
  );
}
