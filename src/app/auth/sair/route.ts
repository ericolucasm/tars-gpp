import { NextResponse, type NextRequest } from 'next/server';
import { cookies, headers } from 'next/headers';
import { COOKIE_DEV, COOKIE_VER, modoAuth } from '@/lib/sessao';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const store = await cookies();
  store.delete(COOKIE_DEV);
  store.delete(COOKIE_VER);
  if (modoAuth() === 'google') await auth().api.signOut({ headers: await headers() }).catch(() => {});
  return NextResponse.redirect(new URL('/login', req.url), { status: 303 });
}
