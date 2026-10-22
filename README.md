# TARS GPP — Gestão de Portfólios e Projetos

V1 funcional do protótipo `prototipo/` (as 15 telas originais ficam no repositório como referência de design).
As regras de negócio e as decisões tomadas estão em **[REGRAS.md](REGRAS.md)**.

## Stack (e por quê)

| Peça | Papel |
|---|---|
| **Next.js 15** (App Router) | Telas e "backend" no mesmo projeto. As ações do usuário são *Server Actions*: funções que rodam no servidor e validam permissão e regra antes de gravar. |
| **Postgres** (Supabase) + **Drizzle ORM** | Banco relacional. O Drizzle descreve as tabelas em TypeScript (`src/db/schema.ts`) e gera as migrações (`drizzle/`). |
| **Supabase Auth** | Login por e-mail e senha, convites e recuperação de senha. |
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

## Colocar no ar (Supabase + Vercel)

1. **Supabase**: crie o projeto (região São Paulo).
2. **Vercel → Settings → Environment Variables** (ou use a integração Vercel + Supabase, que preenche quase tudo):
   - `DATABASE_URL`: string de conexão do pooler (porta 6543). Se usar a integração, ela cria `POSTGRES_URL` e `POSTGRES_URL_NON_POOLING`, que também funcionam.
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `SEED_DEMO=true` (carrega a Acme no primeiro deploy, se o banco estiver vazio)
   - `TARS_ADMIN_EMAIL` e `TARS_ADMIN_NOME`: **seu acesso real** (vira PMO + Admin)
3. **Supabase → Authentication → Users → Add user**: crie o usuário com o mesmo `TARS_ADMIN_EMAIL` e uma senha.
4. **Supabase → Authentication → URL Configuration**: em *Site URL*, coloque a URL da Vercel. Em *Redirect URLs*, adicione `https://SEU-APP.vercel.app/auth/definir-senha`.
5. Faça um novo deploy. O comando `vercel-build` aplica as migrações e depois compila.

Daí em diante, convide as pessoas em **Cadastros → Convidar pessoa**: o Supabase envia o e-mail para cada uma criar a senha.

> ⚠️ `AUTH_MODE=dev` deixa qualquer pessoa entrar sem senha. Use só localmente ou numa demo privada.

## Segurança do banco

O Supabase expõe o schema `public` numa API REST que pode ser chamada com a chave anon (pública). O TARS não usa essa API: o servidor fala direto com o Postgres. Por isso, **toda tabela nasce com RLS ligado e sem políticas**, o que fecha a API pública (migração `0001`). **Ao criar uma tabela nova, inclua o `ENABLE ROW LEVEL SECURITY` na migração.**

## Teste ponta a ponta

Com o servidor rodando em modo dev e a demo recém-carregada:

```bash
npm i -D playwright && npx playwright install chromium
npm run test:e2e
```

Ele percorre o fluxo inteiro pelos quatro perfis: envio → devolução → reenvio → avaliação → comunicação → play → linha de base → pedido de mudança → aprovação → pedido de alocação.
