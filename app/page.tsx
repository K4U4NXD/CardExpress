import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Sora, Space_Grotesk } from "next/font/google";
import { Reveal } from "@/components/layout/reveal";
import { LandingStickyNav } from "@/components/layout/landing-sticky-nav";
import { LandingBenefitsSection } from "@/components/layout/landing-benefits-section";
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
      checkout: "Checkout estruturado em modo demo, com base preparada para pagamento real.",
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
  { id: "contato", label: "Contato" },
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
    description: "Fluxo de pedido em validação, com base preparada para pagamento real.",
  },
  {
    title: "Status público",
    description: "Acompanhamento até a retirada, com menos dúvidas no balcão.",
  },
] as const;

const navActionClass =
  "rounded-xl px-3 py-2 text-sm font-medium text-zinc-300 transition duration-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/30";

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

      <section
        id="inicio"
        className="relative isolate scroll-mt-52 overflow-hidden bg-[#171717] px-4 pt-32 text-white sm:scroll-mt-44 sm:px-6 sm:pt-36 md:scroll-mt-36 lg:pt-32"
      >
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[length:82px_82px]" />
        <div className="absolute -left-24 top-16 -z-10 h-72 w-72 rounded-full bg-[#9f1239]/35 blur-3xl" />
        <div className="absolute right-0 top-20 -z-10 h-80 w-80 rounded-full bg-[#c58a1a]/20 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-[#9f1239]/55 via-[#9f1239]/18 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-3 bg-gradient-to-r from-[#9f1239] via-[#c58a1a] to-[#70102a]" />
        <div className="absolute inset-x-0 bottom-0 z-0 h-14 bg-[radial-gradient(120%_70%_at_50%_110%,#fffaf2_42%,transparent_43%)]" />

        <div className="mx-auto grid max-w-7xl gap-8 pb-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-12 lg:pb-14">
          <Reveal>
            <div className="max-w-3xl">
              <Image
                src={BRANDING.logoPath}
                alt={BRANDING.productName}
                width={268}
                height={66}
                priority
                className="h-auto w-auto max-w-[220px] rounded-xl bg-white/95 px-3 py-2 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.85)] sm:max-w-[268px]"
              />
              <p className="mt-5 inline-flex rounded-full border border-amber-300/35 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-100">
                Seu cardápio digital. Seus pedidos no ritmo certo.
              </p>
              <h1
                className={`${displayFont.className} mt-4 text-[2.35rem] font-semibold leading-[1.04] text-white sm:text-[3.65rem] lg:text-[4.35rem] xl:text-[4.7rem]`}
              >
                Cardápio, pedidos e retirada no compasso da sua operação.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-200 sm:text-lg sm:leading-8">
                O CardExpress ajuda lanchonetes, cafeterias e pontos de venda rápida a transformar o cardápio em um
                fluxo claro de pedido, preparo, status público e retirada.
              </p>
              <p className="mt-2.5 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">{paymentNarrative.hero}</p>

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                <Link href={primaryCtaHref} prefetch className="cx-btn-primary min-h-11 px-5 py-2.5 text-sm font-semibold sm:min-h-12 sm:px-6 sm:py-3 sm:text-base">
                  {primaryCtaLabel}
                </Link>
                <a
                  href="#produto"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-300/30 bg-amber-300/10 px-5 py-2.5 text-sm font-semibold text-amber-50 transition hover:bg-amber-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/35 sm:min-h-12 sm:px-6 sm:py-3 sm:text-base"
                >
                  Ver produto
                </a>
                {!isAuthenticated ? (
                  <Link
                    href="/login"
                    prefetch
                    className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-300 underline-offset-4 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 sm:min-h-12 sm:py-3 sm:text-base"
                  >
                    Acessar painel
                  </Link>
                ) : null}
              </div>
              {isAuthenticated ? (
                <p className="mt-3 max-w-xl text-xs leading-5 text-zinc-400">
                  Sua conta já está ativa neste navegador. Para criar uma nova conta, saia da conta atual primeiro.
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                {heroBadges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-amber-200/20 bg-white/[0.07] px-3 py-1 text-xs font-medium text-zinc-200"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={120}>
            <div className="relative overflow-hidden rounded-2xl border border-amber-200/20 bg-white/[0.07] p-3 shadow-[0_34px_100px_-48px_rgba(0,0,0,0.95)] sm:p-4">
              <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
              <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-xl border border-amber-100 bg-[#fffaf2] p-4 text-zinc-900">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Cardápio público</p>
                      <p className="mt-1 text-lg font-semibold">Café & Lanches Centro</p>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                      Aberta
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {["Combo artesanal", "Pão de queijo", "Suco natural"].map((item, index) => (
                      <div key={item} className="flex items-center justify-between rounded-lg border border-[#eadfd2] bg-white px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">{item}</p>
                          <p className="text-xs text-zinc-500">{index === 1 ? "Estoque baixo" : "Disponível agora"}</p>
                        </div>
                        <span className="text-sm font-semibold text-[#9f1239]">R$ {index === 0 ? "24,90" : "8,00"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-xl border border-amber-300/20 bg-zinc-900 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Dashboard</p>
                      <span className="rounded-full bg-amber-300/15 px-2.5 py-1 text-xs text-amber-100">Ao vivo</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-white/[0.07] p-2 text-center">
                        <p className="text-lg font-semibold text-white">6</p>
                        <p className="text-[10px] text-zinc-400">Fila</p>
                      </div>
                      <div className="rounded-lg bg-white/[0.07] p-2 text-center">
                        <p className="text-lg font-semibold text-white">3</p>
                        <p className="text-[10px] text-zinc-400">Preparo</p>
                      </div>
                      <div className="rounded-lg bg-white/[0.07] p-2 text-center">
                        <p className="text-lg font-semibold text-white">2</p>
                        <p className="text-[10px] text-zinc-400">Retirada</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-200/40 bg-amber-200/12 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">Checkout</p>
                    <p className="mt-2 text-sm font-semibold text-white">{paymentNarrative.checkout}</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Painel de retirada</p>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[11px] text-zinc-400">Chamando agora</p>
                        <p className="text-3xl font-semibold leading-none text-amber-300">042</p>
                      </div>
                      <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold text-amber-100">
                        Retirada
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

      <section id="contato" className="scroll-mt-52 bg-white/72 py-14 sm:scroll-mt-44 sm:py-16 md:scroll-mt-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="rounded-2xl border border-[#70102a]/40 bg-[#171717] p-5 text-white shadow-sm sm:p-8 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Demonstração e contato</p>
                <h2 className={`${displayFont.className} mt-3 text-3xl font-semibold text-white sm:text-4xl`}>
                  Pronto para organizar sua operação de retirada?
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                  Ideal para lanchonetes, cafeterias, trailers e pontos de venda rápida que precisam de cardápio,
                  pedidos e status em uma rotina mais clara.
                </p>
                <p className="mt-3 break-all text-xs font-semibold text-zinc-400">projetocardexpress@gmail.com</p>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0">
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=projetocardexpress@gmail.com&su=Contato%20sobre%20o%20CardExpress&body=Ol%C3%A1%2C%0A%0AGostaria%20de%20saber%20mais%20sobre%20o%20CardExpress.%0A%0ANome%3A%0AEstabelecimento%3A%0AMensagem%3A%0A"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Abrir composição de e-mail no Gmail para projetocardexpress@gmail.com"
                  title="Abrir composição de e-mail no Gmail"
                  className="cx-btn-primary min-h-11 px-5 py-3 text-sm font-semibold"
                >
                  Solicitar demonstração
                </a>
                <Link
                  href={primaryCtaHref}
                  prefetch
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  {primaryCtaLabel}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#171717] text-zinc-200">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-12">
          <div className="max-w-md">
            <Image
              src={BRANDING.logoPath}
              alt={BRANDING.productName}
              width={180}
              height={44}
              className="h-auto w-auto max-w-[180px] rounded-lg bg-white px-2 py-1"
            />
            <p className="mt-2 text-sm text-zinc-400">
              Cardápio digital, checkout estruturado e painel de pedidos para retirada no balcão.
            </p>
          </div>

          <nav className="grid gap-2 text-sm sm:grid-cols-2 lg:min-w-[320px]">
            <a href="#produto" className={navActionClass}>
              Produto
            </a>
            <a href="#como-funciona" className={navActionClass}>
              Como funciona
            </a>
            <a href="#diferenciais" className={navActionClass}>
              Diferenciais
            </a>
            <a href="#contato" className={navActionClass}>
              Contato
            </a>
            <Link href={isAuthenticated ? "/dashboard" : "/login"} className={navActionClass}>
              {isAuthenticated ? "Painel" : "Login"}
            </Link>
            {!isAuthenticated ? (
              <Link href={primaryCtaHref} className={navActionClass}>
                Cadastro
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="border-t border-white/10 bg-[#171717]">
          <div className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-zinc-500 sm:px-6">
            <p>© 2026 CardExpress. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
