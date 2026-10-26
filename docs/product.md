# Product

Status: active

## Problema

O dashboard de alocados lia Google Sheets, Apps Script e JSON local. Isso travava o Express e não tinha governança. A leitura passou para o SQL Server, schema `alocados`.

## Público

- Primário: times internos (RH, Comercial, Gestão) que já usam o painel
- Secundário: operação/TI que precisa persistir e migrar dados de forma controlada

## Proposta de valor

O painel de alocados lê e grava o schema `alocados`. A base de funcionários em produção vem da view sobre o `dbo`, carregado pelo Data Factory.

## Hipótese do MVP

O dashboard, o login, os usuários e a carteira usam o SQL. A planilha saiu do caminho de leitura.

## Escopo do MVP (in)

- Schema `alocados`: tabelas de usuário, log e carteira; `employees` é view em produção e tabela no teste
- Migrations Prisma no SQL Server local e no Azure SQL
- Express nas rotas do painel e na função da Vercel
- Login em `POST /api/sql/login`
- Cache em memória da lista de alocados

## Fora de escopo (out)

- Voltar a ler Google Sheets
- Migrar o front para Next.js App Router
- Copiar os funcionários do `dbo` para uma tabela (a view é a leitura)
- JWT / Entra ID
- Trocar o Express por FastAPI

## Métrica de sucesso (MVP)

Entrar com um usuário do SQL, ver a lista de alocados, gravar carteira e usuário, e abrir de novo sem esperar a view inteira quando o cache está quente.

## Premissas

- SQL Server local (Docker ou instância) para desenvolvimento
- Produção alvo: Azure SQL
- Prisma como ORM

## Riscos de produto

| Risco | Sinal | Mitigação |
| --- | --- | --- |
| A view dos ~33 mil passa de 1 minuto | A primeira abertura estoura o limite de 60s da Vercel | Cache em memória no processo; materializar a view se a primeira leitura também precisar ser curta |
| Migrations incompatíveis Azure SQL | Falha no deploy | Provider `sqlserver` + SQL revisado |
