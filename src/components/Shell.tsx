import Link from 'next/link';
import { s } from '@/lib/css';
import { iniciais, rotuloAdministrador, rotuloGestorCurto } from '@/lib/regras/pessoas';
import type { Sessao, Perfil } from '@/lib/sessao';
import type { DadosOrg } from '@/lib/dados';
import { VerComo } from './VerComo';

// Moldura comum: barra "ver como" (admin ou quem tem mais de um perfil), menu lateral por perfil e conteúdo.

type Item = { href: string; rotulo: string; ativo?: boolean };

export type Atual =
  | 'inicio' | 'nova' | 'area' | 'portfolio' | 'ciclos' | 'avaliacao' | 'projetos' | 'cadastros' | 'configuracoes' | `projeto:${string}`;

const ROTULO_PERFIL: Record<Perfil, string> = { colaborador: 'Colaborador', gestor: 'Gestor de área', gp: 'Gerente de projeto', pmo: 'PMO' };

const sNav = s('flex: 1 1 248px; max-width: 100%; background: #F3F0EA; border-right: 1px solid #E2DCD0; padding: 16px 12px; box-sizing: border-box; display: flex; flex-direction: column; gap: 2px; font-size: 14px');
const sItem = s('display: flex; padding: 9px 10px; border-radius: 9px; color: #4A4458');
const sItemAtivo = s('display: flex; padding: 9px 10px; border-radius: 9px; background: #E7E0FF; color: #4B2FD1; font-weight: 600');
const sSecao = s('font-size: 11px; color: #6E6780; margin: 14px 10px 4px; font-weight: 600; letter-spacing: 0.4px');

function subtitulo(sessao: Sessao, dados: DadosOrg): string {
  const p = sessao.pessoa;
  const area = dados.areas.find((a) => a.id === p.areaId)?.nome;
  const tr = p.tratamento as 'f' | 'm' | 'n';
  switch (sessao.perfil) {
    case 'pmo': return `PMO${sessao.real.id === p.id && sessao.admin ? ' · ' + rotuloAdministrador(tr) : ''}`;
    case 'gp': return 'Gerente de projeto';
    case 'gestor': return `${rotuloGestorCurto(tr)} · ${area ?? ''}`;
    default: return `${tr === 'f' ? 'Colaboradora' : tr === 'm' ? 'Colaborador' : 'Colaborador(a)'}${area ? ' · ' + area : ''}`;
  }
}

export function Shell({ sessao, dados, atual, children, mainStyle }: { sessao: Sessao; dados: DadosOrg; atual: Atual; children: React.ReactNode; mainStyle?: string }) {
  const p = sessao.pessoa;
  const it = (href: string, rotulo: string, chave: Atual): Item => ({ href, rotulo, ativo: atual === chave });
  let topo: Item | null = null;
  const secoes: { titulo?: string; itens: Item[] }[] = [];

  if (sessao.perfil === 'pmo') {
    topo = it('/iniciativas/nova', '+ Nova iniciativa', 'nova');
    secoes.push({ itens: [it('/inicio', 'Início', 'inicio')] });
    secoes.push({ titulo: 'GESTÃO', itens: [it('/portfolio', 'Portfólio', 'portfolio'), it('/ciclos', 'Ciclos de planejamento', 'ciclos'), it('/avaliacao', 'Avaliação e priorização', 'avaliacao'), { href: '/projetos', rotulo: 'Projetos', ativo: atual === 'projetos' || atual.startsWith('projeto:') }] });
    if (sessao.admin) secoes.push({ titulo: 'CONFIGURAÇÃO', itens: [it('/cadastros', 'Cadastros', 'cadastros'), it('/configuracoes', 'Configurações', 'configuracoes')] });
  } else if (sessao.perfil === 'gestor') {
    topo = it('/iniciativas/nova', '+ Nova iniciativa', 'nova');
    secoes.push({ itens: [it('/inicio', 'Início', 'inicio')] });
    secoes.push({ titulo: 'MINHA ÁREA', itens: [it('/area', 'Visão da área', 'area')] });
  } else if (sessao.perfil === 'gp') {
    secoes.push({ itens: [it('/inicio', 'Início', 'inicio')] });
    const exe = new Set(dados.raias.filter((r) => r.tipoCard === 'Projeto' && r.chave !== 'con').map((r) => r.id));
    const meus = dados.iniciativas.filter((i) => i.gpId === p.id && exe.has(i.raiaId));
    secoes.push({ titulo: 'MEUS PROJETOS', itens: meus.map((m) => ({ href: `/projetos/${m.id}`, rotulo: nomeMenu(m.titulo), ativo: atual === `projeto:${m.id}` })) });
  } else {
    topo = it('/iniciativas/nova', '+ Nova iniciativa', 'nova');
    secoes.push({ itens: [it('/inicio', 'Início', 'inicio')] });
  }

  const mostrarBarra = sessao.admin || sessao.perfis.length > 1;

  return (
    <div style={s("font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif; color: #26213A; background: #FBFAF7; min-height: 100vh; display: flex; flex-direction: column")}>
      {mostrarBarra && (
        <VerComo
          rotulo={sessao.admin ? 'Admin · ver como:' : 'Ver como:'}
          perfis={sessao.perfis.map((x) => ({ id: x, rotulo: ROTULO_PERFIL[x] }))}
          ativo={sessao.perfil}
          personas={sessao.admin ? sessao.personas.map((x) => ({ id: x.id, nome: x.nome })) : []}
          persona={sessao.pessoa.id}
        />
      )}
      <div style={s('flex: 1; display: flex; flex-wrap: wrap; align-items: stretch')}>
      <nav aria-label="Menu principal" style={sNav}>
        <div style={s('display: flex; align-items: center; gap: 10px; padding: 4px 6px 14px')}>
          <div style={s('width: 32px; height: 32px; border-radius: 9px; background: #6D4AFF; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px')}>T</div>
          <div style={s('display: flex; flex-direction: column')}><span style={s('font-weight: 700; font-size: 16px')}>TARS GPP</span><span style={s('font-size: 11px; color: #5E5770')}>Gestão de Portfólios e Projetos</span></div>
        </div>
        {topo && <Link href={topo.href} style={s('display: flex; align-items: center; justify-content: center; height: 40px; border-radius: 10px; background: #6D4AFF; color: #FFFFFF; font-weight: 600; margin-bottom: 12px')}>{topo.rotulo}</Link>}
        {secoes.map((sec, i) => (
          <div key={i} style={s('display: contents')}>
            {sec.titulo && <span style={sSecao}>{sec.titulo}</span>}
            {sec.itens.map((x) => (
              <Link key={x.href} href={x.href} aria-current={x.ativo ? 'page' : undefined} style={x.ativo ? sItemAtivo : sItem}>{x.rotulo}</Link>
            ))}
          </div>
        ))}
        <div style={s('flex: 1')} />
        <div style={s('display: flex; align-items: center; gap: 10px; padding: 10px; border-top: 1px solid #E2DCD0; margin-top: 12px')}>
          <span style={s('width: 30px; height: 30px; border-radius: 50%; background: #E7E0FF; color: #4B2FD1; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600')}>{iniciais(p.nome)}</span>
          <span style={s('display: flex; flex-direction: column; font-size: 13px; flex: 1; min-width: 0')}><span style={s('font-weight: 600')}>{p.nome}</span><span style={s('font-size: 11px; color: #5E5770')}>{subtitulo(sessao, dados)}</span></span>
          <form action="/auth/sair" method="post"><button type="submit" aria-label="Sair" title="Sair" style={s('width: 32px; height: 32px; border-radius: 8px; border: 0; background: transparent; color: #6E6780; font-size: 15px')}>⎋</button></form>
        </div>
      </nav>
      <main style={s(mainStyle ?? 'flex: 999 1 560px; min-width: 0; padding: 28px 32px 40px; box-sizing: border-box; display: flex; flex-direction: column; gap: 20px')}>
        {children}
      </main>
      </div>
    </div>
  );
}

/** "App de pedidos para representantes" → "App de pedidos" (como no menu do protótipo) */
function nomeMenu(titulo: string) {
  const i = titulo.indexOf(' para ');
  return i > 0 ? titulo.slice(0, i) : titulo;
}
