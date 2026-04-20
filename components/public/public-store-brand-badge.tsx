"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { BRANDING } from "@/lib/branding";

type PublicStoreBrandBadgeProps = {
  storeName?: string | null;
  slug?: string | null;
  logoUrl?: string | null;
  theme?: "light" | "dark";
  compact?: boolean;
  showSlug?: boolean;
  className?: string;
};

function getInitials(label: string) {
  const parts = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "CE";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "CE";
}

export function PublicStoreBrandBadge({
  storeName,
  slug,
  logoUrl,
  theme = "light",
  compact = false,
  showSlug = true,
  className,
}: PublicStoreBrandBadgeProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const normalizedLogoUrl = (logoUrl ?? "").trim();

  useEffect(() => {
    setHasImageError(false);
  }, [logoUrl]);

  const displayName = useMemo(() => {
    const normalizedName = (storeName ?? "").trim();
    if (normalizedName) {
      return normalizedName;
    }

    const normalizedSlug = (slug ?? "").trim();
    if (normalizedSlug) {
      return normalizedSlug;
    }

    return BRANDING.productName;
  }, [slug, storeName]);

  const canRenderImage = Boolean(normalizedLogoUrl && !hasImageError);
  const initials = getInitials(displayName);
  const wrapperClassName = theme === "dark" ? "text-zinc-100" : "text-zinc-900";
  const subtitleClassName = theme === "dark" ? "text-zinc-400" : "text-zinc-500";
  const badgeBaseClassName = compact ? "h-11 w-11" : "h-14 w-14";

  return (
    <div className={`flex items-center gap-3 ${wrapperClassName} ${className ?? ""}`}>
      <div className={`relative overflow-hidden rounded-2xl border ${theme === "dark" ? "border-zinc-700 bg-zinc-900" : "border-zinc-200 bg-zinc-100"} ${badgeBaseClassName}`}>
        {canRenderImage ? (
          <Image
            src={normalizedLogoUrl}
            alt={displayName}
            fill
            sizes={compact ? "44px" : "56px"}
            unoptimized
            className="h-full w-full object-cover"
            onError={() => setHasImageError(true)}
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center ${theme === "dark" ? "bg-zinc-800 text-zinc-200" : "bg-zinc-200 text-zinc-700"}`}>
            <span className="text-sm font-bold tracking-wide">{initials}</span>
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className={`${compact ? "text-sm" : "text-base"} truncate font-semibold`}>{displayName}</p>
        {showSlug && slug ? <p className={`${subtitleClassName} text-xs`}>/{slug}</p> : null}
      </div>
    </div>
  );
}
