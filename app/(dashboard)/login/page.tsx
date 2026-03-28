import { LoginForm } from "@/components/auth/login-form";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;

  return (
    <>
      <PageHeader
        title="Login"
        description="Acesso ao painel do estabelecimento."
        backHref="/"
        backLabel="Ir à página inicial"
      />
      <div className="mx-auto max-w-md px-6 py-8">
        <LoginForm nextPath={next} />
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
