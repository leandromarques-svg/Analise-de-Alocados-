# Backlog

Ordem = prioridade. Cada item é uma **fatia vertical**.

## Fatia ativa

F-002 (app lê e grava o schema `alocados`; Sheets fora do caminho)

## Itens

### F-001 — Persistência SQL schema `alocados` (Prisma + Express routers)

- Status: qa
- Valor: base testável para Azure SQL sem interromper o dashboard Sheets
- Aceite:
  - [x] Schema `alocados` com `users`, `user_logs`, `commercial_assignments`, `employees`
  - [x] Migrations Prisma geradas e documentadas
  - [x] Express fatiado em routers; Sheets/cache preservados
  - [x] Rotas `/api/sql/*` permitem smoke test (health + CRUD mínimo)
  - [x] Docs da fábrica atualizados (product, architecture, contracts, data-model, ADRs)
- Dependências: nenhuma
- Notas: smoke Prisma ok; validar `/api/sql/health` com `npm run dev`

### F-002 — App lê 100% o schema `alocados`

- Status: qa
- Valor: dashboard, usuários e carteira passam a ler e gravar SQL; Google Sheets sai do caminho de leitura
- Aceite:
  - [x] `/api/alocados`, `/api/users` e `/api/commercial-assignments` usam as tabelas do schema
  - [x] Nenhuma carga da planilha no Express nem no frontend
- Dependências: F-001. A carga dos 18 mil alocados continua no Data Factory; o banco local pode estar vazio até essa carga.
- Notas: login em `POST /api/sql/login`. Sem cache JSON e sem Apps Script no boot do servidor.

## Dívida explícita

- Auth ainda é localStorage + senha em JSON (inadequado para produção)
- Senhas em texto claro no JSON legado
- Testes automatizados da fatia SQL ainda não existem (Pytest/Vitest não aplicam ao Express atual; dívida: smoke manual ou script)
