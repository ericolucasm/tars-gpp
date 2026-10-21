import { s } from '@/lib/css';
import { dataPorExtenso, saudacao } from '@/lib/regras/datas';
import { primeiroNome } from '@/lib/regras/pessoas';

export function Saudacao({ nome, hoje, texto }: { nome: string; hoje: string; texto: string }) {
  return (
    <div style={s('display: flex; flex-direction: column; gap: 4px')}>
      <span style={s('font-size: 12px; color: #5E5770')}>{dataPorExtenso(hoje)}</span>
      <h1 style={s('margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.3px')}>{saudacao()}, {primeiroNome(nome)}</h1>
      <p style={s('margin: 0; font-size: 14px; color: #5E5770')}>{texto}</p>
    </div>
  );
}

export function frase(partes: string[]) {
  const p = partes.filter(Boolean);
  if (!p.length) return '';
  const t = p.length === 1 ? p[0] : `${p.slice(0, -1).join(', ')} e ${p[p.length - 1]}`;
  return t.charAt(0).toUpperCase() + t.slice(1) + '.';
}
