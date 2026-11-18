import { exigirSessao, temPerfil } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { hojeISO } from '@/lib/regras/datas';
import { podeMedirBeneficio, situacaoBeneficio } from '@/lib/regras/beneficios';
import { beneficioVM } from '@/lib/beneficios-vm';
import { s } from '@/lib/css';
import { Shell } from '@/components/Shell';
import { Cabecalho, Vazio } from '@/components/ui';
import { CartaoBeneficio } from '@/components/Beneficio';

export const dynamic = 'force-dynamic';

/** Benefícios: o que está na hora de medir, o que ainda vai ser medido e os resultados já registrados. */
export default async function Beneficios() {
  const sessao = await exigirSessao();
  const d = await carregarOrg(sessao.orgId);
  const hoje = hojeISO();
  const eu = sessao.pessoa.id;
  const ehPmo = temPerfil(sessao, 'pmo');
  const meus = d.iniciativas.filter((i) => i.solStatus !== 'rascunho' && i.beneficioIndicador && podeMedirBeneficio(i, eu, ehPmo));
  const grupo = (sit: string) => meus.filter((i) => situacaoBeneficio(i, hoje) === sit);
  const bloco = (titulo: string, lista: typeof meus, vazio?: string) => (
    <section aria-label={titulo} style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px')}>
      <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>{titulo}</h2>
      {lista.map((i) => <CartaoBeneficio key={i.id} b={beneficioVM(d, i, eu, ehPmo, hoje)} comTitulo />)}
      {lista.length === 0 && vazio && <Vazio>{vazio}</Vazio>}
    </section>
  );
  return (
    <Shell sessao={sessao} dados={d} atual="beneficios">
      <Cabecalho trilha="Benefícios" titulo="Benefícios" texto="O resultado que cada iniciativa prometeu e o que de fato entregou. Na data de medir, registre o resultado real." />
      {bloco('Hora de medir', grupo('medir'), 'Nenhum benefício esperando medição.')}
      {grupo('aguardando').length > 0 && bloco('Ainda vão ser medidos', grupo('aguardando'))}
      {grupo('medido').length > 0 && bloco('Resultados registrados', grupo('medido'))}
    </Shell>
  );
}
