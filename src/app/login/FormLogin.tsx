'use client';

import { useActionState, useState } from 'react';
import { s } from '@/lib/css';
import { entrar } from '@/app/acoes/sessao';
import { supabaseNavegador } from '@/lib/supabase/navegador';
import { sBotao, sCampo, sRotulo } from '@/components/Marca';

export function FormLogin() {
  const [estado, acao, pend] = useActionState(entrar, {});
  const [modo, setModo] = useState<'senha' | 'link'>('senha');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  async function enviarLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setMsg('Informe seu e-mail.'); return; }
    await supabaseNavegador().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${location.origin}/auth/definir-senha` });
    setMsg('Se o e-mail estiver cadastrado, você vai receber um link para criar a senha.');
  }

  if (modo === 'link') {
    return (
      <form onSubmit={enviarLink} style={s('display: flex; flex-direction: column; gap: 14px')}>
        <h1 style={s('margin: 0; font-size: 22px; font-weight: 700')}>Primeiro acesso ou nova senha</h1>
        <label style={sRotulo}>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={sCampo} /></label>
        {msg && <span style={s('font-size: 13px; color: #3A22A8')}>{msg}</span>}
        <button type="submit" style={sBotao}>Enviar link</button>
        <button type="button" onClick={() => { setModo('senha'); setMsg(''); }} style={s('border: 0; background: transparent; color: #4B2FD1; font-size: 13px; font-weight: 600')}>Voltar para o login</button>
      </form>
    );
  }

  return (
    <form action={acao} style={s('display: flex; flex-direction: column; gap: 14px')}>
      <h1 style={s('margin: 0; font-size: 22px; font-weight: 700')}>Entrar</h1>
      <label style={sRotulo}>E-mail<input name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={sCampo} /></label>
      <label style={sRotulo}>Senha<input name="senha" type="password" autoComplete="current-password" style={sCampo} /></label>
      {estado.erro && <span style={s('font-size: 13px; color: #B42318')}>{estado.erro}</span>}
      <button type="submit" disabled={pend} style={sBotao}>Entrar</button>
      <button type="button" onClick={() => setModo('link')} style={s('border: 0; background: transparent; color: #4B2FD1; font-size: 13px; font-weight: 600')}>Primeiro acesso ou esqueceu a senha?</button>
    </form>
  );
}
