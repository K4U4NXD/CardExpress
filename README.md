# CardExpress

## Sobre o projeto

O **CardExpress** é um sistema web de **cardápio digital com retirada no balcão**, pensado para estabelecimentos de venda rápida, como lanchonetes, barracas, quiosques e pontos de alimentação em feiras e eventos.

A proposta do projeto é permitir que o cliente acesse o cardápio por **QR Code** ou **link**, visualize os produtos, monte o pedido e acompanhe seu status. No fluxo planejado do produto, o pedido só deve ser efetivamente confirmado no sistema **após a aprovação do pagamento** por uma plataforma externa.

Além da experiência do cliente, o sistema possui um **painel administrativo do comerciante**, onde a loja pode:

- cadastrar e organizar categorias;
- cadastrar e gerenciar produtos;
- acompanhar pedidos;
- alterar o status operacional do atendimento;
- exibir um painel público de retirada.

Este repositório corresponde ao desenvolvimento do projeto acadêmico **CardExpress**, realizado em grupo.

---

## Equipe

- **Kauan Henrique Silva Paulino**
- **Gustavo Yukio Jochi**
- **Thiago Ribeiro Modesto**

---

## Status atual do projeto

O projeto já possui uma base funcional importante, com autenticação, painel administrativo e parte do fluxo operacional de pedidos implementados.

### Funcionalidades já implementadas

#### Autenticação e estrutura da loja

- cadastro de comerciante;
- login e logout;
- proteção das rotas do painel;
- criação e vínculo de uma loja por conta;
- leitura da loja autenticada no dashboard.

#### Painel administrativo

- tela inicial do painel com resumo da loja;
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

#### Pedidos

- listagem de pedidos da loja;
- transições operacionais com regras de status;
- ações de:
  - aceitar pedido;
  - recusar pedido;
  - marcar como pronto para retirada;
  - finalizar pedido;
- atualização de timestamps operacionais (`accepted_at`, `ready_at`, `finalized_at`, `rejected_at`);
- separação entre **status operacional** e **status de reembolso**.

#### Área pública

- página pública por `slug` da loja;
- página pública de checkout preparada como placeholder;
- página pública de acompanhamento do pedido por token;
- painel público de retirada exibindo o último pedido pronto.

#### Banco de dados

- projeto integrado ao **Supabase**;
- schema remoto já versionado localmente em `supabase/migrations/`;
- histórico de migrations alinhado com o banco remoto.

---

## O que ainda falta desenvolver

As funcionalidades abaixo ainda estão pendentes, parciais ou em evolução:

### Cardápio público

- carregar categorias e produtos reais do banco em `/{slug}`;
- exibir somente produtos ativos e disponíveis;
- organizar visualmente o cardápio por categoria;
- montar carrinho no fluxo público.

### Checkout e pedido do cliente

- carrinho funcional;
- cálculo de totais;
- coleta de dados básicos do cliente;
- geração do pedido no fluxo correto;
- integração com plataforma de pagamento externa;
- confirmação do pedido somente após pagamento aprovado.

### Painel e operação

- tela de configurações da loja;
- ajustes de UX do dashboard;
- possíveis melhorias no painel público de retirada;
- refinamento do fluxo de pedidos para operação real.

### Infraestrutura e organização

- ampliar documentação técnica;
- revisar README conforme novas features forem entrando;
- continuar versionando toda mudança de banco por migration.

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
  - Database
  - RPC
  - RLS

### Ferramentas auxiliares

- **ESLint**
- **npm**
- **Supabase CLI**
- **Docker Desktop** (necessário para alguns comandos da CLI, como `db pull`)

---

## Requisitos

### Para rodar o projeto

- **Node.js 18.18+**
- **npm**

### Recomendado

- **Node.js 20 LTS**
- **VS Code**
- **Docker Desktop**

> O projeto pode rodar localmente sem usar Docker no dia a dia. Porém, alguns comandos do Supabase CLI, como o resgate do schema remoto com `db pull`, exigem Docker funcionando.

---

## Variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto com base no `.env.local.example`.

### Arquivo `.env.local.example`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Arquivo `.env.local`

Preencha com os valores reais do seu projeto Supabase.

Exemplo de fluxo:

#### Windows

```bash
copy .env.local.example .env.local
```

#### macOS/Linux

```bash
cp .env.local.example .env.local
```

Depois disso, abra o `.env.local` e adicione os valores reais do Supabase.

### Onde pegar esses dados no Supabase

No painel do Supabase:

- acesse o projeto;
- vá em **Settings** → **API**;
- copie:
  - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
  - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> Atualmente, o projeto usa apenas variáveis públicas no front. Mesmo assim, o arquivo `.env.local` **não deve ser commitado**.

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

Abra:

```text
http://localhost:3000
```

---

## Scripts do projeto

O arquivo `package.json` atualmente possui os seguintes scripts:

### `npm run dev`

```bash
next dev --turbopack
```

Inicia o ambiente de desenvolvimento com hot reload.

Use este comando no dia a dia para programar e testar o projeto localmente.

### `npm run build`

```bash
next build
```

Gera a build de produção do projeto.

Use para validar se a aplicação compila corretamente antes de publicar ou entregar uma versão mais estável.

### `npm run start`

```bash
next start
```

Inicia a aplicação já compilada em modo de produção.

Esse comando normalmente é usado depois de executar `npm run build`.

### `npm run lint`

```bash
next lint
```

Executa a checagem estática de código com ESLint.

Use este comando para identificar problemas de qualidade, estilo ou possíveis erros antes de commitar.

---

## Estrutura do projeto

Abaixo está uma visão geral das principais pastas e arquivos:

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
│  └─ layout/
├─ lib/
│  ├─ auth/
│  ├─ orders/
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

## Explicação das principais áreas do código

### `app/`

Contém as rotas da aplicação seguindo o App Router do Next.js.

#### `app/(dashboard)/`

Agrupa as telas internas do comerciante.

- `/cadastro` → criação de conta e loja;
- `/login` → autenticação;
- `/dashboard` → área protegida;
- `/dashboard/categorias` → CRUD de categorias;
- `/dashboard/produtos` → CRUD de produtos;
- `/dashboard/pedidos` → gerenciamento de pedidos;
- `/dashboard/configuracoes` → área ainda pendente.

#### `app/(public)/[slug]/`

Agrupa as rotas públicas da loja.

- `/{slug}` → cardápio público;
- `/{slug}/checkout` → fluxo futuro de checkout;
- `/{slug}/painel` → painel público de retirada;
- `/{slug}/pedido/[id]?token=...` → acompanhamento público do pedido.

#### `app/actions/`

Contém as **Server Actions** da aplicação.

Arquivos principais:

- `auth.ts` → cadastro, login e logout;
- `categories.ts` → criar, editar, ativar/desativar, reordenar e excluir categorias;
- `products.ts` → criar, editar, ativar/desativar, controlar disponibilidade/estoque, reordenar e excluir produtos;
- `orders.ts` → transições operacionais dos pedidos.

### `components/`

Componentes reutilizáveis da interface.

- `components/auth/` → formulários de login, cadastro e botão de logout;
- `components/dashboard/` → linhas, formulários e ações das telas administrativas;
- `components/layout/` → header, body e componentes estruturais.

### `lib/`

Helpers, validações e integração com Supabase.

#### `lib/auth/`

Responsável por regras relacionadas ao comerciante autenticado e à resolução da loja atual.

#### `lib/supabase/`

Clientes do Supabase para browser, servidor e middleware.

#### `lib/orders/`

Funções auxiliares para exibição de pedidos, labels e formatação.

#### `lib/validation/`

Validações auxiliares, incluindo parsing e formatação de preço.

### `types/`

Tipos TypeScript compartilhados do domínio do sistema.

Inclui:

- `Profile`
- `Store`
- `Category`
- `Product`
- `Order`
- `OrderItem`
- `OrderStatus`
- `RefundStatus`

### `supabase/`

Arquivos da integração e versionamento do banco.

#### `supabase/config.toml`

Arquivo de configuração local da Supabase CLI.

#### `supabase/migrations/`

Pasta onde ficam as migrations SQL versionadas do banco.

Atualmente, o schema remoto do projeto já foi trazido para o repositório por meio do `supabase db pull`.

---

## Fluxo de autenticação

O sistema utiliza **Supabase Auth** para autenticação do comerciante.

### Fluxo implementado

1. o usuário acessa `/cadastro`;
2. informa dados pessoais e da loja;
3. a aplicação cria a conta no Supabase Auth;
4. com sessão válida, cria/atualiza dados em `profiles`, `stores` e `store_settings`;
5. o usuário autenticado acessa `/dashboard`.

### Rotas protegidas

As rotas em `/dashboard/*` são protegidas.

Se o usuário não estiver autenticado, ele é redirecionado para `/login`.

Essa proteção acontece por meio do `middleware.ts` da aplicação em conjunto com a integração do Supabase no middleware, garantindo a validação da sessão antes do acesso às rotas administrativas.

### Observação importante sobre confirmação de e-mail

Se a confirmação de e-mail estiver habilitada no Supabase, pode não existir sessão imediatamente após o cadastro. Em ambiente de desenvolvimento, isso pode atrapalhar o fluxo de criação da loja no mesmo passo.

Se necessário, ajuste isso no Supabase para facilitar os testes.

---

## Fluxo de categorias

Na tela `/dashboard/categorias`, o comerciante pode:

- criar categoria;
- editar nome;
- ativar/desativar;
- mudar ordem;
- excluir categoria.

### Regras importantes

- a categoria pertence sempre a uma única loja;
- não é possível excluir uma categoria que ainda tenha produtos vinculados;
- a listagem considera apenas categorias da loja autenticada.

---

## Fluxo de produtos

Na tela `/dashboard/produtos`, o comerciante pode:

- criar produto;
- editar produto;
- vincular a uma categoria da própria loja;
- ativar/desativar;
- controlar disponibilidade;
- controlar estoque;
- reordenar;
- excluir produto.

### Regra importante: `is_active` x `is_available`

O projeto separa dois conceitos:

- `is_active` → produto ativo no cadastro da loja;
- `is_available` → produto disponível para venda naquele momento.

Isso é importante porque um produto pode continuar cadastrado, mas estar indisponível temporariamente.

### Estoque

Quando `track_stock` está ativo:

- o sistema exige `stock_quantity`;
- disponibilidade passa a depender do estoque;
- se o estoque for zero, o produto tende a ficar indisponível.

---

## Fluxo de pedidos

Na tela `/dashboard/pedidos`, o comerciante acompanha pedidos ativos.

### Status operacionais implementados

- `aguardando_aceite`
- `em_preparo`
- `pronto_para_retirada`
- `finalizado`
- `recusado`

### Regras de transição

As transições permitidas atualmente são:

- `aguardando_aceite` → `em_preparo`
- `aguardando_aceite` → `recusado`
- `em_preparo` → `pronto_para_retirada`
- `pronto_para_retirada` → `finalizado`

### Status de reembolso

O projeto também separa o status de reembolso do status operacional do pedido.

Valores atuais:

- `none`
- `pendente`
- `reembolsado`
- `falhou`

Quando um pedido é recusado, o fluxo já prevê marcar o reembolso como `pendente`.

### Revalidação das páginas públicas

Sempre que uma transição importante de pedido é executada no painel administrativo, a aplicação revalida também as páginas públicas relacionadas.

Isso é importante porque mantém sincronizados:

- o painel público de retirada;
- a página pública de acompanhamento do pedido.

Na implementação atual, essa atualização é feita nas actions de pedidos com `revalidatePath`, o que ajuda a refletir mudanças operacionais sem depender de atualização manual da interface.

---

## Área pública da loja

### `/{slug}`

É a rota pública principal da loja.

No estágio atual, essa página ainda funciona como um **stub estrutural**, servindo como base inicial da experiência pública e renderizando apenas a estrutura principal da loja. Ela ainda não exibe o cardápio completo com categorias e produtos vindos do banco.

A próxima evolução dessa rota é carregar:

- categorias da loja;
- produtos ativos;
- produtos disponíveis;
- organização visual por categoria;
- base para montagem do carrinho.

### `/{slug}/checkout`

Página reservada para o fluxo de checkout.

Ainda não implementa carrinho nem pagamento real.

### `/{slug}/pedido/[id]?token=...`

Página pública de acompanhamento de pedido.

Ela usa uma RPC do Supabase para permitir acesso controlado ao pedido por token público.

### `/{slug}/painel`

Painel público de retirada.

Atualmente exibe o último pedido pronto para retirada, usando uma RPC no Supabase.

---

## Banco de dados e Supabase

O projeto utiliza Supabase como backend principal.

### Recursos usados

- autenticação do comerciante;
- tabelas do domínio da aplicação;
- políticas RLS;
- funções RPC;
- versionamento do schema com migrations.

### Estrutura esperada no banco

O projeto trabalha com entidades como:

- `profiles`
- `stores`
- `store_settings`
- `categories`
- `products`
- `orders`
- `order_items`

Além disso, já existem funções RPC usadas pela aplicação, como:

- `get_public_order`
- `get_latest_ready_order_for_store`

Essas funções já estão versionadas na migration atual do projeto:

```text
supabase/migrations/20260331203339_remote_schema.sql

---

## Como o schema do Supabase foi versionado

Como o banco já existia no painel do Supabase e os SQLs antigos não estavam mais salvos, o schema remoto foi trazido para o repositório usando a **Supabase CLI**.

### Fluxo usado

1. inicializar a estrutura local do Supabase:

```bash
npx supabase init
```

2. autenticar a CLI:

```bash
npx supabase login
```

3. vincular o projeto local ao projeto remoto:

```bash
npx supabase link --project-ref SEU_PROJECT_REF
```

4. puxar o schema remoto para migrations locais:

```bash
npx supabase db pull
```

### Observações importantes

- `db pull` exige **Docker Desktop** funcionando;
- se houver divergência no histórico de migrations, pode ser necessário usar:

```bash
npx supabase migration list
npx supabase migration repair --status applied <timestamp>
npx supabase migration repair --status reverted <timestamp>
```

### Boas práticas daqui para frente

- evitar mudanças importantes no banco sem versionamento;
- registrar novas alterações por migration;
- commitar a pasta `supabase/migrations/` no GitHub.

---

## GitHub e colaboração em grupo

O projeto já foi preparado para versionamento em grupo no GitHub.

### Recomendações de uso

- manter a `main` sempre funcional;
- usar commits com mensagens claras;
- revisar mudanças antes de subir;
- não commitar arquivos sensíveis;
- manter o banco alinhado com as migrations do repositório.

### Arquivos que não devem ser versionados

Exemplos:

- `.env.local`
- `node_modules/`
- `.next/`
- logs e arquivos temporários

### Arquivos que devem ser versionados

Exemplos:

- código-fonte;
- `README.md`;
- `.env.local.example`;
- `supabase/config.toml`;
- `supabase/migrations/`;
- documentação do projeto.

---

## Convenções úteis para o time

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

### Depois de alterar o banco

Garanta que a mudança esteja versionada corretamente no repositório.

---

## Possíveis melhorias futuras

Alguns pontos que já fazem sentido para as próximas etapas do projeto:

- implementação completa do cardápio público;
- carrinho funcional;
- integração real de pagamento;
- atualização automática e mais robusta do painel público de retirada;
- melhorias na tela de configurações da loja;
- geração de tipos do Supabase para fortalecer a tipagem do projeto;
- testes automatizados;
- ajustes para preparação de uso em ambiente real.

---

## Observações importantes de desenvolvimento

### 1 loja por conta

Nesta fase do projeto, a lógica está orientada para **uma conta de comerciante = uma loja**.

### Rotas e dados sempre filtrados pela loja

A aplicação foi organizada para que categorias, produtos e pedidos consultados no painel pertençam apenas à loja autenticada.

### Público x administrativo

O projeto separa claramente:

- área pública do cliente;
- área administrativa do comerciante.

### Pedido e pagamento

O comportamento desejado do produto é que o pedido seja confirmado apenas após pagamento aprovado. Parte desse fluxo ainda está em construção.

---

## Roadmap resumido

### Concluído

- base do projeto em Next.js;
- autenticação do comerciante;
- dashboard protegido;
- CRUD de categorias;
- CRUD de produtos;
- fluxo operacional de pedidos;
- página pública de pedido;
- painel público de retirada;
- schema do Supabase versionado.

### Em andamento / pendente

- cardápio público real;
- carrinho;
- checkout;
- integração de pagamento;
- configurações da loja;
- refinamentos de UX e operação.

---

## Como contribuir no projeto

1. atualize sua cópia local do repositório;
2. configure o `.env.local`;
3. instale as dependências;
4. rode o projeto localmente;
5. faça sua alteração;
6. teste localmente;
7. valide lint e build;
8. commite com mensagem clara;
9. envie para o GitHub.

---

## Licença

Este projeto foi desenvolvido para fins acadêmicos no contexto do projeto **CardExpress**.

Caso a equipe deseje, a licença pode ser definida posteriormente.

---

## Contato do projeto

Responsável principal no contexto atual do desenvolvimento:

- **Kauan Henrique Silva Paulino**

---

## Resumo final

O CardExpress já possui uma base sólida de autenticação, painel administrativo, gerenciamento de cardápio e fluxo operacional de pedidos.

A próxima grande etapa do desenvolvimento é transformar essa base em uma experiência pública completa para o cliente, com cardápio funcional, carrinho, checkout e integração de pagamento, mantendo o banco e o código sempre versionados no GitHub.

