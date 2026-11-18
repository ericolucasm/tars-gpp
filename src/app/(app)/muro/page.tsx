import Link from 'next/link';
import { exigirSessao, temPerfil } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { hojeISO } from '@/lib/regras/datas';
import { timeDireto } from '@/lib/regras/pessoas';
import { muro, TIPO_ENTREGA, venceTexto } from '@/lib/muro';
import { nomeArea, pessoa } from '@/lib/visoes';
import { s } from '@/lib/css';
import { Shell } from '@/components/Shell';
import { Cabecalho, Vazio } from '@/components/ui';

export const dynamic = 'force-dynamic';

/** Muro da vergonha: quem passou da data sem registrar nada. PMO vê todos; gestor, o time; GP, os projetos dele; os demais, a si mesmos. */
export default async function Muro() {
  const sessao = await exigirSessao();
  const d = await carregarOrg(sessao.orgId);
  const hoje = hojeISO();
  const eu = sessao.pessoa.id;
  const ehPmo = temPerfil(sessao, 'pmo');
  const time = new Set(timeDireto(eu, d.pessoas, d.areas).map((p) => p.id));
  const meusProjetos = new Set(d.iniciativas.filter((i) => i.gpId === eu).map((i) => i.id));
  const linhas = muro(d, hoje).map((l) => ({ ...l, itens: ehPmo || l.pessoaId === eu || time.has(l.pessoaId) ? l.itens : l.itens.filter((x) => meusProjetos.has(x.iniciativaId)) }))
    .filter((l) => l.itens.length);
  const escopo = ehPmo ? 'todo o portfólio' : sessao.perfil === 'gestor' ? 'você, seu time e os projetos que você gerencia' : sessao.perfil === 'gp' ? 'você e as pessoas dos seus projetos' : 'você';
  return (
    <Shell sessao={sessao} dados={d} atual="muro">
      <Cabecalho trilha="Relatórios / Muro da vergonha" titulo="Muro da vergonha" texto={`Quem passou da data de uma tarefa, de um fim de fase ou do status report sem concluir, pedir mais prazo ou avisar, e gestores com decisões paradas há mais de 5 dias. Mostrando: ${escopo}.`} />
      {linhas.length === 0 && <Vazio>Ninguém no muro. Todas as entregas estão em dia (ou com prazo em negociação).</Vazio>}
      {linhas.map((l, k) => (
        <section key={l.pessoaId} aria-label={`Muro: ${l.nome}`} style={s('background: #FFFFFF; border: 1px solid #F5D2D2; border-radius: 16px; padding: 18px 20px; display: flex; flex-direction: column; gap: 10px')}>
          <div style={s('display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between')}>
            <div style={s('display: flex; align-items: center; gap: 12px')}>
              <span style={s('width: 34px; height: 34px; border-radius: 50%; background: #FDE8E8; color: #B42318; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px')}>{k + 1}º</span>
              <span style={s('display: flex; flex-direction: column')}>
                <span style={s('font-size: 16px; font-weight: 700')}>{l.nome}</span>
                <span style={s('font-size: 12px; color: #5E5770')}>{nomeArea(d, l.areaId)}{l.gestorId ? ` · gestor(a): ${pessoa(d, l.gestorId)?.nome ?? ''}` : ''}</span>
              </span>
            </div>
            <span style={s('font-size: 13px; font-weight: 700; color: #B42318')}>{l.itens.length} {l.itens.length === 1 ? 'atraso' : 'atrasos'} · maior: {Math.max(...l.itens.map((x) => x.diasAtraso))} dia(s)</span>
          </div>
          {l.itens.map((x) => (
            <div key={x.id} style={s('display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 13px; padding: 8px 10px; border-radius: 10px; background: #FFFAFA')}>
              <span style={s('font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: #EFEAFE; color: #4B2FD1')}>{TIPO_ENTREGA[x.tipo]}</span>
              <span style={s('flex: 1 1 240px')}><strong>{x.titulo}</strong> · {x.tipo !== 'decisao' && (ehPmo || meusProjetos.has(x.iniciativaId)) ? <Link href={`/projetos/${x.iniciativaId}#prazos`}>{x.projeto}</Link> : x.projeto}</span>
              <span style={s('color: #B42318; font-weight: 600')}>{venceTexto(x)}</span>
            </div>
          ))}
        </section>
      ))}
    </Shell>
  );
}
