import { s } from '@/lib/css';
import type { DadosOrg } from '@/lib/dados';
import type { Sessao } from '@/lib/sessao';
import { GRUPOS_CAIXA } from '@/lib/regras/meu-tars';
import { caixaDe } from '@/lib/meu-tars';
import { ItemAcao, Vazio } from '@/components/ui';
import { BotaoCobrar } from './BotaoCobrar';

/** "Precisa de você" do Meu TARS: tudo que depende da pessoa, de todos os perfis dela, agrupado por prioridade. */
export function CaixaUnica({ d, sessao, hoje, estilo }: { d: DadosOrg; sessao: Sessao; hoje: string; estilo?: string }) {
  const { itens, variosPapeis } = caixaDe(d, sessao.pessoa, sessao.admin, hoje);
  return (
    <section aria-label="Precisa de você" style={s(estilo ?? 'background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px')}>
      <div style={s('display: flex; flex-direction: column; gap: 2px')}>
        <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Precisa de você</h2>
        <span style={s('font-size: 12px; color: #5E5770')}>Tudo que depende de você{variosPapeis ? ', em todos os seus papéis,' : ''} em ordem de prioridade.</span>
      </div>
      {itens.length === 0 && <Vazio>Tudo em dia. Nada esperando por você.</Vazio>}
      {GRUPOS_CAIXA.map((g) => {
        const doGrupo = itens.filter((x) => x.grupo === g.chave);
        if (!doGrupo.length) return null;
        return (
          <div key={g.chave} role="group" aria-label={g.titulo} style={s('display: flex; flex-direction: column; gap: 8px; padding-top: 4px')}>
            <span style={s('font-size: 12px; font-weight: 700; color: #5E5770; letter-spacing: 0.3px')}>{g.titulo.toUpperCase()} <span style={s('font-weight: 600')}>({doGrupo.length})</span>{g.dica && <span style={s('font-weight: 400; letter-spacing: 0')}> · {g.dica}</span>}</span>
            {doGrupo.map((x) => x.cobrarIds ? (
              <div key={x.id} style={s('display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1px solid #EFEBE3; color: #26213A')}>
                <span style={s('width: 32px; height: 32px; border-radius: 9px; background: #EFEAFE; color: #4B2FD1; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex: 0 0 32px')}>{x.numero}</span>
                <span style={s('display: flex; flex-direction: column; flex: 1; min-width: 0')}><span style={s('font-size: 14px; font-weight: 600')}>{x.titulo}</span><span style={s('font-size: 12px; color: #5E5770')}>{x.sub}</span></span>
                <BotaoCobrar ids={x.cobrarIds} />
              </div>
            ) : (
              <ItemAcao key={x.id} href={x.href} titulo={x.titulo} sub={x.sub} acao={x.acao} numero={x.numero} tom={x.tom} badgeTom={x.badgeTom} etiqueta={variosPapeis ? x.papel : undefined} />
            ))}
          </div>
        );
      })}
    </section>
  );
}
