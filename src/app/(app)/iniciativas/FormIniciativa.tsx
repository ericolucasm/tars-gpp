'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { s } from '@/lib/css';
import { salvarIniciativa, type DadosForm } from '@/app/acoes/iniciativas';
import { estiloPill } from '@/components/ui';
import type { ContextoForm } from './contexto-form';

const TIPOS = [
  { id: 'est', label: 'Estratégica', desc: 'Faz a empresa crescer ou mudar' },
  { id: 'mel', label: 'Melhoria', desc: 'Deixa um processo melhor' },
  { id: 'obr', label: 'Obrigatória', desc: 'Lei, norma ou auditoria' },
  { id: 'man', label: 'Manutenção', desc: 'Mantém algo funcionando' },
];
const URG = [{ id: 'esp', label: 'Pode esperar o ciclo' }, { id: 'ano', label: 'Precisa ser neste ano' }, { id: 'urg', label: 'Urgente ou obrigatória' }];
const CUSTOS = ['Até R$ 10 mil', 'R$ 10–50 mil', 'R$ 50–200 mil', 'Acima de R$ 200 mil', 'Não sei'];
const FORN = ['Sim', 'Não', 'Não sei'];
const PASSOS = [
  { title: 'Você envia', desc: 'A iniciativa fica salva e você acompanha cada passo.' },
  { title: 'Seu gestor aprova', desc: 'Quem aprova primeiro confirma que faz sentido ou devolve com comentários.' },
  { title: 'O PMO avalia', desc: 'Após o fechamento do ciclo, as iniciativas são comparadas e priorizadas.' },
  { title: 'Você recebe a decisão', desc: 'Aprovada, no backlog ou não aprovada, sempre com o motivo.' },
];

const VAZIO: DadosForm = { titulo: '', problema: '', resultadoEsperado: '', tipo: '', patrocinadorTexto: '', areasImpactadas: [], urgencia: 'esp', justificativaUrgencia: '', inicioDesejado: '', entregaDesejada: '', faixaCusto: 'Não sei', fornecedor: 'Não sei' };

const sSecao = s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 22px; display: flex; flex-direction: column; gap: 16px');
const sNum = s('width: 24px; height: 24px; border-radius: 50%; background: #E7E0FF; color: #4B2FD1; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center');
const sLab = s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600');
const sAjuda = s('font-size: 12px; font-weight: 400; color: #5E5770');
const sErroCampo = s('font-size: 12px; font-weight: 400; color: #B42318');
const campo = (erro: boolean) => ({ ...s('height: 44px; padding: 0 12px; border-radius: 10px; font-size: 14px; font-weight: 400; color: #26213A; background: #FFFFFF'), border: `1px solid ${erro ? '#B42318' : '#E2DCD0'}` });
const area = (erro: boolean) => ({ ...s('padding: 10px 12px; border-radius: 10px; font-size: 14px; font-weight: 400; color: #26213A; resize: vertical; line-height: 1.5'), border: `1px solid ${erro ? '#B42318' : '#E2DCD0'}` });

export function FormIniciativa({ ctx, inicial, nota, quemPediu, voltaAoPmo: voltaProp = false, editavel = true }: { ctx: ContextoForm; inicial?: DadosForm; nota?: string | null; quemPediu?: string | null; voltaAoPmo?: boolean; editavel?: boolean }) {
  // guardado na abertura: depois do reenvio a página recarrega e a iniciativa já não está mais devolvida
  const [voltaAoPmo] = useState(voltaProp);
  const [f, setF] = useState<DadosForm>(inicial ?? VAZIO);
  const [tentou, setTentou] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [pend, start] = useTransition();
  const set = <K extends keyof DadosForm>(k: K, v: DadosForm[K]) => setF((x) => ({ ...x, [k]: v }));

  const eTitulo = tentou && !f.titulo.trim();
  const eProblema = tentou && !f.problema.trim();
  const eTipo = tentou && !f.tipo;

  function enviar() {
    if (!f.titulo.trim() || !f.problema.trim() || !f.tipo) { setTentou(true); return; }
    start(async () => {
      const r = await salvarIniciativa(f, true);
      if (r.ok) setEnviada(true); else setErro(r.erro);
    });
  }
  function rascunho() {
    start(async () => {
      const r = await salvarIniciativa(f, false);
      if (r.ok) { setF((x) => ({ ...x, id: r.id || x.id })); setAviso('Rascunho salvo. Você pode continuar depois pela tela inicial.'); setErro(''); }
      else setErro(r.erro);
    });
  }

  return (
    <>
      <div style={s('display: flex; flex-direction: column; gap: 6px')}>
        <span style={s('font-size: 12px; color: #5E5770')}>Minhas iniciativas / {inicial ? 'Editar' : 'Nova'}</span>
        <h1 style={s('margin: 0; font-size: 30px; font-weight: 700; letter-spacing: -0.3px')}>{inicial ? (nota ? 'Ajustar iniciativa' : 'Continuar iniciativa') : 'Nova iniciativa'}</h1>
        <p style={s('margin: 0; font-size: 14px; color: #5E5770')}>Conte o que precisa ser resolvido. Seu gestor aprova e o PMO avalia no fechamento do ciclo.</p>
      </div>

      <div style={s('display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 14px; background: #EFEAFE; border: 1px solid #DCD2FF')}>
        <span style={s('width: 36px; height: 36px; border-radius: 10px; background: #6D4AFF; color: #FFFFFF; display: flex; align-items: center; justify-content: center')}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg></span>
        {ctx.ciclo ? (
          <div style={s('display: flex; flex-direction: column; flex: 1; min-width: 220px')}><span style={s('font-size: 14px; font-weight: 700; color: #3A22A8')}>Ciclo {ctx.ciclo.nome} · inscrições abertas</span><span style={s('font-size: 13px; color: #4A4458')}>Recebendo iniciativas até {ctx.ciclo.ate}. Faltam {ctx.ciclo.faltam} dias.</span></div>
        ) : (
          <div style={s('display: flex; flex-direction: column; flex: 1; min-width: 220px')}><span style={s('font-size: 14px; font-weight: 700; color: #3A22A8')}>Nenhum ciclo com inscrições abertas</span><span style={s('font-size: 13px; color: #4A4458')}>Sua iniciativa fica guardada para o próximo ciclo.</span></div>
        )}
        <span style={s('font-size: 12px; color: #4A4458')}>É urgente ou obrigatória por lei? Marque na urgência: ela entra fora do ciclo.</span>
      </div>

      {nota && !enviada && (
        <div style={s('padding: 12px 14px; border-radius: 12px; background: #FEF3DC; color: #6B3F03; font-size: 13px; line-height: 1.5')}><strong>{quemPediu ?? ctx.aprovador}{voltaAoPmo ? ' (PMO)' : ''} pediu ajuste:</strong> “{nota}”</div>
      )}

      {enviada ? (
        <div style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 32px; display: flex; flex-direction: column; gap: 14px; max-width: 640px')}>
          <span style={s('width: 44px; height: 44px; border-radius: 50%; background: #E3F5EA; color: #17723D; display: flex; align-items: center; justify-content: center')}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg></span>
          <h2 style={s('margin: 0; font-size: 22px; font-weight: 700')}>{voltaAoPmo ? 'Iniciativa reenviada ao PMO' : 'Iniciativa enviada para aprovação'}</h2>
          <p style={s('margin: 0; font-size: 14px; color: #4A4458; line-height: 1.6')}>{voltaAoPmo ? <>“{f.titulo || 'Sua iniciativa'}” voltou para a avaliação do PMO, sem passar de novo pelo gestor. Você acompanha cada passo na tela inicial.</> : <>“{f.titulo || 'Sua iniciativa'}” foi para {ctx.aprovador}, {ctx.aprovadorCargo.charAt(0).toLowerCase() + ctx.aprovadorCargo.slice(1)}. Você acompanha cada passo na tela inicial.</>}</p>
          <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
            <Link href={ctx.home} style={s('height: 40px; padding: 0 16px; border-radius: 10px; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center')}>Voltar ao início</Link>
            <Link href="/iniciativas/nova" onClick={() => { setF(VAZIO); setTentou(false); setEnviada(false); setAviso(''); }} style={s('height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px; display: inline-flex; align-items: center')}>Cadastrar outra</Link>
          </div>
        </div>
      ) : !editavel ? (
        <div style={s('padding: 14px 16px; border-radius: 12px; background: #F3F0EA; font-size: 13px; color: #4A4458')}>Esta iniciativa já está em avaliação e não pode mais ser editada.</div>
      ) : (
        <div style={s('display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start')}>
          <div style={s('flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 16px')}>
            <section style={sSecao}>
              <div style={s('display: flex; align-items: center; gap: 10px')}><span style={sNum}>1</span><h2 style={s('margin: 0; font-size: 17px; font-weight: 700')}>O que você quer resolver</h2></div>
              <label style={sLab}>Título da iniciativa *
                <input type="text" value={f.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Reduzir o tempo de separação de pedidos" style={campo(eTitulo)} />
                {eTitulo && <span style={sErroCampo}>Dê um título para a iniciativa</span>}
              </label>
              <label style={sLab}>Qual problema ou oportunidade? *
                <span style={sAjuda}>Descreva o problema, não a solução. Quem é afetado e com que frequência?</span>
                <textarea value={f.problema} onChange={(e) => set('problema', e.target.value)} rows={4} placeholder="A separação de um pedido leva em média 40 minutos e gera atrasos nas entregas da tarde." style={area(eProblema)} />
                {eProblema && <span style={sErroCampo}>Conte qual é o problema ou a oportunidade</span>}
              </label>
              <label style={sLab}>Que resultado você espera?
                <span style={sAjuda}>Se possível, com um número: tempo, custo, volume, satisfação.</span>
                <textarea value={f.resultadoEsperado} onChange={(e) => set('resultadoEsperado', e.target.value)} rows={2} placeholder="Separar um pedido em até 15 minutos." style={area(false)} />
              </label>
              <div style={s('display: flex; flex-direction: column; gap: 8px')}>
                <span style={s('font-size: 13px; font-weight: 600')}>Tipo de iniciativa *</span>
                <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 8px')}>
                  {TIPOS.map((t) => {
                    const on = f.tipo === t.id;
                    return (
                      <button key={t.id} type="button" aria-pressed={on} onClick={() => set('tipo', t.id)} style={{ ...s('display: flex; flex-direction: column; align-items: flex-start; gap: 2px; text-align: left; min-height: 64px; padding: 10px 12px; border-radius: 12px; color: #26213A'), border: on ? '2px solid #6D4AFF' : '1px solid #E2DCD0', background: on ? '#EFEAFE' : '#FFFFFF' }}>
                        <span style={s('font-size: 13px; font-weight: 600')}>{t.label}</span><span style={s('font-size: 12px; color: #5E5770; font-weight: 400')}>{t.desc}</span>
                      </button>
                    );
                  })}
                </div>
                {eTipo && <span style={s('font-size: 12px; color: #B42318')}>Escolha o tipo</span>}
              </div>
            </section>

            <section style={sSecao}>
              <div style={s('display: flex; align-items: center; gap: 10px')}><span style={sNum}>2</span><h2 style={s('margin: 0; font-size: 17px; font-weight: 700')}>Quem está envolvido</h2></div>
              <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px')}>
                <div style={s('display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 10px; background: #F7F5F0')}><span style={s('font-size: 12px; color: #5E5770')}>Área solicitante</span><span style={s('font-size: 14px; font-weight: 600')}>{ctx.area}</span><span style={s('font-size: 12px; color: #5E5770')}>{ctx.dir}</span></div>
                <div style={s('display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 10px; background: #F7F5F0')}><span style={s('font-size: 12px; color: #5E5770')}>Quem aprova primeiro</span><span style={s('font-size: 14px; font-weight: 600')}>{ctx.aprovador}</span><span style={s('font-size: 12px; color: #5E5770')}>{ctx.aprovadorCargo}</span></div>
              </div>
              <label style={sLab}>Patrocinador (opcional)
                <span style={sAjuda}>Quem, acima da área, defende essa iniciativa?</span>
                <input type="text" value={f.patrocinadorTexto} onChange={(e) => set('patrocinadorTexto', e.target.value)} placeholder="Nome do diretor ou executivo" style={campo(false)} />
              </label>
              <div style={s('display: flex; flex-direction: column; gap: 8px')}>
                <span style={s('font-size: 13px; font-weight: 600')}>Outras áreas impactadas</span>
                <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
                  {ctx.areas.map((a) => {
                    const on = f.areasImpactadas.includes(a.id);
                    return <button key={a.id} type="button" aria-pressed={on} onClick={() => set('areasImpactadas', on ? f.areasImpactadas.filter((x) => x !== a.id) : [...f.areasImpactadas, a.id])} style={estiloPill(on)}>{a.nome}</button>;
                  })}
                </div>
              </div>
            </section>

            <section style={sSecao}>
              <div style={s('display: flex; align-items: center; gap: 10px; flex-wrap: wrap')}><span style={sNum}>3</span><h2 style={s('margin: 0; font-size: 17px; font-weight: 700')}>Prazo e tamanho</h2><span style={s('font-size: 12px; color: #5E5770')}>Estimativas. Ninguém espera precisão agora.</span></div>
              <div style={s('display: flex; flex-direction: column; gap: 8px')}>
                <span style={s('font-size: 13px; font-weight: 600')}>Urgência</span>
                <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
                  {URG.map((u) => <button key={u.id} type="button" aria-pressed={f.urgencia === u.id} onClick={() => set('urgencia', u.id)} style={estiloPill(f.urgencia === u.id)}>{u.label}</button>)}
                </div>
                {f.urgencia === 'urg' && (
                  <label style={s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; padding: 12px; border-radius: 10px; background: #FEF3DC')}>Por que não pode esperar o ciclo?
                    <input type="text" value={f.justificativaUrgencia} onChange={(e) => set('justificativaUrgencia', e.target.value)} placeholder="Prazo legal, risco de segurança, parada de operação…" style={s('height: 44px; padding: 0 12px; border-radius: 10px; border: 1px solid #F0D9A8; font-size: 14px; font-weight: 400; color: #26213A; background: #FFFFFF')} />
                    <span style={s('font-size: 12px; font-weight: 400; color: #7A4A04')}>Essa iniciativa entra fora do ciclo e vai direto para o PMO após seu gestor.</span>
                  </label>
                )}
              </div>
              <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px')}>
                <label style={sLab}>Início desejado<input type="month" value={f.inicioDesejado} onChange={(e) => set('inicioDesejado', e.target.value)} style={campo(false)} /></label>
                <label style={sLab}>Entrega desejada<input type="month" value={f.entregaDesejada} onChange={(e) => set('entregaDesejada', e.target.value)} style={campo(false)} /></label>
              </div>
              <div style={s('display: flex; flex-direction: column; gap: 8px')}>
                <span style={s('font-size: 13px; font-weight: 600')}>Custo estimado</span>
                <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>{CUSTOS.map((c) => <button key={c} type="button" aria-pressed={f.faixaCusto === c} onClick={() => set('faixaCusto', c)} style={estiloPill(f.faixaCusto === c)}>{c}</button>)}</div>
              </div>
              <div style={s('display: flex; flex-direction: column; gap: 8px')}>
                <span style={s('font-size: 13px; font-weight: 600')}>Vai precisar de fornecedor externo?</span>
                <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>{FORN.map((c) => <button key={c} type="button" aria-pressed={f.fornecedor === c} onClick={() => set('fornecedor', c)} style={estiloPill(f.fornecedor === c)}>{c}</button>)}</div>
              </div>
              <div style={s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600')}>Anexos (opcional)
                <span style={s('display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 64px; border-radius: 10px; border: 1px dashed #CFC6B6; font-size: 13px; font-weight: 400; color: #8A8296')}>Anexos chegam na próxima versão · PDF, planilha, imagem</span>
              </div>
            </section>

            {tentou && (eTitulo || eProblema || eTipo) && <span style={s('font-size: 13px; color: #B42318')}>Preencha os campos obrigatórios marcados acima.</span>}
            {erro && <span style={s('font-size: 13px; color: #B42318')}>{erro}</span>}
            {aviso && <span style={s('font-size: 13px; color: #3A22A8; font-weight: 600')}>{aviso}</span>}
            <div style={s('display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px')}>
              <button type="button" disabled={pend} onClick={rascunho} style={s('height: 44px; padding: 0 16px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 14px')}>Salvar rascunho</button>
              <button type="button" disabled={pend} onClick={enviar} style={s('height: 44px; padding: 0 20px; border-radius: 10px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 14px')}>{voltaAoPmo ? 'Reenviar ao PMO' : nota ? 'Reenviar para aprovação' : 'Enviar para aprovação'}</button>
            </div>
          </div>

          <aside aria-label="Como funciona" style={s('flex: 1 1 280px; min-width: 0; display: flex; flex-direction: column; gap: 16px')}>
            <div style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px')}>
              <h2 style={s('margin: 0; font-size: 15px; font-weight: 700')}>O caminho da sua iniciativa</h2>
              {PASSOS.map((p, i) => (
                <div key={i} style={s('display: flex; gap: 12px')}>
                  <span style={{ ...s('flex: 0 0 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700'), background: i === 0 ? '#6D4AFF' : '#EFEAFE', color: i === 0 ? '#FFFFFF' : '#4B2FD1' }}>{i + 1}</span>
                  <div style={s('display: flex; flex-direction: column; gap: 2px')}><span style={s('font-size: 13px; font-weight: 600')}>{p.title}</span><span style={s('font-size: 12px; color: #5E5770; line-height: 1.45')}>{p.desc}</span></div>
                </div>
              ))}
            </div>
            <div style={s('background: #F3F0EA; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 8px')}>
              <span style={s('font-size: 12px; font-weight: 700; color: #4B2FD1; letter-spacing: 0.3px')}>BOA PRÁTICA</span>
              <span style={s('font-size: 14px; font-weight: 600')}>Um bom pedido responde três perguntas</span>
              <span style={s('font-size: 13px; color: #4A4458; line-height: 1.55')}>Qual é o problema? Quem ele afeta? Como saberemos que foi resolvido? Iniciativas com essas respostas costumam ser avaliadas mais rápido.</span>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
