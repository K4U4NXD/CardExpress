# Deploy de homologação: Vercel Free + Supabase Free

Este guia documenta o ambiente gratuito de homologação do CardExpress na Vercel, usando Supabase como backend.

O ambiente de homologação continua em modo demo: não há pagamento real, assinatura, billing ou integração com Mercado Pago nesta etapa.

URL atual de homologação:

```text
https://cardexpress.vercel.app
```

Contato oficial do projeto:

```text
projetocardexpress@gmail.com
```

## Escopo desta etapa

- Deploy gratuito na Vercel usando a URL `vercel.app`.
- Supabase Free/Nano como Auth, Database, Storage e Realtime.
- Checkout em modo demo, com o botão "Simular pagamento aprovado".
- Sem domínio próprio agora.
- Sem produção real com pagamento.
- Sem service role key no frontend.
- Sem Mercado Pago nesta etapa.
- Sem SaaS/billing nesta etapa.
- Sem migrations, RLS, RPCs ou regras novas apenas por causa do deploy.

## 1. Deploy na Vercel

1. Crie ou acesse sua conta na Vercel.
2. Clique em "Add New..." e depois em "Project".
3. Importe o repositório do GitHub.
4. Selecione o projeto CardExpress.
5. Confirme o preset de framework como **Next.js**.
6. Use os comandos padrão:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output: padrão da Vercel para Next.js, sem configuração customizada.
7. Cadastre as variáveis de ambiente em **Project Settings > Environment Variables**.
8. Faça o deploy.
9. Confirme a URL gratuita gerada pela Vercel.
10. Use essa URL para configurar o Supabase Auth.

A Vercel fornece uma URL `vercel.app` automaticamente. Não hardcode essa URL no código. Domínio próprio fica como etapa futura.

## 2. Variáveis de ambiente

### Local: `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_STORE_LOGOS_BUCKET=public-assets
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### E2E local: `.env.e2e`

```env
PLAYWRIGHT_BASE_URL=http://localhost:3000
CARDEXPRESS_E2E_EMAIL=
CARDEXPRESS_E2E_PASSWORD=
CARDEXPRESS_E2E_CUSTOMER_NAME=Cliente E2E
CARDEXPRESS_E2E_CUSTOMER_PHONE=11999999999
CARDEXPRESS_E2E_RUN_ID=
```

### Vercel

Cadastre estas variáveis no painel da Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_STORE_LOGOS_BUCKET=public-assets
NEXT_PUBLIC_SITE_URL=https://cardexpress.vercel.app
```

Descrição:

- `NEXT_PUBLIC_SUPABASE_URL`: Project URL do Supabase, em **Settings > API**.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon public key do Supabase, em **Settings > API**.
- `NEXT_PUBLIC_SUPABASE_STORE_LOGOS_BUCKET`: bucket público de assets. Normalmente `public-assets`.
- `NEXT_PUBLIC_SITE_URL`: URL pública da aplicação. Na homologação atual, use `https://cardexpress.vercel.app`.

Não cadastre `service_role` na Vercel para este frontend. A aplicação usa apenas anon key pública.

Não faça commit de `.env.local`, `.env.e2e` ou qualquer segredo real.

## 3. Supabase Auth

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

Essas URLs são necessárias para:

- confirmação de e-mail;
- recuperação de senha;
- redefinição de senha;
- funcionamento local e remoto sem ficar alternando a configuração do Supabase.

Não é necessário trocar a URL Configuration entre local e Vercel. Mantenha a URL de homologação como Site URL e deixe os caminhos locais nas Redirect URLs permitidas.

Não altere templates de e-mail do Supabase nesta etapa, salvo necessidade específica documentada.

## 4. Supabase Database, Storage e Realtime

### Database

- Confirme que as migrations do repositório foram aplicadas no projeto Supabase de homologação.
- Liste o estado das migrations:

```bash
npx supabase migration list
```

- Se houver pendências e o projeto estiver corretamente vinculado, aplique com cuidado:

```bash
npx supabase db push
```

Não crie migration nova apenas para resolver deploy. Se algo exigir SQL, trate como alteração de produto/backend e documente separadamente.

### Storage

Confirme que o bucket público existe:

```text
public-assets
```

Caminhos esperados:

```text
store-logos/<store-id>/arquivo.ext
product-images/<store-id>/<product-id-ou-draft>/arquivo.ext
```

Esses arquivos são públicos por design para aparecerem no cardápio e no painel público sem autenticação.

### Realtime

Confirme que as migrations de Realtime foram aplicadas.

Valide em homologação:

- dashboard;
- pedidos;
- produtos;
- categorias;
- cardápio público;
- checkout;
- painel público;
- acompanhamento público do pedido;
- modo TV.

### Segurança

- Não exponha service role key.
- Use apenas anon key pública no frontend.
- Não faça commit de segredos.
- Valide com usuário real de teste.
- Use uma loja/projeto de homologação, não uma loja real de produção.
- Não interprete falhas de 500/504 do Supabase Free/Nano como bug de código automaticamente.

## 5. Modo demo de pagamento

O deploy na Vercel para homologação continua em modo demo.

- O botão "Simular pagamento aprovado" continua disponível.
- Isso não representa pagamento real.
- O pedido entra no fluxo operacional apenas depois da simulação.
- Antes de uso comercial real, será necessário integrar um gateway de pagamento.
- Mercado Pago fica para uma etapa futura separada.
- Webhook, idempotência e confirmação confiável do pagamento ainda não foram implementados.

Não remova a simulação e não implemente gateway nesta etapa sem abrir uma frente própria de pagamento real.

## 6. Validação local antes do deploy

Antes de publicar ou considerar o estado pronto para homologação, rode:

```bash
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

Se o Supabase estiver estável e o login manual estiver funcionando, rode também:

```bash
npm run test:e2e
```

Não rode E2E quando o Supabase estiver retornando 500/504, com painel lento ou com aviso de recursos esgotados.

Na última validação local desta documentação, a suíte E2E passou completa com 16/16 cenários.

## 7. E2E em homologação

A suíte E2E smoke possui 16 cenários no estado atual.

Para rodar a suíte E2E contra a URL da Vercel:

```bash
PLAYWRIGHT_BASE_URL=https://cardexpress.vercel.app npm run test:e2e
```

No Windows PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL="https://cardexpress.vercel.app"
npm run test:e2e
Remove-Item Env:\PLAYWRIGHT_BASE_URL -ErrorAction SilentlyContinue
```

O arquivo `.env.e2e` deve conter:

```env
CARDEXPRESS_E2E_EMAIL=
CARDEXPRESS_E2E_PASSWORD=
CARDEXPRESS_E2E_CUSTOMER_NAME=Cliente E2E
CARDEXPRESS_E2E_CUSTOMER_PHONE=11999999999
CARDEXPRESS_E2E_RUN_ID=
```

Atenção: a suíte E2E cria e altera categorias, produtos, pedidos e configurações operacionais da loja de teste. Rode apenas em projeto/loja de homologação. Não rode E2E em loja real de produção.

O login E2E deve continuar usando a UI real. Não crie fallback manual de autenticação, cookies injetados, chamada direta ao Supabase Auth ou fluxo paralelo que burle a interface.

Para listar a suíte:

```bash
npx playwright test --list
```

Para abrir o último relatório HTML:

```bash
npx playwright show-report
```

## 8. Instabilidade do Supabase Free/Nano

O Supabase Free/Nano pode apresentar limitação temporária de recursos, principalmente Disk I/O/compute.

Sintomas possíveis:

- aviso de recursos esgotados no painel;
- aviso de Disk IO Budget;
- Auth retornando 500/504;
- Auth com timeout em login ou callback;
- logs como `context canceled` ou request timeout;
- dashboard do Supabase lento;
- Vercel com timeout de middleware ou função;
- E2E remoto falhando sem regressão real do código.

Se isso acontecer:

1. Não altere testes imediatamente.
2. Teste login manual local e na Vercel.
3. Rode `npm run lint` e `npm run build`.
4. Só rode E2E quando o Supabase estabilizar.
5. Se a limitação se repetir com frequência, considerar upgrade de compute futuramente, não upgrade de versão do Postgres como primeira ação.

## 9. Gitignore e segredos

O repositório deve manter fora do versionamento:

- `.env`
- `.env.local`
- `.env*.local`
- `.env.e2e`
- `.next/`
- `node_modules/`
- `playwright-report/`
- `test-results/`

Verificação em bash:

```bash
git ls-files | grep -E "(^|/)\\.env"
```

Verificação no Windows PowerShell:

```powershell
git ls-files | Select-String "\.env"
```

Resultado esperado: apenas arquivos `.example` podem estar versionados.

## 10. Checklist final de homologação

- Projeto importado na Vercel com preset Next.js.
- `npm install` como install command.
- `npm run build` como build command.
- Variáveis de ambiente cadastradas na Vercel.
- `NEXT_PUBLIC_SITE_URL=https://cardexpress.vercel.app` configurado na Vercel.
- Supabase Auth configurado com Site URL da Vercel.
- Redirect URLs locais e Vercel configuradas no Supabase.
- Migrations conferidas com `npx supabase migration list`.
- Pendências aplicadas apenas se necessário com `npx supabase db push`.
- Bucket `public-assets` conferido.
- Realtime validado nos fluxos principais.
- Usuário e loja de teste preparados.
- `npm run lint` validado.
- `npm run build` validado.
- E2E local validado, se Supabase estiver estável.
- E2E contra Vercel validado, se Supabase estiver estável.
- Modo demo de pagamento comunicado aos avaliadores.
- Mercado Pago, SaaS/billing e produção real mantidos como etapas futuras.
