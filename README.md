# Análise de Alocados

Dashboard de análise de alocados, indicadores de RH, gestão comercial e painel de performance por cliente, região, cargo e período. O projeto combina frontend em React + TypeScript, backend Express para cache e sincronização, além de integrações com Google Apps Script para leitura de dados externos.

## Visão geral

Este projeto foi pensado para centralizar e transformar dados de alocados em indicadores executivos e operacionais. Ele permite:

- visualizar a base de colaboradores ativos e desligados;
- acompanhar evolução por período e mês;
- analisar salários e estrutura de folha;
- mapear regionalmente os funcionários;
- identificar contratos e expirações;
- gerar visão por grupos econômicos e clientes;
- manter perfis de acesso por papel (Administrador, RH, Comercial, Cliente, etc.);
- aplicar filtros dinâmicos por região, vínculo, cliente, cargo e salário.

## Stack tecnológica

- React 19
- TypeScript
- Vite
- Express
- Recharts
- Lucide React
- Tailwind CSS
- Vercel Serverless Functions
- Google Apps Script como fonte de dados

## Funcionalidades principais

### 1. Dashboard executivo

- KPIs com total de colaboradores, ativos, desligados, média salarial e valores de folha;
- indicadores calculados em tempo real a partir da base filtrada;
- visualizações de comparação por ano, por região e por segmento.

### 2. Gestão de usuários e acessos

- autenticação local baseada em `localStorage` e servidor;
- perfis com permissões diferentes;
- filtros de dados por grupo econômico e clientes atribuídos;
- mascaramento de dados sensíveis para usuários do tipo `Cliente` com LGPD.

### 3. Módulos de análise

A interface possui abas e módulos como:

- Visão Geral
- Temporal
- Salários e Vagas
- Regional
- Contratos / Vencimentos
- Grupos Econômicos
- Talent Bank
- RH e Empresas Comerciais
- Carteira Comercial
- Gestão Comercial
- Tabela de Dados

### 4. Cache e resiliência

- leitura de dados do backend ou do cache local;
- fallback para arquivo estático `metarh_cache_18k.json`;
- tentativa de sincronização com Google Apps Script;
- persistência local para evitar falhas de rede ou indisponibilidade da origem primária.

## Estrutura do projeto

```text
.
├── api/
│   ├── alocados.ts
│   └── users.ts
├── public/
│   └── metarh_cache_18k.json
├── src/
│   ├── components/
│   ├── data/
│   ├── services/
│   ├── utils/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── types.ts
├── index.html
├── metadata.json
├── metarh_cache_18k.json
├── metarh_commercial_assignments.json
├── package.json
├── server.ts
├── tsconfig.json
├── vercel.json
├── vite.config.ts
└── README.md
```

## Requisitos

- Node.js 18+
- npm ou yarn
- acesso à internet para consultar a fonte externa de dados

## Instalação

```bash
npm install
```

## Execução local

### Desenvolvimento

```bash
npm run dev
```

O comando inicia o servidor Express e a aplicação Vite em ambiente local.

### Build de produção

```bash
npm run build
```

### Execução da build

```bash
npm run start
```

### Verificação de TypeScript

```bash
npm run lint
```

## Como o sistema funciona

### Fluxo de dados

1. O frontend solicita os registros em `/api/alocados`.
2. O backend tenta carregar dados do servidor ou do cache local.
3. Se necessário, recorre a `metarh_cache_18k.json`.
4. Em último caso, consulta o Google Apps Script diretamente.
5. Os dados são normalizados em `normalizeFuncionario()` antes de entrar no dashboard.
6. O dashboard calcula métricas, aplica filtros e renderiza os componentes.

### Normalização de dados

A função `normalizeFuncionario` faz tratativas como:

- padronização de campos em português/inglês;
- conversão de datas;
- limpeza de strings vazias;
- extração de UF, município, salário e status de ativo/inativo;
- geração de identificadores internos.

### Autenticação e autorização

A autenticação usa informações em `localStorage` e sincronização com APIs do servidor. O usuário pode possuir papel como:

- Administrador
- RH
- Comercial
- Gerencial Comercial
- Cliente
- Colaborador

Há restrições por perfil:

- usuários `Cliente` veem apenas dados apropriadamente filtrados;
- usuários `RH` têm visões focadas em pessoas e empresas;
- usuários de comercial têm acesso ao módulo de carteira/gestão.

## Integrações

### API Vercel

Arquivo: `api/alocados.ts`

- realiza fetch no Google Apps Script;
- retorna JSON com `success`, `source`, `fetchedAt`, `total`, `data`;
- habilita CORS;
- define `Cache-Control` para otimizar uso por CDN.

### Backend Express

Arquivo: `server.ts`

- gerencia cache em memória;
- salva cache local em disco;
- alimenta `/api/users` e `/api/alocados`;
- sincroniza dados de carteira e usuários;
- serve a aplicação em ambiente de produção.

## Armazenamento local

O projeto persiste informações em arquivos locais e no navegador:

- `metarh_cache_18k.json`
- `metarh_users_db.json`
- `metarh_commercial_assignments.json`
- `localStorage` com usuários e sessão atual

## Segurança

A aplicação ainda possui alguns pontos que devem ser reforçados em ambiente real:

- senha do usuário administrador está definida no código como valor padrão;
- autenticação baseada em `localStorage` não substitui um sistema de identidade robusto;
- dados sensíveis exigem controle de acesso e mascaramento robusto;
- o uso de API externa e fetch direto exige validação de origem e limites de quota.

Recomendação para produção:

- mover credenciais para variáveis de ambiente;
- usar autenticação real com Entra ID / OAuth ou outro provedor;
- armazenar dados sensíveis em banco ou storage seguro;
- configurar logs e auditoria de acessos.

## Deploy

O projeto está preparado para deploy em Vercel, conforme `vercel.json`.

### Exemplo de deploy

```bash
npm run build
```

Depois, faça o deploy no Vercel ou em outro provedor compatível com Node.js.

## Observações importantes

- A aplicação depende de fontes externas e pode falhar em ausência de rede ou de acesso ao Google Apps Script.
- O projeto foi construído para análise operacional e executiva, não como sistema financeiro ou de produção crítico sem revisão de segurança.
- O cache local é uma camada de resiliência, não substitui a fonte principal.

## Melhorias sugeridas

- migrar autenticação para backend real com JWT ou OAuth;
- adicionar banco de dados para usuários e permissões;
- criar testes automatizados para métricas e filtros;
- melhorar tratamento de erros e logging;
- implementar paginação para grandes volumes de dados;
- separar rotas, serviços e modelos por domínio.

## Conclusão

Este projeto é um painel analítico de pessoas e carteira comercial com foco em gestão de alocados, RH e campanhas de clientes. Ele foi estruturado para funcionar com dados volumosos, cache, variações de perfil e múltiplos módulos de análise, tornando-se uma ferramenta útil para tomada de decisão operacional e executiva.
