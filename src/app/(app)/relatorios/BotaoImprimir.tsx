'use client';

import { sBtnSec } from '@/components/ui';

/** Imprime a página (ou salva em PDF pelo diálogo de impressão do navegador). */
export function BotaoImprimir() {
  return <button type="button" data-sem-impressao onClick={() => window.print()} style={sBtnSec}>Imprimir ou salvar PDF</button>;
}
