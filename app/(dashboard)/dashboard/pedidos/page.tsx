import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";

/** Fila de pedidos para retirada no balcão. */
export default function DashboardOrdersPage() {
  return (
    <>
      <PageHeader title="Pedidos" description="Novos pedidos e status." />
      <PageBody>Listagem de pedidos — pendente.</PageBody>
    </>
  );
}
