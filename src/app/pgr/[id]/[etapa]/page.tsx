import PgrEtapaPageContent from "./page-content";

export default function PgrEtapaPage({
  params,
}: {
  params: { id: string; etapa: string };
}) {
  return <PgrEtapaPageContent key={params.id} params={params} />;
}

