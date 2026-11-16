import type { DadosOrg, Iniciativa } from './dados';
import { br, dinheiro } from './regras/datas';
import { FAROL, rotuloDesvio, type Farol } from './regras/projeto';
import { infoProjeto, nomeArea, noRaia, pessoa, rotuloCiclo, situacaoDoCard, URGENCIAS } from './visoes';

// Detalhe de uma iniciativa (e, se já virou projeto, do andamento do projeto).
// Mesmo conteúdo em todas as telas que abrem o detalhe abaixo da linha (Avaliação do PMO, menus do gestor).

export type Detalhe = { problema: string; resultado: string; campos: [string, string][]; projeto: [string, string][] };

const so = (lista: [string, string][]) => lista.filter(([, v]) => v);

export function detalheIniciativa(d: DadosOrg, i: Iniciativa, hoje: string): Detalhe {
  const sol = pessoa(d, i.solicitanteId);
  const apr = pessoa(d, i.aprovadorId);
  const pat = pessoa(d, i.patrocinadorId)?.nome ?? i.patrocinadorTexto ?? '';
  const dia = (x: Date | null) => (x ? br(x.toISOString().slice(0, 10)) : '');
  const raia = d.raias.find((r) => r.id === i.raiaId)?.nome ?? '';
  const situacao = situacaoDoCard(d, i);
  const campos = so([
    ['Situação', [raia, situacao].filter(Boolean).join(' · ')],
    ['Ciclo', rotuloCiclo(d, i)],
    ['Solicitante', sol ? `${sol.nome}${sol.areaId ? ' · ' + nomeArea(d, sol.areaId) : ''}` : ''],
    ['Enviada em', dia(i.enviadaEm)],
    ['Gestor que aprova', apr ? `${apr.nome}${i.aprovadaGestorEm ? ` · aprovou em ${dia(i.aprovadaGestorEm)}` : ''}` : ''],
    ['Patrocinador', pat],
    ['Urgência', `${URGENCIAS[i.urgencia] ?? ''}${i.justificativaUrgencia ? ` · ${i.justificativaUrgencia}` : ''}`],
    ['Áreas impactadas', i.areasImpactadas.map((a) => nomeArea(d, a)).filter(Boolean).join(', ')],
    ['Início desejado', i.inicioDesejado ?? ''],
    ['Entrega desejada', i.entregaDesejada ?? ''],
    ['Faixa de custo', `${i.faixaCusto}${i.custoEstimado ? ` · estimado ${dinheiro(i.custoEstimado)}` : ''}`],
    ['Fornecedor', i.fornecedor],
    ['Esforço', i.esforco ?? ''],
    ['Devolução do gestor', i.devolucaoNota ?? ''],
  ]);

  // Andamento do projeto: só para o que já teve play (tem início de projeto)
  let projeto: [string, string][] = [];
  if (i.inicioProjeto && noRaia(d, i, 'exe', 'pau', 'con')) {
    const ip = infoProjeto(d, i, hoje);
    const st = ip.ultimoStatus;
    const feitas = ip.tarefas.filter((t) => t.concluida).length;
    const farol = i.farol ? FAROL[i.farol as Farol]?.rotulo ?? '' : '';
    projeto = so([
      ['Gerente do projeto', pessoa(d, i.gpId)?.nome ?? ''],
      ['Farol', noRaia(d, i, 'exe', 'pau') ? farol : ''],
      ['Início do projeto', br(i.inicioProjeto)],
      ['Fim previsto', br(ip.fimPrevisto)],
      ['Fase atual', noRaia(d, i, 'con') ? '' : ip.faseAtual?.nome ?? ''],
      ['Desvio da linha de base', rotuloDesvio(ip.desvio)],
      ['Tarefas concluídas', ip.tarefas.length ? `${feitas} de ${ip.tarefas.length} (${ip.progresso}%)` : 'Nenhuma tarefa cadastrada'],
      ['Tarefas atrasadas', ip.atrasadas.length ? String(ip.atrasadas.length) : ''],
      ['Riscos abertos', ip.riscos.map((r) => `${r.nome} (${r.nivel})`).join(' · ')],
      ['Próximo marco', ip.proximoMarco ? `${ip.proximoMarco.nome}${ip.proximoMarco.data ? ` · ${br(ip.proximoMarco.data)}` : ''} · ${ip.proximoMarco.status}` : ''],
      ['Último status', st ? `${br(st.data)} · ${st.avancou}` : 'Nenhum status publicado'],
    ]);
  }
  return { problema: i.problema, resultado: i.resultadoEsperado, campos, projeto };
}
