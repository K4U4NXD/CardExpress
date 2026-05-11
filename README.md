# CardExpress

CardExpress é um sistema web de cardápio digital para estabelecimentos que vendem com retirada no balcão. A proposta é permitir que o comerciante publique um cardápio por link ou QR Code, receba pedidos em um painel protegido e acompanhe a operação com estoque, status de loja e telas públicas de retirada.

O projeto foi desenvolvido como MVP funcional para lanchonetes, quiosques, trailers, barracas e operações pequenas que precisam organizar pedidos sem depender de atendimento manual em papel ou mensagens dispersas.

## Estado Atual

O MVP está funcional para homologação e demonstração:

- fluxo completo de autenticação do comerciante;
- dashboard protegido para gestão da loja;
- cardápio público por `slug`;
- checkout em modo demo;
- simulação de pagamento aprovado;
- conversão de checkout em pedido;
- acompanhamento público do pedido por token;
- painel público de retirada e modo TV;
- controle de estoque;
- atualizações em tempo real nas telas principais;
- suíte E2E smoke com Playwright.

O checkout ainda não possui pagamento real. A etapa de Mercado Pago não foi implementada; hoje a aprovação é simulada para validar o fluxo operacional de ponta a ponta. Para produção real, a simulação deve ser substituída por uma integração de pagamento confiável, com confirmação via provedor e remoção do botão de simulação.

SaaS, billing, domínio próprio e políticas avançadas de conta também ficam para etapas futuras. A Vercel é usada como ambiente de homologação.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Database
- Supabase Storage
- Supabase Realtime
- Playwright E2E
- Vercel

## Funcionalidades Implementadas

### Área Pública

- landing page;
- cardápio público por `slug`;
- busca e filtro de produtos;
- carrinho local por loja;
- checkout demo;
- criação de sessão de checkout;
- simulação de pagamento aprovado;
- acompanhamento público do pedido por token;
- painel público de pedidos prontos;
- modo TV para painel público;
- retomada local de checkout e pedidos em andamento;
- atualização em tempo real de cardápio, checkout, pedido e painel.

### Autenticação

- cadastro do comerciante;
- confirmação de e-mail;
- login;
- logout;
- recuperação de senha;
- redefinição de senha;
- campos de senha com mostrar/ocultar;
- mensagens amigáveis para erros comuns;
- criação de loja apenas após confirmação de e-mail;
- regra atual de uma loja por conta autenticada.

### Dashboard

- dashboard protegido;
- resumo operacional;
- métricas por período;
- categorias;
- produtos;
- estoque;
- pedidos;
- configurações da loja;
- upload de logo;
- upload de imagem de produto;
- ações em massa em categorias e produtos;
- modos operacionais da loja:
  - loja offline;
  - aberta manualmente;
  - horário automático.

### Pedidos e Estoque

- criação de pedidos a partir de sessão de checkout confirmada no modo demo;
- status operacional do pedido;
- aceite, recusa, preparo, pronto, finalização e cancelamento;
- devolução de estoque em recusa/cancelamento quando aplicável;
- produto sem estoque continua visível no cardápio, mas bloqueado para compra;
- preservação de histórico ao arquivar produtos já usados em checkout ou pedido.

### Testes

- suíte E2E smoke com Playwright;
- cobertura dos fluxos críticos do MVP;
- testes preparados para loja de homologação/teste.

Não rode a suíte E2E quando o Supabase estiver instável ou limitado por uso de recursos, pois falhas podem refletir infraestrutura e não regressão do código.

## Setup Local

Pré-requisitos:

- Node.js 18.18 ou superior;
- npm;
- projeto Supabase configurado;
- variáveis de ambiente locais.

Instale dependências:

```bash
npm install
```

Crie o arquivo de ambiente local:

```bash
cp .env.local.example .env.local
```

Preencha as variáveis do Supabase e a URL local do projeto. Depois rode:

```bash
npm run dev
```

Acesse:

```text
http://localhost:3000
```

Comandos úteis:

```bash
npm run lint
npm run build
npm run test:e2e
```

Use `npm run test:e2e` apenas com Supabase estável e com uma loja de teste dedicada.

## Variáveis de Ambiente

### Aplicação

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_STORE_LOGOS_BUCKET=public-assets
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` pode ficar no frontend porque é a chave pública anon do Supabase. A segurança de dados depende de RLS, RPCs permitidas e validações do banco. Nunca use service role no frontend.

### E2E

```env
PLAYWRIGHT_BASE_URL=http://localhost:3000
CARDEXPRESS_E2E_EMAIL=
CARDEXPRESS_E2E_PASSWORD=
CARDEXPRESS_E2E_CUSTOMER_NAME=Cliente E2E
CARDEXPRESS_E2E_CUSTOMER_PHONE=11999999999
CARDEXPRESS_E2E_RUN_ID=
```

Use uma conta e uma loja exclusivas para E2E. Os testes alteram categorias, produtos, estoque e pedidos.

## Supabase

O projeto usa Supabase para autenticação, banco, storage e realtime.

### Auth

Configure as URLs de redirecionamento no Supabase Auth conforme o ambiente:

- `http://localhost:3000/auth/confirm`;
- `http://localhost:3000/redefinir-senha`;
- `https://seu-projeto.vercel.app/auth/confirm`;
- `https://seu-projeto.vercel.app/redefinir-senha`.

O fluxo de cadastro salva dados pendentes em metadata e provisiona `profile`, `store` e `store_settings` apenas após a confirmação de e-mail. O fluxo de recuperação de senha não provisiona loja.

### Database e Migrations

O histórico do banco fica em:

```text
supabase/migrations/
```

Não altere RLS, RPCs, triggers ou SQL diretamente sem versionar a mudança em migration. Antes de publicar alterações de banco, revise o diff de migrations.

### Storage

O bucket público usado por padrão é:

```text
public-assets
```

Usos atuais:

- logos de loja;
- imagens públicas de produto.

Esses arquivos são públicos por design para aparecerem no cardápio e no painel público sem autenticação.

### Realtime

Realtime é usado para atualizar telas operacionais e públicas. Os eventos públicos não devem carregar dados sensíveis; eles servem principalmente para disparar refresh e buscar novamente os dados permitidos.

## Deploy e Homologação

O deploy de homologação usa Vercel com Supabase Free.

Referência principal:

```text
docs/DEPLOYMENT.md
```

Pontos importantes:

- configurar as variáveis públicas na Vercel;
- adicionar as URLs `vercel.app` em Auth Redirect URLs no Supabase;
- manter o checkout em modo demo até Mercado Pago ser implementado;
- validar `npm run lint` e `npm run build` antes do deploy;
- usar o ambiente como homologação, não como produção real de pagamentos.

## Fluxo Demo de Checkout

O fluxo atual é:

1. cliente monta carrinho no cardápio público;
2. checkout cria uma `checkout_session`;
3. a interface oferece simulação de pagamento aprovado;
4. a sessão marcada como paga é convertida em pedido real;
5. o cliente acompanha o pedido pela URL pública com token;
6. o comerciante opera o pedido no dashboard;
7. o painel público mostra pedidos prontos.

O ponto futuro de Mercado Pago entra no lugar da simulação de pagamento. A confirmação confiável do provedor deve acionar a conversão da sessão em pedido, mantendo as validações finais no banco.

## Regras de Negócio Importantes

- uma conta autenticada representa uma loja nesta fase;
- cliente final não cria conta no MVP;
- `slug` público da loja é somente leitura nesta fase;
- loja offline não aceita pedidos;
- loja aberta manualmente aceita pedidos até mudança manual;
- horário automático depende da janela configurada em `America/Sao_Paulo`;
- produto ativo e disponível pode aparecer no cardápio;
- produto sem estoque pode aparecer, mas não pode ser comprado;
- produto com histórico é arquivado em vez de removido fisicamente;
- pedido público exige `slug`, `id` e `public_token`.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run test:e2e
```

Scripts auxiliares de diagnóstico podem existir para investigação local. Eles não substituem lint, build ou E2E.

## Roadmap

### Concluído

- MVP;
- autenticação;
- confirmação de e-mail;
- recuperação de senha;
- cardápio público;
- dashboard;
- categorias;
- produtos;
- estoque;
- pedidos;
- configurações da loja;
- checkout demo;
- simulação de pagamento aprovado;
- acompanhamento público;
- painel público;
- modo TV;
- realtime;
- storage;
- deploy/homologação;
- suíte E2E smoke.

### Pendente/Futuro

- Mercado Pago;
- pagamento real;
- remoção da simulação de pagamento;
- SaaS/billing;
- relatórios avançados;
- LGPD e exclusão de conta;
- segurança avançada da conta;
- domínio próprio.

## Cuidados de Desenvolvimento

- não use service role no frontend;
- não rode E2E em loja real;
- não altere migrations antigas sem motivo forte;
- não publique pagamento real enquanto o checkout estiver em modo demo;
- valide lint e build antes de abrir pull request ou publicar homologação;
- registre mudanças de banco em migrations.

## Licença

Projeto acadêmico. A licença formal pode ser definida pela equipe em etapa posterior.
