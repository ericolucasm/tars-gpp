import { s } from '@/lib/css';
import type { DadosOrg, Iniciativa } from '@/lib/dados';
import type { Sessao } from '@/lib/sessao';
import { br } from '@/lib/regras/datas';
import { dataDaSemana, FAROL, type Farol } from '@/lib/regras/projeto';
import { detalheIniciativa } from '@/lib/detalhe';
import { balancoDo, fasesDo, nomeArea, noRaia, participaDoProjeto, pessoa } from '@/lib/visoes';
import { beneficioVM } from '@/lib/beneficios-vm';
import { CartaoBeneficio } from '@/components/Beneficio';
import { DetalheIniciativa } from '@/components/DetalheIniciativa';
import { PillFarol } from '@/components/ui';
import { SecaoPontos } from './SecaoPontos';
import { Encerramento } from './Encerramento';

const sCartao = s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px; scroll-margin-top: 16px');

/**
 * Página do projeto em modo leitura, para quem participa (alocado, responsável de fase ou de tarefa) sem ser o GP:
 * o andamento, a sua parte, os status publicados, os pontos de atenção (pode abrir) e as lições (pode registrar).
 * Linha do tempo editável, financeiro, mudanças e feedback continuam só com o GP e o PMO.
 */
export function VisaoLeitura({ d, sessao, ini, hoje }: { d: DadosOrg; sessao: Sessao; ini: Iniciativa; hoje: string }) {
  const eu = sessao.pessoa.id;
  const participa = participaDoProjeto(d, ini.id, eu);
  const pediu = ini.solicitanteId === eu;
  const fases = fasesDo(d, ini.id);
  const faseIds = new Set(fases.map((f) => f.id));
  const gp = pessoa(d, ini.gpId);
  const patro = pessoa(d, ini.patrocinadorId)?.nome ?? ini.patrocinadorTexto;
  const raia = d.raias.find((r) => r.id === ini.raiaId);
  const datas = (f: (typeof fases)[number]) => `${br(dataDaSemana(ini.inicioProjeto!, f.inicioSemana)).slice(0, 5)} a ${br(dataDaSemana(ini.inicioProjeto!, f.inicioSemana + f.duracao)).slice(0, 5)}`;
  const minhasAlocs = d.alocacoes.filter((a) => a.pessoaId === eu && faseIds.has(a.faseId)).map((a) => ({ a, f: fases.find((f) => f.id === a.faseId)! }));
  const minhasFases = fases.filter((f) => f.responsavelId === eu);
  const minhasTarefas = d.tarefas.filter((t) => t.iniciativaId === ini.id && t.responsavelId === eu).sort((a, b) => Number(a.concluida) - Number(b.concluida) || (a.prazo ?? '9').localeCompare(b.prazo ?? '9'));
  const reports = d.reports.filter((r) => r.iniciativaId === ini.id).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5);
  const licoes = d.licoes.filter((l) => l.iniciativaId === ini.id).reverse().map((l) => ({
    id: l.id, tipo: l.tipo, texto: l.texto, autor: pessoa(d, l.autorId)?.nome ?? '', data: br(l.createdAt.toISOString().slice(0, 10)), podeRemover: l.autorId === eu,
  }));
  // o custo é do GP e do PMO: no balanço de leitura, fica de fora
  const balanco = balancoDo(d, ini, hoje).filter((b) => b.dimensao !== 'Custo');

  return (
    <>
      <div style={s('display: flex; flex-direction: column; gap: 6px')}>
        <span style={s('font-size: 12px; color: #4B2FD1; font-weight: 600; letter-spacing: 0.4px')}>PROJETO · {nomeArea(d, ini.areaId).toUpperCase()} · {participa ? 'VOCÊ PARTICIPA' : 'VOCÊ PEDIU'}</span>
        <div style={s('display: flex; flex-wrap: wrap; gap: 10px; align-items: center')}>
          <h1 style={s('margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.3px')}>{ini.titulo}</h1>
          {noRaia(d, ini, 'exe', 'pau') && <PillFarol farol={ini.farol} />}
        </div>
        <span style={s('font-size: 13px; color: #5E5770')}>{[gp ? `GP: ${gp.nome}` : null, patro ? `Patrocinador: ${patro}` : null, raia && raia.chave !== 'exe' ? `Etapa: ${raia.nome}` : null].filter(Boolean).join(' · ')}</span>
        <span style={s('font-size: 12px; color: #5E5770')}>{participa ? 'Visão de leitura para quem participa do projeto.' : 'Este projeto nasceu da iniciativa que você pediu. Acompanhe o andamento por aqui.'} Quem planeja e altera o projeto é o GP{gp ? ` (${gp.nome})` : ''}.</span>
      </div>

      {participa && <section aria-label="Sua parte no projeto" style={sCartao}>
        <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Sua parte no projeto</h2>
        {minhasAlocs.length > 0 && (
          <div style={s('display: flex; flex-direction: column; gap: 6px')}>
            <span style={s('font-size: 13px; font-weight: 700')}>Onde você está alocado(a)</span>
            {minhasAlocs.map(({ a, f }) => <span key={f.id} style={s('font-size: 13px; color: #4A4458')}>{f.nome} · {a.pct}% · {datas(f)}</span>)}
          </div>
        )}
        {minhasFases.length > 0 && (
          <div style={s('display: flex; flex-direction: column; gap: 6px')}>
            <span style={s('font-size: 13px; font-weight: 700')}>Fases em que você confirma o fim (gate)</span>
            {minhasFases.map((f) => <span key={f.id} style={s('font-size: 13px; color: #4A4458')}>{f.nome} · gate em {br(dataDaSemana(ini.inicioProjeto!, f.inicioSemana + f.duracao))}{f.confirmadaEm ? ' · confirmada' : ''}</span>)}
          </div>
        )}
        <div style={s('display: flex; flex-direction: column; gap: 6px')}>
          <span style={s('font-size: 13px; font-weight: 700')}>Suas tarefas</span>
          {minhasTarefas.map((t) => {
            const atrasada = !t.concluida && !!t.prazo && t.prazo < hoje;
            return (
              <div key={t.id} style={s('display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 9px; border: 1px solid #EFEBE3')}>
                <span style={{ ...s('flex: 1 1 220px; font-size: 13px; font-weight: 600'), textDecoration: t.concluida ? 'line-through' : 'none', color: t.concluida ? '#8A8296' : '#26213A' }}>{t.titulo}</span>
                <span style={{ fontSize: 12, fontWeight: atrasada ? 700 : 400, color: atrasada ? '#B42318' : '#5E5770' }}>{t.concluida ? 'Concluída' : t.prazo ? `${atrasada ? 'Atrasada · ' : 'Prazo '}${br(t.prazo)}` : 'Sem prazo'}</span>
              </div>
            );
          })}
          {minhasTarefas.length === 0 && <span style={s('font-size: 13px; color: #5E5770')}>Nenhuma tarefa sua neste projeto.</span>}
          <span style={s('font-size: 12px; color: #5E5770')}>Para concluir, pedir mais prazo ou avisar de um impedimento, use <a href="/minhas-entregas" style={s('color: #4B2FD1; font-weight: 600')}>Minhas entregas</a>.</span>
        </div>
      </section>}

      <section aria-label="Andamento do projeto" style={sCartao}>
        <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Andamento</h2>
        <DetalheIniciativa id={ini.id} titulo={ini.titulo} det={detalheIniciativa(d, ini, hoje)} />
        <span style={s('font-size: 13px; font-weight: 700')}>Fases</span>
        {fases.map((f) => <span key={f.id} style={s('font-size: 13px; color: #4A4458')}>{f.nome} · {datas(f)}{f.confirmadaEm ? ' · concluída' : ''}</span>)}
      </section>

      {(ini.beneficioIndicador || pediu) && (
        <section id="beneficio" aria-label="Benefício esperado" style={sCartao}>
          <div style={s('display: flex; flex-direction: column; gap: 2px')}>
            <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Benefício esperado</h2>
            <span style={s('font-size: 12px; color: #5E5770')}>Como saber se o projeto deu resultado. {pediu ? 'Na data de medir, você (ou o GP, o gestor ou o PMO) registra o resultado real.' : ''}</span>
          </div>
          <CartaoBeneficio b={{ ...beneficioVM(d, ini, eu, false, hoje), href: null }} />
        </section>
      )}

      <section aria-label="Status publicados" style={sCartao}>
        <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Status publicados</h2>
        {reports.map((r) => {
          const f = FAROL[r.farol as Farol] ?? FAROL.ok;
          return (
            <div key={r.id} style={s('padding: 12px 14px; border-radius: 12px; background: #F7F5F0; display: flex; flex-direction: column; gap: 4px')}>
              <span style={s('display: flex; flex-wrap: wrap; gap: 8px; align-items: center')}><span style={s('font-size: 13px; font-weight: 700')}>{br(r.data)}</span><span style={{ ...s('font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px'), background: f.bg, color: f.fg }}>{f.rotulo}</span></span>
              <span style={s('font-size: 13px')}><strong>Avançou:</strong> {r.avancou}</span>
              {r.aSeguir && <span style={s('font-size: 13px')}><strong>A seguir:</strong> {r.aSeguir}</span>}
              {r.atencao && <span style={s('font-size: 13px')}><strong>Atenção:</strong> {r.atencao}</span>}
            </div>
          );
        })}
        {reports.length === 0 && <span style={s('font-size: 13px; color: #5E5770')}>Nenhum status publicado ainda.</span>}
      </section>

      <SecaoPontos d={d} sessao={sessao} iniId={ini.id} hoje={hoje} />
      <Encerramento iniciativaId={ini.id} concluido={noRaia(d, ini, 'con')} balanco={balanco} licoes={licoes} parecidas={[]} />
    </>
  );
}
