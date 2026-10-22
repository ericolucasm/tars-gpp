import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// Porteiro de todas as rotas: sem cookie de sessão, vai para /login.
// (A sessão em si é validada no servidor de cada página; aqui é só o filtro rápido.)
const PUBLICAS = ['/login', '/api/auth'];

export function middleware(req: NextRequest) {
  if (PUBLICAS.some((p) => req.nextUrl.pathname.startsWith(p))) return NextResponse.next();
  const logado = process.env.AUTH_MODE === 'dev' ? !!req.cookies.get('tars_dev') : !!getSessionCookie(req);
  return logado ? NextResponse.next() : NextResponse.redirect(new URL('/login', req.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)'],
};
