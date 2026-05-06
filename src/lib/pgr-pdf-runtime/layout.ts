type WidthValue = number | string;

export type PdfLayoutTableConfig = {
  id: string;
  label: string;
  defaultWeights: number[];
  columnLabels?: string[];
};

export type PdfLayoutState = {
  selectedTableId: string;
  tableWeights: Record<string, number[]>;
};

export const PDF_LAYOUT_TABLES: PdfLayoutTableConfig[] = [
  {
    id: "header_main",
    label: "Cabecalho principal",
    defaultWeights: [67, 33],
    columnLabels: ["Empresa/Estabelecimento", "ANL"],
  },
  {
    id: "update_table",
    label: "Quadro de atualizacoes",
    defaultWeights: [80, 190, 100],
    columnLabels: ["Alteracao", "Motivo", "Data"],
  },
  {
    id: "identificacao_info",
    label: "Tabelas de identificacao (secoes 1-4)",
    defaultWeights: [43, 57],
    columnLabels: ["Campo", "Valor"],
  },
  {
    id: "index_anexos",
    label: "Indice de anexos (secao 19)",
    defaultWeights: [65, 165, 110],
    columnLabels: ["Anexo", "Titulo", "Data"],
  },
  {
    id: "annex_ambiente",
    label: "Anexo A - Ambiente",
    defaultWeights: [130, 190],
    columnLabels: ["Campo", "Conteudo"],
  },
  {
    id: "annex_atividade",
    label: "Anexo A - Atividade",
    defaultWeights: [70, 90, 190, 95],
    columnLabels: ["Setor", "Funcao", "Descricao", "Trabalhadores"],
  },
  {
    id: "annex_reconhecimento",
    label: "Anexo A - Reconhecimento",
    defaultWeights: [6, 10, 8, 12, 10, 8, 8, 7, 7, 6, 6, 7, 5],
  },
  {
    id: "annex_medidas",
    label: "Anexo B - Medidas",
    defaultWeights: [72, 85, 190, 85, 85],
    columnLabels: ["GHE", "Risco", "Medidas", "EPC", "EPI"],
  },
  {
    id: "annex_plano",
    label: "Anexo C - Plano de acao",
    defaultWeights: [65, 95, 54, 190, 90, 70],
    columnLabels: ["GHE", "Risco", "Prioridade", "Acao", "Responsavel", "Status"],
  },
  {
    id: "annex_d_status",
    label: "Anexo C - Status",
    defaultWeights: [85, 190, 90],
    columnLabels: ["Anexo", "Descricao", "Status"],
  },
  {
    id: "annex_extra",
    label: "Anexos inseridos",
    defaultWeights: [180, 190],
    columnLabels: ["Titulo", "Arquivos"],
  },
];

const TABLE_IDS = new Set(PDF_LAYOUT_TABLES.map((table) => table.id));

const toPositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

export const DEFAULT_PDF_LAYOUT_STATE: PdfLayoutState = {
  selectedTableId: PDF_LAYOUT_TABLES[0]?.id || "header_main",
  tableWeights: PDF_LAYOUT_TABLES.reduce<Record<string, number[]>>((acc, table) => {
    acc[table.id] = [...table.defaultWeights];
    return acc;
  }, {}),
};

export const normalizePdfLayoutState = (input: unknown): PdfLayoutState => {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const rawWeights =
    raw.tableWeights && typeof raw.tableWeights === "object"
      ? (raw.tableWeights as Record<string, unknown>)
      : {};

  const normalizedWeights = PDF_LAYOUT_TABLES.reduce<Record<string, number[]>>(
    (acc, table) => {
      const candidate = rawWeights[table.id];
      if (Array.isArray(candidate) && candidate.length === table.defaultWeights.length) {
        acc[table.id] = candidate.map((item, index) =>
          toPositiveNumber(item, table.defaultWeights[index])
        );
      } else {
        acc[table.id] = [...table.defaultWeights];
      }
      return acc;
    },
    {}
  );

  const selectedTableId = String(raw.selectedTableId || "").trim();
  return {
    selectedTableId: TABLE_IDS.has(selectedTableId)
      ? selectedTableId
      : DEFAULT_PDF_LAYOUT_STATE.selectedTableId,
    tableWeights: normalizedWeights,
  };
};

const parseFallbackWeight = (value: WidthValue, fallback = 1) => {
  if (typeof value === "number") {
    return toPositiveNumber(value, fallback);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    if (trimmed.endsWith("%")) {
      return toPositiveNumber(Number.parseFloat(trimmed.replace("%", "")), fallback);
    }
    if (trimmed === "*") return fallback;
    return toPositiveNumber(Number.parseFloat(trimmed), fallback);
  }
  return fallback;
};

export const resolveTableWidths = (
  pdfLayout: PdfLayoutState | null | undefined,
  tableId: string,
  fallbackWidths: WidthValue[],
): WidthValue[] => {
  const normalizedFallback = fallbackWidths.map((item) => parseFallbackWeight(item));
  const totalFallback = normalizedFallback.reduce((sum, item) => sum + item, 0) || 1;
  const fallbackPercents = normalizedFallback.map(
    (item) => `${((item / totalFallback) * 100).toFixed(2)}%`,
  );

  const candidate = pdfLayout?.tableWeights?.[tableId];
  if (!Array.isArray(candidate) || candidate.length !== fallbackWidths.length) {
    return fallbackPercents;
  }

  const safeCandidate = candidate.map((value, index) =>
    toPositiveNumber(value, normalizedFallback[index] || 1),
  );
  const totalCandidate = safeCandidate.reduce((sum, item) => sum + item, 0);
  if (!totalCandidate) return fallbackPercents;

  return safeCandidate.map((item) => `${((item / totalCandidate) * 100).toFixed(2)}%`);
};
