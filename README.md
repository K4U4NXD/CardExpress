# CardExpress

## Sobre o projeto

O **CardExpress** é um sistema web de **cardápio digital com retirada no balcão**, voltado para estabelecimentos de venda rápida, como lanchonetes, quiosques, barracas, trailers e pontos de alimentação em feiras e eventos.

O cliente acessa a loja por **QR Code** ou **link público**, visualiza o cardápio, monta o carrinho, segue para o checkout e acompanha o pedido.

No estado atual do projeto, o pagamento permanece em **modo demo**: a aplicação cria uma sessão intermediária de checkout e permite **simular a aprovação do pagamento** para converter a sessão em pedido real.

Além da experiência do cliente, o sistema possui um **painel administrativo do comerciante** para gerenciar categorias, produtos, pedidos e configurações da loja, com foco em operação prática, coerência de estoque, branding da loja e **atualização em tempo real** nas telas mais relevantes.

Este repositório corresponde ao desenvolvimento do projeto acadêmico **CardExpress**, realizado em grupo.

---

## Equipe

- **Kauan Henrique Silva Paulino**
- **Gustavo Yukio Jochi**
- **Thiago Ribeiro Modesto**

---

## Status atual do projeto

O projeto já possui uma base funcional sólida, com:

- autenticação do comerciante com Supabase Auth;
- confirmação de e-mail obrigatória para concluir a criação da conta;
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
- painel público em modo TV;
- controle de estoque integrado ao fluxo de pedidos;
- status operacionais incluindo **recusado** e **cancelado**;
- devolução de estoque em transições terminais aplicáveis;
- branding público por loja;
- logo da loja por URL ou upload;
- melhorias amplas de UX em desktop e mobile;
- dashboard reorganizada, com versão mobile mais compacta para operação em celular;
- indicadores do dashboard com filtros de Hoje, Semana atual e Período operacional sem reload da página;
- modos operacionais da loja: Loja offline, Aberta manualmente e Horário automático;
- registro de período manual em `store_operational_periods`;
- horário automático calculado com base em `America/Sao_Paulo`;
- produto que zera estoque por venda continua visível no cardápio como indisponível;
- `is_available` permanece como decisão manual do comerciante, sem pausa automática ao estoque chegar a zero;
- redução de refresh desnecessário ao voltar foco para a aba;
- **atualização em tempo real** nas rotas operacionais e públicas principais.
- imagem de produto por URL ou upload;
- exclusão segura de produto com preservação de histórico;
- produto com categoria principal e categorias adicionais;
- exclusão de categoria liberada quando restam apenas produtos arquivados/históricos vinculados;
- categorias e produtos usam seleção contextual para editar, ativar, pausar/disponibilizar e excluir;
- confirmação refinada para exclusão de produto, no padrão do dashboard;
- revisão de textos e acentuação nas páginas principais do painel e do acompanhamento público do pedido;
- landing page comercial refinada, com hero, visão do produto, diferenciais, benefícios, CTA de demonstração e navegação responsiva;
- navbar da landing com branding CARDEXPRESS no mobile;
- modais de confirmação refinados para exclusão de categorias e produtos, sem alerta nativo do navegador;
- bloqueio de rolagem do fundo enquanto modais de exclusão estão abertos;
- alertas de produtos sem estoque e estoque baixo com scroll interno na Home do dashboard;
- suíte E2E/smoke ampliada para cobrir modos operacionais, estoque zerado, dashboard e navegação mobile;

### Validação recente do fluxo crítico

Além da validação manual contínua, o projeto conta com uma suíte **E2E/smoke com Playwright** cobrindo o fluxo crítico do MVP.

Cenários validados localmente:
- fluxo público feliz;
- reflexo operacional no dashboard e no painel público;
- modos operacionais da loja: Loja offline, Aberta manualmente e Horário automático;
- bloqueio de criação de checkout quando a loja está offline ou fora do horário;
- conversão de checkout já criado mesmo após fechamento posterior da loja;
- tratamento de bordas de estoque com múltiplos itens problemáticos;
- produto vendido até estoque zero permanecendo visível no cardápio como indisponível;
- cancelamento de checkout e recovery público sem ressuscitar sessão inválida;
- filtros da dashboard sem reload da página e sem reset de scroll;
- navegação básica mobile no dashboard;
- visibilidade pública de produto sem estoque com bloqueio de compra.

---

## O que já está implementado

### Autenticação e onboarding

- cadastro inicial do comerciante com Supabase Auth;
- confirmação de e-mail obrigatória para concluir a criação da conta;
- tela dedicada de confirmação em `/cadastro/confirmar-email`;
- callback interno em `/auth/confirm`;
- criação de `profile`, `store` e `store_settings` apenas após a confirmação do e-mail;
- fluxo idempotente de finalização do cadastro;
- correção de slug em `/dashboard/finalizar-cadastro` quando houver conflito;
- login com mensagem específica quando a conta ainda não confirmou o e-mail;
- logout;
- proteção das rotas internas do painel;
- regra atual: **1 conta autenticada = 1 loja**.

### Painel administrativo

- tela inicial do dashboard com **resumo operacional da loja**;
- navegação lateral no desktop;
- menu lateral responsivo em mobile;
- headers compactos/sticky nas telas principais;
- gerenciamento de categorias;
- gerenciamento de produtos;
- gerenciamento operacional de pedidos;
- configurações da loja;
- melhorias de legibilidade e organização da Home do dashboard;
- dashboard mobile compactada, com status da loja, visão operacional, alertas, indicadores e últimos pedidos em blocos mais leves.

### Home do dashboard (`/dashboard`)

- resumo operacional da loja;
- visão operacional fixa com:
  - categorias ativas;
  - produtos aptos para compra;
  - produtos sem estoque;
  - produtos com estoque baixo;
  - pedidos aguardando aceite;
  - pedidos em preparo;
  - pedidos prontos para retirada;
- indicadores com filtro por período:
  - Hoje;
  - Semana atual;
  - Período operacional;
- métricas por período:
  - pedidos finalizados;
  - total vendido;
  - ticket médio;
- top 5 produtos mais vendidos no período selecionado;
- alertas de estoque com nomes dos produtos sem estoque e com estoque baixo;
- lista de últimos pedidos;
- troca de período nos indicadores sem reload da página e sem reset de scroll;
- reorganização visual por grupos operacionais;
- refinamento da versão mobile com cards numéricos menores e menos aninhamento visual;
- remoção dos atalhos rápidos;
- **atualização em tempo real** por loja.
- listas de produtos sem estoque e estoque baixo com scroll interno para evitar quebra de layout quando houver muitos itens;

### Categorias

- criar categoria;
- editar nome;
- ativar e desativar;
- reordenar com **drag and drop no desktop**;
- reordenar no mobile com fluxo compacto por controles de ordenação;
- excluir categoria quando não houver produtos vinculados;
- formulário recolhido por padrão;
- **atualização automática em tempo real** na tela de categorias.
- confirmação customizada e refinada para exclusão de categoria, sem uso de alerta nativo do navegador;

### Produtos

- criar produto;
- editar produto;
- vincular produto a uma categoria principal e a categorias adicionais;
- ativar e desativar;
- controlar disponibilidade separadamente da ativação;
- suporte a controle de estoque com `track_stock` e `stock_quantity`;
- imagem de produto por link externo;
- imagem de produto por upload;
- regra de imagem: **link ou upload**, salvando apenas a URL final em `image_url`;
- reordenar com **drag and drop no desktop**;
- reordenar no mobile com fluxo compacto por controles de ordenação;
- exclusão física quando o produto não possui histórico;
- exclusão lógica segura quando o produto já possui histórico de checkout/pedido, preservando integridade;
- produto arquivado sai das associações operacionais de categoria para não bloquear exclusões futuras;
- badges operacionais refinados;
- exibição mais clara de estoque, disponibilidade e visibilidade pública;
- formulário recolhido por padrão;
- modal de confirmação de exclusão refinado, com overlay mais limpo e bloqueio de rolagem do fundo enquanto aberto;

### Configurações da loja

- edição de nome da loja;
- edição de telefone;
- exibição do `slug` em modo somente leitura;
- indicação explícita de que o `slug` não pode ser alterado nesta fase;
- exibição e cópia do link público da loja;
- QR Code do cardápio público;
- mensagem pública da loja;
- seletor único de modo operacional:
  - **Loja offline**;
  - **Aberta manualmente**;
  - **Horário automático**;
- horário de abertura e fechamento para o modo automático;
- cálculo de horário automático com referência em `America/Sao_Paulo`;
- abertura e fechamento de períodos manuais registrados em `store_operational_periods`;
- regra de disponibilidade efetiva:
  - loja offline não aceita pedidos;
  - aberta manualmente aceita pedidos até o comerciante mudar o modo;
  - horário automático aceita pedidos apenas dentro do intervalo definido;
- resumo de prontidão operacional;
- botão salvar habilitado apenas quando há alterações;
- descarte de alterações;
- validações coerentes de formulário;
- proteção para não sobrescrever formulário `dirty` durante refresh;
- **atualização automática em tempo real** quando não há alterações locais não salvas;
- logo da loja por URL;
- logo da loja por upload;
- remoção da logo;
- persistência da logo no cardápio e no painel público.

### Branding público por loja

As páginas públicas da loja usam branding da própria loja quando disponível:

- logo da loja no cardápio público;
- logo da loja no painel público;
- fallback visual quando a loja não possui logo;
- metadata dinâmica por loja nas páginas públicas;
- títulos de aba como:
  - `Cardápio | Nome da loja`
  - `Painel | Nome da loja`
- fallback para `slug` quando o nome da loja não estiver disponível.

### Área pública da loja

- rota pública `/{slug}` carregando dados reais da loja;
- exibição de categorias e produtos disponíveis;
- filtro automático de produtos inativos ou com venda indisponível;
- produtos sem estoque continuam visíveis no cardápio público, porém bloqueados para compra;
- busca local por nome/descrição;
- chips de categoria com opção `Todos`;
- produtos vinculados a categorias adicionais aparecem em todas as categorias selecionadas;
- a visualização `Todos` renderiza seções por categoria, então um produto em múltiplas categorias pode aparecer em cada seção correspondente;
- o carrinho consolida itens pelo produto, mesmo quando o produto aparece em mais de uma categoria;
- rolagem horizontal de categorias no mobile;
- busca e filtros fixos no topo do cardápio;
- carrinho por loja com `localStorage`;
- mini barra compacta do carrinho fixa no rodapé;
- navegação para checkout;
- coerência entre status público da loja e cardápio efetivamente disponível;
- **atualização automática em tempo real** do cardápio público;
- reconciliação automática do carrinho quando preço ou disponibilidade mudam;
- retomada automática de checkout e pedidos em andamento no mesmo dispositivo;
- suporte a múltiplos pedidos em andamento por loja no banner de recuperação;
- ações de copiar/compartilhar link nas telas públicas relevantes.

### Checkout público

- rota pública `/{slug}/checkout`;
- leitura do carrinho por loja;
- formulário com nome e telefone obrigatórios;
- validação básica de telefone;
- criação de `checkout_sessions` e `checkout_session_items` via RPC;
- limpeza do carrinho somente após sucesso real da criação da sessão;
- botão temporário para **simular pagamento aprovado** em ambiente de desenvolvimento/demo;
- persistência local de nome e telefone no navegador;
- reconciliação automática do checkout com o cardápio atual;
- **atualização automática em tempo real** do checkout para refletir mudanças de preço, disponibilidade e status da loja;
- recuperação local da `checkout_session` no mesmo aparelho;
- botão para cancelar checkout quando a sessão ainda estiver pendente;
- controles de aumentar e diminuir quantidade diretamente no resumo;
- destaque visual de itens com problema de estoque ou indisponibilidade;
- identificação antecipada de conflitos de estoque no carrinho e no checkout;
- mensagens públicas mais específicas para conflitos de disponibilidade/estoque.

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
- **atualização em tempo real** em `/dashboard/pedidos`;
- toast global para novo pedido aguardando aceite;
- badge na sidebar em Pedidos;
- som de novo pedido no dashboard;
- deduplicação de toasts;
- correção de UX para não depender de reload da página.

### Regras de estoque no fluxo de pedidos

- o estoque é abatido quando a `checkout_session` paga é convertida em pedido real;
- quando o estoque chega a zero por venda, o produto continua com `is_available` inalterado;
- produto ativo e com venda liberada continua aparecendo no cardápio mesmo com estoque zero, mas fica indisponível para compra;
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
- **atualização em tempo real** do painel público;
- alerta amigável e som suave em mudança real de status na página pública do pedido;
- o painel público exibe não só o pedido mais recente pronto, mas também os últimos chamados vindos do sistema;
- o painel público tem controle de som;
- o histórico recente do painel passou a ser persistente por RPC;
- ações de copiar/compartilhar link do pedido público;
- retomada pública sem login com persistência local por loja;
- painel público com modo TV em `/{slug}/painel/tv`;
- painel WEB e painel TV com layouts distintos para operação e exibição.

### Banco de dados

- projeto integrado ao **Supabase**;
- uso de Auth, Database, RPC, RLS e Realtime;
- schema versionado localmente em `supabase/migrations/`;
- fluxo público de checkout e conversão para pedido versionado no repositório;
- triggers, funções e broadcasts específicos para atualização em tempo real nas telas-chave;
- storage público para logos de loja via bucket `public-assets`.

### Storage para imagens de produto

O projeto utiliza o mesmo bucket público `public-assets` no Supabase Storage para armazenar imagens de produto.

Padrão de caminho:

* `product-images/<store-id>/<product-id-ou-draft>/arquivo.ext`

As imagens de produto são persistidas em `products.image_url`, reaproveitando a URL pública final do arquivo.

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
  - Storage

### Ferramentas auxiliares

- **ESLint**
- **npm**
- **Supabase CLI**
- **Docker Desktop**
- **Playwright**

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

O repositório já inclui o arquivo `.env.local.example` como referência.

### `.env.local.example`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_STORE_LOGOS_BUCKET=public-assets
```

### `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=SEU_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
NEXT_PUBLIC_SUPABASE_STORE_LOGOS_BUCKET=public-assets
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

Executa a suíte E2E em modo visual.

### `npm run test:e2e:ui`

Abre o runner interativo do Playwright.

---

## Testes E2E (Playwright)

### Pré-requisitos

1. Copie `.env.e2e.example` para `.env.e2e` e preencha as credenciais de um comerciante existente.
2. Garanta que a conta usada tenha loja vinculada e permissão para operar no dashboard.
3. Instale os navegadores do Playwright na primeira execução:

```bash
npx playwright install chromium
```

### Variáveis mínimas

```env
CARDEXPRESS_E2E_EMAIL=
CARDEXPRESS_E2E_PASSWORD=
```

Variáveis opcionais:

* `PLAYWRIGHT_BASE_URL`
* `CARDEXPRESS_E2E_CUSTOMER_NAME`
* `CARDEXPRESS_E2E_CUSTOMER_PHONE`
* `CARDEXPRESS_E2E_RUN_ID`

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
│  │  │  └─ confirmar-email/
│  │  ├─ login/
│  │  └─ dashboard/
│  │     ├─ categorias/
│  │     ├─ produtos/
│  │     ├─ pedidos/
│  │     ├─ configuracoes/
│  │     └─ finalizar-cadastro/
│  ├─ (public)/
│  │  └─ [slug]/
│  │     ├─ page.tsx
│  │     ├─ checkout/
│  │     ├─ painel/
│  │     ├─ painel/tv/
│  │     └─ pedido/[id]/
│  ├─ auth/
│  │  └─ confirm/
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
│  ├─ branding.ts
│  ├─ db-errors.ts
│  ├─ orders/
│  ├─ public/
│  ├─ supabase/
│  ├─ timezone.ts
│  ├─ validation/
│  └─ public/store-logo-storage.ts
├─ public/
│  └─ branding/
│     ├─ icone-cardexpress.png
│     └─ logo-cardexpress.png
├─ tests/
│  └─ e2e/
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

* `/cadastro` → cadastro inicial do comerciante
* `/cadastro/confirmar-email` → tela dedicada de confirmação de e-mail
* `/login` → autenticação
* `/dashboard/finalizar-cadastro` → finalização do cadastro quando necessário
* `/dashboard` → visão geral da operação
* `/dashboard/categorias` → gerenciamento de categorias
* `/dashboard/produtos` → gerenciamento de produtos
* `/dashboard/pedidos` → operação e histórico de pedidos
* `/dashboard/configuracoes` → configurações da loja

### Infra/auth

* `/auth/confirm` → callback interno de confirmação de e-mail

### Área pública

* `/{slug}` → cardápio público da loja
* `/{slug}/checkout` → checkout público
* `/{slug}/pedido/[id]?token=...` → acompanhamento público do pedido
* `/{slug}/painel` → painel público de retirada
* `/{slug}/painel/tv` → painel público em modo TV/monitor

---

## Fluxos principais

### 1. Fluxo do cadastro e ativação da conta

1. o comerciante preenche o cadastro inicial;
2. o sistema cria apenas o usuário de autenticação pendente;
3. a aplicação envia o e-mail de confirmação;
4. o comerciante acessa `/cadastro/confirmar-email`;
5. o link do e-mail passa pela rota interna `/auth/confirm`;
6. após a confirmação, o sistema conclui a criação de `profile`, `store` e `store_settings`;
7. se houver conflito de `slug`, o usuário finaliza o cadastro em `/dashboard/finalizar-cadastro`;
8. após conclusão, o usuário acessa o dashboard.

### 2. Fluxo do cardápio público

1. o cliente acessa `/{slug}`;
2. a aplicação busca dados públicos da loja;
3. carrega categorias e produtos disponíveis;
4. permite busca local e navegação por categoria;
5. monta o carrinho no navegador com `localStorage` por loja;
6. segue para `/{slug}/checkout`;
7. se preço, disponibilidade ou status da loja mudarem, a interface reconcilia o carrinho com o cardápio atual.

### 3. Fluxo do checkout

1. o checkout lê o carrinho salvo da loja;
2. coleta nome e telefone do cliente;
3. chama a RPC `create_checkout_session_by_slug(...)`;
4. o servidor valida loja, itens, disponibilidade e estoque;
5. cria `checkout_sessions` e `checkout_session_items`;
6. a interface exibe a sessão criada como aguardando pagamento;
7. o checkout continua reagindo ao cardápio atual enquanto estiver aberto.

### 4. Fluxo atual de pagamento (modo demo)

Enquanto a integração com gateway real não foi implementada, o projeto usa um fluxo temporário de demonstração:

1. após criar a `checkout_session`, a tela oferece o botão **Simular pagamento aprovado**;
2. a RPC `simulate_checkout_payment_success(...)` marca a sessão como paga;
3. a função `convert_paid_checkout_session_to_order(...)` converte a sessão em pedido real;
4. o usuário é redirecionado para a página pública do pedido.

### 5. Fluxo do pedido

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
* o frontend utiliza debounce, recuperação de conexão e atualização automática nas páginas principais;
* o refresh ao voltar foco para a aba foi reduzido para evitar recarregamentos sem sinal pendente.

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

### Exclusão de produto com histórico

Quando um produto nunca foi usado em checkout ou pedido, ele pode ser removido fisicamente.

Quando o produto já possui histórico, a ação de “Excluir” remove o item da operação atual, mas preserva seus vínculos históricos no banco. Nesse caso, a remoção é feita por arquivamento lógico, sem quebrar pedidos antigos nem métricas.

### Produtos em múltiplas categorias

Produtos mantêm uma categoria principal em `products.category_id` para compatibilidade inicial e também usam `product_categories` para associações adicionais. A categoria principal sempre entra nas associações do produto. A reordenação de produtos continua global nesta etapa.

### Exclusão de categoria com histórico

Categorias com produtos ativos ou não arquivados associados continuam bloqueadas. Categorias presas apenas por produtos arquivados/históricos podem ser excluídas: as associações operacionais são removidas e produtos arquivados podem ficar com `category_id = null`, sem alterar `order_items` ou `checkout_session_items`.

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
* produtos sem estoque continuam visíveis no cardápio público, mas ficam bloqueados para compra;
* o carrinho e o checkout refletem conflitos de estoque de forma antecipada;
* a conversão do checkout em pedido também valida estoque no servidor.

### Visibilidade pública do produto

Um produto aparece no cardápio público quando:

* está ativo;
* está com venda liberada.

Quando houver controle de estoque:

* produtos com estoque positivo ficam aptos para compra;
* produtos sem estoque continuam visíveis, mas aparecem como indisponíveis para novos itens e incrementos.

### Disponibilidade pública efetiva da loja

Na área pública, a loja só deve aparecer como apta a receber pedidos quando:

* o controle manual `accepts_orders` está ativo;
* se o horário automático estiver ativo, o horário atual está dentro do intervalo configurado;
* e existe cardápio público efetivamente disponível para pedido.

Em resumo, a disponibilidade efetiva segue:

* `effective_accepts_orders = accepts_orders_manual && dentro_do_horario_configurado` (quando o horário automático está ativo);
* sem horário automático ativo, o comportamento permanece igual ao fluxo manual atual.

### Modos operacionais e período operacional atual

A tela de configurações apresenta um seletor único para evitar estados conflitantes:

* **Loja offline**: grava `accepts_orders = false` e `auto_accept_orders_by_schedule = false`;
* **Aberta manualmente**: grava `accepts_orders = true` e `auto_accept_orders_by_schedule = false`;
* **Horário automático**: grava `accepts_orders = true`, `auto_accept_orders_by_schedule = true` e exige abertura/fechamento.

Quando a loja passa para **Aberta manualmente**, o sistema registra um período em `store_operational_periods`. Quando ela passa para **Loja offline** ou **Horário automático**, o período manual aberto é fechado. Para o modo automático, o dashboard calcula a janela atual a partir dos horários configurados, sem cron, Edge Function ou serviço externo.

### Pedido público seguro

O acesso à página pública do pedido depende de:

* `slug` da loja;
* `id` do pedido;
* `token` público do pedido.

### Pagamento confirmado antes do pedido operacional

A lógica do projeto mantém a regra de que o pedido só deve entrar no fluxo operacional após confirmação do pagamento. Na fase atual, essa confirmação é simulada em ambiente demo.

---

## Banco de dados, storage e Supabase

O projeto utiliza Supabase como backend principal.

### Principais entidades

* `profiles`
* `stores`
* `store_settings`
* `categories`
* `products`
* `product_categories`
* `orders`
* `order_items`
* `checkout_sessions`
* `checkout_session_items`
* `store_operational_periods`

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

### Múltiplas categorias por produto

A migration `20260428120000_add_product_categories_and_allow_archived_product_category_unlink.sql` adiciona `product_categories`, faz backfill a partir de `products.category_id`, ajusta `products.category_id` para permitir `null` com `ON DELETE SET NULL` e atualiza as RPCs públicas para considerar todas as categorias associadas.

Consultas manuais recomendadas após aplicar a migration:

```sql
-- Produtos ativos sem associação operacional em product_categories.
select p.id, p.name, p.store_id
from public.products p
left join public.product_categories pc
  on pc.product_id = p.id
where p.archived_at is null
  and pc.product_id is null;

-- Associações com store_id inconsistente entre produto, categoria e vínculo.
select pc.product_id, pc.category_id, pc.store_id, p.store_id as product_store_id, c.store_id as category_store_id
from public.product_categories pc
join public.products p on p.id = pc.product_id
join public.categories c on c.id = pc.category_id
where pc.store_id is distinct from p.store_id
   or pc.store_id is distinct from c.store_id;

-- Possíveis duplicações por produto na mesma categoria retornada pela RPC pública.
select category_id, product_id, count(*) as occurrences
from public.get_public_menu_by_slug('slug-da-loja')
group by category_id, product_id
having count(*) > 1;

-- Base para conferir a aba "Todos": unique_products é a quantidade que a UI deve renderizar.
select count(*) as category_rows, count(distinct product_id) as unique_products
from public.get_public_menu_by_slug('slug-da-loja');
```

### Storage para assets públicos da loja

O projeto utiliza o bucket público `public-assets` no Supabase Storage para armazenar assets públicos da loja.

Padrões de caminho:

* logo da loja: `store-logos/<store-id>/arquivo.ext`
* imagem de produto: `product-images/<store-id>/<product-id-ou-draft>/arquivo.ext`

As logos da loja são usadas em:

* configurações da loja;
* cardápio público;
* painel público;
* metadata dinâmica das páginas públicas, quando houver logo configurada.

As imagens de produto são usadas no cardápio público da loja.

### Migrations

Consulte a pasta `supabase/migrations/` para o histórico versionado do banco.

No estado atual, os blocos críticos estão versionados com migrations específicas:

* checkout/conversão e guardas operacionais:
  * `20260403001920_public_checkout_order_flow.sql`
  * `20260412172110_add_order_cancel_status_and_stock_revert.sql`
  * `20260414123000_harden_checkout_conversion_operational_guard.sql`
  * `20260424100000_add_store_schedule_effective_availability.sql`
  * `20260424153000_add_store_operational_periods.sql`
  * `20260425203000_keep_product_available_when_stock_reaches_zero.sql`
* realtime (dashboard/público):
  * `20260411163258_enable_realtime_for_orders.sql`
  * `20260411175544_broadcast_public_panel_refresh.sql`
  * `20260411175546_dashboard_home_realtime_refresh.sql`
  * `20260411175548_broadcast_public_order_refresh.sql`
  * `20260412193547_add_realtime_public_menu_and_dashboard_products.sql`
  * `20260412221503_add_recent_called_orders_for_public_panel.sql`
* cardápio público e produtos:
  * `20260403120000_sync_product_availability_manual_control.sql`
  * `20260418163844_show_out_of_stock_in_public_menu.sql`
  * `20260421162000_products_archived_soft_delete.sql`
* storage de logos em bucket público:
  * `20260420012418_storage_public_assets_store_logos.sql`
* storage de imagens de produto em bucket público:
  * `20260421150000_storage_public_assets_product_images.sql`
  * `20260428120000_add_product_categories_and_allow_archived_product_category_unlink.sql`

Essas migrations cobrem o estado atual de produto com imagem por URL/upload, produto sem estoque visível e bloqueado no cardápio público, preservação de `is_available` quando o estoque zera por venda, exclusão segura por `archived_at`, produto em múltiplas categorias, categorias históricas removíveis, modos operacionais com período manual registrado, painel público com últimos chamados e cancelamento/recusa com devolução de estoque.

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

Se a mudança envolver banco ou storage:

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
* onboarding com confirmação de e-mail;
* dashboard protegido;
* CRUD de categorias;
* CRUD de produtos;
* configurações da loja;
* logo da loja por URL e upload;
* branding público por loja;
* fluxo operacional de pedidos;
* histórico e escopos de pedidos no dashboard;
* cardápio público por `slug`;
* busca local e filtro por categoria;
* produto em múltiplas categorias, com categoria principal e adicionais;
* carrinho público com persistência local;
* mini carrinho fixo no cardápio;
* checkout com `checkout_sessions`;
* simulação de pagamento aprovado;
* conversão para pedido real;
* acompanhamento público do pedido;
* painel público de retirada;
* painel público em modo TV;
* Home do dashboard com métricas operacionais;
* dashboard mobile compactada;
* indicadores por Hoje, Semana atual e Período operacional;
* modos operacionais Loja offline, Aberta manualmente e Horário automático;
* atualização em tempo real nas páginas principais;
* suporte a pedido **cancelado**;
* devolução de estoque em **recusa** e **cancelamento**;
* melhorias amplas de responsividade e UX no dashboard e na área pública;
* produtos sem estoque visíveis no cardápio, porém bloqueados para compra;
* produto que zera estoque por venda permanece visível no cardápio como indisponível;
* reordenação de categorias e produtos com drag and drop no desktop e fluxo compacto no mobile.
* imagem de produto por URL e upload;
* exclusão segura de produto com preservação de histórico;
* exclusão de categoria quando apenas produtos arquivados/históricos ainda estavam vinculados;
* confirmação refinada para exclusão de produto no dashboard;
* revisão textual e ortográfica nas páginas principais do painel e no acompanhamento público do pedido;
* landing page comercial refinada e responsiva;
* navegação sticky da landing com branding CARDEXPRESS no mobile;
* ampliação da suíte E2E/smoke para 13 cenários;
* modais refinados de exclusão em categorias e produtos;
* scroll interno nos alertas de estoque da Home do dashboard;

### Em andamento / pendente

* integração com pagamento real;
* remoção da simulação de pagamento quando houver gateway;
* ajustes pontuais para implantação em ambiente real;
* documentação acadêmica final;
* relatórios e métricas mais avançadas;
* evolução futura de autenticação do comerciante;
* expansão futura da frente SaaS comercial.

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
9. se alterar banco ou storage, registre a migration/policy correspondente;
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

Além disso, o projeto conta com:

* onboarding com confirmação de e-mail;
* branding público por loja;
* logo da loja em configurações e páginas públicas;
* atualização em tempo real nas áreas mais relevantes da operação;
* melhoria de coerência entre painel administrativo e área pública;
* reconciliação do carrinho e do checkout com o cardápio atual;
* tratamento de estados operacionais importantes como **recusa** e **cancelamento** com devolução de estoque.

A principal evolução futura para uso real é a substituição da simulação atual por uma integração efetiva com gateway de pagamento, mantendo banco, código, storage e migrations alinhados no repositório.
