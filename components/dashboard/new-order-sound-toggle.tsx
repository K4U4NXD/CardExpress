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
    <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700">
      <span>Som de novos pedidos</span>
      <select
        value={level}
        onChange={(event) => {
          const nextLevel = event.target.value as NewOrderSoundLevel;
          setLevel(nextLevel);
          writeNewOrderSoundLevel(nextLevel);
        }}
        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700"
        aria-label="Nivel de alerta sonoro"
      >
        <option value="off">Desativado</option>
        <option value="default">Padrao</option>
        <option value="high">Alto</option>
      </select>
    </label>
  );
}
