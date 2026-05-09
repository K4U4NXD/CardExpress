# Deploy de homologação: Vercel Free + Supabase Free

Este guia prepara o CardExpress para um ambiente gratuito de homologação na Vercel, usando Supabase como backend.

O ambiente de homologação continua em modo demo: não há pagamento real, assinatura, billing ou integração com Mercado Pago nesta etapa.

## Escopo desta etapa

- Deploy gratuito na Vercel usando a URL `vercel.app`.
- Supabase Free como Auth, Database, Storage e Realtime.
- Checkout em modo demo, com o botão "Simular pagamento aprovado".
- Sem domínio próprio agora.
- Sem service role key no frontend.
- Sem migrations, RLS, RPCs ou regras novas.

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
9. Copie a URL gratuita gerada pela Vercel, por exemplo:
   - `https://cardexpress.vercel.app`
10. Use essa URL para configurar o Supabase Auth.

A Vercel fornece uma URL `vercel.app` automaticamente. Não hardcode essa URL no código. Domínio próprio fica como etapa futura.

## 2. Variáveis de ambiente na Vercel

Cadastre estas variáveis no painel da Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_STORE_LOGOS_BUCKET=public-assets
NEXT_PUBLIC_SITE_URL=https://URL-GERADA-PELA-VERCEL
```

Descrição:

- `NEXT_PUBLIC_SUPABASE_URL`: Project URL do Supabase, em **Settings > API**.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon public key do Supabase, em **Settings > API**.
- `NEXT_PUBLIC_SUPABASE_STORE_LOGOS_BUCKET`: bucket público de assets. Normalmente `public-assets`.
- `NEXT_PUBLIC_SITE_URL`: URL pública da aplicação. Use a URL `vercel.app` gerada pela Vercel.

Não cadastre `service_role` na Vercel para este frontend. A aplicação usa apenas anon key pública.

Não faça commit de `.env.local`, `.env.e2e` ou qualquer segredo real.

## 3. Supabase Auth após deploy

Depois que a Vercel gerar a URL, atualize o Supabase:

**Authentication > URL Configuration**

Site URL:

- desenvolvimento: `http://localhost:3000`
- homologação Vercel: `https://URL-GERADA-PELA-VERCEL`

Redirect URLs permitidas:

- `http://localhost:3000/auth/confirm`
- `http://localhost:3000/redefinir-senha`
- `https://URL-GERADA-PELA-VERCEL/auth/confirm`
- `https://URL-GERADA-PELA-VERCEL/redefinir-senha`

Essas URLs são necessárias para:

- confirmação de e-mail;
- recuperação de senha;
- redefinição de senha.

Não altere templates de e-mail do Supabase nesta etapa.

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

Não crie migration nova nesta etapa. Se algo exigir SQL, trate como observação futura.

### Storage

- Confirme que o bucket `public-assets` existe.
- Confirme que ele está público conforme as migrations.
- Caminhos esperados:
  - logo da loja: `store-logos/<store-id>/arquivo.ext`
  - imagem de produto: `product-images/<store-id>/<product-id-ou-draft>/arquivo.ext`

### Realtime

- Confirme que as migrations de Realtime foram aplicadas.
- Valide em homologação:
  - dashboard;
  - pedidos;
  - cardápio público;
  - checkout;
  - painel público;
  - acompanhamento público do pedido.

### Segurança

- Não exponha service role key.
- Use apenas anon key pública no frontend.
- Não faça commit de segredos.
- Valide com usuário real de teste.
- Use uma loja/projeto de homologação, não uma loja real de produção.

## 5. Modo demo de pagamento

O deploy na Vercel para homologação continua em modo demo.

- O botão "Simular pagamento aprovado" continua disponível.
- Isso não representa pagamento real.
- O pedido entra no fluxo operacional apenas depois da simulação.
- Antes de uso comercial real, será necessário integrar um gateway de pagamento.
- Mercado Pago fica para uma etapa futura separada.

Não remova a simulação e não implemente gateway nesta etapa.

## 6. E2E em homologação

Para rodar a suíte E2E contra a URL da Vercel:

```bash
PLAYWRIGHT_BASE_URL=https://URL-GERADA-PELA-VERCEL npm run test:e2e
```

No Windows PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL="https://URL-GERADA-PELA-VERCEL"; npm run test:e2e
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

Para listar a suíte:

```bash
npx playwright test --list
```

## 7. Gitignore e segredos

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

## 8. Checklist final de homologação

- Projeto importado na Vercel com preset Next.js.
- `npm install` como install command.
- `npm run build` como build command.
- Variáveis de ambiente cadastradas na Vercel.
- URL `vercel.app` gerada e copiada.
- Supabase Auth configurado com Site URL e Redirect URLs da Vercel.
- Migrations conferidas com `npx supabase migration list`.
- Pendências aplicadas apenas se necessário com `npx supabase db push`.
- Bucket `public-assets` conferido.
- Realtime validado nos fluxos principais.
- Usuário e loja de teste preparados.
- E2E validado contra a URL de homologação.
- Modo demo de pagamento comunicado aos avaliadores.
