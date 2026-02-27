export type FakePgrPdfInput = {
  pgrId: string;
  generatedAt: string;
  documentTitle: string;
  pipefyCardId: string;
  companyName: string;
  unitName: string;
  cnpj: string;
  responsible: string;
  email: string;
  notes: string;
  completedSteps: number;
  totalSteps: number;
  gheCount: number;
  riskCount: number;
  anexoCount: number;
  diretriz: string;
  nr: string;
  vigencia: string;
};

const ASCII_REPLACEMENTS: Array<[RegExp, string]> = [
  [/[\u0300-\u036f]/g, ""],
  [/[\u2013\u2014]/g, "-"],
  [/[\u2018\u2019]/g, "'"],
  [/[\u201c\u201d]/g, '"'],
];

const encoder = new TextEncoder();

const toAscii = (value: string) => {
  let normalized = value.normalize("NFD");
  ASCII_REPLACEMENTS.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });
  return normalized.replace(/[^\x20-\x7e]/g, "");
};

const escapePdfText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const chunkLine = (value: string, max = 92) => {
  if (value.length <= max) return [value];
  const words = value.split(" ");
  const chunks: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= max) {
      current = next;
      return;
    }
    if (current) chunks.push(current);
    current = word;
  });

  if (current) chunks.push(current);
  return chunks;
};

export function buildFakePgrPreviewLines(input: FakePgrPdfInput) {
  const completionPercent = Math.round(
    (Math.max(0, Math.min(input.completedSteps, input.totalSteps)) /
      Math.max(1, input.totalSteps)) *
      100
  );

  const lines = [
    "DOCUMENTO PGR - PREVIA DE GERACAO",
    "",
    `PGR ID: ${input.pgrId}`,
    `Gerado em: ${input.generatedAt}`,
    "",
    "1. DADOS INICIAIS (SIMULADOS DE PIPEFY)",
    `Titulo: ${input.documentTitle || "-"}`,
    `Card Pipefy: ${input.pipefyCardId || "-"}`,
    `Empresa: ${input.companyName || "-"}`,
    `Unidade: ${input.unitName || "-"}`,
    `CNPJ: ${input.cnpj || "-"}`,
    `Responsavel: ${input.responsible || "-"}`,
    `Email: ${input.email || "-"}`,
    "",
    "2. RESUMO DO FLUXO",
    `Etapas concluidas: ${input.completedSteps}/${input.totalSteps} (${completionPercent}%)`,
    `GHEs cadastrados: ${input.gheCount}`,
    `Riscos cadastrados: ${input.riskCount}`,
    `Total de anexos: ${input.anexoCount}`,
    `Diretriz de PDF: ${input.diretriz || "-"}`,
    `NR principal: ${input.nr || "-"}`,
    `Vigencia: ${input.vigencia || "-"}`,
    "",
    "3. OBSERVACOES",
    input.notes || "Sem observacoes adicionais.",
    "",
    "Documento fake para validacao de fluxo front-end.",
  ];

  const flattened = lines.flatMap((line) => chunkLine(toAscii(line)));
  return flattened.slice(0, 46);
}

export function buildFakePgrPdfBlob(input: FakePgrPdfInput) {
  const lines = buildFakePgrPreviewLines(input).map(escapePdfText);
  const textOps = lines.map((line, index) =>
    index === 0 ? `(${line}) Tj` : `T* (${line}) Tj`
  );
  const contentStream = [
    "BT",
    "/F1 11 Tf",
    "14 TL",
    "50 790 Td",
    ...textOps,
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${encoder.encode(contentStream).length} >>\nstream\n${contentStream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    const objNumber = index + 1;
    offsets[objNumber] = encoder.encode(pdf).length;
    pdf += `${objNumber} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}
