"use client";

import { forwardRef, useState, type ComponentPropsWithoutRef } from "react";

type PasswordInputProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  containerClassName?: string;
  toggleTestId?: string;
};

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.62 7.5 7.61 4.5 12 4.5s8.38 3 9.94 7.15a1 1 0 0 1 0 .7C20.38 16.5 16.39 19.5 12 19.5s-8.38-3-9.94-7.15Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m2 2 20 20" />
      <path d="M6.71 6.71C4.6 8.05 2.98 10.08 2.06 12.35a1 1 0 0 0 0 .7C3.62 17.5 7.61 20.5 12 20.5c1.93 0 3.73-.58 5.24-1.56" />
      <path d="M9.88 9.88A3 3 0 0 0 14.12 14.12" />
      <path d="M12 4.5c4.39 0 8.38 3 9.94 7.15a1 1 0 0 1 0 .7 10.58 10.58 0 0 1-2.2 3.38" />
    </svg>
  );
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { className, containerClassName, disabled, id, style, toggleTestId, ...props },
  ref,
) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={`relative ${containerClassName ?? ""}`}>
      <input
        {...props}
        ref={ref}
        id={id}
        disabled={disabled}
        type={isVisible ? "text" : "password"}
        className={`${className ?? ""} pr-10`}
        style={{ ...style, paddingRight: "2.75rem" }}
      />
      <button
        type="button"
        aria-controls={id}
        aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={isVisible}
        data-testid={toggleTestId}
        disabled={disabled}
        onClick={() => setIsVisible((current) => !current)}
        className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {isVisible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
});
