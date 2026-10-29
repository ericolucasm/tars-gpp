# TARS GPP — guia para sessões do Claude

Sistema de gestão de portfólio e projetos (PMO). Projeto dos sócios Erico e Mariana. Responda em **português**.
Quem pede mudanças tem lógica sólida, mas não é dev: explique o "porquê" das decisões e diga quando algo é prática de mercado ou atalho.

## Fontes da verdade

- **`prototipo/`** — protótipo original (HTML). Telas, textos, cores e interações seguem ele à risca.
- **`REGRAS.md`** — regras de negócio, marcadas como [Protótipo], [Implícita] ou [Decisão V1]. Ao criar ou mudar uma regra, atualize o REGRAS.md no mesmo commit.
- **`README.md`** — stack, organização das pastas, deploy.

## Ambiente

O hook `.claude/hooks/session-start.sh` já instala as dependências, sobe o Postgres local e carrega a demo **Acme**.
Se o container reiniciar e o banco cair: `CLAUDE_CODE_REMOTE=true CLAUDE_PROJECT_DIR=$PWD .claude/hooks/session-start.sh`.

```bash
npm run dev                      # http://localhost:3000 (AUTH_MODE=dev: login escolhendo uma pessoa da demo)
npm run typecheck                # TypeScript
npm test                         # regras de negócio (vitest)
npm run test:e2e                 # fluxo completo no navegador (precisa do dev server e da demo recém-carregada)
npm run db:reset && npm run db:migrate   # zera e recarrega a demo
npm run db:generate              # gera migração depois de mudar src/db/schema.ts
```

O Playwright já vem instalado no container (`require('playwright')`); não rode `playwright install`.

## Arquitetura (onde mexer)

- `src/lib/regras/` — regras puras e testadas (esteira e gates, avaliação, projeto, pessoas, datas). **Regra nova entra aqui, com teste.**
- `src/lib/visoes.ts`, `src/lib/ciclo-vm.ts` — cálculos que cruzam dados para as telas.
- `src/lib/dados.ts` — `carregarOrg` carrega um retrato da empresa por requisição.
- `src/lib/sessao.ts` — login, perfis (colaborador, gestor, gp, pmo), admin, "ver como" e modo coringa (`temPerfil`).
- `src/app/acoes/` — Server Actions. Sempre `executar(async () => { ... })` + `exigir(...)`/`ErroRegra` para validar no servidor. Nunca confie só na tela.
- `src/app/(app)/<tela>/` — uma pasta por tela. Estilos copiados do protótipo com `s('...css...')` (`src/lib/css.ts`).
- `src/db/schema.ts` + `drizzle/` — tabelas e migrações. **Toda tabela nova: `ENABLE ROW LEVEL SECURITY` na migração.**
- `src/db/seed.ts` — demo Acme (datas relativas a 17/10/2026).

## Fluxo de trabalho

1. **Tarefas vêm do ClickUp** — workspace "TARS DEV" (id `1600390000001547`), lista "Task List" (id `1600390000006463`).
   Status: `backlog` → `to do` → `em desenvolvimento` → `em teste` → `complete` (`cancelled` para descartadas).
   - `backlog`: toda task nova nasce aqui. Se pedirem, leia e discuta (comente entendimento, impacto, esforço e dúvidas). **Nunca implemente a partir do backlog.**
   - `to do`: os sócios liberaram para implementar. Implemente direto, sem pedir confirmação, em ordem de prioridade (urgent → high → normal → low; sem prioridade = normal, por ordem de criação).
   - Ao começar, mova para `em desenvolvimento` (isso também evita que outra sessão pegue a mesma task). Ao terminar, mova para `em teste` com o comentário de entrega abaixo.
   - `complete` quem move são os sócios, depois de validar. O merge na `main` só acontece quando um sócio pedir.
   - Se a task for ambígua a ponto de as interpretações levarem a entregas diferentes, ou depender de algo externo (conta, chave, decisão de negócio), não chute: comente as perguntas, devolva para `backlog` e siga para a próxima.
2. **Comentário de entrega (obrigatório, em português, para quem pediu):**
   - **Entendimento:** o que foi pedido e o diagnóstico (ex.: por que a pessoa não encontrava a função).
   - **O que mudou:** por tela/perfil, em linguagem de usuário.
   - **Decisões tomadas e por quê:** cada regra decidida, a justificativa e a alternativa descartada. Peça validação.
   - **Como testar:** roteiro curto com as pessoas da demo (dropdown "Admin · ver como").
   - **Validação feita:** testes e e2e que rodaram e o resultado; o que não foi possível validar.
   - **Impacto técnico e riscos:** banco (migrações), segurança, o que pode quebrar.
   - **Links:** Pull Request e preview.
3. **Branch por task** → Pull Request para a `main`. A Vercel gera um link de preview por PR. Merge na `main` = produção.
4. Antes de abrir o PR: `npm run typecheck && npm test`. Se mexeu em fluxo de tela, rode também o e2e e inclua um passo novo quando o fluxo for novo.
5. Dois devs trabalham em paralelo: cada task tem um responsável no ClickUp; prefira PRs pequenos para evitar conflito.
6. **Verificação automática:** uma tarefa agendada abre uma sessão periodicamente para implementar o que estiver em `to do`, seguindo exatamente este fluxo.

## Cuidados

- `AUTH_MODE=dev` só local, nunca em produção.
- Nunca peça nem cole segredos no chat; as variáveis de produção ficam na Vercel.
- Não mude comportamento que ninguém pediu. Se achar um problema fora do escopo, comente na task em vez de corrigir por conta própria.
- Use pronomes neutros para pessoas cujo gênero não foi informado.
