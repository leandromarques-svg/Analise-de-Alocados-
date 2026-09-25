# AGENTS.md — roteamento deste MVP

Este repositório segue a Software Factory (regras em `~/.cursor/rules/`).

## Como trabalhar

1. Leia `docs/product.md` e `docs/backlog.md`.
2. Siga as fases em `00-workflow` (não pule gates).
3. Atue em **um papel por vez**.

## Papéis

| Papel | Quando | Docs |
| --- | --- | --- |
| Product | Escopo, MVP, prioridade | `docs/product.md`, `docs/backlog.md` |
| Architecture | Limites, stack, ADRs | `docs/architecture.md`, `docs/decisions.md` |
| Frontend | UI React/Vite existente | `docs/contracts.md` |
| Backend | API Express | `docs/contracts.md` |
| Database | Modelo e migrations | `docs/data-model.md` |
| QA | Aceite e testes | `docs/definition-of-done.md` |
| Security | Auth, PII, segredos | checklist da fatia |
| Deployment | Vercel + backend | `docs/architecture.md` |

## Layout

- Raiz: frontend Vite/React + `server.ts` (Express)
- `prisma/` — schema e migrations (SQL Server, schema `alocados`)
- `src/server/` — routers e serviços Express
- `api/` — funções serverless Vercel (legado Sheets)

## Estado atual

- Fase: implementation
- Fatia ativa: F-002 — o app lê e grava o schema `alocados`; Google Sheets saiu do caminho de leitura
