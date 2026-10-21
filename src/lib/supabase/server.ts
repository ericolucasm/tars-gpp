import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function supabaseConfigurado() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function supabaseServidor() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (lista) => {
        try { lista.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* chamado de Server Component: o middleware renova */ }
      },
    },
  });
}

/** Cliente com a service role: só no servidor, para convites. */
export function supabaseAdmin() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}
