import { exigirSessao } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { hojeISO } from '@/lib/regras/datas';
import { Shell } from '@/components/Shell';
import { InicioPMO } from './InicioPMO';
import { InicioGestor } from './InicioGestor';
import { InicioGP } from './InicioGP';
import { InicioColaborador } from './InicioColaborador';

export const dynamic = 'force-dynamic';

export default async function Inicio() {
  const sessao = await exigirSessao();
  const d = await carregarOrg(sessao.orgId);
  const hoje = hojeISO();
  const props = { d, sessao, hoje };
  return (
    <Shell sessao={sessao} dados={d} atual="inicio">
      {sessao.perfil === 'pmo' && <InicioPMO {...props} />}
      {sessao.perfil === 'gestor' && <InicioGestor {...props} />}
      {sessao.perfil === 'gp' && <InicioGP {...props} />}
      {sessao.perfil === 'colaborador' && <InicioColaborador {...props} />}
    </Shell>
  );
}
