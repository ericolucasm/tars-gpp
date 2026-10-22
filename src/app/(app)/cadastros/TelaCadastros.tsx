'use client';

import { useEffect, useState, useTransition } from 'react';
import { s } from '@/lib/css';
import * as A from '@/app/acoes/cadastros';
import { estiloPill } from '@/components/ui';

type Pessoa = { id: string; nome: string; email: string; areaId: string; area: string; gestor: string; cargo: string; perfis: string[]; rotulos: string[]; admin: boolean; cedeAte: number | null; cede: string; status: string; pendente: boolean; ini: string; tratamento: string; externo: boolean };
type Area = { id: string; nome: string; tipo: string; parentId: string; responsavelId: string; responsavel: string; ini: string; nivel: number; headcount: number | null; pessoas: number };
type FaseB = { id: string; nome: string; dur: number; criterio: string; uso: number };
type Modelo = { id: string; nome: string; descricao: string; fases: string[]; total: number };
type Motivos = { recusa: string[]; pausa: string[]; cancelamento: string[] };
type Props = { abaInicial: string; pessoas: Pessoa[]; areas: Area[]; fases: FaseB[]; modelos: Modelo[]; pesos: number[]; motivos: Motivos };

const ABAS = [['pessoas', 'Pessoas'], ['areas', 'Áreas e hierarquia'], ['fases', 'Fases'], ['modelos', 'Modelos de projeto'], ['criterios', 'Critérios e tipos'], ['motivos', 'Motivos']];
const PERFIS = [['colaborador', 'Colaborador'], ['gestor', 'Gestor de área'], ['gp', 'Gerente de projeto'], ['pmo', 'PMO'], ['patrocinador', 'Patrocinador']];
const sBtnP = s('height: 38px; padding: 0 14px; border-radius: 10px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px');
const sBtnS = s('height: 38px; padding: 0 14px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px');
const sIn = s('height: 40px; padding: 0 10px; border-radius: 10px; border: 1px solid #E2DCD0; font-size: 14px; color: #26213A; background: #FFFFFF');
const sLab = s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600');
const sEditor = s('background: #FFFFFF; border: 2px solid #6D4AFF; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px');
const sGrade = s('display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px');

type Res = { ok: boolean; msg?: string; erro?: string };

export function TelaCadastros(p: Props) {
  const [aba, setAba] = useState(ABAS.some((a) => a[0] === p.abaInicial) ? p.abaInicial : 'pessoas');
  const [toast, setToast] = useState<{ t: string; ok: boolean } | null>(null);
  const [pend, start] = useTransition();
  const rodar = (fn: () => Promise<Res>, depois?: () => void) => start(async () => { const r = await fn(); setToast({ t: r.ok ? r.msg ?? 'Salvo.' : r.erro ?? 'Erro', ok: r.ok }); if (r.ok) depois?.(); });

  return (
    <>
      <div style={s('display: flex; flex-direction: column; gap: 4px')}>
        <span style={s('font-size: 12px; color: #5E5770')}>Configuração / Cadastros</span>
        <h1 style={s('margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.3px')}>Cadastros</h1>
        <p style={s('margin: 0; font-size: 14px; color: #5E5770')}>A base que faz a governança funcionar. O TARS já vem com tudo preenchido; ajuste ao jeito da sua empresa.</p>
      </div>
      <div role="tablist" aria-label="Tipos de cadastro" style={s('display: flex; flex-wrap: wrap; gap: 6px; border-bottom: 1px solid #E2DCD0; padding-bottom: 8px')}>
        {ABAS.map(([k, r]) => <button key={k} type="button" role="tab" aria-selected={aba === k} onClick={() => { setAba(k); setToast(null); }} style={{ ...s('height: 38px; padding: 0 14px; border-radius: 10px; font-size: 13px; border: 0'), fontWeight: aba === k ? 700 : 500, background: aba === k ? '#E7E0FF' : 'transparent', color: aba === k ? '#3A22A8' : '#4A4458' }}>{r}</button>)}
      </div>
      {toast && <div role="status" style={{ ...s('padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 600'), background: toast.ok ? '#EFEAFE' : '#FEF3DC', color: toast.ok ? '#3A22A8' : '#6B3F03' }}>{toast.t}</div>}
      {aba === 'pessoas' && <AbaPessoas p={p} rodar={rodar} pend={pend} />}
      {aba === 'areas' && <AbaAreas p={p} rodar={rodar} pend={pend} />}
      {aba === 'fases' && <AbaFases p={p} rodar={rodar} pend={pend} />}
      {aba === 'modelos' && <AbaModelos p={p} rodar={rodar} pend={pend} />}
      {aba === 'criterios' && <AbaCriterios p={p} rodar={rodar} pend={pend} />}
      {aba === 'motivos' && <AbaMotivos p={p} rodar={rodar} pend={pend} />}
    </>
  );
}

type AbaProps = { p: Props; rodar: (fn: () => Promise<Res>, depois?: () => void) => void; pend: boolean };

function AbaPessoas({ p, rodar, pend }: AbaProps) {
  const vazio: A.PessoaForm = { nome: '', email: '', areaId: '', cargo: '', perfis: ['colaborador'], admin: false, cedeAte: 20, tratamento: 'n', externo: false };
  const [ed, setEd] = useState<A.PessoaForm | null>(null);
  const set = <K extends keyof A.PessoaForm>(k: K, v: A.PessoaForm[K]) => setEd((x) => (x ? { ...x, [k]: v } : x));
  const G = '2fr 1.4fr 1.4fr 1.8fr 0.9fr 0.9fr';
  return (
    <section style={s('display: flex; flex-direction: column; gap: 12px')}>
      <div style={s('display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; align-items: center')}>
        <span style={s('font-size: 13px; color: #5E5770')}>O gestor de cada pessoa vem da área: é o responsável cadastrado nela. Clique numa pessoa para editar.</span>
        <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
          <button type="button" disabled style={sBtnS} title="Em breve">Importar planilha</button>
          <button type="button" disabled style={s('height: 38px; padding: 0 14px; border-radius: 10px; border: 1px dashed #BDB2F5; background: #FBFAFF; color: #3A22A8; font-size: 13px; font-weight: 600')}>Conectar Microsoft Entra (AD) · em breve</button>
          <button type="button" onClick={() => setEd(vazio)} style={sBtnP}>Convidar pessoa</button>
        </div>
      </div>
      {ed && (
        <div style={sEditor}>
          <h2 style={s('margin: 0; font-size: 16px; font-weight: 700')}>{ed.id ? 'Editar pessoa' : 'Liberar acesso para uma pessoa'}</h2>
          <div style={sGrade}>
            <label style={sLab}>Nome<input value={ed.nome} onChange={(e) => set('nome', e.target.value)} style={sIn} /></label>
            <label style={sLab}>E-mail<input type="email" value={ed.email} onChange={(e) => set('email', e.target.value)} style={sIn} /></label>
            <label style={sLab}>Área<select value={ed.areaId} onChange={(e) => set('areaId', e.target.value)} style={sIn}><option value="">Sem área</option>{p.areas.map((a) => <option key={a.id} value={a.id}>{'· '.repeat(a.nivel)}{a.nome}</option>)}</select></label>
            <label style={sLab}>Cargo<input value={ed.cargo} onChange={(e) => set('cargo', e.target.value)} style={sIn} /></label>
            <label style={sLab}>Cede até (para projetos)<select value={ed.cedeAte ?? ''} disabled={ed.externo} onChange={(e) => set('cedeAte', e.target.value === '' ? null : Number(e.target.value))} style={sIn}><option value="">Não definido</option>{[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => <option key={v} value={v}>{v}%</option>)}</select></label>
            <label style={sLab}>Tratamento (só para rótulos)<select value={ed.tratamento} onChange={(e) => set('tratamento', e.target.value)} style={sIn}><option value="n">Neutro · Gestor(a)</option><option value="f">Feminino · Gestora</option><option value="m">Masculino · Gestor</option></select></label>
          </div>
          <div style={s('display: flex; flex-direction: column; gap: 8px')}>
            <span style={s('font-size: 13px; font-weight: 600')}>Perfis</span>
            <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
              {PERFIS.map(([k, r]) => { const on = ed.perfis.includes(k); return <button key={k} type="button" aria-pressed={on} onClick={() => set('perfis', on ? ed.perfis.filter((x) => x !== k) : [...ed.perfis, k])} style={estiloPill(on)}>{r}</button>; })}
              <button type="button" aria-pressed={ed.admin} onClick={() => set('admin', !ed.admin)} style={estiloPill(ed.admin)}>Admin</button>
            </div>
          </div>
          <label style={s('display: flex; align-items: center; gap: 10px; font-size: 13px')}><input type="checkbox" checked={ed.externo} onChange={(e) => set('externo', e.target.checked)} style={s('width: 18px; height: 18px; accent-color: #6D4AFF')} />Fornecedor externo (sem login e sem limite de cedência)</label>
          <div style={s('display: flex; justify-content: flex-end; gap: 8px')}>
            <button type="button" onClick={() => setEd(null)} style={sBtnS}>Cancelar</button>
            <button type="button" disabled={pend} onClick={() => rodar(() => A.salvarPessoa(ed), () => setEd(null))} style={sBtnP}>{ed.id ? 'Salvar' : ed.externo ? 'Cadastrar' : 'Liberar acesso'}</button>
          </div>
        </div>
      )}
      <div style={s('overflow-x: auto; background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px')}>
        <div style={s('min-width: 900px')}>
          <div style={{ ...s('display: grid; gap: 10px; padding: 12px 16px; font-size: 12px; color: #5E5770; font-weight: 600; border-bottom: 1px solid #EFEBE3; background: #FAF8F4'), gridTemplateColumns: G }}><span>Pessoa</span><span>Área</span><span>Gestor</span><span>Perfis</span><span>Cede até</span><span>Status</span></div>
          {p.pessoas.map((x) => (
            <button key={x.id} type="button" onClick={() => setEd({ id: x.id, nome: x.nome, email: x.email, areaId: x.areaId, cargo: x.cargo, perfis: x.perfis, admin: x.admin, cedeAte: x.cedeAte, tratamento: x.tratamento, externo: x.externo })}
              style={{ ...s('display: grid; gap: 10px; padding: 12px 16px; font-size: 13px; border: 0; border-bottom: 1px solid #F3F0EA; align-items: center; width: 100%; background: #FFFFFF; text-align: left; color: #26213A'), gridTemplateColumns: G }}>
              <span style={s('display: flex; align-items: center; gap: 10px')}><span style={s('width: 30px; height: 30px; border-radius: 50%; background: #E7E0FF; color: #4B2FD1; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex: 0 0 30px')}>{x.ini}</span><span style={s('display: flex; flex-direction: column; min-width: 0')}><span style={s('font-weight: 600')}>{x.nome}</span><span style={s('font-size: 12px; color: #5E5770')}>{x.email}</span></span></span>
              <span>{x.area}</span>
              <span style={s('color: #4A4458')}>{x.gestor}</span>
              <span style={s('display: flex; flex-wrap: wrap; gap: 4px')}>{x.rotulos.map((r) => <span key={r} style={s('font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: #EFEAFE; color: #4B2FD1')}>{r}</span>)}</span>
              <span>{x.cede}</span>
              <span style={{ ...s('font-size: 12px; font-weight: 600'), color: x.pendente ? '#9A5B05' : '#17723D' }}>{x.status}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function AbaAreas({ p, rodar, pend }: AbaProps) {
  const [ed, setEd] = useState<A.AreaForm | null>(null);
  const set = <K extends keyof A.AreaForm>(k: K, v: A.AreaForm[K]) => setEd((x) => (x ? { ...x, [k]: v } : x));
  return (
    <section style={s('display: flex; flex-direction: column; gap: 12px')}>
      <div style={s('display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; align-items: center')}>
        <span style={s('font-size: 13px; color: #5E5770')}>O responsável aprova as iniciativas da área e enxerga tudo o que está abaixo dela.</span>
        <button type="button" onClick={() => setEd({ nome: '', tipo: 'Gerência', parentId: '', responsavelId: '', headcount: null })} style={sBtnP}>Nova área</button>
      </div>
      {ed && (
        <div style={sEditor}>
          <h2 style={s('margin: 0; font-size: 16px; font-weight: 700')}>{ed.id ? 'Editar área' : 'Nova área'}</h2>
          <div style={sGrade}>
            <label style={sLab}>Nome<input value={ed.nome} onChange={(e) => set('nome', e.target.value)} style={sIn} /></label>
            <label style={sLab}>Tipo<select value={ed.tipo} onChange={(e) => set('tipo', e.target.value)} style={sIn}><option>Diretoria</option><option>Gerência</option><option>Coordenação</option></select></label>
            <label style={sLab}>Fica abaixo de<select value={ed.parentId} onChange={(e) => set('parentId', e.target.value)} style={sIn}><option value="">Topo da empresa</option>{p.areas.filter((a) => a.id !== ed.id).map((a) => <option key={a.id} value={a.id}>{'· '.repeat(a.nivel)}{a.nome}</option>)}</select></label>
            <label style={sLab}>Responsável<select value={ed.responsavelId} onChange={(e) => set('responsavelId', e.target.value)} style={sIn}><option value="">Sem responsável</option>{p.pessoas.filter((x) => !x.externo).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></label>
            <label style={sLab}>Nº de pessoas na área<input type="number" min={0} value={ed.headcount ?? ''} onChange={(e) => set('headcount', e.target.value === '' ? null : Number(e.target.value))} style={sIn} /></label>
          </div>
          <div style={s('display: flex; justify-content: flex-end; gap: 8px')}>
            <button type="button" onClick={() => setEd(null)} style={sBtnS}>Cancelar</button>
            <button type="button" disabled={pend} onClick={() => rodar(() => A.salvarArea(ed), () => setEd(null))} style={sBtnP}>Salvar</button>
          </div>
        </div>
      )}
      <div style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 8px')}>
        {p.areas.map((a) => (
          <button key={a.id} type="button" onClick={() => setEd({ id: a.id, nome: a.nome, tipo: a.tipo, parentId: a.parentId, responsavelId: a.responsavelId, headcount: a.headcount })}
            style={{ ...s('display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; border: 0; border-bottom: 1px solid #F3F0EA; width: 100%; text-align: left; color: #26213A'), paddingLeft: 12 + Math.min(a.nivel, 3) * 28, background: a.nivel === 0 ? '#FAF8F4' : '#FFFFFF' }}>
            <span style={{ ...s('min-width: 200px'), fontSize: a.nivel === 0 ? 14 : 13, fontWeight: a.nivel >= 2 ? 500 : 700 }}>{a.nome}</span>
            <span style={s('font-size: 12px; color: #5E5770; flex: 1')}>{a.tipo}</span>
            <span style={s('display: flex; align-items: center; gap: 8px; font-size: 13px')}><span style={s('width: 26px; height: 26px; border-radius: 50%; background: #E7E0FF; color: #4B2FD1; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600')}>{a.ini}</span>{a.responsavel}</span>
            <span style={s('font-size: 12px; color: #5E5770; min-width: 80px; text-align: right')}>{a.pessoas} pessoas</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function AbaFases({ p, rodar, pend }: AbaProps) {
  const [ed, setEd] = useState<{ id?: string; nome: string; duracaoSemanas: number; criterioConclusao: string } | null>(null);
  const G = '1.6fr 0.9fr 2.6fr 0.9fr';
  return (
    <section style={s('display: flex; flex-direction: column; gap: 12px')}>
      <div style={s('display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; align-items: center')}>
        <span style={s('font-size: 13px; color: #5E5770')}>Biblioteca de fases. Os modelos combinam essas fases e o GP pode incluir outras no projeto.</span>
        <button type="button" onClick={() => setEd({ nome: '', duracaoSemanas: 2, criterioConclusao: '' })} style={sBtnP}>Nova fase</button>
      </div>
      {ed && (
        <div style={sEditor}>
          <div style={sGrade}>
            <label style={sLab}>Fase<input value={ed.nome} onChange={(e) => setEd({ ...ed, nome: e.target.value })} style={sIn} /></label>
            <label style={sLab}>Duração padrão (semanas)<input type="number" min={1} value={ed.duracaoSemanas} onChange={(e) => setEd({ ...ed, duracaoSemanas: Number(e.target.value) })} style={sIn} /></label>
            <label style={sLab}>Critério para concluir<input value={ed.criterioConclusao} onChange={(e) => setEd({ ...ed, criterioConclusao: e.target.value })} style={sIn} /></label>
          </div>
          <div style={s('display: flex; justify-content: flex-end; gap: 8px')}>
            <button type="button" onClick={() => setEd(null)} style={sBtnS}>Cancelar</button>
            <button type="button" disabled={pend} onClick={() => rodar(() => A.salvarFaseBiblioteca(ed), () => setEd(null))} style={sBtnP}>Salvar</button>
          </div>
        </div>
      )}
      <div style={s('overflow-x: auto; background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px')}>
        <div style={s('min-width: 760px')}>
          <div style={{ ...s('display: grid; gap: 10px; padding: 12px 16px; font-size: 12px; color: #5E5770; font-weight: 600; border-bottom: 1px solid #EFEBE3; background: #FAF8F4'), gridTemplateColumns: G }}><span>Fase</span><span>Duração padrão</span><span>Critério para concluir</span><span>Em modelos</span></div>
          {p.fases.map((f) => (
            <button key={f.id} type="button" onClick={() => setEd({ id: f.id, nome: f.nome, duracaoSemanas: f.dur, criterioConclusao: f.criterio })} style={{ ...s('display: grid; gap: 10px; padding: 12px 16px; font-size: 13px; border: 0; border-bottom: 1px solid #F3F0EA; align-items: center; width: 100%; background: #FFFFFF; text-align: left; color: #26213A'), gridTemplateColumns: G }}>
              <span style={s('font-weight: 600')}>{f.nome}</span><span>{f.dur} {f.dur === 1 ? 'semana' : 'semanas'}</span><span style={s('color: #4A4458')}>{f.criterio}</span><span>{f.uso} {f.uso === 1 ? 'modelo' : 'modelos'}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function AbaModelos({ p, rodar, pend }: AbaProps) {
  const [ed, setEd] = useState<{ id?: string; nome: string; descricao: string; fases: string[] } | null>(null);
  const nome = (id: string) => p.fases.find((f) => f.id === id)?.nome ?? '';
  return (
    <section style={s('display: flex; flex-direction: column; gap: 12px')}>
      <div style={s('display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; align-items: center')}>
        <span style={s('font-size: 13px; color: #5E5770')}>No play, o projeto nasce com as fases do modelo e as datas da iniciativa.</span>
        <button type="button" onClick={() => setEd({ nome: '', descricao: '', fases: [] })} style={sBtnP}>Novo modelo</button>
      </div>
      {ed && (
        <div style={sEditor}>
          <div style={sGrade}>
            <label style={sLab}>Nome<input value={ed.nome} onChange={(e) => setEd({ ...ed, nome: e.target.value })} style={sIn} /></label>
            <label style={sLab}>Descrição<input value={ed.descricao} onChange={(e) => setEd({ ...ed, descricao: e.target.value })} style={sIn} /></label>
          </div>
          <span style={s('font-size: 13px; font-weight: 600')}>Fases, na ordem (clique para incluir ou tirar)</span>
          <div style={s('display: flex; flex-wrap: wrap; gap: 6px; align-items: center; min-height: 30px')}>
            {ed.fases.map((id, i) => <button key={id + i} type="button" onClick={() => setEd({ ...ed, fases: ed.fases.filter((_, j) => j !== i) })} style={s('font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 10px; background: #EFEAFE; color: #3A22A8; border: 0')}>{i + 1}. {nome(id)} ×</button>)}
            {ed.fases.length === 0 && <span style={s('font-size: 12px; color: #5E5770')}>Nenhuma fase escolhida.</span>}
          </div>
          <div style={s('display: flex; flex-wrap: wrap; gap: 6px')}>
            {p.fases.filter((f) => !ed.fases.includes(f.id)).map((f) => <button key={f.id} type="button" onClick={() => setEd({ ...ed, fases: [...ed.fases, f.id] })} style={s('min-height: 32px; padding: 0 12px; border-radius: 16px; border: 1px dashed #BDB2F5; background: #FBFAFF; color: #3A22A8; font-size: 12px; font-weight: 600')}>+ {f.nome}</button>)}
          </div>
          <div style={s('display: flex; justify-content: flex-end; gap: 8px')}>
            <button type="button" onClick={() => setEd(null)} style={sBtnS}>Cancelar</button>
            <button type="button" disabled={pend} onClick={() => rodar(() => A.salvarModelo(ed), () => setEd(null))} style={sBtnP}>Salvar</button>
          </div>
        </div>
      )}
      <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px')}>
        {p.modelos.map((m) => (
          <button key={m.id} type="button" onClick={() => setEd({ id: m.id, nome: m.nome, descricao: m.descricao, fases: m.fases })} style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 10px; text-align: left; color: #26213A')}>
            <div style={s('display: flex; justify-content: space-between; gap: 8px; width: 100%')}><span style={s('font-size: 15px; font-weight: 700')}>{m.nome}</span><span style={s('font-size: 12px; color: #5E5770')}>{m.total} semanas</span></div>
            <span style={s('font-size: 12px; color: #5E5770')}>{m.descricao}</span>
            <div style={s('display: flex; flex-wrap: wrap; gap: 6px; align-items: center')}>{m.fases.map((id, i) => <span key={id + i} style={s('font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 10px; background: #EFEAFE; color: #3A22A8')}>{nome(id)}</span>)}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

function AbaCriterios({ p, rodar, pend }: AbaProps) {
  const [w, setW] = useState(p.pesos);
  useEffect(() => setW(p.pesos), [p.pesos]);
  const soma = w.reduce((a, b) => a + b, 0);
  const nomes = [['Impacto', 'Quanto resolve o problema ou gera de resultado'], ['Urgência', 'Quanto custa esperar'], ['Alinhamento estratégico', 'Quanto contribui para os objetivos da empresa'], ['Facilidade', 'Quanto menor o esforço e o risco, maior a nota']];
  return (
    <section style={s('display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start')}>
      <div style={s('flex: 1 1 380px; background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px')}>
        <div style={s('display: flex; justify-content: space-between; align-items: center; gap: 8px')}><h2 style={s('margin: 0; font-size: 16px; font-weight: 700')}>Critérios de priorização</h2><span style={{ ...s('font-size: 12px; font-weight: 700'), color: soma === 100 ? '#17723D' : '#B42318' }}>{soma === 100 ? 'Total 100%' : `Total ${soma}% · precisa somar 100%`}</span></div>
        {nomes.map(([n, d], i) => (
          <label key={n} style={s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600')}>
            <span style={s('display: flex; justify-content: space-between')}><span>{n}</span><span>{w[i]}%</span></span>
            <span style={s('font-size: 12px; font-weight: 400; color: #5E5770')}>{d}</span>
            <input type="range" min={0} max={60} step={5} value={w[i]} aria-label={`Peso de ${n}`} onChange={(e) => { const x = w.slice(); x[i] = Number(e.target.value); setW(x); }} />
          </label>
        ))}
        <div style={s('display: flex; justify-content: flex-end')}><button type="button" disabled={pend || soma !== 100} onClick={() => rodar(() => A.salvarPesos(w as [number, number, number, number]))} style={sBtnP}>Salvar pesos</button></div>
      </div>
      <div style={s('flex: 1 1 320px; display: flex; flex-direction: column; gap: 16px')}>
        <div style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px')}>
          <h2 style={s('margin: 0; font-size: 16px; font-weight: 700')}>Tipos de iniciativa</h2>
          <span style={s('font-size: 13px')}><strong>Estratégica</strong> · faz a empresa crescer ou mudar</span>
          <span style={s('font-size: 13px')}><strong>Melhoria</strong> · deixa um processo melhor</span>
          <span style={s('font-size: 13px')}><strong>Obrigatória</strong> · lei, norma ou auditoria; entra independente da nota</span>
          <span style={s('font-size: 13px')}><strong>Manutenção</strong> · mantém algo funcionando</span>
        </div>
        <div style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px')}>
          <h2 style={s('margin: 0; font-size: 16px; font-weight: 700')}>Faixas de custo do formulário</h2>
          <div style={s('display: flex; flex-wrap: wrap; gap: 6px')}>{['Até R$ 10 mil', 'R$ 10–50 mil', 'R$ 50–200 mil', 'Acima de R$ 200 mil'].map((f) => <span key={f} style={s('font-size: 12px; padding: 4px 10px; border-radius: 10px; background: #EDEAE3')}>{f}</span>)}</div>
        </div>
      </div>
    </section>
  );
}

function AbaMotivos({ p, rodar, pend }: AbaProps) {
  const [novo, setNovo] = useState<Record<string, string>>({});
  const grupos: [keyof Motivos, string][] = [['recusa', 'Recusa'], ['pausa', 'Pausa'], ['cancelamento', 'Cancelamento']];
  return (
    <section style={s('display: flex; flex-direction: column; gap: 12px')}>
      <span style={s('font-size: 13px; color: #5E5770')}>Motivos padronizados permitem responder “por que dizemos não?” com dados, no fim de cada ciclo.</span>
      <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px')}>
        {grupos.map(([g, t]) => (
          <div key={g} style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 8px')}>
            <h2 style={s('margin: 0; font-size: 15px; font-weight: 700')}>{t}</h2>
            {p.motivos[g].map((m) => (
              <span key={m} style={s('display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 8px 10px; border-radius: 9px; background: #F7F5F0')}>
                <span style={s('flex: 1')}>{m}</span>
                <button type="button" aria-label={`Remover ${m}`} disabled={pend} onClick={() => rodar(() => A.removerMotivo(g, m))} style={s('width: 24px; height: 24px; border: 0; background: transparent; color: #8A8296; font-size: 15px')}>×</button>
              </span>
            ))}
            <div style={s('display: flex; gap: 6px')}>
              <input value={novo[g] ?? ''} onChange={(e) => setNovo({ ...novo, [g]: e.target.value })} placeholder="Novo motivo" style={{ ...sIn, flex: 1, height: 36, fontSize: 13 }} />
              <button type="button" disabled={pend || !(novo[g] ?? '').trim()} onClick={() => rodar(() => A.adicionarMotivo(g, novo[g] ?? ''), () => setNovo({ ...novo, [g]: '' }))} style={s('height: 36px; padding: 0 12px; border-radius: 9px; border: 1px dashed #BDB2F5; background: #FBFAFF; color: #3A22A8; font-size: 12px; font-weight: 600')}>+ Adicionar motivo</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
