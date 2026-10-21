import { s } from '@/lib/css';
import type { DadosOrg } from '@/lib/dados';
import type { Sessao } from '@/lib/sessao';
import { br, diffDias } from '@/lib/regras/datas';
import { cicloVM } from '@/lib/ciclo-vm';
import { cicloAberto, infoProjeto, listaAvaliacao, nomeArea, noRaia, pessoa, pessoasAcimaDoCedido, raiaChave } from '@/lib/visoes';
import { ItemAcao, Kpi, GradeKpi, Painel, Vazio } from '@/components/ui';
import { Saudacao } from './Saudacao';
import { PainelCiclo } from './PainelCiclo';
import { BotaoCobrar } from './BotaoCobrar';

export function InicioPMO({ d, sessao, hoje }: { d: DadosOrg; sessao: Sessao; hoje: string }) {
  const exe = d.iniciativas.filter((i) => noRaia(d, i, 'exe'));
  const pau = d.iniciativas.filter((i) => noRaia(d, i, 'pau'));
  const conta = (f: string) => exe.filter((i) => i.farol === f).length;
  const criticos = exe.filter((i) => i.farol === 'crit');
  const aberto = cicloAberto(d);

  let texto = `O portfólio tem ${exe.length} ${exe.length === 1 ? 'projeto' : 'projetos'} em execução.`;
  const extra: string[] = [];
  if (criticos.length) extra.push(`${criticos.length} ${criticos.length === 1 ? 'está crítico' : 'estão críticos'}`);
  if (aberto) extra.push(`o ciclo ${aberto.ano} fecha em ${Math.max(0, diffDias(aberto.fechamento, hoje))} dias`);
  if (extra.length) texto += ' ' + extra.join(' e ').replace(/^./, (c) => c.toUpperCase()) + '.';

  // ---- Precisa de você ----
  const itens: React.ReactNode[] = [];
  const av = listaAvaliacao(d);
  const prontas = av.itens.filter((x) => !x.comunicado && !x.decisao).length;
  if (prontas) itens.push(<ItemAcao key="av" href="/avaliacao" numero={prontas} titulo={prontas === 1 ? 'Iniciativa pronta para avaliar' : 'Iniciativas prontas para avaliar'} sub={`Já aprovadas pelos gestores${av.ciclo ? ` no ciclo ${av.ciclo.ano}` : ''}`} acao="Avaliar →" />);

  if (criticos.length === 1) {
    const c = criticos[0];
    const info = infoProjeto(d, c, hoje);
    const partes = [info.desvio && info.desvio > 0 ? `${info.desvio} semana(s) de atraso` : 'Farol crítico'];
    partes.push(info.ultimoStatus ? `último status em ${br(info.ultimoStatus.data).slice(0, 5)}` : 'sem status publicado');
    itens.push(<ItemAcao key="crit" href={`/projetos/${c.id}`} numero={1} tom="vermelho" titulo={`${c.titulo} está crítico`} sub={partes.join(' · ')} acao="Ver →" />);
  } else if (criticos.length > 1) {
    itens.push(<ItemAcao key="crit" href="/portfolio" numero={criticos.length} tom="vermelho" titulo={`${criticos.length} projetos críticos`} sub={criticos.map((c) => c.titulo).join(' · ')} acao="Ver →" />);
  }

  for (const m of d.mudancas.filter((x) => x.status === 'pendente')) {
    const proj = d.iniciativas.find((i) => i.id === m.iniciativaId);
    const quem = pessoa(d, m.solicitanteId);
    itens.push(<ItemAcao key={m.id} href={`/projetos/${m.iniciativaId}`} numero={1} titulo="Pedido para alterar linha de base" sub={`${proj?.titulo ?? ''} · ${quem?.nome ?? ''} pede ${m.descricao}`} acao="Decidir →" />);
  }

  const atrasados = exe.filter((i) => infoProjeto(d, i, hoje).statusAtrasado);
  if (atrasados.length) {
    itens.push(
      <div key="st" style={s('display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1px solid #EFEBE3; color: #26213A')}>
        <span style={s('width: 32px; height: 32px; border-radius: 9px; background: #EFEAFE; color: #4B2FD1; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex: 0 0 32px')}>{atrasados.length}</span>
        <span style={s('display: flex; flex-direction: column; flex: 1; min-width: 0')}><span style={s('font-size: 14px; font-weight: 600')}>Status da semana atrasados</span><span style={s('font-size: 12px; color: #5E5770')}>{atrasados.map((a) => a.titulo).join(' e ')}</span></span>
        <BotaoCobrar ids={atrasados.map((a) => a.id)} />
      </div>,
    );
  }

  const pre = d.iniciativas.filter((i) => noRaia(d, i, 'pre'));
  if (pre.length) {
    const exeR = raiaChave(d, 'exe');
    const total = exeR?.criterios.length ?? 5;
    const pront = pre.map((i) => ({ i, n: ((exeR && i.progressoGates[exeR.id]) || []).filter(Boolean).length })).sort((a, b) => b.n - a.n);
    const top = pront[0];
    itens.push(<ItemAcao key="pre" href="/portfolio" numero={pre.length} titulo={pre.length === 1 ? 'Pré-projeto pronto para o play' : 'Pré-projetos prontos para o play'} sub={`${top.i.titulo} está com ${top.n} de ${total} critérios`} acao="Ver →" />);
  }

  const acima = pessoasAcimaDoCedido(d, hoje);
  if (acima.length) {
    itens.push(<ItemAcao key="cap" href={sessao.admin ? '/cadastros' : '/portfolio'} numero={acima.length} badgeTom="ambar"
      titulo={acima.length === 1 ? 'Pessoa alocada acima do cedido' : 'Pessoas alocadas acima do cedido'}
      sub={acima.map((x) => `${x.pessoa.nome} (${nomeArea(d, x.pessoa.areaId)}) ${x.alocacao}% de ${x.pessoa.cedeAte}%`).join(' · ')} acao="Ver →" />);
  }

  const ciclos = d.ciclos.filter((c) => c.etapa !== 'planejado').sort((a, b) => b.ano - a.ano).map((c) => cicloVM(d, c, hoje));

  return (
    <>
      <Saudacao nome={sessao.pessoa.nome} hoje={hoje} texto={texto} />
      <GradeKpi>
        <Kpi href="/portfolio" rotulo="Em execução" valor={exe.length} />
        <Kpi href="/portfolio" rotulo="OK" valor={conta('ok')} cor="#17723D" />
        <Kpi href="/portfolio" rotulo="Atenção" valor={conta('aten')} cor="#9A5B05" />
        <Kpi href="/portfolio" rotulo="Crítico" valor={conta('crit')} cor="#B42318" />
        <Kpi href="/portfolio" rotulo="Pausados" valor={pau.length} />
      </GradeKpi>
      <div style={s('display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start')}>
        <Painel titulo="Precisa de você" rotulo="Precisa de você" estilo="flex: 999 1 460px; min-width: 0; background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px">
          {itens.length ? itens : <Vazio>Tudo em dia. Nada esperando por você.</Vazio>}
        </Painel>
        {ciclos.length > 0 && <PainelCiclo ciclos={ciclos} />}
      </div>
    </>
  );
}
