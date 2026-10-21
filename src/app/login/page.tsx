import { redirect } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { getSessao, modoAuth, perfilPrincipal } from '@/lib/sessao';
import { s } from '@/lib/css';
import { Marca, sCartaoAuth, sTelaAuth } from '@/components/Marca';
import { FormLogin } from './FormLogin';
import { BotaoDev } from './BotaoDev';

export const dynamic = 'force-dynamic';

const ROTULO: Record<string, string> = { pmo: 'PMO', gp: 'Gerente de projeto', gestor: 'Gestor de área', colaborador: 'Colaborador' };

export default async function Login() {
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

  return (
    <div style={sTelaAuth}>
      <div style={sCartaoAuth}>
        <Marca />
        <FormLogin />
      </div>
    </div>
  );
}
