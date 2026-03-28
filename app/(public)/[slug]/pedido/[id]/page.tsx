import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";

type OrderStatusPageProps = {
  params: Promise<{ slug: string; id: string }>;
};

/**
 * Status do pedido para o cliente (futuro: timeline / notificações).
 */
export default async function OrderStatusPage({ params }: OrderStatusPageProps) {
  const { slug, id } = await params;

  return (
    <>
      <PageHeader
        title={`Pedido ${id}`}
        description={`Estabelecimento: ${slug}`}
        backHref={`/${slug}`}
        backLabel="Voltar ao cardápio"
      />
      <PageBody>Detalhes e estado do pedido serão carregados do Supabase.</PageBody>
    </>
  );
}
