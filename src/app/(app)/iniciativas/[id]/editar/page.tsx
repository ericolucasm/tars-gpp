import { notFound } from 'next/navigation';
import { exigirSessao } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { hojeISO } from '@/lib/regras/datas';
import { Shell } from '@/components/Shell';
import { FormIniciativa } from '../../FormIniciativa';
import { contextoForm } from '../../contexto-form';
import { pessoa } from '@/lib/visoes';

export const dynamic = 'force-dynamic';

export default async function EditarIniciativa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await exigirSessao();
  const d = await carregarOrg(sessao.orgId);
  const i = d.iniciativas.find((x) => x.id === id && x.solicitanteId === sessao.pessoa.id);
  if (!i) notFound();
  return (
    <Shell sessao={sessao} dados={d} atual="nova">
      <FormIniciativa
        ctx={contextoForm(d, sessao, hojeISO())}
        inicial={{
          id: i.id, titulo: i.titulo, problema: i.problema, resultadoEsperado: i.resultadoEsperado, tipo: i.tipo,
          patrocinadorTexto: i.patrocinadorTexto ?? '', areasImpactadas: i.areasImpactadas, urgencia: i.urgencia,
          justificativaUrgencia: i.justificativaUrgencia ?? '', inicioDesejado: i.inicioDesejado ?? '', entregaDesejada: i.entregaDesejada ?? '',
          faixaCusto: i.faixaCusto, fornecedor: i.fornecedor,
        }}
        nota={i.solStatus === 'devolvida' ? i.devolucaoNota : null}
        quemPediu={i.solStatus === 'devolvida' ? (pessoa(d, i.devolvidaPorId)?.nome ?? null) : null}
        voltaAoPmo={i.solStatus === 'devolvida' && i.devolucaoOrigem === 'pmo'}
        editavel={i.solStatus === 'rascunho' || i.solStatus === 'devolvida'}
      />
    </Shell>
  );
}
