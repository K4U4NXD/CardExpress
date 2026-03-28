import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";

/** Dados do estabelecimento (1 conta = 1 estabelecimento nesta fase). */
export default function DashboardSettingsPage() {
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Nome, slug público, horário e preferências."
      />
      <PageBody>Formulários de configuração — pendente.</PageBody>
    </>
  );
}
