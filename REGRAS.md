# TARS GPP — Regras de negócio da V1

Inventário das regras implícitas no protótipo (`prototipo/`) e de como a V1 as implementa.
Marcações:

- **[Protótipo]** regra explícita no protótipo, implementada igual.
- **[Implícita]** regra que o protótipo sugere (por texto, dado ou tela) e a V1 formaliza.
- **[Decisão V1]** lacuna ou contradição do protótipo resolvida por nós — **revisar com a sócia**.

---

## 1. Perfis e acesso

| Perfil | O que vê | Origem |
|---|---|---|
| Colaborador | Início (suas iniciativas e tarefas), Nova iniciativa | [Protótipo] |
| Gestor de área | Início, Iniciativas da área, Projetos da área, Gestão do time, Nova iniciativa | [Protótipo] + [Decisão V1] |
| Gerente de projeto (GP) | Início, Meus projetos | [Protótipo] |
| PMO | Tudo da Gestão (Portfólio, Ciclos, Avaliação, Projetos) | [Protótipo] |
| Admin | Configuração (Cadastros, Configurações) + seletor "ver como" | [Decisão V1] pedido do Erico |

- **[Decisão V1]** Login com **conta Google** (Better Auth). Só entra quem está cadastrado em Pessoas com o mesmo e-mail; fornecedores externos não entram. Cada pessoa tem um ou mais perfis; a tela inicial usa o perfil "mais alto" (PMO > GP > Gestor > Colaborador).
- **[Decisão V1]** **"Ver como" do Admin:** um único dropdown com todas as pessoas cadastradas (não externas, inclusive quem ainda não fez o 1º acesso), mostradas como "nome · área" e agrupadas pelo perfil principal. Ao escolher uma pessoa, o app se comporta exatamente como para ela (tela inicial no perfil principal dela, menus, permissões e ações). Se a pessoa tem mais de um perfil, aparecem os botões só dos perfis dela, como ela mesma veria. Cadastros e Configurações aparecem só quando a pessoa escolhida é admin. Toda ação fica registrada com o admin como autor real e "em nome de" a pessoa escolhida. Serve para validar o fluxo de ponta a ponta trocando de pessoa (ex.: Mariana · PMO → Fernanda · Logística).
- **[Implícita]** O gestor de uma pessoa é o responsável da área dela (Cadastros: "O gestor de cada pessoa vem da área"). Se a pessoa **é** a responsável, o gestor dela é o responsável da área-mãe.
- **[Implícita]** "Time" de um gestor = pessoas da área dele + responsáveis das subáreas diretas (Fernanda vê Bruno, Clara, João e Diego).

## 2. Esteira do portfólio (máquina de estados)

Raias padrão, na ordem: Solicitações → Backlog → Pré-projeto → Em execução → Pausado → Concluído, e a raia de saída Cancelado/recusado. **[Protótipo]**

| De | Ação | Para | Quem confirma (padrão) |
|---|---|---|---|
| Solicitações · aguardando gestor | Aprovar | Solicitações · aguardando PMO | Gestor da área solicitante |
| Solicitações · aguardando PMO | Classificar | Backlog | PMO |
| Backlog | Pré-aprovar | Pré-projeto | PMO |
| Pré-projeto | Dar play | Em execução | PMO |
| Em execução | Concluir | Concluído | Gerente de projeto (config.) |
| Em execução | Pausar | Pausado | PMO |
| Pausado | Retomar | Em execução | PMO |
| Solicitações, Backlog, Pré-projeto, Pausado | Cancelar | Cancelado/recusado | PMO |

- **[Protótipo]** Cada passagem tem um gate com critérios. Todos os obrigatórios precisam estar marcados ("Faltam N critérios para avançar."). Critérios opcionais não bloqueiam.
- **[Protótipo]** Projeto em execução não pode ser cancelado direto: precisa ser pausado antes.
- **[Implícita]** O gate é validado **no servidor**, não só na tela.
- **[Implícita]** O histórico guarda quem moveu, quando e os critérios que valiam em cada passagem (Configurações: "O histórico guarda os critérios que valiam em cada passagem").
- **[Decisão V1]** O PMO pode confirmar qualquer passagem, além de quem está configurado como aprovador da raia.
- **[Decisão V1]** As marcações de um gate ficam salvas ao fechar o modal. É isso que alimenta a "Prontidão N/5" do pré-projeto.
- **[Decisão V1]** O gate do **play** também pede: gerente de projeto, modelo de projeto e data de início. O projeto nasce com as fases do modelo em sequência, a partir dessa data (Cadastros › Modelos: "No play, o projeto nasce com as fases do modelo e as datas da iniciativa").
- **[Decisão V1]** Os gates de **pausar** e **cancelar** pedem um motivo da lista padronizada de Cadastros › Motivos. Pausar pede também a data prevista de retomada.
- **[Protótipo]** Ao classificar, a prioridade vira "Média".
- **[Protótipo]** O farol (OK/Atenção/Crítico) só aparece em projetos em execução ou pausados.

### Raias configuráveis (Configurações)
- **[Protótipo]** É possível renomear e reordenar raias, editar a descrição, quem aprova, o tipo de card e os critérios, e criar raias novas. A raia de saída é fixa.
- **[Protótipo]** Uma raia com cards não pode ser excluída.
- **[Decisão V1]** As 7 raias padrão não podem ser excluídas (o motor depende delas). Só raias criadas pelo usuário podem.
- **[Implícita]** A ação principal leva o card para a **próxima raia da ordem**, pulando "Pausado" (que é lateral). Uma raia nova inserida no meio do fluxo passa a fazer parte da esteira.

## 3. Nova iniciativa

- **[Protótipo]** Obrigatórios: título, problema e tipo.
- **[Protótipo]** Quem aprova primeiro é o gestor da área de quem envia. Se quem envia é o gestor, aprova o responsável da área-mãe.
- **[Protótipo]** Urgência "Urgente ou obrigatória" faz a iniciativa entrar **fora do ciclo** e ir direto ao PMO depois do gestor.
- **[Implícita]** Fora disso, a iniciativa entra no ciclo com inscrições abertas. Sem ciclo aberto, fica sem ciclo, aguardando o próximo.
- **[Decisão V1]** "Salvar rascunho" grava sem enviar. O colaborador vê o rascunho na tela inicial.
- **[Decisão V1]** Se não houver aprovador (topo da hierarquia), a iniciativa vai direto para avaliação do PMO.
- **[Decisão V1]** Anexos ficam para a fase 2: o campo aparece, mas ainda não funciona.

## 4. Aprovação do gestor (menus da área)

- **[Decisão V1]** A antiga "Visão da área" do protótipo foi dividida em três menus (pedido da Mariana):
  - **Iniciativas da área** (`/area/iniciativas`): iniciativas esperando a aprovação do gestor e as iniciativas da área que já seguem no portfólio (backlog, pré-projeto).
  - **Projetos da área** (`/area/projetos`): projetos da área que estão rodando, ou seja, em execução e pausados (em execução primeiro). Concluídos e cancelados não aparecem.
  - **Gestão do time** (`/area/time`): quanto cada pessoa pode ceder e os pedidos de alocação.
  - Os quatro números do topo aparecem nos três menus e levam ao menu certo. O endereço antigo `/area` (e avisos antigos com `#aprovacoes` ou `#capacidade`) leva para o menu novo correspondente.
- **[Decisão V1]** Em **Iniciativas da área** e **Projetos da área**, clicar numa iniciativa ou projeto abre logo abaixo o **mesmo detalhe da Avaliação do PMO** (problema, resultado esperado, solicitante, urgência, custo etc.). Nas aprovações, o detalhe aparece antes dos botões de decisão. Se já virou projeto, traz também o **andamento do projeto**: GP, farol, início, fim previsto, fase atual, desvio, tarefas concluídas e atrasadas, riscos abertos, próximo marco e último status.

- **[Protótipo]** O gestor pode **Aprovar e enviar ao PMO** ou **Devolver para ajuste** com um comentário.
- **[Implícita]** A iniciativa devolvida volta para o solicitante, que vê o comentário e o botão "Ajustar e reenviar". Ao reenviar, volta para o gestor.
- **[Protótipo]** O gestor define quanto cada pessoa do time pode ceder para projetos (0–100%, passos de 10).
- **[Protótipo]** Pessoa acima do cedido = alocação atual maior que o limite.
- **[Protótipo]** Pedido de alocação: o gestor **cede** (o limite sobe pelo valor pedido) ou **recusa** (o GP é avisado).

## 5. Ciclos de planejamento

- **[Protótipo]** Etapas: Inscrições → Aprovação dos gestores → Avaliação do PMO → Comunicação → Play dos projetos.
- **[Protótipo]** Configuração da janela: datas, orçamento de referência, quem pode enviar e avisos automáticos.
- **[Protótipo]** "Encerrar inscrições" leva o ciclo para a avaliação.
- **[Decisão V1]** Ciclo de vida completo: Planejado → Inscrições abertas → Em avaliação → Decisões comunicadas → Encerrado. Botões: "Abrir inscrições", "Encerrar inscrições", "Encerrar ciclo".
- **[Decisão V1]** Ao encerrar um ciclo, os números dele são congelados (foto do fechamento). Os números do ciclo em andamento são sempre calculados ao vivo.
- **[Decisão V1]** Os avisos automáticos ficam gravados como configuração. O envio agendado (e-mail) entra na fase 2.
- **[Implícita]** Só um ciclo fica ativo por vez.

## 6. Avaliação e priorização

- **[Protótipo]** Nota de 1 a 5 em 4 critérios. Nota final = Σ(nota × peso) ÷ 5, numa escala de 0 a 100. Pesos padrão: Impacto 35, Urgência 25, Alinhamento 25, Facilidade 15.
- **[Protótipo]** A lista é ordenada pela nota.
- **[Protótipo]** Obrigatórias entram pré-aprovadas "independente da nota".
- **[Protótipo]** Decisões: Pré-aprovar, Backlog e Recusar (esta com motivo padronizado).
- **[Protótipo]** "Comunicar decisões" é bloqueado enquanto houver iniciativa sem decisão.
- **[Protótipo]** Barra de orçamento: custo das pré-aprovadas contra o orçamento de referência do ciclo, em vermelho se passar.
- **[Implícita]** Entram na lista as iniciativas do ciclo atual (e as fora do ciclo) **já aprovadas pelo gestor** ou paradas no backlog.
- **[Implícita]** Ao comunicar, cada decisão vira uma passagem real na esteira: pré-aprovada → Pré-projeto, backlog → Backlog, recusada → Cancelado com motivo. Solicitante e gestor são avisados, e o ciclo passa para "Decisões comunicadas".
- **[Decisão V1]** Iniciativa ainda sem nota aparece no fim da lista com nota "—".
- **[Decisão V1]** Custo usado no orçamento = custo estimado, se houver; senão, o teto da faixa escolhida no formulário ("Não sei" conta R$ 0).
- **[Implícita]** O alerta de **concorrência de recursos** aparece quando uma iniciativa sem decisão impacta uma área que já tem pessoa acima do cedido.
- **[Decisão V1]** **Filtros de status e ciclo** no topo da Avaliação. Os status são os mesmos recortes dos números do painel do ciclo (Início e Ciclos): *Na mesa do PMO* (padrão, a lista de sempre), *Recebidas*, *Aguardando gestor*, *Prontas para avaliar* e *Fora do ciclo*. Os números e a lista vêm da mesma conta (`iniciativasDoFiltro`), então sempre batem.
- **[Decisão V1]** Só a **mesa do PMO do ciclo em andamento** é editável (notas e decisão). As demais iniciativas de um filtro (ex.: aguardando gestor, ciclos anteriores) aparecem **só para consulta**, com a situação atual e a avaliação que tiveram naquele ciclo. Orçamento, contadores e "Comunicar decisões" consideram só a mesa e só aparecem no ciclo em andamento.
- **[Decisão V1]** Ao clicar numa linha da Avaliação, abre logo abaixo o **detalhe da iniciativa** (problema, resultado esperado, situação, solicitante, gestor, urgência, áreas impactadas, datas desejadas, custo, fornecedor, esforço e nota de devolução).

## 7. Projeto (visão do GP e do PMO)

- **[Protótipo]** Linha do tempo em semanas. As barras de fase podem ser arrastadas (mover) e redimensionadas (duração). Fases podem ser adicionadas pela biblioteca e removidas.
- **[Decisão V1]** As fases podem ser **reordenadas** na linha do tempo: arrastando a alça ⠿ para cima ou para baixo, ou pelas setas ↑/↓. Muda só a ordem das linhas (a sequência em que aparecem); as datas e durações continuam as mesmas, porque quem define as datas é o arraste horizontal da barra. Por isso reordenar não gera desvio nem pedido de mudança da linha de base. Quem pode: o PMO e o GP do projeto (as mesmas pessoas que já editam a linha do tempo). "Recriar a partir do modelo" volta à ordem do modelo.
- **[Protótipo]** "Congelar linha de base" grava as fases. Daí em diante, o desvio é o fim atual menos o fim da linha de base.
- **[Protótipo]** Farol sugerido: desvio > 2 semanas → Crítico; desvio > 0 → Atenção; sem linha de base → Atenção; pessoa acima do cedido → Atenção; caso contrário, OK. O GP escolhe o farol (o sugerido é só referência).
- **[Protótipo]** Status da fase pela data: Concluída (fim ≤ hoje), Em andamento, Planejada.
- **[Protótipo]** Tarefa atrasada = não concluída com prazo vencido.
- **[Protótipo]** Status do projeto: precisa de data e "O que avançou?". Grava o farol e o desvio do momento.
- **[Protótipo]** Alocação por fase em passos de 10% (mínimo 10%). Ao alocar uma pessoa, entram 20%. Fornecedor externo não tem limite de cedência.
- **[Implícita]** Alocar acima do cedido **gera um pedido de alocação** ao gestor da pessoa ("vai pedir aprovação ao gestor da área").
- **[Implícita]** Atualizar uma linha de base já congelada exige **aprovação do PMO** (tela inicial do PMO: "Pedido para alterar linha de base"). O PMO decide na própria página do projeto.
- **[Implícita]** O GP confirma o fim de cada fase pelo critério de conclusão da biblioteca (tela inicial do GP: "Confirmar o fim de uma fase · critério: contrato assinado").
- **[Decisão V1]** % concluído do projeto = tarefas concluídas ÷ total de tarefas.

## 8. Telas iniciais ("Precisa de você")

Na V1, todos os itens e números são **calculados a partir dos dados reais**:

- **PMO:** iniciativas prontas para avaliar · projetos críticos · pedidos de mudança de linha de base · status da semana atrasados (mais de 7 dias sem status) · pré-projetos prontos para o play (prontidão) · pessoas acima do cedido.
- **Gestor:** aprovações pendentes (obrigatórias primeiro) · pedidos de alocação · pessoas do time acima do cedido.
- **GP:** status da semana a publicar · tarefas atrasadas · pedidos de alocação aguardando o gestor · fases a confirmar.
- **Colaborador:** suas iniciativas com o passo atual · suas tarefas em projetos.

> **[Decisão V1]** No protótipo, alguns números eram ilustrativos e não batiam entre telas (ex.: "13 prontas para avaliar" na tela inicial e 9 linhas na Avaliação). Na V1, todas as telas leem a mesma base, então os números do seed podem ser diferentes dos do protótipo, mas são sempre consistentes entre si.

## 9. Adições da V1 que não existiam no protótipo

Itens que o protótipo sugeria mas não desenhava. Todos usam o mesmo visual:

- **Lista de Projetos** (menu PMO › Projetos): o protótipo apontava para um projeto só.
- **Filtro "Todas as áreas"** do portfólio passou a funcionar.
- **Números clicáveis do ciclo** (painel da direita na Início do PMO e tela Ciclos): Recebidas, Aguardando gestor, Prontas para avaliar e Fora do ciclo levam à Avaliação já filtrada por aquele status e ciclo. Só nos ciclos em andamento: nos encerrados os números são a foto do fechamento e não viram lista.
- **Faixa de decisão da mudança de linha de base** na página do projeto (PMO aprova ou recusa).
- **Confirmar fim de fase**, no detalhe da fase, com o critério de conclusão da biblioteca.
- **Status do marco**: clicar na etiqueta alterna Previsto → Em risco → Atingido.
- **Editores em Cadastros**: convidar e editar pessoa, nova área, nova fase, novo modelo, adicionar e remover motivo, salvar pesos.
- **Ciclo de vida do ciclo**: "Novo ciclo", "Abrir inscrições", "Encerrar ciclo".
- **[Decisão V1] Alocação de uma pessoa** = pico de alocação simultânea nas fases ainda não concluídas dos projetos em execução. Isso enxerga a sobrecarga que vem pela frente, não só a de hoje.
- **[Decisão V1] Relatórios** (menu RELATÓRIOS, em todos os perfis; pedido da Mariana). Uma página com os relatórios do perfil ativo (no "ver como", os da pessoa escolhida), calculados com as mesmas contas das outras telas:
  - **PMO:** portfólio por etapa (quantidade e custo), saúde dos projetos (farol, desvio, % concluído, fim previsto, último status), ciclos de planejamento (ao vivo no ciclo em andamento, foto do fechamento nos encerrados), demanda por área e capacidade das pessoas.
  - **Gestor de área:** iniciativas da área com a situação de cada uma, projetos da área e alocação do time.
  - **Gerente de projeto:** meus projetos, tarefas em aberto (atrasadas destacadas) e equipe dos meus projetos.
  - **Colaborador:** minhas iniciativas e minhas tarefas.
  - Contam todas as iniciativas que não são rascunho. Projetos antigos podem não ter data de envio e aparecem com "—".
  - **Filtros por relatório**, logo abaixo do título. Os números-resumo seguem os filtros. Cada filtro fica no endereço da página (ex.: `?r.saude.farol=crit`), então o link já leva filtrado. "Limpar filtros" volta ao todo.
    - PMO: Portfólio por etapa (área, ciclo) · Saúde dos projetos (área, farol, etapa) · Ciclos (em andamento ou encerrados) · Demanda por área (ciclo, tipo) · Capacidade (área, situação da pessoa).
    - Gestor: Iniciativas (situação; área, se cuida de mais de uma) · Projetos (farol; área) · Alocação do time (situação da pessoa).
    - GP: Meus projetos (farol) · Tarefas em aberto (projeto, situação, responsável) · Equipe (projeto, situação da pessoa).
    - Colaborador: Minhas iniciativas (situação) · Minhas tarefas (situação, projeto).
    - O filtro de área inclui as subáreas (escolher uma diretoria traz as gerências e coordenações dela).
  - "Imprimir ou salvar PDF" usa a impressão do navegador, sem menu e barras. Exportar para planilha fica na task "Exportar relatórios e filtrar portfólio/projetos".
- **[Decisão V1] Menu lateral diferente do protótipo** (pedido da Mariana): os títulos de seção (GESTÃO, MINHA ÁREA, CONFIGURAÇÃO), que não são clicáveis, ficam menores, mais claros e com uma linha separadora acima. Os itens clicáveis têm texto escuro, uma seta › à direita e fundo ao passar o mouse. No protótipo os dois tinham aparência parecida e se confundiam.
- **[Decisão V1] Rótulos com gênero** ("Gestora", "Ativa") só quando o cadastro informa o tratamento. Sem essa informação, o sistema usa a forma neutra ("Gestor(a)").

## 10. Fora do escopo da V1 (fase 2)

Envio de e-mails e avisos agendados · anexos · importar planilha de pessoas · integração com Microsoft Entra (AD) · abas cinzas de Configurações (Empresa, Modo de captação, Notificações, Plano e cobrança) · multiempresa com cobrança.

## 11. Acompanhamento dos projetos pelo PMO (V2)

Funcionalidades que nasceram da análise da mecânica do PMO (17/11), para o acompanhamento depois do play.

### Pontos de atenção
- **[Decisão V2]** Quem participa do projeto (GP, pessoas alocadas, responsáveis de tarefa) ou o PMO pode abrir um **ponto de atenção**, do tipo **impedimento** ou **decisão necessária**. Ele vai para o **PMO** ou para **um gestor de área** escolhido, com data opcional para a resposta e fase opcional.
- **[Decisão V2]** Quem decide vê o ponto no "Precisa de você" da Início e na página **Pontos de atenção** (`/pontos`), e registra a **resolução**. Quem abriu e o GP são avisados. O PMO sempre pode resolver. Quem abriu pode retirar o ponto, registrando o motivo.
- **[Decisão V2]** Ponto aberto com a data de resposta vencida fica **atrasado** (destaque em vermelho).

### Mudança de escopo e de custo
- **[Decisão V2]** Além da mudança de prazo (linha de base, §7), o GP ou o PMO pode pedir **mudança de escopo** ou **mudança de custo** na página do projeto, dizendo o que muda e por quê. Só pode haver um pedido pendente de cada tipo por projeto.
- **[Decisão V2]** O **PMO decide** (aprova ou recusa; para recusar, o comentário é obrigatório), na página do projeto ou pelo aviso na Início. O GP e quem pediu são avisados.
- **[Decisão V2]** O projeto tem um **orçamento aprovado**. Enquanto ninguém o definir, ele é o custo estimado da iniciativa. Uma mudança de custo aprovada passa a ser o novo orçamento aprovado. Mudança de escopo aprovada fica registrada no histórico do projeto.

### Financeiro do projeto
- **[Decisão V2]** Cada projeto tem **orçado** (orçamento aprovado, §11 › Mudança de custo), **realizado** (soma dos lançamentos de custo feitos pelo GP ou PMO) e **previsto no fim** (atualizado pelo GP; enquanto não for informado, é o orçado; nunca fica abaixo do realizado).
- **[Decisão V2]** Situação do custo: **estouro** se o realizado passou do orçado ou se a previsão passa de 110% do orçado; **acima do orçado** se a previsão passa do orçado; senão, **dentro**. Sem orçamento definido, mostra "Orçamento não definido".
- **[Decisão V2]** O PMO pode definir o orçamento aprovado direto (ex.: no play). O GP muda o orçamento só por pedido de mudança de custo.
- **[Decisão V2]** "Consumo × concluído" compara o quanto do orçamento já foi gasto com o percentual de tarefas concluídas: gastar muito mais rápido do que se entrega é sinal de alerta.
- **[Decisão V2]** Relatório **Financeiro dos projetos** (PMO: todos, com filtro de área e situação; GP: os dele) e aviso **Projetos estourando o orçamento** na Início do PMO.

### Farol por dimensão
- **[Decisão V2]** O TARS sugere um farol para cada dimensão do projeto. O farol geral sugerido é o **pior** entre elas, explicando qual puxou para baixo. O GP continua escolhendo o farol final (§7).
  - **Prazo:** a regra de sempre (desvio da linha de base e pessoas acima do cedido).
  - **Custo:** estouro → crítico; previsão acima do orçado → atenção; sem orçamento definido → atenção.
  - **Escopo:** mudança de escopo aguardando o PMO, ou escopo que já mudou 2 vezes ou mais → atenção.
  - **Riscos:** 2 ou mais riscos altos, ou impedimento com prazo vencido → crítico; 1 risco alto ou impedimento aberto → atenção.
- **[Decisão V2]** No relatório Saúde dos projetos, a coluna "Alertas" lista as dimensões fora do OK.

### Riscos
- **[Decisão V2]** Cada risco tem **probabilidade** (baixa, média, alta) × **impacto** (baixo, médio, alto), **responsável**, **plano de resposta** e **status**: em acompanhamento, ocorreu (virou problema), mitigado, encerrado. O **nível** é calculado: pontuação 6 ou mais → Alto; 3 a 5 → Médio; até 2 → Baixo. Os riscos que já existiam foram convertidos para manter o mesmo nível.
- **[Decisão V2]** Contam como **ativos** (farol de riscos, "riscos abertos", relatórios) só os riscos em acompanhamento ou que ocorreram. Mitigados e encerrados saem das contas, mas continuam no histórico da fase.
- **[Decisão V2]** PMO: relatórios **Matriz de riscos** (probabilidade × impacto) e **Riscos do portfólio**, com filtros de área, nível, status e plano. GP: **Riscos dos meus projetos**. Na Início do PMO aparece o aviso **Riscos altos sem plano de resposta**.

### Roadmap do portfólio
- **[Decisão V2]** Menu **Gestão › Roadmap** (PMO): uma linha por projeto, com a barra do início ao **fim previsto** na cor do farol. Pausados aparecem esmaecidos e concluídos em lilás. **◆** marca os marcos (verde se atingido, âmbar se em risco), um traço cinza marca o **fim da linha de base** quando ele é diferente do previsto, e uma linha vermelha marca **hoje**.
- **[Decisão V2]** Pré-projetos aparecem com **borda tracejada**, usando o mês de início desejado e o de entrega desejada informados na iniciativa. Os que não têm essas datas são listados abaixo do roadmap.
- **[Decisão V2]** Filtros: área (inclui subáreas), etapa (padrão: todos os ativos) e farol. Clicar no nome do projeto abre a página dele.

### Capacidade por área e por mês
- **[Decisão V2]** Relatório **Capacidade por área e mês** (PMO: todas as áreas; gestor: as dele). Para cada área e mês: o que as pessoas da área **cedem** para projetos × o **pico de alocação** de cada pessoa naquele mês, somados. Tudo em **pessoas-equivalentes** (100% = uma pessoa em tempo integral). Acima do cedido → vermelho; acima de 85% → âmbar. Cada linha conta só as pessoas da própria área; o filtro de área inclui as subáreas.
- **[Decisão V2]** Na **Avaliação**, o painel **Capacidade das áreas impactadas** mostra, para cada área impactada pelas iniciativas pré-aprovadas, quantas pré-aprovadas a impactam e a **folga**: o que a área cede menos o que já está alocado, no mês mais apertado dos próximos 3 meses (com as subáreas). Sem folga → vermelho; folga menor que meia pessoa por pré-aprovada → âmbar. O painel muda na hora, conforme o PMO decide.
- **[Decisão V2]** É um **indicador**, não uma previsão de alocação: a iniciativa ainda não diz quantas pessoas vai pedir. A comparação de cenários lado a lado fica na task "Simulação 'e se' na avaliação do ciclo".

### Benefícios
- **[Decisão V2]** Cada iniciativa pode ter um **benefício principal**: **indicador**, **meta** e **data de medir**. Ele é definido no formulário da iniciativa (bloco opcional "Como vamos medir?"), e o GP ou o PMO pode ajustá-lo na página do projeto.
- **[Decisão V2]** Quando a data de medir chega e o resultado não foi registrado, o benefício fica em **"Hora de medir"**: aviso na Início do PMO, do gestor e do GP, e item na página **Benefícios** (`/beneficios`). Quem pediu, o gestor que aprovou, o GP ou o PMO registra o **resultado medido** e se a meta foi **atingida, parcialmente ou não**. Dá para corrigir depois.
- **[Decisão V2]** Relatório **Benefícios** (PMO): o que cada projeto prometeu e o que entregou, ao lado da **nota de impacto** dada na avaliação, para calibrar as próximas avaliações.
