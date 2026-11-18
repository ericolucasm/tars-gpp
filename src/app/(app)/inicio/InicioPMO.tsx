import { s } from '@/lib/css';
import type { DadosOrg } from '@/lib/dados';
import type { Sessao } from '@/lib/sessao';
import { br, diffDias } from '@/lib/regras/datas';
import { cicloVM } from '@/lib/ciclo-vm';
import { cicloAberto, dependenciasVM, financeiroDo, infoProjeto, listaAvaliacao, nomeArea, noRaia, pessoa, pessoasAcimaDoCedido, raiaChave } from '@/lib/visoes';
import { ItemAcao, Kpi, GradeKpi, Painel, Vazio } from '@/components/ui';
import { pontoAtrasado, pontoEsperaPor } from '@/lib/regras/pontos';
import { riscoAtivo } from '@/lib/regras/riscos';
import { beneficiosParaMedir } from '@/lib/beneficios-vm';
import { atrasos } from '@/lib/muro';
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
  const meusAtrasos = atrasos(d, hoje).filter((x) => x.responsavelId === sessao.pessoa.id);
  if (meusAtrasos.length) {
    itens.push(<ItemAcao key="meus-atrasos" href="/minhas-entregas" numero={meusAtrasos.length} tom="vermelho"
      titulo={meusAtrasos.length === 1 ? 'Você tem uma entrega atrasada' : `Você tem ${meusAtrasos.length} entregas atrasadas`}
      sub={meusAtrasos.slice(0, 3).map((x) => `${x.titulo} (${x.diasAtraso}d)`).join(' · ')} acao="Resolver →" />);
  }
  const noMuro = atrasos(d, hoje);
  if (noMuro.length) {
    const pessoasNoMuro = new Set(noMuro.map((x) => x.responsavelId)).size;
    itens.push(<ItemAcao key="muro" href="/muro" numero={noMuro.length} tom="vermelho" titulo="Entregas atrasadas no portfólio (muro da vergonha)"
      sub={`${pessoasNoMuro} ${pessoasNoMuro === 1 ? 'pessoa' : 'pessoas'} com tarefas, gates ou status vencidos sem registro`} acao="Ver muro →" />);
  }
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

  const estourando = d.iniciativas.filter((i) => noRaia(d, i, 'exe', 'pau')).map((i) => ({ i, f: financeiroDo(d, i) })).filter((x) => x.f.situacao === 'crit');
  if (estourando.length) {
    itens.push(<ItemAcao key="custo" href="/relatorios?r.financeiro.situacao=crit#financeiro" numero={estourando.length} tom="vermelho"
      titulo={estourando.length === 1 ? 'Projeto estourando o orçamento' : 'Projetos estourando o orçamento'}
      sub={estourando.map((x) => `${x.i.titulo.split(' para ')[0]} (+${x.f.desvioPct}%)`).join(' · ')} acao="Ver →" />);
  }
  const fasesExe = new Set(d.fases.filter((f) => exe.some((i) => i.id === f.iniciativaId) || pau.some((i) => i.id === f.iniciativaId)).map((f) => f.id));
  const altosSemPlano = d.riscos.filter((r) => fasesExe.has(r.faseId) && r.nivel === 'Alto' && riscoAtivo(r.status) && !r.plano);
  if (altosSemPlano.length) {
    itens.push(<ItemAcao key="riscos" href="/relatorios?r.riscos.nivel=Alto&r.riscos.plano=sem#riscos" numero={altosSemPlano.length} tom="ambar" badgeTom="ambar"
      titulo={altosSemPlano.length === 1 ? 'Risco alto sem plano de resposta' : 'Riscos altos sem plano de resposta'}
      sub={altosSemPlano.slice(0, 3).map((r) => r.nome).join(' · ') + (altosSemPlano.length > 3 ? ` +${altosSemPlano.length - 3}` : '')} acao="Ver →" />);
  }
  const depsRuins = dependenciasVM(d, hoje).filter((y) => y.situacao === 'risco' || y.situacao === 'atrasada');
  if (depsRuins.length) {
    itens.push(<ItemAcao key="deps" href="/relatorios?r.dependencias.situacao=ruins#dependencias" numero={depsRuins.length} tom="vermelho"
      titulo={depsRuins.length === 1 ? 'Dependência entre projetos em risco' : 'Dependências entre projetos em risco'}
      sub={depsRuins.slice(0, 3).map((y) => `${y.dep.titulo.split(' para ')[0]} ← ${y.de.titulo.split(' para ')[0]}`).join(' · ')} acao="Ver →" />);
  }
  for (const m of d.pedidosMudanca.filter((x) => x.status === 'pendente')) {
    const proj = d.iniciativas.find((i) => i.id === m.iniciativaId);
    itens.push(<ItemAcao key={m.id} href={`/projetos/${m.iniciativaId}#mudancas`} numero={1} titulo={`Pedido de mudança de ${m.tipo === 'custo' ? 'custo' : 'escopo'}`}
      sub={`${proj?.titulo ?? ''} · ${pessoa(d, m.solicitanteId)?.nome ?? ''}: ${m.descricao}`} acao="Decidir →" />);
  }
  const aMedir = beneficiosParaMedir(d, sessao.pessoa.id, true, hoje);
  if (aMedir.length) {
    itens.push(<ItemAcao key="beneficios" href="/beneficios" numero={aMedir.length} titulo={aMedir.length === 1 ? 'Benefício para medir' : 'Benefícios para medir'}
      sub={aMedir.slice(0, 3).map((i) => `${i.titulo.split(' para ')[0]}: ${i.beneficioIndicador}`).join(' · ')} acao="Registrar →" />);
  }
  const pontos = d.pontos.filter((x) => pontoEsperaPor(x, sessao.pessoa.id, true));
  if (pontos.length) {
    const atrasados = pontos.filter((x) => pontoAtrasado(x, hoje)).length;
    itens.push(<ItemAcao key="pontos" href="/pontos" numero={pontos.length} tom={atrasados ? 'vermelho' : 'roxo'}
      titulo={pontos.length === 1 ? 'Ponto de atenção esperando por você' : 'Pontos de atenção esperando por você'}
      sub={pontos.map((x) => `${x.titulo} (${d.iniciativas.find((i) => i.id === x.iniciativaId)?.titulo.split(' para ')[0] ?? ''})`).join(' · ') + (atrasados ? ` · ${atrasados} com prazo vencido` : '')} acao="Resolver →" />);
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
