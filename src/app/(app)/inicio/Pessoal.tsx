'use client';

import { useState, useTransition } from 'react';
import { s } from '@/lib/css';
import { alternarTarefaPessoal, criarTarefaPessoal, excluirTarefaPessoal } from '@/app/acoes/meu-tars';

const sIn = s('height: 36px; padding: 0 10px; border-radius: 9px; border: 1px solid #E2DCD0; font-size: 13px; color: #26213A; background: #FFFFFF');

/** Criar uma tarefa pessoal (o que não é de projeto). Só a própria pessoa vê. */
export function NovaTarefaPessoal() {
  const [titulo, setTitulo] = useState('');
  const [prazo, setPrazo] = useState('');
  const [erro, setErro] = useState('');
  const [pend, start] = useTransition();
  return (
    <form role="group" aria-label="Nova tarefa pessoal" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await criarTarefaPessoal(titulo, prazo || null); setErro(r.ok ? '' : r.erro); if (r.ok) { setTitulo(''); setPrazo(''); } }); }}
      style={s('display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 10px 12px; border-radius: 12px; border: 1px dashed #D6CFC2')}>
      <input aria-label="Tarefa pessoal" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="+ Tarefa pessoal (ex.: preparar a reunião com o fornecedor)" style={{ ...sIn, flex: '1 1 260px' }} />
      <input type="date" aria-label="Prazo da tarefa pessoal" value={prazo} onChange={(e) => setPrazo(e.target.value)} style={sIn} />
      <button type="submit" disabled={pend || !titulo.trim()} style={s('height: 36px; padding: 0 14px; border-radius: 9px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px')}>Adicionar</button>
      <span style={s('font-size: 11px; color: #8A8296; flex: 1 1 100%')}>Só você vê suas tarefas pessoais.</span>
      {erro && <span role="alert" style={s('font-size: 12px; color: #B42318')}>{erro}</span>}
    </form>
  );
}

/** Linha de uma tarefa pessoal na caixa: concluir (ou reabrir) e excluir. */
export function LinhaTarefaPessoal({ id, titulo, sub, concluida, atrasada }: { id: string; titulo: string; sub: string; concluida: boolean; atrasada: boolean }) {
  const [pend, start] = useTransition();
  return (
    <div style={{ ...s('display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 12px; color: #26213A'), border: `1px solid ${atrasada ? '#F5D2D2' : '#EFEBE3'}`, background: atrasada ? '#FFF8F8' : '#FFFFFF' }}>
      <input type="checkbox" checked={concluida} disabled={pend} aria-label={`Concluir ${titulo}`} onChange={() => start(async () => { await alternarTarefaPessoal(id); })} style={s('width: 18px; height: 18px; accent-color: #6D4AFF; flex: 0 0 18px')} />
      <span style={s('display: flex; flex-direction: column; flex: 1; min-width: 0')}>
        <span style={{ ...s('font-size: 14px; font-weight: 600'), textDecoration: concluida ? 'line-through' : 'none', color: concluida ? '#8A8296' : '#26213A' }}>{titulo}</span>
        <span style={s('font-size: 12px; color: #5E5770')}>{sub}</span>
      </span>
      <button type="button" disabled={pend} aria-label={`Excluir ${titulo}`} onClick={() => { if (confirm(`Excluir a tarefa "${titulo}"?`)) start(async () => { await excluirTarefaPessoal(id); }); }} style={s('width: 30px; height: 30px; border: 0; background: transparent; color: #8A8296; font-size: 16px')}>×</button>
    </div>
  );
}
