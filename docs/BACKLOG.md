# BACKLOG COMPLETO — PROJETO CARDEXPRESS

## 1. Visão geral do projeto

O CardExpress é um sistema web de cardápio digital com retirada no balcão, voltado para estabelecimentos de venda rápida. O cliente acessa a loja por link ou QR Code, monta o carrinho, passa pelo checkout e acompanha o pedido. O comerciante gerencia a operação por um dashboard protegido.

O projeto está em estágio de MVP funcional avançado, com homologação ativa na Vercel e backend no Supabase.

URL atual de homologação:

```text
https://cardexpress.vercel.app
```

Estado validado na última rodada:

- repositório local alinhado com GitHub;
- `npm run lint` passou;
- `npm run build` passou;
- testes manuais passaram;
- E2E local passou com 16/16 cenários;
- E2E contra Vercel já foi validado em rodada de homologação, respeitando a estabilidade do Supabase Free/Nano.

## 2. Stack atual

### Front-end

- Next.js App Router;
- React;
- TypeScript;
- Tailwind CSS.

### Back-end / serviços

- Supabase Auth;
- Supabase Postgres;
- Supabase RPC;
- Supabase RLS;
- Supabase Storage;
- Supabase Realtime.

### Ferramentas auxiliares

- npm;
- ESLint;
- Supabase CLI;
- Docker Desktop;
- Playwright;
- Vercel.

---

## 3. Estado atual consolidado do projeto

## 3.1 Implementado e validado

### Área pública

- Landing page institucional;
- landing refinada visualmente;
- topo mobile da landing corrigido;
- overflow/corte horizontal mobile da landing corrigido;
- rodapé institucional reutilizável com `projetocardexpress@gmail.com`;
- página `/demonstracao` com rodapé institucional compartilhado;
- cardápio público por slug;
- busca e filtro de produtos com sticky desktop ajustado;
- sticky mobile minimalista para busca/filtros;
- carrinho local por loja;
- checkout público em modo demo;
- criação de sessão de checkout;
- simulação de pagamento aprovado;
- conversão de checkout pago em pedido real;
- acompanhamento público do pedido por token;
- painel público de pedidos prontos;
- painel público em modo TV;
- realtime ou refresh nas telas públicas principais.

### Autenticação

- Cadastro do comerciante;
- confirmação de e-mail;
- login;
- logout;
- recuperação de senha;
- redefinição de senha;
- campos de senha com botão de mostrar/ocultar;
- mensagens de erro amigáveis em português;
- página de cadastro com mini demonstração visual refinada;
- recovery não provisiona loja;
- loja só é provisionada após confirmação de e-mail;
- regra atual: uma conta autenticada representa uma loja.

### Dashboard / painel administrativo

- Dashboard protegido;
- home do dashboard com resumo operacional;
- métricas operacionais do dia/período disponível;
- relatório semanal implementado;
- vendas por período operacional/turno implementadas;
- sidebar/navegação do painel;
- responsividade mobile;
- categorias;
- produtos;
- pedidos;
- configurações da loja;
- upload de logo;
- upload de imagem de produto;
- ações em massa em categorias e produtos;
- barra compacta sticky de seleção no mobile;
- scroll automático para ações expandidas ao tocar em "Ações" no mobile;
- modos operacionais:
  - loja offline;
  - aberta manualmente;
  - horário automático.

### Home do dashboard

- Categorias ativas;
- produtos visíveis;
- pedidos aguardando aceite;
- pedidos em preparo;
- pedidos prontos;
- pedidos finalizados no dia;
- valor vendido/faturamento do dia;
- ticket médio do dia;
- produtos sem estoque;
- produtos com estoque baixo;
- top produtos vendidos do dia;
- últimos pedidos;
- atualização em tempo real.

### Categorias

- Criar;
- editar;
- ativar/desativar;
- reordenar;
- excluir quando não houver vínculos ativos;
- proteção contra exclusão indevida quando houver vínculos;
- formulário recolhido por padrão;
- ações em massa;
- realtime na rota.

### Produtos

- Criar;
- editar;
- ativar/desativar;
- separar `is_active` de `is_available`;
- categoria principal e categorias adicionais;
- produto pode aparecer em múltiplas categorias;
- controle opcional de estoque;
- upload de imagem de produto;
- uso de imagem pública via Storage;
- reordenar;
- excluir fisicamente quando não houver histórico;
- arquivar quando houver histórico;
- exibição refinada de estado operacional;
- formulário recolhido;
- ações em massa;
- realtime na rota.

### Estoque e disponibilidade

- Produto sem estoque continua visível no cardápio;
- produto sem estoque fica indisponível para compra;
- checkout mantém validação server-side;
- carrinho e checkout reconciliam mudanças de preço, estoque e disponibilidade;
- recusa/cancelamento devolvem estoque quando aplicável.

### Configurações da loja

- Editar nome;
- editar telefone;
- visualizar slug em modo somente leitura;
- visualizar/copiar link público;
- abrir cardápio público em nova guia;
- visualizar QR Code do cardápio;
- mensagem pública;
- controle manual de aceitação de pedidos;
- resumo de prontidão operacional;
- salvar/descartar alterações;
- proteção contra refresh sobrescrevendo formulário dirty;
- realtime da tela.

### Checkout público

- Rota `/{slug}/checkout`;
- nome e telefone obrigatórios;
- criação de `checkout_sessions` e `checkout_session_items` via RPC;
- botão de simular pagamento aprovado;
- persistência local de nome e telefone;
- realtime no checkout;
- recovery da checkout session;
- cancelamento de checkout pendente;
- ajuste de quantidade no resumo;
- destaque visual de conflito de estoque/disponibilidade;
- mensagens públicas específicas.

### Pedidos

- Conversão de checkout pago em pedido real;
- criação de `orders` e `order_items`;
- fluxo operacional:
  - `aguardando_aceite`;
  - `em_preparo`;
  - `pronto_para_retirada`;
  - `finalizado`;
  - `recusado`;
  - `cancelado`;
- aceitar;
- recusar;
- marcar em preparo;
- marcar pronto;
- finalizar;
- cancelar quando aplicável;
- devolução de estoque em recusa e cancelamento;
- histórico por escopo:
  - ativos;
  - finalizados;
  - recusados;
  - cancelados;
  - todos;
- itens e observação visíveis;
- timeline/timestamps operacionais;
- cards refinados;
- loading/empty/error dedicados;
- som de novo pedido;
- toast global;
- badge na sidebar;
- destaque visual de novo pedido;
- deduplicação de toast;
- UX corrigida para não depender de reload.

### Acompanhamento público e painel de retirada

- Página pública `/{slug}/pedido/[id]?token=...`;
- validação por slug + id + token;
- exibição pública de status;
- suporte a estados terminais;
- realtime por canal específico do pedido;
- painel público `/{slug}/painel`;
- painel público WEB refinado;
- painel público com últimos chamados;
- painel TV em `/{slug}/painel/tv`;
- layouts distintos WEB e TV;
- som/alerta amigável em mudança real de status;
- ações de compartilhar/copiar link.

### Banco / backend

- Supabase integrado;
- schema versionado em migrations;
- RPCs importantes já existentes:
  - `get_public_store_by_slug`;
  - `get_public_menu_by_slug`;
  - `get_public_order`;
  - `get_latest_ready_order_for_store`;
  - `get_recent_called_orders_for_store`;
  - `create_checkout_session_by_slug`;
  - `convert_paid_checkout_session_to_order`;
  - `simulate_checkout_payment_success`;
  - `cancel_checkout_session_by_token`;
  - `transition_order_to_terminal`.

### Deploy e documentação

- README atualizado;
- `docs/DEPLOYMENT.md` criado/atualizado;
- homologação na Vercel Free/Hobby;
- URL gratuita `https://cardexpress.vercel.app`;
- Supabase Auth configurado com redirects locais e Vercel;
- documentação reforça que o checkout segue em modo demo;
- Mercado Pago fica para etapa futura.

### Testes E2E / smoke

- Playwright configurado;
- `.env.e2e.example` criado;
- suíte smoke com 16 cenários no estado atual;
- validação local com 16/16;
- validação contra Vercel já realizada em rodada de homologação;
- helpers de criação de categorias/produtos robustecidos para não depender exclusivamente de query params transitórios;
- login E2E preservado pela UI real, sem fallback manual de autenticação.

---

## 3.2 Decisões de produto consolidadas

- 1 conta autenticada = 1 loja nesta fase;
- cliente público não precisa criar conta;
- pagamento real ainda não foi integrado;
- o pedido só entra no fluxo operacional após confirmação do pagamento, hoje simulada no modo demo;
- o slug continua não editável nesta fase;
- `is_active` e `is_available` são conceitos diferentes;
- conta/segurança não deve ser misturada com configurações operacionais da loja;
- mudanças grandes de SQL/RPC/backend sensível devem ser feitas com cuidado;
- o projeto será voltado ao Brasil;
- o gateway preferencial futuro é Mercado Pago;
- “lucro” não entra agora; a métrica correta é vendas/faturamento;
- relatório semanal e vendas por período operacional/turno já fazem parte do MVP atual;
- produto sem estoque permanece visível no cardápio, porém bloqueado;
- upload de imagem de produto já existe e deve preservar a regra de imagem pública segura;
- produto sem histórico pode ser excluído fisicamente;
- produto com histórico deve ser arquivado, mesmo que a UI use o termo “Excluir”;
- Vercel é homologação gratuita, não produção real;
- Supabase Free/Nano pode limitar recursos; falhas 500/504 não devem ser tratadas automaticamente como regressão de código.

---

## 4. Ideias antigas atendidas

### Atendidas

- QR Code do cardápio visível no painel/configurações;
- link do cardápio público no painel;
- abertura do cardápio público em nova guia;
- cardápio público sem botão de voltar para o início;
- notificações e alertas operacionais principais;
- melhoria de responsividade e UX;
- refinamento visual da landing e da página `/demonstracao`;
- correção do topo/overflow mobile da landing;
- rodapé institucional reutilizável com e-mail oficial;
- mini demonstração refinada no cadastro;
- sticky desktop e mobile no cardápio público;
- barra compacta sticky de seleção em produtos/categorias mobile;
- scroll automático ao abrir ações em massa;
- realtime nas rotas principais;
- checkout com recovery;
- painel público e modo TV;
- recuperação e redefinição de senha;
- upload de logo;
- upload de imagem de produto;
- produto sem estoque visível e bloqueado;
- exclusão/arquivamento seguro de produto conforme histórico;
- ações em massa em categorias e produtos;
- deploy de homologação na Vercel;
- relatório semanal;
- vendas por período operacional/turno;
- estabilização da suíte E2E;
- E2E local validado e E2E remoto já validado em rodada de homologação.

### Atendidas parcialmente

- Landing page institucional já foi refinada, mas ainda pode evoluir para conversão comercial;
- dashboard já possui métricas operacionais, relatório semanal e vendas por período operacional, mas ainda pode evoluir para relatórios avançados;
- visual geral já melhorou, mas ainda pode receber polimento adicional;
- documentação está consolidada, mas deve continuar sendo ajustada conforme novas entregas.

### Ainda pendentes reais

- Mercado Pago/pagamento real;
- webhook e idempotência de pagamento;
- remoção futura do botão “Simular pagamento aprovado”;
- relatórios avançados além do relatório semanal e das vendas por período operacional já implementadas;
- Conta/Segurança;
- login com e-mail ou usuário;
- 2FA;
- edição controlada de slug;
- linha SaaS comercial;
- assinatura mensal/anual;
- código de registro/key de criação de conta;
- onboarding comercial com dados ampliados;
- política formal de retenção/suspensão/exclusão alinhada à LGPD;
- domínio próprio;
- produção real com infraestrutura mais estável.

---

## 5. Próximas frentes recomendadas

## 5.1 Fase 1 — estabilidade, documentação e polimento

Essa fase mantém baixo risco e evita abrir frentes sensíveis antes da hora.

### 1. Manter documentação alinhada

#### Objetivo
Evitar que README, backlog e deploy guiem decisões com informações antigas.

#### O que manter atualizado

- estado atual do MVP;
- funcionalidades concluídas;
- limitações reais;
- fluxo de homologação;
- comandos de validação;
- riscos do Supabase Free/Nano;
- status da suíte E2E.

### 2. Polimento visual e textual adicional

#### Exemplos

- landing page mais persuasiva e comercial;
- refinamento de dashboard;
- refinamento de responsividade;
- consistência visual;
- microinterações;
- textos explicativos de slug imutável, se ainda houver telas sem explicação suficiente.

### 3. Revisões pequenas de UX operacional

#### Exemplos

- melhorar mensagens de erro/empty states;
- revisar feedbacks de ações em massa;
- revisar experiência mobile em páginas densas;
- melhorar clareza de estados de estoque e disponibilidade.

---

## 5.2 Fase 2 — evolução operacional e analítica

### 4. Relatórios avançados

#### Objetivo
Expandir a visão operacional além do relatório semanal e das vendas por período operacional já implementadas.

#### Escopo recomendado

- manter visão diária;
- manter relatório semanal;
- avaliar mensal ou comparativos somente se houver necessidade real;
- sem menos vendidos nesta etapa;
- usar vendas/faturamento, não lucro.

#### Decisão pendente

Definir quais visões avançadas realmente ajudam a operação antes de criar telas novas.

### 5. Evoluções do período operacional

#### Objetivo
Evoluir a visão por turno/período aberto-fechado sem quebrar o painel atual.

#### Observação

O MVP já apresenta vendas por período operacional/turno. Evoluções futuras devem continuar evitando o termo lucro e usar:

- vendas do turno;
- faturamento do turno;
- período operacional atual.

#### Ponto aberto

Definir se “abertura/fechamento” será:

- uma entidade própria de turno; ou
- reflexo de `accepts_orders`/prontidão operacional.

Recomendação: tratar como conceito próprio quando essa fase começar.

---

## 5.3 Fase 3 — autenticação e segurança avançada do comerciante

A autenticação básica e recuperação/redefinição de senha já existem. Esta fase trata de recursos avançados.

### 6. Página Conta/Segurança

#### Objetivo
Separar dados de conta e segurança das configurações operacionais da loja.

#### Possíveis itens

- dados do comerciante;
- troca de senha autenticada;
- gestão de e-mail;
- sessões/dispositivos, se aplicável;
- área futura para 2FA.

### 7. Login com e-mail ou usuário

- login por e-mail ou username;
- possível ajuste de modelagem;
- UX clara no formulário de login;
- cuidado para não quebrar Supabase Auth.

### 8. 2FA

- desenhar depois da página Conta/Segurança;
- avaliar e-mail como segundo fator inicial;
- manter simples nesta fase;
- não misturar com billing.

Ordem recomendada:

1. Conta/Segurança;
2. login com e-mail ou usuário;
3. 2FA.

---

## 5.4 Fase 4 — linha SaaS comercial do CardExpress

Essa é uma frente sensível e não deve ser misturada com melhorias menores de UX ou documentação.

Na fase atual, o CardExpress trabalha com uma conta autenticada vinculada a uma única loja. Múltiplas lojas por conta não fazem parte do escopo atual do produto nem da próxima fase recomendada.

### 9. Landing comercial aprimorada

#### Objetivo
Transformar a home em página institucional e de conversão.

#### Conteúdo esperado

- proposta de valor;
- benefícios;
- funcionamento;
- diferenciais;
- CTA para adquirir acesso;
- contato dos responsáveis.

### 10. Venda do acesso ao sistema

#### Objetivo
Permitir comercializar o CardExpress para múltiplos estabelecimentos.

#### Ideia consolidada

- comerciante compra o acesso;
- recebe um código/key;
- esse código permite criar a nova loja;
- administradores do projeto devem conseguir gerar códigos manualmente.

### 11. Assinatura mensal e anual

#### Objetivo
Transformar o uso do sistema em serviço recorrente.

#### Requisitos desejados

- plano mensal;
- plano anual;
- cancelamento pelo comerciante;
- possibilidade de reativação;
- tratamento de inadimplência;
- possibilidade de parcelamento do anual, conforme o gateway suportar.

Gateway escolhido para estudo inicial:

- Mercado Pago.

### 12. Regras de inadimplência

#### Possíveis efeitos

- loja suspensa;
- aceita pedidos desabilitado;
- conta restrita até regularização.

#### Cuidado

Isso precisa ser modelado com cuidado para não misturar status operacional da loja com status de cobrança.

### 13. Novo onboarding de conta/loja

#### Campos desejados

- nome do comerciante;
- nome da loja;
- e-mail;
- telefone;
- senha;
- confirmação de senha;
- nome de usuário;
- CNPJ;
- código de criação de conta;
- forma de pagamento da assinatura.

#### Observação crítica

Esse onboarding só deve ser implementado depois que billing e código de registro estiverem definidos.

### 14. Política de exclusão/suspensão e LGPD

#### O que não fazer

- apagar tudo cegamente em 3 meses só “para não pesar o banco”.

#### O que fazer

- definir política de retenção;
- separar dados que precisam ser preservados por obrigação operacional/fiscal/contratual;
- definir suspensão;
- definir reativação;
- definir anonimização/exclusão quando aplicável;
- definir comunicação por e-mail antes de exclusão quando isso fizer sentido jurídico e operacional.

---

## 6. Tema sensível: exclusão de produto

## Regra atual/recomendada

### Produto nunca vendido ou nunca usado em checkout/pedido

- Pode ser excluído fisicamente.

### Produto com histórico

- A UI pode continuar mostrando “Excluir”;
- internamente, a implementação segura deve preservar histórico;
- o comportamento correto é arquivamento/soft delete ou mecanismo equivalente.

## Motivo

Isso evita quebrar:

- `order_items`;
- histórico de pedidos;
- métricas;
- rastreabilidade operacional.

---

## 7. Tema sensível: pagamento real

## Situação atual

Hoje o projeto ainda usa:

- checkout demo;
- simulação de pagamento aprovado;
- conversão posterior em pedido real.

## Próxima direção

Mercado Pago faz sentido para o contexto do projeto no Brasil.

## Cuidados antes de implementar

É preciso separar dois fluxos:

1. pagamento do pedido do cliente;
2. assinatura do comerciante para usar o CardExpress.

Esses fluxos não devem ser desenhados como se fossem a mesma coisa.

## Requisitos futuros mínimos para pagamento real

- criação de preferência/pagamento no gateway;
- webhook;
- validação server-side;
- idempotência;
- confirmação confiável antes de converter checkout em pedido;
- remoção ou ocultação do botão “Simular pagamento aprovado”;
- testes dedicados para pagamento real.

---

## 8. Ordem recomendada de implementação a partir de agora

## Agora

1. manter documentação alinhada;
2. corrigir pequenos problemas visuais/textuais encontrados em homologação;
3. escolher uma próxima entrega pequena de UX ou relatório avançado de baixo risco.

## Depois

4. Conta/Segurança;
5. login com e-mail ou usuário;
6. 2FA.

## Depois disso

7. edição controlada de slug, se virar requisito real;
8. desenho técnico da linha SaaS;
9. Mercado Pago;
10. assinatura.

## Só então

11. código de registro;
12. onboarding comercial;
13. política de suspensão/retenção/exclusão.

---

## 9. Itens que exigem cuidado especial de banco/backend

### Alto cuidado

- pagamento real;
- webhook de pagamento;
- assinatura/billing;
- código de registro;
- regras de suspensão por inadimplência;
- política LGPD;
- login com username se exigir alteração de modelo;
- edição de slug;
- evoluções de período operacional se exigirem nova entidade de turno/sessão.

### Cuidado moderado

- relatórios avançados além do semanal/período operacional já existentes;
- Conta/Segurança;
- mudanças em upload/storage;
- exclusão lógica de entidades com histórico.

### Baixo risco relativo

- ajustes de texto;
- polimento visual;
- landing page;
- melhorias de documentação;
- pequenas melhorias de UX sem alteração de regra de negócio.

---

## 10. Testes e qualidade

## Situação atual

A suíte smoke E2E existe e foi estabilizada localmente e contra Vercel.

Estado atual:

- 16 cenários E2E;
- 16/16 local;
- validação contra Vercel já realizada em rodada de homologação;
- helpers de criação de itens no dashboard robustecidos para evitar flakiness com query params transitórios.

## O que manter como prática

- rodar `npm run lint` antes de commit;
- rodar `npm run build` antes de publicar;
- rodar `git diff --check` antes de commit;
- rodar smoke E2E quando mexer no fluxo crítico;
- validar manualmente UX quando mexer em:
  - cardápio público;
  - checkout;
  - pedidos;
  - configurações;
  - painel público;
  - produtos;
  - categorias.

## Quando não rodar E2E

Não rode E2E se o Supabase Free/Nano estiver:

- com aviso de recursos esgotados;
- retornando 500/504;
- com Auth instável;
- com dashboard muito lento;
- com logs de timeout ou `context canceled`.

Nesses casos, falhas podem ser infraestrutura e não regressão do código.

## Quando expandir testes

- pagamento real;
- webhook;
- onboarding com assinatura;
- Conta/Segurança;
- login com usuário;
- 2FA;
- relatórios avançados;
- edição de slug.

---

## 11. Resumo executivo

### O CardExpress já é

- um MVP funcional avançado;
- com dashboard operacional consistente;
- com fluxo público maduro;
- com autenticação, recovery e redefinição de senha;
- com upload de logo e imagem de produto;
- com controle de estoque;
- com produto sem estoque visível e bloqueado;
- com exclusão/arquivamento seguro de produto;
- com realtime nas rotas principais;
- com deploy de homologação na Vercel;
- com smoke E2E local validado e smoke remoto já validado em rodada de homologação;
- com documentação alinhada ao estado atual.

### O que falta de verdade

- pagamento real com Mercado Pago;
- webhook e idempotência;
- relatórios mais completos;
- Conta/Segurança e segurança avançada;
- linha SaaS comercial;
- assinatura mensal/anual;
- código de registro/acesso;
- políticas LGPD mais formais;
- domínio próprio e infraestrutura de produção real.

### Próximo passo mais inteligente

Não começar por Mercado Pago, billing ou SaaS.

A sequência mais segura é:

1. manter documentação e homologação estáveis;
2. corrigir polimentos pequenos percebidos em uso real;
3. escolher incremento operacional de baixo risco além do relatório semanal já entregue;
4. só depois abrir frentes sensíveis de conta, pagamento e SaaS.
