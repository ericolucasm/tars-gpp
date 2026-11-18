// Hierarquia, capacidade e rótulos de pessoas.

export type AreaH = { id: string; parentId: string | null; nome: string; responsavelId: string | null };
export type PessoaH = { id: string; areaId: string | null; nome: string; cedeAte: number | null; externo: boolean };

/** Gestor de uma pessoa: responsável da área dela; se ela é a responsável, o responsável da área-mãe. */
export function gestorDe(p: PessoaH, areas: AreaH[]): string | null {
  let area = areas.find((a) => a.id === p.areaId);
  while (area) {
    if (area.responsavelId && area.responsavelId !== p.id) return area.responsavelId;
    area = areas.find((a) => a.id === area!.parentId);
  }
  return null;
}

/** Áreas que uma pessoa é responsável + todas as subáreas abaixo delas. */
export function areasSobGestao(pessoaId: string, areas: AreaH[]): string[] {
  const raiz = areas.filter((a) => a.responsavelId === pessoaId).map((a) => a.id);
  const res = new Set(raiz);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const a of areas) if (a.parentId && res.has(a.parentId) && !res.has(a.id)) { res.add(a.id); mudou = true; }
  }
  return [...res];
}

/** Time direto: quem tem esta pessoa como gestor. */
export function timeDireto<P extends PessoaH>(gestorId: string, pessoas: P[], areas: AreaH[]): P[] {
  return pessoas.filter((p) => p.id !== gestorId && !p.externo && gestorDe(p, areas) === gestorId);
}

/** Abreviação usada nos cards: "Luiza P.", "Carlos A." */
export function nomeCurto(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1][0]}.` : partes[0];
}

export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0];
}

export function iniciais(nome: string) {
  return nome.trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
}

type Trat = 'f' | 'm' | 'n';

/** Rótulos com gênero só quando a pessoa informou o tratamento; senão, forma neutra. */
export function rotuloPerfil(perfil: string, t: Trat): string {
  const g = (f: string, m: string, n: string) => (t === 'f' ? f : t === 'm' ? m : n);
  switch (perfil) {
    case 'pmo': return 'PMO';
    case 'admin': return 'Admin';
    case 'gestor': return g('Gestora de área', 'Gestor de área', 'Gestor(a) de área');
    case 'gp': return 'Gerente de projeto';
    case 'colaborador': return g('Colaboradora', 'Colaborador', 'Colaborador(a)');
    case 'patrocinador': return g('Patrocinadora', 'Patrocinador', 'Patrocinador(a)');
    default: return perfil;
  }
}

export function rotuloGestorCurto(t: Trat) {
  return t === 'f' ? 'Gestora' : t === 'm' ? 'Gestor' : 'Gestor(a)';
}

export function rotuloAtivo(status: string, t: Trat) {
  if (status === 'convite') return 'Aguardando 1º acesso';
  if (status === 'inativo') return t === 'f' ? 'Desativada' : t === 'm' ? 'Desativado' : 'Desativado(a)';
  return t === 'f' ? 'Ativa' : t === 'm' ? 'Ativo' : 'Ativo(a)';
}

export function rotuloAdministrador(t: Trat) {
  return t === 'f' ? 'Administradora' : t === 'm' ? 'Administrador' : 'Administrador(a)';
}

/** Pessoa acima do cedido: alocação atual maior que o limite (externos não têm limite). */
export function acimaDoCedido(alocacao: number, cedeAte: number | null, externo = false) {
  if (externo || cedeAte == null) return false;
  return alocacao > cedeAte;
}

/** A área e todas as que estão abaixo dela. */
export function subarvore(areaId: string, areas: AreaH[]): string[] {
  const res = new Set([areaId]);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const a of areas) if (a.parentId && res.has(a.parentId) && !res.has(a.id)) { res.add(a.id); mudou = true; }
  }
  return [...res];
}

/** Patrocinador escolhido numa iniciativa: precisa ser uma pessoa cadastrada da empresa com o perfil Patrocinador. */
export function patrocinadorValido(p: { externo: boolean; perfis: string[] } | undefined | null): boolean {
  return !!p && !p.externo && p.perfis.includes('patrocinador');
}

/** Pessoa desativada (saiu da empresa): não entra no sistema e não aparece para novas escolhas. */
export function acessoBloqueado(p: { status: string; externo: boolean }) {
  return p.externo || p.status === 'inativo';
}

/** Status ao reativar: quem nunca entrou volta a "aguardando 1º acesso". */
export function statusAoReativar(p: { authUserId: string | null }) {
  return p.authUserId ? 'ativo' : 'convite';
}

/** Frases com o que fica pendente quando uma pessoa é desativada (para o admin repassar antes). */
export function pendenciasAoDesativar(c: { projetosGp: string[]; areasResponsavel: string[]; tarefasAbertas: number; aprovacoesPendentes: number }): string[] {
  const r: string[] = [];
  if (c.projetosGp.length) r.push(`GP de ${c.projetosGp.length === 1 ? 'um projeto' : `${c.projetosGp.length} projetos`} em andamento (${c.projetosGp.join(', ')}): troque o GP na página do projeto.`);
  if (c.areasResponsavel.length) r.push(`Responsável por ${c.areasResponsavel.join(', ')}: indique outra pessoa em Áreas e hierarquia.`);
  if (c.aprovacoesPendentes) r.push(`${c.aprovacoesPendentes} ${c.aprovacoesPendentes === 1 ? 'iniciativa aguardando' : 'iniciativas aguardando'} a aprovação dela.`);
  if (c.tarefasAbertas) r.push(`${c.tarefasAbertas} ${c.tarefasAbertas === 1 ? 'tarefa aberta' : 'tarefas abertas'} em projetos.`);
  return r;
}

/** Novo gerente de um projeto: pessoa interna com acesso (não desativada). */
export function podeSerGp(p: { externo: boolean; status: string } | undefined | null): boolean {
  return !!p && !p.externo && p.status !== 'inativo';
}
