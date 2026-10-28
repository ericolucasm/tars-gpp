// Teste ponta a ponta do fluxo completo, pela interface, alternando entre personas.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const BASE = 'http://localhost:3000';
const sql = (q) => execSync(`psql -At postgresql://tars:tars@localhost:5432/tars -c "${q}"`).toString().trim();
const idDe = (email) => sql(`select id from pessoas where email='${email}'`);
const browser = await chromium.launch();
const erros = [];
let passo = 0;
const ok = (msg) => console.log(`✓ ${++passo}. ${msg}`);

async function como(email, perfil) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const ck = [{ name: 'tars_dev', value: idDe(email), domain: 'localhost', path: '/' }];
  if (perfil) ck.push({ name: 'tars_ver', value: perfil, domain: 'localhost', path: '/' });
  await ctx.addCookies(ck);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => erros.push(`${email}: ${e.message}`));
  page.setDefaultTimeout(30000);
  ultima = page;
  return page;
}
let ultima = null;
const ir = (page, path) => page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 90000 });
const TITULO = 'Painel de indicadores da expedição';
const TITULO2 = 'Treinamento de empilhadeiristas';

try {
  // 1. João envia duas iniciativas
  let p = await como('joao.silva@acme.com.br');
  for (const t of [TITULO, TITULO2]) {
    await ir(p, '/iniciativas/nova');
    await p.getByRole('button', { name: 'Enviar para aprovação' }).click();
    await p.getByText('Preencha os campos obrigatórios marcados acima.').waitFor();
    await p.getByPlaceholder('Reduzir o tempo de separação de pedidos').fill(t);
    await p.getByPlaceholder(/A separação de um pedido leva/).fill('Hoje não temos visibilidade dos atrasos da expedição.');
    await p.getByRole('button', { name: /Melhoria/ }).click();
    await p.getByRole('button', { name: 'Enviar para aprovação' }).click();
    await p.getByText('Iniciativa enviada para aprovação').waitFor();
  }
  ok('Colaborador valida obrigatórios e envia 2 iniciativas');
  await p.context().close();

  // 2. Fernanda aprova uma e devolve a outra
  p = await como('fernanda.oliveira@acme.com.br');
  await ir(p, '/area');
  let card = p.locator('#aprovacoes > div').filter({ hasText: TITULO }).first();
  await card.getByRole('button', { name: 'Aprovar e enviar ao PMO' }).click();
  await p.getByText(`“${TITULO}” aprovada e enviada ao PMO.`).waitFor();
  card = p.locator('#aprovacoes > div').filter({ hasText: TITULO2 }).first();
  await card.getByRole('button', { name: 'Devolver para ajuste' }).click();
  await card.getByPlaceholder('Detalhe o custo estimado e quem mais é impactado.').fill('Informe quantas pessoas serão treinadas.');
  await card.getByRole('button', { name: 'Devolver ao solicitante' }).click();
  await p.getByText(`“${TITULO2}” devolvida para João Silva ajustar.`).waitFor();
  ok('Gestora aprova uma iniciativa e devolve a outra com comentário');
  await p.context().close();

  // 3. João vê a devolução e reenvia
  p = await como('joao.silva@acme.com.br');
  await ir(p, '/inicio');
  await p.getByText('Informe quantas pessoas serão treinadas.').waitFor();
  const blocoDev = p.locator('div').filter({ hasText: TITULO2 }).filter({ has: p.getByRole('link', { name: 'Ajustar e reenviar' }) }).last();
  await blocoDev.getByRole('link', { name: 'Ajustar e reenviar' }).click();
  await p.getByText('pediu ajuste').waitFor();
  await p.getByRole('button', { name: 'Reenviar para aprovação' }).click();
  await p.getByText('Iniciativa enviada para aprovação').waitFor();
  ok('Colaborador vê o comentário, ajusta e reenvia');
  await p.context().close();

  // 4. PMO avalia e comunica
  p = await como('mariana@acme.com.br', 'pmo');
  await ir(p, '/avaliacao');
  await p.getByText(TITULO).waitFor();
  await p.getByRole('button', { name: 'Comunicar decisões às áreas' }).click();
  await p.getByText(/Decida todas antes de comunicar/).waitFor();
  for (const [i, n] of [[0, 5], [1, 4], [2, 4], [3, 3]]) {
    await p.getByRole('button', { name: `${['Impacto', 'Urgência', 'Alinhamento', 'Facilidade'][i]} ${n} de 5 para ${TITULO}` }).click();
  }
  await p.waitForTimeout(800);
  const botoesPre = p.getByRole('button', { name: 'Pré-aprovar' });
  const total = await botoesPre.count();
  for (let k = 0; k < total; k++) {
    const pre = botoesPre.nth(k);
    const l = pre.locator('xpath=ancestor::div[2]');
    const texto = await l.innerText();
    if ((await pre.getAttribute('aria-pressed')) === 'true') continue;
    if (texto.includes('Programa de liderança')) await l.getByRole('button', { name: 'Recusar' }).click();
    else if (texto.includes('Novo layout')) await l.getByRole('button', { name: 'Backlog' }).click();
    else await pre.click();
    await p.waitForTimeout(500);
  }
  await p.waitForTimeout(1200);
  await p.getByRole('button', { name: 'Comunicar decisões às áreas' }).click();
  await p.getByText(/Decisões enviadas: \d+ pré-aprovadas/).waitFor();
  ok('PMO dá notas, decide (pré-aprovar, backlog, recusar) e comunica');

  // 5. Play no portfólio
  await ir(p, '/portfolio');
  const cardPre = p.locator('section[aria-label="Pré-projeto"] article').filter({ hasText: TITULO });
  await cardPre.getByRole('button', { name: 'Dar play' }).click();
  await p.getByRole('dialog').getByRole('button', { name: 'Dar play' }).click();
  await p.getByText('Faltam 5 critérios para avançar.').waitFor();
  const dlg = p.getByRole('dialog');
  const caixas = dlg.locator('input[type=checkbox]');
  for (let k = 0; k < await caixas.count(); k++) await caixas.nth(k).check();
  await dlg.locator('select').first().selectOption({ label: 'Carlos Andrade' });
  await dlg.getByRole('button', { name: 'Dar play' }).click();
  await p.locator('section[aria-label="Em execução"] article').filter({ hasText: TITULO }).waitFor();
  ok('Gate do play bloqueia sem critérios e cria o projeto com GP, modelo e início');

  // 5b. Pausar exige motivo e critérios
  const cardExe = p.locator('section[aria-label="Em execução"] article').filter({ hasText: TITULO });
  await cardExe.getByRole('button', { name: 'Pausar' }).click();
  await p.getByRole('dialog').getByRole('button', { name: 'Pausar' }).click();
  await p.getByText('Faltam 2 critérios para avançar.').waitFor();
  await p.getByRole('dialog').getByRole('button', { name: 'Voltar' }).click();
  ok('Gate de pausa bloqueia sem critérios');
  await p.context().close();

  // 6. GP congela a linha de base, muda o plano e pede aprovação
  const projId = sql(`select id from iniciativas where titulo='${TITULO}'`);
  p = await como('carlos.andrade@acme.com.br');
  await ir(p, `/projetos/${projId}`);
  await p.getByRole('button', { name: 'Congelar linha de base' }).click();
  await p.getByText('Linha de base congelada. Mudanças agora geram desvio.').first().waitFor();
  const barra = p.locator('div[style*="grab"]').last();
  const box = await barra.boundingBox();
  await p.mouse.move(box.x + 10, box.y + box.height / 2);
  await p.mouse.down();
  await p.mouse.move(box.x + 75, box.y + box.height / 2, { steps: 8 });
  await p.mouse.up();
  await p.waitForTimeout(1500);
  await p.getByText('+2 sem.').waitFor();
  await p.getByRole('button', { name: 'Atualizar linha de base' }).click();
  await p.getByText(/Pedido enviado ao PMO: \+2 semanas em Encerramento/).waitFor();
  ok('GP congela a linha de base, arrasta uma fase (+2 sem.) e pede mudança ao PMO');

  // 6b. tarefa e alocação acima do cedido gera pedido ao gestor
  await p.getByRole('tab', { name: 'Iniciação' }).click();
  await p.getByPlaceholder('Descreva a entrega').fill('Levantar indicadores atuais');
  await p.getByRole('button', { name: 'Adicionar' }).first().click();
  await p.getByText('Levantar indicadores atuais').waitFor();
  await p.getByLabel('Alocar pessoa').selectOption({ label: 'Diego Santos' });
  await p.getByRole('button', { name: 'Alocar 20%' }).click();
  await p.getByText(/Acima do cedido \(10%\)/).waitFor();
  ok('GP cadastra tarefa e alocação acima do cedido gera pedido ao gestor');
  await p.getByLabel('O que avançou?').fill('Projeto iniciado e linha de base congelada.');
  await p.getByRole('button', { name: 'Publicar status' }).click();
  await p.getByText('Status publicado e enviado ao patrocinador e ao PMO.').waitFor();
  ok('GP publica o status do projeto');
  await p.context().close();

  // 7. PMO aprova a mudança de linha de base
  p = await como('mariana@acme.com.br', 'pmo');
  await ir(p, '/inicio');
  await p.getByText('Pedido para alterar linha de base').click();
  await p.getByRole('button', { name: 'Aprovar mudança' }).click();
  await p.getByText('Mudança aprovada. A nova linha de base vale a partir de agora.').waitFor();
  ok('PMO vê o pedido na tela inicial e aprova a mudança');
  await p.context().close();

  // 8. Fernanda responde o pedido de alocação do Diego
  p = await como('fernanda.oliveira@acme.com.br');
  await ir(p, '/area');
  const ped = p.locator('#capacidade > div').filter({ hasText: 'Diego Santos' }).first();
  await ped.getByRole('button', { name: /Ceder \+10%/ }).click();
  await p.getByText(/Você cedeu \+10% de Diego Santos/).waitFor();
  ok('Gestora cede capacidade pedida pelo GP');
  await p.context().close();

  // 9. Admin: ver como + cadastros
  p = await como('mariana@acme.com.br', 'pmo');
  await ir(p, '/inicio');
  await p.getByRole('button', { name: 'Gestor de área' }).click();
  await p.locator('button[aria-pressed="true"]', { hasText: 'Gestor de área' }).waitFor();
  await p.getByRole('heading', { name: /Mariana/ }).waitFor(); // coringa: continua sendo a própria admin
  await p.locator('select').first().selectOption({ label: 'Fernanda Oliveira' });
  await p.getByRole('heading', { name: /Fernanda/ }).waitFor();
  ok('Admin vira gestor como ela mesma (coringa) e também pode escolher a Fernanda');
  await p.getByRole('button', { name: 'PMO' }).click();
  await p.getByRole('heading', { name: /Mariana/ }).waitFor();
  await ir(p, '/cadastros?aba=criterios');
  await p.getByLabel('Peso de Impacto').fill('40');
  await p.getByText('Total 105% · precisa somar 100%').waitFor();
  ok('Cadastros: soma de pesos é validada');
  await p.context().close();
} catch (e) {
  console.error('✗ FALHOU no passo', passo + 1, '\n', e.message.split('\n').slice(0, 6).join('\n'));
  process.exitCode = 1;
  if (ultima) await ultima.screenshot({ path: 'falha.png', fullPage: true }).catch(() => {});
} finally {
  if (erros.length) console.log('Erros de página:', erros.slice(0, 5));
  await browser.close();
}
