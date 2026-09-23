# Contracts

Contrato público da API (e eventos, se houver). Fonte da verdade entre Frontend e Backend.

Status: active

## Convenções

- Base URL: `http://localhost:3000`
- Formato: JSON
- Erro SQL: `{ "success": false, "error": "...", "code": "..." }`

## App (`alocados` no SQL)

### `GET /api/alocados`

- Auth: none
- Response 200: `{ success: true, source: "sql"|"cache", fetchedAt, cached, total, data: Funcionario[] }`
- Lista vazia é resposta válida (ADF ainda não carregou)
- O Express guarda a lista em memória por 15 minutos (`ALOCADOS_CACHE_TTL_MS`). Dentro do prazo a resposta sai do cache. Fora do prazo devolve o cache e atualiza o banco em segundo plano. `?refresh=1` espera uma leitura nova.
- `fetchedAt` é o horário da leitura no SQL, mesmo quando `cached` é true
- Erros: 503 se o banco não conectar
- Na Vercel a função `api/[...path].ts` é o mesmo Express: `/api/alocados`, `/api/users`, `/api/commercial-assignments` e `/api/sql/login`

### `ALL /api/users`

- Auth: none (dívida)
- Query/body: `action=getUsers|saveUser|deleteUser`
- Response 200: `{ success, data|users }` a partir de `alocados.users`

### `ALL /api/commercial-assignments`

- Auth: none (dívida)
- Query/body: `action=getAssignments|saveAssignments`
- Response 200: `{ success, data, all? }` a partir de `alocados.commercial_assignments`
- Cada item mantém as chaves `Grupo Economico`, `Nome Cliente`, `Comercial`

## Fatia 1 — SQL smoke (`/api/sql`)

### `GET /api/sql/health`

- Auth: none
- Response 200: `{ success: true, database: "up", schema: "alocados" }`
- Erros: 503 se Prisma não conectar

### `POST /api/sql/login`

- Auth: none
- Request: `{ username, password }`
- Response 200: `{ success: true, data: User }` no formato da tela (listas já parseadas)
- Erros: 400 se faltar campo; 401 se usuário ou senha não baterem com `alocados.users`
- A tela de login tenta esta rota antes da lista legada (`/api/users` / Sheets)

### `GET /api/sql/users`

- Auth: none
- Response 200: `{ success: true, total, data: User[] }`

### `POST /api/sql/users`

- Auth: none
- Request: `{ username, password?, role, email?, ... }`
- Response 201: `{ success: true, data: User }`
- Erros: 400, 409

### `GET /api/sql/employees`

- Auth: none
- Response 200: `{ success: true, total, data: Employee[] }` (limit default 50)

### `POST /api/sql/employees`

- Auth: none
- Request: subset de `Employee` (mínimo: `id`, `nome`, `isAtivo`)
- Response 201: `{ success: true, data: Employee }`

### `GET /api/sql/commercial-assignments`

- Auth: none
- Response 200: `{ success: true, total, data: CommercialAssignment[] }`

### `POST /api/sql/commercial-assignments`

- Auth: none
- Request: `{ comercial, grupoEconomico?, nomeCliente? }`
- Response 201: `{ success: true, data: CommercialAssignment }`

### `GET /api/sql/user-logs?userId=`

- Auth: none
- Response 200: `{ success: true, total, data: UserLog[] }`

## Fora desta fatia

- Substituir contratos Sheets pelos SQL no frontend
- Auth nas rotas SQL
