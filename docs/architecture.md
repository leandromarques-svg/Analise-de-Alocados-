# Architecture

Status: active

## Contexto

Dashboard React/Vite de alocados com Express local. Fonte de leitura e gravação: SQL Server, schema `alocados`. Google Sheets e o cache JSON saíram do caminho do app. A carga dos dados é do Data Factory.

## Limites

- Frontend (raiz `src/`): React + Vite — permanece; sem Next.js nesta fatia
- Backend (`server.ts` + `src/server/`): Express com routers
- Banco: SQL Server / Azure SQL. `dbo` = tabelas de terceiros, compartilhadas. `alocados` = o que este app lê
- Provedores externos: Data Factory grava só o `dbo`. `employees` é view no schema do app

## Fluxo

1. Dev sobe SQL Server local (Docker) e configura `DATABASE_URL`
2. `prisma migrate` cria o schema `alocados`, as tabelas do app e a view `employees` sobre o `dbo`
3. Express sobe sem buscar planilha nem ler o JSON de cache
4. `/api/alocados` lê a view. `/api/users` e `/api/commercial-assignments` leem e gravam tabelas do schema
5. O frontend chama só essas rotas. Login usa `POST /api/sql/login`

## Stack

| Camada    | Escolha                      | Notas                               |
| --------- | ---------------------------- | ----------------------------------- |
| Frontend  | React 19, Vite, TS, Tailwind | legado do projeto; ADR-001          |
| Backend   | Express (Node/TS)            | legado; ADR-001 (desvio de FastAPI) |
| ORM       | Prisma                       | ADR-002                             |
| Banco     | SQL Server / Azure SQL       | schema `alocados`; ADR-003          |
| Auth      | localStorage + JSON (legado) | fora desta fatia                    |
| Deploy FE | Vercel                       | build Vite                          |
| Deploy BE | Express na função Vercel     | `api/[...path].ts` usa o mesmo app  |

## Variáveis de ambiente (nomes, sem valores)

- `DATABASE_URL` — connection string SQL Server / Azure SQL
- `APP_URL` — legado
- `PORT` — servidor Express (default 3000)
- `ALOCADOS_CACHE_TTL_MS` — validade do cache em memória de `/api/alocados` (default 900000, 15 min)

## O que não construir agora

- Microserviços, filas, multi-tenant, Kubernetes
- Job no Express copiando Google Sheets (a carga é do Data Factory)
- Next.js App Router
- JWT / Entra ID

## Observabilidade mínima

- Logs no Express (`console` com prefixos `[METARH …]`)
- Erro JSON nas rotas `/api/sql/*`
- Prisma errors mapeados para 4xx/5xx
