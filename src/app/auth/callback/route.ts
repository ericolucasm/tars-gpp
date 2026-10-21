import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServidor } from '@/lib/supabase/server';

// Links do Supabase (convite, recuperação de senha) voltam aqui com um código de uso único.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const next = req.nextUrl.searchParams.get('next') ?? '/inicio';
  if (code) {
    const sb = await supabaseServidor();
    await sb.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next.startsWith('/') ? next : '/inicio', req.url));
}
