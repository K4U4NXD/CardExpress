import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { PageHeader } from "@/components/layout/page-header";
import { BRANDING } from "@/lib/branding";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Login",
};

type Props = {
  searchParams: Promise<{ next?: string; erro?: string }>;
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function LoginPage({ searchParams }: Props) {
  const { next, erro } = await searchParams;
  const initialError = erro ? safeDecode(erro) : undefined;

  return (
    <>
      <PageHeader
        title="Login"
        description="Acesso ao painel do estabelecimento."
        backHref="/"
        backLabel="Ir à página inicial"
      />
      <div className="mx-auto w-full max-w-md px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 flex justify-center">
          <Image
            src={BRANDING.logoPath}
            alt={BRANDING.productName}
            width={228}
            height={56}
            priority
            className="h-auto w-auto max-w-[228px]"
          />
        </div>

        <LoginForm nextPath={next} initialError={initialError} />
        <p className="mt-6 text-center text-sm text-zinc-600">
          Não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-zinc-900 underline underline-offset-2">
            Cadastre-se
          </Link>
        </p>
      </div>
    </>
  );
}
