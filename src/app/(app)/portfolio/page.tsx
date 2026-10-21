import { exigirPerfil } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { hojeISO } from '@/lib/regras/datas';
import { acoesDoCard, ordenar } from '@/lib/regras/esteira';
import { iniciais } from '@/lib/regras/pessoas';
import { br, cicloAberto, infoProjeto, nomeArea, rotuloCiclo, situacaoDoCard, subDoCard } from '@/lib/visoes';
import { Shell } from '@/components/Shell';
import { Quadro, type CardVM, type RaiaVM } from './Quadro';

export const dynamic = 'force-dynamic';

export default async function Portfolio() {
  const sessao = await exigirPerfil('pmo');
  const d = await carregarOrg(sessao.orgId);
  const hoje = hojeISO();
  const raias = ordenar(d.raias);
  const porId = new Map(raias.map((r) => [r.id, r]));

  const cards: CardVM[] = d.iniciativas
    .filter((i) => !(porId.get(i.raiaId)?.chave === 'sol' && i.solStatus === 'rascunho'))
    .map((i) => {
      const raia = porId.get(i.raiaId)!;
      const ch = raia.chave;
      const projeto = raia.tipoCard === 'Projeto';
      const comFarol = (ch === 'exe' || ch === 'pau') && !!i.farol;
      let tag: CardVM['tag'];
      if (comFarol) tag = { tipo: 'farol', farol: i.farol! };
      else if (ch === 'bkl') tag = { tipo: 'roxo', rotulo: `Prioridade ${i.prioridade ?? 'a definir'}` };
      else if (ch === 'pre') {
        const exe = raias.find((r) => r.chave === 'exe');
        const marc = (exe && i.progressoGates[exe.id]) || [];
        tag = { tipo: 'roxo', rotulo: `Prontidão ${marc.filter(Boolean).length}/${exe?.criterios.length ?? 5}` };
      } else if (ch === 'sol') tag = { tipo: 'neutro', rotulo: rotuloCiclo(d, i) };
      else if (ch === 'con') tag = { tipo: 'neutro', rotulo: 'Entregue' };
      else if (ch === 'can') tag = { tipo: 'neutro', rotulo: 'Encerrada' };
      else tag = { tipo: 'neutro', rotulo: raia.nome };
      const prog = (ch === 'exe' || ch === 'pau') ? infoProjeto(d, i, hoje).progresso : null;
      const dono = d.pessoas.find((p) => p.id === (projeto && i.gpId ? i.gpId : i.solicitanteId));
      return {
        id: i.id, raiaId: i.raiaId, areaId: i.areaId ?? '', titulo: i.titulo, kind: projeto ? 'PROJETO' : 'INICIATIVA',
        area: nomeArea(d, i.areaId).toUpperCase(), tag, situacao: situacaoDoCard(d, i), sub: subDoCard(d, i, hoje),
        progresso: prog, dono: dono ? iniciais(dono.nome) : '—', link: projeto && i.inicioProjeto ? `/projetos/${i.id}` : null,
        solAguardandoGestor: ch === 'sol' && i.solStatus === 'aguardando_gestor', farolCritico: ch === 'exe' && i.farol === 'crit',
        acoes: acoesDoCard(i, raias), progressoGates: i.progressoGates,
      };
    });

  const vmRaias: RaiaVM[] = raias.map((r) => ({ id: r.id, chave: r.chave, nome: r.nome, descricao: r.descricao, saida: r.saida }));
  const ciclo = cicloAberto(d);
  const areasUsadas = [...new Set(cards.map((c) => c.areaId).filter(Boolean))];

  return (
    <Shell sessao={sessao} dados={d} atual="portfolio" mainStyle="flex: 999 1 560px; min-width: 0; padding: 28px 32px; box-sizing: border-box; display: flex; flex-direction: column; gap: 20px">
      <Quadro
        raias={vmRaias}
        cards={cards}
        cicloTexto={ciclo ? `Ciclo ${ciclo.nome} · inscrições abertas até ${br(ciclo.fechamento).slice(0, 5)}` : null}
        modoMisto={d.org.modoCaptacao === 'misto'}
        areas={d.areas.filter((a) => areasUsadas.includes(a.id)).map((a) => ({ id: a.id, nome: a.nome }))}
        gps={d.pessoas.filter((p) => !p.externo && p.status === 'ativo').map((p) => ({ id: p.id, nome: p.nome, gp: p.perfis.includes('gp') }))}
        modelos={d.modelos.map((m) => ({ id: m.id, nome: m.nome }))}
        motivos={d.org.config.motivos}
        hoje={hoje}
      />
    </Shell>
  );
}
