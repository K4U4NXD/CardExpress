"use client";

import {
  type NewOrderSoundLevel,
  readNewOrderSoundLevel,
  writeNewOrderSoundLevel,
} from "@/lib/orders/new-order-notifications";
import { useEffect, useState } from "react";

export function NewOrderSoundToggle() {
  const [level, setLevel] = useState<NewOrderSoundLevel>("default");

  useEffect(() => {
    setLevel(readNewOrderSoundLevel());
  }, []);

  return (
    <label className="inline-flex items-center gap-1.5 rounded-lg border border-[#eadfd2] bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs">
      <span className="hidden sm:inline">Som de novos pedidos</span>
      <span className="sm:hidden">Som</span>
      <select
        value={level}
        onChange={(event) => {
          const nextLevel = event.target.value as NewOrderSoundLevel;
          setLevel(nextLevel);
          writeNewOrderSoundLevel(nextLevel);
        }}
        className="rounded-md border border-[#eadfd2] bg-white px-1.5 py-1 text-[11px] font-semibold text-zinc-700 sm:px-2 sm:text-xs"
        aria-label="Nivel de alerta sonoro"
      >
        <option value="off">Desativado</option>
        <option value="default">Padrao</option>
        <option value="high">Alto</option>
      </select>
    </label>
  );
}
