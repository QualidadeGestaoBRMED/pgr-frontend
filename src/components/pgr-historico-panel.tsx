import { Download, PencilLine } from "lucide-react";

type PgrHistoricoPanelProps = {
  title: string;
  subtitle: string;
  changes: Array<{
    id: string;
    company: string;
    analysis: string;
    change: string;
    reason: string;
    date: string;
  }>;
};

export function PgrHistoricoPanel({
  title,
  subtitle,
  changes,
}: PgrHistoricoPanelProps) {
  return (
    <>
      <section className="rounded-[14px] bg-white px-6 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-[#1f3f52] sm:text-[24px]">
              {title}
            </h1>
            <p className="mt-1 text-[14px] text-[#8c8c8c]">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#007891] px-4 py-2 text-[14px] font-medium text-white transition hover:brightness-110"
            >
              <PencilLine className="h-4 w-4" />
              Editar último documento
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#007891] px-4 py-2 text-[14px] font-medium text-white transition hover:brightness-110"
            >
              <Download className="h-4 w-4" />
              Baixar PDF
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[14px] bg-white px-6 py-6">
        <h2 className="text-[16px] font-semibold text-[#1f3f52]">
          Registro de Alterações
        </h2>
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[2fr_1.6fr_1.4fr_1.2fr_0.8fr] gap-4 border-b border-[#e6e6e6] pb-3 text-[13px] font-medium text-[#9a9a9a]">
              <span>Empresa</span>
              <span>Análise</span>
              <span>Alteração</span>
              <span>Motivo</span>
              <span>Data</span>
            </div>
            <div className="divide-y divide-[#e6e6e6]">
              {changes.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[2fr_1.6fr_1.4fr_1.2fr_0.8fr] gap-4 py-4 text-[13px] text-[#1f3f52]"
                >
                  <span>{row.company}</span>
                  <span>{row.analysis}</span>
                  <span>{row.change}</span>
                  <span>{row.reason}</span>
                  <span>{row.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
