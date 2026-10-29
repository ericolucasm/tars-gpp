#!/bin/bash
# Prepara uma sessão do Claude Code na nuvem para desenvolver o TARS:
# dependências, Postgres local com a demo Acme e .env de desenvolvimento.
# Idempotente: pode rodar várias vezes sem estragar nada.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# 1. Dependências (npm install aproveita o cache do container)
npm install --no-audit --no-fund

# 2. .env local (login sem senha escolhendo uma pessoa da demo)
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$(openssl rand -base64 32)|" .env
fi

# 3. Postgres local
if ! command -v psql >/dev/null 2>&1; then
  echo "Postgres não encontrado no container; pulei o banco local." >&2
  exit 0
fi
service postgresql start >/dev/null
for _ in $(seq 1 30); do
  pg_isready -q -h localhost && break
  sleep 1
done
su postgres -c "psql -tAc \"select 1 from pg_roles where rolname='tars'\"" | grep -q 1 \
  || su postgres -c "psql -c \"create role tars login superuser password 'tars'\""
su postgres -c "psql -tAc \"select 1 from pg_database where datname='tars'\"" | grep -q 1 \
  || su postgres -c "createdb -O tars tars"

# 4. Migrações + demo Acme (o seed só roda com o banco vazio)
DATABASE_URL=postgresql://tars:tars@localhost:5432/tars SEED_DEMO=true npm run db:migrate
