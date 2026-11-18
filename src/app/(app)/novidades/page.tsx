import { exigirSessao } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { hojeISO } from '@/lib/regras/datas';
import { podeMarcarLida } from '@/lib/regras/novidades';
import { naoLidas, novidadesDe } from '@/lib/novidades';
import { Shell } from '@/components/Shell';
import { Cabecalho } from '@/components/ui';
import { ListaNovidades } from '@/components/Novidades';
import { BotaoLerTodas } from '@/components/BotaoLerTodas';

export const dynamic = 'force-dynamic';

/** Histórico de avisos da pessoa (os 200 mais recentes). */
export default async function Novidades() {
  const sessao = await exigirSessao();
  const d = await carregarOrg(sessao.orgId);
  const [itens, n] = await Promise.all([novidadesDe(sessao.orgId, sessao.pessoa.id), naoLidas(sessao.orgId, sessao.pessoa.id)]);
  const pode = podeMarcarLida({ realId: sessao.real.id, pessoaId: sessao.pessoa.id });
  return (
    <Shell sessao={sessao} dados={d} atual="inicio">
      <Cabecalho trilha="Meu TARS / Novidades" titulo="Novidades" texto="Os avisos que o TARS mandou para você: aprovações, devoluções, pedidos, conclusões. Abrir um aviso marca como lido e leva ao lugar certo. O histórico fica guardado." />
      {n > 0 && pode && <div><BotaoLerTodas /></div>}
      <section aria-label="Histórico de novidades" style={{ background: '#FFFFFF', border: '1px solid #E2DCD0', borderRadius: 16, padding: 20 }}>
        <ListaNovidades itens={itens} hoje={hojeISO()} podeMarcar={pode} />
      </section>
    </Shell>
  );
}
