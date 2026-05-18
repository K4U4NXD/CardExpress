import Image from "next/image";

export type DemoProductKind = "burger" | "pastel" | "juice" | "coffee" | "combo";

type DemoProductVisualProps = {
  kind: DemoProductKind;
  size?: "sm" | "md" | "lg";
};

export function DemoProductVisual({ kind, size = "md" }: DemoProductVisualProps) {
  const sizeClass = size === "sm" ? "h-12 w-12" : size === "lg" ? "h-16 w-16" : "h-14 w-14";
  const imageSize = size === "sm" ? "48px" : size === "lg" ? "64px" : "56px";
  const product = productVisuals[kind];

  return (
    <div
      className={`relative ${sizeClass} shrink-0 overflow-hidden rounded-xl border border-white/70 bg-white shadow-[inset_0_1px_10px_rgba(255,255,255,0.18),0_10px_22px_-16px_rgba(24,24,27,0.7)]`}
    >
      <Image
        src={product.src}
        alt={product.alt}
        fill
        sizes={imageSize}
        quality={95}
        unoptimized
        className="object-cover"
        style={{ objectPosition: product.position }}
      />
    </div>
  );
}

const productVisuals: Record<DemoProductKind, { src: string; alt: string; position: string }> = {
  burger: {
    src: "/demo/burguer-artesanal.png",
    alt: "Burger artesanal com queijo derretido",
    position: "50% 48%",
  },
  pastel: {
    src: "/demo/pastel-especial.png",
    alt: "Pastel especial com recheio generoso",
    position: "50% 50%",
  },
  juice: {
    src: "/demo/suco-natural.png",
    alt: "Suco natural servido em copo",
    position: "47% 50%",
  },
  coffee: {
    src: "/demo/cafe-gelado.png",
    alt: "Cafe gelado cremoso",
    position: "50% 50%",
  },
  combo: {
    src: "/demo/burguer-artesanal.png",
    alt: "Combo da casa com burger artesanal",
    position: "50% 48%",
  },
};
