# Banco de dados (schema `alocados`)

SQL Server local (Docker) espelha o Azure SQL. As migrations criam o schema `alocados`. O Data Factory carrega o `dbo`. O dashboard lê o schema `alocados`.

## Setup local

1. Copie `.env.example` → `.env` (já contém `DATABASE_URL` local).
2. Suba o SQL Server:

```bash
npm run db:up
```

3. Crie o database `alocados_db`:

```bash
npm run db:ensure
```

4. Gere client + rode migrations:

```bash
npm run db:generate
npm run db:migrate
```

`db:migrate` aplica as migrations que já estão em `prisma/migrations/`. Use esse comando no banco local e no Azure SQL.

No teste, `alocados.employees` permanece tabela: as `dbo.TB_*` não existem. Em produção, a mesma migration remove a tabela e cria a view `alocados.employees` sobre o `dbo`. O app lê esse nome nos dois ambientes.

5. Suba o app:

```bash
npm run dev
```

6. Smoke:

- `GET http://localhost:3000/api/sql/health`
- `POST http://localhost:3000/api/sql/users` com `{ "username": "teste", "role": "RH" }`
- `GET http://localhost:3000/api/alocados` (lista do SQL; no Docker local pode vir vazia)

## Azure SQL (prod)

Ajuste `DATABASE_URL` na variável do ambiente (local no `.env`, na Vercel no painel do projeto):

```
sqlserver://YOUR_SERVER.database.windows.net:1433;database=YOUR_DB;user=YOUR_USER;password=YOUR_PASSWORD;encrypt=true
```

Crie o database no portal (ou T-SQL) e rode `npx prisma migrate deploy`.

O schema lógico `alocados` e as tabelas vêm das migrations versionadas em `prisma/migrations/`.
