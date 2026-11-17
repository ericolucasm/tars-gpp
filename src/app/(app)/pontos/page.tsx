import { exigirSessao, temPerfil } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { hojeISO } from '@/lib/regras/datas';
import { pontoEsperaPor } from '@/lib/regras/pontos';
import { pontoVM } from '@/lib/pontos-vm';
import { s } from '@/lib/css';
import { Shell } from '@/components/Shell';
import { Cabecalho, Vazio } from '@/components/ui';
import { CartaoPonto } from '@/components/Pontos';

export const dynamic = 'force-dynamic';

/** Pontos de atenção: os que esperam por mim, os que abri e (PMO) todos os abertos. */
export default async function Pontos() {
  const sessao = await exigirSessao();
  const d = await carregarOrg(sessao.orgId);
  const hoje = hojeISO();
  const eu = sessao.pessoa.id;
  const ehPmo = temPerfil(sessao, 'pmo');
  const vm = (lista: typeof d.pontos) => lista.map((p) => pontoVM(d, p, eu, ehPmo, hoje)).sort((a, b) => Number(b.atrasado) - Number(a.atrasado));
  const esperando = d.pontos.filter((p) => pontoEsperaPor(p, eu, ehPmo));
  const meus = d.pontos.filter((p) => p.status === 'aberto' && p.abertoPor === eu && !esperando.includes(p));
  const outros = ehPmo ? d.pontos.filter((p) => p.status === 'aberto' && !esperando.includes(p) && !meus.includes(p)) : [];
  const resolvidos = d.pontos.filter((p) => p.status !== 'aberto' && (ehPmo || p.abertoPor === eu || p.destinatarioId === eu || p.resolvidoPor === eu)).slice(-10).reverse();

  const bloco = (titulo: string, lista: typeof d.pontos, vazio?: string) => (
    <section aria-label={titulo} style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px')}>
      <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>{titulo}</h2>
      {vm(lista).map((p) => <CartaoPonto key={p.id} p={p} comProjeto />)}
      {lista.length === 0 && vazio && <Vazio>{vazio}</Vazio>}
    </section>
  );

  return (
    <Shell sessao={sessao} dados={d} atual="pontos">
      <Cabecalho trilha="Pontos de atenção" titulo="Pontos de atenção" texto="Impedimentos e decisões escalados pelos projetos. Registre a resolução para avisar quem pediu." />
      {bloco('Esperando por você', esperando, 'Nada esperando por você.')}
      {meus.length > 0 && bloco('Abertos por você', meus)}
      {outros.length > 0 && bloco('Outros pontos abertos', outros)}
      {resolvidos.length > 0 && bloco('Resolvidos recentemente', resolvidos)}
    </Shell>
  );
}
