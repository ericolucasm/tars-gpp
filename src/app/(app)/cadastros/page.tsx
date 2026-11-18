import { exigirAdmin } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { gestorDe, iniciais, pendenciasAoDesativar, rotuloAtivo, rotuloPerfil } from '@/lib/regras/pessoas';
import { noRaia } from '@/lib/visoes';
import { Shell } from '@/components/Shell';
import { TelaCadastros } from './TelaCadastros';

export const dynamic = 'force-dynamic';

export default async function Cadastros({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams;
  const sessao = await exigirAdmin();
  const d = await carregarOrg(sessao.orgId);

  // profundidade de cada área na árvore (para o recuo da hierarquia)
  const nivel = (id: string | null): number => { const a = d.areas.find((x) => x.id === id); return a?.parentId ? 1 + nivel(a.parentId) : 0; };
  const ordenarArvore = (pai: string | null): typeof d.areas => d.areas.filter((a) => a.parentId === pai).flatMap((a) => [a, ...ordenarArvore(a.id)]);
  const contaPessoas = (areaId: string) => d.pessoas.filter((p) => p.areaId === areaId).length;
  const usoFase = (id: string) => d.modelos.filter((m) => m.fases.includes(id)).length;

  return (
    <Shell sessao={sessao} dados={d} atual="cadastros" mainStyle="flex: 999 1 560px; min-width: 0; padding: 28px 32px 40px; box-sizing: border-box; display: flex; flex-direction: column; gap: 18px">
      <TelaCadastros
        abaInicial={aba ?? 'pessoas'}
        pessoas={d.pessoas.map((p) => {
          const tr = p.tratamento as 'f' | 'm' | 'n';
          return {
            id: p.id, nome: p.nome, email: p.email, areaId: p.areaId ?? '', area: d.areas.find((a) => a.id === p.areaId)?.nome ?? '—',
            gestor: d.pessoas.find((x) => x.id === gestorDe(p, d.areas))?.nome ?? '—', cargo: p.cargo ?? '',
            perfis: p.perfis, rotulos: [...p.perfis.map((x) => rotuloPerfil(x, tr)), ...(p.admin ? ['Admin'] : [])], admin: p.admin,
            cedeAte: p.cedeAte, cede: p.externo ? 'Externo' : p.cedeAte == null ? '—' : `${p.cedeAte}%`, status: rotuloAtivo(p.status, tr), pendente: p.status !== 'ativo',
            ini: iniciais(p.nome), tratamento: p.tratamento, externo: p.externo, inativo: p.status === 'inativo',
            pendencias: pendenciasAoDesativar({
              projetosGp: d.iniciativas.filter((i) => i.gpId === p.id && noRaia(d, i, 'exe', 'pau')).map((i) => i.titulo),
              areasResponsavel: d.areas.filter((a) => a.responsavelId === p.id).map((a) => a.nome),
              tarefasAbertas: d.tarefas.filter((t) => t.responsavelId === p.id && !t.concluida).length,
              aprovacoesPendentes: d.iniciativas.filter((i) => i.aprovadorId === p.id && noRaia(d, i, 'sol') && i.solStatus === 'aguardando_gestor').length,
            }),
          };
        })}
        areas={ordenarArvore(null).map((a) => {
          const resp = d.pessoas.find((p) => p.id === a.responsavelId);
          return { id: a.id, nome: a.nome, tipo: a.tipo, parentId: a.parentId ?? '', responsavelId: a.responsavelId ?? '', responsavel: resp?.nome ?? '—', ini: resp ? iniciais(resp.nome) : '—', nivel: nivel(a.id), headcount: a.headcount, pessoas: a.headcount ?? contaPessoas(a.id) };
        })}
        fases={d.fasesBiblioteca.map((f) => ({ id: f.id, nome: f.nome, dur: f.duracaoSemanas, criterio: f.criterioConclusao, uso: usoFase(f.id) }))}
        modelos={d.modelos.map((m) => ({ id: m.id, nome: m.nome, descricao: m.descricao, fases: m.fases, total: m.fases.reduce((s, id) => s + (d.fasesBiblioteca.find((f) => f.id === id)?.duracaoSemanas ?? 0), 0) }))}
        pesos={d.org.config.pesos}
        motivos={d.org.config.motivos}
      />
    </Shell>
  );
}
