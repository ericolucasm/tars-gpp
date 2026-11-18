import { exigirSessao } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { hojeISO } from '@/lib/regras/datas';
import { Shell } from '@/components/Shell';
import { InicioPMO } from './InicioPMO';
import { InicioGestor } from './InicioGestor';
import { InicioGP } from './InicioGP';
import { InicioColaborador } from './InicioColaborador';
import { naoLidas, novidadesDe } from '@/lib/novidades';
import { podeMarcarLida } from '@/lib/regras/novidades';
import { PainelNovidades } from '@/components/Novidades';

export const dynamic = 'force-dynamic';

export default async function Inicio() {
  const sessao = await exigirSessao();
  const d = await carregarOrg(sessao.orgId);
  const hoje = hojeISO();
  const [itens, n] = await Promise.all([novidadesDe(sessao.orgId, sessao.pessoa.id, 30), naoLidas(sessao.orgId, sessao.pessoa.id)]);
  const novidades = <PainelNovidades itens={itens} naoLidas={n} hoje={hoje} podeMarcar={podeMarcarLida({ realId: sessao.real.id, pessoaId: sessao.pessoa.id })} />;
  const props = { d, sessao, hoje, novidades };
  return (
    <Shell sessao={sessao} dados={d} atual="inicio">
      {sessao.perfil === 'pmo' && <InicioPMO {...props} />}
      {sessao.perfil === 'gestor' && <InicioGestor {...props} />}
      {sessao.perfil === 'gp' && <InicioGP {...props} />}
      {sessao.perfil === 'colaborador' && <InicioColaborador {...props} />}
    </Shell>
  );
}
