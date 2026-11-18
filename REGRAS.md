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
| Patrocinador | Não é uma tela própria: é um **papel por projeto**, de quem tem o perfil Patrocinador (Cadastros) e foi escolhido na iniciativa. Na Início do perfil que a pessoa já usa (gestor, GP ou colaborador) aparece **Projetos que você patrocina**, e o projeto abre em modo leitura com custo e mudanças | [Decisão V2] |

- **[Decisão V1]** Login com **conta Google** (Better Auth). Só entra quem está cadastrado em Pessoas com o mesmo e-mail; fornecedores externos não entram. Cada pessoa tem um ou mais perfis; a tela inicial usa o perfil "mais alto" (PMO > GP > Gestor > Colaborador).
- **[Decisão V1]** **"Ver como" do Admin:** um único dropdown com todas as pessoas cadastradas (não externas, inclusive quem ainda não fez o 1º acesso), mostradas como "nome · área" e agrupadas pelo perfil principal. Ao escolher uma pessoa, o app se comporta exatamente como para ela (tela inicial no perfil principal dela, menus, permissões e ações). Se a pessoa tem mais de um perfil, aparecem os botões só dos perfis dela, como ela mesma veria. Cadastros e Configurações aparecem só quando a pessoa escolhida é admin. Toda ação fica registrada com o admin como autor real e "em nome de" a pessoa escolhida. Serve para validar o fluxo de ponta a ponta trocando de pessoa (ex.: Mariana · PMO → Fernanda · Logística).
- **[Decisão V2]** **Excluir área** (Cadastros › Áreas e hierarquia, admin): só uma área **vazia**, sem subáreas, sem pessoas e sem iniciativas ou projetos (próprios ou como área impactada). Se tiver histórico, ela não pode ser excluída, mas pode ser renomeada. Ao excluir, ela sai também do público dos ciclos que a citavam.
- **[Decisão V2]** **Desativar o acesso** (Cadastros › Pessoas, admin): para quem saiu da empresa. A pessoa desativada **não entra** no TARS (nem com a conta Google) e deixa de aparecer nas listas de escolha (GP no play, alocação, responsáveis, patrocinador, gestor de ponto de atenção, substituto). O histórico dela continua (iniciativas, status, lições, feedbacks). Antes de confirmar, o admin vê o que fica pendente: projetos em andamento em que é GP, áreas de que é responsável, iniciativas esperando a aprovação dela e tarefas abertas. **Reativar** devolve o acesso ("Ativo" ou "Aguardando 1º acesso", se nunca entrou). O admin não desativa o próprio acesso.
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
- **[Decisão V2]** **Patrocinador escolhido da lista:** no formulário, o campo Patrocinador (opcional) lista as pessoas cadastradas com o perfil **Patrocinador** (Cadastros › Pessoas), com a opção "Outra pessoa (digitar o nome)" para quem não está cadastrado. Só o patrocinador escolhido da lista fica ligado à pessoa: é ele quem recebe os status e acompanha o projeto. Na página do projeto, o **PMO** indica ou troca o patrocinador (o novo patrocinador é avisado).
- **[Decisão V2]** **Retirar uma iniciativa:** quem pediu pode desistir enquanto a iniciativa ainda está com ele ou com o gestor. **Rascunho** (nunca enviado): **Excluir rascunho** apaga de vez. **Devolvida** ou **aguardando o gestor**: **Retirar** pede um comentário (mín. 5 caracteres) e leva a iniciativa para **Cancelados** com o motivo "Retirada por quem pediu — comentário"; se estava com o gestor, ele é avisado e a decisão sai da fila (e do prazo de 5 dias). Na Início de quem pediu, aparece "Você retirou esta iniciativa · comentário". Depois que o gestor aprovou, a decisão é do PMO: quem pediu não retira mais por aqui.

## 4. Aprovação do gestor (menus da área)

- **[Decisão V1]** A antiga "Visão da área" do protótipo foi dividida em três menus (pedido da Mariana):
  - **Iniciativas da área** (`/area/iniciativas`): iniciativas esperando a aprovação do gestor e as iniciativas da área que já seguem no portfólio (backlog, pré-projeto).
  - **Projetos da área** (`/area/projetos`): projetos da área que estão rodando, ou seja, em execução e pausados (em execução primeiro). Concluídos e cancelados não aparecem.
  - **Gestão do time** (`/area/time`): quanto cada pessoa pode ceder e os pedidos de alocação.
  - Os quatro números do topo aparecem nos três menus e levam ao menu certo. O endereço antigo `/area` (e avisos antigos com `#aprovacoes` ou `#capacidade`) leva para o menu novo correspondente.
- **[Decisão V1]** Em **Iniciativas da área** e **Projetos da área**, clicar numa iniciativa ou projeto abre logo abaixo o **mesmo detalhe da Avaliação do PMO** (problema, resultado esperado, solicitante, urgência, custo etc.). Nas aprovações, o detalhe aparece antes dos botões de decisão. Se já virou projeto, traz também o **andamento do projeto**: GP, farol, início, fim previsto, fase atual, desvio, tarefas concluídas e atrasadas, riscos abertos, próximo marco e último status.

- **[Protótipo]** O gestor pode **Aprovar e enviar ao PMO** ou **Devolver para ajuste** com um comentário.
- **[Implícita]** A iniciativa devolvida volta para o solicitante, que vê o comentário e o botão "Ajustar e reenviar". Ao reenviar, volta para o gestor.
- **[Decisão V2]** **Não seguir:** além de aprovar ou devolver, o gestor pode decidir não seguir com a iniciativa. Exige um **motivo** (a mesma lista de motivos de recusa das Configurações) e um **comentário** para o solicitante (mín. 5 caracteres). A iniciativa vai para **Cancelados** com o motivo "motivo — comentário", o solicitante é avisado e vê na Início "<gestor> decidiu não seguir · motivo: …". Não volta para a esteira; se o problema reaparecer, abre-se uma iniciativa nova.
- **[Decisão V2]** **Prioridade da área:** em Iniciativas da área, o gestor ordena (setas ↑ ↓) as iniciativas que ele aprovou e que ainda esperam o PMO (aguardando o PMO ou no backlog). Quem ordena é o gestor que aprovou; se não houver, o responsável da área. Sem ordem definida, vale a ordem de chegada (mais antigas primeiro), e as novas entram no fim. O PMO vê na Avaliação "prioridade da área: 2ª de 4 para Fernanda". É informação para o PMO: não muda a nota nem a decisão.
- **[Decisão V2]** **Substituto do gestor:** em Gestão do time, o gestor indica um substituto (outra pessoa com perfil de gestor) por um período (de/até, inclusive). No período, o substituto vê e decide, junto com as dele, as aprovações de iniciativas ("no lugar de Fernanda"), os pedidos de alocação e o time do gestor (quanto cede, ausências), e vê na Início "Você está substituindo…". O gestor **continua podendo decidir** (se voltar antes, não fica travado), mas o **prazo de decisão** (5 dias, muro) passa a ser cobrado do substituto. A prioridade da área continua só com o gestor. O substituto é avisado ao ser indicado e se a substituição for cancelada.
- **[Decisão V2]** **Feedback do GP sobre quem foi cedido:** na página do projeto, seção **Contribuição da equipe**, o GP avalia cada pessoa da empresa que foi alocada no projeto (exceto ele mesmo e externos): **Superou**, **Atendeu** ou **Abaixo do esperado**, com comentário (obrigatório, mín. 10 caracteres, quando abaixo). Um feedback por pessoa por projeto, que o GP pode editar. Quando a participação termina (fim da última fase em que a pessoa estava alocada, ou projeto concluído) sem feedback, a Início do GP mostra **Feedbacks pendentes**. O gestor da pessoa é avisado e vê o histórico em Gestão do time ("Feedback dos GPs"). **Quem vê:** o GP, o gestor da pessoa (e quem o substitui no período) e o PMO na página do projeto. **A pessoa avaliada não vê** (decisão a validar).
- **[Protótipo]** O gestor define quanto cada pessoa do time pode ceder para projetos (0–100%, passos de 10).
- **[Protótipo]** Pessoa acima do cedido = alocação atual maior que o limite.
- **[Decisão V2]** **Ausências do time:** em Gestão do time, o gestor registra férias, licenças, treinamentos ou outras ausências de cada pessoa (de/até, inclusive; só atuais ou futuras). A pessoa aparece com "Ausente agora" no período. Efeitos: (1) no relatório **Capacidade por área e mês** e na folga da Avaliação, o que a pessoa cede é descontado na proporção dos dias fora no mês (metade do mês fora = metade do cedido; marcado com *); (2) o **GP** de cada projeto em execução em que a pessoa está alocada numa fase que cruza o período recebe uma notificação no registro e vê na Início "<pessoa> estará ausente", até a ausência acabar.
- **[Protótipo]** Pedido de alocação: o gestor **cede** (o limite sobe pelo valor pedido) ou **recusa** (o GP é avisado).
- **[Decisão V2]** **Impacto antes de ceder:** cada pedido mostra como a pessoa fica nos próximos 6 meses: carga total em projetos (pico do mês, todos os projetos em execução + o projeto que pede, mesmo antes do play, se já tiver cronograma), o que sobra para a área (100% − carga) e o limite novo (atual + pedido, até 100%). Cada mês fica em roxo (cabe no limite atual), âmbar (só cabe se ceder) ou vermelho (passa até do novo limite), com um resumo em uma frase.

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
- **[Decisão V2]** **Quem participa vê o projeto em modo leitura:** além do GP e do PMO (que editam), quem participa do projeto (alocado em alguma fase, responsável por fase ou por tarefa) abre a página do projeto em **modo leitura**: a sua parte (alocação, gates e tarefas), o andamento (o mesmo detalhe dos menus do gestor), as fases, os últimos 5 status publicados, os **pontos de atenção** (pode abrir) e o **balanço e lições** (pode registrar). Não vê a linha do tempo editável, o financeiro, as mudanças, o feedback da equipe nem a linha de **custo** do balanço. Na Início do colaborador, o bloco **Projetos em que você participa** lista os projetos em execução ou pausados em que a pessoa participa.
- **[Decisão V2]** **Patrocinador acompanha o projeto:** o patrocinador (pessoa ligada à iniciativa, §3) vê na Início o bloco **Projetos que você patrocina** (em execução e pausados: GP, fim previsto, último status, farol e alertas de custo, status atrasado e mudanças aguardando o PMO) e abre o projeto em modo leitura ("VOCÊ PATROCINA"). Além do que os participantes veem, ele vê **Custo e mudanças** (orçado, realizado, previsto no fim e situação, e os últimos pedidos de mudança de escopo e de custo) e a linha de custo do balanço. Ele continua recebendo os status publicados e o aviso de conclusão. Quem decide as mudanças continua sendo o PMO.
- **[Decisão V2]** **Aceite na conclusão por quem está configurado:** o botão **Concluir projeto** aparece para quem pode confirmar a passagem para Concluído, pelo aprovador configurado na raia (Configurações): o GP (padrão), o **Patrocinador** ou o Solicitante, que o veem na visão de leitura do projeto. O PMO sempre pode. A Início do GP só sugere "Concluir o projeto" quando é ele quem confirma; quando o aceite é do patrocinador, o bloco **Projetos que você patrocina** avisa "aguardando o seu aceite para concluir" assim que todas as fases forem confirmadas.
- **[Decisão V2]** **Quem pediu acompanha o projeto:** quem pediu a iniciativa também abre o projeto que nasceu dela em modo leitura (sem a seção "Sua parte", se não participa), pelo botão **Acompanhar projeto →** em "Suas iniciativas" na Início (em execução, pausado ou concluído). A visão de leitura mostra também o **benefício esperado**, e quem pediu registra o resultado medido quando chega a data (regra de Benefícios, §11).
- **[Decisão V2]** **Trocar o gerente do projeto:** o PMO troca o GP na página do projeto (bloco "Gerente do projeto"), por exemplo quando o GP sai da empresa ou muda de função. Pode ser qualquer pessoa interna não desativada; quem ainda não tem o perfil GP passa a ter (como no play). O novo e o antigo GP são avisados e a troca fica no histórico do projeto. Tudo que "conta para o GP" (tarefas sem responsável, fases sem responsável, pedidos de prazo, feedbacks) passa ao novo GP; responsáveis definidos por nome continuam como estão. Se o GP atual foi desativado, o bloco fica em destaque.
- **[Decisão V2]** **Editar tarefa:** o GP do projeto ou o PMO corrige o título, o responsável e o prazo de uma tarefa (botão ✎ no detalhe da fase), sem apagar e criar de novo. O novo responsável é avisado; se só o prazo mudou, o responsável é avisado do novo prazo. Se houver um **pedido de mais prazo** aguardando o GP para aquela tarefa, o prazo não muda por aqui: o GP decide o pedido (é o que fica registrado no muro).
- **[Protótipo]** Status do projeto: precisa de data e "O que avançou?". Grava o farol e o desvio do momento.
- **[Protótipo]** Alocação por fase em passos de 10% (mínimo 10%). Ao alocar uma pessoa, entram 20%. Fornecedor externo não tem limite de cedência.
- **[Implícita]** Alocar acima do cedido **gera um pedido de alocação** ao gestor da pessoa ("vai pedir aprovação ao gestor da área").
- **[Implícita]** Atualizar uma linha de base já congelada exige **aprovação do PMO** (tela inicial do PMO: "Pedido para alterar linha de base"). O PMO decide na própria página do projeto.
- **[Implícita]** O GP confirma o fim de cada fase pelo critério de conclusão da biblioteca (tela inicial do GP: "Confirmar o fim de uma fase · critério: contrato assinado").
- **[Decisão V1]** % concluído do projeto = tarefas concluídas ÷ total de tarefas.
- **[Decisão V2]** **Concluir pela página do projeto:** quem confirma a passagem para Concluído (pela configuração da raia, o GP; o PMO sempre pode) vê na seção **Balanço e lições aprendidas** o botão **Concluir projeto**, com o mesmo checklist do gate do Portfólio (padrão: aceite da entrega pelo solicitante, obrigatório; lições aprendidas registradas, opcional). O servidor valida a permissão e os critérios. O solicitante, o PMO, o GP e o patrocinador são avisados. Quando todas as fases tiveram o fim confirmado, a Início do GP mostra **Concluir o projeto**. Só vale quando a raia seguinte à execução é Concluído (se houver uma raia nova no meio, a passagem continua pelo Portfólio).

## 8. Telas iniciais ("Precisa de você")

Na V1, todos os itens e números são **calculados a partir dos dados reais**:

- **PMO:** iniciativas prontas para avaliar · projetos críticos · pedidos de mudança de linha de base · status da semana atrasados (mais de 7 dias sem status) · pré-projetos prontos para o play (prontidão) · pessoas acima do cedido.
- **Gestor:** aprovações pendentes (obrigatórias primeiro) · pedidos de alocação · pessoas do time acima do cedido.
- **GP:** status da semana a publicar · tarefas atrasadas · pedidos de alocação aguardando o gestor · fases a confirmar · projeto pronto para concluir (todas as fases confirmadas).

> **[Decisão V2]** Desde o Meu TARS (abaixo), esses itens são reunidos numa caixa única por pessoa, com todos os papéis dela, em ordem de prioridade.
- **Colaborador:** suas iniciativas com o passo atual · suas tarefas em projetos.

> **[Decisão V1]** No protótipo, alguns números eram ilustrativos e não batiam entre telas (ex.: "13 prontas para avaliar" na tela inicial e 9 linhas na Avaliação). Na V1, todas as telas leem a mesma base, então os números do seed podem ser diferentes dos do protótipo, mas são sempre consistentes entre si.

### Meu TARS (V2)

- **[Decisão V2]** A Início passou a se chamar **Meu TARS** (menu e topo da tela), em todos os perfis (pedido da Mariana). Os painéis de cada perfil continuam (cartões dos projetos, números do portfólio, ciclo, projetos da área), mas o **Precisa de você** virou uma **caixa única**: tudo que depende da pessoa, em **todos os papéis dela** (o que é dela como colaborador, gestor, GP, PMO e patrocinador), sem repetir, na mesma lista, qualquer que seja o perfil ativo.
- **[Decisão V2]** **Ordem de prioridade** (grupos, nesta ordem): **Atrasado** (já venceu) → **Vence hoje** → **Alguém está esperando por você** (decisões e respostas que travam outra pessoa: aprovações, pedidos de alocação e de prazo, pontos de atenção, mudanças, avaliação do ciclo, aceite) → **Nos próximos 7 dias** → **Para fazer** (sem data: iniciativa devolvida, rascunho, benefício para medir, feedbacks, concluir projeto) → **Mais adiante** → **Para acompanhar** (alertas sem ação direta: projetos críticos, custo, riscos, muro do time, pessoas acima do cedido). Dentro do grupo, pela data. Quando a pessoa tem mais de um papel, cada item mostra de onde veio (Você, Gestor, GP, PMO, Patrocinador).
- **[Decisão V2]** As **entregas da própria pessoa** (tarefas, gates e status report) entram uma a uma: atrasadas e as que vencem em até 7 dias (o status, pela cadência do projeto); as demais viram uma linha "N entregas mais adiante", que leva a Minhas entregas. As decisões do gestor entram pelo bloco do gestor, com o prazo de 5 dias (§11). O antigo aviso "Você tem N entregas atrasadas" deu lugar aos itens atrasados, um a um.

- **[Decisão V2]** **Novidades:** os avisos que o TARS manda para a pessoa (aprovações, devoluções, pedidos, conclusões, trocas…) aparecem no Meu TARS, logo abaixo do Precisa de você, com os não lidos em destaque (até 5), e o menu **Meu TARS** mostra quantos não lidos há. **Abrir** um aviso marca como lido e leva ao lugar certo. **Marcar todas como lidas** limpa o contador. O **histórico** fica guardado (página Novidades, os 200 mais recentes, agrupados em Hoje, Ontem, Nos últimos 7 dias e Antes). No **"ver como"**, o admin vê os avisos da pessoa escolhida, mas não muda o que ela leu ou não.

- **[Decisão V2]** **Planejar o dia e a semana** (Meu TARS): cada item da caixa tem **Planejar…**, com as opções **Fazer hoje**, **Esta semana**, **Deixar para depois** e **Lembrar em…** (adiar até uma data, até um ano à frente). Os itens planejados sobem para **Meu plano para hoje** e **Meu plano para esta semana**, no topo da caixa. O "hoje" vale só naquele dia: no dia seguinte, se ainda for a mesma semana, vira "esta semana"; a "semana" vale até domingo. Depois disso, o item volta ao grupo normal de prioridade. **Deixar para depois** e **Adiados** ficam recolhidos no fim da caixa; o adiado volta sozinho na data do lembrete.
- **[Decisão V2]** O plano é **pessoal**: só a própria pessoa vê e muda. Ele **não muda nenhum prazo oficial**: uma tarefa atrasada continua no muro mesmo deixada para depois, e o próprio item avisa "continua atrasado no muro". O **PMO não vê** o planejamento das pessoas (decisão da Mariana). No "ver como", o admin vê o plano da pessoa, mas não muda.

## 9. Adições da V1 que não existiam no protótipo

Itens que o protótipo sugeria mas não desenhava. Todos usam o mesmo visual:

- **Lista de Projetos** (menu PMO › Projetos): o protótipo apontava para um projeto só.
- **[Decisão V2] Todos os meus projetos** (menu do GP, no topo de MEUS PROJETOS): a mesma lista de Projetos, só com os projetos que a pessoa gerencia, em execução, pausados e concluídos. Os atalhos abaixo continuam só com os que estão rodando. Serve para voltar a um projeto concluído (lições, feedback da equipe, benefício).
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
- **[Decisão V2]** **Custos da área** (relatório do gestor): orçado, realizado e previsto no fim dos projetos da área e subáreas, somados no topo, com o mesmo cálculo e a mesma situação do Financeiro dos projetos. Filtros: etapa (em execução e pausados, o padrão; concluídos; todos), área (se cuida de mais de uma) e situação do custo. Na Início do gestor aparece **Projetos da área estourando o orçamento**.

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

### Dependências entre projetos
- **[Decisão V2]** O GP (ou o PMO) registra no projeto que ele **depende de uma entrega de outro projeto até uma data** (o que precisa receber e até quando). O GP do outro projeto é avisado, e a dependência aparece nos dois projetos ("depende de" e "dependem deste").
- **[Decisão V2]** Situação: **entregue** (o outro projeto foi concluído); **atrasada** (a data passou e ele não foi concluído); **em risco** (o fim previsto dele é depois da data); **sem data prevista** (ainda não virou projeto); **no prazo**.
- **[Decisão V2]** Dependências em risco ou atrasadas geram aviso na Início do PMO e dos GPs dos dois projetos. Relatório **Dependências entre projetos** (PMO).

### Encerramento e lições aprendidas
- **[Decisão V2]** A página do projeto mostra um **balanço** planejado × realizado: **prazo** (fim da linha de base × entregue/previsto), **custo** (orçado × gasto), **escopo** (mudanças aprovadas), **riscos** (mapeados × que ocorreram), **pontos de atenção** e **benefício** (meta × medido). Enquanto o projeto está em andamento, é o balanço parcial; depois de concluído, é o **balanço de encerramento**.
- **[Decisão V2]** Quem participa do projeto (GP, alocados, responsáveis de tarefa) ou o PMO registra **lições aprendidas** a qualquer momento: **o que funcionou** e **o que melhorar**. Quem escreveu ou o PMO pode remover.
- **[Decisão V2]** As lições de **projetos do mesmo modelo** aparecem na página de cada projeto. O relatório **Lições aprendidas** (PMO e GP) junta todas, com filtros de tipo, modelo e área.

### Muro da vergonha (prazos, responsáveis e alertas de atraso)
- **[Decisão V2]** **Prazos com dono**, cadastrados na seção **Prazos e responsáveis** do projeto (GP ou PMO):
  - **Status report:** cadência combinada por projeto (semanal, quinzenal ou mensal, a cada 4 semanas) e dia da semana (padrão: semanal, na sexta). O próximo status vence no dia combinado depois do último publicado; o primeiro vence no dia combinado depois de uma semana do início. Responsável: o GP. O "status atrasado" de todo o sistema passou a seguir essa cadência (antes era "mais de 7 dias sem status"). Na **Início do GP**, "Publicar o status" também segue a cadência: aparece quando o próximo status vence nos próximos 7 dias ("vence sexta, 23/10") ou já venceu (em vermelho, com os dias de atraso); com cadência quinzenal ou mensal, não é cobrado toda semana.
  - **Gate:** o fim de cada fase, pela linha do tempo. Cada fase tem um **responsável** (padrão: o GP), que **confirma o fim da fase** na data.
  - **Tarefa:** o prazo e o responsável de sempre (sem responsável, conta para o GP).
- **[Decisão V2]** **Minhas entregas** (menu, todos os perfis): cada pessoa vê o que é dela, atrasado, nos próximos 14 dias e mais adiante. As ações são: **concluir a tarefa**, **confirmar o fim da fase**, **publicar o status** (GP), **pedir mais prazo** (o GP aprova ou recusa; aprovado, a tarefa ganha o novo prazo e a fase é estendida até a nova data), **informar impedimento** (vira ponto de atenção para o GP) e **informar risco** (entra na fase, com a pessoa como responsável).
- **[Decisão V2]** **Atraso** = venceu e ninguém concluiu, nem pediu mais prazo. Com pedido de prazo aguardando o GP, o item fica "em negociação" e não entra no muro.
- **[Decisão V2]** **Alertas na Início:** a própria pessoa ("Você tem N entregas atrasadas", em todos os perfis), o **GP** (atrasos da equipe nos projetos dele, pedidos de mais prazo, impedimentos informados), o **gestor** (pessoas do time com entregas atrasadas) e o **PMO** (total do muro).
- **[Decisão V2]** **Decisões do gestor também têm prazo:** aprovar ou devolver uma iniciativa (desde o envio), responder um pedido de alocação (desde o pedido) e resolver um ponto de atenção enviado a ele (o prazo do ponto ou, sem prazo, desde a abertura). Prazo: **5 dias corridos**. Viram entregas do tipo "Decisão do gestor": aparecem em Minhas entregas (botão "Decidir" leva à tela certa), entram no muro quando vencem, contam no "Você tem N entregas atrasadas" do gestor e no alerta do gestor dele (time), e o PMO vê na Início "Decisões paradas com gestores há mais de 5 dias".
- **[Decisão V2]** **Muro da vergonha** (menu Relatórios): ranking por pessoa, por quantidade de atrasos e pelo maior atraso. O PMO vê todo o portfólio; o gestor vê o time e os projetos que gerencia; o GP vê as pessoas dos projetos dele; os demais veem só a si mesmos.
