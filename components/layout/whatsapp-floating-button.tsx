const WHATSAPP_HREF =
  "https://wa.me/5515997411251?text=Ol%C3%A1%21%20Quero%20conhecer%20melhor%20o%20CardExpress";

export function WhatsappFloatingButton() {
  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Falar no WhatsApp sobre o CardExpress"
      title="Falar no WhatsApp sobre o CardExpress"
      className="group fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-3 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_18px_34px_-18px_rgba(21,128,61,0.85)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#1fbd5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 sm:bottom-5 sm:right-5 sm:h-14 sm:w-14"
    >
      <span className="pointer-events-none absolute right-[calc(100%+0.65rem)] hidden whitespace-nowrap rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 opacity-0 shadow-sm transition duration-300 group-hover:translate-x-0 group-hover:opacity-100 sm:block">
        Falar no WhatsApp
      </span>
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 sm:h-7 sm:w-7" aria-hidden>
        <path d="M5.2 18.8 6 15.9a7.1 7.1 0 1 1 2.3 2.2l-3.1.7Z" fill="currentColor" opacity="0.22" />
        <path d="M5.2 18.8 6 15.9a7.1 7.1 0 1 1 2.3 2.2l-3.1.7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.2 8.7c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.3.1.5-.1.7l-.4.5c.5.9 1.2 1.6 2.2 2.1l.5-.4c.2-.2.4-.2.7-.1l1.5.7c.3.1.4.3.4.6v.5c0 .3-.1.6-.4.7-.6.4-1.4.5-2.2.3-2.1-.5-4.9-3.1-5.5-5.4-.2-.8-.1-1.4.3-1.9Z" fill="currentColor" />
      </svg>
    </a>
  );
}
