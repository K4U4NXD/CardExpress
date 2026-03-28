import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";

type PublicMenuPageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Cardápio público do estabelecimento (slug na URL).
 * Aqui entrará listagem de categorias/produtos vindos do Supabase.
 */
export default async function PublicMenuPage({ params }: PublicMenuPageProps) {
  const { slug } = await params;

  return (
    <>
      <PageHeader
        title={`Cardápio — ${slug}`}
        description="Lista de produtos e categorias (conteúdo virá do banco)."
        backHref="/"
        backLabel="Início"
      />
      <PageBody>Área do cardápio vazia nesta etapa.</PageBody>
    </>
  );
}
