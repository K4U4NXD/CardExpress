"use client";

import { useEffect, useRef } from "react";

type SelectionCheckboxProps = {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
  indeterminate?: boolean;
  testId?: string;
  className?: string;
};

export function SelectionCheckbox({
  checked,
  onChange,
  label,
  disabled = false,
  indeterminate = false,
  testId,
  className = "",
}: SelectionCheckboxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label
      className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber-300 has-[:focus-visible]:ring-offset-2 ${
        disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"
      } ${className}`}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label={label}
        aria-checked={indeterminate ? "mixed" : checked}
        data-testid={testId}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none rounded-xl border-0 bg-transparent disabled:cursor-not-allowed"
      />
      <span
        aria-hidden
        className={`pointer-events-none flex h-6 w-6 items-center justify-center rounded-lg border transition ${
          checked || indeterminate
            ? "border-amber-400 bg-amber-100 text-amber-800"
            : "border-zinc-300 bg-white text-transparent"
        }`}
      >
        {indeterminate ? (
          <span className="h-0.5 w-3 rounded-full bg-current" />
        ) : (
          <svg viewBox="0 0 16 16" fill="none" className={`h-3.5 w-3.5 ${checked ? "opacity-100" : "opacity-0"}`}>
            <path
              d="M3.5 8.2 6.4 11 12.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </label>
  );
}
