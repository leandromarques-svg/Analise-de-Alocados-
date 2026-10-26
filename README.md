# Análise de Alocados

Painel que eu uso para olhar a base de alocados: ativos, desligados, folha, contratos, região, grupos econômicos e a carteira comercial. O front é React com Vite. O servidor é Express. Os dados ficam no SQL Server, no schema `alocados`.

A planilha do Google saiu. Eu não leio mais Apps Script nem o JSON de 18 mil linhas. Quem alimenta a base de funcionários é o Data Factory, no schema `dbo`. O app só lê a projeção disso.

## O que o painel faz

- Lista colaboradores ativos e desligados, com filtro por período, vínculo, cliente, cargo, região e salário.
- Mostra visão geral, evolução no tempo, salários, mapa regional, vencimento de contrato, grupos econômicos e a tabela crua.
- Separa o acesso por papel: Administrador, RH, Comercial, Gerencial Comercial, Cliente e Colaborador.
- Para o papel Cliente, esconde telefone, celular e e-mail.
- Guarda usuários e a carteira comercial em tabelas nossas, no mesmo schema.

As abas continuam as mesmas de antes: Visão Geral, Temporal, Salários, Regional, Contratos, Grupos, Banco de Talentos, RH e Empresas, Carteira, Gestão Comercial e Tabela.

## De onde vem cada dado

No Azure, o Data Factory grava as tabelas compartilhadas no `dbo` (`TB_Funcionario`, `TB_Cliente`, `TB_Funcao`, `TB_CentroCusto`, `TB_Depto`, `TB_GrupoEconomico`). Vários apps usam esse `dbo`. O meu mora no schema `alocados`.

`alocados.employees` em produção é uma view em cima dessas tabelas. Cada abertura da tela executa a consulta de novo, então a carga do ADF aparece sozinha. Eu não copio essa base para uma tabela.

No SQL local de teste eu não tenho o `dbo`. Lá `employees` continua tabela, com o mesmo nome, para o Prisma não precisar de dois modelos.

Usuários, log de usuário e carteira comercial são tabelas de verdade, gravadas pelo app:

- `alocados.users`
- `alocados.user_logs`
- `alocados.commercial_assignments`

O campo `empresa` na view é o código numérico `CodigoEmpresa`. Na tela eu mostro esse código como texto.

## Como eu rodo aqui

Precisa de Node 18+ e Docker, se for usar o SQL local.

```bash
npm install
npm run db:up
npm run db:ensure
npm run db:migrate
npm run dev
```

O `.env` sai do `.env.example`. A variável que importa é `DATABASE_URL`. O arquivo `.env` não entra no Git.

`npm run dev` sobe o Express com o Vite na porta 3000. `npm run start` serve o build (`dist/`) sem o Vite no meio. Eu uso `npm run db:migrate` para aplicar migration. Não uso reset.

No banco local a lista de alocados começa vazia, porque não existe `dbo`. Usuários e carteira eu consigo gravar direto.

## O que eu já coloquei em produção

As migrations do schema `alocados` já rodaram no Azure. Usuários e carteira eu carreguei dos JSON que estavam na raiz (`metarh_users_db.json` e `metarh_commercial_assignments.json`), com `npm run db:import-json`. O cache de 18 mil funcionários eu não importei: em produção isso é view, não tabela.

O login tenta primeiro `POST /api/sql/login`, comparando usuário e senha na tabela `alocados.users`. A senha ainda está em texto puro. A sessão continua no `localStorage`.

## Por que a lista demora

São cerca de 33 mil linhas, com vários joins. A primeira leitura passa de um minuto. Por isso o Express guarda o resultado em memória por 15 minutos (`ALOCADOS_CACHE_TTL_MS`). A abertura seguinte sai na hora. O botão Atualizar ignora o cache e lê o banco de novo.

Quando o prazo vence, a tela ainda abre com o dado anterior e o servidor atualiza por trás.

## Rotas

- `GET /api/alocados` — a lista em páginas de até 4000 (`offset`, `limit`). Aceita `?refresh=1` na primeira página.
- `ALL /api/users` — consulta, grava e apaga usuário (`action=getUsers|saveUser|deleteUser`).
- `ALL /api/commercial-assignments` — lê e grava a carteira.
- `POST /api/sql/login` — login no SQL.
- `GET /api/sql/health` — só para eu ver se o banco responde.

O detalhe do contrato está em `docs/contracts.md`. O desenho das tabelas está em `docs/data-model.md`.

## Vercel

A função `api/[...path].js` é o mesmo Express, empacotado no build. Login, usuários, carteira e alocados passam por ela.

Subir o Git sozinho não liga o site. Na Vercel eu preciso da `DATABASE_URL` nas variáveis do projeto, e no Azure SQL o firewall tem que aceitar a conexão que sai de lá. A função corta em 60 segundos. A primeira leitura dos alocados pode cair nesse limite. Login e carteira são consultas pequenas e não sofrem o mesmo problema.

## O que ainda está fraco

- Senha em texto puro e sessão no navegador. Não é login de produção.
- Não tenho teste automatizado dessa fatia. Eu validei no browser e nas rotas.
- A primeira carga dos 33 mil ainda é lenta. Se eu precisar que ela caiba no tempo da Vercel, o próximo passo é materializar a view numa tabela, no ritmo do Data Factory.

## Pastas

```text
api/            função da Vercel (o Express)
prisma/         schema e migrations
scripts/        criar o database, importar JSON, smoke
src/server/     routers do Express
src/            React
docs/           modelo, contrato, decisões
server.ts       sobe o Express na minha máquina
```
