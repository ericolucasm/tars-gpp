'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// "Visão da área" foi dividida em três menus. O endereço antigo (e avisos antigos com /area#capacidade
// ou /area#aprovacoes) continua funcionando: leva para a tela nova certa.
export default function Area() {
  const router = useRouter();
  useEffect(() => {
    router.replace(window.location.hash === '#capacidade' ? '/area/time' : '/area/iniciativas');
  }, [router]);
  return null;
}
