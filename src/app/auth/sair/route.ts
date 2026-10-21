import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_DEV, COOKIE_VER, modoAuth } from '@/lib/sessao';
import { supabaseServidor } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const store = await cookies();
  store.delete(COOKIE_DEV);
  store.delete(COOKIE_VER);
  if (modoAuth() === 'supabase') await (await supabaseServidor()).auth.signOut();
  return NextResponse.redirect(new URL('/login', req.url), { status: 303 });
}
