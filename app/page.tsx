import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Sora, Space_Grotesk } from "next/font/google";
import { Reveal } from "@/components/layout/reveal";
import { LandingStickyNav } from "@/components/layout/landing-sticky-nav";
import { LandingBenefitsSection } from "@/components/layout/landing-benefits-section";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { WhatsappFloatingButton } from "@/components/layout/whatsapp-floating-button";
import { DemoProductVisual, type DemoProductKind } from "@/components/layout/demo-product-visual";
import { BRANDING } from "@/lib/branding";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Início",
};

const HAS_REAL_PAYMENT = false;

const bodyFont = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const paymentNarrative = HAS_REAL_PAYMENT
  ? {
      hero: "Com pagamento integrado, confirmação automática e entrada do pedido no painel depois da aprovação.",
      checkout: "Pagamento integrado e confirmação automática quando a transação for aprovada.",
      step: "Pagamento aprovado",
      stepDescription: "A confirmação libera o pedido para o painel do comerciante.",
      about: "A experiência conecta pagamento integrado, confirmação e operação no painel.",
    }
  : {
      hero: "Nesta fase, o checkout está em modo demo e a base fica preparada para ativação futura de pagamento real.",
      checkout: "Checkout estruturado em modo demo, sem cobrança real nesta fase.",
      step: "Checkout em modo demo",
      stepDescription: "O fluxo simula a finalização para validar experiência e operação com transparência.",
      about: "O checkout permanece em modo demo nesta etapa, sem afirmar pagamento real ativo.",
    };

const landingSections = [
  { id: "inicio", label: "Início" },
  { id: "produto", label: "Produto" },
  { id: "como-funciona", label: "Como funciona" },
  { id: "diferenciais", label: "Diferenciais" },
  { id: "beneficios", label: "Benefícios" },
  { id: "demonstracao", label: "Demonstração" },
] as const;

const heroBadges = [
  "Cardápio por link e QR Code",
  "Painel de pedidos",
  "Estoque e disponibilidade",
  "Retirada no balcão",
] as const;

const flowSteps = [
  {
    title: "Loja criada",
    description: "O comerciante cadastra o estabelecimento e configura a operação.",
  },
  {
    title: "Cardápio no ar",
    description: "Categorias, produtos, disponibilidade e estoque ficam prontos para o cliente.",
  },
  {
    title: paymentNarrative.step,
    description: paymentNarrative.stepDescription,
  },
  {
    title: "Pedido no painel",
    description: "A equipe aceita, prepara, finaliza e orienta a retirada.",
  },
] as const;

const differentiators = [
  {
    title: "Operação simples de manter",
    description: "Pausar pedidos, abrir manualmente ou usar horário automático sem complicar a rotina.",
  },
  {
    title: "Cardápio que respeita estoque",
    description: "Disponibilidade e estoque aparecem de forma clara para a loja e para o cliente.",
  },
  {
    title: "Status público para reduzir dúvidas",
    description: "O cliente acompanha o pedido e a equipe mantém o balcão mais organizado.",
  },
  {
    title: "Atualização em tempo real",
    description: "Painel, pedido e retirada seguem o andamento operacional da loja.",
  },
] as const;

const merchantBenefits = [
  {
    title: "Dashboard com indicadores",
    description: "Filtros, alertas de estoque e visão rápida da operação no painel.",
  },
  {
    title: "Catálogo sob controle",
    description: "Produtos, categorias, disponibilidade e modos operacionais no mesmo lugar.",
  },
  {
    title: "Fila de pedidos clara",
    description: "Aceite, preparo, retirada e atualização em tempo real para a equipe.",
  },
  {
    title: "Estoque sem improviso",
    description: "Itens baixos ou zerados ficam visíveis antes de virarem ruído no atendimento.",
  },
] as const;

const customerBenefits = [
  {
    title: "Acesso por link ou QR Code",
    description: "O cliente abre o cardápio no celular sem instalar aplicativo.",
  },
  {
    title: "Carrinho objetivo",
    description: "Escolha de itens, quantidades e resumo com menos atrito.",
  },
  {
    title: "Checkout estruturado",
    description: "Fluxo de pedido em validação, sem cobrança real nesta fase.",
  },
  {
    title: "Status público",
    description: "Acompanhamento até a retirada, com menos dúvidas no balcão.",
  },
] as const;

type ProductFlowIconName = "menu" | "cart" | "panel" | "pickup";

function ProductFlowIcon({ name }: { name: ProductFlowIconName }) {
  if (name === "menu") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
        <path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5z" />
        <path d="M14 14h2.5M14 19h5M19 14v2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "cart") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
        <path d="M4 5h2l2.1 10.2a2 2 0 0 0 2 1.6h6.8a2 2 0 0 0 1.9-1.4L20 8H7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="20" r="1.2" />
        <circle cx="17" cy="20" r="1.2" />
      </svg>
    );
  }

  if (name === "panel") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
        <path d="M4 5h16v13H4z" />
        <path d="M8 15v-4M12 15V8M16 15v-6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
      <path d="M6 9h12l-1 10H7L6 9Z" strokeLinejoin="round" />
      <path d="M9 9a3 3 0 0 1 6 0" />
      <path d="M9.2 14.2 11 16l3.8-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LandingHeroMockup() {
  const menuItems = [
    {
      name: "Burger artesanal",
      description: "Blend da casa, queijo derretido e molho especial.",
      price: "R$ 28,90",
      quantity: "2",
      kind: "burger",
    },
    {
      name: "Pastel especial",
      description: "Massa crocante com recheio generoso.",
      price: "R$ 14,00",
      quantity: "1",
      kind: "pastel",
    },
    {
      name: "Suco natural",
      description: "Fruta batida na hora em copo de 400 ml.",
      price: "R$ 11,00",
      quantity: null,
      kind: "juice",
    },
  ] as const;

  return (
    // As contenções min-w-0/minmax evitam que cards internos empurrem o hero além da largura em mobiles estreitos.
    <div className="relative w-full min-w-0 overflow-hidden rounded-3xl border border-amber-200/20 bg-white/[0.07] p-2.5 shadow-[0_34px_100px_-48px_rgba(0,0,0,0.95)] sm:p-4">
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-2.5 sm:gap-3 lg:grid-cols-[minmax(0,1.14fr)_minmax(0,0.86fr)] lg:items-stretch">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2.5 sm:gap-3 lg:h-full lg:grid-rows-[auto_minmax(0,1fr)]">
        <div className="w-full min-w-0 max-w-full rounded-2xl border border-amber-100 bg-[#fffaf2] p-2.5 text-zinc-900 sm:p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#eadfd2] bg-white p-1">
                <Image src="/demo/sabor-no-ponto-logo.png" alt="Logo da loja Sabor no Ponto" fill sizes="40px" quality={95} unoptimized className="object-contain" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9f1239]">Cardápio público</p>
                <p className="mt-0.5 break-words text-[15px] font-semibold leading-tight">Sabor no Ponto</p>
                <p className="mt-1 text-xs text-zinc-500">Pedidos com retirada no balcão</p>
              </div>
            </div>
            <span className="shrink-0 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800">
              Aceitando pedidos
            </span>
          </div>

          <div className="mt-3 space-y-1.5 sm:space-y-2">
            {menuItems.map((product) => (
              <div key={product.name} className="w-full min-w-0 rounded-xl border border-[#eadfd2] bg-white p-2 sm:p-2.5">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <DemoProductVisual kind={product.kind as DemoProductKind} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate whitespace-nowrap text-sm font-semibold text-zinc-950">{product.name}</p>
                    <p className="mt-1 text-sm font-black text-[#9f1239]">{product.price}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-4 text-zinc-500">{product.description}</p>
                  </div>
                  <div className="shrink-0 self-center">
                    {product.quantity ? (
                      <HeroQuantityControl quantity={product.quantity} />
                    ) : (
                      <button type="button" disabled className="rounded-lg bg-[#c58a1a] px-3 py-1.5 text-xs font-black text-white">
                        Adicionar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-[#70102a]/30 bg-[#3d0719] p-2.5 text-white sm:p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold">3 itens</p>
                <p className="text-sm font-black">R$ 71,80</p>
                <p className="mt-1 text-[10px] leading-tight text-white/70">2x Burger artesanal + 1x Pastel especial</p>
              </div>
              <span className="w-full rounded-xl bg-[#c58a1a] px-3 py-2 text-center text-xs font-black text-white sm:w-auto sm:shrink-0 sm:whitespace-nowrap">Ir para checkout</span>
            </div>
          </div>
        </div>

        <div className="w-full min-w-0 max-w-full rounded-2xl border border-amber-300/20 bg-zinc-950 p-3 text-white sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Painel de retirada</p>
              <p className="mt-1 text-sm text-zinc-300">Chamando agora</p>
            </div>
            <span className="shrink-0 rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
              TV
            </span>
          </div>
          <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-3 text-center text-5xl font-black leading-none text-amber-300 sm:text-6xl lg:text-5xl">
            0248
          </p>
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Últimos chamados</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {["0247", "0243", "0239"].map((code) => (
                <span key={code} className="rounded-lg border border-white/10 bg-white/[0.07] px-2 py-1 text-[10px] font-semibold text-zinc-200 sm:text-[11px]">
                  {code}
                </span>
              ))}
            </div>
          </div>
        </div>
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2.5 sm:gap-3">
          <div className="w-full min-w-0 max-w-full rounded-2xl border border-[#eadfd2] bg-[#fffaf2] p-3 text-zinc-900 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9f1239]">Dashboard</p>
                <p className="mt-1 text-sm font-semibold">Visão operacional</p>
              </div>
              <span className="inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-semibold text-amber-900 before:h-1.5 before:w-1.5 before:rounded-full before:bg-amber-500">
                Ao vivo
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:gap-2">
              {[
                ["7", "Pedidos hoje"],
                ["1", "Aguardando"],
                ["2", "Em preparo"],
                ["1", "Pronto"],
                ["2", "Estoque baixo"],
                ["R$ 18,14", "Ticket médio"],
              ].map(([value, label]) => (
                <div key={label} className="min-h-[3.4rem] rounded-xl border border-[#eadfd2] bg-white p-2">
                  <p className="text-lg font-black leading-none text-zinc-950">{value}</p>
                  <p className="mt-1 text-[10px] leading-tight text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] sm:gap-2">
              <div className="rounded-xl border border-[#eadfd2] bg-white px-3 py-2">
                <p className="text-zinc-500">Hoje</p>
                <p className="font-black text-[#9f1239]">R$ 128,70</p>
              </div>
              <div className="rounded-xl border border-[#eadfd2] bg-white px-3 py-2">
                <p className="text-zinc-500">Semana</p>
                <p className="font-black text-[#9f1239]">R$ 842,30</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
              Pedido #0248 aguardando aceite.
            </div>
          </div>

          <div className="flex w-full min-w-0 max-w-full flex-col rounded-2xl border border-[#eadfd2] bg-white p-3 text-zinc-900 sm:p-4 lg:h-full">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9f1239]">Checkout</p>
                <p className="mt-1 text-sm font-semibold">Resumo do pedido</p>
                <p className="mt-1 text-[11px] font-medium text-zinc-500">
                  Estabelecimento: <span className="font-semibold text-zinc-800">Sabor no Ponto</span>
                </p>
              </div>
            </div>
            <div className="mt-3 flex-1 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-[#fffaf2] px-2.5 py-2">
                <span className="min-w-0">2x Burger artesanal</span>
                <strong className="text-[#9f1239]">R$ 57,80</strong>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-[#fffaf2] px-2.5 py-2">
                <span className="min-w-0">1x Pastel especial</span>
                <strong className="text-[#9f1239]">R$ 14,00</strong>
              </div>
              <p className="rounded-lg border border-[#eadfd2] bg-[#fffaf2]/70 px-2.5 py-2 text-[11px] leading-snug text-zinc-600">
                <span className="font-semibold text-zinc-700">Observação:</span> cliente retira no balcão.
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[#eadfd2] pt-3">
              <span className="text-xs font-semibold text-zinc-500">Total</span>
              <span className="text-base font-black text-[#9f1239]">R$ 71,80</span>
            </div>
            <button type="button" disabled className="mt-3 w-full rounded-xl bg-[#9f1239] px-3 py-2 text-xs font-black text-white">
              Finalizar pedido
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

function HeroQuantityControl({ quantity }: { quantity: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-xl border border-[#eadfd2] bg-[#fffaf2] px-1.5 py-1">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[11px] font-semibold text-zinc-600">-</span>
      <span className="inline-flex h-6 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[11px] font-black text-zinc-950">
        {quantity}
      </span>
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[11px] font-semibold text-zinc-600">+</span>
    </span>
  );
}

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(user);
  const primaryCtaHref = isAuthenticated ? "/dashboard" : "/cadastro";
  const primaryCtaLabel = isAuthenticated ? "Acessar painel" : "Criar conta";

  return (
    <main className={`${bodyFont.className} cx-page-bg overflow-x-clip text-zinc-900`}>
      <LandingStickyNav sections={landingSections} isAuthenticated={isAuthenticated} />
      <WhatsappFloatingButton />

      <section
        id="inicio"
        className="relative isolate scroll-mt-52 overflow-hidden bg-[#171717] px-4 pt-24 text-white sm:scroll-mt-44 sm:px-6 sm:pt-36 md:scroll-mt-36 lg:pt-32"
      >
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[length:82px_82px]" />
        <div className="absolute -left-24 top-16 -z-10 h-72 w-72 rounded-full bg-[#9f1239]/35 blur-3xl" />
        <div className="absolute right-0 top-20 -z-10 h-80 w-80 rounded-full bg-[#c58a1a]/20 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-[#9f1239]/55 via-[#9f1239]/18 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-3 bg-gradient-to-r from-[#9f1239] via-[#c58a1a] to-[#70102a]" />
        <div className="absolute inset-x-0 bottom-0 z-0 h-14 bg-[radial-gradient(120%_70%_at_50%_110%,#fffaf2_42%,transparent_43%)]" />

        <div className="mx-auto grid max-w-7xl min-w-0 gap-6 pb-9 sm:gap-8 sm:pb-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-12 lg:pb-14">
          <Reveal className="min-w-0">
            <div className="w-full min-w-0 max-w-3xl">
              <Image
                src={BRANDING.logoPath}
                alt={BRANDING.productName}
                width={268}
                height={66}
                priority
                className="h-auto w-auto max-w-[156px] rounded-xl bg-white/95 px-3 py-2 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.85)] sm:max-w-[268px]"
              />
              <p className="mt-4 flex max-w-full justify-center rounded-full border border-amber-300/35 bg-amber-300/10 px-3 py-1 text-center text-[10px] font-semibold uppercase leading-5 tracking-wide text-amber-100 sm:mt-5 sm:inline-flex sm:text-xs">
                Seu cardápio digital. Seus pedidos no ritmo certo.
              </p>
              <h1
                className={`${displayFont.className} mt-3 text-[2.05rem] font-semibold leading-[1.06] text-white sm:mt-4 sm:text-[3.65rem] sm:leading-[1.04] lg:text-[4.05rem] xl:text-[4.35rem]`}
              >
                Cardápio, pedidos e retirada no compasso da sua operação.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-200 sm:mt-4 sm:text-lg sm:leading-8">
                O CardExpress ajuda lanchonetes, cafeterias e pontos de venda rápida a transformar o cardápio em um
                fluxo claro de pedido, preparo, status público e retirada.
              </p>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-400 sm:mt-2.5 sm:text-base sm:leading-6">{paymentNarrative.hero}</p>

              <div className="mt-5 flex w-full min-w-0 flex-col gap-3 sm:mt-6 sm:flex-row sm:flex-wrap">
                <Link href={primaryCtaHref} prefetch className="cx-btn-primary min-h-11 w-full px-5 py-2.5 text-center text-sm font-semibold sm:min-h-12 sm:w-auto sm:px-6 sm:py-3 sm:text-base">
                  {primaryCtaLabel}
                </Link>
                <Link
                  href="/demonstracao"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-amber-300/30 bg-amber-300/10 px-5 py-2.5 text-center text-sm font-semibold text-amber-50 transition hover:bg-amber-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/35 sm:min-h-12 sm:w-auto sm:px-6 sm:py-3 sm:text-base"
                >
                  Visualizar demonstração
                </Link>
              </div>
              {isAuthenticated ? (
                <p className="mt-3 max-w-xl text-xs leading-5 text-zinc-400">
                  Sua conta já está ativa neste navegador. Para criar uma nova conta, saia da conta atual primeiro.
                </p>
              ) : null}

              {/* Chips em grid no mobile reduzem risco de overflow sem esconder conteúdo. */}
              <div className="mt-5 grid w-full min-w-0 grid-cols-2 gap-2 sm:mt-6 sm:flex sm:flex-wrap">
                {heroBadges.map((badge) => (
                  <span
                    key={badge}
                    className="flex min-h-10 max-w-full items-center justify-center rounded-xl border border-amber-200/20 bg-white/[0.07] px-2 py-1 text-center text-[11px] font-medium leading-[1.15] text-zinc-200 sm:min-h-0 sm:rounded-full sm:px-3 sm:py-1 sm:text-xs sm:leading-5"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal className="min-w-0" delayMs={120}>
            <LandingHeroMockup />
          </Reveal>
        </div>
      </section>

      <section id="produto" className="scroll-mt-52 bg-transparent py-14 sm:scroll-mt-44 sm:py-16 md:scroll-mt-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#9f1239]">Visão do produto</p>
                <h2 className={`${displayFont.className} mt-3 text-3xl font-semibold text-zinc-950 sm:text-4xl`}>
                  Um fluxo visual do pedido, sem espalhar a operação
                </h2>
                <p className="mt-4 text-sm leading-6 text-zinc-600 sm:text-base">
                  O CardExpress organiza quatro momentos em uma experiência contínua: cardápio, checkout, dashboard e
                  retirada. O comerciante não precisa alternar entre ferramentas para entender o que está acontecendo.
                </p>
              </div>

              <div className="cx-brand-panel overflow-visible p-3 sm:p-4">
                <div className="grid gap-3 md:grid-cols-4 md:gap-8 md:items-stretch">
                  {[
                    ["Cardápio", "Link público e QR Code"],
                    ["Checkout", "Fluxo estruturado em validação"],
                    ["Painel", "Pedidos, estoque e indicadores"],
                    ["Retirada", "Status público para o cliente"],
                  ].map(([title, description], index) => (
                    <div
                      key={title}
                      className="relative min-h-[8.75rem] rounded-xl border border-[#eadfd2] bg-[#fffaf2] p-4 transition duration-300 hover:border-amber-300 hover:bg-white md:h-full"
                    >
                      {index < 3 ? (
                        <span className="absolute left-[calc(100%+1rem)] top-1/2 z-10 hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-amber-200 bg-white text-amber-700 shadow-sm md:flex">
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden>
                            <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      ) : null}
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-900">
                        <ProductFlowIcon name={index === 0 ? "menu" : index === 1 ? "cart" : index === 2 ? "panel" : "pickup"} />
                      </span>
                      <h3 className="mt-3 text-base font-semibold text-zinc-950">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  {paymentNarrative.checkout}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="como-funciona" className="relative scroll-mt-52 bg-white/72 py-14 sm:scroll-mt-44 sm:py-16 md:scroll-mt-36">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c58a1a]/45 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9f1239]">Como funciona</p>
              <h2 className={`${displayFont.className} mt-3 text-3xl font-semibold text-zinc-950 sm:text-4xl`}>
                Da configuração ao pedido pronto em poucos passos
              </h2>
            </div>
          </Reveal>

          <ol className="mt-8 grid gap-3 md:relative md:grid-cols-4 md:gap-6 md:border-t md:border-zinc-200 md:pt-7">
            {flowSteps.map((step, index) => (
              <Reveal key={step.title} delayMs={index * 70}>
                <li className="rounded-xl border border-[#eadfd2] bg-[#fffaf2] p-4 md:relative md:border-0 md:bg-transparent md:p-0 md:pr-5">
                  <span className="mb-3 flex h-3 w-3 rounded-full bg-[#c58a1a] ring-4 ring-amber-100 md:absolute md:-top-[34px] md:left-0 md:mb-0">
                    <span className="sr-only">Etapa {index + 1}</span>
                  </span>
                  <h3 className="text-base font-semibold text-zinc-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{step.description}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section id="diferenciais" className="scroll-mt-52 bg-[#171717] py-14 text-white sm:scroll-mt-44 sm:py-16 md:scroll-mt-36">
        <div className="mx-auto grid max-w-7xl gap-9 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <Reveal>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Diferenciais</p>
              <h2 className={`${displayFont.className} mt-3 text-3xl font-semibold text-white sm:text-4xl`}>
                Feito para a rotina real de pequenos estabelecimentos
              </h2>
              <p className="mt-4 text-sm leading-6 text-zinc-400 sm:text-base">{paymentNarrative.about}</p>
            </div>
          </Reveal>

          <div className="grid gap-3 sm:grid-cols-2">
            {differentiators.map((item, index) => (
              <Reveal key={item.title} delayMs={index * 70}>
                <article className="h-full rounded-xl border border-white/10 bg-white/[0.06] p-4 transition duration-300 hover:border-white/20 hover:bg-white/[0.08] sm:p-5">
                  <span className="block h-1 w-10 rounded-full bg-[#c58a1a]" />
                  <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="beneficios" className="relative scroll-mt-52 bg-transparent py-14 sm:scroll-mt-44 sm:py-16 md:scroll-mt-36">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#9f1239]/25 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="mb-7 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9f1239]">Benefícios</p>
              <h2 className={`${displayFont.className} mt-3 text-3xl font-semibold text-zinc-950 sm:text-4xl`}>
                Uma experiência melhor para a loja e para quem retira
              </h2>
            </div>
          </Reveal>

          <Reveal delayMs={80}>
            <LandingBenefitsSection
              merchantBenefits={merchantBenefits}
              customerBenefits={customerBenefits}
              merchantTitle="Mais controle no atendimento"
              customerTitle="Menos dúvida até a retirada"
            />
          </Reveal>
        </div>
      </section>

      <section id="demonstracao" className="scroll-mt-52 bg-white/72 py-14 sm:scroll-mt-44 sm:py-16 md:scroll-mt-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="rounded-2xl border border-[#70102a]/40 bg-[#171717] p-5 text-white shadow-sm sm:p-8 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Demonstração</p>
                <h2 className={`${displayFont.className} mt-3 text-3xl font-semibold text-white sm:text-4xl`}>
                  Veja o CardExpress funcionando antes de criar sua loja
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                  Explore uma prévia do cardápio público, do checkout, do painel do comerciante e da tela de
                  retirada. Assim você entende o fluxo completo antes de testar com sua própria loja.
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0">
                <Link
                  href="/demonstracao"
                  className="cx-btn-primary min-h-11 px-5 py-3 text-sm font-semibold"
                >
                  Visualizar demonstração
                </Link>
                <Link
                  href={primaryCtaHref}
                  prefetch
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  {isAuthenticated ? "Acessar painel" : "Criar conta gratuita"}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <MarketingFooter isAuthenticated={isAuthenticated} primaryCtaHref={primaryCtaHref} />
    </main>
  );
}
