import { exigirSessao } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { addDias, hojeISO } from '@/lib/regras/datas';
import { entregas, TIPO_ENTREGA, venceTexto } from '@/lib/muro';
import { s } from '@/lib/css';
import { Shell } from '@/components/Shell';
import { Cabecalho, Vazio } from '@/components/ui';
import { CartaoEntrega, type EntregaVM } from '@/components/Entrega';

export const dynamic = 'force-dynamic';

/** Minhas entregas: tarefas, gates e status com data, de quem está logado (ou de quem o admin escolheu no "ver como"). */
export default async function MinhasEntregas() {
  const sessao = await exigirSessao();
  const d = await carregarOrg(sessao.orgId);
  const hoje = hojeISO();
  const minhas = entregas(d, hoje).filter((e) => e.responsavelId === sessao.pessoa.id);
  const vm = (e: (typeof minhas)[number]): EntregaVM => ({
    tipo: e.tipo, id: e.id, iniciativaId: e.iniciativaId, projeto: e.projeto, titulo: e.titulo, tipoRotulo: TIPO_ENTREGA[e.tipo], vence: venceTexto(e),
    atrasada: e.diasAtraso > 0, emNegociacao: e.emNegociacao,
    faseId: e.tipo === 'fase' ? e.id : e.tipo === 'tarefa' ? d.tarefas.find((t) => t.id === e.id)?.faseId ?? null : null,
    linkStatus: e.tipo === 'status' ? `/projetos/${e.iniciativaId}#status` : null,
  });
  const atrasadas = minhas.filter((e) => e.diasAtraso > 0);
  const proximas = minhas.filter((e) => e.diasAtraso === 0 && e.vencimento <= addDias(hoje, 14));
  const depois = minhas.filter((e) => e.vencimento > addDias(hoje, 14));
  const bloco = (titulo: string, lista: typeof minhas, vazio?: string) => (
    <section aria-label={titulo} style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px')}>
      <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>{titulo} <span style={s('font-size: 14px; color: #5E5770; font-weight: 600')}>({lista.length})</span></h2>
      {lista.map((e) => <CartaoEntrega key={e.id} e={vm(e)} />)}
      {lista.length === 0 && vazio && <Vazio>{vazio}</Vazio>}
    </section>
  );
  return (
    <Shell sessao={sessao} dados={d} atual="entregas">
      <Cabecalho trilha="Minhas entregas" titulo="Minhas entregas" texto="Tudo que tem data e é seu: tarefas, fins de fase (gates) e status report. Conclua, peça mais prazo ou avise do impedimento ou risco antes da data: assim você não vai para o Muro da vergonha." />
      {bloco('Atrasadas', atrasadas, 'Nada atrasado. 👏')}
      {bloco('Próximos 14 dias', proximas, 'Nada vencendo nas próximas duas semanas.')}
      {depois.length > 0 && bloco('Mais adiante', depois)}
    </Shell>
  );
}
