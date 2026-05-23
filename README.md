# CardExpress

CardExpress é um sistema web de cardápio digital para estabelecimentos que vendem com retirada no balcão. A proposta é permitir que o comerciante publique um cardápio por link ou QR Code, receba pedidos em um painel protegido, controle produtos, categorias e estoque, acompanhe a operação em tempo real e exiba pedidos prontos em telas públicas de retirada.

O projeto foi desenvolvido como MVP funcional para lanchonetes, quiosques, trailers, barracas e operações pequenas que precisam organizar pedidos sem depender de atendimento manual em papel ou mensagens dispersas.

## Estado Atual

O MVP está funcional para homologação e demonstração.

Estado validado na última rodada de testes:

- repositório local alinhado com `origin/main`;
- `npm run lint` validado;
- `npm run build` validado;
- testes manuais locais validados;
- suíte E2E local validada com 16/16 cenários;
- deploy de homologação ativo na Vercel em `https://cardexpress.vercel.app`.

O checkout ainda não possui pagamento real. A etapa de Mercado Pago não foi implementada; hoje a aprovação é simulada para validar o fluxo operacional de ponta a ponta. Para produção real, a simulação deve ser substituída por uma integração de pagamento confiável, com confirmação via provedor, webhook, idempotência e remoção do botão de simulação.

SaaS, billing, domínio próprio, Conta/Segurança, 2FA, edição controlada de slug e políticas avançadas de LGPD ficam para etapas futuras. A Vercel é usada como ambiente gratuito de homologação, não como produção real com pagamento.

Na fase atual, o CardExpress trabalha com uma conta autenticada vinculada a uma única loja. Múltiplas lojas por conta não fazem parte do escopo atual do produto nem do roadmap previsto.

## Stack

- Next.js App Router;
- React;
- TypeScript;
- Tailwind CSS;
- Supabase Auth;
- Supabase Database/Postgres;
- Supabase Storage;
- Supabase Realtime;
- Supabase RPC/RLS;
- Playwright E2E;
- Vercel para homologação.

## Funcionalidades Implementadas

### Área pública

- landing page institucional;
- landing refinada visualmente, com topo mobile corrigido e sem corte horizontal em telas estreitas;
- rodapé institucional reutilizável com contato oficial `projetocardexpress@gmail.com`;
- página `/demonstracao` com o mesmo rodapé institucional da landing;
- cardápio público por `slug`;
- busca e filtro de produtos com bloco sticky no desktop e no mobile;
- sticky mobile minimalista de busca/filtros para preservar área útil do cardápio;
- carrinho local por loja;
- checkout público em modo demo;
- criação de sessão de checkout;
- simulação de pagamento aprovado;
- conversão de checkout pago em pedido real;
- acompanhamento público do pedido por token;
- painel público de pedidos prontos;
- modo TV para painel público;
- retomada local de checkout e pedidos em andamento;
- atualização em tempo real de cardápio, checkout, acompanhamento do pedido e painel público.

### Autenticação

- cadastro do comerciante;
- página de cadastro com mini demonstração visual refinada da loja pronta;
- confirmação de e-mail;
- login;
- logout;
- recuperação de senha;
- redefinição de senha;
- campos de senha com mostrar/ocultar;
- mensagens amigáveis para erros comuns;
- recovery sem provisionar loja;
- criação de loja apenas após confirmação de e-mail;
- regra atual de uma loja por conta autenticada.

### Dashboard

- dashboard protegido;
- resumo operacional;
- indicadores por período;
- relatório semanal já disponível;
- vendas por período operacional/turno já disponíveis;
- categorias;
- produtos;
- pedidos;
- configurações da loja;
- upload de logo;
- upload de imagem de produto;
- ações em massa em categorias e produtos;
- barra compacta sticky de seleção no mobile para "Limpar" e "Ações";
- rolagem automática até as ações expandidas ao tocar em "Ações" no mobile;
- modos operacionais da loja:
  - loja offline;
  - aberta manualmente;
  - horário automático.

### Categorias

- criação;
- edição;
- ativação/desativação;
- reordenação;
- exclusão protegida quando há vínculos ativos;
- ações em massa;
- atualização em tempo real.

### Produtos

- criação;
- edição;
- ativação/desativação;
- separação entre `is_active` e `is_available`;
- categoria principal e categorias adicionais;
- exibição em múltiplas categorias;
- controle opcional de estoque;
- upload de imagem de produto;
- uso de link externo ou upload, conforme regra da interface;
- reordenação;
- ações em massa;
- produto sem estoque continua visível no cardápio, mas bloqueado para compra;
- produto sem histórico pode ser excluído fisicamente;
- produto com histórico é arquivado para preservar pedidos, métricas e rastreabilidade.

### Pedidos e estoque

- criação de pedidos a partir de sessão de checkout confirmada no modo demo;
- status operacional do pedido;
- aceite, recusa, preparo, pronto, finalização e cancelamento quando aplicável;
- devolução de estoque em recusa/cancelamento quando aplicável;
- painel público reflete pedidos prontos;
- histórico por escopo:
  - ativos;
  - finalizados;
  - recusados;
  - cancelados;
  - todos.

### Realtime

Realtime é usado para atualizar telas operacionais e públicas. Os eventos públicos não devem carregar dados sensíveis; eles servem principalmente para disparar refresh e buscar novamente os dados permitidos.

Rotas e áreas com atualização em tempo real ou mecanismo equivalente de refresh:

- dashboard;
- pedidos;
- produtos;
- categorias;
- configurações;
- cardápio público;
- checkout;
- acompanhamento público do pedido;
- painel público;
- modo TV.

### Testes

- Playwright configurado;
- `.env.e2e.example` disponível;
- suíte E2E smoke com 16 cenários no estado atual;
- testes preparados para loja de homologação/teste;
- validação local com 16/16 cenários;
- validação contra Vercel já realizada em rodada de homologação, sujeita à estabilidade do Supabase Free/Nano;
- helpers de criação de categorias/produtos mais robustos contra Vercel, sem depender exclusivamente de query params transitórios.

Não rode a suíte E2E quando o Supabase estiver instável ou limitado por uso de recursos, pois falhas podem refletir infraestrutura e não regressão do código. O login E2E deve continuar usando a UI real, sem fallback manual de autenticação.

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

### Aplicação local

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_STORE_LOGOS_BUCKET=public-assets
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Aplicação na Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_STORE_LOGOS_BUCKET=public-assets
NEXT_PUBLIC_SITE_URL=https://cardexpress.vercel.app
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

Use uma conta e uma loja exclusivas para E2E. Os testes alteram categorias, produtos, estoque, pedidos e configurações operacionais.

## Supabase

O projeto usa Supabase para autenticação, banco, storage e realtime.

### Auth

Configuração atual recomendada em **Authentication > URL Configuration**:

Site URL:

```text
https://cardexpress.vercel.app
```

Redirect URLs permitidas:

```text
http://localhost:3000/auth/confirm
http://localhost:3000/redefinir-senha
http://127.0.0.1:3000/auth/confirm
http://127.0.0.1:3000/redefinir-senha
https://cardexpress.vercel.app/auth/confirm
https://cardexpress.vercel.app/redefinir-senha
```

Não é necessário ficar alternando a URL Configuration do Supabase entre local e Vercel. O fluxo de cadastro salva dados pendentes em metadata e provisiona `profile`, `store` e `store_settings` apenas após a confirmação de e-mail. O fluxo de recuperação de senha não provisiona loja.

### Database e migrations

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

Caminhos esperados:

```text
store-logos/<store-id>/arquivo.ext
product-images/<store-id>/<product-id-ou-draft>/arquivo.ext
```

Esses arquivos são públicos por design para aparecerem no cardápio e no painel público sem autenticação.

### Realtime

Realtime é usado para atualizar telas operacionais e públicas. Os eventos públicos não devem carregar dados sensíveis; eles servem principalmente para disparar refresh e buscar novamente os dados permitidos.

## Deploy e Homologação

O deploy de homologação usa Vercel com Supabase Free/Nano.

URL atual:

```text
https://cardexpress.vercel.app
```

Referência principal:

```text
docs/DEPLOYMENT.md
```

Pontos importantes:

- configurar as variáveis públicas na Vercel;
- adicionar as URLs locais e `vercel.app` em Auth Redirect URLs no Supabase;
- manter o checkout em modo demo até Mercado Pago ser implementado;
- validar `npm run lint` e `npm run build` antes do deploy;
- validar `git diff --check` antes do deploy;
- rodar `npm run test:e2e` quando o Supabase estiver estável;
- usar o ambiente como homologação, não como produção real de pagamentos;
- não interpretar falhas 500/504 do Supabase Free/Nano como regressão automaticamente;
- tratar a latência restante do dashboard e de ações operacionais como pendência futura de performance/infraestrutura para produção real, não como bug urgente da homologação gratuita.

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
- loja offline não aceita novos pedidos;
- loja aberta manualmente aceita pedidos até mudança manual;
- horário automático depende da janela configurada em `America/Sao_Paulo`;
- `is_active` e `is_available` são conceitos diferentes;
- produto ativo e disponível pode aparecer no cardápio;
- produto sem estoque pode aparecer, mas não pode ser comprado;
- produto com histórico é arquivado em vez de removido fisicamente;
- produto sem histórico pode ser excluído fisicamente;
- categorias com vínculos ativos são protegidas contra exclusão indevida;
- pedido público exige `slug`, `id` e `public_token`;
- o pedido só entra no fluxo operacional após confirmação do pagamento, hoje simulada no modo demo.

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

- MVP funcional avançado;
- autenticação;
- confirmação de e-mail;
- recuperação de senha;
- redefinição de senha;
- cardápio público;
- dashboard;
- categorias;
- produtos;
- upload de logo;
- upload de imagem de produto;
- ações em massa;
- estoque;
- produtos sem estoque visíveis e bloqueados;
- exclusão física de produtos sem histórico;
- arquivamento de produtos com histórico;
- pedidos;
- relatório semanal;
- vendas por período operacional/turno;
- configurações da loja;
- checkout demo;
- simulação de pagamento aprovado;
- acompanhamento público;
- painel público;
- modo TV;
- realtime;
- storage;
- deploy/homologação na Vercel;
- refinamento visual da landing e da demonstração;
- correção de responsividade/overflow mobile na landing;
- rodapé institucional reutilizável com contato oficial;
- cadastro com mini demonstração refinada;
- cardápio público com busca/filtros sticky em desktop e mobile;
- produtos/categorias com barra compacta sticky de seleção no mobile;
- estabilização da suíte E2E smoke;
- suíte E2E smoke local validada com 16/16 cenários.

### Pendente/Futuro

- Mercado Pago;
- pagamento real;
- webhook e idempotência de pagamento;
- remoção da simulação de pagamento;
- relatórios avançados além dos indicadores já existentes, mantendo relatório semanal e vendas por período operacional/turno como funcionalidades implementadas;
- Conta/Segurança;
- login por usuário ou e-mail;
- 2FA;
- edição controlada de slug;
- SaaS/billing;
- assinatura mensal/anual;
- código de registro/acesso;
- LGPD, exclusão de conta e política de retenção;
- domínio próprio;
- produção real com infraestrutura mais estável.
- otimização de performance para produção real em infraestrutura mais estável;

## Cuidados de Desenvolvimento

- não use service role no frontend;
- não rode E2E em loja real;
- não rode E2E quando o Supabase estiver instável ou retornando 500/504;
- não altere migrations antigas sem motivo forte;
- não publique pagamento real enquanto o checkout estiver em modo demo;
- valide lint e build antes de abrir pull request ou publicar homologação;
- registre mudanças de banco em migrations;
- mantenha o login E2E pela UI real, sem fallback manual de autenticação;
- trate Mercado Pago, SaaS/billing e LGPD como frentes separadas e sensíveis.

## Licença

Projeto acadêmico. A licença formal pode ser definida pela equipe em etapa posterior.
