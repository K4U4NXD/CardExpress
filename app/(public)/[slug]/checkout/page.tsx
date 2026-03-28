import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";

type CheckoutPageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Checkout (futuro: carrinho, totais e integração Mercado Pago).
 */
export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { slug } = await params;

  return (
    <>
      <PageHeader
        title="Checkout"
        description={`Estabelecimento: ${slug}`}
        backHref={`/${slug}`}
        backLabel="Voltar ao cardápio"
      />
      <PageBody>Fluxo de pagamento e confirmação ainda não implementados.</PageBody>
    </>
  );
}
