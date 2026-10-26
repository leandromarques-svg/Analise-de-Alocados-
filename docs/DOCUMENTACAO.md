# O que eu implementei

Escrevi isto para eu mesmo lembrar o que o painel é hoje. A versão antiga desta página ainda falava de Google Sheets, Apps Script e do arquivo `metarh_cache_18k.json`. Isso acabou.

## Para que serve

Eu uso o Análise de Alocados para acompanhar gente alocada na METARH: quem está ativo, quem saiu, salário, contrato, cidade, cliente e grupo econômico. O comercial usa a mesma base para ver a carteira. O RH olha talento e empresa. O cliente entra e só vê o recorte dele.

A tela é a que já existia, em React. O que mudou foi a fonte. Antes o Express buscava a planilha, gravava JSON no disco e o Vite recarregava no meio. Agora a leitura é SQL.

## Stack

- React 19, TypeScript, Vite, Tailwind
- Express em `server.ts`, routers em `src/server/routes`
- Prisma, SQL Server local (Docker) e Azure SQL em produção
- Recharts nos gráficos
- Na Vercel, a função `api/[...path].js` exporta o mesmo Express

Não migrei para Next nem para FastAPI. O projeto já era React e Express, e eu continuei nele.

## Como os dados se dividem

O Data Factory carrega tabelas de um sistema terceiro no schema `dbo`. Esse schema é compartilhado. O meu aplicativo não grava lá. Ele tem o schema `alocados`.

Em produção, `alocados.employees` é uma view. O `SELECT` junta funcionário, função, centro de custo, cliente, grupo econômico e departamento. Quando o ADF atualiza o `dbo`, a próxima leitura da view já vê o dado novo. Eu não fiz job no Express para copiar isso.

No Docker local essas tabelas `dbo` não existem. A migration percebe isso e deixa `employees` como tabela. O nome é o mesmo, então o `prisma.employee.findMany()` funciona nos dois lugares.

O que é meu, e é tabela nos dois ambientes:

| Tabela | Uso |
| --- | --- |
| `alocados.users` | login e cadastro de usuário |
| `alocados.user_logs` | histórico curto de alteração do usuário |
| `alocados.commercial_assignments` | qual comercial atende qual cliente / grupo |

A view não traz nome de empresa. Traz `CodigoEmpresa`, um inteiro. O Prisma lê como número e a API manda para a tela como texto (`"4"`, por exemplo).

Alguns campos da tela não têm coluna na query de origem e ficam vazios: motivo de desligamento quando não há dimensão, e-mail, celular, RH focal, conforme o mapa em `docs/data-model.md`.

## O que a tela chama

`GET /api/alocados` devolve a lista inteira. O front filtra e soma em memória. Por isso eu não paginei: as abas precisam do conjunto para KPI, gráfico e carteira.

`POST /api/sql/login` recebe usuário e senha e confere em `alocados.users`. Se falhar, a tela ainda tenta a lista de `/api/users`, que é o caminho antigo.

`/api/users` cria, altera e apaga usuário. O `id` eu gero na aplicação (`user_...`). A coluna no banco é obrigatória e não tem default. Um `INSERT` sem `id` estoura.

`/api/commercial-assignments` lê e grava a carteira. O JSON que a tela já usava continua com as chaves `Grupo Economico`, `Nome Cliente` e `Comercial`.

## Carga que eu fiz no Azure

Depois das migrations, populei usuários e carteira com `npm run db:import-json`. O script lê os dois JSON da raiz e faz upsert de usuário pelo nome. A carteira ele apaga e grava de novo. Não mexi em `employees`.

Esses JSON têm senha em texto. Ficam fora do Git (`.gitignore`). O `.env` também.

Quem eu inseri na mão, com outro username, permanece. O import não troca o `id` de um usuário que já existe com o mesmo nome.

## Cache

Trinta e três mil linhas na view levam mais de um minuto na primeira vez. O módulo `src/server/alocadosCache.ts` guarda a lista pronta por 15 minutos. O processo, ao subir, já começa essa leitura.

Dentro do prazo, a resposta vem da memória e o indicador da tela fica em cache. O botão Atualizar manda `?refresh=1` e espera o SQL. Passou de 15 minutos, eu devolvo o que tenho e atualizo por trás, para a pessoa não ficar um minuto olhando para o loading.

Esse cache mora no processo. Reiniciei o `npm start`, ele esvazia. Na Vercel a função nasce e morre, então o cache não segura do mesmo jeito. E o teto lá é 60 segundos. A primeira leitura dos alocados pode não caber.

## Login e permissão

O papel define a aba inicial e o recorte dos dados. Administrador vê tudo. RH cai em talentos e empresas. Comercial vê a carteira. Cliente só vê o grupo ou o cliente atribuído, com contato mascarado.

A senha comparada é a que está na tabela, sem hash. A sessão fica no `localStorage`. Eu sei que isso não serve como autenticação de verdade. Fica para uma etapa com Entra ID ou equivalente.

## Banco local

```bash
npm install
npm run db:up
npm run db:ensure
npm run db:migrate
npm run dev
```

`db:migrate` é `prisma migrate deploy`. Eu não rodo reset. A migration da view é condicional: sem as seis tabelas `dbo.TB_*`, ela não derruba a tabela local.

Conferir se o banco subiu: `GET /api/sql/health`.

Para apontar para o Azure, troco a `DATABASE_URL` do `.env`. Se a senha começa com `#`, ela precisa ir entre chaves na connection string, senão o Prisma corta a URL.

## Vercel

Tirei as funções que só respondiam “planilha removida”. O build gera `api/[...path].js` com o Express e as mesmas rotas. O front publicado chama `/api/...` e cai nessa função.

Para funcionar lá eu ainda preciso, fora do código:

1. Colocar `DATABASE_URL` nas variáveis do projeto na Vercel.
2. Liberar no firewall do Azure SQL a saída da Vercel.

O build da Vercel gera o client do Prisma no `postinstall`. O schema pede o binário `rhel-openssl-3.0.x`, que é o da função deles, além do Windows que eu uso aqui.

## Pastas que importam

- `server.ts` — sobe a porta 3000 na minha máquina e, em produção local, serve o `dist`.
- `src/server/app.ts` — o Express de verdade, compartilhado com a Vercel.
- `src/server/routes` — alocados, usuários, carteira, SQL.
- `src/server/presenters.ts` — converte a linha do Prisma no formato que a tela já esperava.
- `prisma/migrations` — schema, ajuste das colunas e a view condicional.
- `scripts/import-app-json.ts` — carga de usuários e carteira.
- `docs/data-model.md`, `docs/contracts.md`, `docs/decisions.md` — o desenho que eu fechei antes de codar a view.

## O que eu deixei de propósito

- Não copio o `dbo` para uma tabela a cada carga do ADF.
- Não volto a buscar a planilha se o SQL vier vazio. Lista vazia é resposta válida.
- Não coloquei JWT.
- Não escrevi suíte de teste. A validação foi subir o servidor, entrar com um usuário do banco e ver a lista, a carteira e o cache.
