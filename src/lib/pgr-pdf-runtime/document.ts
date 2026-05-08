import type { RuntimeGhe, RuntimeSnapshot } from "./snapshot";
import type { RuntimeVisualAssets } from "./assets";
import { FIXED_SECTIONS_5_TO_18 } from "./fixed-sections";
import { SECTION_14_TABLES, SECTION_15_TABLES, type FixedRuntimeTable } from "./fixed-risk-tables";
import { resolveTableWidths, type PdfLayoutState } from "./layout";

type Content = any;
type TableCell = any;
type StyleDictionary = Record<string, any>;

const COLORS = {
  text: "#434343",
  textStrong: "#193B4F",
  teal: "#007891",
  tealDark: "#0E6F84",
  grid: "#D6DDE3",
  white: "#FFFFFF",
};

function sanitizeText(value: unknown) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
}

function estimateWrappedLineCount(text: string, maxCharsPerLine: number) {
  const normalized = sanitizeText(text);
  if (!normalized) return 1;

  const words = normalized.split(/\s+/).filter(Boolean);
  let lineCount = 1;
  let currentLength = 0;

  for (const word of words) {
    const wordLength = word.length;
    if (wordLength >= maxCharsPerLine) {
      if (currentLength > 0) {
        lineCount += 1;
      }
      lineCount += Math.ceil(wordLength / maxCharsPerLine) - 1;
      currentLength = wordLength % maxCharsPerLine;
      continue;
    }

    if (currentLength === 0) {
      currentLength = wordLength;
      continue;
    }

    if (currentLength + 1 + wordLength <= maxCharsPerLine) {
      currentLength += 1 + wordLength;
      continue;
    }

    lineCount += 1;
    currentLength = wordLength;
  }

  return Math.max(1, lineCount);
}

function truncateText(value: unknown, maxLength = 260) {
  const text = sanitizeText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function truncateHeaderField(value: unknown, maxLength: number) {
  return truncateText(value, maxLength);
}

function toUpper(value: unknown) {
  return sanitizeText(value).toLocaleUpperCase("pt-BR");
}

const PT_BR_MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function buildSignatureLocationDate(dateText: string) {
  const fallbackDate = new Date();
  const normalized = sanitizeText(dateText);
  const parsed = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const day = parsed ? Number.parseInt(parsed[1], 10) : fallbackDate.getDate();
  const monthIndex = parsed
    ? Number.parseInt(parsed[2], 10) - 1
    : fallbackDate.getMonth();
  const year = parsed ? Number.parseInt(parsed[3], 10) : fallbackDate.getFullYear();
  const safeMonth = PT_BR_MONTHS[Math.max(0, Math.min(11, monthIndex))] || PT_BR_MONTHS[0];
  const safeDay = Number.isFinite(day) ? String(day).padStart(2, "0") : "01";
  const safeYear = Number.isFinite(year) ? String(year) : String(fallbackDate.getFullYear());
  return `Rio de Janeiro, ${safeDay} de ${safeMonth} de ${safeYear}.`;
}

function bodyCell(value: unknown, style = "tableBodyCell"): TableCell {
  return { text: sanitizeText(value), style };
}

function infoLabelCell(value: string): TableCell {
  return { text: value, style: "infoLabelCell" };
}

function tealHeaderCell(value: string): TableCell {
  return { text: value, style: "tealHeaderCell" };
}

function tealVerticalHeaderCell(value: string): TableCell {
  return {
    svg: buildVerticalLabelSvg(value, 30, 120, 10, 500),
    style: "tealHeaderCell",
    alignment: "center",
    valign: "middle",
  };
}

function sectionTitle(value: string, id?: string): Content {
  return { text: value, style: "sectionTitle", margin: [0, 16, 0, 8], id };
}

function resolveRuntimeTableWidths(
  pdfLayout: PdfLayoutState | undefined,
  tableId: string,
  fallback: Array<number | string>,
) {
  return resolveTableWidths(pdfLayout, tableId, fallback);
}

type TocEntry = {
  label: string;
  targetId: string;
  indent?: number;
};

type LayoutContext = {
  measureTextWidth?: (text: string) => number;
  pageSize?: { width: number; height: number };
  pageMargins?: [number, number, number, number];
};

function buildDynamicTocLine(entry: TocEntry, layout?: LayoutContext): Content {
  const measure = layout?.measureTextWidth;
  const pageSize = layout?.pageSize ?? { width: 595.28, height: 841.89 };
  const pageMargins = layout?.pageMargins ?? [40, 96, 40, 36];
  const contentWidth = pageSize.width - pageMargins[0] - pageMargins[2];
  const numberColWidth = 20;
  const columnGap = 0;
  const rawLabel = String(entry.label ?? "");
  const indentText = entry.indent ? " ".repeat(Math.max(1, Math.round(entry.indent / 3))) : "";
  const lines = rawLabel
    .split("\n")
    .map((line) => sanitizeText(line))
    .filter(Boolean);

  const prefixLines = lines.slice(0, -1).map((line) => ({
    text: `${indentText}${line}`,
    style: "tocLine",
    margin: [0, 0, 0, 0],
    linkToDestination: entry.targetId,
  }));

  const lastLine = lines.at(-1) ?? "";
  const finalLine = `${indentText}${lastLine}`;
  const textWidth = Math.max(0, measure ? measure(finalLine) : finalLine.length * 5.2);
  const dotWidth = Math.max(1, measure ? measure(".") : 2.2);
  const dotsWidth = Math.max(0, contentWidth - numberColWidth - textWidth);
  const dotCount = Math.max(0, Math.floor(dotsWidth / dotWidth));
  const dotLeader = ".".repeat(dotCount);

  return {
    stack: [
      ...prefixLines,
      {
        columns: [
          {
            width: textWidth || "auto",
            text: finalLine,
            style: "tocLine",
            noWrap: true,
            linkToDestination: entry.targetId,
          },
          {
            width: dotsWidth || "*",
            text: dotLeader,
            style: "tocDots",
            noWrap: true,
          },
          {
            width: 20,
            text: [{ text: "00", pageReference: entry.targetId }],
            style: "tocLine",
            alignment: "right",
            noWrap: true,
          },
        ],
        columnGap,
      },
    ],
    margin: [0, 0, 0, 3],
  };
}

function normalizeFixedText(value: string) {
  let text = sanitizeText(value);
  const replacements: Array<[string, string]> = [
    ["LEGAL:O", "LEGAL: O"],
    ["TRABALHADORESOs", "TRABALHADORES. Os"],
    ["CIPAO", "CIPA. O"],
    ["DANOÉ", "DANO: É"],
    ["PERIGOFonte", "PERIGO: Fonte"],
    ["PERIGOProcesso", "PERIGO: Processo"],
    ["RISCOCombinação", "RISCO: Combinação"],
    ["RISCOSProcesso", "RISCOS: Processo"],
    ["ACEITÁVELRisco", "ACEITÁVEL: Risco"],
    ["RISCOProcesso", "RISCO: Processo"],
    ["AÇÃOÉ", "AÇÃO: É"],
    ["TETOConcentração", "TETO: Concentração"],
    ["(GHE)Para", "(GHE): Para"],
    ["(EMR)O", "(EMR): O"],
    ["OCUPACIONAISSão", "OCUPACIONAIS: São"],
    ["FÍSICOSSão", "FÍSICOS: São"],
    ["QUÍMICOSSão", "QUÍMICOS: São"],
    ["BIOLÓGICOSSão", "BIOLÓGICOS: São"],
    ["ACIDENTESão", "ACIDENTE: São"],
    ["ERGONÔMICOSSão", "ERGONÔMICOS: São"],
    ["QUALITATIVAPara", "QUALITATIVA: Para"],
    ["QUANTITATIVAA", "QUANTITATIVA: A"],
    ["PERIGOSO", "PERIGOS. O"],
    ["OCUPACIONAISA", "OCUPACIONAIS. A"],
    ["ADOTADOSA", "ADOTADOS. A"],
    ["RISCOSTrata-se", "RISCOS. Trata-se"],
    ["SEVERIDADEA", "SEVERIDADE. A"],
    ["PROBABILIDADEA", "PROBABILIDADE. A"],
    ["CONTROLENeste", "CONTROLE. Neste"],
    ["EXPOSIÇÃO Envolve", "EXPOSIÇÃO. Envolve"],
    ["EFICÁCIA Envolve", "EFICÁCIA. Envolve"],
    ["GERAISRessalte-se", "GERAIS. Ressalte-se"],
  ];
  replacements.forEach(([from, to]) => {
    text = text.replaceAll(from, to);
  });
  return text;
}

function isAlphaListItem(text: string) {
  return /^[a-z]\)\s+/i.test(text);
}

function isBulletLikeLine(text: string) {
  if (/^(?:[a-z]\)|\d+\)|○|-)\s+/i.test(text)) return true;
  if (text.endsWith(";")) return true;
  return false;
}

function isSubheadingLine(text: string) {
  if (text.length > 140) return false;
  if (!/[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(text)) return false;
  const compact = text.replace(/[^A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇ]/g, "");
  if (!compact) return false;
  const upperRatio = compact.replace(/[a-záàâãéêíóôõúç]/g, "").length / compact.length;
  return upperRatio > 0.82;
}

function buildBlueBulletLines(items: string[]): Content[] {
  return items.map((item) => ({
    columns: [
      { width: 12, text: "•", style: "bulletGlyphBlue" },
      { width: "*", text: item, style: "bodyBulletBlue" },
    ],
    margin: [16, 1, 0, 2],
    columnGap: 0,
  }));
}

function escapeSvgText(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildVerticalLabelSvg(
  label: string,
  width: number,
  height: number,
  fontSize: number,
  fontWeight: number,
) {
  const safe = escapeSvgText(label);
  const cx = width / 2;
  const cy = height / 2;
  return `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${width}\" height=\"${height}\" viewBox=\"0 0 ${width} ${height}\">
  <text x=\"${cx}\" y=\"${cy}\" fill=\"#FFFFFF\" font-family=\"WorkSansLight, Work Sans, Arial, sans-serif\" font-size=\"${fontSize}\" font-weight=\"${fontWeight}\" text-anchor=\"middle\" dominant-baseline=\"middle\" transform=\"rotate(-90 ${cx} ${cy})\">${safe}</text>
</svg>`;
}

function buildSection14Graphics(visualAssets?: RuntimeVisualAssets): Content[] {
  const content: Content[] = [];

  SECTION_14_TABLES.forEach((table, index) => {
    content.push(buildFixedRuntimeTable(table, index > 0, visualAssets));
  });

  return content;
}

function buildSection15Tables(visualAssets?: RuntimeVisualAssets): Content[] {
  const content: Content[] = [];
  SECTION_15_TABLES.forEach((table, index) => {
    content.push(buildFixedRuntimeTable(table, index > 0, visualAssets));
  });
  return content;
}

function buildSection15TableAt(
  index: number,
  pageBreakBefore = false,
  visualAssets?: RuntimeVisualAssets,
): Content[] {
  const table = SECTION_15_TABLES[index];
  if (!table) return [];
  return [buildFixedRuntimeTable(table, pageBreakBefore, visualAssets)];
}

function buildSection14TableAt(
  index: number,
  pageBreakBefore = false,
  visualAssets?: RuntimeVisualAssets,
): Content[] {
  const table = SECTION_14_TABLES[index];
  if (!table) return [];
  return [buildFixedRuntimeTable(table, pageBreakBefore, visualAssets)];
}

function resolveFixedTableWidths(cols: number): Array<number | string> {
  if (cols === 2) return [120, "*"];
  if (cols === 3) return [42, 72, "*"];
  if (cols === 4) return [36, 70, "*", "*"];
  if (cols === 7) return [30, 54, "*", 56, 56, 56, 56];
  if (cols === 8) return [84, 32, 68, "*", "*", "*", "*", "*"];
  return new Array(cols).fill("*");
}

function buildFixedRuntimeTable(
  table: FixedRuntimeTable,
  pageBreakBefore = false,
  visualAssets?: RuntimeVisualAssets,
): Content {
  const isMatrixTable = table.cols === 8 && table.rows[0]?.[0] === "Gradação do Risco";
  const isSeverityMatrix = isMatrixTable && /Severidade/i.test(table.rows[1]?.[0] || "");
  const isPriorityMatrix = isMatrixTable && /Gradação de Risco/i.test(table.rows[1]?.[0] || "");
  const isIndexTable = table.cols === 2 && /Índice/i.test(table.rows[0]?.[0] || "");
  const isActionsTable = table.cols === 2 && /Priorização da Ação/i.test(table.rows[0]?.[0] || "");

  const resolveMatrixCellStyle = (value: string, preferRegular = false): string | null => {
    const normalized = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!normalized) return null;
    const suffix = preferRegular ? "Regular" : "";
    if (normalized.includes("irrelevante") || normalized.includes("nenhuma acao")) return `matrixCellIrrelevante${suffix}`;
    if (normalized.includes("prioridade baixa") || normalized.includes("risco baixo")) return `matrixCellBaixo${suffix}`;
    if (normalized.includes("prioridade media") || normalized.includes("risco moderado") || normalized.includes("moderado"))
      return `matrixCellModerado${suffix}`;
    if (normalized.includes("prioridade alta") || normalized.includes("risco alto") || normalized.includes("alto"))
      return `matrixCellAlto${suffix}`;
    if (normalized.includes("acoes imediatas") || normalized.includes("risco critico") || normalized.includes("critico"))
      return `matrixCellCritico${suffix}`;
    return null;
  };

  const resolveRiskLabelStyle = (value: string, variant: "index" | "actions"): string | null => {
    const normalized = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!normalized) return null;
    if (normalized.includes("irrelevante")) return variant === "actions" ? "riskLabelActionIrrelevante" : "riskLabelIrrelevante";
    if (normalized.includes("baixo")) return variant === "actions" ? "riskLabelActionBaixo" : "riskLabelBaixo";
    if (normalized.includes("moderado")) return variant === "actions" ? "riskLabelActionModerado" : "riskLabelModerado";
    if (normalized.includes("alto")) return variant === "actions" ? "riskLabelActionAlto" : "riskLabelAlto";
    if (normalized.includes("critico")) return variant === "actions" ? "riskLabelActionCritico" : "riskLabelCritico";
    return null;
  };

  const splitSemicolonLines = (value: string): string[] => {
    const raw = sanitizeText(value);
    if (!raw) return [];
    const parts = raw.split(";").map((item) => item.trim()).filter(Boolean);
    if (parts.length <= 1) return raw ? [raw] : [];
    return parts.map((item, index) => {
      if (index >= parts.length - 1) return item;
      if (/[.!?)]$/.test(item)) return item;
      return `${item};`;
    });
  };

  const body: TableCell[][] = table.rows.map((row, rowIndex) => {
    const nonEmptyIndexes = row
      .map((cell, i) => ({ cell: sanitizeText(cell), i }))
      .filter((item) => item.cell.length > 0);

    if (isMatrixTable) {
      const hasOnlyMatrixLabel =
        nonEmptyIndexes.length === 1 && nonEmptyIndexes[0].i === 3 && /Probabilidade|Número de Trabalhadores/i.test(nonEmptyIndexes[0].cell);
      if (hasOnlyMatrixLabel) {
        const axisStyle = /Probabilidade/i.test(nonEmptyIndexes[0].cell) ? "matrixAxisCellLarge" : "matrixAxisCell";
        return [
          { text: "", style: axisStyle },
          { text: "", style: axisStyle },
          { text: "", style: axisStyle },
          {
            text: nonEmptyIndexes[0].cell,
            colSpan: 5,
            style: axisStyle,
            alignment: "center",
            valign: "middle",
          },
          ...new Array(4).fill({ text: "" }),
        ];
      }
    }

    if (nonEmptyIndexes.length === 1 && nonEmptyIndexes[0].i === 0) {
      return [
        {
          text: nonEmptyIndexes[0].cell,
          colSpan: table.cols,
          style: rowIndex === 0 ? "fixedTableHeaderCell" : "fixedTableBandCell",
        },
        ...new Array(table.cols - 1).fill({ text: "" }),
      ];
    }

    return row.map((cell, colIndex) => {
      const text = sanitizeText(cell);
      let style = rowIndex === 0 ? "fixedTableHeaderCell" : "fixedTableBodyCell";
      if (rowIndex === 0 && (isPriorityMatrix || isIndexTable || isActionsTable)) {
        style = "fixedTableHeaderCellRegular";
      }

      if (isMatrixTable && rowIndex >= 1 && rowIndex <= 5 && colIndex <= 2) {
        style = isPriorityMatrix ? "matrixAxisCellRegular" : "matrixAxisCell";
      }
      if (isMatrixTable && rowIndex >= 6 && rowIndex <= 8 && colIndex >= 3) {
        style = isPriorityMatrix ? "matrixAxisCellRegular" : "matrixAxisCell";
      }
      if (isMatrixTable && rowIndex >= 1 && rowIndex <= 5 && colIndex >= 3 && colIndex <= 7) {
        const matrixStyle = resolveMatrixCellStyle(text, isPriorityMatrix);
        if (matrixStyle) style = matrixStyle;
      }
      if ((isIndexTable || isActionsTable) && rowIndex >= 1 && colIndex === 0) {
        const riskLabelStyle = resolveRiskLabelStyle(text, isIndexTable ? "index" : "actions");
        if (riskLabelStyle) style = riskLabelStyle;
      }

      if (isSeverityMatrix && rowIndex === 1 && colIndex === 0) {
        return {
          rowSpan: 5,
          svg: buildVerticalLabelSvg("Severidade", 42, 180, 14.8, 300),
          style: "matrixAxisCell",
          alignment: "center",
          valign: "middle",
        };
      }
      if (isPriorityMatrix && rowIndex === 1 && colIndex === 0) {
        return {
          rowSpan: 5,
          svg: buildVerticalLabelSvg("Gradação de Risco", 42, 180, 15, 300),
          style: "matrixAxisCellRegular",
          alignment: "center",
          valign: "middle",
        };
      }
      if (isSeverityMatrix && rowIndex > 1 && rowIndex <= 5 && colIndex === 0) {
        return { text: "" };
      }
      if (isPriorityMatrix && rowIndex > 1 && rowIndex <= 5 && colIndex === 0) {
        return { text: "" };
      }

      if ((isIndexTable || isActionsTable) && rowIndex >= 1 && colIndex === 1) {
        const lines = splitSemicolonLines(text);
        if (isActionsTable) {
          return {
            stack: lines.map((line) => ({
              columns: [
                { width: 10, text: "•", style: "tableBulletGlyph" },
                { width: "*", text: line, style: "actionsBulletText" },
              ],
              columnGap: 2,
              margin: [0, 0, 0, 2],
            })),
            margin: [0, 0, 0, 0],
          };
        }
        return {
          stack: lines.map((line, index) => ({
            text: line,
            style: "fixedTableBodyCell",
            margin: [0, 0, 0, index < lines.length - 1 ? 2 : 0],
          })),
        };
      }

      return { text, style };
    });
  });

  const matrixWidths = isMatrixTable ? [42, 34, 70, 71, 61, 70, 66, 75] : undefined;
  const indexWidths = isIndexTable ? [66, 412] : undefined;
  const actionsWidths = isActionsTable ? [63, 415] : undefined;

  const resolvedWidths = matrixWidths || indexWidths || actionsWidths || resolveFixedTableWidths(table.cols);
  const layout = isMatrixTable || isIndexTable || isActionsTable ? MATRIX_TABLE_LAYOUT : THIN_TABLE_LAYOUT;

  return {
    table: {
      headerRows: 1,
      widths: resolvedWidths,
      body,
    },
    layout,
    margin: [0, pageBreakBefore ? 8 : 2, 0, 10],
    pageBreak: pageBreakBefore ? "before" : undefined,
  };
}

const THIN_TABLE_LAYOUT = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => COLORS.grid,
  vLineColor: () => COLORS.grid,
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 3,
  paddingBottom: () => 3,
};

const MATRIX_TABLE_LAYOUT = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => COLORS.grid,
  vLineColor: () => COLORS.grid,
  paddingLeft: () => 2,
  paddingRight: () => 2,
  paddingTop: () => 2,
  paddingBottom: () => 2,
};

const HEADER_TABLE_LAYOUT = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => COLORS.grid,
  vLineColor: () => COLORS.grid,
  paddingLeft: () => 5,
  paddingRight: () => 5,
  paddingTop: () => 2,
  paddingBottom: () => 2,
};

const ANNEX_TABLE_LAYOUT = {
  ...THIN_TABLE_LAYOUT,
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 3,
  paddingBottom: () => 3,
};

function buildCoverPage(snapshot: RuntimeSnapshot): Content[] {
  const companyName = sanitizeText(snapshot.company.razaoSocial || snapshot.company.name);
  const establishmentName = sanitizeText(snapshot.establishment.name);
  const vigencia = sanitizeText(snapshot.program.vigencia || snapshot.meta.generatedDate);

  // Ajuste adaptativo da capa:
  // quando empresa/estabelecimento quebram em muitas linhas, subimos o bloco
  // textual (sem alterar logo/background), evitando empurrar "Vigência" para baixo.
  const companyLineCount = estimateWrappedLineCount(companyName, 56);
  const establishmentLineCount = estimateWrappedLineCount(establishmentName, 50);
  const extraLines = Math.max(0, companyLineCount - 1) + Math.max(0, establishmentLineCount - 1);
  const coverShiftUp = Math.min(96, extraLines * 18);

  const dynamicTopMargin = Math.max(176, 272 - coverShiftUp);
  const dynamicGapAfterProgram = Math.max(18, 34 - Math.floor(coverShiftUp / 8));
  const dynamicGapAfterMainTitle = Math.max(20, 34 - Math.floor(coverShiftUp / 8));
  const dynamicGapAfterSubtitle = Math.max(18, 34 - Math.floor(coverShiftUp / 10));
  const dynamicGapBeforeVigencia = Math.max(10, 30 - Math.floor(coverShiftUp / 8));

  return [
    {
      stack: [
        {
          text: "Programa de\nGerenciamento\nde Riscos",
          style: "coverProgramName",
          margin: [0, dynamicTopMargin, 0, dynamicGapAfterProgram],
        },
        {
          text: "PGR - NR 01",
          style: "coverMainTitle",
          margin: [0, 0, 0, dynamicGapAfterMainTitle],
        },
        {
          text: "Portaria nº 1.419, de 24 de Agosto de 2024\nInventário de Riscos e Plano de Ação",
          style: "coverSubtitle",
          margin: [0, 0, 0, dynamicGapAfterSubtitle],
        },
        {
          text: [
            { text: "Nome da Empresa: ", style: "coverMetaLabel" },
            { text: companyName, style: "coverMetaValue" },
            { text: "\n" },
            { text: "Estabelecimento: ", style: "coverMetaLabel" },
            { text: establishmentName, style: "coverMetaValue" },
          ],
          margin: [0, 0, 0, dynamicGapBeforeVigencia],
        },
        {
          text: [
            { text: "Vigência: ", style: "coverMetaLabel" },
            { text: vigencia, style: "coverMetaValue" },
          ],
        },
      ],
      margin: [0, 0, 0, 0],
    },
    { text: "", pageBreak: "after" },
  ];
}

function buildUpdatePage(snapshot: RuntimeSnapshot, pdfLayout?: PdfLayoutState): Content[] {
  const updateRows =
    snapshot.updateHistory?.length
      ? snapshot.updateHistory.map((item) => [
          bodyCell(item.alteracao || "-", "tableBodyCellCenter"),
          bodyCell(item.motivo || "-", "tableBodyCellCenter"),
          bodyCell(item.data || snapshot.meta.generatedDate, "tableBodyCellCenter"),
        ])
      : [
          [
            bodyCell("00", "tableBodyCellCenter"),
            bodyCell(snapshot.meta.revisionReason || "Elaboração inicial", "tableBodyCellCenter"),
            bodyCell(snapshot.meta.generatedDate, "tableBodyCellCenter"),
          ],
        ];

  return [
    sectionTitle("Quadro de Atualizações do Programa"),
    {
      text:
        "O seguinte quadro relaciona as atualizações feitas a este Programa rastreadas pela versão. " +
        "Utiliza-se para descrever mudanças e acréscimos cada vez que for republicado. A descrição deve " +
        "incluir a maior quantidade possível de detalhes das mudanças.",
      style: "bodyParagraph",
      margin: [0, 0, 0, 16],
    },
    {
      table: {
        headerRows: 1,
        widths: resolveRuntimeTableWidths(pdfLayout, "update_table", [80, 190, 100]),
        body: [
          [tealHeaderCell("Alteração"), tealHeaderCell("Motivo da Revisão do PGR"), tealHeaderCell("Data")],
          ...updateRows,
        ],
      },
      layout: THIN_TABLE_LAYOUT,
    },
    { text: "", pageBreak: "after" },
  ];
}

function buildSummaryPage(layout?: LayoutContext): Content[] {
  const tocEntries: TocEntry[] = [
    { label: "1 - Identificação da Empresa", targetId: "sec_01" },
    { label: "2 - Identificação do Estabelecimento", targetId: "sec_02" },
    { label: "3 - Quantitativo Total de Empregados", targetId: "sec_03" },
    { label: "4 - Dados do Programa", targetId: "sec_04" },
    { label: "5 - Introdução", targetId: "sec_05" },
    { label: "6 - Objetivo", targetId: "sec_06" },
    { label: "7 - Documento", targetId: "sec_07" },
    { label: "8 - Inventário de Riscos Ocupacionais", targetId: "sec_08" },
    { label: "9 - Plano de Ação", targetId: "sec_09" },
    { label: "10 - Definição das Responsabilidades", targetId: "sec_10" },
    { label: "11 - Abrangência", targetId: "sec_11" },
    { label: "12 - Definições", targetId: "sec_12" },
    { label: "13 - Etapas do Programa de Gerenciamento de Riscos", targetId: "sec_13" },
    { label: "14 - Caracterização de Perigos e Critérios de Avaliação", targetId: "sec_14" },
    { label: "15 - Gradação do Risco", targetId: "sec_15_grad" },
    { label: "15 - Plano de Ação com Metas e Forma de Acompanhamento", targetId: "sec_15_plan" },
    { label: "16 - Relação de Prestação de Serviços a Terceiros", targetId: "sec_16" },
    { label: "17 - Exames, Discussão do Plano de Ação e Considerações Finais", targetId: "sec_17" },
    { label: "18 - Assinatura", targetId: "sec_18" },
    { label: "19 - Índice de Anexos", targetId: "sec_19" },
    { label: "ANEXO A:\nINVENTÁRIO DE RISCOS OCUPACIONAIS", targetId: "annex_a", indent: 16 },
    {
      label: "ANEXO B:\nPLANO DE AÇÃO\n(MEDIDAS DE PREVENÇÃO INTRODUZIDAS E APRIMORADAS)",
      targetId: "annex_b",
      indent: 16,
    },
    { label: "ANEXO C:\nART – ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA", targetId: "annex_c", indent: 16 },
  ];

  return [
    {
      stack: tocEntries.map((entry) => buildDynamicTocLine(entry, layout)),
      margin: [0, 8, 0, 0],
    },
    { text: "", pageBreak: "after" },
  ];
}

function buildIdentificationAndProgramPages(
  snapshot: RuntimeSnapshot,
  pdfLayout?: PdfLayoutState,
): Content[] {
  const buildExtraRows = (items: Array<{ title: string; value: string }>): TableCell[][] =>
    items.map((item) => [infoLabelCell(item.title || "Campo adicional"), bodyCell(item.value || "-")]);

  const commonInfoRows = (isCompany = true): TableCell[][] => {
    if (isCompany) {
      return [
        [infoLabelCell("Razão Social"), bodyCell(snapshot.company.razaoSocial || snapshot.company.name)],
        [infoLabelCell("CNPJ"), bodyCell(snapshot.company.cnpj)],
        [infoLabelCell("CNAE"), bodyCell(snapshot.company.cnae)],
        [infoLabelCell("Atividade Principal"), bodyCell(snapshot.company.atividadePrincipal)],
        [infoLabelCell("Grau de Risco (Quadro I da NR-04)"), bodyCell(snapshot.company.grauRisco)],
        [infoLabelCell("Endereço"), bodyCell(snapshot.company.enderecoCompleto)],
        ...buildExtraRows(snapshot.identificationExtras.empresa),
      ];
    }

    return [
      [infoLabelCell("Estabelecimento"), bodyCell(snapshot.establishment.name)],
      [infoLabelCell("CNPJ"), bodyCell(snapshot.establishment.cnpj)],
      [infoLabelCell("CNAE"), bodyCell(snapshot.establishment.cnae)],
      [infoLabelCell("Atividade Principal"), bodyCell(snapshot.establishment.atividadePrincipal)],
      [infoLabelCell("Grau de Risco (Quadro I da NR-04)"), bodyCell(snapshot.establishment.grauRisco)],
      ...buildExtraRows(snapshot.identificationExtras.estabelecimento),
    ];
  };

  const contractorSections: Content[] =
    snapshot.contractors.length > 0
      ? snapshot.contractors.flatMap((contractor, index) => [
          {
            text:
              snapshot.contractors.length > 1
                ? `Contratante ${index + 1}`
                : "Contratante",
            style: "bodyCapsTitleBlue",
            margin: [0, index === 0 ? 0 : 12, 0, 8],
          },
          {
            table: {
              widths: resolveRuntimeTableWidths(pdfLayout, "identificacao_info", [43, 57]),
              body: [
                [infoLabelCell("Nome Fantasia"), bodyCell(contractor.nomeFantasia)],
                [infoLabelCell("Razão Social"), bodyCell(contractor.razaoSocial)],
                [infoLabelCell("CNPJ"), bodyCell(contractor.cnpj)],
                [infoLabelCell("CNAE"), bodyCell(contractor.cnae)],
                [infoLabelCell("Atividade Principal"), bodyCell(contractor.atividadePrincipal)],
                [infoLabelCell("Grau de Risco (Quadro I da NR-04)"), bodyCell(contractor.grauRisco)],
                [
                  infoLabelCell("Endereço"),
                  bodyCell(
                    [contractor.endereco, contractor.cidade, contractor.estado, contractor.cep]
                      .filter(Boolean)
                      .join(" - ")
                  ),
                ],
                ...buildExtraRows(snapshot.identificationExtras.contratante),
              ],
            },
            layout: THIN_TABLE_LAYOUT,
          },
        ])
      : [
          {
            table: {
              widths: resolveRuntimeTableWidths(pdfLayout, "identificacao_info", [43, 57]),
              body: [
                [infoLabelCell("Nome Fantasia"), bodyCell("-")],
                [infoLabelCell("Razão Social"), bodyCell("-")],
                [infoLabelCell("CNPJ"), bodyCell("-")],
                [infoLabelCell("CNAE"), bodyCell("-")],
                [infoLabelCell("Atividade Principal"), bodyCell("-")],
                [infoLabelCell("Grau de Risco (Quadro I da NR-04)"), bodyCell("-")],
                [infoLabelCell("Endereço"), bodyCell("-")],
                ...buildExtraRows(snapshot.identificationExtras.contratante),
              ],
            },
            layout: THIN_TABLE_LAYOUT,
          },
        ];

  return [
    sectionTitle("1 - Identificação da Empresa", "sec_01"),
    {
      table: {
        widths: resolveRuntimeTableWidths(pdfLayout, "identificacao_info", [43, 57]),
        body: commonInfoRows(true),
      },
      layout: THIN_TABLE_LAYOUT,
    },
    sectionTitle("2 - Identificação do Estabelecimento", "sec_02"),
    {
      table: {
        widths: resolveRuntimeTableWidths(pdfLayout, "identificacao_info", [43, 57]),
        body: commonInfoRows(false),
      },
      layout: THIN_TABLE_LAYOUT,
    },
    sectionTitle("Identificação da Contratante"),
    ...contractorSections,
    sectionTitle("3 - Quantitativo Total de Empregados", "sec_03"),
    {
      table: {
        widths: resolveRuntimeTableWidths(pdfLayout, "identificacao_info", [43, 57]),
        body: [[infoLabelCell("Quantitativo de empregados ativos"), bodyCell(String(snapshot.program.totalEmployees || 0))]],
      },
      layout: THIN_TABLE_LAYOUT,
    },
    { text: "", pageBreak: "after" },

    sectionTitle("4 - Dados do Programa", "sec_04"),
    {
      table: {
        widths: resolveRuntimeTableWidths(pdfLayout, "identificacao_info", [43, 57]),
        body: [
          [infoLabelCell("Norma Regulamentadora"), bodyCell(snapshot.program.nr)],
          [infoLabelCell("Data de Elaboração do Documento"), bodyCell(snapshot.meta.generatedDate)],
          [infoLabelCell("Responsável pela Elaboração do PGR"), bodyCell(snapshot.program.responsavelElaboracao)],
          [infoLabelCell("Responsável pela Coordenação Técnica"), bodyCell(snapshot.program.responsavelCoordenacao)],
          [infoLabelCell("Responsável pela Implementação do PGR da organização"), bodyCell(snapshot.program.responsavelImplementacao)],
        ],
      },
      layout: THIN_TABLE_LAYOUT,
    },
    { text: "", pageBreak: "after" },
  ];
}

function buildNarrativeCoreAndAnnexIndex(
  snapshot: RuntimeSnapshot,
  visualAssets?: RuntimeVisualAssets,
  pdfLayout?: PdfLayoutState,
): Content[] {
  const content: Content[] = [];
  const signatureLocationDate = buildSignatureLocationDate(snapshot.meta.generatedDate);
  let insertedSection14Tables = false;
  let insertedSection15Tables = false;
  const fixedSectionTocId: Record<string, string> = {
    "5 - Introdução": "sec_05",
    "6 - Objetivo": "sec_06",
    "7 - Documento": "sec_07",
    "8 - Inventário de Riscos Ocupacionais": "sec_08",
    "9 - Plano de Ação": "sec_09",
    "10 - Definição das Responsabilidades": "sec_10",
    "11 - Abrangência": "sec_11",
    "12 - Definições": "sec_12",
    "13 - Etapas do Programa de Gerenciamento de Riscos": "sec_13",
    "14 - Caracterização de Perigos e Critérios de Avaliação": "sec_14",
    "15 - Gradação do Risco": "sec_15_grad",
    "15 - Plano de Ação com Metas e Forma de Acompanhamento": "sec_15_plan",
    "16 - Relação de Prestação de Serviços a Terceiros": "sec_16",
    "17 - Exames, Discussão do Plano de Ação e Considerações Finais": "sec_17",
    "18 - Assinatura": "sec_18",
  };

  FIXED_SECTIONS_5_TO_18.forEach((section) => {
    const isIntroSection = section.title.startsWith("5 -");
    const isObjectiveSection = section.title.startsWith("6 -");
    const isInventorySection = section.title.startsWith("8 -");
    const isSection14 = section.title.startsWith("14 -");
    const isSection15 = section.title.startsWith("15 - Gradação do Risco");
    const isSection15Plan = section.title.startsWith("15 - Plano de Ação");
    const isResponsibilitiesSection = section.title.startsWith("10 -");
    const isScopeSection = section.title.startsWith("11 -");
    const isDefinitionsSection = section.title.startsWith("12 -");
    const isStepsSection = section.title.startsWith("13 -");
    const isEmphasisCapsSection =
      isResponsibilitiesSection ||
      isScopeSection ||
      isDefinitionsSection ||
      isStepsSection ||
      isSection14 ||
      isSection15 ||
      isSection15Plan;
    const isWideSubtitleSpacing = isDefinitionsSection || isStepsSection || isSection14 || isSection15 || isSection15Plan;
    const isPlanSection = section.title.startsWith("9 -");
    const isAfterResponsibilitiesSection = section.title.startsWith("11 -");
    const isSignatureSection = section.title.startsWith("18 -");

    if (isObjectiveSection) {
      content.push({ text: "", pageBreak: "before" });
    }
    if (isSection15) {
      content.push({ text: "", pageBreak: "before" });
    }
    if (isSection14) {
      content.push({ text: "", pageBreak: "before" });
    }
    if (isPlanSection || isAfterResponsibilitiesSection) {
      content.push({ text: "", pageBreak: "before" });
    }

    content.push(sectionTitle(section.title, fixedSectionTocId[section.title]));

    if (isObjectiveSection) {
      const normalizedParagraphs = section.paragraphs
        .map((paragraph) => normalizeFixedText(paragraph))
        .filter(Boolean);

      const [opening, bulletLeadIn, ...bulletItems] = normalizedParagraphs;
      if (opening) {
        content.push({ text: opening, style: "bodyParagraph" });
      }
      if (bulletLeadIn) {
        content.push({ text: bulletLeadIn, style: "bodyParagraph" });
      }
      if (bulletItems.length) {
        content.push(...buildBlueBulletLines(bulletItems));
      }
    } else if (isInventorySection) {
      const normalizedParagraphs = section.paragraphs
        .map((paragraph) => normalizeFixedText(paragraph))
        .filter(Boolean);
      const [opening, ...bulletItems] = normalizedParagraphs;
      if (opening) {
        content.push({ text: opening, style: "bodyParagraph" });
      }
      if (bulletItems.length) {
        content.push(...buildBlueBulletLines(bulletItems));
      }
    } else if (isSection14) {
      const normalizedParagraphs = section.paragraphs
        .map((paragraph) => normalizeFixedText(paragraph))
        .filter(Boolean);

      let severityInserted = false;
      let probabilityInserted = false;
      let footnoteInserted = false;

      normalizedParagraphs.forEach((paragraph) => {
        if (!paragraph) return;

        if (isAlphaListItem(paragraph)) {
          const alphaMatch = paragraph.match(/^([a-z]\))\s*(.+)$/i);
          content.push({
            text: alphaMatch
              ? [
                  { text: `${alphaMatch[1]} `, style: "bodyBulletAlphaPrefix" },
                  { text: alphaMatch[2], style: "bodyBulletAlpha" },
                ]
              : paragraph,
            style: alphaMatch ? undefined : "bodyBulletAlpha",
            margin: [14, 0, 0, 6],
          });
          return;
        }

        if (isSubheadingLine(paragraph)) {
          content.push({
            text: paragraph,
            style: "bodyCapsTitleBlue",
            margin: [0, isWideSubtitleSpacing ? 12 : 10, 0, isWideSubtitleSpacing ? 10 : 8],
          });
          return;
        }

        const capsPrefix = paragraph.match(/^([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9 ()\/.\-]{4,}):\s*(.+)$/u);
        const capsSentence = paragraph.match(/^([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9 ()\/.\-]{4,})\.\s+(.+)$/u);
        const capsLoose = paragraph.match(/^([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9 ()\/.\-]{4,})\s+(.+)$/u);
        const capsMatch = capsPrefix || capsSentence || capsLoose;
        if (capsMatch) {
          const titleText = capsPrefix
            ? `${capsPrefix[1]}:`
            : capsSentence
              ? `${capsSentence[1]}.`
              : `${capsLoose?.[1]}.`;
          const bodyText = capsPrefix ? capsPrefix[2] : capsSentence ? capsSentence[2] : capsLoose?.[2] || "";

          content.push({
            text: titleText,
            style: "bodyCapsTitleBlue",
            margin: [0, 12, 0, 10],
            keepWithNext: true,
          });
          if (bodyText) {
            content.push({
              text: bodyText,
              style: "bodyParagraph",
              margin: [0, 0, 0, 10],
            });
          }

          if (!severityInserted && titleText.startsWith("SEVERIDADE") && SECTION_14_TABLES.length >= 1) {
            content.push(...buildSection14TableAt(0, false, visualAssets));
            severityInserted = true;
          }
          if (!probabilityInserted && titleText.startsWith("PROBABILIDADE") && SECTION_14_TABLES.length >= 6) {
            for (let i = 1; i <= 5; i += 1) {
              content.push(...buildSection14TableAt(i, false, visualAssets));
            }
            probabilityInserted = true;
          }
          return;
        }

        content.push({
          text: paragraph,
          style: isBulletLikeLine(paragraph) ? "bodyBulletBlue" : "bodyParagraph",
        });

        if (
          !footnoteInserted &&
          paragraph.startsWith("(*) Refere-se a avaliações") &&
          SECTION_14_TABLES.length >= 7
        ) {
          content.push(...buildSection14TableAt(6, false, visualAssets));
          footnoteInserted = true;
        }
      });

      if (!severityInserted && SECTION_14_TABLES.length >= 1) {
        content.push(...buildSection14TableAt(0, false, visualAssets));
        severityInserted = true;
      }
      if (!probabilityInserted && SECTION_14_TABLES.length >= 6) {
        for (let i = 1; i <= 5; i += 1) {
          content.push(...buildSection14TableAt(i, false, visualAssets));
        }
        probabilityInserted = true;
      }
      if (!footnoteInserted && SECTION_14_TABLES.length >= 7) {
        content.push(...buildSection14TableAt(6, false, visualAssets));
        footnoteInserted = true;
      }

      insertedSection14Tables = severityInserted || probabilityInserted || footnoteInserted;
    } else if (isSection15) {
      const normalizedParagraphs = section.paragraphs
        .map((paragraph) => normalizeFixedText(paragraph))
        .filter(Boolean);

      let matrixInserted = false;
      let indexInserted = false;
      let priorityInserted = false;
      let actionsInserted = false;

      normalizedParagraphs.forEach((paragraph) => {
        if (!paragraph) return;

        if (isSubheadingLine(paragraph)) {
          content.push({
            text: paragraph,
            style: "bodyCapsTitleBlue",
            margin: [0, 12, 0, 10],
          });
          return;
        }

        const capsPrefix = paragraph.match(/^([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9 ()\/.\-]{4,}):\s*(.+)$/u);
        const capsSentence = paragraph.match(/^([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9 ()\/.\-]{4,})\.\s+(.+)$/u);
        const capsLoose = paragraph.match(/^([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9 ()\/.\-]{4,})\s+(.+)$/u);
        const capsMatch = capsPrefix || capsSentence || capsLoose;
        if (capsMatch) {
          const titleText = capsPrefix
            ? `${capsPrefix[1]}:`
            : capsSentence
              ? `${capsSentence[1]}.`
              : `${capsLoose?.[1]}.`;
          const bodyText = capsPrefix ? capsPrefix[2] : capsSentence ? capsSentence[2] : capsLoose?.[2] || "";

          content.push({
            text: titleText,
            style: "bodyCapsTitleBlue",
            margin: [0, 12, 0, 10],
            keepWithNext: true,
          });
          if (bodyText) {
            content.push({
              text: bodyText,
              style: "bodyParagraph",
              margin: [0, 0, 0, 10],
            });
          }

          if (
            !priorityInserted &&
            /ESTABELECIMENTO DE PRIORIDADES/i.test(titleText) &&
            SECTION_15_TABLES.length >= 3
          ) {
            content.push(...buildSection15TableAt(2, false, visualAssets));
            priorityInserted = true;
            if (!actionsInserted && SECTION_15_TABLES.length >= 4) {
              content.push(...buildSection15TableAt(3, false, visualAssets));
              actionsInserted = true;
            }
          }
          return;
        }

        content.push({
          text: paragraph,
          style: isBulletLikeLine(paragraph) ? "bodyBulletBlue" : "bodyParagraph",
        });

        if (!matrixInserted && paragraph.startsWith("Com o resultado das probabilidades") && SECTION_15_TABLES.length >= 1) {
          content.push(...buildSection15TableAt(0, false, visualAssets));
          matrixInserted = true;
        }
        if (!indexInserted && paragraph.startsWith("A combinação da severidade") && SECTION_15_TABLES.length >= 2) {
          content.push(...buildSection15TableAt(1, false, visualAssets));
          indexInserted = true;
        }
      });

      if (!matrixInserted && SECTION_15_TABLES.length >= 1) {
        content.push(...buildSection15TableAt(0, false, visualAssets));
        matrixInserted = true;
      }
      if (!indexInserted && SECTION_15_TABLES.length >= 2) {
        content.push(...buildSection15TableAt(1, false, visualAssets));
        indexInserted = true;
      }
      if (!priorityInserted && SECTION_15_TABLES.length >= 3) {
        content.push(...buildSection15TableAt(2, false, visualAssets));
        priorityInserted = true;
      }
      if (!actionsInserted && SECTION_15_TABLES.length >= 4) {
        content.push(...buildSection15TableAt(3, false, visualAssets));
        actionsInserted = true;
      }

      insertedSection15Tables = matrixInserted || indexInserted || priorityInserted || actionsInserted;
    } else {
      let introBreakInserted = false;
      section.paragraphs.forEach((paragraph) => {
        const normalizedBase = normalizeFixedText(paragraph);
        const normalized = isSignatureSection
          ? normalizedBase.replace(
              /^Rio de Janeiro,\s*xx\s+de\s+xxxxxxx\s+de\s+xxxx\.$/i,
              signatureLocationDate
            )
          : normalizedBase;
        if (!normalized) return;

        if (
          isIntroSection &&
          !introBreakInserted &&
          normalized.startsWith("Este PGR contém o Inventário")
        ) {
          content.push({ text: "", pageBreak: "before" });
          introBreakInserted = true;
        }

        if (isAlphaListItem(normalized)) {
          const alphaMatch = normalized.match(/^([a-z]\))\s*(.+)$/i);
          content.push({
            text: alphaMatch
              ? [
                  { text: `${alphaMatch[1]} `, style: "bodyBulletAlphaPrefix" },
                  { text: alphaMatch[2], style: "bodyBulletAlpha" },
                ]
              : normalized,
            style: alphaMatch ? undefined : "bodyBulletAlpha",
            margin: [14, 0, 0, 6],
          });
          return;
        }

        if (isSubheadingLine(normalized)) {
          content.push({
            text: normalized,
            style: isEmphasisCapsSection ? "bodyCapsTitleBlue" : "bodySubheading",
            margin: isEmphasisCapsSection
              ? [0, isWideSubtitleSpacing ? 12 : 10, 0, isWideSubtitleSpacing ? 10 : 8]
              : [0, 8, 0, 6],
          });
          return;
        }

        if (isEmphasisCapsSection) {
          const capsPrefix = normalized.match(
            /^([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9 ()\/.\-]{4,}):\s*(.+)$/u,
          );
          const capsSentence = normalized.match(
            /^([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9 ()\/.\-]{4,})\.\s+(.+)$/u,
          );
          const capsLoose = normalized.match(
            /^([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9 ()\/.\-]{4,})\s+(.+)$/u,
          );
          if (capsPrefix) {
            content.push({
              text: `${capsPrefix[1]}:`,
              style: "bodyCapsTitleBlue",
              margin: [0, 12, 0, isWideSubtitleSpacing ? 10 : 6],
              keepWithNext: true,
            });
            content.push({
              text: capsPrefix[2],
              style: "bodyParagraph",
              margin: [
                0,
                0,
                0,
                isWideSubtitleSpacing ? 10 : isSection14 || isResponsibilitiesSection || isScopeSection ? 7 : 4,
              ],
            });
            return;
          }
          if (capsSentence) {
            content.push({
              text: `${capsSentence[1]}.`,
              style: "bodyCapsTitleBlue",
              margin: [0, 12, 0, isWideSubtitleSpacing ? 10 : 6],
              keepWithNext: true,
            });
            content.push({
              text: capsSentence[2],
              style: "bodyParagraph",
              margin: [
                0,
                0,
                0,
                isWideSubtitleSpacing ? 10 : isSection14 || isResponsibilitiesSection || isScopeSection ? 7 : 4,
              ],
            });
            return;
          }
          if (capsLoose) {
            content.push({
              text: `${capsLoose[1]}.`,
              style: "bodyCapsTitleBlue",
              margin: [0, 12, 0, isWideSubtitleSpacing ? 10 : 6],
              keepWithNext: true,
            });
            content.push({
              text: capsLoose[2],
              style: "bodyParagraph",
              margin: [
                0,
                0,
                0,
                isWideSubtitleSpacing ? 10 : isSection14 || isResponsibilitiesSection || isScopeSection ? 7 : 4,
              ],
            });
            return;
          }
        }

        content.push({
          text: normalized,
          style: isBulletLikeLine(normalized)
            ? "bodyBulletBlue"
            : isIntroSection
              ? "bodyParagraphIntro"
              : "bodyParagraph",
        });
      });
    }

    if (isSignatureSection) {
      content.push(
        {
          text: "",
          margin: [0, 14, 0, 0],
        },
        {
          columns: [
            {
              width: "*",
              stack: [
                { text: "__________________________________________", style: "signatureLine" },
                { text: sanitizeText(snapshot.program.responsavelCoordenacao || "Coordenação Técnica"), style: "signatureName" },
                { text: "Coordenação Técnica", style: "signatureRole" },
              ],
            },
            { width: 36, text: "" },
            {
              width: "*",
              stack: [
                { text: "__________________________________________", style: "signatureLine" },
                { text: sanitizeText(snapshot.program.responsavelImplementacao || "Implementação do PGR"), style: "signatureName" },
                { text: "Implementação do PGR", style: "signatureRole" },
              ],
            },
          ],
          margin: [0, 16, 0, 4],
        },
      );
    }

    if (isObjectiveSection) {
      content.push({ text: "", pageBreak: "after" });
    }
  });

  if (!insertedSection14Tables) {
    content.push(
      sectionTitle("14 - Caracterização de Perigos e Critérios de Avaliação", "sec_14"),
      ...buildSection14Graphics(visualAssets),
    );
  }

  if (!insertedSection15Tables) {
    content.push(
      sectionTitle("15 - Gradação do Risco", "sec_15_grad"),
      ...buildSection15Tables(visualAssets),
    );
  }

  content.push(
    { text: "", pageBreak: "before" },
    sectionTitle("19 - Índice de Anexos", "sec_19"),
    {
      table: {
        widths: resolveRuntimeTableWidths(pdfLayout, "index_anexos", [65, 165, 110]),
        body: (() => {
          const rows: TableCell[][] = [
            [tealHeaderCell("Anexo"), tealHeaderCell("Título"), tealHeaderCell("Data da Inclusão")],
            [bodyCell("A"), bodyCell("INVENTÁRIO DE RISCOS OCUPACIONAIS"), bodyCell(snapshot.meta.generatedDate)],
            [bodyCell("B"), bodyCell("PLANO DE AÇÃO"), bodyCell(snapshot.meta.generatedDate)],
          ];

          let nextCharCode = "C".charCodeAt(0);
          const artItems = snapshot.annexes.artItems || [];
          const otherItems = snapshot.annexes.otherItems || [];

          if (artItems.length > 0) {
            const orderedArtNames = artItems
              .map((item) => item.titulo || item.arquivos.join("; "))
              .filter(Boolean);
            const artTitle = orderedArtNames.length
              ? `ART – ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA (${orderedArtNames.join(" | ")})`
              : "ART – ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA";
            rows.push([
              bodyCell(String.fromCharCode(nextCharCode)),
              bodyCell(artTitle),
              bodyCell(snapshot.meta.generatedDate),
            ]);
            nextCharCode += 1;
          }

          otherItems.forEach((item) => {
            const displayTitle = item.titulo || item.arquivos.join("; ") || "Anexo sem título";
            rows.push([
              bodyCell(String.fromCharCode(nextCharCode)),
              bodyCell(displayTitle),
              bodyCell(snapshot.meta.generatedDate),
            ]);
            nextCharCode += 1;
          });

          return rows;
        })(),
      },
      layout: THIN_TABLE_LAYOUT,
    },
    { text: "", pageBreak: "after" },
  );

  return content;
}

function buildAnnexCover(letter: "A" | "B" | "C", title: string, id?: string): Content[] {
  return [
    {
      stack: [
        { text: `ANEXO ${letter}:`, style: "annexCoverTitle", margin: [0, 165, 0, 6], id },
        { text: title, style: "annexCoverSubtitle" },
      ],
      margin: [0, 0, 0, 0],
    },
    { text: "", pageBreak: "after" },
  ];
}

function buildAnnexAmbienteTable(
  ghe: RuntimeGhe,
  index: number,
  pdfLayout?: PdfLayoutState,
): Content {
  const ambienteRows =
    ghe.funcoes.length > 0
      ? ghe.funcoes.slice(0, 6).map((funcao) => [bodyCell(funcao.setor), bodyCell(truncateText(ghe.ambiente || funcao.descricaoAtividades, 220))])
      : [[bodyCell("-"), bodyCell(truncateText(ghe.ambiente, 220))]];

  return {
    table: {
      headerRows: 0,
      widths: resolveRuntimeTableWidths(pdfLayout, "annex_ambiente", [130, 190]),
      body: [
        [{ text: `GHE ${index + 1} - Descrição do Ambiente`, style: "annexBarCell", colSpan: 2 }, {}],
        [{ text: "Descrição sucinta do processo produtivo do GHE", style: "annexLeftHeaderCell" }, bodyCell(truncateText(ghe.processo, 220))],
        [{ text: "Observações sobre o GHE", style: "annexLeftHeaderCell" }, bodyCell(truncateText(ghe.observacoes, 220))],
        [{ text: "Setor", style: "annexHeaderCell" }, { text: "Descrição do Ambiente de Trabalho", style: "annexHeaderCell" }],
        ...ambienteRows,
      ],
    },
    layout: ANNEX_TABLE_LAYOUT,
  };
}

function buildAnnexAtividadeTable(
  ghe: RuntimeGhe,
  index: number,
  pdfLayout?: PdfLayoutState,
): Content {
  const rows =
    ghe.funcoes.length > 0
      ? ghe.funcoes.map((funcao) => [
          bodyCell(truncateText(funcao.setor, 55)),
          bodyCell(truncateText(funcao.funcao, 60)),
          bodyCell(truncateText(funcao.descricaoAtividades, 240)),
          bodyCell(truncateText(funcao.numeroFuncionarios, 20), "tableBodyCellCenter"),
        ])
      : [[bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-")]];

  return {
    table: {
      widths: resolveRuntimeTableWidths(pdfLayout, "annex_atividade", [70, 90, 190, 95]),
      body: [
        [{ text: `GHE ${index + 1} - Descrição de Atividade`, style: "annexBarCell", colSpan: 4 }, {}, {}, {}],
        [tealHeaderCell("Setor"), tealHeaderCell("Função"), tealHeaderCell("Descrição da Atividade"), tealHeaderCell("Total de Trabalhadores")],
        ...rows,
      ],
    },
    layout: ANNEX_TABLE_LAYOUT,
  };
}

function buildAnnexReconhecimentoTable(
  ghe: RuntimeGhe,
  index: number,
  pdfLayout?: PdfLayoutState,
): Content {
  const rows =
    ghe.riscos.length > 0
      ? ghe.riscos.map((risk) => [
          bodyCell(truncateText(risk.tipoAgente, 24)),
          bodyCell(truncateText(risk.descricaoAgente, 38)),
          bodyCell(truncateText(risk.meioPropagacao, 30)),
          bodyCell(truncateText(risk.danosSaude, 42)),
          bodyCell(truncateText(risk.fontes, 42)),
          bodyCell(truncateText(risk.medidasControle, 42)),
          bodyCell(truncateText(risk.epc.join(", "), 36)),
          bodyCell(truncateText(risk.epi.join(", "), 36)),
          bodyCell(truncateText(risk.tipoAvaliacao, 25)),
          bodyCell(truncateText(risk.valorMedido || risk.intensidade, 26)),
          bodyCell(truncateText(risk.nivelAcao, 24)),
          bodyCell(truncateText(risk.limiteTolerancia || risk.intensidade, 26)),
          bodyCell(truncateText(risk.unidadeMedida, 24)),
          bodyCell(truncateText(risk.severidade, 22)),
          bodyCell(truncateText(risk.probabilidade, 24)),
          bodyCell(truncateText(risk.classificacao, 24)),
        ])
      : [[bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-")]];

  return {
    table: {
      widths: resolveRuntimeTableWidths(pdfLayout, "annex_reconhecimento", [
        7, 16, 9, 15, 11, 16, 5, 5, 8, 9, 6, 8, 6, 5, 5, 7,
      ]),
      body: [
        [{ text: `GHE ${index + 1} - Reconhecimento dos Riscos Ocupacionais`, style: "annexBarCell", colSpan: 16 }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
        [
          { text: "Análise dos Perigos", style: "annexHeaderCell", colSpan: 5, alignment: "center" },
          {},
          {},
          {},
          {},
          {
            text: "Descrição das medidas de prevenção implementadas",
            style: "annexHeaderCell",
            colSpan: 3,
            alignment: "center",
          },
          {},
          {},
          { text: "Monitoramento das Exposições", style: "annexHeaderCell", colSpan: 5, alignment: "center" },
          {},
          {},
          {},
          {},
          { text: "Avaliação do Risco", style: "annexHeaderCell", colSpan: 3, alignment: "center" },
          {},
          {},
        ],
        [
          tealVerticalHeaderCell("Tipo de Agente"),
          tealVerticalHeaderCell("Descrição do Agente"),
          tealVerticalHeaderCell("Meio de Propagação"),
          tealVerticalHeaderCell("Possíveis lesões e agravos à Saúde"),
          tealVerticalHeaderCell("Fontes ou Circunstâncias"),
          tealVerticalHeaderCell("Administrativas e/ou Engenharia"),
          tealVerticalHeaderCell("EPC"),
          tealVerticalHeaderCell("EPI"),
          tealVerticalHeaderCell("Tipo de Avaliação"),
          tealVerticalHeaderCell("Intensidade/Concentração"),
          tealVerticalHeaderCell("Nível de Ação"),
          tealVerticalHeaderCell("Limite de Tolerância"),
          tealVerticalHeaderCell("Unidade de Medida"),
          tealVerticalHeaderCell("Severidade"),
          tealVerticalHeaderCell("Probabilidade"),
          tealVerticalHeaderCell("Classificação de Risco"),
        ],
        ...rows,
      ],
    },
    layout: ANNEX_TABLE_LAYOUT,
    fontSize: 7.2,
  };
}

function buildAnnexPlanTable(
  ghe: RuntimeGhe,
  responsible: string,
  id?: string,
  pdfLayout?: PdfLayoutState,
): Content {
  const rows =
    ghe.planoItens.length > 0
      ? ghe.planoItens.map((item) => [
          bodyCell(ghe.nome),
          bodyCell(truncateText(item.risco, 65)),
          bodyCell(truncateText(item.classificacao, 24)),
          bodyCell(truncateText(item.tipoMedida || "-", 42)),
          bodyCell(truncateText(item.medidas, 125)),
          bodyCell(truncateText(item.prazoAcao || "-", 40), "tableBodyCellCenter"),
          bodyCell(truncateText(item.responsavelAcao || responsible || "-", 55)),
          bodyCell(truncateText(item.acompanhamento || "-", 62)),
          bodyCell(truncateText(item.afericaoResultado || "-", 62)),
        ])
      : [[bodyCell(ghe.nome), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell(truncateText(responsible || "-", 55)), bodyCell("-"), bodyCell("-")]];

  return {
    id,
    table: {
      widths: resolveRuntimeTableWidths(pdfLayout, "annex_plano", [
        52, 88, 50, 66, 150, 70, 85, 95, 85,
      ]),
      body: [
        [{ text: "Plano de Ação", style: "annexBarCell", colSpan: 9 }, {}, {}, {}, {}, {}, {}, {}, {}],
        [
          tealHeaderCell("GHE"),
          tealHeaderCell("Perigo ou Fator de Risco Ocupacional"),
          tealHeaderCell("Prioridade"),
          tealHeaderCell("Tipo de Medidas de Prevenção"),
          tealHeaderCell("Medidas de Prevenção"),
          tealHeaderCell("Prazo para Realização da Ação"),
          tealHeaderCell("Responsável pela Ação"),
          tealHeaderCell("Acompanhamentos das Medidas de Prevenção"),
          tealHeaderCell("Aferição de Resultados"),
        ],
        ...rows,
      ],
    },
    layout: ANNEX_TABLE_LAYOUT,
  };
}

function buildPortraitPage(
  content: Content,
  pageBreak: "before" | undefined,
): Content {
  return {
    pageOrientation: "portrait",
    pageBreak,
    pageSize: "A4",
    margin: [0, 0, 0, 0],
    stack: [content],
  };
}

function buildLandscapePage(
  content: Content,
  pageBreak: "before" | undefined,
): Content {
  return {
    pageOrientation: "landscape",
    pageBreak,
    pageSize: "A4",
    margin: [0, 0, 0, 0],
    stack: [content],
  };
}

function buildAnnexContent(snapshot: RuntimeSnapshot, pdfLayout?: PdfLayoutState): Content[] {
  const content: Content[] = [];

  content.push(...buildAnnexCover("A", "INVENTÁRIO DE RISCOS OCUPACIONAIS", "annex_a"));
  snapshot.ghes.forEach((ghe, index) => {
    const firstPageBreak = index === 0 ? undefined : "before";
    content.push(
      {
        pageOrientation: "portrait",
        pageSize: "A4",
        pageBreak: firstPageBreak,
        margin: [0, 0, 0, 0],
        stack: [buildAnnexAmbienteTable(ghe, index, pdfLayout)],
      },
      buildPortraitPage(buildAnnexAtividadeTable(ghe, index, pdfLayout), "before"),
      buildLandscapePage(
        buildAnnexReconhecimentoTable(ghe, index, pdfLayout),
        "before",
      ),
    );
  });

  content.push(
    { text: "", pageBreak: "before" },
    ...buildAnnexCover("B", "PLANO DE AÇÃO", "annex_b"),
  );
  snapshot.ghes.forEach((ghe, index) => {
    content.push(
      { text: "", pageBreak: index === 0 ? undefined : "before" },
      {
        pageOrientation: "portrait",
        pageSize: "A4",
        margin: [0, 0, 0, 0],
        stack: [
          buildAnnexPlanTable(
            ghe,
            snapshot.program.responsavelImplementacao,
            index === 0 ? "annex_b_table" : undefined,
            pdfLayout,
          ),
        ],
      },
    );
  });

  content.push(
    { text: "", pageBreak: "before" },
    ...buildAnnexCover("C", "ART – ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA", "annex_c"),
  );

  return content;
}

function buildBackCoverPage(visualAssets: RuntimeVisualAssets): Content[] {
  const backCoverBackground = visualAssets.pageBackground || visualAssets.coverBackground;

  if (backCoverBackground) {
    return [
      {
        text: "",
        pageOrientation: "portrait",
        pageBreak: "before",
        pageMargins: [0, 0, 0, 0],
      },
      {
        image: backCoverBackground,
        width: 595.28,
        height: 841.89,
        absolutePosition: { x: 0, y: 0 },
      },
    ];
  }

  return [
    {
      text: "",
      pageOrientation: "portrait",
      pageBreak: "before",
      pageMargins: [0, 0, 0, 0],
    },
    {
      canvas: [
        {
          type: "rect",
          x: 0,
          y: 0,
          w: 595.28,
          h: 841.89,
          color: "#F1F3F5",
        },
      ],
    },
    {
      text: "BR MED",
      style: "backCoverFallbackLogo",
      absolutePosition: { x: 0, y: 380 },
      width: 595.28,
      alignment: "center",
    },
    {
      text: "R. Beatriz Larragoiti Lucas, 121 - 5º andar\nCidade Nova, Rio de Janeiro - RJ, 20211-175\n+55 21 3175 0014",
      style: "backCoverAddress",
      alignment: "center",
      absolutePosition: { x: 0, y: 742 },
      width: 595.28,
    },
  ];
}

function buildStyles(): StyleDictionary {
  return {
    coverProgramName: {
      font: "WorkSansLight",
      color: COLORS.textStrong,
      fontSize: 30,
      lineHeight: 1.25,
    },
    coverMainTitle: {
      font: "WorkSansSemiBold",
      color: COLORS.textStrong,
      fontSize: 30,
    },
    coverSubtitle: {
      font: "WorkSansLight",
      color: COLORS.textStrong,
      fontSize: 18,
      lineHeight: 1.3,
    },
    coverMetaLabel: {
      font: "WorkSansLight",
      color: COLORS.textStrong,
      fontSize: 14,
    },
    coverMetaValue: {
      font: "WorkSansSemiBold",
      color: COLORS.textStrong,
      fontSize: 14,
    },
    sectionTitle: {
      font: "WorkSansMedium",
      color: COLORS.teal,
      fontSize: 20,
    },
    bodyParagraph: {
      font: "WorkSansLight",
      color: COLORS.text,
      fontSize: 12,
      lineHeight: 1.5,
    },
    bodyParagraphIntro: {
      font: "WorkSansLight",
      color: COLORS.text,
      fontSize: 12,
      lineHeight: 1.48,
      margin: [0, 0, 0, 5],
    },
    bodyParagraphLong: {
      font: "WorkSansLight",
      color: COLORS.text,
      fontSize: 12,
      lineHeight: 1.55,
    },
    bodySubheading: {
      font: "WorkSansMedium",
      color: COLORS.textStrong,
      fontSize: 11.6,
      lineHeight: 1.4,
    },
    bodyCapsTitleBlue: {
      font: "WorkSansSemiBold",
      color: COLORS.teal,
      fontSize: 11.8,
      lineHeight: 1.45,
    },
    bodyCapsInlineBlue: {
      font: "WorkSansSemiBold",
      color: COLORS.teal,
      fontSize: 11.4,
    },
    bodyBullet: {
      font: "WorkSansLight",
      color: COLORS.teal,
      fontSize: 12,
      lineHeight: 1.45,
      margin: [10, 0, 0, 5],
    },
    bodyBulletBlue: {
      font: "WorkSansLight",
      color: COLORS.text,
      fontSize: 12,
      lineHeight: 1.4,
      margin: [10, 0, 0, 4],
    },
    bulletGlyphBlue: {
      font: "WorkSansMedium",
      color: COLORS.teal,
      fontSize: 12,
      lineHeight: 1.4,
      alignment: "center",
    },
    bodyBulletAlpha: {
      font: "WorkSansLight",
      color: COLORS.text,
      fontSize: 12,
      lineHeight: 1.4,
    },
    bodyBulletAlphaPrefix: {
      font: "WorkSansMedium",
      color: COLORS.teal,
      fontSize: 12,
    },
    tocLine: {
      font: "WorkSansMedium",
      color: COLORS.textStrong,
      fontSize: 10,
      lineHeight: 1.12,
    },
    tocDots: {
      font: "WorkSansMedium",
      color: COLORS.textStrong,
      fontSize: 10,
      lineHeight: 1.12,
    },
    infoLabelCell: {
      font: "WorkSansLight",
      color: "#5A7082",
      fontSize: 10.5,
    },
    tableBodyCell: {
      font: "WorkSansLight",
      color: COLORS.text,
      fontSize: 10,
    },
    tableBodyCellCenter: {
      font: "WorkSansLight",
      color: COLORS.text,
      fontSize: 10,
      alignment: "center",
    },
    tealHeaderCell: {
      font: "WorkSansMedium",
      color: COLORS.white,
      fillColor: COLORS.teal,
      fontSize: 10,
      alignment: "center",
    },
    matrixHeaderCell: {
      font: "WorkSansMedium",
      color: COLORS.white,
      fillColor: COLORS.tealDark,
      fontSize: 10,
      alignment: "center",
    },
    matrixCellIrrelevante: {
      font: "WorkSansSemiBold",
      color: COLORS.white,
      fillColor: "#AAD1B4",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    matrixCellBaixo: {
      font: "WorkSansSemiBold",
      color: COLORS.white,
      fillColor: "#2CAD6E",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    matrixCellModerado: {
      font: "WorkSansSemiBold",
      color: COLORS.white,
      fillColor: "#D9BE53",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    matrixCellAlto: {
      font: "WorkSansSemiBold",
      color: COLORS.white,
      fillColor: "#CC851E",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    matrixCellCritico: {
      font: "WorkSansSemiBold",
      color: COLORS.white,
      fillColor: "#CC0000",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    matrixCellIrrelevanteRegular: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: "#AAD1B4",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    matrixCellBaixoRegular: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: "#2CAD6E",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    matrixCellModeradoRegular: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: "#D9BE53",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    matrixCellAltoRegular: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: "#CC851E",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    matrixCellCriticoRegular: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: "#CC0000",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    matrixAxisCell: {
      font: "WorkSansSemiBold",
      color: COLORS.white,
      fillColor: COLORS.teal,
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    matrixAxisCellRegular: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: COLORS.teal,
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    matrixAxisCellLarge: {
      font: "WorkSansMedium",
      color: COLORS.white,
      fillColor: COLORS.teal,
      fontSize: 12,
      alignment: "center",
      valign: "middle",
    },
    matrixCaption: {
      font: "WorkSansLight",
      color: "#6E8090",
      fontSize: 9.2,
      lineHeight: 1.35,
      margin: [0, 6, 0, 0],
    },
    fixedTableHeaderCell: {
      font: "WorkSansMedium",
      color: COLORS.white,
      fillColor: COLORS.teal,
      fontSize: 10,
      alignment: "center",
    },
    fixedTableHeaderCellRegular: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: COLORS.teal,
      fontSize: 10,
      alignment: "center",
    },
    fixedTableBandCell: {
      font: "WorkSansMedium",
      color: COLORS.textStrong,
      fillColor: "#E8EFF4",
      fontSize: 10,
      alignment: "center",
    },
    fixedTableBodyCell: {
      font: "WorkSansLight",
      color: COLORS.text,
      fontSize: 10,
      lineHeight: 1.25,
    },
    tableBulletGlyph: {
      font: "WorkSansMedium",
      color: COLORS.teal,
      fontSize: 10,
      alignment: "center",
    },
    actionsBulletText: {
      font: "WorkSansLight",
      color: COLORS.text,
      fontSize: 10,
      lineHeight: 1.25,
    },
    riskLabelIrrelevante: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: "#AAD1B4",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    riskLabelBaixo: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: "#2CAD6E",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    riskLabelModerado: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: "#D9BE53",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    riskLabelAlto: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: "#CC851E",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    riskLabelCritico: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: "#CC0000",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    riskLabelActionIrrelevante: {
      font: "WorkSansLight",
      color: COLORS.textStrong,
      fillColor: "#AAD1B4",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    riskLabelActionBaixo: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: "#2CAD6E",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    riskLabelActionModerado: {
      font: "WorkSansLight",
      color: COLORS.textStrong,
      fillColor: "#D9BE53",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    riskLabelActionAlto: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: "#CC851E",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    riskLabelActionCritico: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: "#CC0000",
      fontSize: 10,
      alignment: "center",
      valign: "middle",
    },
    annexBarCell: {
      font: "WorkSansMedium",
      color: COLORS.white,
      fillColor: COLORS.tealDark,
      fontSize: 9.6,
      alignment: "center",
    },
    annexHeaderCell: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: COLORS.teal,
      fontSize: 9.3,
      alignment: "center",
    },
    annexLeftHeaderCell: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: COLORS.teal,
      fontSize: 9.3,
      alignment: "left",
    },
    annexCoverTitle: {
      font: "WorkSansSemiBold",
      color: COLORS.teal,
      fontSize: 30,
    },
    annexCoverSubtitle: {
      font: "WorkSansLight",
      color: COLORS.teal,
      fontSize: 30,
      lineHeight: 1.2,
    },
    headerLeftCell: {
      font: "WorkSansLight",
      color: COLORS.textStrong,
      fontSize: 9.2,
    },
    headerRightCell: {
      font: "WorkSansLight",
      color: COLORS.textStrong,
      fontSize: 9.2,
      alignment: "left",
    },
    headerLabelRun: {
      font: "WorkSansMedium",
      color: COLORS.textStrong,
      fontSize: 9.2,
    },
    headerValueRun: {
      font: "WorkSansLight",
      color: COLORS.textStrong,
      fontSize: 9.2,
    },
    footerPageNumber: {
      font: "WorkSansMedium",
      color: COLORS.textStrong,
      fontSize: 10,
    },
    signatureLine: {
      font: "WorkSansLight",
      color: COLORS.textStrong,
      fontSize: 11,
      alignment: "center",
    },
    signatureName: {
      font: "WorkSansMedium",
      color: COLORS.textStrong,
      fontSize: 11,
      alignment: "center",
      margin: [0, 4, 0, 1],
    },
    signatureRole: {
      font: "WorkSansLight",
      color: COLORS.text,
      fontSize: 10.5,
      alignment: "center",
    },
    backCoverAddress: {
      font: "WorkSansLight",
      color: "#6E8090",
      fontSize: 11.5,
      lineHeight: 1.25,
    },
    backCoverFallbackLogo: {
      font: "WorkSansSemiBold",
      color: COLORS.textStrong,
      fontSize: 28,
    },
  };
}

export function buildRuntimeDocDefinition(
  snapshot: RuntimeSnapshot,
  visualAssets: RuntimeVisualAssets = {},
  layout?: LayoutContext,
  pdfLayout?: PdfLayoutState,
): any {
  const content: Content[] = [
    ...buildCoverPage(snapshot),
    ...buildUpdatePage(snapshot, pdfLayout),
    ...buildSummaryPage(layout),
    ...buildIdentificationAndProgramPages(snapshot, pdfLayout),
    ...buildNarrativeCoreAndAnnexIndex(snapshot, visualAssets, pdfLayout),
    ...buildAnnexContent(snapshot, pdfLayout),
    ...buildBackCoverPage(visualAssets),
  ];

  return {
    info: {
      title: `PGR ${snapshot.company.name}`,
      author: "Sistema PGR",
      subject: "Programa de Gerenciamento de Riscos",
      creator: "PGR Frontend",
      producer: "pdfmake runtime engine",
      keywords: `PGR, ${snapshot.meta.pgrId}`,
    },
    pageSize: "A4",
    pageMargins: [40, 96, 40, 36],
    defaultStyle: {
      font: "WorkSansLight",
      fontSize: 10,
      color: COLORS.text,
      lineHeight: 1.3,
    },
    background: (currentPage: number, pageSize: { width: number; height: number }) => {
      if (currentPage !== 1 || !visualAssets.coverBackground) return null;

      return [
        {
          canvas: [
            {
              type: "rect",
              x: 0,
              y: 0,
              w: pageSize.width,
              h: pageSize.height,
              color: "#F1F3F5",
            },
          ],
        },
        {
          image: visualAssets.coverBackground,
          width: pageSize.width,
          height: pageSize.height,
          absolutePosition: { x: 0, y: 0 },
        },
      ];
    },
    header: (currentPage: number, pageCount: number) => {
      if (currentPage === 1 || currentPage === pageCount) return null;

      const headerCompanyName = truncateHeaderField(snapshot.company.name, 52);
      const headerEstablishmentName = truncateHeaderField(snapshot.establishment.name, 50);

      return {
        margin: [40, 46, 40, 6],
        table: {
          widths: resolveRuntimeTableWidths(pdfLayout, "header_main", [67, 33]),
          body: [
                [
                  {
                    text: [
                      { text: "Empresa: ", style: "headerLabelRun" },
                      { text: headerCompanyName, style: "headerValueRun" },
                    ],
                    style: "headerLeftCell",
                    noWrap: true,
                  },
                  {
                    text: [
                      { text: "ANL: ", style: "headerLabelRun" },
                      { text: snapshot.meta.anl || "01", style: "headerValueRun" },
                    ],
                    style: "headerRightCell",
                    noWrap: true,
                  },
                ],
                [
                  {
                    text: [
                      { text: "Estabelecimento: ", style: "headerLabelRun" },
                      { text: headerEstablishmentName, style: "headerValueRun" },
                    ],
                    style: "headerLeftCell",
                    noWrap: true,
                  },
                  { text: "", style: "headerRightCell" },
                ],
              ],
        },
        layout: HEADER_TABLE_LAYOUT,
      };
    },
    footer: (currentPage: number, pageCount: number) => {
      if (currentPage === 1 || currentPage === pageCount) return null;

      return {
        margin: [40, 0, 40, 22],
        columns: [
          { width: "*", text: "" },
          visualAssets.brandLogo
            ? {
                image: visualAssets.brandLogo,
                width: 110,
                alignment: "center",
                relativePosition: { x: 0, y: -4 },
              }
            : {
                width: "auto",
                text: "BR MED",
                style: "footerPageNumber",
                alignment: "center",
                relativePosition: { x: 0, y: -4 },
              },
          {
            width: "*",
            text: String(currentPage),
            style: "footerPageNumber",
            alignment: "right",
            relativePosition: { x: 0, y: -2 },
          },
        ],
      };
    },
    styles: buildStyles(),
    content,
  };
}
