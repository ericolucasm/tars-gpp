// Substituto do gestor: durante o período, quem decide pelo gestor (aprovações, pedidos de alocação, time) é o substituto.

export type DelegacaoR = { gestorId: string; substitutoId: string; inicio: string; fim: string }; // fim inclusive

/** Substituto em vigor hoje para o gestor (o mais recente, se houver mais de um), ou null. */
export function substitutoAtivo(delegs: DelegacaoR[], gestorId: string, hoje: string): string | null {
  const ativas = delegs.filter((x) => x.gestorId === gestorId && x.inicio <= hoje && x.fim >= hoje);
  return ativas.length ? ativas[ativas.length - 1].substitutoId : null;
}

/** Quem decide hoje pelo gestor: o substituto em vigor ou o próprio gestor. */
export function quemDecide(delegs: DelegacaoR[], gestorId: string, hoje: string) {
  return substitutoAtivo(delegs, gestorId, hoje) ?? gestorId;
}

/**
 * Gestores pelos quais a pessoa pode decidir hoje: ela mesma + quem a escolheu como substituto.
 * O gestor que delegou continua podendo decidir (se voltar antes, não fica travado); a cobrança de prazo é que passa ao substituto.
 */
export function gestoresRepresentados(delegs: DelegacaoR[], pessoaId: string, hoje: string): string[] {
  const res = [pessoaId];
  for (const x of delegs) if (x.substitutoId === pessoaId && x.inicio <= hoje && x.fim >= hoje && !res.includes(x.gestorId) && substitutoAtivo(delegs, x.gestorId, hoje) === pessoaId) res.push(x.gestorId);
  return res;
}

export function validarDelegacao(x: { substitutoId: string; inicio: string; fim: string }, gestorId: string, hoje: string, podeSubstituir: (id: string) => boolean): string | null {
  if (!x.substitutoId || !podeSubstituir(x.substitutoId)) return 'Escolha um substituto com perfil de gestor.';
  if (x.substitutoId === gestorId) return 'O substituto precisa ser outra pessoa.';
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(x.inicio) || !iso.test(x.fim)) return 'Informe o início e o fim.';
  if (x.fim < x.inicio) return 'O fim precisa ser no mesmo dia ou depois do início.';
  if (x.fim < hoje) return 'O período já terminou.';
  return null;
}
