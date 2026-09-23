# Decisions (ADRs)

Registre desvios da stack padrão e escolhas que doem para reverter.

## ADR-001 — Manter Express + Vite (desvio de FastAPI + Next.js)

- Data: 2026-09-21
- Status: accepted
- Contexto: O projeto já existe com Vite/React e Express monolítico; a prioridade é SQL testável sem reescrever o front.
- Opções:
  - A: Migrar agora para Next.js + FastAPI (padrão fábrica)
  - B: Manter Express + Vite e fatiar routers; SQL ao lado do Sheets
- Decisão: B
- Consequências: Layout `frontend/`/`backend/` da fábrica não se aplica ainda; docs refletem a raiz atual. Migração de stack fica para fatia futura.

## ADR-002 — Prisma como ORM

- Data: 2026-09-21
- Status: accepted
- Contexto: Precisamos de models + migrations versionadas para Azure SQL.
- Opções:
  - A: Drizzle
  - B: Prisma
  - C: Knex / SQL puro
- Decisão: B (pedido do produto)
- Consequências: Provider `sqlserver`; migrations via Prisma Migrate; client gerado em `node_modules/@prisma/client`.

## ADR-003 — SQL Server / Azure SQL com schema `alocados`

- Data: 2026-09-21
- Status: accepted
- Contexto: Produção alvo é Azure SQL; local deve espelhar o mesmo dialeto. Schema lógico `alocados`.
- Opções:
  - A: PostgreSQL local (padrão fábrica) + converter depois
  - B: SQL Server desde o início (Docker local / Azure SQL prod)
- Decisão: B
- Consequências: Desvio do PostgreSQL padrão; Docker `mcr.microsoft.com/mssql/server` para dev; `DATABASE_URL` no formato SQL Server.

## ADR-005 — Data Factory carrega o banco; o app só consome

- Data: 2026-09-21
- Status: accepted
- Contexto: Google Sheets é provisório. A base grande e as tabelas de apoio entram no Azure SQL pelo Data Factory. O app precisa da estrutura para, em seguida, rodar só no banco.
- Opções:
  - A: Job no Express copiando Sheets para SQL
  - B: Migrations com o modelo de runtime do app; ADF grava; Express lê depois
- Decisão: B
- Consequências: Sem `raw_json` / `synced_at` e sem endpoint de sync. Quatro tabelas no schema `alocados`: `employees`, `users`, `user_logs`, `commercial_assignments`. O grão de `employees` é a linha que a tela já usa.

## ADR-007 — `alocados.employees` é uma view sobre o `dbo`

- Data: 2026-09-22
- Status: accepted
- Contexto: O Data Factory alimenta tabelas de sistemas terceiros no schema `dbo` (`TB_Funcionario`, `TB_Cliente`, `TB_Funcao`, `TB_CentroCusto`, `TB_Depto`, `TB_GrupoEconomico`). Esse `dbo` é base compartilhada. Cada app vive no próprio schema e só enxerga a projeção que a tela precisa. A query de alocados já está desenhada em cima dessas tabelas.
- Opções:
  - A: Procedure que faz MERGE na tabela `alocados.employees`
  - B: View `alocados.employees` com o SELECT da projeção, criada na migration
  - C: O Express lê o `dbo` direto
- Decisão: B
- Consequências: O ADF para de gravar `alocados.employees`. A view nasce num `migration.sql` (Prisma não emite `CREATE VIEW` a partir do model). Colunas derivadas (`is_ativo`, `ano_*`, `grupo_economico`, `regiao`) ficam no SELECT. `users`, `user_logs` e `commercial_assignments` continuam tabelas do app. A migration da view só aplica no banco em que as `dbo.TB_*` existem. View indexada não serve: o SELECT usa `LEFT JOIN`. Se a leitura dos ~18 mil ficar lenta, o passo seguinte é procedure de materialização em cima dessa mesma view, não o contrário.

## ADR-008 — Cache em memória de `/api/alocados`

- Data: 2026-09-22
- Status: accepted
- Contexto: A view `employees` junta ~33 mil linhas no `dbo` a cada abertura. Essa leitura passa de 1 minuto. O painel filtra e agrega o conjunto inteiro no browser, então paginar a API quebraria as abas.
- Opções:
  - A: Cache em memória no Express, com TTL e botão que força a leitura
  - B: Procedure que materializa a view numa tabela
- Decisão: A
- Consequências: A primeira leitura depois que o processo sobe ainda espera o SQL. As seguintes respondem da memória. O cache vive só no processo (reiniciar o servidor esvazia). O ADF continua dono da carga no `dbo`. Materializar a view fica para quando a primeira leitura também precisar ser curta.

## ADR-006 — O app deixa de ler Google Sheets

- Data: 2026-09-21
- Status: accepted
- Contexto: A sincronização com Apps Script travava o Express (download longo no boot e no refresh). A estrutura SQL já existe e o Data Factory carrega os dados.
- Opções:
  - A: Manter Sheets como fallback quando o SQL estiver vazio
  - B: Ler e gravar só o schema `alocados`
- Decisão: B
- Consequências: `/api/alocados`, `/api/users` e `/api/commercial-assignments` usam Prisma. Sem cache `metarh_cache_18k.json` e sem chamada a Apps Script no servidor ou no frontend. Banco local vazio mostra dashboard vazio até a carga.

## ADR-004 — Sheets permanece canônico no dashboard nesta fatia

- Data: 2026-09-21
- Status: superseded by ADR-006
- Contexto: A lógica Sheets ainda não está totalmente compreendida; cortar agora é risco.
- Opções:
  - A: Substituir `/api/alocados` por SQL já
  - B: Novas rotas `/api/sql/*` + Sheets intacto
- Decisão: B
- Consequências: Dual path temporário. A leitura do banco fica na F-002, depois que o Data Factory tiver carregado as tabelas.
