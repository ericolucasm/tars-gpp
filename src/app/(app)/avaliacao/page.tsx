import { exigirPerfil } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { br, dinheiro, hojeISO } from '@/lib/regras/datas';
import { CRITERIOS_AVALIACAO } from '@/lib/regras/avaliacao';
import type { DadosOrg, Iniciativa } from '@/lib/dados';
import { custoDe, ehFiltroAvaliacao, FILTROS_AVALIACAO, iniciativasDoFiltro, listaAvaliacao, nomeArea, pessoa, pessoasAcimaDoCedido, projetosDaPessoa, rotuloCiclo, situacaoDoCard, TIPOS, URGENCIAS } from '@/lib/visoes';
import { Shell } from '@/components/Shell';
import { TelaAvaliacao } from './TelaAvaliacao';

export const dynamic = 'force-dynamic';

/** Informações da iniciativa para o PMO atuar (detalhe que abre abaixo da linha). */
function detalhe(d: DadosOrg, i: Iniciativa) {
  const sol = pessoa(d, i.solicitanteId);
  const apr = pessoa(d, i.aprovadorId);
  const pat = pessoa(d, i.patrocinadorId)?.nome ?? i.patrocinadorTexto ?? '';
  const dia = (x: Date | null) => (x ? br(x.toISOString().slice(0, 10)) : '');
  const raia = d.raias.find((r) => r.id === i.raiaId)?.nome ?? '';
  const situacao = situacaoDoCard(d, i);
  return {
    problema: i.problema, resultado: i.resultadoEsperado,
    campos: [
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
    ].filter(([, v]) => v) as [string, string][],
  };
}

export default async function Avaliacao({ searchParams }: { searchParams: Promise<{ ciclo?: string; status?: string }> }) {
  const sessao = await exigirPerfil('pmo');
  const d = await carregarOrg(sessao.orgId);
  const hoje = hojeISO();
  const { ciclo, itens } = listaAvaliacao(d);
  const sp = await searchParams;

  // Filtros: ciclo (padrão = ciclo em andamento) e status (padrão = "Na mesa do PMO", a lista de sempre)
  const opcoesCiclo = d.ciclos.filter((c) => c.etapa !== 'planejado').sort((a, b) => b.ano - a.ano);
  const cicloSel = opcoesCiclo.find((c) => c.id === sp.ciclo) ?? ciclo ?? opcoesCiclo[0];
  const ehAtual = !!ciclo && cicloSel?.id === ciclo.id;
  const status = ehFiltroAvaliacao(sp.status) ? sp.status : ehAtual ? 'mesa' : 'recebidas';
  const visiveis = cicloSel ? iniciativasDoFiltro(d, cicloSel, status) : [];
  const naMesa = new Map(itens.map((x) => [x.ini.id, x]));
  const pesos = d.org.config.pesos;

  // Concorrência de recursos: iniciativa sem decisão que impacta área com gente acima do cedido
  const acima = pessoasAcimaDoCedido(d, hoje);
  let alerta: { titulo: string; area: string; pessoa: string; projeto: string } | null = null;
  for (const it of itens.filter((x) => !x.decisao || x.decisao !== 'rec')) {
    const hit = acima.find((a) => a.pessoa.areaId && it.ini.areasImpactadas.includes(a.pessoa.areaId));
    if (hit) {
      const proj = projetosDaPessoa(d, hit.pessoa.id, hoje).sort((a, b) => b.pct - a.pct)[0];
      alerta = { titulo: it.ini.titulo, area: nomeArea(d, hit.pessoa.areaId), pessoa: hit.pessoa.nome, projeto: proj ? proj.projeto.titulo.split(' para ')[0] : '' };
      break;
    }
  }

  return (
    <Shell sessao={sessao} dados={d} atual="avaliacao" mainStyle="flex: 999 1 560px; min-width: 0; padding: 28px 32px 40px; box-sizing: border-box; display: flex; flex-direction: column; gap: 18px">
      <TelaAvaliacao
        cicloNome={ciclo?.nome ?? null}
        orcamento={ciclo?.orcamentoRef ?? 0}
        pesos={CRITERIOS_AVALIACAO.map((c, i) => ({ nome: c === 'Alinhamento' ? 'Alinhamento estratégico' : c, peso: pesos[i] }))}
        podeAjustarPesos={sessao.admin}
        alerta={alerta}
        motivos={d.org.config.motivos.recusa}
        ciclos={opcoesCiclo.map((c) => ({ id: c.id, nome: c.nome, atual: c.id === ciclo?.id }))}
        filtros={FILTROS_AVALIACAO.map((f) => ({ chave: f.chave, rotulo: f.rotulo }))}
        cicloSel={cicloSel?.id ?? ''}
        status={status}
        ehAtual={ehAtual}
        visiveis={visiveis.map((i) => i.id)}
        linhas={[
          // a mesa do PMO (editável) sempre vai inteira: é dela que saem orçamento, contadores e o "Comunicar"
          ...itens.map((x) => ({
            id: x.ini.id, titulo: x.ini.titulo, area: nomeArea(d, x.ini.areaId), tipo: TIPOS[x.ini.tipo]?.rotulo ?? '', custo: custoDe(x.ini), custoLabel: dinheiro(custoDe(x.ini)),
            obrigatoria: x.ini.tipo === 'obr', notas: x.notas, decisao: x.decisao, motivoRecusa: x.motivoRecusa, comunicado: x.comunicado,
            editavel: true, situacao: '', det: detalhe(d, x.ini),
          })),
          // as demais do filtro aparecem só para consulta, com a avaliação que tiveram no ciclo escolhido
          ...visiveis.filter((i) => !naMesa.has(i.id)).map((i) => {
            const av = d.avaliacoes.find((a) => a.iniciativaId === i.id && a.cicloId === cicloSel?.id);
            return {
              id: i.id, titulo: i.titulo, area: nomeArea(d, i.areaId), tipo: TIPOS[i.tipo]?.rotulo ?? '', custo: custoDe(i), custoLabel: dinheiro(custoDe(i)),
              obrigatoria: i.tipo === 'obr', notas: av?.notas ?? [0, 0, 0, 0], decisao: (av?.decisao ?? null) as 'pre' | 'bkl' | 'rec' | null, motivoRecusa: av?.motivoRecusa ?? null,
              comunicado: !!av?.comunicado, editavel: false,
              situacao: [d.raias.find((r) => r.id === i.raiaId)?.nome, situacaoDoCard(d, i)].filter(Boolean).join(' · '), det: detalhe(d, i),
            };
          }),
        ]}
      />
    </Shell>
  );
}
