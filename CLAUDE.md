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
   Status: `to do` → `aprovada` → `em desenvolvimento` → `em teste` → `complete` (`cancelled` para descartadas).
   - `to do`: leia e discuta (comente na task o entendimento, o impacto, o esforço e as dúvidas). Não implemente sem aprovação.
   - `aprovada`: implemente em ordem de prioridade (urgent → high → normal → low; sem prioridade = normal, por ordem de criação).
   - Ao começar, mova para `em desenvolvimento`. Ao publicar, mova para `em teste` e comente o que mudou, como testar e o link do commit ou PR.
   - `complete` quem move são os sócios, depois de validar.
2. **Branch por task** → Pull Request para a `main`. A Vercel gera um link de preview por PR. Merge na `main` = produção.
3. Antes de abrir o PR: `npm run typecheck && npm test`. Se mexeu em fluxo de tela, rode também o e2e.
4. Dois devs trabalham em paralelo: cada task tem um responsável no ClickUp; prefira PRs pequenos para evitar conflito.

## Cuidados

- `AUTH_MODE=dev` só local, nunca em produção.
- Nunca peça nem cole segredos no chat; as variáveis de produção ficam na Vercel.
- Não mude comportamento que ninguém pediu. Se achar um problema fora do escopo, comente na task em vez de corrigir por conta própria.
- Use pronomes neutros para pessoas cujo gênero não foi informado.
