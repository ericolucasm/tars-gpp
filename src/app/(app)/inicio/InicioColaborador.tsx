import Link from 'next/link';
import { s } from '@/lib/css';
import type { DadosOrg, Iniciativa } from '@/lib/dados';
import type { Sessao } from '@/lib/sessao';
import { addDias, br, haDias, haQuanto, segundaDaSemana } from '@/lib/regras/datas';
import { primeiroNome } from '@/lib/regras/pessoas';
import { chaveDaRaia, cicloAberto, infoProjeto, nomeArea, noRaia, participaDoProjeto, pessoa } from '@/lib/visoes';
import { Etapas, PillFarol, Vazio } from '@/components/ui';
import { atrasos } from '@/lib/muro';
import { ProjetosPatrocinados } from '@/components/ProjetosPatrocinados';
import { Saudacao, frase } from './Saudacao';
import { RetirarIniciativa } from './RetirarIniciativa';
import { retiradaPermitida } from '@/lib/regras/esteira';

const PASSOS = ['Enviada', 'Gestor', 'Avaliação do PMO', 'Decisão'];

function passo(d: DadosOrg, i: Iniciativa, hoje: string) {
  const c = chaveDaRaia(d, i.raiaId);
  const aprov = pessoa(d, i.aprovadorId);
  const dia = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : null);
  const ciclo = d.ciclos.find((x) => x.id === i.cicloId);
  if (c === 'sol' && i.solStatus === 'rascunho') return { at: 0, alerta: false, sub: 'Rascunho · ainda não enviada', acao: 'Continuar' };
  if (c === 'sol' && i.solStatus === 'devolvida') return { at: 1, alerta: true, sub: `Devolvida para ajuste por ${aprov?.nome ?? 'seu gestor'} ${haDias(dia(i.devolvidaEm), hoje)}`, acao: 'Ajustar e reenviar' };
  if (c === 'sol' && i.solStatus === 'aguardando_gestor') return { at: 1, alerta: false, sub: `Com ${aprov?.nome ?? 'seu gestor'} para aprovação desde ${haQuanto(dia(i.enviadaEm), hoje) === 'hoje' ? 'hoje' : br(dia(i.enviadaEm)).slice(0, 5)}` };
  if (c === 'sol') return { at: 2, alerta: false, sub: `Aprovada por ${aprov?.nome ?? 'seu gestor'} · aguardando avaliação do PMO` };
  if (c === 'bkl') return { at: 4, alerta: false, sub: `${ciclo ? `Avaliada no ciclo ${ciclo.ano}` : 'Avaliada'} · está no backlog, aguardando prioridade` };
  if (c === 'pre') return { at: 4, alerta: false, sub: `Aprovada${ciclo ? ` no ciclo ${ciclo.ano}` : ''} · em preparação para virar projeto` };
  if (c === 'exe' || c === 'pau') return { at: 4, alerta: false, sub: `Aprovada${ciclo ? ` no ciclo ${ciclo.ano}` : ''} · virou projeto${c === 'pau' ? ' (pausado)' : ' e está em execução'}` };
  if (c === 'con') return { at: 4, alerta: false, sub: `Aprovada${ciclo ? ` no ciclo ${ciclo.ano}` : ''} · virou projeto e foi entregue em ${br(dia(i.concluidaEm)).slice(0, 5)}` };
  if (i.motivoSaida?.startsWith('Retirada por quem pediu')) return { at: 1, alerta: false, sub: `Você retirou esta iniciativa${i.motivoSaida.includes(' — ') ? ` · ${i.motivoSaida.split(' — ').slice(1).join(' — ')}` : ''}` };
  if (!i.aprovadaGestorEm && i.enviadaEm) return { at: 1, alerta: false, sub: `${aprov?.nome ?? 'Seu gestor'} decidiu não seguir${i.motivoSaida ? ` · motivo: ${i.motivoSaida}` : ''}` };
  return { at: 4, alerta: false, sub: `Não aprovada${i.motivoSaida ? ` · motivo: ${i.motivoSaida}` : ''}` };
}

export function InicioColaborador({ d, sessao, hoje }: { d: DadosOrg; sessao: Sessao; hoje: string }) {
  const eu = sessao.pessoa;
  const minhas = d.iniciativas.filter((i) => i.solicitanteId === eu.id)
    .map((i) => ({ i, p: passo(d, i, hoje) }))
    .sort((a, b) => Number(b.p.alerta) - Number(a.p.alerta) || (b.i.updatedAt.getTime() - a.i.updatedAt.getTime()));
  const exeIds = new Set(d.iniciativas.filter((i) => noRaia(d, i, 'exe')).map((i) => i.id));
  const tarefas = d.tarefas.filter((t) => t.responsavelId === eu.id && !t.concluida && exeIds.has(t.iniciativaId)).sort((a, b) => (a.prazo ?? '9').localeCompare(b.prazo ?? '9'));
  const fimSemana = addDias(segundaDaSemana(hoje), 6);
  const daSemana = tarefas.filter((t) => t.prazo && t.prazo <= fimSemana).length;
  const devolvidas = minhas.filter((x) => x.p.alerta).length;
  const texto = frase([
    devolvidas === 1 ? 'uma iniciativa sua voltou com pedido de ajuste' : devolvidas > 1 ? `${devolvidas} iniciativas suas voltaram com pedido de ajuste` : '',
    daSemana ? `você tem ${daSemana} ${daSemana === 1 ? 'tarefa' : 'tarefas'} nesta semana` : '',
  ]) || 'Acompanhe aqui suas iniciativas e tarefas.';
  const ciclo = cicloAberto(d);
  const area = nomeArea(d, eu.areaId);

  return (
    <>
      <Saudacao nome={eu.nome} hoje={hoje} texto={texto} />
      {(() => {
        const meus = atrasos(d, hoje).filter((x) => x.responsavelId === eu.id);
        if (!meus.length) return null;
        return (
          <Link href="/minhas-entregas" style={s('display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 14px 18px; border-radius: 14px; background: #FDE8E8; border: 1px solid #F5D2D2; color: #B42318')}>
            <strong style={s('font-size: 14px')}>{meus.length === 1 ? 'Você tem uma entrega atrasada' : `Você tem ${meus.length} entregas atrasadas`}</strong>
            <span style={s('font-size: 13px; flex: 1')}>{meus.slice(0, 3).map((x) => x.titulo).join(' · ')}. Conclua, peça mais prazo ou avise o GP.</span>
            <span style={s('font-size: 13px; font-weight: 700')}>Resolver →</span>
          </Link>
        );
      })()}
      {ciclo && (
        <Link href="/iniciativas/nova" style={s('display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 16px 18px; border-radius: 14px; background: #EFEAFE; border: 1px solid #DCD2FF; color: #26213A')}>
          <span style={s('display: flex; flex-direction: column; flex: 1; min-width: 220px')}>
            <span style={s('font-size: 15px; font-weight: 700; color: #3A22A8')}>Ciclo {ciclo.nome} · inscrições abertas</span>
            <span style={s('font-size: 13px; color: #4A4458')}>Tem uma ideia para melhorar {area ? `a ${area}` : 'sua área'}? Envie até {br(ciclo.fechamento).slice(0, 5)}.</span>
          </span>
          <span style={s('height: 40px; padding: 0 16px; border-radius: 10px; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center')}>Nova iniciativa</span>
        </Link>
      )}
      <section aria-label="Suas iniciativas" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px')}>
        <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Suas iniciativas</h2>
        {minhas.length === 0 && <Vazio>Você ainda não enviou nenhuma iniciativa.</Vazio>}
        {minhas.map(({ i, p }) => (
          <div key={i.id} style={{ ...s('display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 12px'), border: `1px solid ${p.alerta ? '#F0D9A8' : '#EFEBE3'}`, background: p.alerta ? '#FFFCF5' : '#FFFFFF' }}>
            <div style={s('display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; align-items: center')}>
              <span style={s('display: flex; flex-direction: column; gap: 2px')}><span style={s('font-size: 15px; font-weight: 600')}>{i.titulo}</span><span style={s('font-size: 12px; color: #5E5770')}>{p.sub}</span></span>
              {i.inicioProjeto && noRaia(d, i, 'exe', 'pau', 'con') && <Link href={`/projetos/${i.id}`} style={s('height: 36px; padding: 0 14px; border-radius: 9px; border: 1px solid #DCD2FF; background: #F7F4FF; color: #4B2FD1; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center')}>Acompanhar projeto →</Link>}
              {(() => { const tipo = retiradaPermitida(chaveDaRaia(d, i.raiaId), i.solStatus); return tipo ? <RetirarIniciativa id={i.id} titulo={i.titulo} tipo={tipo} /> : null; })()}
              {p.acao && <Link href={`/iniciativas/${i.id}/editar`} style={s('height: 36px; padding: 0 14px; border-radius: 9px; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center')}>{p.acao}</Link>}
            </div>
            <Etapas etapas={PASSOS.map((n, k) => ({ nome: k === p.at && p.alerta ? 'Ajuste pedido' : n }))} atual={p.at} alerta={p.alerta} />
            {p.alerta && i.devolucaoNota && <span style={s('font-size: 13px; color: #4A4458; padding: 10px 12px; border-radius: 10px; background: #F7F5F0')}>{primeiroNome(pessoa(d, i.aprovadorId)?.nome ?? 'Gestor')}: “{i.devolucaoNota}”</span>}
          </div>
        ))}
      </section>
      {(() => {
        const participo = d.iniciativas.filter((i) => i.inicioProjeto && i.gpId !== eu.id && noRaia(d, i, 'exe', 'pau') && participaDoProjeto(d, i.id, eu.id));
        if (!participo.length) return null;
        return (
          <section aria-label="Projetos em que você participa" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px')}>
            <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Projetos em que você participa</h2>
            {participo.map((i) => {
              const info = infoProjeto(d, i, hoje);
              const minhas = info.tarefas.filter((t) => t.responsavelId === eu.id && !t.concluida).length;
              return (
                <Link key={i.id} href={`/projetos/${i.id}`} style={s('display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1px solid #EFEBE3; color: #26213A')}>
                  <span style={s('display: flex; flex-direction: column; gap: 2px; flex: 1 1 260px')}>
                    <span style={s('font-size: 14px; font-weight: 600')}>{i.titulo}</span>
                    <span style={s('font-size: 12px; color: #5E5770')}>GP: {pessoa(d, i.gpId)?.nome ?? '—'} · fase atual: {info.faseAtual?.nome ?? '—'} · {minhas ? `${minhas} ${minhas === 1 ? 'tarefa sua' : 'tarefas suas'} em aberto` : 'nenhuma tarefa sua em aberto'}</span>
                  </span>
                  {noRaia(d, i, 'exe') ? <PillFarol farol={i.farol} /> : <span style={s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; background: #EDEAE3; color: #4A4458')}>Pausado</span>}
                  <span style={s('font-size: 13px; font-weight: 600; color: #4B2FD1')}>Ver projeto →</span>
                </Link>
              );
            })}
          </section>
        );
      })()}
      <section aria-label="Suas tarefas" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px')}>
        <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Suas tarefas em projetos</h2>
        {tarefas.length === 0 && <span style={s('font-size: 13px; color: #5E5770')}>Nenhuma tarefa aberta.</span>}
        {tarefas.map((t) => (
          <div key={t.id} style={s('display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; border: 1px solid #EFEBE3')}>
            <span style={s('flex: 1 1 220px; font-size: 13px; font-weight: 600')}>{t.titulo}</span>
            <span style={s('font-size: 12px; color: #5E5770')}>{d.iniciativas.find((i) => i.id === t.iniciativaId)?.titulo}</span>
            <span style={{ ...s('font-size: 12px'), color: t.prazo && t.prazo < hoje ? '#B42318' : '#5E5770', fontWeight: t.prazo && t.prazo < hoje ? 700 : 400 }}>{t.prazo && t.prazo < hoje ? 'Atrasada · ' : 'Prazo '}{br(t.prazo).slice(0, 5)}</span>
          </div>
        ))}
      </section>
      <ProjetosPatrocinados d={d} pessoaId={eu.id} hoje={hoje} />
    </>
  );
}
