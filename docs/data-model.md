# Data model

Status: active · SQL Server / Azure SQL · schema `alocados`

O app lê só o schema `alocados`. O Azure Data Factory grava as tabelas de terceiros no `dbo`. `employees` não é cópia: é a view da projeção do app sobre esse `dbo` (ADR-007). `users`, `user_logs` e `commercial_assignments` continuam tabelas gravadas pelo app.

O grão de `employees` é o mesmo da tela: uma linha de alocado já no formato que o dashboard usa (`Funcionario`). Grupo, cliente e empresa ficam na própria linha. O app não consulta tabelas separadas de pessoas ou empresas.

## Entidades da fatia 1

### users

| Campo | Tipo | Restrições |
| --- | --- | --- |
| id | nvarchar(64) | PK |
| username | nvarchar(120) | unique, not null |
| password | nvarchar(255) | nullable (legado; texto claro — dívida) |
| role | nvarchar(64) | not null |
| grupo_economico | nvarchar(255) | nullable |
| grupos_economicos_json | nvarchar(max) | nullable (JSON array) |
| clientes_atribuidos_json | nvarchar(max) | nullable |
| cnpjs_atribuidos_json | nvarchar(max) | nullable |
| email | nvarchar(255) | nullable |
| phone | nvarchar(64) | nullable |
| created_at | datetime2 | not null |
| updated_at | datetime2 | nullable |

### user_logs

| Campo | Tipo | Restrições |
| --- | --- | --- |
| id | nvarchar(64) | PK |
| user_id | nvarchar(64) | FK → users.id, not null |
| timestamp | datetime2 | not null |
| author | nvarchar(120) | not null |
| action | nvarchar(120) | not null |
| details | nvarchar(max) | nullable |

### commercial_assignments

| Campo | Tipo | Restrições |
| --- | --- | --- |
| id | nvarchar(64) | PK; default `NEWID()` para o ADF poder omitir |
| grupo_economico | nvarchar(255) | nullable |
| nome_cliente | nvarchar(255) | nullable |
| comercial | nvarchar(120) | not null |
| created_at | datetime2 | not null |
| updated_at | datetime2 | nullable |

### employees

View somente leitura em produção. O nome físico continua `alocados.employees`, então o Prisma lê do mesmo objeto. No banco de teste, sem as `dbo.TB_*`, a migration não troca nada e `employees` continua tabela. Origem da view: `dbo.TB_Funcionario` com os joins de função, centro de custo, cliente, grupo econômico e departamento.

| Campo | Tipo | Restrições |
| --- | --- | --- |
| id | int | PK (Cód.Func.) |
| nome | nvarchar(255) | not null |
| vinculo | nvarchar(120) | nullable |
| telefone | nvarchar(64) | nullable |
| data_admissao | datetime2 | nullable |
| ano_admissao | int | nullable; ano usado nos filtros |
| data_vcto_contrato | datetime2 | nullable |
| data_vcto_prorrogacao | datetime2 | nullable |
| ano_prorrogacao | int | nullable |
| data_demissao | datetime2 | nullable |
| ano_demissao | int | nullable |
| is_ativo | bit | not null, default 1; ativo quando não há demissão |
| salario | decimal(18,2) | nullable |
| cargo | nvarchar(255) | nullable |
| depto | nvarchar(255) | nullable |
| empresa | int | nullable; código `CodigoEmpresa` |
| regiao | nvarchar(120) | nullable |
| cidade | nvarchar(120) | nullable |
| uf | nvarchar(8) | nullable |
| motivo_desligamento | nvarchar(255) | nullable |
| email_corporativo | nvarchar(255) | nullable |
| celular | nvarchar(64) | nullable |
| cod_cliente | int | nullable |
| nome_cliente | nvarchar(255) | nullable |
| cnpj_cliente | nvarchar(32) | nullable |
| departamento | nvarchar(255) | nullable |
| rh_focal | nvarchar(255) | nullable |
| grupo_economico | nvarchar(255) | nullable |
| created_at | datetime2 | not null |
| updated_at | datetime2 | nullable |

## Mapa da view `employees`

O ADF alimenta o `dbo`. A view projeta o grão da tela. Não há pipeline ADF para `alocados.employees`.

| Origem na query | Coluna da view |
| --- | --- |
| `F.CodigoFuncionario` | id |
| `Nome` | nome |
| `Vinculo` | vinculo |
| `TelefoneResid` | telefone |
| `DataAdmissao` | data_admissao; `YEAR(...)` → ano_admissao |
| `DtVectoContrato` | data_vcto_contrato |
| `DtVectoProrrogacao` | data_vcto_prorrogacao; `YEAR(...)` → ano_prorrogacao |
| `DataDemissao` | data_demissao; `YEAR(...)` → ano_demissao |
| demissão nula | is_ativo = 1 |
| `Salario` | salario |
| `Funcao.Descricao` | cargo |
| `Centro.NomeCentroCusto` | depto |
| `F.CodigoEmpresa` | empresa |
| `Cliente.Cidade` | cidade |
| `Cliente.UF` | uf |
| `cidade + ' - ' + uf` | regiao |
| `F.CodigoCliente` | cod_cliente |
| `Cliente.RazaoSocial` | nome_cliente |
| `Cliente.CGC` | cnpj_cliente |
| `Depto.Descricao` | departamento |
| `CONCAT(CodigoGrupoEconomico, '-', Grupo.Descricao)` | grupo_economico |

Sem coluna de origem nesta query, a view deixa nulo: `motivo_desligamento`, `email_corporativo`, `celular`, `rh_focal`. `empresa` recebe o inteiro `F.CodigoEmpresa`. `EmailGestor`, `MotivoContrato`, `MotivoProrrogacao`, `MotivoSubstituicao`, `Depto.Obs`, endereço e bairro não entram no grão da tela.

### `users` ← planilha de usuários

`id`, `username`, `password`, `role`, `grupo_economico`, `grupos_economicos_json`, `clientes_atribuidos_json`, `cnpjs_atribuidos_json`, `email`, `phone`.

As três colunas `*_json` são texto JSON com array de strings, no mesmo formato que o app guarda hoje (`["Grupo A","Grupo B"]`).

### `user_logs`

Filha de `users`. O app grava auditoria de conta aqui. O ADF só carrega se a planilha de usuários tiver histórico.

### `commercial_assignments` ← carteira comercial

| Origem | Coluna |
| --- | --- |
| Grupo Economico | grupo_economico |
| Nome Cliente | nome_cliente |
| Comercial | comercial |

`id` pode ficar de fora: o default gera um valor.

## Relacionamentos

- `user_logs.user_id` → `users.id` (1:N)
- `commercial_assignments` e `employees` não têm FK entre si. A tela casa comercial e cliente pelo nome.

## Índices

- `users.username` unique
- `commercial_assignments(comercial)`
- `employees(grupo_economico)`, `employees(cnpj_cliente)`, `employees(is_ativo)`

## Invariantes

- Schema lógico sempre `alocados`
- Chave de `employees.id` é o `Cód.Func.`
- Carga em massa é do Data Factory

## Fora desta fatia

- Tabelas de sessão/JWT
- Tabelas separadas de pessoas, empresas ou grupos
- Job no Express copiando Google Sheets
