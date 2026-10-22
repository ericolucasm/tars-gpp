import { redirect } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { getSessao, modoAuth, perfilPrincipal } from '@/lib/sessao';
import { s } from '@/lib/css';
import { Marca, sCartaoAuth, sTelaAuth } from '@/components/Marca';
import { BotaoGoogle } from './BotaoGoogle';
import { BotaoDev } from './BotaoDev';

export const dynamic = 'force-dynamic';

const ROTULO: Record<string, string> = { pmo: 'PMO', gp: 'Gerente de projeto', gestor: 'Gestor de área', colaborador: 'Colaborador' };

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string; error?: string }> }) {
  const { erro, error } = await searchParams;
  if (await getSessao()) redirect('/inicio');

  if (modoAuth() === 'dev') {
    const pessoas = await db.select().from(t.pessoas).where(eq(t.pessoas.externo, false)).orderBy(asc(t.pessoas.seq));
    return (
      <div style={sTelaAuth}>
        <div style={{ ...sCartaoAuth, width: 560 }}>
          <Marca />
          <div style={s('display: flex; flex-direction: column; gap: 4px')}>
            <h1 style={s('margin: 0; font-size: 22px; font-weight: 700')}>Entrar (modo demonstração)</h1>
            <p style={s('margin: 0; font-size: 13px; color: #5E5770')}>Ambiente de desenvolvimento: escolha uma pessoa da empresa demo. Em produção, o login é por e-mail e senha.</p>
          </div>
          <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px')}>
            {pessoas.map((p) => (
              <BotaoDev key={p.id} id={p.id} nome={p.nome} sub={`${ROTULO[perfilPrincipal(p)]}${p.admin ? ' · Admin' : ''}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const configurado = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.BETTER_AUTH_SECRET);
  return (
    <div style={sTelaAuth}>
      <div style={sCartaoAuth}>
        <Marca />
        <div style={s('display: flex; flex-direction: column; gap: 4px')}>
          <h1 style={s('margin: 0; font-size: 22px; font-weight: 700')}>Entrar</h1>
          <p style={s('margin: 0; font-size: 13px; color: #5E5770')}>Use a conta Google do e-mail cadastrado pela sua empresa.</p>
        </div>
        {(erro || error) && (
          <div role="alert" style={s('padding: 12px 14px; border-radius: 12px; background: #FEF3DC; color: #6B3F03; font-size: 13px; line-height: 1.5')}>
            Este e-mail ainda não tem acesso ao TARS. Peça a um administrador para cadastrar você em Cadastros › Pessoas e tente de novo.
          </div>
        )}
        {configurado ? <BotaoGoogle /> : <span style={s('font-size: 13px; color: #B42318')}>Login com Google ainda não configurado (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e BETTER_AUTH_SECRET).</span>}
      </div>
    </div>
  );
}
