# Como trabalhamos no TARS

Guia curto para quem desenvolve com o Claude Code, sem precisar saber programar.

## Primeira vez (uma vez só)

1. Crie uma conta no **GitHub** e peça ao Erico o convite de colaboradora no repositório `ericolucasm/tars-gpp`. Aceite o convite que chega por e-mail.
2. Tenha um plano do **Claude** com Claude Code (Pro ou superior).
3. Entre em **claude.ai/code**, conecte sua conta do GitHub e conecte o **ClickUp** em claude.ai → Configurações → Conectores (marque o workspace **TARS DEV**).
4. Abra uma sessão nova escolhendo o repositório `tars-gpp`. O ambiente se prepara sozinho (banco local e a empresa demo Acme).

## O dia a dia

```
ClickUp (task com responsável) → sessão do Claude → branch → Pull Request → link de preview → merge → no ar
```

1. **Escolha uma task** no ClickUp (lista Task List do TARS DEV) e coloque você como responsável. Assim ninguém pega a mesma task.
2. **Peça ao Claude**, por exemplo:
   > "Pega a task *Nome da task* no ClickUp, discute comigo e implementa."
3. O Claude explica o plano, implementa e roda os testes. Depois **abre um Pull Request** (o pedido para juntar a mudança ao sistema principal).
4. **Teste no preview**: no Pull Request, a Vercel comenta um link de teste com só essa mudança. Navegue por ele como usuária.
5. Tudo certo? Peça ao Claude: *"pode fazer o merge"*. Em 1 a 2 minutos a mudança está no ar.
6. Mova a task para **complete** no ClickUp.

## Status no ClickUp

| Status | Quem move | Significado |
|---|---|---|
| to do | quem cria | Ideia nova, ainda em discussão |
| aprovada | sócios | Combinado que vai ser feito |
| em desenvolvimento | Claude | Alguém está implementando |
| em teste | Claude | No ar ou no preview, aguardando validação |
| complete | sócios | Validado |
| cancelled | sócios | Descartado |

Use o campo **prioridade** (urgent, high, normal, low): é ele que define a ordem de implementação.

## Dicas

- **Uma task por vez, PRs pequenos.** Quanto menor a mudança, menos conflito entre duas pessoas mexendo ao mesmo tempo.
- **Descreva o problema, não só a solução**: "na tela X, quando faço Y, acontece Z; esperava W". Um print ajuda muito.
- Para testar como cada perfil, use a barra **"Ver como"** (só admins): escolha o perfil e, se quiser, uma pessoa específica.
