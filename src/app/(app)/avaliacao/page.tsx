import { exigirPerfil } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { dinheiro, haQuanto, hojeISO } from '@/lib/regras/datas';
import { CRITERIOS_AVALIACAO } from '@/lib/regras/avaliacao';
import { chaveDaRaia, custoDe, listaAvaliacao, nomeArea, pessoa, pessoasAcimaDoCedido, projetosDaPessoa, TIPOS } from '@/lib/visoes';
import { Shell } from '@/components/Shell';
import { TelaAvaliacao } from './TelaAvaliacao';

export const dynamic = 'force-dynamic';

export default async function Avaliacao() {
  const sessao = await exigirPerfil('pmo');
  const d = await carregarOrg(sessao.orgId);
  const hoje = hojeISO();
  const { ciclo, itens } = listaAvaliacao(d);
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
        linhas={itens.map((x) => ({
          id: x.ini.id, titulo: x.ini.titulo, area: nomeArea(d, x.ini.areaId), tipo: TIPOS[x.ini.tipo]?.rotulo ?? '', custo: custoDe(x.ini), custoLabel: dinheiro(custoDe(x.ini)),
          obrigatoria: x.ini.tipo === 'obr', notas: x.notas, decisao: x.decisao, motivoRecusa: x.motivoRecusa, comunicado: x.comunicado,
          podePedirAjuste: !x.comunicado && chaveDaRaia(d, x.ini.raiaId) === 'sol', solicitante: pessoa(d, x.ini.solicitanteId)?.nome ?? '',
        }))}
        emAjuste={d.iniciativas
          .filter((i) => chaveDaRaia(d, i.raiaId) === 'sol' && i.solStatus === 'devolvida' && i.devolucaoOrigem === 'pmo')
          .map((i) => ({
            id: i.id, titulo: i.titulo, area: nomeArea(d, i.areaId), solicitante: pessoa(d, i.solicitanteId)?.nome ?? '', nota: i.devolucaoNota ?? '',
            quando: haQuanto(i.devolvidaEm?.toISOString().slice(0, 10) ?? null, hoje),
          }))}
      />
    </Shell>
  );
}
