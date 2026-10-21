'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { s } from '@/lib/css';
import { supabaseNavegador } from '@/lib/supabase/navegador';
import { Marca, sBotao, sCampo, sCartaoAuth, sRotulo, sTelaAuth } from '@/components/Marca';

// Destino dos links de convite e de recuperação: o cliente do Supabase lê o token da URL e abre a sessão.
export default function DefinirSenha() {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);
  const [semSessao, setSemSessao] = useState(false);
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    const sb = supabaseNavegador();
    const params = new URLSearchParams(location.search);
    const tokenHash = params.get('token_hash');
    const type = params.get('type') as 'invite' | 'recovery' | null;
    (async () => {
      if (tokenHash && type) await sb.auth.verifyOtp({ token_hash: tokenHash, type });
      const { data } = await sb.auth.getSession();
      setSemSessao(!data.session);
      setPronto(true);
    })();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) { setErro('A senha precisa ter pelo menos 8 caracteres.'); return; }
    const { error } = await supabaseNavegador().auth.updateUser({ password: senha });
    if (error) { setErro('Não foi possível salvar a senha. Abra o link do e-mail de novo.'); return; }
    router.replace('/inicio');
    router.refresh();
  }

  return (
    <div style={sTelaAuth}>
      <form onSubmit={salvar} style={sCartaoAuth}>
        <Marca />
        <h1 style={s('margin: 0; font-size: 22px; font-weight: 700')}>Crie sua senha</h1>
        {!pronto ? <span style={s('font-size: 13px; color: #5E5770')}>Validando o link…</span> : semSessao ? (
          <span style={s('font-size: 13px; color: #B42318')}>Link inválido ou expirado. Peça um novo na tela de login.</span>
        ) : (
          <>
            <label style={sRotulo}>Nova senha<input type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} style={sCampo} /></label>
            {erro && <span style={s('font-size: 13px; color: #B42318')}>{erro}</span>}
            <button type="submit" style={sBotao}>Salvar e entrar</button>
          </>
        )}
      </form>
    </div>
  );
}
