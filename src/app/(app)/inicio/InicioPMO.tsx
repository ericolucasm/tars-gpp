import { s } from '@/lib/css';
import type { DadosOrg } from '@/lib/dados';
import type { Sessao } from '@/lib/sessao';
import { diffDias } from '@/lib/regras/datas';
import { cicloVM } from '@/lib/ciclo-vm';
import { cicloAberto, noRaia } from '@/lib/visoes';
import { Kpi, GradeKpi } from '@/components/ui';
import { Saudacao } from './Saudacao';
import { PainelCiclo } from './PainelCiclo';
import { CaixaUnica } from './CaixaUnica';

export function InicioPMO({ d, sessao, hoje }: { d: DadosOrg; sessao: Sessao; hoje: string }) {
  const exe = d.iniciativas.filter((i) => noRaia(d, i, 'exe'));
  const pau = d.iniciativas.filter((i) => noRaia(d, i, 'pau'));
  const conta = (f: string) => exe.filter((i) => i.farol === f).length;
  const criticos = exe.filter((i) => i.farol === 'crit');
  const aberto = cicloAberto(d);

  let texto = `O portfólio tem ${exe.length} ${exe.length === 1 ? 'projeto' : 'projetos'} em execução.`;
  const extra: string[] = [];
  if (criticos.length) extra.push(`${criticos.length} ${criticos.length === 1 ? 'está crítico' : 'estão críticos'}`);
  if (aberto) extra.push(`o ciclo ${aberto.ano} fecha em ${Math.max(0, diffDias(aberto.fechamento, hoje))} dias`);
  if (extra.length) texto += ' ' + extra.join(' e ').replace(/^./, (c) => c.toUpperCase()) + '.';

  const ciclos = d.ciclos.filter((c) => c.etapa !== 'planejado').sort((a, b) => b.ano - a.ano).map((c) => cicloVM(d, c, hoje));

  return (
    <>
      <Saudacao nome={sessao.pessoa.nome} hoje={hoje} texto={texto} />
      <GradeKpi>
        <Kpi href="/portfolio" rotulo="Em execução" valor={exe.length} />
        <Kpi href="/portfolio" rotulo="OK" valor={conta('ok')} cor="#17723D" />
        <Kpi href="/portfolio" rotulo="Atenção" valor={conta('aten')} cor="#9A5B05" />
        <Kpi href="/portfolio" rotulo="Crítico" valor={conta('crit')} cor="#B42318" />
        <Kpi href="/portfolio" rotulo="Pausados" valor={pau.length} />
      </GradeKpi>
      <div style={s('display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start')}>
        <CaixaUnica d={d} sessao={sessao} hoje={hoje} estilo="flex: 999 1 460px; min-width: 0; background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px" />
        {ciclos.length > 0 && <PainelCiclo ciclos={ciclos} />}
      </div>
    </>
  );
}
