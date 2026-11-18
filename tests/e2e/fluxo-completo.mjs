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
      await p.getByLabel('Patrocinador', { exact: true }).selectOption({ label: 'Ricardo Moura · Diretor de operações' });
    }
    await p.getByRole('button', { name: 'Enviar para aprovação' }).click();
    await p.getByText('Iniciativa enviada para aprovação').waitFor();
  }
  if (sql(`select p.nome from iniciativas i join pessoas p on p.id=i.patrocinador_id where i.titulo='${TITULO}'`) !== 'Ricardo Moura') throw new Error('Patrocinador não gravado');
  ok('Colaborador valida obrigatórios e envia 2 iniciativas (uma com indicador e meta de benefício e patrocinador escolhido da lista)');
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
  const prio = p.getByRole('region', { name: 'Prioridade da área' });
  await prio.getByRole('button', { name: `Subir ${TITULO}` }).click();
  await p.getByText('Prioridade da área atualizada. O PMO vê essa ordem na Avaliação.').waitFor();
  ok('Gestora ordena a prioridade da área');
  const ETQ = 'Etiquetagem automática na expedição';
  card = p.locator('#aprovacoes > div').filter({ hasText: ETQ }).first();
  await card.getByRole('button', { name: 'Não seguir' }).click();
  await card.getByRole('button', { name: 'Confirmar: não seguir' }).click();
  await p.getByText('Escolha o motivo.').waitFor(); // sem motivo, o servidor recusa
  await card.getByLabel('Motivo').selectOption('Sobreposição com outra iniciativa');
  await card.getByLabel('Comentário para quem pediu').fill('Já está no escopo do projeto de roteirização.');
  await card.getByRole('button', { name: 'Confirmar: não seguir' }).click();
  await p.getByText(`“${ETQ}” arquivada. Bruno Reis vai ver o motivo.`).waitFor();
  await p.context().close();
  p = await como('bruno.reis@acme.com.br');
  await ir(p, '/inicio');
  await p.getByText(/decidiu não seguir · motivo: Sobreposição com outra iniciativa — Já está no escopo/).first().waitFor();
  ok('Gestora decide não seguir com uma iniciativa (motivo e comentário obrigatórios) e o solicitante vê o porquê');
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
  await p.getByText(/prioridade da área: \dª de \d+ para Fernanda/).first().waitFor();
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
  await p.getByRole('button', { name: 'Editar tarefa Levantar indicadores atuais' }).click();
  const edt = p.getByRole('group', { name: 'Editar tarefa Levantar indicadores atuais' });
  await edt.getByLabel('Tarefa').fill('Levantar indicadores atuais da expedição');
  await edt.getByLabel('Prazo').fill(new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10));
  await edt.getByRole('button', { name: 'Salvar' }).click();
  await p.getByText('Tarefa atualizada.').first().waitFor();
  await p.getByText('Levantar indicadores atuais da expedição').waitFor();
  await p.getByLabel('Alocar pessoa').selectOption({ label: 'Diego Santos' });
  await p.getByRole('button', { name: 'Alocar 20%' }).click();
  await p.getByText(/Acima do cedido \(10%\)/).waitFor();
  ok('GP cadastra tarefa, edita título e prazo, e alocação acima do cedido gera pedido ao gestor');
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
  const deps = p.getByRole('region', { name: 'Dependências' });
  await deps.getByRole('button', { name: 'Registrar dependência' }).click();
  await deps.getByLabel('Depende do projeto').selectOption({ label: 'App de pedidos para representantes' });
  await deps.getByLabel('O que precisa receber').fill('API de pedidos publicada');
  await deps.getByLabel('Precisa até').fill('2026-12-31');
  await deps.getByRole('button', { name: 'Registrar', exact: true }).click();
  await deps.getByRole('group', { name: 'Dependência: API de pedidos publicada' }).getByText('Em risco').waitFor(); // o App termina em 2027
  ok('GP registra dependência de outro projeto e ela aparece em risco');
  const enc = p.getByRole('region', { name: 'Encerramento e lições aprendidas' });
  await enc.getByRole('rowheader', { name: 'Custo' }).waitFor();
  await enc.getByRole('button', { name: 'O que melhorar' }).click();
  await enc.getByLabel('Lição aprendida').fill('Validar a base de dados da expedição antes de desenhar o painel');
  await enc.getByRole('button', { name: 'Registrar lição' }).click();
  await enc.getByText('Validar a base de dados da expedição antes de desenhar o painel').waitFor();
  ok('GP vê o balanço do projeto e registra uma lição aprendida');
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
  await p.getByText('Dependência entre projetos em risco').waitFor();
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
  await ped.getByRole('region', { name: 'Impacto de ceder Diego' }).getByText(/limite de Diego vai de \d+% para \d+%/).waitFor();
  await ped.getByRole('button', { name: /Ceder \+10%/ }).click();
  await p.getByText(/Você cedeu \+10% de Diego Santos/).waitFor();
  ok('Gestora vê o impacto mês a mês e cede capacidade pedida pelo GP');
  await p.getByRole('group', { name: 'Ausências de Clara Mendes' }).getByText('Férias: 01/12/2026 a 15/12/2026').waitFor();
  const ausJoao = p.getByRole('group', { name: 'Ausências de João Silva' });
  await ausJoao.getByRole('button', { name: '+ Registrar ausência' }).click();
  await ausJoao.getByLabel('De').fill('2026-12-31');
  await ausJoao.getByLabel('Até').fill('2026-12-20');
  await ausJoao.getByRole('button', { name: 'Registrar' }).click();
  await ausJoao.getByRole('alert').getByText(/fim precisa ser/).waitFor();
  await ausJoao.getByLabel('De').fill('2026-12-20');
  await ausJoao.getByLabel('Até').fill('2026-12-31');
  await ausJoao.getByRole('button', { name: 'Registrar' }).click();
  await p.getByText('Ausência de João Silva registrada. O GP do projeto afetado foi avisado.').waitFor();
  await ausJoao.getByText('Férias: 20/12/2026 a 31/12/2026').waitFor();
  await p.context().close();
  p = await como('fabio.oliveira@acme.com.br');
  await ir(p, '/inicio');
  await p.getByText('João Silva estará ausente (férias)').waitFor();
  await p.context().close();
  ok('Gestora registra férias de alguém do time (valida datas) e o GP do projeto afetado é avisado na Início');

  // Substituto: Fernanda indica o Marcos; ele vê as aprovações dela; ela cancela
  const hojeE2E = new Date().toISOString().slice(0, 10);
  const daqui10 = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
  p = await como('fernanda.oliveira@acme.com.br');
  await ir(p, '/area/time');
  const subst = p.getByRole('region', { name: 'Substituto durante sua ausência' });
  await subst.getByRole('button', { name: 'Indicar substituto' }).click();
  await subst.getByRole('alert').getByText('Escolha um substituto com perfil de gestor.').waitFor();
  await subst.getByLabel('Substituto').selectOption({ label: 'Marcos Teixeira · TI' });
  await subst.getByLabel('De', { exact: true }).fill(hojeE2E);
  await subst.getByLabel('Até', { exact: true }).fill(daqui10);
  await subst.getByRole('button', { name: 'Indicar substituto' }).click();
  await p.getByText(/Marcos Teixeira vai substituir você de/).waitFor();
  await subst.getByText('Em vigor').waitFor();
  await p.context().close();
  p = await como('marcos.teixeira@acme.com.br');
  await ir(p, '/inicio');
  await p.getByText(/Você está substituindo Fernanda Oliveira até/).waitFor();
  await ir(p, '/area/iniciativas');
  await p.locator('#aprovacoes > div').filter({ hasText: 'Adequação das empilhadeiras à norma de segurança' }).getByText(/no lugar de Fernanda/).waitFor();
  await p.context().close();
  p = await como('fernanda.oliveira@acme.com.br');
  await ir(p, '/area/time');
  await p.getByRole('region', { name: 'Substituto durante sua ausência' }).getByRole('button', { name: 'Cancelar' }).click();
  await p.getByText('Substituição cancelada.').waitFor();
  await p.context().close();
  ok('Gestora indica um substituto; ele vê as aprovações dela "no lugar de Fernanda"; ela cancela');

  // Feedback do GP: Marina avalia a Renata (participação no CRM terminou); o gestor dela (Sérgio) vê
  p = await como('marina.gomes@acme.com.br');
  await ir(p, '/inicio');
  await p.getByText(/Feedbacks? pendentes? de quem trabalhou com você/).click();
  await p.waitForURL(/\/projetos\/.+#feedback$/);
  const fbRen = p.getByRole('group', { name: 'Contribuição de Renata Souza' });
  await fbRen.getByText('Feedback pendente').waitFor();
  await fbRen.getByRole('button', { name: 'Dar feedback' }).click();
  await fbRen.getByRole('button', { name: 'Abaixo do esperado' }).click();
  await fbRen.getByRole('button', { name: 'Salvar feedback' }).click();
  await fbRen.getByText(/Conte em poucas palavras o que faltou/).waitFor();
  await fbRen.getByLabel(/Comentário para o gestor/).fill('Faltou documentar a migração dos clientes.');
  await fbRen.getByRole('button', { name: 'Salvar feedback' }).click();
  await fbRen.getByText('Feedback de Renata Souza registrado. O gestor da pessoa foi avisado.').waitFor();
  await p.context().close();
  p = await como('sergio.lima@acme.com.br');
  await ir(p, '/area/time');
  const fbs = p.getByRole('group', { name: 'Feedbacks de Renata Souza' });
  await fbs.getByRole('button', { name: /Feedback dos GPs \(1\)/ }).click();
  await fbs.getByText('“Faltou documentar a migração dos clientes.”').waitFor();
  await p.context().close();
  ok('GP dá feedback de quem trabalhou no projeto (abaixo do esperado exige comentário) e o gestor da pessoa vê em Gestão do time');

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
  await p.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'Portfólio' }).click();
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
    ['mariana@acme.com.br', 'pmo', ['Portfólio por etapa', 'Saúde dos projetos', 'Financeiro dos projetos', 'Matriz de riscos', 'Riscos do portfólio', 'Ciclos de planejamento', 'Demanda por área', 'Dependências entre projetos', 'Benefícios', 'Lições aprendidas', 'Capacidade por área e mês', 'Capacidade das pessoas']],
    ['fernanda.oliveira@acme.com.br', null, ['Iniciativas da área', 'Projetos da área', 'Custos da área', 'Capacidade por área e mês', 'Alocação do time']],
    ['carlos.andrade@acme.com.br', null, ['Meus projetos', 'Financeiro dos projetos', 'Riscos dos meus projetos', 'Lições aprendidas', 'Tarefas em aberto', 'Equipe dos meus projetos']],
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

  // Muro da vergonha: o responsável pede mais prazo em Minhas entregas, o GP aprova; o PMO vê o muro
  const novoPrazo = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);
  p = await como('joao.silva@acme.com.br');
  await ir(p, '/inicio');
  await p.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'Minhas entregas' }).click();
  await p.waitForURL(/\/minhas-entregas$/);
  const tarefaJoao = p.getByRole('article', { name: 'Tarefa: Testar app de roteirização com 3 motoristas' });
  await tarefaJoao.getByRole('button', { name: 'Pedir mais prazo' }).click();
  await tarefaJoao.getByLabel('Novo prazo').fill(novoPrazo);
  await tarefaJoao.getByLabel('Por quê').fill('Motoristas só disponíveis depois do inventário');
  await tarefaJoao.getByRole('button', { name: 'Enviar ao GP' }).click();
  await tarefaJoao.getByText(/Prazo em negociação/).waitFor();
  await p.context().close();
  p = await como('fabio.oliveira@acme.com.br');
  await ir(p, '/inicio');
  await p.getByText('Pedido de mais prazo').click();
  await p.getByRole('group', { name: /Pedido de prazo: a tarefa "Testar app de roteirização com 3 motoristas"/ }).getByRole('button', { name: 'Aprovar prazo' }).click();
  await p.getByText('Prazo estendido.').waitFor();
  await p.context().close();
  p = await como('mariana@acme.com.br', 'pmo');
  await ir(p, '/muro');
  await p.getByRole('heading', { name: 'Muro da vergonha', level: 1 }).waitFor();
  await p.getByRole('region', { name: 'Muro: Marina Gomes' }).waitFor();
  await p.getByRole('region', { name: 'Muro: Marcos Teixeira' }).getByText('Responder o pedido de +20% de Pedro Lima').waitFor();
  await ir(p, '/inicio');
  await p.getByText(/Decis(ão|ões) parada(s)? com gestor(es)? há mais de 5 dias/).waitFor();
  await p.context().close();
  ok('Muro: colaborador pede mais prazo em Minhas entregas, GP aprova na página do projeto, PMO vê o muro');
  p = await como('marcos.teixeira@acme.com.br');
  await ir(p, '/minhas-entregas');
  const dec = p.getByRole('article', { name: 'Decisão do gestor: Responder o pedido de +20% de Pedro Lima' });
  await dec.getByRole('link', { name: 'Decidir' }).click();
  await p.waitForURL(/\/area\/time$/);
  await p.getByRole('region', { name: 'Impacto de ceder Pedro' }).waitFor();
  await p.context().close();
  ok('Gestor com decisão parada há mais de 5 dias: aparece no muro, alerta o PMO e o leva a decidir em Minhas entregas');

  // GP: o status a publicar na Início segue a cadência combinada do projeto
  p = await como('carlos.andrade@acme.com.br');
  await ir(p, '/inicio');
  const precisa = p.getByRole('region', { name: 'Precisa de você' });
  await precisa.getByRole('link', { name: /Publicar o status da semana.*Inventário rotativo · vence/ }).waitFor();
  const invId = sql("select id from iniciativas where titulo='Inventário rotativo'");
  await ir(p, `/projetos/${invId}#prazos`);
  await p.getByLabel('Frequência do status').selectOption('mensal');
  await p.getByRole('button', { name: 'Salvar cadência' }).click();
  await p.getByRole('button', { name: 'Salvar cadência' }).waitFor({ state: 'detached' });
  await ir(p, '/inicio');
  await precisa.getByRole('link', { name: /Publicar o status/ }).first().waitFor({ state: 'attached' }).catch(() => {});
  if (await precisa.getByRole('link', { name: /Inventário rotativo · vence/ }).count()) throw new Error('Status mensal ainda cobrado nesta semana');
  await p.context().close();
  ok('GP: status a publicar na Início segue a cadência (mensal publicado há poucos dias não é cobrado nesta semana)');

  // Colaborador alocado vê o projeto em modo leitura e registra uma lição
  p = await como('diego.santos@acme.com.br');
  await ir(p, '/inicio');
  const participo = p.getByRole('region', { name: 'Projetos em que você participa' });
  await participo.getByRole('link', { name: new RegExp(TITULO) }).click();
  await p.waitForURL(new RegExp(`/projetos/${projId}`));
  const parte = p.getByRole('region', { name: 'Sua parte no projeto' });
  await parte.getByText(/Iniciação · 20%/).waitFor();
  if (await p.getByRole('button', { name: /linha de base/ }).count()) throw new Error('Participante não deveria editar a linha do tempo');
  if (await p.getByRole('region', { name: 'Financeiro', exact: true }).count()) throw new Error('Participante não deveria ver o financeiro');
  await p.getByLabel('Lição aprendida').fill('Combinar com a expedição os horários de coleta dos dados');
  await p.getByRole('button', { name: 'Registrar lição' }).click();
  await p.getByText('Combinar com a expedição os horários de coleta dos dados').waitFor();
  await p.context().close();
  ok('Colaborador alocado abre o projeto pela Início em modo leitura (sem editar nem ver o financeiro) e registra uma lição');

  // Quem pediu acompanha o projeto que nasceu da sua iniciativa
  p = await como('joao.silva@acme.com.br');
  await ir(p, '/inicio');
  await p.getByRole('region', { name: 'Suas iniciativas' }).locator('div').filter({ hasText: TITULO }).getByRole('link', { name: 'Acompanhar projeto →' }).first().click();
  await p.waitForURL(new RegExp(`/projetos/${projId}`));
  await p.getByText(/VOCÊ PEDIU/).waitFor();
  await p.getByRole('region', { name: 'Benefício esperado' }).getByText('Pedidos expedidos com atraso por semana').waitFor();
  await p.getByRole('region', { name: 'Status publicados' }).getByText('Projeto iniciado e linha de base congelada.').waitFor();
  if (await p.getByRole('region', { name: 'Sua parte no projeto' }).count()) throw new Error('Quem só pediu não participa do projeto');
  await p.context().close();
  ok('Quem pediu abre "Acompanhar projeto" e vê o andamento, os status e o benefício esperado');

  // Quem pediu desiste: exclui um rascunho e retira uma iniciativa que estava com o gestor
  p = await como('joao.silva@acme.com.br');
  const RASC = 'Rascunho que vou desistir';
  const RET = 'Etiqueta nova para as caixas';
  await ir(p, '/iniciativas/nova');
  await p.getByPlaceholder('Reduzir o tempo de separação de pedidos').fill(RASC);
  await p.getByRole('button', { name: 'Salvar rascunho' }).click();
  await p.getByText('Rascunho salvo.', { exact: false }).waitFor();
  await ir(p, '/iniciativas/nova');
  await p.getByPlaceholder('Reduzir o tempo de separação de pedidos').fill(RET);
  await p.getByPlaceholder(/A separação de um pedido leva/).fill('As etiquetas atuais descolam no transporte.');
  await p.getByRole('button', { name: /Melhoria/ }).click();
  await p.getByRole('button', { name: 'Enviar para aprovação' }).click();
  await p.getByText('Iniciativa enviada para aprovação').waitFor();
  await ir(p, '/inicio');
  const minhasIni = p.getByRole('region', { name: 'Suas iniciativas' });
  await minhasIni.locator('div').filter({ hasText: RASC }).getByRole('button', { name: 'Excluir rascunho' }).last().click();
  await p.getByRole('group', { name: `Excluir rascunho: ${RASC}` }).getByRole('button', { name: 'Confirmar: excluir' }).click();
  await minhasIni.getByText(RASC).waitFor({ state: 'detached' });
  await minhasIni.locator('div').filter({ hasText: RET }).getByRole('button', { name: 'Retirar' }).last().click();
  const ret = p.getByRole('group', { name: `Retirar: ${RET}` });
  await ret.getByRole('button', { name: 'Confirmar: retirar' }).click();
  await ret.getByText(/Conte em poucas palavras/).waitFor(); // o servidor exige o comentário
  await ret.getByLabel('Por que está retirando?').fill('O fornecedor já trocou as etiquetas.');
  await ret.getByRole('button', { name: 'Confirmar: retirar' }).click();
  await minhasIni.getByText('Você retirou esta iniciativa · O fornecedor já trocou as etiquetas.').waitFor();
  await p.context().close();
  ok('Quem pediu exclui um rascunho e retira uma iniciativa que estava com o gestor (comentário obrigatório)');

  // Patrocinador acompanha pela Início o projeto que patrocina, com custo e mudanças
  p = await como('ricardo.moura@acme.com.br');
  await ir(p, '/inicio');
  await p.getByRole('region', { name: 'Projetos que você patrocina' }).getByRole('link', { name: new RegExp(TITULO) }).click();
  await p.waitForURL(new RegExp(`/projetos/${projId}`));
  await p.getByText(/VOCÊ PATROCINA/).waitFor();
  const custoPatro = p.getByRole('region', { name: 'Custo e mudanças' });
  await custoPatro.getByText(/Orçado/).first().waitFor();
  await custoPatro.getByText(/aprovada \(/).first().waitFor(); // mudança de custo aprovada, com valores
  await p.context().close();
  ok('Patrocinador vê na Início os projetos que patrocina e acompanha o custo e as mudanças');

  // GP conclui o projeto pela página do projeto (gate com o aceite de quem pediu)
  p = await como('carlos.andrade@acme.com.br');
  await ir(p, `/projetos/${projId}#encerramento`);
  const conc = p.getByRole('group', { name: 'Concluir o projeto' });
  await conc.getByRole('button', { name: 'Concluir projeto' }).click();
  await conc.getByRole('button', { name: 'Concluir', exact: true }).click();
  await conc.getByText('Falta 1 critério para avançar.').waitFor(); // o servidor exige o aceite
  await conc.getByLabel('Aceite da entrega pelo solicitante').check();
  await conc.getByRole('button', { name: 'Concluir', exact: true }).click();
  await p.getByText('Projeto concluído. O PMO e quem pediu foram avisados.').waitFor();
  if (sql(`select r.chave from iniciativas i join raias r on r.id=i.raia_id where i.id='${projId}'`) !== 'con') throw new Error('Projeto não foi para Concluído');
  await p.context().close();
  ok('GP conclui o projeto pela página do projeto (gate exige o aceite de quem pediu)');

  // GP: "Todos os meus projetos" mostra só os dele, inclusive os concluídos
  p = await como('carlos.andrade@acme.com.br');
  await ir(p, '/inicio');
  await p.getByRole('link', { name: 'Todos os meus projetos' }).click();
  await p.getByRole('heading', { name: 'Meus projetos', level: 1 }).waitFor();
  await p.locator('section').filter({ has: p.getByRole('heading', { name: /Concluídos/ }) }).getByText(TITULO).waitFor();
  await p.getByText('Inventário rotativo').first().waitFor();
  if (await p.getByText('Roteirização de entregas').count()) throw new Error('GP vê projeto de outro GP');
  await p.getByRole('link', { name: new RegExp(TITULO) }).click();
  await p.waitForURL(new RegExp(`/projetos/${projId}`));
  await p.context().close();
  ok('GP abre "Todos os meus projetos" (só os dele, com os concluídos) e volta a um projeto concluído');

  // PMO troca o patrocinador de um projeto
  p = await como('mariana@acme.com.br', 'pmo');
  await ir(p, `/projetos/${sql("select id from iniciativas where titulo='Inventário rotativo'")}`);
  const patroBox = p.getByRole('group', { name: 'Patrocinador do projeto' });
  await patroBox.getByLabel('Escolher patrocinador').selectOption({ label: 'Helena Castro' });
  await patroBox.getByRole('button', { name: 'Salvar patrocinador' }).click();
  await patroBox.getByText('Patrocinador: Helena Castro.').waitFor();
  await p.context().close();
  ok('PMO troca o patrocinador de um projeto por uma pessoa cadastrada');
} catch (e) {
  console.error('✗ FALHOU no passo', passo + 1, '\n', e.message.split('\n').slice(0, 6).join('\n'));
  process.exitCode = 1;
  if (ultima) await ultima.screenshot({ path: 'falha.png', fullPage: true }).catch(() => {});
} finally {
  if (erros.length) console.log('Erros de página:', erros.slice(0, 5));
  await browser.close();
}
