# CardExpress

## Sobre o projeto

O **CardExpress** é um sistema web de **cardápio digital com retirada no balcão**, voltado para estabelecimentos de venda rápida, como lanchonetes, barracas, quiosques e pontos de alimentação em feiras e eventos.

O cliente acessa a loja por **QR Code** ou **link público**, visualiza o cardápio, monta o carrinho, inicia o checkout e acompanha o pedido. No estado atual do projeto, o fluxo de pagamento está implementado em **modo de demonstração**: a aplicação cria uma sessão intermediária de checkout e permite **simular a aprovação do pagamento** para converter a sessão em pedido real.

Além da experiência do cliente, o sistema possui um **painel administrativo do comerciante** para gerenciar categorias, produtos, pedidos e configurações da loja.

Este repositório corresponde ao desenvolvimento do projeto acadêmico **CardExpress**, realizado em grupo.

---

## Equipe

- **Kauan Henrique Silva Paulino**
- **Gustavo Yukio Jochi**
- **Thiago Ribeiro Modesto**

---

## Status atual do projeto

O projeto já possui uma base funcional sólida, com:

- autenticação do comerciante;
- dashboard protegido;
- gerenciamento de categorias;
- gerenciamento de produtos;
- gerenciamento operacional de pedidos;
- tela de configurações da loja;
- cardápio público dinâmico por `slug`;
- busca e navegação por categoria no cardápio público;
- carrinho público com persistência local por loja;
- checkout público com criação de `checkout_sessions`;
- simulação de pagamento aprovado para desenvolvimento/demo;
- conversão de checkout em pedido real;
- acompanhamento público do pedido por `token`;
- painel público de retirada;
- melhorias amplas de UX em desktop e mobile.

---

## O que já está implementado

### Autenticação e estrutura da loja

- cadastro de comerciante;
- login e logout;
- proteção das rotas do painel;
- criação e vínculo de uma loja por conta;
- leitura da loja autenticada no dashboard.

### Painel administrativo

- tela inicial do dashboard com resumo operacional da loja;
- navegação lateral no desktop;
- menu lateral responsivo em mobile;
- headers compactos/sticky em telas principais;
- gerenciamento de categorias;
- gerenciamento de produtos;
- gerenciamento operacional de pedidos;
- configurações da loja.

### Categorias

- criar categoria;
- editar nome;
- ativar e desativar;
- reordenar;
- excluir categoria quando não houver produtos vinculados;
- criação com formulário recolhido por padrão para melhor organização da tela.

### Produtos

- criar produto;
- editar produto;
- ativar e desativar;
- controlar disponibilidade separadamente da ativação;
- suporte a controle de estoque com `track_stock` e `stock_quantity`;
- reordenar;
- excluir produto;
- badges operacionais refinados;
- exibição mais clara de estoque, disponibilidade e visibilidade pública;
- formulário de criação recolhido por padrão.

### Configurações da loja

- edição de nome da loja;
- edição de telefone;
- exibição do `slug` em modo somente leitura;
- exibição e cópia do link público da loja;
- mensagem pública da loja;
- controle de aceitação de pedidos;
- resumo de prontidão operacional;
- botão salvar habilitado apenas quando há alterações;
- descarte de alterações;
- validações coerentes de formulário.

### Área pública da loja

- rota pública `/{slug}` carregando dados reais da loja;
- exibição de categorias e produtos disponíveis;
- filtro automático de produtos inativos, indisponíveis ou sem estoque, quando aplicável;
- busca local por nome/descrição;
- chips de categoria com opção `Todos`;
- rolagem horizontal de categorias no mobile;
- busca e filtros fixos no topo do cardápio para facilitar a navegação;
- carrinho por loja com `localStorage`;
- mini barra compacta do carrinho fixa no rodapé;
- navegação para checkout.

### Checkout público

- rota pública `/{slug}/checkout`;
- leitura do carrinho por loja;
- formulário com nome e telefone obrigatórios;
- validação básica de telefone;
- criação de `checkout_sessions` e `checkout_session_items` via RPC;
- limpeza do carrinho somente após sucesso real da criação da sessão;
- botão temporário para **simular pagamento aprovado** em ambiente de desenvolvimento/demo;
- persistência local de nome e telefone no navegador para facilitar compras futuras no mesmo dispositivo.

### Pedidos

- conversão de `checkout_session` paga em pedido real;
- criação de `orders` e `order_items` a partir do checkout;
- listagem de pedidos da loja;
- filtros por escopo:
  - ativos;
  - finalizados;
  - recusados;
  - todos;
- transições operacionais com regras de status;
- ações de:
  - aceitar pedido;
  - recusar pedido;
  - marcar como pronto para retirada;
  - finalizar pedido;
- atualização de timestamps operacionais (`accepted_at`, `ready_at`, `finalized_at`, `rejected_at`);
- separação entre **status operacional** e **status de reembolso**;
- itens do pedido visíveis na operação;
- observação do pedido quando existir;
- pedidos ativos ordenados do mais antigo para o mais novo;
- histórico ordenado para facilitar consulta;
- possibilidade de expandir/recolher os itens do pedido;
- loading, vazio e erro dedicados na rota de pedidos;
- melhor responsividade no mobile.

### Acompanhamento público

- página pública `/{slug}/pedido/[id]?token=...`;
- validação por:
  - `slug` da loja;
  - `id` do pedido;
  - `public_token` do pedido;
- exibição pública do status do pedido e timestamps relevantes;
- painel público `/{slug}/painel` exibindo o último pedido pronto para retirada.

### Banco de dados

- projeto integrado ao **Supabase**;
- uso de Auth, Database, RPC e RLS;
- schema versionado localmente em `supabase/migrations/`;
- fluxo público de checkout e conversão para pedido versionado no repositório.

---

## O que ainda falta desenvolver

As principais frentes restantes são:

- integração com **gateway de pagamento real**;
- substituição da simulação de pagamento por confirmação real de pagamento;
- possíveis melhorias operacionais adicionais para uso real;
- refinamentos visuais finais;
- documentação técnica contínua;
- evolução futura de métricas, relatórios e consultas mais avançadas, se necessário.

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

> O projeto pode rodar localmente sem Docker no dia a dia, mas comandos da Supabase CLI como `db pull` e `db diff` dependem do Docker Desktop funcionando.

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
- `/dashboard` → visão geral da operação;
- `/dashboard/categorias` → gerenciamento de categorias;
- `/dashboard/produtos` → gerenciamento de produtos;
- `/dashboard/pedidos` → operação e histórico de pedidos;
- `/dashboard/configuracoes` → configurações da loja.

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
3. carrega categorias e produtos disponíveis;
4. permite busca local e navegação por categoria;
5. monta o carrinho no navegador com `localStorage` por loja;
6. segue para `/{slug}/checkout`.

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
4. os itens do pedido e a observação ficam visíveis na operação;
5. a página pública do pedido reflete o status e os timestamps.

---

## Regras importantes do domínio

### 1 loja por conta

Nesta fase, a regra do projeto é:

- **1 conta autenticada = 1 loja**

### Cliente sem conta nesta fase

Nesta versão do projeto:

- o cliente **não** precisa criar conta;
- a identificação do cliente é simples, com nome e telefone;
- o histórico global do cliente entre dispositivos não faz parte do escopo atual.

### `is_active` x `is_available`

O projeto separa dois conceitos em produtos:

- `is_active` → produto continua cadastrado e ativo no sistema;
- `is_available` → produto está com venda liberada naquele momento.

### Estoque

Quando `track_stock = true`:

- o sistema passa a considerar `stock_quantity`;
- produtos sem estoque podem deixar de aparecer no cardápio público;
- a conversão do checkout em pedido também valida estoque no servidor.

### Visibilidade pública do produto

Um produto só aparece no cardápio público quando:

- está ativo;
- está com venda liberada;
- e possui estoque positivo, quando houver controle de estoque.

### Pedido público seguro

O acesso à página pública do pedido depende de:

- `slug` da loja;
- `id` do pedido;
- `token` público do pedido.

Isso evita exposição indevida de pedidos de outras lojas ou de outros clientes.

### Pagamento confirmado antes do pedido operacional

A lógica do projeto mantém a regra de que o pedido só deve entrar no fluxo operacional após confirmação do pagamento. Na fase atual, essa confirmação é simulada em ambiente demo.

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

Consulte a pasta `supabase/migrations/` para o histórico versionado do banco.

Referências importantes já utilizadas no projeto:

- `supabase/migrations/20260331203339_remote_schema.sql`
- `supabase/migrations/20260403001920_public_checkout_order_flow.sql`

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
- configurações da loja;
- fluxo operacional de pedidos;
- histórico e escopos de pedidos no dashboard;
- cardápio público por `slug`;
- busca local e filtro por categoria;
- carrinho público com persistência local;
- mini carrinho fixo no cardápio;
- checkout com `checkout_sessions`;
- simulação de pagamento aprovado;
- conversão para pedido real;
- acompanhamento público do pedido;
- painel público de retirada;
- melhorias amplas de responsividade e UX no dashboard e na área pública.

### Em andamento / pendente

- integração com pagamento real;
- remoção da simulação de pagamento quando houver gateway;
- refinamentos finais para uso real;
- evolução futura de relatórios e métricas, se necessário.

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

O CardExpress já possui uma base sólida para operação de uma loja com cardápio digital e retirada no balcão. O projeto evoluiu para um fluxo público funcional em modo demo, com cardápio, carrinho, checkout, conversão para pedido real, acompanhamento público do pedido e operação administrativa consistente.

A próxima etapa mais importante é substituir a simulação de pagamento por uma integração real com gateway, mantendo o banco e o código versionados no repositório.