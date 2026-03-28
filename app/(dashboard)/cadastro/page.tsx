import { SignupForm } from "@/components/auth/signup-form";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";

export default function CadastroPage() {
  return (
    <>
      <PageHeader
        title="Cadastro"
        description="Crie sua conta e sua loja no CardExpress."
        backHref="/"
        backLabel="Ir à página inicial"
      />
      <div className="mx-auto max-w-md px-6 py-8">
        <SignupForm />
        <p className="mt-6 text-center text-sm text-zinc-600">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-2">
            Entrar
          </Link>
        </p>
      </div>
    </>
  );
}
