import { exigirAdmin } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { ordenar } from '@/lib/regras/esteira';
import { Shell } from '@/components/Shell';
import { TelaRaias } from './TelaRaias';

export const dynamic = 'force-dynamic';

export default async function Configuracoes() {
  const sessao = await exigirAdmin();
  const d = await carregarOrg(sessao.orgId);
  const raias = ordenar(d.raias).map((r) => ({
    id: r.id, nome: r.nome, descricao: r.descricao, aprovador: r.aprovador, tipoCard: r.tipoCard, criterios: r.criterios,
    saida: r.saida, padrao: !!r.chave, cards: d.iniciativas.filter((i) => i.raiaId === r.id).length,
  }));
  return (
    <Shell sessao={sessao} dados={d} atual="configuracoes" mainStyle="flex: 999 1 560px; min-width: 0; padding: 28px 32px 40px; box-sizing: border-box; display: flex; flex-direction: column; gap: 18px">
      <TelaRaias raias={raias} />
    </Shell>
  );
}
