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
    if (t === TITULO) {
      const medir = p.getByRole('group', { name: 'Como vamos medir' });
      await medir.getByLabel('Indicador').fill('Pedidos expedidos com atraso por semana');
      await medir.getByLabel('Meta').fill('Menos de 5');
      await medir.getByLabel('Medir em').fill(new Date(Date.now() - 86400000).toISOString().slice(0, 10)); // ontem: já é hora de medir
    }
    await p.getByRole('button', { name: 'Enviar para aprovação' }).click();
    await p.getByText('Iniciativa enviada para aprovação').waitFor();
  }
  ok('Colaborador valida obrigatórios e envia 2 iniciativas (uma com indicador e meta de benefício)');
  await p.context().close();

  // 2. Fernanda aprova uma e devolve a outra
  p = await como('fernanda.oliveira@acme.com.br');
  await ir(p, '/area');
  await p.waitForURL(/\/area\/iniciativas$/); // endereço antigo leva para Iniciativas da área
  let card = p.locator('#aprovacoes > div').filter({ hasText: TITULO }).first();
  await card.getByRole('button', { name: TITULO, exact: true }).click(); // gestora abre o detalhe antes de decidir
  await card.getByRole('region', { name: `Detalhes de ${TITULO}` }).getByText('Hoje não temos visibilidade dos atrasos da expedição.').waitFor();
  await card.getByRole('button', { name: 'Aprovar e enviar ao PMO' }).click();
  await p.getByText(`“${TITULO}” aprovada e enviada ao PMO.`).waitFor();
  card = p.locator('#aprovacoes > div').filter({ hasText: TITULO2 }).first();
  await card.getByRole('button', { name: 'Devolver para ajuste' }).click();
  await card.getByPlaceholder('Detalhe o custo estimado e quem mais é impactado.').fill('Informe quantas pessoas serão treinadas.');
  await card.getByRole('button', { name: 'Devolver ao solicitante' }).click();
  await p.getByText(`“${TITULO2}” devolvida para João Silva ajustar.`).waitFor();
  ok('Gestora abre o detalhe, aprova uma iniciativa e devolve a outra com comentário');
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

  // 4a. PMO clica no número do painel do ciclo, chega na Avaliação filtrada e abre o detalhe
  p = await como('mariana@acme.com.br', 'pmo');
  await ir(p, '/inicio');
  await p.getByRole('link', { name: /^Prontas para avaliar: \d+\. Ver na avaliação$/ }).click();
  await p.waitForURL(/\/avaliacao\?ciclo=.+&status=prontas/);
  await p.getByRole('button', { name: TITULO, exact: true }).click();
  const det = p.getByRole('region', { name: `Detalhes de ${TITULO}` });
  await det.getByText('Hoje não temos visibilidade dos atrasos da expedição.').waitFor();
  await det.getByText('João Silva', { exact: false }).first().waitFor();
  await p.getByLabel('Status').selectOption('recebidas');
  await p.waitForURL(/status=recebidas/);
  await p.getByRole('button', { name: TITULO2, exact: true }).waitFor();
  ok('PMO clica em "Prontas para avaliar" no painel, abre o detalhe e filtra por status');

  // 4. PMO avalia e comunica
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
  await p.getByRole('region', { name: 'Capacidade das áreas impactadas' }).getByRole('note', { name: 'Capacidade de TI' }).waitFor(); // Migração do ERP pré-aprovada impacta TI
  await p.getByRole('button', { name: 'Comunicar decisões às áreas' }).click();
  await p.getByText(/Decisões enviadas: \d+ pré-aprovadas/).waitFor();
  ok('PMO dá notas, decide (pré-aprovar, backlog, recusar), vê a capacidade das áreas impactadas e comunica');

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
  await p.getByLabel('Novo risco').fill('Dados da expedição incompletos');
  await p.getByLabel('Probabilidade').last().selectOption({ label: 'Alta' });
  await p.getByLabel('Impacto').last().selectOption({ label: 'Alto' });
  await p.getByLabel('Plano de resposta').last().fill('Validar a base com o time da expedição na 1ª semana');
  await p.getByRole('button', { name: 'Adicionar risco' }).click();
  const risco = p.getByRole('group', { name: 'Risco Dados da expedição incompletos' });
  await risco.getByText('Alto', { exact: true }).waitFor();
  await risco.getByText('Probabilidade alta · impacto alto').waitFor();
  await risco.getByLabel('Status do risco Dados da expedição incompletos').selectOption({ label: 'Mitigado' });
  await p.waitForTimeout(800);
  if ((await risco.getByLabel('Status do risco Dados da expedição incompletos').inputValue()) !== 'mitigado') throw new Error('Status do risco não mudou');
  ok('GP cadastra risco com probabilidade, impacto e plano, e marca como mitigado');
  await p.getByLabel('O que avançou?').fill('Projeto iniciado e linha de base congelada.');
  await p.getByRole('button', { name: 'Publicar status' }).click();
  await p.getByText('Status publicado e enviado ao patrocinador e ao PMO.').waitFor();
  ok('GP publica o status do projeto');
  // GP escala um impedimento ao PMO
  await p.getByRole('button', { name: 'Abrir ponto de atenção' }).click();
  await p.getByLabel('Em poucas palavras').fill('Fornecedor não liberou o ambiente de testes');
  await p.getByLabel('Detalhes e o que você precisa').fill('Precisamos que o PMO acione o contrato.');
  await p.getByRole('button', { name: 'Enviar' }).click();
  await p.getByText('Ponto de atenção enviado ao PMO.').waitFor();
  ok('GP abre um ponto de atenção (impedimento) para o PMO');
  await p.getByRole('button', { name: 'Pedir mudança de escopo ou custo' }).click();
  await p.getByRole('button', { name: 'Custo', exact: true }).click();
  await p.getByLabel('O que muda').fill('Licenças adicionais do painel');
  await p.getByLabel('Novo orçamento total do projeto (R$)').fill('95000');
  await p.getByRole('button', { name: 'Enviar ao PMO' }).click();
  await p.getByText('Pedido de mudança de custo enviado ao PMO.').waitFor();
  ok('GP pede mudança de custo ao PMO');
  const fin = p.getByRole('region', { name: 'Financeiro' });
  await fin.getByLabel('Descrição').fill('Fatura do fornecedor de BI');
  await fin.getByLabel('Valor (R$)').fill('30000');
  await fin.getByRole('button', { name: 'Lançar' }).click();
  await fin.getByText('Custo lançado.').waitFor();
  await fin.getByLabel('Previsão de custo total (R$)').fill('120000');
  await fin.getByRole('button', { name: 'Atualizar previsão' }).click();
  await fin.getByText('Previsão de custo atualizada.').waitFor();
  ok('GP lança custo realizado e atualiza a previsão de custo');
  await p.context().close();

  // 7. PMO aprova a mudança de linha de base
  p = await como('mariana@acme.com.br', 'pmo');
  await ir(p, '/inicio');
  await p.getByText('Pedido para alterar linha de base').click();
  await p.getByRole('button', { name: 'Aprovar mudança' }).click();
  await p.getByText('Mudança aprovada. A nova linha de base vale a partir de agora.').waitFor();
  ok('PMO vê o pedido na tela inicial e aprova a mudança');
  const urlProjeto = p.url();
  await ir(p, '/inicio');
  await p.getByText('Ponto de atenção esperando por você').click();
  await p.waitForURL(/\/pontos$/);
  const ponto = p.getByRole('article', { name: 'Fornecedor não liberou o ambiente de testes' });
  await ponto.getByLabel('O que foi decidido ou feito?').fill('Contrato acionado; ambiente liberado até quarta.');
  await ponto.getByRole('button', { name: 'Registrar resolução' }).click();
  await p.getByRole('region', { name: 'Resolvidos recentemente' }).getByText('Contrato acionado; ambiente liberado até quarta.').waitFor();
  ok('PMO vê o ponto de atenção na Início e registra a resolução');
  await ir(p, '/inicio');
  await p.getByText('Benefício para medir').click();
  await p.waitForURL(/\/beneficios$/);
  const ben = p.getByRole('article', { name: `Benefício de ${TITULO}` });
  await ben.getByRole('button', { name: 'Registrar resultado' }).click();
  await ben.getByLabel(/Resultado medido/).fill('3 por semana');
  await ben.getByRole('button', { name: 'Atingida', exact: true }).click();
  await ben.getByRole('button', { name: 'Salvar resultado' }).click();
  await p.getByRole('region', { name: 'Resultados registrados' }).getByText('3 por semana', { exact: false }).waitFor();
  ok('PMO vê "Benefício para medir" na Início e registra o resultado (meta atingida)');
  await p.goto(urlProjeto, { waitUntil: 'networkidle' });
  const pedidoCusto = p.getByRole('article', { name: /Mudança de custo: Licenças adicionais do painel/ });
  await pedidoCusto.getByRole('button', { name: 'Aprovar pedido' }).click();
  await p.getByRole('region', { name: 'Mudanças de escopo e custo' }).getByText('R$ 95.000', { exact: true }).waitFor();
  ok('PMO aprova a mudança de custo e o orçamento aprovado do projeto muda');
  await p.getByRole('region', { name: 'Financeiro' }).getByText('Estouro de orçamento').waitFor(); // previsão 120 mil > 110% de 95 mil
  await p.getByRole('listitem', { name: /^Custo: Crítico · previsão 26% acima do orçado/ }).waitFor(); // farol por dimensão
  await ir(p, '/inicio');
  await p.getByText('Projeto estourando o orçamento').waitFor();
  await p.goto(urlProjeto, { waitUntil: 'networkidle' });
  ok('Previsão acima do orçamento: estouro no financeiro, farol de custo crítico e aviso na Início do PMO');

  // 7b. PMO reordena as fases da linha do tempo (seta e arraste); a ordem fica gravada
  const ordemFases = async () => (await p.getByRole('button', { name: /^Subir fase / }).evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label').replace('Subir fase ', ''))));
  const antes = await ordemFases();
  await p.getByRole('button', { name: `Descer fase ${antes[0]}` }).click();
  await p.waitForTimeout(1200);
  await p.reload({ waitUntil: 'networkidle' });
  let depois = await ordemFases();
  if (depois[0] !== antes[1] || depois[1] !== antes[0]) throw new Error(`Seta não reordenou: ${depois.join(', ')}`);
  const alca = p.getByRole('img', { name: `Arrastar ${antes[0]} para cima ou para baixo` });
  const bx = await alca.boundingBox();
  await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2);
  await p.mouse.down();
  await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2 - 53, { steps: 8 });
  await p.mouse.up();
  await p.waitForTimeout(1200);
  await p.reload({ waitUntil: 'networkidle' });
  depois = await ordemFases();
  if (depois.join() !== antes.join()) throw new Error(`Arraste não reordenou: ${depois.join(', ')}`);
  ok('PMO reordena as fases da linha do tempo pela seta e pelo arraste');
  await p.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'Roadmap' }).click();
  await p.waitForURL(/\/roadmap$/);
  await p.getByRole('row', { name: TITULO }).waitFor();
  await p.getByLabel('Etapa').selectOption({ label: 'Pré-projetos' });
  await p.waitForURL(/r\.roadmap\.etapa=pre/);
  if (await p.getByRole('row', { name: TITULO }).count()) throw new Error('Filtro de etapa do roadmap não aplicou');
  ok('PMO abre o roadmap do portfólio e filtra por etapa');
  await p.context().close();

  // 8. Fernanda navega pelos três menus da área e responde o pedido de alocação do Diego
  p = await como('fernanda.oliveira@acme.com.br');
  await ir(p, '/inicio');
  await p.getByRole('link', { name: 'Projetos da área' }).first().click();
  await p.waitForURL(/\/area\/projetos$/);
  const projArea = p.getByRole('region', { name: 'Projetos da área' });
  await projArea.getByRole('button', { name: TITULO, exact: true }).click();
  const detProj = projArea.getByRole('region', { name: `Detalhes de ${TITULO}` });
  await detProj.getByText('Andamento do projeto').waitFor();
  await detProj.getByText('Gerente do projeto').waitFor();
  await p.getByRole('link', { name: 'Iniciativas da área' }).click();
  await p.waitForURL(/\/area\/iniciativas$/);
  await p.getByRole('region', { name: 'Aprovações pendentes' }).waitFor();
  await p.getByRole('link', { name: 'Gestão do time' }).click();
  await p.waitForURL(/\/area\/time$/);
  if (await p.getByRole('region', { name: 'Aprovações pendentes' }).count()) throw new Error('Gestão do time não deveria mostrar aprovações');
  await ir(p, '/area#capacidade'); // aviso antigo leva para Gestão do time
  await p.waitForURL(/\/area\/time$/);
  ok('Gestora navega pelos três menus da área e abre o detalhe de um projeto');
  const ped = p.locator('#capacidade > div').filter({ hasText: 'Diego Santos' }).first();
  await ped.getByRole('button', { name: /Ceder \+10%/ }).click();
  await p.getByText(/Você cedeu \+10% de Diego Santos/).waitFor();
  ok('Gestora cede capacidade pedida pelo GP');
  await p.context().close();

  // 9. Admin: ver como + cadastros
  p = await como('mariana@acme.com.br', 'pmo');
  await ir(p, '/inicio');
  const verComo = p.getByLabel('Admin · ver como');
  await verComo.selectOption({ label: 'Fernanda Oliveira · Logística' });
  await p.getByRole('heading', { name: /Fernanda/ }).waitFor();
  await p.getByRole('link', { name: 'Iniciativas da área' }).waitFor(); // menu de gestora, como a Fernanda vê
  ok('Admin escolhe a Fernanda no "ver como" e vê o app como ela');
  await verComo.selectOption({ label: 'Mariana · PMO (você)' });
  await p.getByRole('heading', { name: /Mariana/ }).waitFor();

  // Ao clicar num menu, a barra de carregamento aparece na hora e some quando a tela nova chega
  await p.route('**/portfolio*', async (r) => { await new Promise((ok) => setTimeout(ok, 1500)); await r.continue(); });
  await p.getByRole('link', { name: 'Portfólio' }).click();
  await p.getByRole('progressbar', { name: 'Carregando' }).waitFor({ timeout: 1000 });
  await p.waitForURL(/\/portfolio$/);
  await p.getByRole('progressbar', { name: 'Carregando' }).waitFor({ state: 'detached' });
  await p.unroute('**/portfolio*');
  ok('Ao clicar num menu, a barra de carregamento aparece na hora e some quando a tela chega');
  await ir(p, '/cadastros?aba=criterios');
  await p.getByLabel('Peso de Impacto').fill('40');
  await p.getByText('Total 105% · precisa somar 100%').waitFor();
  ok('Cadastros: soma de pesos é validada');
  await p.context().close();

  // Relatórios: cada perfil chega pelo menu e vê os relatórios dele
  const relatoriosPorPerfil = [
    ['mariana@acme.com.br', 'pmo', ['Portfólio por etapa', 'Saúde dos projetos', 'Financeiro dos projetos', 'Matriz de riscos', 'Riscos do portfólio', 'Ciclos de planejamento', 'Demanda por área', 'Benefícios', 'Capacidade por área e mês', 'Capacidade das pessoas']],
    ['fernanda.oliveira@acme.com.br', null, ['Iniciativas da área', 'Projetos da área', 'Capacidade por área e mês', 'Alocação do time']],
    ['carlos.andrade@acme.com.br', null, ['Meus projetos', 'Financeiro dos projetos', 'Riscos dos meus projetos', 'Tarefas em aberto', 'Equipe dos meus projetos']],
    ['joao.silva@acme.com.br', null, ['Minhas iniciativas', 'Minhas tarefas']],
  ];
  for (const [email, perfil, titulos] of relatoriosPorPerfil) {
    p = await como(email, perfil);
    await ir(p, '/inicio');
    await p.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'Relatórios' }).click();
    await p.waitForURL(/\/relatorios$/);
    for (const t of titulos) await p.getByRole('heading', { name: t, level: 2, exact: true }).waitFor();
    if (perfil === 'pmo') {
      // filtro: só projetos críticos; o resumo e a tabela seguem o filtro, e "Limpar filtros" volta ao todo
      const saude = p.getByRole('region', { name: 'Saúde dos projetos' });
      await saude.getByLabel('Farol').selectOption({ label: 'Crítico' });
      await p.waitForURL(/r\.saude\.farol=crit/);
      await saude.locator('tbody tr').first().waitFor();
      const farois = await saude.locator('tbody tr > :nth-child(5)').allInnerTexts();
      if (!farois.length || farois.some((f) => f.trim() !== 'Crítico')) throw new Error(`Filtro de farol não aplicou: ${farois.join(', ')}`);
      await saude.getByRole('button', { name: 'Limpar filtros' }).click();
      await p.waitForURL((u) => !u.search.includes('r.saude.farol'));
    }
    if (email.startsWith('carlos')) {
      const tarefas = p.getByRole('region', { name: 'Tarefas em aberto' });
      await tarefas.getByLabel('Situação').selectOption({ label: 'Atrasadas' });
      await p.waitForURL(/r\.tarefas\.situacao=atrasada/);
      const sit = await tarefas.locator('tbody tr td:last-child').allInnerTexts();
      if (sit.some((x) => x.trim() !== 'Atrasada' && !x.includes('Nenhuma tarefa'))) throw new Error(`Filtro de tarefas não aplicou: ${sit.join(', ')}`);
    }
    await p.context().close();
  }
  ok('Relatórios: os quatro perfis abrem pelo menu; PMO e GP filtram (farol, tarefas atrasadas) e limpam os filtros');
} catch (e) {
  console.error('✗ FALHOU no passo', passo + 1, '\n', e.message.split('\n').slice(0, 6).join('\n'));
  process.exitCode = 1;
  if (ultima) await ultima.screenshot({ path: 'falha.png', fullPage: true }).catch(() => {});
} finally {
  if (erros.length) console.log('Erros de página:', erros.slice(0, 5));
  await browser.close();
}
