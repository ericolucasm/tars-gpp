import Link from 'next/link';
import { s } from '@/lib/css';
import type { DadosOrg } from '@/lib/dados';
import type { Sessao } from '@/lib/sessao';
import { addDias, br, diaCurto, proximaSexta, segundaDaSemana } from '@/lib/regras/datas';
import { dataDaSemana } from '@/lib/regras/projeto';
import { gestorDe } from '@/lib/regras/pessoas';
import { alocacaoDe, infoProjeto, nomeArea, noRaia, pessoa } from '@/lib/visoes';
import { Barra, ItemAcao, PillFarol, Vazio } from '@/components/ui';
import { Saudacao } from './Saudacao';

export function InicioGP({ d, sessao, hoje }: { d: DadosOrg; sessao: Sessao; hoje: string }) {
  const eu = sessao.pessoa;
  const meus = d.iniciativas.filter((i) => (sessao.coringa || i.gpId === eu.id) && noRaia(d, i, 'exe'));
  const infos = meus.map((i) => ({ i, info: infoProjeto(d, i, hoje) }));
  const sexta = proximaSexta(hoje);
  const semanaIni = segundaDaSemana(hoje);
  const curto = (t: string) => { const k = t.indexOf(' para '); return k > 0 ? t.slice(0, k) : t; };

  const devidos = infos.filter(({ info }) => !info.ultimoStatus || info.ultimoStatus.data < semanaIni);
  const emAtencao = meus.filter((i) => i.farol === 'aten').length;
  const criticos = meus.filter((i) => i.farol === 'crit').length;
  const partes: string[] = [];
  if (!meus.length) partes.push('Você não tem projetos em execução.');
  else if (emAtencao === meus.length) partes.push(meus.length === 1 ? 'Seu projeto está em atenção.' : `Seus ${meus.length} projetos estão em atenção.`);
  else if (criticos === meus.length) partes.push(meus.length === 1 ? 'Seu projeto está crítico.' : `Seus ${meus.length} projetos estão críticos.`);
  else partes.push(`Você tem ${meus.length} ${meus.length === 1 ? 'projeto' : 'projetos'} em execução${criticos ? `, ${criticos} crítico(s)` : ''}${emAtencao ? `, ${emAtencao} em atenção` : ''}.`);
  if (devidos.length === 1) partes.push(`O status da semana do ${curto(devidos[0].i.titulo)} vence na sexta.`);
  else if (devidos.length > 1) partes.push(`${devidos.length} status da semana vencem na sexta.`);

  const itens: React.ReactNode[] = [];
  for (const { i } of devidos) itens.push(<ItemAcao key={`st${i.id}`} href={`/projetos/${i.id}#status`} titulo="Publicar o status da semana" sub={`${curto(i.titulo)} · vence sexta, ${br(sexta).slice(0, 5)}`} acao="Escrever →" />);
  const atrasadas = infos.flatMap(({ i, info }) => info.atrasadas.map((t) => ({ i, t })));
  if (atrasadas.length) {
    const { i, t } = atrasadas[0];
    itens.push(<ItemAcao key="atr" href={`/projetos/${i.id}`} tom="vermelho" titulo={atrasadas.length === 1 ? '1 tarefa atrasada' : `${atrasadas.length} tarefas atrasadas`}
      sub={`${t.titulo} · ${pessoa(d, t.responsavelId)?.nome ?? ''} · venceu ${br(t.prazo).slice(0, 5)}`} acao="Ver →" />);
  }
  for (const p of d.pedidos.filter((x) => x.status === 'pendente' && meus.some((m) => m.id === x.iniciativaId))) {
    const quem = pessoa(d, p.pessoaId);
    const gestor = quem ? pessoa(d, gestorDe(quem, d.areas)) : undefined;
    itens.push(<ItemAcao key={p.id} href={`/projetos/${p.iniciativaId}`} titulo={`Pedido de alocação aguardando o gestor de ${nomeArea(d, quem?.areaId)}`}
      sub={`${quem?.nome ?? ''} a ${quem ? alocacaoDe(d, quem.id, hoje) : 0}% · ${gestor?.nome ?? 'O gestor'} ainda não respondeu`} acao="Ver →" />);
  }
  for (const { i, info } of infos) {
    for (const f of info.fases) {
      const fim = dataDaSemana(i.inicioProjeto!, f.inicioSemana + f.duracao);
      if (!f.confirmadaEm && fim <= addDias(hoje, 7) && dataDaSemana(i.inicioProjeto!, f.inicioSemana) <= hoje) {
        itens.push(<ItemAcao key={f.id} href={`/projetos/${i.id}?fase=${f.id}`} titulo="Confirmar o fim de uma fase" sub={`${f.nome} · critério: ${f.criterioConclusao ? f.criterioConclusao.charAt(0).toLowerCase() + f.criterioConclusao.slice(1) : 'entregas da fase concluídas'}`} acao="Confirmar →" />);
      }
    }
  }

  // Próximos 7 dias: tarefas, marcos e status
  const ate = addDias(hoje, 7);
  const eventos: { data: string; texto: string }[] = [];
  for (const { i, info } of infos) {
    for (const t of info.tarefas) if (!t.concluida && t.prazo && t.prazo >= hoje && t.prazo <= ate) eventos.push({ data: t.prazo, texto: `${t.titulo} · ${curto(i.titulo)}` });
    for (const m of info.marcos) if (m.data && m.data >= hoje && m.data <= ate && m.status !== 'Atingido') eventos.push({ data: m.data, texto: `Marco: ${m.nome}` });
    if (devidos.some((x) => x.i.id === i.id)) eventos.push({ data: sexta, texto: `Status da semana · ${curto(i.titulo)}` });
  }
  eventos.sort((a, b) => a.data.localeCompare(b.data));

  return (
    <>
      <Saudacao nome={eu.nome} hoje={hoje} texto={partes.join(' ')} />
      <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px')}>
        {infos.map(({ i, info }) => {
          const acimaN = new Set(d.alocacoes.filter((a) => info.fases.some((f) => f.id === a.faseId)).filter((a) => { const p = pessoa(d, a.pessoaId); return p && p.cedeAte != null && !p.externo && a.pct > p.cedeAte; }).map((a) => a.pessoaId));
          const nomesAcima = [...acimaN].map((id) => pessoa(d, id)?.nome).filter(Boolean);
          return (
            <Link key={i.id} href={`/projetos/${i.id}`} style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 10px; color: #26213A')}>
              <div style={s('display: flex; justify-content: space-between; gap: 8px; align-items: center')}><span style={s('font-size: 16px; font-weight: 700')}>{i.titulo}</span><PillFarol farol={i.farol} /></div>
              <span style={s('font-size: 12px; color: #5E5770')}>Fase atual: {info.faseAtual?.nome ?? '—'} · {info.progresso}% concluído</span>
              <Barra pct={info.progresso} />
              {info.proximoMarco
                ? <span style={s('font-size: 13px; color: #4A4458')}>Próximo marco: {info.proximoMarco.nome} · {br(info.proximoMarco.data).slice(0, 5)}{info.proximoMarco.status === 'Em risco' && <> · <strong style={s('color: #9A5B05')}>em risco</strong></>}</span>
                : <span style={s('font-size: 13px; color: #4A4458')}>{info.riscos.length} {info.riscos.length === 1 ? 'risco aberto' : 'riscos abertos'}{nomesAcima.length ? ` · ${nomesAcima.join(', ')} acima do cedido` : ''}</span>}
            </Link>
          );
        })}
      </div>
      <div style={s('display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start')}>
        <section aria-label="Precisa de você" style={s('flex: 999 1 460px; min-width: 0; background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px')}>
          <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Precisa de você</h2>
          {itens.length ? itens : <Vazio>Tudo em dia nos seus projetos.</Vazio>}
        </section>
        <section aria-label="Esta semana" style={s('flex: 1 1 320px; min-width: 0; background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px')}>
          <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Próximos 7 dias</h2>
          {eventos.length === 0 && <span style={s('font-size: 13px; color: #5E5770')}>Nada agendado para os próximos 7 dias.</span>}
          {eventos.map((e, k) => (
            <div key={k} style={s('display: flex; gap: 12px')}><span style={s('flex: 0 0 52px; font-size: 12px; font-weight: 700; color: #4B2FD1')}>{diaCurto(e.data)}</span><span style={s('font-size: 13px')}>{e.texto}</span></div>
          ))}
        </section>
      </div>
    </>
  );
}
