# CardExpress

Cardápio digital para pedidos com retirada no balcão. Cliente acessa por link ou QR Code; o comerciante gerencia produtos, categorias e pedidos no painel.

## Requisitos

- Node.js 18.18 ou superior (recomendado: 20 LTS)
- npm

## Como rodar

1. Copie as variáveis de ambiente:

   ```bash
   copy .env.local.example .env.local
   ```

   No macOS/Linux use `cp`. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com os valores do painel do Supabase (Settings → API).

2. Instale as dependências e suba o servidor de desenvolvimento:

   ```bash
   npm install
   npm run dev
   ```

3. Abra [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — desenvolvimento (Turbopack)
- `npm run build` — build de produção
- `npm run start` — servidor após build
- `npm run lint` — ESLint

## Estrutura (resumo)

- `app/(public)/` — cardápio e fluxo do cliente (`/[slug]`, checkout, status do pedido)
- `app/(dashboard)/` — login, cadastro e painel (`/login`, `/cadastro`, `/dashboard/...`)
- `app/actions/` — Server Actions (ex.: `auth.ts`)
- `lib/auth/` — validação de slug e helpers de redirect
- `lib/supabase/` — clientes browser, servidor e refresh de sessão no middleware
- `components/` — UI compartilhada
- `types/` — tipos TypeScript do domínio (expandir com o schema)

## Autenticação (comerciante)

- **Rotas:** `/cadastro` (novo usuário + loja + `store_settings`), `/login`, área autenticada em `/dashboard/*`.
- **Fluxo:** Supabase Auth (`signUp` / `signInWithPassword` / `signOut`) via Server Actions; middleware renova a sessão e redireciona visitantes não autenticados que batem em `/dashboard` para `/login?next=...`; usuários já logados que abrem `/login` ou `/cadastro` vão para `/dashboard`.
- **Confirmação de e-mail:** se estiver ativa no Supabase, após o `signUp` pode não haver `session` imediata — a loja só é criada quando há sessão. Para desenvolvimento, desative em Authentication → Providers → Email → “Confirm email”.
- **Schema esperado pelas actions:** `profiles(full_name)` para atualização no cadastro; `stores(owner_id, name, slug, phone)` com `slug` único (`phone` = telefone da loja); `store_settings(store_id)` (demais colunas com default ou nullable). Se seus nomes de colunas forem outros, ajuste `app/actions/auth.ts`.

### Políticas RLS (exemplo)

Garanta que o usuário autenticado possa atualizar o próprio `profiles`, inserir sua `stores` com `owner_id = auth.uid()` e inserir `store_settings` apenas para lojas que possui. Sem isso, o cadastro retorna erro da API.

### Como testar

1. Configure `.env.local` e suba o projeto (`npm run dev`).
2. Acesse `/cadastro`, preencha os campos com um slug válido (ex.: `minha-loja`).
3. Deve redirecionar para `/dashboard` com resumo da loja e botão **Sair** (ou mensagem de confirmação de e-mail, se aplicável).
4. Faça logout, acesse `/login` e entre com o mesmo e-mail/senha.
5. Tente abrir `/dashboard` em aba anônima: deve ir para `/login`.

## Próximos passos sugeridos

Implementar CRUD de categorias, produtos e pedidos; políticas RLS para cardápio público por `slug`.
