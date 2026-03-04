import { redirect } from "next/navigation";

export default function PgrRootPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/pgr/${params.id}/inicio`);
}
