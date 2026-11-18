import { s } from '@/lib/css';
import type { DadosOrg } from '@/lib/dados';
import type { Sessao } from '@/lib/sessao';
import { addDias, br } from '@/lib/regras/datas';
import { GRUPOS_CAIXA, planoEfetivo, tarefaPessoalVisivel } from '@/lib/regras/meu-tars';
import { venceTextoCurto } from '@/lib/regras/muro';
import { podeMarcarLida } from '@/lib/regras/novidades';
import { caixaDe, type ItemCaixa } from '@/lib/meu-tars';
import { planosDe, tarefasPessoaisDe } from '@/lib/novidades';
import { ItemAcao, Vazio } from '@/components/ui';
import { BotaoCobrar } from './BotaoCobrar';
import { PlanoItem } from './PlanoItem';
import { LinhaTarefaPessoal, NovaTarefaPessoal } from './Pessoal';

const sTitulo = s('font-size: 12px; font-weight: 700; color: #5E5770; letter-spacing: 0.3px');

/**
 * "Precisa de você" do Meu TARS: tudo que depende da pessoa, de todos os perfis dela, agrupado por prioridade,
 * com o plano pessoal dela por cima (hoje, esta semana) e o que ela deixou para depois ou adiou, recolhido no fim.
 */
export async function CaixaUnica({ d, sessao, hoje, estilo }: { d: DadosOrg; sessao: Sessao; hoje: string; estilo?: string }) {
  const pode = podeMarcarLida({ realId: sessao.real.id, pessoaId: sessao.pessoa.id });
  // o que é pessoal (plano, anotações, tarefas pessoais) só a própria pessoa vê: nem no "ver como" do admin aparece
  const [planos, pessoais] = pode ? await Promise.all([planosDe(sessao.orgId, sessao.pessoa.id), tarefasPessoaisDe(sessao.orgId, sessao.pessoa.id)]) : [new Map(), []];
  // tarefas pessoais abertas entram na mesma caixa, com a mesma prioridade (só a pessoa vê)
  const extras: ItemCaixa[] = pessoais.filter((x) => !x.concluidaEm).map((x) => ({
    id: `pessoal-${x.id}`, papel: 'Você', titulo: x.titulo, sub: `tarefa pessoal · ${x.prazo ? venceTextoCurto(x.prazo, hoje) : 'sem prazo'}`, href: '', acao: '',
    vence: x.prazo, fazer: !x.prazo, pessoal: { id: x.id, concluida: false },
  }));
  const concluidas = pessoais.filter((x) => x.concluidaEm && tarefaPessoalVisivel(x.concluidaEm, hoje));
  const { itens, variosPapeis } = caixaDe(d, sessao.pessoa, sessao.admin, hoje, extras);
  const comPlano = itens.map((x) => ({ ...x, plano: planoEfetivo(planos.get(x.id), hoje), adiadoAte: planos.get(x.id)?.adiadoAte ?? null, nota: planos.get(x.id)?.nota ?? null }));
  const amanha = addDias(hoje, 1);

  const linha = (x: (typeof comPlano)[number], aviso?: string) => {
    const nota = [aviso, x.nota ? `📝 ${x.nota}` : null].filter(Boolean).join(' · ');
    return (
    <div key={x.id} style={s('display: flex; flex-wrap: wrap; align-items: center; gap: 8px')}>
      <div style={s('flex: 1 1 380px; min-width: 0')}>
        {x.pessoal ? (
          <LinhaTarefaPessoal id={x.pessoal.id} titulo={x.titulo} sub={nota ? `${x.sub} · ${nota}` : x.sub} concluida={false} atrasada={x.grupo === 'atrasado'} />
        ) : x.cobrarIds ? (
          <div style={s('display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1px solid #EFEBE3; color: #26213A')}>
            <span style={s('width: 32px; height: 32px; border-radius: 9px; background: #EFEAFE; color: #4B2FD1; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex: 0 0 32px')}>{x.numero}</span>
            <span style={s('display: flex; flex-direction: column; flex: 1; min-width: 0')}><span style={s('font-size: 14px; font-weight: 600')}>{x.titulo}</span><span style={s('font-size: 12px; color: #5E5770')}>{x.sub}</span></span>
            <BotaoCobrar ids={x.cobrarIds} />
          </div>
        ) : (
          <ItemAcao href={x.href} titulo={x.titulo} sub={nota ? `${x.sub} · ${nota}` : x.sub} acao={x.acao} numero={x.numero} tom={x.tom} badgeTom={x.badgeTom} etiqueta={variosPapeis ? x.papel : undefined} />
        )}
      </div>
      {pode && <PlanoItem itemId={x.id} titulo={x.titulo} atual={x.plano === 'hoje' || x.plano === 'semana' || x.plano === 'depois' ? x.plano : ''} amanha={amanha} nota={x.nota} />}
    </div>
    );
  };
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
        <span style={s('font-size: 12px; color: #5E5770')}>Tudo que depende de você{variosPapeis ? ', em todos os seus papéis,' : ''} em ordem de prioridade.{pode ? ' Use "Planejar" para montar o seu dia: o plano é só seu e não muda nenhum prazo.' : ' No "ver como", o planejamento, as anotações e as tarefas pessoais da pessoa não aparecem: são só dela.'}</span>
      </div>
      {pode && <NovaTarefaPessoal />}
      {itens.length === 0 && <Vazio>Tudo em dia. Nada esperando por você.</Vazio>}
      {bloco('Meu plano para hoje', comPlano.filter((x) => x.plano === 'hoje'), undefined, true)}
      {bloco('Meu plano para esta semana', comPlano.filter((x) => x.plano === 'semana'), undefined, true)}
      {GRUPOS_CAIXA.map((g) => <span key={g.chave} style={s('display: contents')}>{bloco(g.titulo, semPlano.filter((x) => x.grupo === g.chave), g.dica)}</span>)}
      {recolhido('Deixei para depois', comPlano.filter((x) => x.plano === 'depois'), (x) => (x.grupo === 'atrasado' ? 'continua atrasado no muro' : undefined))}
      {recolhido('Adiados', comPlano.filter((x) => x.plano === 'adiado'), (x) => (x.adiadoAte ? `volta em ${br(x.adiadoAte).slice(0, 5)}` : undefined))}
      {concluidas.length > 0 && (
        <details role="group" aria-label="Tarefas pessoais concluídas">
          <summary style={s('cursor: pointer; font-size: 13px; font-weight: 600; color: #4B2FD1')}>Tarefas pessoais concluídas ({concluidas.length})</summary>
          <div style={s('display: flex; flex-direction: column; gap: 8px; margin-top: 8px')}>
            {concluidas.map((x) => <LinhaTarefaPessoal key={x.id} id={x.id} titulo={x.titulo} sub={`concluída em ${br(x.concluidaEm).slice(0, 5)} · desmarque para reabrir`} concluida atrasada={false} />)}
          </div>
        </details>
      )}
    </section>
  );
}

export type { ItemCaixa };
