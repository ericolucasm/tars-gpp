import { exigirSessao } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { hojeISO } from '@/lib/regras/datas';
import { Shell } from '@/components/Shell';
import { FormIniciativa } from '../FormIniciativa';
import { contextoForm } from '../contexto-form';

export const dynamic = 'force-dynamic';

export default async function NovaIniciativa() {
  const sessao = await exigirSessao();
  const d = await carregarOrg(sessao.orgId);
  return (
    <Shell sessao={sessao} dados={d} atual="nova">
      <FormIniciativa ctx={contextoForm(d, sessao, hojeISO())} />
    </Shell>
  );
}
