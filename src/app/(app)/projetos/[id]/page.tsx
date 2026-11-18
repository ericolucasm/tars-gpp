import { notFound, redirect } from 'next/navigation';
import { exigirSessao, temPerfil } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { br, hojeISO } from '@/lib/regras/datas';
import { iniciais } from '@/lib/regras/pessoas';
import { modoDoProjeto, semanaHoje } from '@/lib/regras/projeto';
import { conclusaoPara, equipeParaFeedback, fasesDo, linhaBaseDo, nomeArea, participaDoProjeto, pessoa } from '@/lib/visoes';
import { Shell } from '@/components/Shell';
import { TelaProjeto } from './TelaProjeto';
import { SecaoPontos } from './SecaoPontos';
import { VisaoLeitura } from './VisaoLeitura';
import { Patrocinio } from './Patrocinio';
import { TrocarGp } from './TrocarGp';
import { Mudancas } from './Mudancas';
import { Financeiro } from './Financeiro';
import { Feedback } from './Feedback';
import { Dependencias } from './Dependencias';
import { Encerramento } from './Encerramento';
import { Prazos } from './Prazos';
import { diasDeAtraso } from '@/lib/regras/muro';
import { dataDaSemana } from '@/lib/regras/projeto';
import { ROTULO_DEP, TOM_DEP } from '@/lib/regras/dependencias';
import { CartaoBeneficio } from '@/components/Beneficio';
import { beneficioVM } from '@/lib/beneficios-vm';
import { s } from '@/lib/css';
import { TIPOS_MUDANCA } from '@/lib/regras/mudancas';
import { dinheiro } from '@/lib/regras/datas';
import { balancoDo, dependenciasVM, infoProjeto, dimensoesSemPrazo, financeiroDo, noRaia, orcamentoDoProjeto } from '@/lib/visoes';

export const dynamic = 'force-dynamic';

export default async function Projeto({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fase?: string }> }) {
  const { id } = await params;
  const { fase } = await searchParams;
  const sessao = await exigirSessao();
  const d = await carregarOrg(sessao.orgId);
  const ini = d.iniciativas.find((i) => i.id === id);
  if (!ini || !ini.inicioProjeto) notFound();
  const ehPmo = temPerfil(sessao, 'pmo');
  const ehGp = ini.gpId === sessao.pessoa.id;
  const hoje = hojeISO();
  const modo = modoDoProjeto({ ehPmo, ehGp, participa: participaDoProjeto(d, ini.id, sessao.pessoa.id), solicitante: ini.solicitanteId === sessao.pessoa.id, patrocinador: !!ini.patrocinadorId && ini.patrocinadorId === sessao.pessoa.id });
  if (!modo) redirect('/inicio');
  if (modo === 'leitura') {
    // quem participa do projeto (alocado, responsável de fase ou de tarefa) ou pediu a iniciativa vê o projeto em modo leitura
    return <Shell sessao={sessao} dados={d} atual={`projeto:${ini.id}`}><VisaoLeitura d={d} sessao={sessao} ini={ini} hoje={hoje} /></Shell>;
  }

  const fases = fasesDo(d, ini.id);
  const faseIds = new Set(fases.map((f) => f.id));
  const ciclo = d.ciclos.find((c) => c.id === ini.cicloId);
  const patro = pessoa(d, ini.patrocinadorId);
  const modelo = d.modelos.find((m) => m.id === ini.modeloId);
  const raia = d.raias.find((r) => r.id === ini.raiaId);
  const mud = d.mudancas.find((m) => m.iniciativaId === ini.id && m.status === 'pendente');
  const alocIds = new Set(d.alocacoes.filter((a) => faseIds.has(a.faseId)).map((a) => a.pessoaId));

  const cab = ['PROJETO', nomeArea(d, ini.areaId).toUpperCase(), ciclo ? `CICLO ${ciclo.ano}` : 'FORA DO CICLO'].join(' · ');
  const patroTxt = [
    patro ? `Patrocinador: ${patro.nome}${patro.cargo ? ` (${patro.cargo})` : ''}` : ini.patrocinadorTexto ? `Patrocinador: ${ini.patrocinadorTexto}` : null,
    modelo ? `Modelo: ${modelo.nome}` : null,
    raia && raia.chave !== 'exe' ? `Etapa: ${raia.nome}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Shell sessao={sessao} dados={d} atual={`projeto:${ini.id}`}>
      <TelaProjeto
        p={{
          id: ini.id, titulo: ini.titulo, cabecalho: cab, patrocinio: patroTxt, farol: (ini.farol ?? 'ok') as 'ok' | 'aten' | 'crit',
          inicio: ini.inicioProjeto, inicioLabel: br(ini.inicioProjeto), hoje, semanaHoje: semanaHoje(ini.inicioProjeto, hoje),
          fases: fases.map((f) => ({ id: f.id, nome: f.nome, inicioSemana: f.inicioSemana, duracao: f.duracao, criterio: f.criterioConclusao, confirmada: f.confirmadaEm ? br(f.confirmadaEm.toISOString().slice(0, 10)) : null })),
          base: linhaBaseDo(d, ini.id),
          biblioteca: d.fasesBiblioteca.map((b) => ({ id: b.id, nome: b.nome, dur: b.duracaoSemanas })),
          tarefas: d.tarefas.filter((t) => t.iniciativaId === ini.id).map((t) => ({ id: t.id, faseId: t.faseId, titulo: t.titulo, responsavelId: t.responsavelId, prazo: t.prazo, concluida: t.concluida })),
          alocs: d.alocacoes.filter((a) => faseIds.has(a.faseId)).map((a) => ({ faseId: a.faseId, pessoaId: a.pessoaId, pct: a.pct })),
          pessoas: d.pessoas.filter((p) => p.status === 'ativo' || alocIds.has(p.id)).map((p) => ({
            id: p.id, nome: p.nome, ini: iniciais(p.nome), papel: [p.cargo, p.externo ? null : nomeArea(d, p.areaId)].filter(Boolean).join(' · '), cap: p.externo ? null : p.cedeAte, noProjeto: alocIds.has(p.id) || p.id === ini.gpId,
          })),
          marcos: d.marcos.filter((m) => faseIds.has(m.faseId)).map((m) => ({ id: m.id, faseId: m.faseId, nome: m.nome, data: m.data, status: m.status })),
          riscos: d.riscos.filter((r) => faseIds.has(r.faseId)).map((r) => ({ id: r.id, faseId: r.faseId, nome: r.nome, nivel: r.nivel, probabilidade: r.probabilidade, impacto: r.impacto, responsavelId: r.responsavelId, plano: r.plano, status: r.status })),
          reports: d.reports.filter((r) => r.iniciativaId === ini.id).sort((a, b) => b.data.localeCompare(a.data)).map((r) => ({ id: r.id, data: r.data, farol: r.farol, desvio: r.desvio, a: r.avancou, b: r.aSeguir, c: r.atencao })),
          mudanca: mud ? { id: mud.id, descricao: mud.descricao, solicitante: pessoa(d, mud.solicitanteId)?.nome ?? '' } : null,
          ehPmo, gpId: ini.gpId ?? '', dimensoes: dimensoesSemPrazo(d, ini, hoje),
          faseInicial: fase && faseIds.has(fase) ? fase : '',
        }}
      />
      {ehPmo && (() => {
        const gpAtual = pessoa(d, ini.gpId);
        return <TrocarGp iniciativaId={ini.id} atual={ini.gpId ?? ''} atualNome={gpAtual?.nome ?? 'Sem GP'} inativo={gpAtual?.status === 'inativo'}
          opcoes={d.pessoas.filter((x) => !x.externo && x.status !== 'inativo').sort((a, b) => Number(b.perfis.includes('gp')) - Number(a.perfis.includes('gp')) || a.nome.localeCompare(b.nome)).map((x) => ({ id: x.id, nome: x.nome, gp: x.perfis.includes('gp') }))} />;
      })()}
      {ehPmo && <Patrocinio iniciativaId={ini.id} atual={ini.patrocinadorId ?? ''} texto={ini.patrocinadorTexto}
        opcoes={d.pessoas.filter((x) => !x.externo && x.status !== 'inativo' && x.perfis.includes('patrocinador')).map((x) => ({ id: x.id, nome: x.nome }))} />}
      {(() => {
        const info = infoProjeto(d, ini, hoje);
        return (
          <Prazos iniciativaId={ini.id} podeEditar={ehPmo || ehGp} cadencia={ini.statusCadencia} dia={ini.statusDia} proximoStatus={br(info.proximoStatus)} statusAtrasado={info.statusAtrasado}
            fases={fases.map((f) => { const gate = dataDaSemana(ini.inicioProjeto!, f.inicioSemana + f.duracao); return { id: f.id, nome: f.nome, gate: br(gate), responsavelId: f.responsavelId, confirmada: !!f.confirmadaEm, atraso: f.confirmadaEm ? 0 : diasDeAtraso(gate, hoje) }; })}
            pessoas={d.pessoas.filter((x) => !x.externo && (x.status === 'ativo' || alocIds.has(x.id))).map((x) => ({ id: x.id, nome: x.nome }))}
            pedidos={d.pedidosPrazo.filter((x) => x.iniciativaId === ini.id && x.status === 'pendente').map((x) => ({
              id: x.id, alvo: x.tipo === 'tarefa' ? `a tarefa "${d.tarefas.find((tf) => tf.id === x.alvoId)?.titulo ?? ''}"` : `a fase ${d.fases.find((f) => f.id === x.alvoId)?.nome ?? ''}`,
              quem: pessoa(d, x.solicitanteId)?.nome ?? '', de: x.prazoAtual ? br(x.prazoAtual) : '—', para: br(x.novoPrazo), motivo: x.motivo,
            }))} />
        );
      })()}
      {(() => {
        const f = financeiroDo(d, ini);
        return (
          <Financeiro iniciativaId={ini.id} hoje={hoje} ehPmo={ehPmo} orcado={dinheiro(f.orcado)} realizado={dinheiro(f.realizado)} previsao={dinheiro(f.previsao)}
            consumoPct={f.consumoPct} concluidoPct={f.concluidoPct} desvioPct={f.desvioPct} situacao={f.situacao} previsaoValor={f.previsao} orcadoValor={f.orcado}
            lancamentos={d.lancamentos.filter((l) => l.iniciativaId === ini.id).slice().reverse().map((l) => ({ id: l.id, data: br(l.data), descricao: l.descricao, valor: dinheiro(l.valor), autor: pessoa(d, l.autorId)?.nome ?? '' }))} />
        );
      })()}
      <section id="beneficio" aria-label="Benefício esperado" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px; scroll-margin-top: 16px')}>
        <div style={s('display: flex; flex-direction: column; gap: 2px')}>
          <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Benefício esperado</h2>
          <span style={s('font-size: 12px; color: #5E5770')}>Como saber se o projeto deu resultado. Na data de medir, quem pediu, o gestor, o GP ou o PMO registra o resultado real.</span>
        </div>
        <CartaoBeneficio b={beneficioVM(d, ini, sessao.pessoa.id, ehPmo, hoje)} />
      </section>
      <Mudancas iniciativaId={ini.id} orcamento={dinheiro(orcamentoDoProjeto(ini))} ehPmo={ehPmo} podePedir={ehPmo || ehGp}
        pedidos={d.pedidosMudanca.filter((m) => m.iniciativaId === ini.id).reverse().map((m) => ({
          id: m.id, tipo: m.tipo, tipoRotulo: TIPOS_MUDANCA[m.tipo] ?? m.tipo, descricao: m.descricao, justificativa: m.justificativa,
          valores: m.tipo === 'custo' && m.valorNovo ? `${dinheiro(m.valorAnterior ?? 0)} → ${dinheiro(m.valorNovo)}` : '',
          status: m.status, solicitante: pessoa(d, m.solicitanteId)?.nome ?? '', criadoEm: br(m.createdAt.toISOString().slice(0, 10)),
          decisao: m.decididoEm ? `${m.status === 'aprovada' ? 'aprovada' : 'recusada'} por ${pessoa(d, m.decididoPor)?.nome ?? 'PMO'} em ${br(m.decididoEm.toISOString().slice(0, 10))}${m.comentarioDecisao ? `: "${m.comentarioDecisao}"` : ''}` : '',
        }))} />
      {(() => {
        const deps = dependenciasVM(d, hoje);
        const vm = (y: (typeof deps)[number], outro: typeof ini) => ({
          id: y.x.id, outro: outro.titulo, outroHref: outro.inicioProjeto && (ehPmo || outro.gpId === sessao.pessoa.id) ? `/projetos/${outro.id}#dependencias` : null,
          descricao: y.x.descricao, precisaAte: br(y.x.precisaAte), fimPrevisto: y.fimPrevisto ? br(y.fimPrevisto) : 'sem data', rotulo: ROTULO_DEP[y.situacao], tom: TOM_DEP[y.situacao],
        });
        return (
          <Dependencias iniciativaId={ini.id} podeEditar={ehPmo || ehGp}
            dependeDe={deps.filter((y) => y.dep.id === ini.id).map((y) => vm(y, y.de))}
            dependemDeste={deps.filter((y) => y.de.id === ini.id).map((y) => vm(y, y.dep))}
            opcoes={d.iniciativas.filter((i) => i.id !== ini.id && noRaia(d, i, 'bkl', 'pre', 'exe', 'pau')).map((i) => ({ id: i.id, nome: i.titulo }))} />
        );
      })()}
      <SecaoPontos d={d} sessao={sessao} iniId={ini.id} hoje={hoje} />
      <Feedback iniciativaId={ini.id} podeEditar={ehGp} equipe={equipeParaFeedback(d, ini, hoje).map((x) => ({
        pessoaId: x.pessoa.id, nome: x.pessoa.nome, area: nomeArea(d, x.pessoa.areaId), fases: [...new Set(x.fases)].join(', '),
        participacao: x.terminou ? `participação até ${x.fim ? br(x.fim) : '—'}` : `em andamento${x.fim ? ` até ${br(x.fim)}` : ''}`,
        pendente: x.pendente, nivel: x.feedback?.nivel ?? null, comentario: x.feedback?.comentario ?? '',
      }))} />
      {(() => {
        const vm = (l: (typeof d.licoes)[number]) => ({ id: l.id, tipo: l.tipo, texto: l.texto, autor: pessoa(d, l.autorId)?.nome ?? '', data: br(l.createdAt.toISOString().slice(0, 10)),
          projeto: d.iniciativas.find((i) => i.id === l.iniciativaId)?.titulo, podeRemover: ehPmo || l.autorId === sessao.pessoa.id });
        const parecidos = new Set(d.iniciativas.filter((i) => i.id !== ini.id && i.modeloId && i.modeloId === ini.modeloId).map((i) => i.id));
        return (
          <Encerramento iniciativaId={ini.id} concluido={noRaia(d, ini, 'con')} balanco={balancoDo(d, ini, hoje)}
            conclusao={conclusaoPara(d, ini, sessao.pessoa.id, ehPmo)}
            licoes={d.licoes.filter((l) => l.iniciativaId === ini.id).reverse().map(vm)}
            parecidas={d.licoes.filter((l) => parecidos.has(l.iniciativaId)).reverse().slice(0, 8).map(vm)} />
        );
      })()}
    </Shell>
  );
}
