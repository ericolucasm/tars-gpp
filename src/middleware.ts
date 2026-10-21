import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Porteiro de todas as rotas: sem login, vai para /login.
// No modo Supabase, também renova o cookie da sessão a cada requisição.
const PUBLICAS = ['/login', '/auth'];

export async function middleware(req: NextRequest) {
  const publica = PUBLICAS.some((p) => req.nextUrl.pathname.startsWith(p));
  const paraLogin = () => NextResponse.redirect(new URL('/login', req.url));

  if (process.env.AUTH_MODE === 'dev') {
    if (!publica && !req.cookies.get('tars_dev')) return paraLogin();
    return NextResponse.next();
  }

  let res = NextResponse.next({ request: req });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return publica ? res : paraLogin();
  }
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        lista.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getUser();
  if (!data.user && !publica) return paraLogin();
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)'],
};
