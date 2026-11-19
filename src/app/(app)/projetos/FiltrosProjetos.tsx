'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { s } from '@/lib/css';
import type { FiltroProjetos } from '@/lib/regras/filtro-projetos';

type Opcao = { id: string; nome: string };

const sCampo = s('height: 40px; padding: 0 10px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 14px');
const sRotulo = s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600');

/** Barra de filtros da tela Projetos. Os filtros ficam no endereço da página: voltar de um projeto mantém o recorte. */
export function FiltrosProjetos({ filtro, areas, gps, total, mostrados }: { filtro: FiltroProjetos; areas: Opcao[]; gps: Opcao[]; total: number; mostrados: number }) {
  const router = useRouter();
  const caminho = usePathname();
  const [busca, setBusca] = useState(filtro.busca ?? '');
  // guarda o último filtro pedido: se a pessoa mudar dois campos seguidos, o segundo não apaga o primeiro enquanto a página recarrega
  const atual = useRef(filtro);
  useEffect(() => { atual.current = filtro; }, [filtro]);

  const aplicar = (muda: Partial<FiltroProjetos>) => {
    const novo = { ...atual.current, ...muda };
    atual.current = novo;
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(novo)) if (v) q.set(k, v);
    const t = q.toString();
    router.replace(t ? `${caminho}?${t}` : caminho, { scroll: false });
  };

  // a busca filtra enquanto a pessoa digita, com uma pequena espera para não recarregar a cada letra
  useEffect(() => {
    if ((filtro.busca ?? '') === busca.trim()) return;
    const t = setTimeout(() => aplicar({ busca: busca.trim() || undefined }), 400);
    return () => clearTimeout(t);
  }, [busca]);

  const ativo = Object.values(filtro).some(Boolean);

  return (
    <div role="group" aria-label="Filtros" style={s('display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 14px 16px')}>
      <label style={sRotulo}>Buscar
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome do projeto" style={{ ...sCampo, width: 180 }} />
      </label>
      <label style={sRotulo}>Situação
        <select value={filtro.situacao ?? ''} onChange={(e) => aplicar({ situacao: e.target.value || undefined })} style={{ ...sCampo, minWidth: 150 }}>
          <option value="">Todas</option>
          <option value="exe">Em execução</option>
          <option value="pau">Pausados</option>
          <option value="con">Concluídos</option>
        </select>
      </label>
      <label style={sRotulo}>Farol
        <select value={filtro.farol ?? ''} onChange={(e) => aplicar({ farol: e.target.value || undefined })} style={{ ...sCampo, minWidth: 130 }}>
          <option value="">Todos</option>
          <option value="crit">Crítico</option>
          <option value="aten">Atenção</option>
          <option value="ok">OK</option>
        </select>
      </label>
      <label style={sRotulo}>Área
        <select value={filtro.area ?? ''} onChange={(e) => aplicar({ area: e.target.value || undefined })} style={{ ...sCampo, minWidth: 170 }}>
          <option value="">Todas</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </label>
      {gps.length > 1 && (
        <label style={sRotulo}>GP
          <select value={filtro.gp ?? ''} onChange={(e) => aplicar({ gp: e.target.value || undefined })} style={{ ...sCampo, minWidth: 170 }}>
            <option value="">Todos</option>
            {gps.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </select>
        </label>
      )}
      <div style={sRotulo}>Período em que esteve ativo
        <div style={s('display: flex; gap: 6px; align-items: center')}>
          <input type="date" aria-label="Ativo de" value={filtro.de ?? ''} onChange={(e) => aplicar({ de: e.target.value || undefined })} style={sCampo} />
          <span style={s('font-size: 13px; font-weight: 500; color: #5E5770')}>a</span>
          <input type="date" aria-label="até" value={filtro.ate ?? ''} onChange={(e) => aplicar({ ate: e.target.value || undefined })} style={sCampo} />
        </div>
      </div>
      {ativo && (
        <button type="button" onClick={() => { setBusca(''); atual.current = {}; router.replace(caminho, { scroll: false }); }} style={s('height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #4A4458; font-weight: 600; font-size: 13px')}>Limpar filtros</button>
      )}
      <span style={s('font-size: 12px; color: #5E5770; padding-bottom: 11px')}>
        {ativo ? `${mostrados} de ${total} ${total === 1 ? 'projeto' : 'projetos'}` : `${total} ${total === 1 ? 'projeto' : 'projetos'}`}
      </span>
    </div>
  );
}
