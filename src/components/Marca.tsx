import { s } from '@/lib/css';

export function Marca() {
  return (
    <div style={s('display: flex; align-items: center; gap: 10px')}>
      <div style={s('width: 36px; height: 36px; border-radius: 10px; background: #6D4AFF; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 17px')}>T</div>
      <div style={s('display: flex; flex-direction: column')}><span style={s('font-weight: 700; font-size: 17px')}>TARS GPP</span><span style={s('font-size: 12px; color: #5E5770')}>Gestão de Portfólios e Projetos</span></div>
    </div>
  );
}

export const sTelaAuth = s("font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif; color: #26213A; background: #FBFAF7; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 16px; box-sizing: border-box");
export const sCartaoAuth = s('width: 420px; max-width: 100%; background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 28px; display: flex; flex-direction: column; gap: 18px');
export const sCampo = s('height: 44px; padding: 0 12px; border-radius: 10px; border: 1px solid #E2DCD0; font-size: 14px; font-weight: 400; color: #26213A; background: #FFFFFF');
export const sRotulo = s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600');
export const sBotao = s('height: 44px; padding: 0 20px; border-radius: 10px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 14px');
