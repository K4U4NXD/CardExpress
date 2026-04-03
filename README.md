# CardExpress

## Sobre o projeto

O **CardExpress** é um sistema web de **cardápio digital com retirada no balcão**, pensado para estabelecimentos de venda rápida, como lanchonetes, barracas, quiosques e pontos de alimentação em feiras e eventos.

O cliente acessa a loja por **QR Code** ou **link público**, visualiza o cardápio, monta o carrinho, inicia o checkout e acompanha o pedido. No estado atual do projeto, o fluxo de pagamento está implementado em **modo de demonstração**: o checkout cria uma sessão intermediária e o pagamento pode ser **simulado** para converter a sessão em pedido real.

Além da experiência do cliente, o sistema possui um **painel administrativo do comerciante** para gerenciar categorias, produtos, pedidos e operação da loja.

Este repositório corresponde ao desenvolvimento do projeto acadêmico **CardExpress**, realizado em grupo.

---

## Equipe

- **Kauan Henrique Silva Paulino**
- **Gustavo Yukio Jochi**
- **Thiago Ribeiro Modesto**

---

## Status atual do projeto

O projeto já possui uma base funcional relevante, com:

- autenticação do comerciante;
- dashboard protegido;
- gerenciamento de categorias e produtos;
- fluxo operacional de pedidos;
- cardápio público dinâmico por `slug`;
- carrinho público com persistência local;
- checkout público com criação de `checkout_sessions`;
- simulação de pagamento aprovado para desenvolvimento/demo;
- conversão de checkout em pedido real;
- acompanhamento público do pedido por `token`;
- painel público de retirada.

### O que já está implementado

#### Autenticação e estrutura da loja

- cadastro de comerciante;
- login e logout;
- proteção das rotas do painel;
- criação e vínculo de uma loja por conta;
- leitura da loja autenticada no dashboard.

#### Painel administrativo

- tela inicial do painel;
- navegação lateral do dashboard;
- gerenciamento de categorias;
- gerenciamento de produtos;
- gerenciamento operacional de pedidos.

#### Categorias

- criar categoria;
- editar nome;
- ativar e desativar;
- reordenar;
- excluir categoria quando não houver produtos vinculados.

#### Produtos

- criar produto;
- editar produto;
- ativar e desativar;
- controlar disponibilidade separadamente de ativação;
- suporte a controle de estoque (`track_stock` e `stock_quantity`);
- reordenar;
- excluir produto.

#### Área pública da loja

- rota pública `/{slug}` carregando loja real via RPC;
- exibição de categorias e produtos disponíveis;
- filtro automático de produtos inativos, indisponíveis ou sem estoque quando aplicável;
- carrinho público com `localStorage` separado por loja;
- resumo sticky do carrinho;
- navegação para checkout.

#### Checkout público

- rota pública `/{slug}/checkout`;
- leitura do carrinho por loja;
- formulário com nome e telefone obrigatórios;
- validação básica de telefone;
- criação de `checkout_sessions` e `checkout_session_items` via RPC;
- limpeza do carrinho somente após sucesso real da criação da sessão;
- tela de sucesso com dados da sessão criada;
- botão temporário para **simular pagamento aprovado** em ambiente de desenvolvimento/demo.

#### Pedidos

- conversão de `checkout_session` paga em pedido real;
- criação de `orders` e `order_items` a partir do checkout;
- listagem de pedidos da loja;
- transições operacionais com regras de status;
- ações de:
  - aceitar pedido;
  - recusar pedido;
  - marcar como pronto para retirada;
  - finalizar pedido;
- atualização de timestamps operacionais (`accepted_at`, `ready_at`, `finalized_at`, `rejected_at`);
- separação entre **status operacional** e **status de reembolso**.

#### Acompanhamento público

- página pública `/{slug}/pedido/[id]?token=...` funcionando com validação por:
  - `slug` da loja;
  - `id` do pedido;
  - `public_token` do pedido;
- painel público `/{slug}/painel` exibindo o último pedido pronto para retirada.

#### Banco de dados

- projeto integrado ao **Supabase**;
- uso de Auth, Database, RPC e RLS;
- schema versionado localmente em `supabase/migrations/`;
- fluxo público de checkout e conversão para pedido já migrado e validado.

---

## O que ainda falta desenvolver

As principais frentes restantes são:

- integração com **gateway de pagamento real**;
- substituição da simulação de pagamento por confirmação real de pagamento;
- tela de **configurações da loja**;
- refinamentos de UX no dashboard e nas páginas públicas;
- possíveis melhorias no painel público de retirada;
- documentação técnica contínua e evolução do versionamento do banco.

---

## Stack do projeto

### Front-end

- **Next.js 15**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**

### Back-end / serviços

- **Supabase**
  - Auth
  - Postgres
  - RPC
  - RLS

### Ferramentas auxiliares

- **ESLint**
- **npm**
- **Supabase CLI**
- **Docker Desktop**

---

## Requisitos

### Para rodar o projeto

- **Node.js 18.18+**
- **npm**

### Recomendado

- **Node.js 20 LTS**
- **VS Code**
- **Docker Desktop**

> O projeto pode rodar localmente sem Docker no dia a dia, mas comandos da Supabase CLI como `db diff` e `db pull` dependem do Docker Desktop funcionando.

---

## Variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto com base no `.env.local.example`.

### `.env.local.example`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Criando o `.env.local`

#### Windows

```bash
copy .env.local.example .env.local
```

#### macOS/Linux

```bash
cp .env.local.example .env.local
```

Depois, preencha com os dados reais do seu projeto Supabase.

### Onde encontrar os valores

No painel do Supabase:

- acesse o projeto;
- vá em **Settings** → **API**;
- copie:
  - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
  - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> O arquivo `.env.local` não deve ser commitado.

---

## Como rodar o projeto localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Iniciar em desenvolvimento

```bash
npm run dev
```

### 3. Abrir no navegador

```text
http://localhost:3000
```

---

## Scripts do projeto

### `npm run dev`

Inicia o ambiente de desenvolvimento com hot reload.

### `npm run build`

Gera a build de produção.

### `npm run start`

Inicia a aplicação já compilada em modo de produção.

### `npm run lint`

Executa a checagem estática com ESLint.

---

## Estrutura do projeto

```text
cardexpress/
├─ app/
│  ├─ (dashboard)/
│  │  ├─ cadastro/
│  │  ├─ login/
│  │  └─ dashboard/
│  │     ├─ categorias/
│  │     ├─ produtos/
│  │     ├─ pedidos/
│  │     └─ configuracoes/
│  ├─ (public)/
│  │  └─ [slug]/
│  │     ├─ page.tsx
│  │     ├─ checkout/
│  │     ├─ painel/
│  │     └─ pedido/[id]/
│  ├─ actions/
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ components/
│  ├─ auth/
│  ├─ dashboard/
│  ├─ layout/
│  └─ public/
├─ lib/
│  ├─ auth/
│  ├─ orders/
│  ├─ public/
│  ├─ supabase/
│  ├─ validation/
│  └─ db-errors.ts
├─ types/
├─ supabase/
│  ├─ config.toml
│  └─ migrations/
├─ middleware.ts
├─ package.json
├─ .env.local.example
└─ README.md
```

---

## Principais rotas

### Área administrativa

- `/cadastro` → cadastro de comerciante e loja;
- `/login` → autenticação;
- `/dashboard` → área protegida;
- `/dashboard/categorias` → gerenciamento de categorias;
- `/dashboard/produtos` → gerenciamento de produtos;
- `/dashboard/pedidos` → operação de pedidos;
- `/dashboard/configuracoes` → tela ainda pendente de evolução.

### Área pública

- `/{slug}` → cardápio público da loja;
- `/{slug}/checkout` → checkout público;
- `/{slug}/pedido/[id]?token=...` → acompanhamento público do pedido;
- `/{slug}/painel` → painel público de retirada.

---

## Fluxos principais

### 1. Fluxo do cardápio público

1. o cliente acessa `/{slug}`;
2. a aplicação busca dados públicos da loja via RPC;
3. carrega categorias e produtos disponíveis via RPC;
4. monta o carrinho no navegador com `localStorage` por loja;
5. segue para `/{slug}/checkout`.

### 2. Fluxo do checkout

1. o checkout lê o carrinho salvo da loja;
2. coleta nome e telefone do cliente;
3. chama a RPC `create_checkout_session_by_slug(...)`;
4. o servidor valida loja, itens, disponibilidade e estoque;
5. cria `checkout_sessions` e `checkout_session_items`;
6. a interface exibe a sessão criada como aguardando pagamento.

### 3. Fluxo atual de pagamento (modo demo)

Enquanto a integração com gateway real não foi implementada, o projeto usa um fluxo temporário de demonstração:

1. após criar a `checkout_session`, a tela oferece o botão **Simular pagamento aprovado**;
2. a RPC `simulate_checkout_payment_success(...)` marca a sessão como paga;
3. a função `convert_paid_checkout_session_to_order(...)` converte a sessão em pedido real;
4. o usuário é redirecionado para a página pública do pedido.

### 4. Fluxo do pedido

1. o pedido entra em `orders` com status `aguardando_aceite`;
2. aparece no painel administrativo da loja;
3. o comerciante pode aceitar, recusar, marcar como pronto e finalizar;
4. a página pública do pedido reflete os timestamps e o status operacional.

---

## Regras importantes do domínio

### 1 loja por conta

Nesta fase, a regra do projeto é:

- **1 conta autenticada = 1 loja**

### `is_active` x `is_available`

O projeto separa dois conceitos em produtos:

- `is_active` → produto continua cadastrado e ativo no sistema;
- `is_available` → produto está disponível para venda naquele momento.

### Estoque

Quando `track_stock = true`:

- o sistema passa a considerar `stock_quantity`;
- produtos sem estoque podem deixar de aparecer no cardápio público;
- a conversão do checkout em pedido também valida estoque no servidor.

### Pedido público seguro

O acesso à página pública do pedido depende de:

- `slug` da loja;
- `id` do pedido;
- `token` público do pedido.

Isso evita exposição indevida de pedidos de outras lojas ou de outros clientes.

---

## Banco de dados e Supabase

O projeto utiliza Supabase como backend principal.

### Principais entidades

- `profiles`
- `stores`
- `store_settings`
- `categories`
- `products`
- `orders`
- `order_items`
- `checkout_sessions`
- `checkout_session_items`

### RPCs relevantes no estado atual

- `get_public_store_by_slug`
- `get_public_menu_by_slug`
- `get_public_order`
- `get_latest_ready_order_for_store`
- `create_checkout_session_by_slug`
- `convert_paid_checkout_session_to_order`
- `simulate_checkout_payment_success`

### Migrations importantes

Atualmente o repositório contém pelo menos estas referências importantes:

- `supabase/migrations/20260331203339_remote_schema.sql`
- `supabase/migrations/20260403001920_public_checkout_order_flow.sql`

A primeira representa o snapshot/versionamento inicial do schema remoto. A segunda registra a evolução do fluxo público de cardápio, checkout e conversão para pedido.

---

## Versionamento do banco com Supabase CLI

### Fluxo usado no projeto

Inicialização e vínculo com o projeto remoto:

```bash
npx supabase init
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
```

Para trazer o schema remoto ou gerar diferenças:

```bash
npx supabase db pull
npx supabase db diff --linked --schema public -f nome_da_migration
```

### Observações importantes

- `db pull` e `db diff` exigem Docker Desktop funcionando;
- sempre que o banco mudar, o ideal é gerar ou revisar uma migration antes de commitar;
- evitar alterações no Supabase remoto sem refletir isso no repositório.

---

## Git e colaboração

### Antes de começar a programar

```bash
git pull
npm install
npm run dev
```

### Antes de commitar

```bash
npm run lint
```

Se a mudança envolver banco:

- confirme se a migration foi criada ou atualizada;
- revise `supabase/migrations/` antes do commit.

### Arquivos que não devem ser versionados

- `.env.local`
- `.next/`
- `node_modules/`
- logs e temporários

### Arquivos que devem ser versionados

- código-fonte;
- `README.md`;
- `.env.local.example`;
- `supabase/config.toml`;
- `supabase/migrations/`.

---

## Roadmap resumido

### Concluído

- autenticação do comerciante;
- dashboard protegido;
- CRUD de categorias;
- CRUD de produtos;
- fluxo operacional de pedidos;
- cardápio público por `slug`;
- carrinho público;
- checkout com `checkout_sessions`;
- simulação de pagamento aprovado;
- conversão para pedido real;
- acompanhamento público do pedido;
- painel público de retirada;
- migration do fluxo público/checkout versionada no repositório.

### Em andamento / pendente

- integração com pagamento real;
- remoção da simulação de pagamento quando houver gateway;
- tela de configurações da loja;
- refinamentos de UX;
- melhorias operacionais para uso real.

---

## Como contribuir

1. atualize sua cópia local do repositório;
2. configure o `.env.local`;
3. instale as dependências;
4. rode o projeto localmente;
5. faça sua alteração;
6. valide a interface e o fluxo afetado;
7. rode `npm run lint`;
8. se alterar banco, registre a migration;
9. faça commit com mensagem clara;
10. envie para o GitHub.

---

## Licença

Este projeto foi desenvolvido para fins acadêmicos no contexto do projeto **CardExpress**.

A licença pode ser definida posteriormente pela equipe.

---

## Contato do projeto

Responsável principal no contexto atual do desenvolvimento:

- **Kauan Henrique Silva Paulino**

---

## Resumo final

O CardExpress já possui uma base sólida para operação de uma loja com cardápio digital e retirada no balcão. O projeto evoluiu de um painel administrativo inicial para um fluxo público completo em modo demo, incluindo cardápio, carrinho, checkout, conversão para pedido real e acompanhamento público do pedido.

A próxima etapa mais importante é substituir a simulação de pagamento por uma integração real com gateway e concluir a tela de configurações da loja, mantendo o banco e o código versionados no repositório.
