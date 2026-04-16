# CardExpress

## Sobre o projeto

O **CardExpress** é um sistema web de **cardápio digital com retirada no balcão**, voltado para estabelecimentos de venda rápida, como lanchonetes, quiosques, barracas, trailers e pontos de alimentação em feiras e eventos.

O cliente acessa a loja por **QR Code** ou **link público**, visualiza o cardápio, monta o carrinho, segue para o checkout e acompanha o pedido. No estado atual do projeto, o pagamento permanece em **modo demo**: a aplicação cria uma sessão intermediária de checkout e permite **simular a aprovação do pagamento** para converter a sessão em pedido real.

Além da experiência do cliente, o sistema possui um **painel administrativo do comerciante** para gerenciar categorias, produtos, pedidos e configurações da loja, com foco em operação prática, coerência de estoque e **atualização em tempo real** nas telas mais relevantes.

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
- carrinho público com persistência local por loja;
- checkout público com criação de `checkout_sessions`;
- simulação de pagamento aprovado para desenvolvimento/demo;
- conversão de checkout em pedido real;
- acompanhamento público do pedido por `token`;
- painel público de retirada;
- controle de estoque integrado ao fluxo de pedidos;
- status operacionais de pedido incluindo **recusado** e **cancelado**;
- devolução de estoque em transições terminais aplicáveis;
- melhorias amplas de UX em desktop e mobile;
- **atualização em tempo real** nas rotas operacionais e públicas principais.
- painel público com versão WEB e modo TV dedicado;
- recuperação pública sem login por `slug`, com persistência local de checkout e pedidos;
- retomada de múltiplos pedidos em andamento no mesmo aparelho;
- ações de copiar/compartilhar link no checkout criado e no pedido público;
- checkout com ajuste de quantidade diretamente no resumo;
- destaque visual de itens problemáticos no checkout quando houver conflito de estoque/disponibilidade;
- cancelamento de checkout integrado ao fluxo público;

---

## O que já está implementado

### Autenticação e estrutura da loja

- cadastro de comerciante;
- login e logout;
- proteção das rotas do painel;
- criação e vínculo de **uma loja por conta**;
- leitura da loja autenticada no dashboard.

### Painel administrativo

- tela inicial do dashboard com **resumo operacional da loja**;
- navegação lateral no desktop;
- menu lateral responsivo em mobile;
- headers compactos/sticky em telas principais;
- gerenciamento de categorias;
- gerenciamento de produtos;
- gerenciamento operacional de pedidos;
- configurações da loja;
- melhorias de legibilidade e organização da Home do dashboard.

### Home do dashboard (`/dashboard`)

- resumo operacional da loja;
- métricas de:
  - categorias ativas;
  - produtos visíveis no cardápio;
  - pedidos aguardando aceite;
  - pedidos em preparo;
  - pedidos prontos para retirada;
  - pedidos finalizados no dia;
  - valor vendido no dia;
  - ticket médio do dia;
  - produtos sem estoque;
  - produtos com estoque baixo;
- top 5 produtos mais vendidos no dia;
- lista de últimos pedidos;
- reorganização visual por grupos operacionais;
- remoção dos atalhos rápidos;
- **atualização em tempo real** por loja.

### Categorias

- criar categoria;
- editar nome;
- ativar e desativar;
- reordenar;
- excluir categoria quando não houver produtos vinculados;
- criação com formulário recolhido por padrão para melhor organização da tela;
- **atualização automática em tempo real** na tela de categorias.

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
- criação com formulário recolhido por padrão;
- **atualização automática em tempo real** na tela de produtos.

### Configurações da loja

- edição de nome da loja;
- edição de telefone;
- exibição do `slug` em modo somente leitura;
- exibição e cópia do link público da loja;
- QR Code do cardápio público;
- mensagem pública da loja;
- controle manual de aceitação de pedidos;
- resumo de prontidão operacional;
- botão salvar habilitado apenas quando há alterações;
- descarte de alterações;
- validações coerentes de formulário;
- **atualização automática em tempo real** da tela quando não há alterações locais não salvas;
- proteção para não sobrescrever formulário `dirty` durante refresh.

### Área pública da loja

- rota pública `/{slug}` carregando dados reais da loja;
- exibição de categorias e produtos disponíveis;
- filtro automático de produtos inativos, indisponíveis ou sem estoque, quando aplicável;
- busca local por nome/descrição;
- chips de categoria com opção `Todos`;
- rolagem horizontal de categorias no mobile;
- busca e filtros fixos no topo do cardápio;
- carrinho por loja com `localStorage`;
- mini barra compacta do carrinho fixa no rodapé;
- navegação para checkout;
- coerência entre status público da loja e cardápio efetivamente disponível;
- **atualização automática em tempo real** do cardápio público;
- reconciliação automática do carrinho quando preço ou disponibilidade mudam.
- retomada automática de checkout e pedidos em andamento no mesmo dispositivo;
- suporte a múltiplos pedidos em andamento por loja no banner de recuperação;
- ações de copiar/compartilhar link nas telas públicas relevantes;

### Checkout público

- rota pública `/{slug}/checkout`;
- leitura do carrinho por loja;
- formulário com nome e telefone obrigatórios;
- validação básica de telefone;
- criação de `checkout_sessions` e `checkout_session_items` via RPC;
- limpeza do carrinho somente após sucesso real da criação da sessão;
- botão temporário para **simular pagamento aprovado** em ambiente de desenvolvimento/demo;
- persistência local de nome e telefone no navegador para facilitar compras futuras no mesmo dispositivo;
- reconciliação automática do checkout com o cardápio atual;
- **atualização automática em tempo real** do checkout para refletir mudanças de preço, disponibilidade e status da loja.
- recuperação local da `checkout_session` no mesmo aparelho;
- botão para cancelar checkout quando a sessão ainda estiver pendente;
- controles de aumentar e diminuir quantidade diretamente no resumo do checkout;
- destaque visual de itens com problema de estoque ou indisponibilidade;
- mensagens públicas mais específicas para conflitos de disponibilidade/estoque;

### Pedidos

- conversão de `checkout_session` paga em pedido real;
- criação de `orders` e `order_items` a partir do checkout;
- listagem de pedidos da loja;
- filtros por escopo:
  - ativos;
  - finalizados;
  - recusados;
  - cancelados;
  - todos;
- transições operacionais com regras de status;
- ações de:
  - aceitar pedido;
  - recusar pedido;
  - marcar como pronto para retirada;
  - finalizar pedido;
  - cancelar pedido em `em_preparo`;
- atualização de timestamps operacionais:
  - `accepted_at`
  - `ready_at`
  - `finalized_at`
  - `rejected_at`
  - `cancelled_at`
- separação entre **status operacional** e **status de reembolso**;
- itens do pedido visíveis na operação;
- observação do pedido quando existir;
- pedidos ativos ordenados do mais antigo para o mais novo;
- histórico ordenado para facilitar consulta;
- possibilidade de expandir/recolher os itens do pedido;
- loading, vazio e erro dedicados na rota de pedidos;
- melhor responsividade no mobile;
- **atualização em tempo real** em `/dashboard/pedidos`.
- toast global para novo pedido aguardando aceite;
- badge na sidebar em Pedidos;
- destaque local do card novo com fase forte e fase leve;
- som de novo pedido no dashboard;
- deduplicação de toasts;
- correção de UX para não depender de reload da página.

### Regras de estoque no fluxo de pedidos

- o estoque é abatido quando a `checkout_session` paga é convertida em pedido real;
- ao **recusar** um pedido em `aguardando_aceite`, o sistema devolve o estoque;
- ao **cancelar** um pedido em `em_preparo`, o sistema devolve o estoque;
- o reembolso financeiro real **não** foi implementado nesta fase;
- no modo demo, o reembolso continua apenas como estado operacional simulado.

### Acompanhamento público

- página pública `/{slug}/pedido/[id]?token=...`;
- validação por:
  - `slug` da loja;
  - `id` do pedido;
  - `public_token` do pedido;
- exibição pública do status do pedido e timestamps relevantes;
- suporte a estados terminais, incluindo **recusado** e **cancelado**;
- **atualização em tempo real** da página pública do pedido por canal específico do próprio pedido;
- painel público `/{slug}/painel` exibindo o pedido mais recente que ficou pronto para retirada;
- **atualização em tempo real** do painel público.
- a página pública do pedido agora tem alerta amigável e som suave em mudança real de status;
- o painel público passou a exibir não só o pedido mais recente pronto, mas também os últimos chamados vindos do sistema;
- o painel público tem controle de som e o histórico recente agora é persistente por RPC, não mais local ao navegador.
- ações de copiar/compartilhar link do pedido público;
- retomada pública sem login com persistência local por loja;
- painel público com modo TV em `/{slug}/painel/tv`;
- painel WEB e painel TV com layouts distintos para operação e exibição;

### Banco de dados

- projeto integrado ao **Supabase**;
- uso de Auth, Database, RPC, RLS e Realtime;
- schema versionado localmente em `supabase/migrations/`;
- fluxo público de checkout e conversão para pedido versionado no repositório;
- triggers, funções e broadcasts específicos para atualização em tempo real nas telas-chave.

---

## O que ainda falta desenvolver

As principais frentes restantes são:

- integração com **gateway de pagamento real**;
- substituição da simulação de pagamento por confirmação real;
- eventuais ajustes finais para implantação em ambiente real;
- documentação técnica final e relatório acadêmico;
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
  - Realtime

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

Crie um arquivo `.env.local` na raiz do projeto.

Se o arquivo `.env.local.example` ainda não existir no repositório local, crie-o também e versione-o.

### `.env.local.example`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
````

### `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=SEU_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

### Onde encontrar os valores

No painel do Supabase:

* acesse o projeto;
* vá em **Settings** → **API**;
* copie:

  * **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
  * **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

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

### `npm run test:e2e`

Executa a suíte E2E/smoke com Playwright.

### `npm run test:e2e:headed`

Executa a suíte E2E em modo visual (headed).

### `npm run test:e2e:ui`

Abre o runner interativo do Playwright.

---

## Testes E2E (Playwright)

### Pré-requisitos

1. Copie `.env.e2e.example` para `.env.e2e` e preencha as credenciais de um comerciante existente.
2. Garanta que a conta usada tenha loja vinculada e permissão para operar no dashboard.
3. Instale os navegadores do Playwright (primeira execução):

```bash
npx playwright install chromium
```

### Variáveis mínimas

```env
CARDEXPRESS_E2E_EMAIL=
CARDEXPRESS_E2E_PASSWORD=
```

Variáveis opcionais: `PLAYWRIGHT_BASE_URL`, `CARDEXPRESS_E2E_CUSTOMER_NAME`, `CARDEXPRESS_E2E_CUSTOMER_PHONE`, `CARDEXPRESS_E2E_RUN_ID`.

### Execução

```bash
npm run test:e2e
```

Para checar descoberta da suíte sem execução completa:

```bash
npm run test:e2e -- --list
```

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
│  ├─ public/
│  └─ shared/
├─ lib/
│  ├─ auth/
│  ├─ orders/
│  ├─ public/
│  ├─ supabase/
│  ├─ validation/
│  ├─ timezone.ts
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

* `/cadastro` → cadastro de comerciante e loja;
* `/login` → autenticação;
* `/dashboard` → visão geral da operação;
* `/dashboard/categorias` → gerenciamento de categorias;
* `/dashboard/produtos` → gerenciamento de produtos;
* `/dashboard/pedidos` → operação e histórico de pedidos;
* `/dashboard/configuracoes` → configurações da loja.

### Área pública

* `/{slug}` → cardápio público da loja;
* `/{slug}/checkout` → checkout público;
* `/{slug}/pedido/[id]?token=...` → acompanhamento público do pedido;
* `/{slug}/painel` → painel público de retirada.
* `/{slug}/painel/tv` → painel público em modo TV/monitor;

---

## Fluxos principais

### 1. Fluxo do cardápio público

1. o cliente acessa `/{slug}`;
2. a aplicação busca dados públicos da loja via RPC;
3. carrega categorias e produtos disponíveis;
4. permite busca local e navegação por categoria;
5. monta o carrinho no navegador com `localStorage` por loja;
6. segue para `/{slug}/checkout`;
7. se preço, disponibilidade ou status da loja mudarem, a interface reconcilia o carrinho com o cardápio atual.

### 2. Fluxo do checkout

1. o checkout lê o carrinho salvo da loja;
2. coleta nome e telefone do cliente;
3. chama a RPC `create_checkout_session_by_slug(...)`;
4. o servidor valida loja, itens, disponibilidade e estoque;
5. cria `checkout_sessions` e `checkout_session_items`;
6. a interface exibe a sessão criada como aguardando pagamento;
7. o checkout continua reagindo ao cardápio atual enquanto estiver aberto.

### 3. Fluxo atual de pagamento (modo demo)

Enquanto a integração com gateway real não foi implementada, o projeto usa um fluxo temporário de demonstração:

1. após criar a `checkout_session`, a tela oferece o botão **Simular pagamento aprovado**;
2. a RPC `simulate_checkout_payment_success(...)` marca a sessão como paga;
3. a função `convert_paid_checkout_session_to_order(...)` converte a sessão em pedido real;
4. o usuário é redirecionado para a página pública do pedido.

### 4. Fluxo do pedido

1. o pedido entra em `orders` com status `aguardando_aceite`;
2. aparece no painel administrativo da loja;
3. o comerciante pode:

   * aceitar;
   * recusar;
   * marcar como pronto para retirada;
   * finalizar;
   * cancelar em `em_preparo`;
4. os itens do pedido e a observação ficam visíveis na operação;
5. a página pública do pedido reflete o status e os timestamps;
6. o painel público reflete o pedido mais recente pronto para retirada;
7. as principais telas operacionais se atualizam em tempo real.

---

## Realtime no projeto

O CardExpress usa Realtime de forma **seletiva**, conforme o contexto de segurança e uso.

### Já implementado

#### Área autenticada

* `/dashboard`

  * broadcast privado por loja para atualizar a Home;
* `/dashboard/pedidos`

  * atualização em tempo real da operação de pedidos;
* `/dashboard/produtos`

  * atualização em tempo real da listagem operacional;
* `/dashboard/categorias`

  * atualização em tempo real da listagem operacional;
* `/dashboard/configuracoes`

  * atualização em tempo real do estado operacional da loja, com proteção para não sobrescrever alterações locais não salvas.

#### Área pública

* `/{slug}`

  * broadcast público mínimo por loja para atualizar cardápio, disponibilidade e mensagem pública;
* `/{slug}/checkout`

  * atualização em tempo real do checkout com reconciliação do carrinho;
* `/{slug}/painel`

  * broadcast público mínimo por loja para atualizar o painel público;
* `/{slug}/pedido/[id]?token=...`

  * broadcast público mínimo por pedido, usando `orderId + publicToken` no tópico.

### Estratégia adotada

* o **payload de Realtime não carrega dados sensíveis** nas rotas públicas;
* as páginas continuam usando RPCs e lógica server como **fonte da verdade**;
* os eventos servem principalmente para disparar `refresh` da rota;
* a implementação distingue contexto público e autenticado com revisão de segurança;
* o frontend utiliza debounce, recuperação de conexão e atualização automática nas páginas principais.

---

## Regras importantes do domínio

### 1 loja por conta

Nesta fase, a regra do projeto é:

* **1 conta autenticada = 1 loja**

### Cliente sem conta nesta fase

Nesta versão do projeto:

* o cliente **não** precisa criar conta;
* a identificação do cliente é simples, com nome e telefone;
* o histórico global do cliente entre dispositivos não faz parte do escopo atual.

### Slug não editável nesta fase

No estado atual do projeto:

* o `slug` público da loja é tratado como identificador estável;
* ele aparece em modo somente leitura nas configurações;
* a edição do `slug` não faz parte desta fase.

### Configurações separadas de pagamentos e conta

Nesta fase:

* as configurações da loja ficam em `/dashboard/configuracoes`;
* uma futura integração de pagamentos deve ter área própria;
* conta, senha e segurança não devem ser misturadas com configurações operacionais da loja.

### `is_active` x `is_available`

O projeto separa dois conceitos em produtos:

* `is_active` → produto continua cadastrado e ativo no sistema;
* `is_available` → produto está com venda liberada naquele momento.

### Estoque

Quando `track_stock = true`:

* o sistema passa a considerar `stock_quantity`;
* produtos sem estoque podem deixar de aparecer no cardápio público;
* a conversão do checkout em pedido também valida estoque no servidor.

### Visibilidade pública do produto

Um produto só aparece no cardápio público quando:

* está ativo;
* está com venda liberada;
* e possui estoque positivo, quando houver controle de estoque.

### Disponibilidade pública efetiva da loja

Na área pública, a loja só deve aparecer como apta a receber pedidos quando:

* `accepts_orders` está ativo;
* e existe cardápio público efetivamente disponível para pedido.

### Pedido público seguro

O acesso à página pública do pedido depende de:

* `slug` da loja;
* `id` do pedido;
* `token` público do pedido.

### Pagamento confirmado antes do pedido operacional

A lógica do projeto mantém a regra de que o pedido só deve entrar no fluxo operacional após confirmação do pagamento. Na fase atual, essa confirmação é simulada em ambiente demo.

---

## Banco de dados e Supabase

O projeto utiliza Supabase como backend principal.

### Principais entidades

* `profiles`
* `stores`
* `store_settings`
* `categories`
* `products`
* `orders`
* `order_items`
* `checkout_sessions`
* `checkout_session_items`

### RPCs relevantes no estado atual

* `get_public_store_by_slug`
* `get_public_menu_by_slug`
* `get_public_order`
* `get_latest_ready_order_for_store`
* `create_checkout_session_by_slug`
* `convert_paid_checkout_session_to_order`
* `simulate_checkout_payment_success`
* `transition_order_to_terminal`
* `get_recent_called_orders_for_store`
* `cancel_checkout_session_by_token`

### Migrations

Consulte a pasta `supabase/migrations/` para o histórico versionado do banco.

> Como parte do desenvolvimento, algumas alterações foram aplicadas manualmente no Supabase e depois versionadas no repositório. Sempre confirme se o histórico remoto e o local continuam coerentes.

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

Para aplicar migrations pendentes no remoto:

```bash
npx supabase db push
```

### Observações importantes

* `db pull` e `db diff` exigem Docker Desktop funcionando;
* sempre que o banco mudar, o ideal é gerar ou revisar uma migration antes de commitar;
* evitar alterações no Supabase remoto sem refletir isso no repositório;
* quando uma mudança for aplicada manualmente no SQL Editor, ela deve ser **versionada depois em `supabase/migrations/`**;
* se o remoto já tiver recebido uma alteração manualmente e o `db push` acusar objeto já existente, revise o histórico com:

  ```bash
  npx supabase migration list
  npx supabase migration repair <timestamp> --status applied
  ```

  e depois tente novamente o `db push`.

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
npm run build
```

Se a mudança envolver banco:

* confirme se a migration foi criada ou atualizada;
* revise `supabase/migrations/` antes do commit.

### Arquivos que não devem ser versionados

* `.env.local`
* `.next/`
* `node_modules/`
* logs e temporários

### Arquivos que devem ser versionados

* código-fonte;
* `README.md`;
* `.env.local.example`;
* `supabase/config.toml`;
* `supabase/migrations/`.

---

## Roadmap resumido

### Concluído

* autenticação do comerciante;
* dashboard protegido;
* CRUD de categorias;
* CRUD de produtos;
* configurações da loja;
* fluxo operacional de pedidos;
* histórico e escopos de pedidos no dashboard;
* cardápio público por `slug`;
* busca local e filtro por categoria;
* carrinho público com persistência local;
* mini carrinho fixo no cardápio;
* checkout com `checkout_sessions`;
* simulação de pagamento aprovado;
* conversão para pedido real;
* acompanhamento público do pedido;
* painel público de retirada;
* Home do dashboard com métricas operacionais;
* atualização em tempo real nas páginas principais;
* suporte a pedido **cancelado**;
* devolução de estoque em **recusa** e **cancelamento**;
* melhorias amplas de responsividade e UX no dashboard e na área pública.

### Em andamento / pendente

* integração com pagamento real;
* remoção da simulação de pagamento quando houver gateway;
* ajustes pontuais para implantação em ambiente real;
* documentação acadêmica final;
* evolução futura de relatórios e métricas, se necessário.

---

## Como contribuir

1. atualize sua cópia local do repositório;
2. configure o `.env.local`;
3. instale as dependências;
4. rode o projeto localmente;
5. faça sua alteração;
6. valide a interface e o fluxo afetado;
7. rode `npm run lint`;
8. rode `npm run build`;
9. se alterar banco, registre a migration;
10. faça commit com mensagem clara;
11. envie para o GitHub.

---

## Licença

Este projeto foi desenvolvido para fins acadêmicos no contexto do projeto **CardExpress**.

A licença pode ser definida posteriormente pela equipe.

---

## Contato do projeto

Responsável principal no contexto atual do desenvolvimento:

* **Kauan Henrique Silva Paulino**

---

## Resumo final

O CardExpress já possui uma base sólida para operação de uma loja com cardápio digital e retirada no balcão. O projeto evoluiu para um fluxo público funcional em modo demo, com cardápio, carrinho, checkout, conversão para pedido real, acompanhamento público do pedido e operação administrativa consistente.

Além disso, o projeto passou a contar com atualização em tempo real nas áreas mais relevantes da operação, melhoria de coerência entre painel administrativo e área pública, reconciliação do carrinho e do checkout com o cardápio atual e tratamento de estados operacionais importantes como **recusa** e **cancelamento** com devolução de estoque.

A principal evolução futura para uso real é a substituição da simulação atual por uma integração efetiva com gateway de pagamento, mantendo banco, código e migrations alinhados no repositório.