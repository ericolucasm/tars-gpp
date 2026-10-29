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
| Gestor de área | Início, Visão da área, Nova iniciativa | [Protótipo] |
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

## 4. Aprovação do gestor (Visão da área)

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

## 7. Projeto (visão do GP e do PMO)

- **[Protótipo]** Linha do tempo em semanas. As barras de fase podem ser arrastadas (mover) e redimensionadas (duração). Fases podem ser adicionadas pela biblioteca e removidas.
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
- **Faixa de decisão da mudança de linha de base** na página do projeto (PMO aprova ou recusa).
- **Confirmar fim de fase**, no detalhe da fase, com o critério de conclusão da biblioteca.
- **Status do marco**: clicar na etiqueta alterna Previsto → Em risco → Atingido.
- **Editores em Cadastros**: convidar e editar pessoa, nova área, nova fase, novo modelo, adicionar e remover motivo, salvar pesos.
- **Ciclo de vida do ciclo**: "Novo ciclo", "Abrir inscrições", "Encerrar ciclo".
- **[Decisão V1] Alocação de uma pessoa** = pico de alocação simultânea nas fases ainda não concluídas dos projetos em execução. Isso enxerga a sobrecarga que vem pela frente, não só a de hoje.
- **[Decisão V1] Rótulos com gênero** ("Gestora", "Ativa") só quando o cadastro informa o tratamento. Sem essa informação, o sistema usa a forma neutra ("Gestor(a)").

## 10. Fora do escopo da V1 (fase 2)

Envio de e-mails e avisos agendados · anexos · importar planilha de pessoas · integração com Microsoft Entra (AD) · abas cinzas de Configurações (Empresa, Modo de captação, Notificações, Plano e cobrança) · multiempresa com cobrança.
