'use client';

import { Suspense, useEffect, useState } from 'react';
import Link, { useLinkStatus } from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

// Retorno visual imediato ao navegar: as páginas são montadas no servidor, então entre o clique
// e a tela nova há uma espera. Sem sinal nenhum, parece que o app travou.

const KEYFRAMES = '@keyframes tars-carregando { 0% { transform: translateX(-100%) } 100% { transform: translateX(250%) } }';

function Barra() {
  return (
    <div role="progressbar" aria-label="Carregando" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 1000, overflow: 'hidden', background: 'rgba(109, 74, 255, 0.15)' }}>
      <style>{KEYFRAMES}</style>
      <div style={{ width: '40%', height: '100%', background: '#6D4AFF', animation: 'tars-carregando 1s ease-in-out infinite' }} />
    </div>
  );
}

/** Barra de progresso no topo enquanto qualquer link interno carrega a próxima tela. */
function BarraDeNavegacaoInterna() {
  const pathname = usePathname();
  const busca = useSearchParams();
  const [carregando, setCarregando] = useState(false);

  // chegou na tela nova: some a barra
  useEffect(() => setCarregando(false), [pathname, busca]);

  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // mesma tela (ex.: só #âncora)
      setCarregando(true);
    }
    // fase de captura: roda antes do Link do Next, que cancela o clique padrão para navegar sem recarregar
    document.addEventListener('click', aoClicar, true);
    return () => document.removeEventListener('click', aoClicar, true);
  }, []);

  // segurança: se a navegação falhar, a barra não fica presa
  useEffect(() => {
    if (!carregando) return;
    const t = setTimeout(() => setCarregando(false), 20000);
    return () => clearTimeout(t);
  }, [carregando]);

  return carregando ? <Barra /> : null;
}

export function BarraDeNavegacao() {
  return <Suspense fallback={null}><BarraDeNavegacaoInterna /></Suspense>;
}

/** Item do menu lateral: ao clicar, já aparece como selecionado enquanto a tela carrega. */
export function ItemMenu({ href, rotulo, ativo, contador, estilo, estiloAtivo }: { href: string; rotulo: string; ativo?: boolean; contador?: number; estilo: React.CSSProperties; estiloAtivo: React.CSSProperties }) {
  return (
    <Link href={href} aria-current={ativo ? 'page' : undefined} className="tars-menu-item" style={{ position: 'relative', display: 'block', borderRadius: 9 }}>
      <Conteudo rotulo={rotulo} ativo={!!ativo} contador={contador} estilo={estilo} estiloAtivo={estiloAtivo} />
    </Link>
  );
}

function Conteudo({ rotulo, ativo, contador, estilo, estiloAtivo }: { rotulo: string; ativo: boolean; contador?: number; estilo: React.CSSProperties; estiloAtivo: React.CSSProperties }) {
  const { pending } = useLinkStatus();
  const on = ativo || pending;
  return (
    <span style={on ? estiloAtivo : estilo}>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{rotulo}</span>
      {!!contador && <span aria-label={`${contador} ${contador === 1 ? 'novidade' : 'novidades'}`} style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: '#6D4AFF', color: '#FFFFFF' }}>{contador}</span>}
      <span aria-hidden style={{ fontSize: 16, lineHeight: 1, color: on ? '#6D4AFF' : '#B5AEC2', flex: '0 0 auto' }}>›</span>
    </span>
  );
}
