import { s } from '@/lib/css';
import type { DadosOrg } from '@/lib/dados';
import type { Sessao } from '@/lib/sessao';
import { addDias, br } from '@/lib/regras/datas';
import { GRUPOS_CAIXA, planoEfetivo } from '@/lib/regras/meu-tars';
import { podeMarcarLida } from '@/lib/regras/novidades';
import { caixaDe, type ItemCaixa } from '@/lib/meu-tars';
import { planosDe } from '@/lib/novidades';
import { ItemAcao, Vazio } from '@/components/ui';
import { BotaoCobrar } from './BotaoCobrar';
import { PlanoItem } from './PlanoItem';

const sTitulo = s('font-size: 12px; font-weight: 700; color: #5E5770; letter-spacing: 0.3px');

/**
 * "Precisa de você" do Meu TARS: tudo que depende da pessoa, de todos os perfis dela, agrupado por prioridade,
 * com o plano pessoal dela por cima (hoje, esta semana) e o que ela deixou para depois ou adiou, recolhido no fim.
 */
export async function CaixaUnica({ d, sessao, hoje, estilo }: { d: DadosOrg; sessao: Sessao; hoje: string; estilo?: string }) {
  const { itens, variosPapeis } = caixaDe(d, sessao.pessoa, sessao.admin, hoje);
  const planos = await planosDe(sessao.orgId, sessao.pessoa.id);
  const pode = podeMarcarLida({ realId: sessao.real.id, pessoaId: sessao.pessoa.id });
  const comPlano = itens.map((x) => ({ ...x, plano: planoEfetivo(planos.get(x.id), hoje), adiadoAte: planos.get(x.id)?.adiadoAte ?? null }));
  const amanha = addDias(hoje, 1);

  const linha = (x: (typeof comPlano)[number], nota?: string) => (
    <div key={x.id} style={s('display: flex; flex-wrap: wrap; align-items: center; gap: 8px')}>
      <div style={s('flex: 1 1 380px; min-width: 0')}>
        {x.cobrarIds ? (
          <div style={s('display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1px solid #EFEBE3; color: #26213A')}>
            <span style={s('width: 32px; height: 32px; border-radius: 9px; background: #EFEAFE; color: #4B2FD1; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex: 0 0 32px')}>{x.numero}</span>
            <span style={s('display: flex; flex-direction: column; flex: 1; min-width: 0')}><span style={s('font-size: 14px; font-weight: 600')}>{x.titulo}</span><span style={s('font-size: 12px; color: #5E5770')}>{x.sub}</span></span>
            <BotaoCobrar ids={x.cobrarIds} />
          </div>
        ) : (
          <ItemAcao href={x.href} titulo={x.titulo} sub={nota ? `${x.sub} · ${nota}` : x.sub} acao={x.acao} numero={x.numero} tom={x.tom} badgeTom={x.badgeTom} etiqueta={variosPapeis ? x.papel : undefined} />
        )}
      </div>
      {pode && <PlanoItem itemId={x.id} titulo={x.titulo} atual={x.plano === 'hoje' || x.plano === 'semana' || x.plano === 'depois' ? x.plano : ''} amanha={amanha} />}
    </div>
  );
  const bloco = (rotulo: string, lista: typeof comPlano, dica?: string, destaque?: boolean) => lista.length > 0 && (
    <div role="group" aria-label={rotulo} style={{ ...s('display: flex; flex-direction: column; gap: 8px; padding-top: 4px'), ...(destaque ? s('padding: 12px; border-radius: 12px; background: #F7F4FF') : {}) }}>
      <span style={sTitulo}>{rotulo.toUpperCase()} <span style={s('font-weight: 600')}>({lista.length})</span>{dica && <span style={s('font-weight: 400; letter-spacing: 0')}> · {dica}</span>}</span>
      {lista.map((x) => linha(x))}
    </div>
  );
  const recolhido = (rotulo: string, lista: typeof comPlano, nota: (x: (typeof comPlano)[number]) => string | undefined) => lista.length > 0 && (
    <details role="group" aria-label={rotulo}>
      <summary style={s('cursor: pointer; font-size: 13px; font-weight: 600; color: #4B2FD1')}>{rotulo} ({lista.length})</summary>
      <div style={s('display: flex; flex-direction: column; gap: 8px; margin-top: 8px')}>{lista.map((x) => linha(x, nota(x)))}</div>
    </details>
  );
  const semPlano = comPlano.filter((x) => !x.plano);

  return (
    <section aria-label="Precisa de você" style={s(estilo ?? 'background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px')}>
      <div style={s('display: flex; flex-direction: column; gap: 2px')}>
        <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Precisa de você</h2>
        <span style={s('font-size: 12px; color: #5E5770')}>Tudo que depende de você{variosPapeis ? ', em todos os seus papéis,' : ''} em ordem de prioridade.{pode ? ' Use "Planejar" para montar o seu dia: o plano é só seu e não muda nenhum prazo.' : ''}</span>
      </div>
      {itens.length === 0 && <Vazio>Tudo em dia. Nada esperando por você.</Vazio>}
      {bloco('Meu plano para hoje', comPlano.filter((x) => x.plano === 'hoje'), undefined, true)}
      {bloco('Meu plano para esta semana', comPlano.filter((x) => x.plano === 'semana'), undefined, true)}
      {GRUPOS_CAIXA.map((g) => <span key={g.chave} style={s('display: contents')}>{bloco(g.titulo, semPlano.filter((x) => x.grupo === g.chave), g.dica)}</span>)}
      {recolhido('Deixei para depois', comPlano.filter((x) => x.plano === 'depois'), (x) => (x.grupo === 'atrasado' ? 'continua atrasado no muro' : undefined))}
      {recolhido('Adiados', comPlano.filter((x) => x.plano === 'adiado'), (x) => (x.adiadoAte ? `volta em ${br(x.adiadoAte).slice(0, 5)}` : undefined))}
    </section>
  );
}

export type { ItemCaixa };
