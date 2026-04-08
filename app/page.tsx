import Link from "next/link";
import { Sora, Space_Grotesk } from "next/font/google";
import { Reveal } from "@/components/layout/reveal";
import { LandingStickyNav } from "@/components/layout/landing-sticky-nav";
import { LandingBenefitsSection } from "@/components/layout/landing-benefits-section";

const bodyFont = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const howItWorksSteps = [
  {
    title: "Cadastro da loja",
    description: "A conta é criada com os dados do estabelecimento e acesso ao painel administrativo.",
  },
  {
    title: "Cardápio organizado",
    description: "Categorias e produtos são configurados com disponibilidade e controle de estoque quando necessário.",
  },
  {
    title: "Acesso por link ou QR Code",
    description: "O cliente abre o cardápio público da loja de forma rápida no celular, sem fricção.",
  },
  {
    title: "Operação no balcão",
    description: "Os pedidos entram no fluxo do dashboard para aceite, preparo e retirada.",
  },
] as const;

const merchantBenefits = [
  {
    title: "Atendimento mais organizado",
    description: "Pedidos e operação em um fluxo único para reduzir ruído no balcão.",
  },
  {
    title: "Cardápio digital sempre acessível",
    description: "Compartilhamento por link e QR Code com atualização centralizada pelo painel.",
  },
  {
    title: "Gestão prática de itens",
    description: "Controle de categorias, produtos, visibilidade de venda e estoque no mesmo ambiente.",
  },
  {
    title: "Rotina operacional mais clara",
    description: "Acompanhamento de status dos pedidos com foco em agilidade de retirada.",
  },
] as const;

const customerBenefits = [
  {
    title: "Acesso rápido ao cardápio",
    description: "Entrada simples por URL pública da loja, ideal para uso em ponto de venda.",
  },
  {
    title: "Navegação objetiva",
    description: "Busca por itens e visualização clara de produtos disponíveis.",
  },
  {
    title: "Carrinho direto",
    description: "Adição de produtos e continuidade do pedido com menos etapas.",
  },
  {
    title: "Acompanhamento do pedido",
    description: "Consulta pública de status para o cliente acompanhar o andamento da retirada.",
  },
] as const;

const productSurfaces = [
  {
    title: "Dashboard administrativo",
    description: "Pedidos, produtos, categorias e configurações em uma visão operacional única.",
  },
  {
    title: "Cardápio público por slug",
    description: "Página própria da loja para atendimento por link direto ou QR Code.",
  },
  {
    title: "Checkout em modo demo",
    description: "Fluxo funcional de compra para apresentação e evolução até integração de pagamento real.",
  },
] as const;

const teamMembers = [
  "Kauan Henrique Silva Paulino",
  "Gustavo Yukio Jochi",
  "Thiago Ribeiro Modesto",
] as const;

const landingSections = [
  { id: "inicio", label: "Início" },
  { id: "como-funciona", label: "Como funciona" },
  { id: "beneficios", label: "Benefícios" },
  { id: "sobre", label: "Sobre" },
  { id: "contato", label: "Contato" },
] as const;

const navActionClass =
  "rounded-xl px-3 py-2 text-sm font-medium text-zinc-300 transition duration-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/30";

export default function HomePage() {
  return (
    <main
      className={`${bodyFont.className} relative overflow-x-clip bg-[radial-gradient(118%_82%_at_14%_-10%,_rgba(251,191,36,0.26)_0%,_rgba(255,246,224,0.78)_33%,_rgba(246,249,253,0.95)_63%,_rgba(238,244,251,1)_100%)] text-zinc-900`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-zinc-50/22 to-zinc-100/32" />
        <div className="absolute -left-24 -top-20 h-[22rem] w-[22rem] rounded-full bg-amber-300/30 blur-3xl" />
        <div className="absolute -right-16 top-8 h-[20rem] w-[20rem] rounded-full bg-cyan-200/28 blur-3xl" />
        <div className="absolute left-1/2 top-[34%] h-44 w-44 -translate-x-1/2 rounded-full bg-white/55 blur-3xl" />
        <div className="absolute bottom-[22%] left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-indigo-100/32 blur-3xl" />
        <div className="absolute -right-24 bottom-[12%] h-64 w-64 rounded-full bg-sky-100/28 blur-3xl" />
      </div>

      <LandingStickyNav sections={landingSections} />

      <section
        id="inicio"
        className="mx-auto max-w-7xl scroll-mt-44 px-4 pb-8 pt-28 sm:px-6 sm:pb-10 sm:pt-32 md:scroll-mt-32 md:pt-28 lg:pb-14"
      >
        <div className="grid items-stretch gap-4 lg:grid-cols-[1.06fr_0.94fr] lg:gap-6">
          <Reveal className="h-full">
            <article className="cx-lift relative h-full rounded-3xl border border-zinc-200/85 bg-white/95 p-5 shadow-[0_30px_70px_-50px_rgba(24,24,27,0.6)] sm:p-7">
              <div className="absolute right-4 top-4 hidden rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-medium text-zinc-500 md:block">
                Plataforma para retirada no balcão
              </div>

              <p className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900 md:hidden">
                Plataforma para retirada no balcão
              </p>

              <h1
                className={`${displayFont.className} mt-3 max-w-2xl text-[1.95rem] font-semibold leading-[1.08] text-zinc-950 sm:text-[2.9rem] lg:text-[3.35rem]`}
              >
                Atendimento mais ágil para a loja, experiência mais fluida para o cliente.
              </h1>

              <p className="mt-4 max-w-2xl text-sm text-zinc-700 sm:text-base lg:text-lg">
                O CardExpress conecta cardápio público, carrinho e operação de pedidos em um fluxo claro, pensado para
                pequenos estabelecimentos de alimentação e venda rápida.
              </p>

              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <Link
                  href="/cadastro"
                  className="cx-btn-primary min-h-11 px-5 py-3 text-sm font-semibold sm:min-h-12 sm:px-6 sm:text-base"
                >
                  Criar conta e começar
                </Link>
                <Link
                  href="/login"
                  className="cx-btn-secondary min-h-11 px-5 py-3 text-sm font-semibold sm:min-h-12 sm:px-6 sm:text-base"
                >
                  Acessar painel
                </Link>
                <a
                  href="#como-funciona"
                  className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold text-zinc-700 underline-offset-4 transition hover:text-zinc-900 hover:underline sm:min-h-12"
                >
                  Ver funcionamento
                </a>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <article className="rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Cardápio</p>
                  <p className="mt-1 text-xs font-semibold text-zinc-900">Link e QR Code</p>
                </article>
                <article className="rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Operação</p>
                  <p className="mt-1 text-xs font-semibold text-zinc-900">Fluxo de pedidos</p>
                </article>
                <article className="rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Praticidade</p>
                  <p className="mt-1 text-xs font-semibold text-zinc-900">Retirada no balcão</p>
                </article>
              </div>
            </article>
          </Reveal>

          <Reveal delayMs={100} className="h-full">
            <aside className="relative h-full rounded-3xl border border-zinc-200 bg-gradient-to-br from-zinc-950 to-zinc-800 p-4 text-white shadow-[0_32px_84px_-46px_rgba(24,24,27,0.85)] sm:p-5">
              <div className="absolute inset-x-4 top-4 hidden items-center justify-between text-[11px] text-zinc-300 sm:flex">
                <span className="font-semibold tracking-wide text-zinc-200">Visão de produto</span>
                <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5">Fluxo funcional</span>
              </div>

              <div className="mt-1 rounded-2xl border border-white/10 bg-zinc-950/65 p-3 sm:mt-6 sm:p-4">
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <span className="font-semibold text-zinc-100">Dashboard operacional</span>
                  <span>Hoje</span>
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-1.5 sm:mt-3 sm:gap-2">
                  <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/20 px-2 py-2 text-center">
                    <p className="text-[10px] uppercase text-emerald-200">Aguardando</p>
                    <p className="mt-1 text-base font-semibold text-emerald-100 sm:text-lg">6</p>
                  </div>
                  <div className="rounded-lg border border-sky-400/25 bg-sky-500/20 px-2 py-2 text-center">
                    <p className="text-[10px] uppercase text-sky-200">Preparo</p>
                    <p className="mt-1 text-base font-semibold text-sky-100 sm:text-lg">4</p>
                  </div>
                  <div className="rounded-lg border border-amber-400/25 bg-amber-500/20 px-2 py-2 text-center">
                    <p className="text-[10px] uppercase text-amber-200">Retirada</p>
                    <p className="mt-1 text-base font-semibold text-amber-100 sm:text-lg">3</p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">
                  Prontidão operacional e status público alinhados à disponibilidade real da loja.
                </div>
              </div>

              <div className="relative mt-3 ml-auto w-[80%] max-w-[232px] rounded-2xl border border-zinc-200/30 bg-white p-2.5 text-zinc-900 shadow-2xl sm:mt-4 sm:max-w-[270px] sm:p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Cardápio público</p>
                <p className="mt-1 text-sm font-semibold">Hambúrguer Artesanal</p>
                <p className="text-xs text-zinc-600">Retirada no balcão</p>
                <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 text-xs text-zinc-700">
                  Busca por item e carrinho simples para finalizar o pedido.
                </div>
              </div>

              <p className="mt-4 text-xs text-zinc-300 sm:mt-5">
                Checkout em modo demo nesta fase para validar experiência e operação com transparência.
              </p>
            </aside>
          </Reveal>
        </div>
      </section>

      <section
        id="como-funciona"
        className="relative scroll-mt-44 overflow-hidden bg-gradient-to-b from-white/74 via-white/94 to-zinc-50/74 py-10 sm:scroll-mt-32 sm:py-12"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/70 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Como funciona</p>
                <h2 className={`${displayFont.className} mt-2 text-2xl font-semibold text-zinc-900 sm:text-4xl`}>
                  Fluxo operacional pensado para pequenos estabelecimentos
                </h2>
              </div>
            </div>
          </Reveal>

          <div className="-mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:snap-none md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-4">
            {howItWorksSteps.map((step, index) => (
              <Reveal key={step.title} delayMs={index * 70} className="min-w-[83%] snap-start md:min-w-0">
                <article className="cx-lift h-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-zinc-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-zinc-600">{step.description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section
        id="beneficios"
        className="relative scroll-mt-44 overflow-hidden bg-gradient-to-b from-zinc-50/62 via-white to-white/92 py-10 sm:scroll-mt-32 sm:py-12"
      >
        <div className="pointer-events-none absolute -left-20 top-6 h-40 w-40 rounded-full bg-amber-100/34 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <LandingBenefitsSection
              merchantBenefits={merchantBenefits}
              customerBenefits={customerBenefits}
              merchantTitle="Mais clareza no atendimento e na operação"
              customerTitle="Experiência rápida do cardápio à retirada"
            />
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-b from-white via-zinc-50/68 to-white py-10 sm:py-12">
        <div className="pointer-events-none absolute right-0 top-0 h-20 w-[34%] bg-gradient-to-l from-white/58 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Base funcional</p>
              <h2 className={`${displayFont.className} mt-1 text-2xl font-semibold text-zinc-900 sm:text-3xl`}>
                Núcleo operacional já validado no produto
              </h2>
            </div>
          </Reveal>

          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {productSurfaces.map((surface, index) => (
              <Reveal key={surface.title} delayMs={index * 80} className="min-w-[80%] snap-start sm:min-w-0">
                <article className="cx-lift h-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Base funcional</p>
                  <h3 className="mt-2 text-lg font-semibold text-zinc-900">{surface.title}</h3>
                  <p className="mt-2 text-sm text-zinc-600">{surface.description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section
        id="sobre"
        className="relative scroll-mt-44 overflow-hidden bg-gradient-to-b from-zinc-50/62 via-white/95 to-white py-10 sm:scroll-mt-32 sm:py-12"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <article className="cx-lift rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Sobre o CardExpress</p>
                  <h2 className={`${displayFont.className} mt-2 text-3xl font-semibold text-zinc-900 sm:text-4xl`}>
                    Solução em evolução com base funcional sólida
                  </h2>
                  <p className="mt-4 max-w-4xl text-zinc-700">
                    O CardExpress é um sistema para pequenos estabelecimentos que precisam organizar atendimento com
                    cardápio digital e retirada no balcão. A plataforma já reúne dashboard operacional, rota pública da
                    loja e fluxo de pedidos de ponta a ponta.
                  </p>
                  <p className="mt-3 max-w-4xl text-sm text-zinc-600">
                    O checkout permanece em modo demo nesta etapa, permitindo validar experiência e operação com
                    transparência enquanto a solução evolui para cenários de uso cada vez mais completos.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <article className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
                    Cardápio público por slug
                  </article>
                  <article className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
                    Operação de pedidos no dashboard
                  </article>
                  <article className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
                    Fluxo de checkout em modo demo
                  </article>
                </div>
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      <section
        id="contato"
        className="relative scroll-mt-44 overflow-hidden bg-gradient-to-b from-white via-zinc-50/55 to-zinc-100/62 pb-10 pt-2 sm:scroll-mt-32 sm:pb-12 sm:pt-3"
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-zinc-300/34" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Reveal>
              <article className="cx-lift rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Equipe e contato</p>
                <h2 className={`${displayFont.className} mt-2 text-3xl font-semibold text-zinc-900 sm:text-4xl`}>
                  Time responsável pelo CardExpress
                </h2>
                <p className="mt-3 text-sm text-zinc-600">
                  Para apresentações, demonstrações e conversas sobre evolução do sistema, entre em contato com a equipe.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {teamMembers.map((member) => (
                    <article
                      key={member}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 transition duration-300 hover:border-zinc-300 hover:bg-white sm:p-4"
                    >
                      <p className="text-sm font-semibold text-zinc-900">{member}</p>
                      <p className="mt-1 text-xs text-zinc-600">Equipe CardExpress</p>
                    </article>
                  ))}
                </div>
              </article>
            </Reveal>

            <Reveal delayMs={120}>
              <aside className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-zinc-950 to-zinc-800 p-5 text-white shadow-sm sm:p-7">
                <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-amber-300/20 blur-2xl" />

                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Contato institucional</p>
                <p className={`${displayFont.className} mt-2 text-2xl font-semibold text-zinc-100 break-all`}>
                  projetocardexpress@gmail.com
                </p>
                <p className="mt-4 text-sm text-zinc-300">
                  Canal oficial para alinhamento de apresentações, validação da solução e próximas etapas de evolução do
                  CardExpress.
                </p>
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=projetocardexpress@gmail.com&su=Contato%20sobre%20o%20CardExpress&body=Ol%C3%A1%2C%0A%0AGostaria%20de%20saber%20mais%20sobre%20o%20CardExpress.%0A%0ANome%3A%0AEstabelecimento%3A%0AMensagem%3A%0A"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Abrir composição de e-mail no Gmail para projetocardexpress@gmail.com"
                  title="Abrir composição de e-mail no Gmail"
                  className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  Enviar e-mail
                </a>
              </aside>
            </Reveal>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-zinc-200/70 bg-gradient-to-b from-zinc-950 to-zinc-900 text-zinc-200">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-12">
          <div className="max-w-md">
            <p className={`${displayFont.className} text-xl font-semibold text-white`}>CardExpress</p>
            <p className="mt-2 text-sm text-zinc-400">
              Sistema para pequenos estabelecimentos com cardápio digital e operação de retirada no balcão.
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              Solução em evolução para tornar o atendimento mais claro, rápido e confiável.
            </p>
          </div>

          <nav className="grid gap-2 text-sm sm:grid-cols-2 lg:min-w-[320px]">
            <a href="#como-funciona" className={navActionClass}>
              Como funciona
            </a>
            <a href="#sobre" className={navActionClass}>
              Sobre
            </a>
            <a href="#contato" className={navActionClass}>
              Equipe e contato
            </a>
            <Link href="/login" className={navActionClass}>
              Login
            </Link>
            <Link href="/cadastro" className={navActionClass}>
              Cadastro
            </Link>
          </nav>
        </div>

        <div className="border-t border-white/10 bg-zinc-950/80">
          <div className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-zinc-400 sm:px-6">
            <p>© 2026 CardExpress. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
