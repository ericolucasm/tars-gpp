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
export function timeDireto(gestorId: string, pessoas: PessoaH[], areas: AreaH[]) {
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
  if (status === 'convite') return 'Convite enviado';
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
