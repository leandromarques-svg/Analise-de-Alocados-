# Documentação detalhada do projeto

## 1. Contexto e objetivo

A aplicação é um painel analítico para controle, acompanhamento e tomada de decisão sobre pessoas e carteira comercial. O objetivo é permitir que áreas como RH, gestão, comercial e clientes visualizem indicadores de pessoas alocadas, estrutura de folha, expiração de contratos, regionalização, distribuição por grupos econômicos e evolução temporal.

O sistema foi desenhado para operar com cargas altas de dados, chegando a dezenas de milhares de registros. Em razão disso, ela integra:

- carregamento de dados via API externa;
- cache local em memória e em disco;
- tratamento de dados para padronização e cálculo de indicadores;
- múltiplos visuais e filtros por contexto.

## 2. Arquitetura geral

A aplicação tem uma arquitetura híbrida:

### Frontend

- React + TypeScript
- Vite para desenvolvimento e build
- Componentes organizados em pastas por responsabilidade
- Recharts para gráficos, Lucide para ícones

### Backend e serviços

- Express em `server.ts`
- Vercel Serverless functions em `api/*.ts`
- caching e sincronização
- endpoints para dados e usuários

### Fonte de dados

- Google Apps Script exportando registros em JSON
- arquivo local `metarh_cache_18k.json`
- arquivos do servidor para carteira e usuários

## 3. Estrutura de pastas

### `api/`

Contém as funções serverless do Vercel.

- `api/alocados.ts`: busca os dados de alocados diretamente do Google Apps Script e devolve JSON para a interface.
- `api/users.ts`: endpoint para usuários e sincronização de autenticação/usuarios.

### `src/`

Diretório principal da interface.

- `App.tsx`: orquestra dados, autenticação, filtros, tabs e métricas.
- `types.ts`: tipos centralizados do domínio.
- `components/`: componentes visuais, cards, gráficos, modais e tabs.
- `data/`: dados mockados e base inicial.
- `services/`: autenticação, usuárias e integrações do navegador.
- `utils/`: parsing, métricas, cache e lógica de sincronização comercial.

### Arquivos raiz

- `server.ts`: backend local com cache e API REST.
- `vercel.json`: configuração de deploy em Vercel.
- `vite.config.ts`: configuração do Vite.
- `package.json`: scripts e dependências.

## 4. Módulos principais

### 4.1 Frontend e dashboard

A tela principal é controlada por `App.tsx`. Ela é responsável por:

- carregar os dados;
- manter estado global de filtros;
- ativar a aba atual;
- aplicar regras de acesso por perfil;
- exibir métricas e gráficos.

### 4.2 Módulos de visualização

O aplicativo possui diversas abas e cada uma representa um painel analítico específico:

#### Overview

Resumo geral com KPIs e visão executiva.

#### Temporal

Análise temporal da evolução de ativos, desligamentos e movimentações no período.

#### Vacancies and Salaries

Comparação de salário, carga horária, vagas e estrutura de remuneração.

#### Regional

Análise por UF, região, estado e distribuição geográfica.

#### Contracts

Controle de contratos, datas de vencimento, prorrogações e expiração.

#### Economic Groups

Visão por grupo econômico, empresas e relação entre estruturas corporativas.

#### Talent Bank

Acompanhamento do banco de talentos e performance de RH.

#### Commercial Portfolio

Painel de carteira e desempenho comercial.

#### Commercial Management

Gestão de indicadores e acompanhamento de estratégia comercial.

#### Company Commercials

Visão dos comerciais vinculados a empresas e grupos.

#### Data Table

Tabela detalhada com filtros e exploração dos registros crús.

## 5. Modelo de dados

Os dados principais são representados por `Funcionario` e `FuncionarioRaw` em `src/types.ts`.

### Campos principais

- `id`
- `nome`
- `vinculo`
- `telefone`
- `dataAdmissao`
- `dataVctoContrato`
- `dataDemissao`
- `salario`
- `cargo`
- `empresa`
- `regiao`
- `uf`
- `nomeCliente`
- `cnpjCliente`
- `grupoEconomico`
- `rhFocal`

Esses dados são normalizados para garantir consistência mesmo com diferentes formatos provenientes da planilha.

## 6. Processo de normalização

O arquivo `src/utils/dataParser.ts` é fundamental para o funcionamento do sistema.

Ele realiza:

- leitura de campos com nomes variantes;
- conversão de texto para números;
- padronização de datas;
- mapeamento de UF;
- limpeza de dados inconsistentes;
- cálculo de estatísticas gerais.

### Exemplo de normalização

- `SÃO PAULO` → `SP`
- `2024-05-10` → objeto com ano/mês/dia
- `R$ 5.500,00` → `5500`
- strings vazias e `-` → valores nulos ou vazios consistentes

## 7. Cálculo de métricas

A função `calculateMetrics()` gera as métricas centrais do dashboard, como:

- total de registros;
- total de ativos;
- total de desligados;
- percentual de ativos/desligados;
- média salarial geral;
- maior salário;
- soma da folha salarial ativa;
- quantidade de grupos econômicos, clientes e cargos.

Esses cálculos são usados pelos KPIs e pelos cards de visão geral.

## 8. Filtros e segmentação

`FilterOptions` define um modelo de filtros que inclui:

- status;
- grupo econômico;
- vínculo;
- ano;
- mês;
- região;
- UF;
- cliente;
- CNPJ;
- comercial;
- cargo;
- busca livre;
- faixa salarial mínima e máxima.

Os filtros são aplicados no front antes do cálculo das métricas e da renderização das abas.

## 9. Autenticação e permissões

O modelo de usuário está em `src/types.ts`.

### Papéis principais

- `Administrador`
- `Colaborador`
- `Cliente`
- `RH`
- `Comercial`
- `Gerencial Comercial`

### Regras implementadas

- `RH` recebe uma navegação focada em talentos, empresas e RH;
- `Cliente` só pode acessar dados relevantes ao cliente/empresa atribuído;
- `Administrador` tem visão completa;
- `Gerencial Comercial` tem foco em gestão comercial estratégica.

A lógica fica em `App.tsx` e em `src/services/userService.ts`.

## 10. Sistema de cache e resiliência

### Cache em memória

Em `server.ts` há variáveis globais como:

- `cachedData`
- `lastFetchTime`
- `isFetchingInBackground`

Esse mecanismo evita que a aplicação sempre precise buscar o arquivo externo em cada request.

### Cache em disco

Quando o servidor recebe dados atualizados, ele salva no arquivo `metarh_cache_18k.json`, usando o mesmo formato de payload padrão.

### Fallbacks

A aplicação tenta, em ordem:

1. `/api/alocados`
2. `metarh_cache_18k.json`
3. Google Apps Script direto
4. proxy CORS
5. cache local IndexedDB / localStorage

Isso melhora a disponibilidade mesmo quando a origem principal falha.

## 11. Endpoints e integrações do backend

### `/api/alocados`

Retorna a base de dados bruta ou processada conforme a origem disponível.

### `/api/users`

Gerencia consulta, criação e atualização de usuários. Também serve como ponto de sincronização entre o frontend e os dados persistidos no servidor.

### `Google Apps Script`

A aplicação depende de URLs de script que exportam dados em JSON. Esse mecanismo foi usado para manter a solução conectada a uma base de dados externa sem exigir banco local completo.

## 12. Fluxo de requisição do usuário

1. Usuário entra no frontend.
2. O sistema carrega dados e autenticação.
3. O `App` calcula a base ativa de dados.
4. Filtros e mapa de funções manipulam o estado.
5. KPIs e gráficos são recalculados.
6. A interface renderiza a aba ativa.

## 13. Padrões adotados no projeto

### Componentização

Os componentes foram separados em módulos por funcionalidade, como:

- `Header`
- `FilterBar`
- `KPICards`
- `EmployeeModal`
- `UserManagementModal`
- `ExecutiveReportModal`
- `YearComparisonModal`
- `tabs/*`

### Separação de responsabilidades

- `types`: modelos de domínio
- `utils`: parsing, filtros e cálculos
- `services`: acessos e regras de dados
- `components`: visualização
- `server.ts`: infraestrutura e caches

## 14. Pontos de atenção para produção

### 1. Segurança de autenticação

O projeto ainda usa credenciais locais e dados em `localStorage`. Isso é inadequado para produção sem controle de identidade centralizado.

### 2. Dados sensíveis

Há casos em que o projeto mascarou telefone, celular e email para usuários do tipo `Cliente`. Isso é um bom ponto de partida, mas deve permanecer consistente em todas as rotas e telas.

### 3. Confiabilidade da integração externa

Qualquer indisponibilidade do Google Apps Script pode afetar o carregamento da base. O cache e os fallback mitigam esse risco, mas não eliminam a dependência.

### 4. Escalabilidade

Em grandes volumes, o front precisa otimizar:

- paginação;
- lazy loading;
- memoização de gráficos;
- redução de re-renderização.

## 15. Como testar e validar

### Build

```bash
npm install
npm run build
```

### Tipagem

```bash
npm run lint
```

### Execução local

```bash
npm run dev
```

## 16. Melhorias recomendadas

- migrar os usuários para banco estruturado;
- implementar token JWT e sessão no servidor;
- criar testes unitários para métricas e utilitários;
- separar lógica de negócios do frontend;
- usar dashboard com paginação e lazy render;
- adicionar logs de acesso e auditoria por ação;
- criar camada de API própria para business rules;
- usar serviço de autenticação com identidade e autorização centralizadas.

## 17. Resumo executivo

O projeto é um dashboard analítico para acompanhamento de alocados, estrutura de RH e carteira comercial. Ele combina React, TypeScript, Express e integrações de dados externos para fornecer uma visão executiva de grande escala, com filtros, KPIs e módulos de análise. A arquitetura atual é funcional e resilientemente preparada para falhas externas, mas a etapa seguinte ideal é reforçar aspectos de autenticação, segregação de dados e governança de segurança para uso em produção real.
