import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { DemoProductVisual, type DemoProductKind } from "@/components/layout/demo-product-visual";
import { WhatsappFloatingButton } from "@/components/layout/whatsapp-floating-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Demonstração",
  description: "Demonstração pública e estática do fluxo do CardExpress em modo demo.",
};

type BenefitIcon =
  | "link"
  | "grid"
  | "cart"
  | "demo"
  | "store"
  | "queue"
  | "stock"
  | "chart"
  | "toggle"
  | "box"
  | "tools"
  | "note"
  | "tv"
  | "history"
  | "user"
  | "phone"
  | "timeline"
  | "copy"
  | "settings"
  | "image";

const menuProducts = [
  {
    name: "Burger artesanal",
    description: "Blend da casa, queijo derretido e molho especial.",
    price: "R$ 28,90",
    quantity: "2",
    kind: "burger" as DemoProductKind,
    selected: true,
  },
  {
    name: "Pastel especial",
    description: "Massa crocante com recheio generoso.",
    price: "R$ 14,00",
    quantity: "1",
    kind: "pastel" as DemoProductKind,
    selected: true,
  },
  {
    name: "Suco natural",
    description: "Fruta batida na hora em copo de 400 ml.",
    price: "R$ 11,00",
    quantity: "1",
    kind: "juice" as DemoProductKind,
    selected: false,
  },
] as const;

const dashboardStats = [
  ["7", "Pedidos hoje"],
  ["1", "Aguardando"],
  ["2", "Em preparo"],
  ["1", "Pronto"],
  ["2", "Estoque baixo"],
] as const;

const productRows = [
  ["Burger artesanal", "R$ 28,90", "Lanches", "Venda liberada", "Estoque: 24 un.", "burger"],
  ["Pastel especial", "R$ 14,00", "Pastéis", "Venda liberada", "Estoque: 18 un.", "pastel"],
  ["Suco natural", "R$ 11,00", "Bebidas", "Estoque baixo", "Estoque: 5 un.", "juice"],
  ["Café gelado", "R$ 13,00", "Bebidas", "Estoque baixo", "Estoque: 4 un.", "coffee"],
] as const;

const categoryRows = [
  ["Lanches", "1", "Ativa"],
  ["Bebidas", "2", "Ativa"],
  ["Pastéis", "3", "Ativa"],
  ["Combos", "4", "Ativa"],
] as const;

const pickupCalls = ["0247", "0243", "0239", "0236"] as const;

const showcaseBenefits = {
  menu: [
    ["Link e QR Code", "O cliente acessa a loja sem baixar aplicativo.", "link"],
    ["Categorias rápidas", "Produtos organizados para navegação simples.", "grid"],
    ["Carrinho claro", "Quantidade e total sempre visíveis.", "cart"],
    ["Pedido organizado", "Itens e quantidades seguem para a próxima etapa.", "note"],
  ],
  checkout: [
    ["Resumo claro", "Itens, quantidades e total antes da finalização.", "cart"],
    ["Dados do cliente", "Nome e telefone identificam o pedido no balcão.", "user"],
    ["Observação do pedido", "Informações importantes chegam junto ao pedido.", "note"],
    ["Finalização guiada", "O cliente confirma tudo antes de enviar o pedido.", "copy"],
  ],
  tracking: [
    ["Status visível", "O cliente acompanha o andamento sem perguntar no balcão.", "timeline"],
    ["Link de acompanhamento", "A tela pode ser aberta novamente pelo próprio cliente.", "link"],
    ["Número destacado", "O código do pedido fica fácil de localizar.", "copy"],
    ["Linha do tempo", "Eventos importantes aparecem em ordem clara.", "history"],
  ],
  orders: [
    ["Fila organizada", "Pedidos ativos ficam separados por etapa.", "queue"],
    ["Ações rápidas", "Aceitar, recusar e avançar status em poucos toques.", "tools"],
    ["Dados do cliente", "Telefone, nome e total ficam no mesmo card.", "phone"],
    ["Itens visíveis", "A equipe confere o pedido antes de preparar.", "cart"],
  ],
  dashboard: [
    ["Status da loja", "Veja se a operação está aberta ou pausada.", "store"],
    ["Ritmo em tempo real", "Pedidos organizados por fila, preparo e retirada.", "queue"],
    ["Alertas de estoque", "Identifique itens que precisam de reposição.", "stock"],
    ["Indicadores rápidos", "Acompanhe o atendimento durante o período.", "chart"],
  ],
  products: [
    ["Venda liberada", "Controle o que pode ser comprado.", "toggle"],
    ["Estoque visível", "Evite pedidos de itens indisponíveis.", "box"],
    ["Organização", "Mantenha categorias e ordem dos produtos.", "grid"],
    ["Ações rápidas", "Ajustes simples direto pelo painel.", "tools"],
  ],
  categories: [
    ["Organização do cardápio", "Categorias deixam a navegação mais clara.", "grid"],
    ["Reordenação simples", "A sequência pode acompanhar a rotina da loja.", "queue"],
    ["Status ativo", "Controle quais seções aparecem para o cliente.", "toggle"],
    ["Mais clareza", "Produtos ficam mais fáceis de encontrar.", "cart"],
  ],
  settings: [
    ["Dados da loja", "Nome e telefone ficam consistentes no cardápio.", "store"],
    ["Logo pública", "A marca aparece para clientes e no painel.", "image"],
    ["Mensagem para clientes", "Oriente retirada, preparo ou avisos importantes.", "note"],
    ["Identidade visual", "A loja fica mais reconhecível no acesso público.", "settings"],
  ],
  tv: [
    ["Pedido em destaque", "Número chamado com alto contraste.", "tv"],
    ["Últimos chamados", "Cliente confere pedidos recentes.", "history"],
    ["Visual para balcão", "Ideal para exibir em TV ou monitor.", "store"],
    ["Menos dúvidas", "Reduz perguntas sobre retirada.", "queue"],
  ],
} as const;

export default async function DemonstracaoPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(user);
  const primaryHref = isAuthenticated ? "/dashboard" : "/cadastro";
  const primaryLabel = isAuthenticated ? "Acessar painel" : "Criar conta gratuita";
  const secondaryHref = isAuthenticated ? "/" : "/login";
  const secondaryLabel = isAuthenticated ? "Voltar à landing" : "Entrar";

  return (
    <main className="cx-page-bg min-h-screen overflow-x-clip text-zinc-900">
      <WhatsappFloatingButton />
      <section className="relative isolate overflow-hidden bg-[#171717] px-4 pb-12 pt-8 text-white sm:px-6 sm:pb-14">
        <DarkGridBackground />
        <div className="mx-auto max-w-7xl">
          <nav className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" aria-label="Voltar à landing do CardExpress">
              <DemoWordmark />
            </Link>
            <Link href="/" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15">
              Voltar à landing
            </Link>
          </nav>

          <div className="grid gap-10 pt-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full border border-amber-300/35 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-100">
                Demonstração do produto
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                Veja o CardExpress em funcionamento
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
                Uma vitrine do fluxo completo: cardápio público, checkout demonstrativo, acompanhamento do pedido, fila
                do comerciante, gestão do catálogo, configurações da loja e painel de retirada.
              </p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
                Os dados são fictícios e servem para apresentar a experiência. A finalização exibida é demonstrativa e
                não realiza cobrança real nesta fase.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href={primaryHref} className="cx-btn-primary min-h-11 px-5 py-3 text-sm font-semibold">
                  {primaryLabel}
                </Link>
                <Link href={secondaryHref} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-300/30 bg-amber-300/10 px-5 py-3 text-sm font-semibold text-amber-50 transition hover:bg-amber-300/15">
                  {secondaryLabel}
                </Link>
              </div>
            </div>

            <div className="relative mx-auto grid w-full max-w-3xl gap-4 sm:grid-cols-[0.88fr_1.12fr] sm:items-center">
              <div className="mx-auto w-full max-w-[19rem]">
                <DemoPhoneFrame label="Cardápio público" variant="compact">
                  <MobileMenuMock compact />
                </DemoPhoneFrame>
              </div>
              <div className="grid gap-3">
                <div className="mx-auto hidden w-full max-w-[19rem] sm:block">
                  <DemoPhoneFrame label="Pedido" variant="compact">
                    <MobileOrderStatusMock compact />
                  </DemoPhoneFrame>
                </div>
                <div className="rounded-2xl border border-amber-300/20 bg-black/35 p-3 shadow-[0_28px_80px_-48px_rgba(0,0,0,0.9)]">
                  <TvPickupMock compact />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FlowStrip />

      <ShowcaseSection
        step="Etapa 1"
        eyebrow="Fluxo do cliente"
        title="Cliente acessa o cardápio"
        description="O cliente acessa a loja pelo link ou QR Code, encontra os produtos por categoria, ajusta quantidades e acompanha o carrinho sem precisar criar conta."
        benefits={showcaseBenefits.menu}
      >
        <DemoPhoneFrame label="Cardápio público">
          <MobileMenuMock />
        </DemoPhoneFrame>
      </ShowcaseSection>

      <ShowcaseSection
        step="Etapa 2"
        eyebrow="Checkout demonstrativo"
        title="Cliente revisa o checkout"
        description="O checkout reúne itens, quantidades, dados do cliente, observação e total estimado. Nesta fase, a finalização é demonstrativa e não realiza cobrança real."
        benefits={showcaseBenefits.checkout}
        reverse
        tone="warm"
      >
        <DemoPhoneFrame label="Checkout" variant="tall">
          <MobileCheckoutMock />
        </DemoPhoneFrame>
      </ShowcaseSection>

      <ShowcaseSection
        step="Etapa 3"
        eyebrow="Acompanhamento"
        title="Cliente acompanha o pedido"
        description="Depois de finalizar o pedido, o cliente acompanha tudo em uma tela simples: status, número do pedido, total e linha do tempo atualizada."
        benefits={showcaseBenefits.tracking}
      >
        <DemoPhoneFrame label="Pedido 0248">
          <MobileOrderStatusMock />
        </DemoPhoneFrame>
      </ShowcaseSection>

      <ShowcaseSection
        step="Etapa 4"
        eyebrow="Fila do comerciante"
        title="Comerciante recebe o pedido"
        description="O comerciante recebe os pedidos em uma fila organizada, visualiza os dados do cliente, confere os itens e avança o status sem depender de papel ou mensagens soltas."
        benefits={showcaseBenefits.orders}
        reverse
        tone="warm"
      >
        <DemoPhoneFrame label="Pedidos" variant="tall">
          <MobileMerchantOrdersMock />
        </DemoPhoneFrame>
      </ShowcaseSection>

      <ShowcaseSection
        step="Etapa 5"
        eyebrow="Operação em tempo real"
        title="Dashboard acompanha o ritmo da loja"
        description="O painel resume status da loja, pedidos do dia, fila, preparo, retiradas e alertas de estoque para apoiar decisões durante o atendimento."
        benefits={showcaseBenefits.dashboard}
      >
        <DemoPhoneFrame label="Dashboard" variant="tall">
          <MobileDashboardMock />
        </DemoPhoneFrame>
      </ShowcaseSection>

      <ShowcaseSection
        step="Etapa 6"
        eyebrow="Categorias"
        title="Categorias organizam a navegação"
        description="As categorias ajudam a organizar o cardápio para o cliente encontrar os produtos com mais facilidade, mantendo a sequência das seções sob controle antes do cadastro dos itens."
        benefits={showcaseBenefits.categories}
        reverse
        tone="warm"
      >
        <DemoPhoneFrame label="Categorias">
          <MobileCategoriesMock />
        </DemoPhoneFrame>
      </ShowcaseSection>

      <ShowcaseSection
        step="Etapa 7"
        eyebrow="Catálogo"
        title="Produtos sob controle"
        description="Depois das categorias, a tela de produtos organiza imagem, descrição, preço, estoque, disponibilidade e ordem de exibição no cardápio."
        benefits={showcaseBenefits.products}
      >
        <DemoPhoneFrame label="Produtos">
          <MobileProductsMock />
        </DemoPhoneFrame>
      </ShowcaseSection>

      <ShowcaseSection
        step="Etapa 8"
        eyebrow="Configurações"
        title="A loja mantém sua identidade"
        description="As configurações permitem ajustar nome, telefone, logo e mensagem pública da loja, mantendo o cardápio com a identidade do estabelecimento."
        benefits={showcaseBenefits.settings}
        reverse
        tone="warm"
      >
        <DemoPhoneFrame label="Configurações" variant="tall">
          <MobileSettingsMock />
        </DemoPhoneFrame>
      </ShowcaseSection>

      <section className="relative overflow-hidden bg-[#171717] px-4 py-12 text-white sm:px-6 lg:py-16">
        <DarkGridBackground />
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-100">
              Etapa 9
            </p>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-amber-200">Painel de retirada</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Cliente vê o pedido chamado
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
              O painel de retirada mostra o pedido chamado e os últimos pedidos prontos, ajudando clientes a acompanharem
              a retirada sem depender de chamadas manuais repetidas.
            </p>
            <BenefitGrid items={showcaseBenefits.tv} dark />
          </div>
          <TvPickupMock />
        </div>
      </section>

      <section className="px-4 py-12 text-zinc-900 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl rounded-3xl border border-[#eadfd2] bg-white/88 p-6 text-center shadow-[0_28px_70px_-52px_rgba(24,24,27,0.7)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9f1239]">Próximo passo</p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Pronto para testar com sua própria loja?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
            Configure uma loja de teste, publique seu cardápio e valide o fluxo completo de pedidos com retirada no balcão.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={primaryHref} className="cx-btn-primary min-h-11 px-5 py-3 text-sm font-semibold">
              {primaryLabel}
            </Link>
            <Link href={secondaryHref} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#eadfd2] bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:border-amber-300 hover:bg-[#fffaf2]">
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function DemoWordmark() {
  return (
    <span className="group inline-flex items-center rounded-xl px-1 py-1 text-lg font-black tracking-tight transition duration-300 hover:translate-y-[-1px] sm:text-xl">
      <span className="text-[#9f1239] drop-shadow-[0_1px_10px_rgba(159,18,57,0.45)]">Card</span>
      <span className="text-[#f2b544] drop-shadow-[0_1px_10px_rgba(242,181,68,0.28)]">Express</span>
      <span className="ml-1 mt-1 h-1.5 w-1.5 rounded-full bg-[#f2b544] shadow-[0_0_16px_rgba(242,181,68,0.85)] transition group-hover:scale-125" />
    </span>
  );
}

function DarkGridBackground() {
  return (
    <>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[length:82px_82px]" />
      <div className="absolute -left-24 top-16 -z-10 h-72 w-72 rounded-full bg-[#9f1239]/35 blur-3xl" />
      <div className="absolute right-0 top-20 -z-10 h-80 w-80 rounded-full bg-[#c58a1a]/20 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1 bg-gradient-to-r from-[#9f1239] via-[#c58a1a] to-[#70102a]" />
    </>
  );
}

function FlowStrip() {
  const steps = ["Cardápio", "Checkout", "Acompanhamento", "Pedidos", "Dashboard", "Categorias", "Produtos", "Configurações", "Retirada"] as const;
  return (
    <section className="border-y border-[#eadfd2] bg-white/72 py-4 sm:px-6 sm:py-5">
      <div className="mx-auto flex max-w-7xl snap-x items-center gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0">
        {steps.map((step, index) => (
          <div key={step} className="flex shrink-0 snap-start items-center gap-2">
            <span className="whitespace-nowrap rounded-full border border-[#eadfd2] bg-[#fffaf2] px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm">
              {step}
            </span>
            {index < steps.length - 1 ? (
              <span className="hidden h-px w-6 bg-gradient-to-r from-[#9f1239] to-[#c58a1a] sm:block" aria-hidden />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function ShowcaseSection({
  step,
  eyebrow,
  title,
  description,
  benefits,
  children,
  reverse = false,
  tone = "light",
}: {
  step: string;
  eyebrow: string;
  title: string;
  description: string;
  benefits: readonly (readonly [string, string, string])[];
  children: ReactNode;
  reverse?: boolean;
  tone?: "light" | "warm";
}) {
  return (
    <section className={`relative overflow-hidden px-4 py-10 sm:px-6 sm:py-12 lg:py-14 ${tone === "warm" ? "bg-[#fff7ed]/72" : "bg-transparent"}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c58a1a]/50 to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className={reverse ? "lg:order-2" : ""}>
          <p className="inline-flex rounded-full border border-[#eadfd2] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#9f1239]">
            {step}
          </p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-[#9f1239]">{eyebrow}</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-zinc-950 sm:text-4xl">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">{description}</p>
          <BenefitGrid items={benefits} />
        </div>
        <div className={`mx-auto w-full max-w-[20rem] ${reverse ? "lg:order-1" : ""}`}>{children}</div>
      </div>
    </section>
  );
}

function BenefitGrid({ items, dark = false }: { items: readonly (readonly [string, string, string])[]; dark?: boolean }) {
  return (
    <div className="mt-5 grid max-w-2xl gap-2 sm:grid-cols-2">
      {items.map(([title, description, icon]) => (
        <article
          key={title}
          className={`rounded-2xl border p-3 transition duration-300 lg:hover:-translate-y-0.5 ${
            dark
              ? "border-white/10 bg-white/[0.06] text-white lg:hover:border-amber-300/35"
              : "border-[#eadfd2] bg-white/78 text-zinc-900 shadow-[0_16px_36px_-32px_rgba(24,24,27,0.45)] lg:hover:border-amber-300 lg:hover:bg-white"
          }`}
        >
          <div className="flex gap-3">
            <span
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                dark ? "border-amber-300/25 bg-amber-300/10 text-amber-100" : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <BenefitIconView name={icon as BenefitIcon} />
            </span>
            <span className="min-w-0">
              <strong className={`block text-sm font-semibold ${dark ? "text-white" : "text-zinc-950"}`}>{title}</strong>
              <span className={`mt-1 block text-xs leading-5 ${dark ? "text-zinc-300" : "text-zinc-600"}`}>{description}</span>
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function DemoPhoneFrame({ label, children, variant = "standard" }: { label: string; children: ReactNode; variant?: "compact" | "standard" | "tall" }) {
  const heightClass = variant === "compact" ? "h-[28rem]" : variant === "tall" ? "h-[37rem]" : "h-[35rem]";
  return (
    <div className="mx-auto w-full max-w-[20rem] rounded-[2rem] border border-zinc-900/80 bg-zinc-950 p-2 shadow-[0_28px_90px_-48px_rgba(24,24,27,0.9)] sm:max-w-[21rem]">
      <div className="rounded-[1.6rem] border border-white/10 bg-[#fffaf2] p-2">
        <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-zinc-950/20" />
        <div className={`overflow-hidden rounded-[1.25rem] border border-[#eadfd2] bg-[#fffaf2] ${heightClass}`}>
          <div className="flex items-center justify-between border-b border-[#eadfd2] bg-white px-3 py-2">
            <span className="text-[11px] font-black tracking-tight">
              <span className="text-[#9f1239]">Card</span>
              <span className="text-[#c58a1a]">Express</span>
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">{label}</span>
          </div>
          <div className="h-[calc(100%-2.25rem)] overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}

function StoreLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-10 w-10" : size === "lg" ? "h-16 w-16" : "h-12 w-12";
  const imageSize = size === "lg" ? "64px" : size === "sm" ? "40px" : "48px";
  return (
    <div className={`relative ${sizeClass} shrink-0 overflow-hidden rounded-2xl border border-[#eadfd2] bg-white p-0.5`}>
      <Image src="/demo/sabor-no-ponto-logo.png" alt="Logo da loja Sabor no Ponto" fill sizes={imageSize} quality={95} unoptimized className="object-contain" />
    </div>
  );
}

function StoreMiniHeader({ subtitle = "Retirada no balcão" }: { subtitle?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <StoreLogo size="sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-950">Sabor no Ponto</p>
        <p className="mt-0.5 text-[11px] text-zinc-500">{subtitle}</p>
      </div>
    </div>
  );
}

function MiniQrCode() {
  const cells = [
    1, 1, 1, 0, 1, 0, 1, 1,
    1, 0, 1, 0, 0, 1, 0, 1,
    1, 1, 1, 1, 0, 1, 1, 1,
    0, 0, 1, 0, 1, 0, 0, 1,
    1, 0, 0, 1, 1, 1, 0, 0,
    0, 1, 1, 0, 0, 1, 1, 0,
    1, 0, 1, 1, 0, 0, 1, 1,
    1, 1, 0, 0, 1, 1, 0, 1,
  ];

  return (
    <div className="grid h-20 w-20 shrink-0 grid-cols-8 gap-0.5 rounded-xl border border-[#eadfd2] bg-white p-2">
      {cells.map((filled, index) => (
        <span key={index} className={filled ? "rounded-[1px] bg-zinc-950" : "rounded-[1px] bg-transparent"} />
      ))}
    </div>
  );
}

function MobileMenuMock({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative h-full bg-[#fffaf2] bg-[linear-gradient(90deg,rgba(112,16,42,0.04)_1px,transparent_1px),linear-gradient(180deg,rgba(112,16,42,0.04)_1px,transparent_1px)] bg-[length:44px_44px]">
      <div className="px-3 py-3">
        <div className="rounded-2xl border border-[#eadfd2] bg-white p-2.5 shadow-sm">
          <div className="h-1 rounded-full bg-gradient-to-r from-[#9f1239] via-[#c58a1a] to-[#70102a]" />
          <div className="mt-2 flex items-center gap-3">
            <StoreLogo size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9f1239]">Estabelecimento</p>
              <h3 className="mt-1 break-words text-sm font-semibold text-zinc-950">Sabor no Ponto</h3>
              <p className="mt-1 text-[11px] text-zinc-500">Telefone: (15) 99412-2030</p>
            </div>
          </div>
          <div className="mt-2">
            <StatusBadge tone="success">Aceitando pedidos</StatusBadge>
          </div>
        </div>

        <div className="mt-2 rounded-2xl border border-[#eadfd2] bg-white/85 p-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#9f1239]">Explore o cardápio</p>
            <p className="text-[11px] text-zinc-500">{compact ? "2" : "3"} resultado(s)</p>
          </div>
          <div className="mt-2 rounded-xl border border-[#eadfd2] bg-white px-3 py-1.5 text-xs text-zinc-400">
            Buscar por nome ou descrição
          </div>
          <div className="mt-2 flex gap-2 overflow-hidden">
            {["Todos", "Lanches", "Bebidas"].map((category, index) => (
              <span
                key={category}
                className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  index === 0 ? "border-[#c58a1a] bg-[#c58a1a] text-white" : "border-[#eadfd2] bg-white text-zinc-700"
                }`}
              >
                {category}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-2 space-y-2 pb-20">
          {menuProducts.slice(0, compact ? 1 : 2).map((product) => (
            <div key={product.name} className="rounded-2xl border border-[#eadfd2] bg-white p-2.5 shadow-sm">
              <div className="h-1 rounded-full bg-gradient-to-r from-[#9f1239]/70 via-[#c58a1a] to-transparent" />
              <div className="mt-2 flex items-start gap-3">
                <DemoProductVisual kind={product.kind} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="break-normal text-[13px] font-semibold leading-tight text-zinc-950 hyphens-none">{product.name}</p>
                  <p className="mt-1 text-sm font-black text-[#9f1239]">{product.price}</p>
                </div>
                <div className="shrink-0 self-center">
                  {product.selected ? (
                    <QuantityPill quantity={product.quantity} compact />
                  ) : (
                    <button type="button" disabled className="rounded-lg bg-[#c58a1a] px-3 py-1.5 text-xs font-semibold text-white">
                      Adicionar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-[#70102a]/40 bg-[#3d0719] p-2.5 text-white shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold">3 itens</p>
            <p className="text-sm font-black">R$ 71,80</p>
            <p className="text-[10px] leading-tight text-zinc-300">2x Burger artesanal + 1x Pastel especial</p>
          </div>
          <span className="shrink-0 whitespace-nowrap rounded-xl bg-[#c58a1a] px-3 py-2 text-xs font-black text-white">Ir para checkout</span>
        </div>
      </div>
    </div>
  );
}

function MobileCheckoutMock() {
  return (
    <div className="h-full bg-[#fffaf2] px-3 py-3">
      <div className="rounded-2xl border border-[#eadfd2] bg-white p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9f1239]">Checkout</p>
        <h3 className="mt-1 text-lg font-semibold text-zinc-950">Resumo do pedido</h3>
        <div className="mt-2">
          <StoreMiniHeader subtitle="Pedido 0248" />
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {menuProducts.slice(0, 2).map((product) => (
          <div key={product.name} className="rounded-2xl border border-[#eadfd2] bg-white p-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <DemoProductVisual kind={product.kind} size="sm" />
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-zinc-950">{product.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{product.quantity} unidade(s)</p>
                </div>
              </div>
              <p className="shrink-0 text-sm font-black text-[#9f1239]">{product.name === "Burger artesanal" ? "R$ 57,80" : "R$ 14,00"}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 rounded-2xl border border-[#eadfd2] bg-white p-2.5 text-xs leading-5 text-zinc-700">
        Observação: retirar no balcão em nome de Ana.
      </div>

      <div className="mt-2 rounded-2xl border border-[#70102a]/25 bg-white p-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-zinc-700">Total estimado</span>
          <span className="text-lg font-black text-[#9f1239]">R$ 71,80</span>
        </div>
        <button type="button" disabled className="mt-2 w-full rounded-xl bg-[#c58a1a] px-4 py-2 text-sm font-black text-white">
          Criar sessão de checkout
        </button>
      </div>
    </div>
  );
}

function MobileOrderStatusMock({ compact = false }: { compact?: boolean }) {
  return (
    <div className="h-full bg-[#fffaf2] px-3 py-3">
      <div className="mb-3 rounded-2xl border border-[#eadfd2] bg-white p-3">
        <StoreMiniHeader subtitle="Acompanhamento do pedido" />
      </div>
      <div className="rounded-2xl border border-[#eadfd2] bg-white p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9f1239]">Acompanhamento</p>
            <p className="mt-1 text-5xl font-black leading-none text-zinc-950">0248</p>
          </div>
          <span className="shrink-0 text-right">
            <StatusBadge tone="success" className="min-h-7 whitespace-nowrap px-2 text-[10px]">{compact ? "Pronto" : "Pronto p/ retirada"}</StatusBadge>
          </span>
        </div>
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold leading-5 text-emerald-900">
          Seu pedido está pronto para retirada. Use esta tela para acompanhar atualizações automáticas.
        </p>
      </div>

      <div className="mt-3 grid gap-2">
        <div className="rounded-2xl border border-[#eadfd2] bg-white p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Total</p>
          <p className="mt-1 text-sm font-black text-[#9f1239]">R$ 71,80</p>
        </div>
        <div className="rounded-2xl border border-[#eadfd2] bg-white p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Cliente</p>
          <p className="mt-1 text-sm font-semibold text-zinc-950">Ana Souza</p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-[#eadfd2] bg-white p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9f1239]">Linha do tempo</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {["Recebido: 17/05, 13:13", "Aceito: 13:16", "Pronto: 13:28"].slice(0, compact ? 2 : 3).map((item) => (
            <span key={item} className="rounded-lg border border-[#eadfd2] bg-[#fffaf2] px-2 py-1 text-[11px] font-semibold text-zinc-600">
              {item}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs leading-5 text-zinc-500">Aguardando próxima atualização do estabelecimento.</p>
      </div>

      <div className="mt-3 flex gap-2">
        <span className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700">Copiar link</span>
        <span className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700">Compartilhar link</span>
      </div>
    </div>
  );
}

function MobileMerchantOrdersMock() {
  return (
    <div className="h-full bg-[#fffaf2] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9f1239]">Pedidos</p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-950">Fila operacional</h3>
        </div>
        <span className="rounded-xl border border-[#eadfd2] bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700">Som: ativado</span>
      </div>
      <div className="mt-3 rounded-2xl border border-[#eadfd2] bg-white p-2">
        <StoreMiniHeader subtitle="Pedidos em andamento" />
      </div>

      <div className="mt-3 flex gap-2 overflow-hidden">
        {["Ativos", "Finalizados", "Recusados"].map((filter, index) => (
          <span
            key={filter}
            className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${
              index === 0 ? "border-[#c58a1a] bg-[#c58a1a] text-white" : "border-[#eadfd2] bg-white text-zinc-700"
            }`}
          >
            {filter}
          </span>
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-[#eadfd2] bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="rounded-lg bg-zinc-950 px-2 py-1 text-sm font-black text-white">0248</p>
          <StatusBadge tone="warning">Aguardando aceite</StatusBadge>
        </div>
        <div className="mt-3 grid gap-2">
          <InfoLine label="Cliente" value="Ana Souza" />
          <InfoLine label="Telefone" value="(15) 98888-2030" />
          <InfoLine label="Total" value="R$ 71,80" accent />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" disabled className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-800">
            Aceitar
          </button>
          <button type="button" disabled className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            Recusar
          </button>
        </div>
        <div className="mt-3 rounded-xl border border-[#eadfd2] bg-[#fffaf2] p-3 text-xs text-zinc-700">
          <p className="font-semibold uppercase tracking-wide text-zinc-500">Itens do pedido</p>
          <div className="mt-2 flex justify-between gap-3">
            <span>2x Burger artesanal</span>
            <span className="font-semibold">R$ 57,80</span>
          </div>
          <div className="mt-1 flex justify-between gap-3">
            <span>1x Pastel especial</span>
            <span className="font-semibold">R$ 14,00</span>
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-[#eadfd2] bg-white px-3 py-2 text-[11px] text-zinc-500">
          Recebido: 17/05, 13:13
        </div>
      </div>
    </div>
  );
}

function MobileDashboardMock({ compact = false }: { compact?: boolean }) {
  return (
    <div className="h-full bg-[#fffaf2] px-3 py-3">
      <div className="mb-3 border-b border-[#eadfd2] pb-3">
        <div className="flex items-center justify-between gap-3">
          <StoreMiniHeader subtitle="Dashboard da loja" />
          <span className="rounded-xl border border-[#eadfd2] bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700">Menu</span>
        </div>
        <h3 className="mt-3 text-base font-semibold text-zinc-950">Visão operacional</h3>
        <p className="mt-1 text-[11px] text-zinc-500">Resumo da loja em tempo real.</p>
      </div>

      <div className="rounded-2xl border border-[#eadfd2] bg-white p-2.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9f1239]">Status da loja</p>
            <h3 className="mt-1 text-sm font-semibold text-zinc-950">Sabor no Ponto</h3>
            <p className="mt-1 text-[11px] text-zinc-500">Retirada no balcão</p>
          </div>
          <StatusBadge tone="success">Aberta</StatusBadge>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-[#eadfd2] bg-white/90 p-2.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9f1239]">Operação em tempo real</p>
            <h3 className="mt-1 text-sm font-semibold text-zinc-950">Dashboard</h3>
          </div>
          <StatusBadge tone="warning">Ritmo</StatusBadge>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-xl border border-[#eadfd2] bg-white p-2">
            <p className="font-semibold text-zinc-500">Hoje</p>
            <p className="font-black text-[#9f1239]">R$ 128,70</p>
          </div>
          <div className="rounded-xl border border-[#eadfd2] bg-white p-2">
            <p className="font-semibold text-zinc-500">Semana atual</p>
            <p className="font-black text-[#9f1239]">R$ 842,30</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {dashboardStats.map(([value, label]) => (
            <div key={label} className="rounded-xl border border-[#eadfd2] bg-[#fffaf2] p-2">
              <p className="text-lg font-black leading-none text-zinc-950">{value}</p>
              <p className="mt-1 text-[10px] leading-tight text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {!compact ? (
        <div className="mt-3 rounded-2xl border border-[#eadfd2] bg-white p-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9f1239]">Alertas de estoque</p>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">2</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-600">Café gelado e suco natural precisam de reposição.</p>
        </div>
      ) : null}

      <div className="mt-3 rounded-2xl border border-[#eadfd2] bg-white p-2.5 text-xs text-zinc-700">
        Pedido #0248 aguardando aceite.
      </div>
    </div>
  );
}

function MobileProductsMock() {
  return (
    <div className="h-full bg-[#fffaf2] px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9f1239]">Produtos</p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-950">Catálogo</h3>
          <p className="mt-1 text-[11px] text-zinc-500">Sabor no Ponto</p>
        </div>
        <span className="rounded-xl bg-[#9f1239] px-3 py-2 text-xs font-semibold text-white">Novo produto</span>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-[#eadfd2] bg-white p-3 text-xs">
        <span className="font-semibold text-zinc-700">Selecionar todos</span>
        <span className="text-zinc-500">4 produtos</span>
      </div>

      <div className="mt-3 space-y-3">
        {productRows.map(([name, price, category, sale, stock, kind]) => (
          <div key={name} className="rounded-2xl border border-[#eadfd2] bg-white p-3">
            <div className="h-1 rounded-full bg-gradient-to-r from-[#9f1239]/70 via-[#c58a1a] to-transparent" />
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <DemoProductVisual kind={kind as DemoProductKind} size="sm" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Ordem na lista</p>
                  <p className="mt-1 break-words text-sm font-semibold text-zinc-950">{name}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{category}</p>
                </div>
              </div>
              <span className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-black text-[#9f1239]">{price}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold">
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-900">Ativo</span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-900">{sale}</span>
            </div>
            <div className="mt-3 rounded-xl border border-[#eadfd2] bg-[#fffaf2] px-3 py-2 text-xs leading-5 text-zinc-600">
              <p>Cardápio público: visível</p>
              <p>Compra agora: {sale === "Venda liberada" ? "apta" : "apta, com atenção ao estoque"}</p>
              <p>{stock}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileCategoriesMock() {
  return (
    <div className="h-full bg-[#fffaf2] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9f1239]">Categorias</p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-950">Seções do cardápio</h3>
          <p className="mt-1 text-[11px] text-zinc-500">Sabor no Ponto</p>
        </div>
        <span className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-sm">Nova categoria</span>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-[#eadfd2] bg-white p-3 text-xs">
        <span className="font-semibold text-zinc-700">Selecionar todos</span>
        <span className="text-zinc-500">4 categorias</span>
      </div>
      <div className="mt-3 space-y-3">
        {categoryRows.map(([name, order, status]) => (
          <div key={name} className="rounded-2xl border border-[#eadfd2] bg-white p-3">
            <div className="h-1 rounded-full bg-gradient-to-r from-[#9f1239]/70 via-[#c58a1a] to-transparent" />
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Ordem #{order}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-950">{name}</p>
                <p className="mt-1 text-xs text-zinc-500">Use ordenar para ajustar a sequência.</p>
              </div>
              <div className="shrink-0">
                <p className="mb-1 text-right text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Mover</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#eadfd2] bg-white text-xs font-semibold text-zinc-600">&uarr;</span>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#eadfd2] bg-white text-xs font-semibold text-zinc-600">&darr;</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[#eadfd2] pt-3">
              <StatusBadge tone="success">{status}</StatusBadge>
              <span className="h-8 w-8 rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileSettingsMock() {
  return (
    <div className="h-full bg-[#fffaf2] px-3 py-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9f1239]">Configurações</p>
        <h3 className="mt-1 text-lg font-semibold text-zinc-950">Dados básicos da loja</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">Sabor no Ponto</p>
      </div>
      <div className="mt-3 rounded-2xl border border-[#eadfd2] bg-white p-3">
        <label className="block text-xs font-semibold text-zinc-700">Nome da loja</label>
        <div className="mt-2 rounded-xl border border-[#eadfd2] bg-[#fffaf2] px-3 py-2 text-sm font-semibold text-zinc-900">Sabor no Ponto</div>
        <label className="mt-3 block text-xs font-semibold text-zinc-700">Telefone da loja</label>
        <div className="mt-2 rounded-xl border border-[#eadfd2] bg-[#fffaf2] px-3 py-2 text-sm text-zinc-700">(15) 99412-2030</div>
        <label className="mt-3 block text-xs font-semibold text-zinc-700">Link público</label>
        <div className="mt-2 rounded-xl border border-[#eadfd2] bg-[#fffaf2] px-3 py-2 text-xs font-semibold text-[#9f1239]">cardexpress.app/sabor-no-ponto</div>
      </div>
      <div className="mt-3 rounded-2xl border border-[#eadfd2] bg-white p-3">
        <p className="text-sm font-semibold text-zinc-950">Logo e QR Code</p>
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="flex h-24 items-center justify-center rounded-xl bg-white p-2">
              <div className="relative h-full w-full">
                <Image src="/demo/sabor-no-ponto-logo.png" alt="Prévia da logo da loja Sabor no Ponto" fill sizes="160px" quality={95} unoptimized className="object-contain" />
              </div>
            </div>
            <MiniQrCode />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-semibold">
            <span className="rounded-lg bg-[#9f1239] px-2 py-2 text-white">Link</span>
            <span className="rounded-lg border border-[#eadfd2] bg-white px-2 py-2 text-zinc-700">Enviar</span>
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-[#eadfd2] bg-white p-3">
        <p className="text-xs font-semibold text-zinc-700">Mensagem pública</p>
        <p className="mt-2 text-xs leading-5 text-zinc-600">Peça pelo celular e retire no balcão quando ficar pronto.</p>
      </div>
    </div>
  );
}

function InfoLine({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[#eadfd2] bg-[#fffaf2] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${accent ? "text-[#9f1239]" : "text-zinc-900"}`}>{value}</p>
    </div>
  );
}

function QuantityPill({ quantity, compact = false }: { quantity: string; compact?: boolean }) {
  const buttonClass = compact ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-xs";
  const valueClass = compact ? "h-6 w-7 text-[10px]" : "h-7 w-9 text-xs";
  return (
    <span className="inline-flex items-center gap-1 rounded-xl border border-[#eadfd2] bg-[#fffaf2] px-1.5 py-1">
      <span className={`inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white font-semibold text-zinc-600 ${buttonClass}`}>-</span>
      <span className={`inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white font-black text-zinc-900 ${valueClass}`}>{quantity}</span>
      <span className={`inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white font-semibold text-zinc-600 ${buttonClass}`}>+</span>
    </span>
  );
}

function TvPickupMock({ compact = false }: { compact?: boolean }) {
  return (
    <article className={`relative overflow-hidden rounded-3xl border border-amber-300/25 bg-[#101010] text-white shadow-[0_28px_90px_-45px_rgba(0,0,0,0.95)] ${compact ? "p-2.5" : "p-5 sm:p-7"}`}>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:64px_64px]" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#9f1239] via-[#c58a1a] to-[#70102a]" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <StoreLogo size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Painel de retirada</p>
              <h2 className={`${compact ? "text-base" : "text-2xl"} mt-1 break-words font-semibold`}>Sabor no Ponto</h2>
              {!compact ? <p className="text-xs text-zinc-400">/sabor-no-ponto</p> : null}
            </div>
          </div>
          <StatusBadge tone="dark">TV</StatusBadge>
        </div>

        <div className={`${compact ? "mt-2.5 p-2.5" : "mt-10 p-8"} rounded-3xl border border-amber-300/20 bg-amber-300/10 text-center`}>
          <p className={`${compact ? "text-xs" : "text-sm"} font-semibold uppercase tracking-wide text-amber-100`}>Chamando agora</p>
          <p className={`${compact ? "text-4xl" : "text-7xl sm:text-8xl"} mt-2 font-black leading-none text-amber-300 drop-shadow-[0_0_32px_rgba(252,211,77,0.22)]`}>0248</p>
          <p className={`${compact ? "mt-2 text-[11px]" : "mt-3 text-sm"} text-zinc-300`}>Atualizado 17/05, 19:42</p>
        </div>

        <div className={compact ? "mt-2.5" : "mt-5"}>
          <div className="flex items-center justify-between gap-3">
            <p className={`${compact ? "text-xs" : "text-sm"} font-semibold text-zinc-200`}>Últimos chamados</p>
            <span className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[11px] font-semibold text-amber-100">Som: ligado</span>
          </div>
          <div className={`${compact ? "mt-2" : "mt-3"} flex flex-wrap gap-2`}>
            {pickupCalls.map((code) => (
              <span key={code} className={`rounded-xl border border-white/10 bg-white/[0.07] font-black text-zinc-100 ${compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm sm:px-4 sm:text-lg"}`}>
                {code}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function BenefitIconView({ name }: { name: BenefitIcon }) {
  const paths: Record<BenefitIcon, string> = {
    link: "M9.5 14.5 14.5 9.5 M10.8 7.2 12 6a4 4 0 0 1 5.7 5.7l-1.2 1.2M13.2 16.8 12 18a4 4 0 0 1-5.7-5.7l1.2-1.2",
    grid: "M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z",
    cart: "M4 5h2l2 10h9l2-7H7",
    demo: "M6 5h12v14H6zM9 9h6M9 13h4",
    store: "M5 10h14l-1-5H6l-1 5ZM7 10v9h10v-9",
    queue: "M6 7h12M6 12h12M6 17h8",
    stock: "M5 8.5 12 5l7 3.5v7L12 19l-7-3.5v-7ZM12 12v7M5 8.5l7 3.5 7-3.5",
    chart: "M7 17v-5M12 17V7M17 17v-8",
    toggle: "M8 12h8",
    box: "M5 8.5 12 5l7 3.5v7L12 19l-7-3.5v-7Z",
    tools: "M14.5 5.5 18 9l-9 9H5.5v-3.5l9-9Z",
    note: "M7 5h10v14H7zM10 9h4M10 13h4",
    tv: "M4 6h16v11H4zM9 21h6",
    history: "M12 7v5l3 2M20 12a8 8 0 1 1-2.35-5.65",
    user: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM5 21a7 7 0 0 1 14 0",
    phone: "M8 4h8v16H8zM11 17h2",
    timeline: "M6 5v14M10 7h8M10 12h6M10 17h8",
    copy: "M8 8h10v10H8zM6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 12h2M18 12h2M12 4v2M12 18v2",
    image: "M5 5h14v14H5zM8 15l3-3 2 2 2-3 2 4M9 9h.1",
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
      <path d={paths[name]} strokeLinecap="round" strokeLinejoin="round" />
      {name === "toggle" ? <circle cx="8" cy="12" r="3" /> : null}
    </svg>
  );
}
