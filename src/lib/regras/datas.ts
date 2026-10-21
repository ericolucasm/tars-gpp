// Datas sempre como string ISO "AAAA-MM-DD" (sem fuso) para evitar surpresas de timezone.

const DIA = 86400000;

export function hojeISO(): string {
  if (process.env.TARS_HOJE) return process.env.TARS_HOJE;
  // Data de hoje no fuso de São Paulo
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function toUTC(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDias(iso: string, dias: number): string {
  return new Date(toUTC(iso) + dias * DIA).toISOString().slice(0, 10);
}

export function diffDias(a: string, b: string): number {
  return Math.round((toUTC(a) - toUTC(b)) / DIA);
}

export function br(iso?: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function brCurto(iso?: string | null): string {
  return br(iso).slice(0, 5);
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function diaSemana(iso: string) {
  return new Date(toUTC(iso)).getUTCDay();
}

/** "Sábado, 17 de outubro" */
export function dataPorExtenso(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${DIAS[diaSemana(iso)]}, ${d} de ${MESES[m - 1]}`;
}

/** "Seg 19" */
export function diaCurto(iso: string): string {
  return `${DIAS_CURTOS[diaSemana(iso)]} ${Number(iso.slice(8, 10))}`;
}

export function nomeMes(iso: string): string {
  return MESES[Number(iso.slice(5, 7)) - 1];
}

export function mesCurto(iso: string): string {
  return MESES_CURTOS[Number(iso.slice(5, 7)) - 1];
}

/** "hoje", "ontem", "há 3 dias" */
export function haQuanto(iso: string | null | undefined, hoje: string): string {
  if (!iso) return '';
  const d = diffDias(hoje, iso.slice(0, 10));
  if (d <= 0) return 'hoje';
  if (d === 1) return 'ontem';
  return `há ${d} dias`;
}

/** "há 1 dia", "há 5 dias" (para esperas: nunca "ontem") */
export function haDias(iso: string | null | undefined, hoje: string): string {
  if (!iso) return '';
  const d = Math.max(0, diffDias(hoje, iso.slice(0, 10)));
  if (d === 0) return 'hoje';
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
}

export function saudacao(): string {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }).format(new Date()));
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Segunda-feira da semana de uma data */
export function segundaDaSemana(iso: string): string {
  const dow = diaSemana(iso);
  return addDias(iso, dow === 0 ? -6 : 1 - dow);
}

/** Próxima sexta (ou hoje, se for sexta) */
export function proximaSexta(iso: string): string {
  const dow = diaSemana(iso);
  return addDias(iso, (5 - dow + 7) % 7);
}

export function dinheiro(v: number): string {
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}
