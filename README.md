# TARS GPP — Gestão de Portfólios e Projetos

V1 funcional do protótipo `prototipo/` (as 15 telas originais ficam no repositório como referência de design).
As regras de negócio e as decisões tomadas estão em **[REGRAS.md](REGRAS.md)**.

## Stack (e por quê)

| Peça | Papel |
|---|---|
| **Next.js 15** (App Router) | Telas e "backend" no mesmo projeto. As ações do usuário são *Server Actions*: funções que rodam no servidor e validam permissão e regra antes de gravar. |
| **Postgres** (Neon, via Vercel) + **Drizzle ORM** | Banco relacional. O Drizzle descreve as tabelas em TypeScript (`src/db/schema.ts`) e gera as migrações (`drizzle/`). |
| **Better Auth** + **Google** | Login com conta Google. Biblioteca que roda dentro do app e guarda sessões no próprio Postgres. Só entra quem está cadastrado em Pessoas. |
| **Vercel** | Hospedagem com deploy automático a cada push. |

## Organização do código

```
src/
  db/            schema.ts (tabelas) · seed.ts (empresa demo Acme) · index.ts (conexão)
  lib/regras/    REGRAS DE NEGÓCIO puras e testadas: esteira e gates, avaliação, projeto, pessoas, datas
  lib/visoes.ts  cálculos que cruzam dados (alocação, fase atual, lista da avaliação...)
  lib/sessao.ts  login, perfis e "ver como"
  app/acoes/     Server Actions (o "intertravamento": revalidam tudo no servidor)
  app/(app)/     uma pasta por tela
  components/    moldura (menu e barra "ver como") e peças visuais
prototipo/       protótipo original (fonte da verdade do design)
tests/e2e/       teste ponta a ponta do fluxo completo
```

Os estilos são copiados literalmente do protótipo com o helper `s()` (`src/lib/css.ts`), que converte o texto CSS em estilo do React.

## Rodar localmente

```bash
npm install
cp .env.example .env              # AUTH_MODE=dev: login escolhendo uma pessoa da demo
npm run db:migrate                # cria as tabelas e carrega a Acme (SEED_DEMO=true)
npm run dev                       # http://localhost:3000
npm test                          # testes das regras de negócio
npm run db:reset && npm run db:migrate   # zera e recarrega a demo
```

## Colocar no ar (Vercel + Neon + Google)

1. **Banco**: Vercel → Storage → Neon → conectar ao projeto com o prefixo `DATABASE` (cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED`).
2. **Google Cloud Console** → APIs e serviços → Credenciais → *Criar credenciais › ID do cliente OAuth* (tipo **Aplicativo da Web**):
   - Origem JavaScript autorizada: `https://SEU-DOMINIO`
   - URI de redirecionamento autorizado: `https://SEU-DOMINIO/api/auth/callback/google`
3. **Vercel → Settings → Environment Variables**: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (`https://SEU-DOMINIO`), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SEED_DEMO=true`, `TARS_ADMIN_EMAIL` e `TARS_ADMIN_NOME`.
4. Deploy. O `vercel-build` aplica as migrações (e cria você como PMO + Admin) e depois compila.

### Previews (um link por branch)

Cada branch ganha um endereço fixo: `tars-gpp-git-<branch>-ericolucasms-projects.vercel.app`. O Google só aceita o endereço de produção, então o preview manda o login para a produção, que confere com o Google e devolve a pessoa para o preview (plugin `oAuthProxy` do Better Auth). Para funcionar, na Vercel:

- `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` marcados também para **Preview**, com o **mesmo valor** da produção.
- `DATABASE_URL` no Preview. Recomendado: na integração Neon, ligar a criação de um **branch de banco por preview**, para os testes não mexerem nos dados de produção.
- Use o link da branch (o que a Vercel comenta no Pull Request).

Para dar acesso a alguém: **Cadastros → Pessoas → Liberar acesso** com o e-mail Google da pessoa. Ela entra com "Entrar com Google". E-mails não cadastrados veem "Este e-mail ainda não tem acesso".

> ⚠️ `AUTH_MODE=dev` deixa qualquer pessoa entrar sem senha. Use só localmente.

## Segurança do banco

O TARS acessa o banco só pelo servidor. Mesmo assim, **toda tabela nasce com RLS ligado e sem políticas** (migrações `0001` e `0002`): se um dia o banco for exposto por uma API REST (como a do Supabase), nada fica aberto por acidente. **Ao criar uma tabela nova, inclua o `ENABLE ROW LEVEL SECURITY` na migração.**

## Teste ponta a ponta

Com o servidor rodando em modo dev e a demo recém-carregada:

```bash
npm i -D playwright && npx playwright install chromium
npm run test:e2e
```

Ele percorre o fluxo inteiro pelos quatro perfis: envio → devolução → reenvio → avaliação → comunicação → play → linha de base → pedido de mudança → aprovação → pedido de alocação.
