type StatusBadgeTone = "success" | "warning" | "danger" | "neutral" | "dark";

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: StatusBadgeTone;
  className?: string;
};

const toneClassName: Record<StatusBadgeTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 before:bg-emerald-500",
  warning: "border-amber-200 bg-amber-50 text-amber-900 before:bg-amber-500",
  danger: "border-rose-200 bg-rose-50 text-rose-800 before:bg-rose-600",
  neutral: "border-zinc-200 bg-zinc-100 text-zinc-700 before:bg-zinc-400",
  dark: "border-amber-300/25 bg-white/10 text-amber-100 before:bg-amber-300",
};

export function StatusBadge({ children, tone = "neutral", className }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5 before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full ${toneClassName[tone]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
