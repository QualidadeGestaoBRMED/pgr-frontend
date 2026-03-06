import type { RuntimeGhe, RuntimeSnapshot } from "./snapshot";
import type { RuntimeVisualAssets } from "./assets";
import { FIXED_SECTIONS_5_TO_18 } from "./fixed-sections";
import { SECTION_14_TABLES, SECTION_15_TABLES, type FixedRuntimeTable } from "./fixed-risk-tables";

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

function truncateText(value: unknown, maxLength = 260) {
  const text = sanitizeText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function toUpper(value: unknown) {
  return sanitizeText(value).toLocaleUpperCase("pt-BR");
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

function sectionTitle(value: string, id?: string): Content {
  return { text: value, style: "sectionTitle", margin: [0, 16, 0, 8], id };
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

function buildSection14Graphics(): Content[] {
  const content: Content[] = [];

  SECTION_14_TABLES.forEach((table, index) => {
    content.push(buildFixedRuntimeTable(table, index > 0));
  });

  return content;
}

function buildSection15Tables(): Content[] {
  const content: Content[] = [];
  SECTION_15_TABLES.forEach((table, index) => {
    content.push(buildFixedRuntimeTable(table, index > 0));
  });
  return content;
}

function resolveFixedTableWidths(cols: number): Array<number | string> {
  if (cols === 2) return [120, "*"];
  if (cols === 3) return [42, 72, "*"];
  if (cols === 4) return [36, 70, "*", "*"];
  if (cols === 7) return [30, 54, "*", 56, 56, 56, 56];
  if (cols === 8) return [84, 32, 68, "*", "*", "*", "*", "*"];
  return new Array(cols).fill("*");
}

function buildFixedRuntimeTable(table: FixedRuntimeTable, pageBreakBefore = false): Content {
  const isMatrixTable = table.cols === 8 && table.rows[0]?.[0] === "Gradação do Risco";

  const resolveMatrixCellStyle = (value: string): string | null => {
    const normalized = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!normalized) return null;
    if (normalized.includes("irrelevante") || normalized.includes("nenhuma acao")) return "matrixCellIrrelevante";
    if (normalized.includes("prioridade baixa") || normalized.includes("risco baixo")) return "matrixCellBaixo";
    if (normalized.includes("prioridade media") || normalized.includes("risco moderado") || normalized.includes("moderado"))
      return "matrixCellModerado";
    if (normalized.includes("prioridade alta") || normalized.includes("risco alto") || normalized.includes("alto"))
      return "matrixCellAlto";
    if (normalized.includes("acoes imediatas") || normalized.includes("risco critico") || normalized.includes("critico"))
      return "matrixCellCritico";
    return null;
  };

  const body: TableCell[][] = table.rows.map((row, rowIndex) => {
    const nonEmptyIndexes = row
      .map((cell, i) => ({ cell: sanitizeText(cell), i }))
      .filter((item) => item.cell.length > 0);

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

      if (isMatrixTable && rowIndex >= 1 && rowIndex <= 5 && colIndex >= 3 && colIndex <= 7) {
        const matrixStyle = resolveMatrixCellStyle(text);
        if (matrixStyle) style = matrixStyle;
      }

      return { text, style };
    });
  });

  return {
    table: {
      headerRows: 1,
      widths: resolveFixedTableWidths(table.cols),
      body,
    },
    layout: THIN_TABLE_LAYOUT,
    margin: [0, pageBreakBefore ? 8 : 2, 0, 10],
    pageBreak: pageBreakBefore ? "before" : undefined,
  };
}

const THIN_TABLE_LAYOUT = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => COLORS.grid,
  vLineColor: () => COLORS.grid,
  paddingLeft: () => 5,
  paddingRight: () => 5,
  paddingTop: () => 4,
  paddingBottom: () => 4,
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
  return [
    {
      stack: [
        {
          text: "Programa de\nGerenciamento\nde Riscos",
          style: "coverProgramName",
          margin: [0, 272, 0, 34],
        },
        { text: "PGR - NR 01", style: "coverMainTitle", margin: [0, 0, 0, 34] },
        {
          text: "Portaria nº 1.419, de 24 de Agosto de 2024\nInventário de Riscos e Plano de Ação",
          style: "coverSubtitle",
          margin: [0, 0, 0, 34],
        },
        {
          text: [
            { text: "Nome da Empresa: ", style: "coverMetaLabel" },
            { text: sanitizeText(snapshot.company.razaoSocial || snapshot.company.name), style: "coverMetaValue" },
            { text: "\n" },
            { text: "Estabelecimento: ", style: "coverMetaLabel" },
            { text: sanitizeText(snapshot.establishment.name), style: "coverMetaValue" },
          ],
          margin: [0, 0, 0, 30],
        },
        {
          text: [
            { text: "Vigência: ", style: "coverMetaLabel" },
            { text: sanitizeText(snapshot.program.vigencia || snapshot.meta.generatedDate), style: "coverMetaValue" },
          ],
        },
      ],
      margin: [0, 0, 0, 0],
    },
    { text: "", pageBreak: "after" },
  ];
}

function buildUpdatePage(snapshot: RuntimeSnapshot): Content[] {
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
        widths: [80, "*", 100],
        body: [
          [tealHeaderCell("Alteração"), tealHeaderCell("Motivo da Revisão do PGR"), tealHeaderCell("Data")],
          [
            bodyCell("00", "tableBodyCellCenter"),
            bodyCell(snapshot.meta.revisionReason || "Elaboração inicial", "tableBodyCellCenter"),
            bodyCell(snapshot.meta.generatedDate, "tableBodyCellCenter"),
          ],
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
      label: "ANEXO B:\nDESCRIÇÃO DAS MEDIDAS DE PREVENÇÃO\nIMPLEMENTADAS",
      targetId: "annex_b",
      indent: 16,
    },
    {
      label: "ANEXO C:\nPLANO DE AÇÃO\n(MEDIDAS DE PREVENÇÃO INTRODUZIDAS E APRIMORADAS)",
      targetId: "annex_c",
      indent: 16,
    },
    { label: "ANEXO D:\nART – ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA", targetId: "annex_d", indent: 16 },
  ];

  return [
    {
      stack: tocEntries.map((entry) => buildDynamicTocLine(entry, layout)),
      margin: [0, 8, 0, 0],
    },
    { text: "", pageBreak: "after" },
  ];
}

function buildIdentificationAndProgramPages(snapshot: RuntimeSnapshot): Content[] {
  const commonInfoRows = (isCompany = true): TableCell[][] => {
    if (isCompany) {
      return [
        [infoLabelCell("Razão Social"), bodyCell(snapshot.company.razaoSocial || snapshot.company.name)],
        [infoLabelCell("CNPJ"), bodyCell(snapshot.company.cnpj)],
        [infoLabelCell("CNAE"), bodyCell(snapshot.company.cnae)],
        [infoLabelCell("Atividade Principal"), bodyCell(snapshot.company.atividadePrincipal)],
        [infoLabelCell("Grau de Risco (Quadro I da NR-04)"), bodyCell(snapshot.company.grauRisco)],
        [infoLabelCell("Endereço"), bodyCell(snapshot.company.enderecoCompleto)],
      ];
    }

    return [
      [infoLabelCell("Estabelecimento"), bodyCell(snapshot.establishment.name)],
      [infoLabelCell("CNPJ"), bodyCell(snapshot.establishment.cnpj)],
      [infoLabelCell("CNAE"), bodyCell(snapshot.establishment.cnae)],
      [infoLabelCell("Atividade Principal"), bodyCell(snapshot.establishment.atividadePrincipal)],
      [infoLabelCell("Grau de Risco (Quadro I da NR-04)"), bodyCell(snapshot.establishment.grauRisco)],
    ];
  };

  return [
    sectionTitle("1 - Identificação da Empresa", "sec_01"),
    {
      table: { widths: ["43%", "*"], body: commonInfoRows(true) },
      layout: THIN_TABLE_LAYOUT,
    },
    sectionTitle("2 - Identificação do Estabelecimento", "sec_02"),
    {
      table: { widths: ["43%", "*"], body: commonInfoRows(false) },
      layout: THIN_TABLE_LAYOUT,
    },
    sectionTitle("3 - Quantitativo Total de Empregados", "sec_03"),
    {
      table: {
        widths: ["43%", "*"],
        body: [[infoLabelCell("Quantitativo de empregados ativos"), bodyCell(String(snapshot.program.totalEmployees || 0))]],
      },
      layout: THIN_TABLE_LAYOUT,
    },
    { text: "", pageBreak: "after" },

    sectionTitle("4 - Dados do Programa", "sec_04"),
    {
      table: {
        widths: ["43%", "*"],
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

function buildNarrativeCoreAndAnnexIndex(snapshot: RuntimeSnapshot): Content[] {
  const content: Content[] = [];
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
    } else {
      let introBreakInserted = false;
      section.paragraphs.forEach((paragraph, index) => {
        const normalized = normalizeFixedText(paragraph);
        if (!normalized) return;

        // Seção 5: uma única quebra para equilibrar em 2 páginas sem encostar no rodapé.
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

    if (isSection14) {
      // garante que as tabelas da seção 14 sejam sempre renderizadas
      content.push({ text: "", pageBreak: "before" });
      content.push(...buildSection14Graphics());
    }

    if (isSection15) {
      // garante que as tabelas da seção 15 sejam sempre renderizadas
      content.push({ text: "", pageBreak: "before" });
      content.push(...buildSection15Tables());
    }

    if (isObjectiveSection) {
      content.push({ text: "", pageBreak: "after" });
    }
  });

  content.push(
    sectionTitle("19 - Índice de Anexos", "sec_19"),
    {
      table: {
        widths: [65, "*", 110],
        body: [
          [tealHeaderCell("Anexo"), tealHeaderCell("Título"), tealHeaderCell("Data da Inclusão")],
          [bodyCell("A"), bodyCell("INVENTÁRIO DE RISCOS OCUPACIONAIS"), bodyCell(snapshot.meta.generatedDate)],
          [bodyCell("B"), bodyCell("DESCRIÇÃO DAS MEDIDAS DE PREVENÇÃO IMPLEMENTADAS"), bodyCell(snapshot.meta.generatedDate)],
          [bodyCell("C"), bodyCell("PLANO DE AÇÃO"), bodyCell(snapshot.meta.generatedDate)],
          [bodyCell("D"), bodyCell("ART – ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA"), bodyCell(snapshot.meta.generatedDate)],
        ],
      },
      layout: THIN_TABLE_LAYOUT,
    },
    { text: "", pageBreak: "after" },
  );

  return content;
}

function buildAnnexCover(letter: "A" | "B" | "C" | "D", title: string, id?: string): Content[] {
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

function buildAnnexAmbienteTable(ghe: RuntimeGhe, index: number): Content {
  const ambienteRows =
    ghe.funcoes.length > 0
      ? ghe.funcoes.slice(0, 6).map((funcao) => [bodyCell(funcao.setor), bodyCell(truncateText(ghe.ambiente || funcao.descricaoAtividades, 220))])
      : [[bodyCell("-"), bodyCell(truncateText(ghe.ambiente, 220))]];

  return {
    table: {
      headerRows: 0,
      widths: [130, "*"],
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

function buildAnnexAtividadeTable(ghe: RuntimeGhe, index: number): Content {
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
      widths: [70, 90, "*", 95],
      body: [
        [{ text: `GHE ${index + 1} - Descrição de Atividade`, style: "annexBarCell", colSpan: 4 }, {}, {}, {}],
        [tealHeaderCell("Setor"), tealHeaderCell("Função"), tealHeaderCell("Descrição da Atividade"), tealHeaderCell("Total de Trabalhadores")],
        ...rows,
      ],
    },
    layout: ANNEX_TABLE_LAYOUT,
  };
}

function buildAnnexReconhecimentoTable(ghe: RuntimeGhe, index: number): Content {
  const rows =
    ghe.riscos.length > 0
      ? ghe.riscos.map((risk) => [
          bodyCell(truncateText(risk.tipoAgente, 24)),
          bodyCell(truncateText(risk.descricaoAgente, 38)),
          bodyCell(truncateText(risk.perigo, 32)),
          bodyCell(truncateText(risk.meioPropagacao, 30)),
          bodyCell(truncateText(risk.perigo, 36)),
          bodyCell(truncateText(risk.fontes, 42)),
          bodyCell(truncateText(risk.tipoAvaliacao, 25)),
          bodyCell(truncateText(risk.intensidade, 26)),
          bodyCell(""),
          bodyCell(""),
          bodyCell(truncateText(risk.severidade, 22)),
          bodyCell(truncateText(risk.probabilidade, 24)),
          bodyCell(truncateText(risk.classificacao, 24)),
        ])
      : [[bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-")]];

  return {
    table: {
      widths: [33, 38, 32, 36, 33, 40, 31, 36, 29, 28, 30, 33, 34],
      body: [
        [{ text: `GHE ${index + 1} - Reconhecimento dos Riscos Ocupacionais`, style: "annexBarCell", colSpan: 13 }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
        [
          { text: "Análise dos Perigos", style: "annexHeaderCell", colSpan: 6, alignment: "center" },
          {},
          {},
          {},
          {},
          {},
          { text: "Monitoramento das Exposições", style: "annexHeaderCell", colSpan: 4, alignment: "center" },
          {},
          {},
          {},
          { text: "Avaliação do Risco", style: "annexHeaderCell", colSpan: 3, alignment: "center" },
          {},
          {},
        ],
        [
          tealHeaderCell("Tipo de Agente"),
          tealHeaderCell("Descrição do Agente"),
          tealHeaderCell("Perigo"),
          tealHeaderCell("Meio de Propagação"),
          tealHeaderCell("Possíveis lesões e agravos à Saúde"),
          tealHeaderCell("Fontes ou Circunstâncias"),
          tealHeaderCell("Tipo de Avaliação"),
          tealHeaderCell("Intensidade/Concentração"),
          tealHeaderCell("Limite de Tolerância"),
          tealHeaderCell("Unidade de Medida"),
          tealHeaderCell("Severidade"),
          tealHeaderCell("Probabilidade"),
          tealHeaderCell("Classificação de Risco"),
        ],
        ...rows,
      ],
    },
    layout: ANNEX_TABLE_LAYOUT,
    fontSize: 7.2,
  };
}

function buildAnnexMeasuresTable(ghe: RuntimeGhe, id?: string): Content {
  const rows =
    ghe.riscos.length > 0
      ? ghe.riscos.map((risk) => [
          bodyCell(ghe.nome),
          bodyCell(truncateText(risk.descricaoAgente || risk.perigo, 55)),
          bodyCell(truncateText(risk.medidasControle, 120)),
          bodyCell(truncateText(risk.epc.join("; "), 55)),
          bodyCell(truncateText(risk.epi.join("; "), 55)),
        ])
      : [[bodyCell(ghe.nome), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-")]];

  return {
    id,
    table: {
      widths: [72, 85, "*", 85, 85],
      body: [
        [{ text: "Medidas de Prevenção Implantadas", style: "annexBarCell", colSpan: 5 }, {}, {}, {}, {}],
        [
          tealHeaderCell("GHE"),
          tealHeaderCell("Descrição Agente de Risco"),
          tealHeaderCell("Descrição das Medidas de Controle Administrativas e/ou Engenharia"),
          tealHeaderCell("EPC"),
          tealHeaderCell("EPI"),
        ],
        ...rows,
      ],
    },
    layout: ANNEX_TABLE_LAYOUT,
  };
}

function buildAnnexPlanTable(ghe: RuntimeGhe, responsible: string, id?: string): Content {
  const rows =
    ghe.planoItens.length > 0
      ? ghe.planoItens.map((item) => [
          bodyCell(ghe.nome),
          bodyCell(truncateText(item.risco, 65)),
          bodyCell(truncateText(item.classificacao, 24)),
          bodyCell(truncateText(item.medidas, 125)),
          bodyCell(truncateText(responsible, 55)),
          bodyCell("Pendente"),
        ])
      : [[bodyCell(ghe.nome), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell(truncateText(responsible, 55)), bodyCell("Pendente")]];

  return {
    id,
    table: {
      widths: [65, 95, 54, "*", 90, 70],
      body: [
        [{ text: "Plano de Ação", style: "annexBarCell", colSpan: 6 }, {}, {}, {}, {}, {}],
        [
          tealHeaderCell("GHE"),
          tealHeaderCell("Perigo/Fator de Risco"),
          tealHeaderCell("Prioridade"),
          tealHeaderCell("Medidas de Prevenção/Ação"),
          tealHeaderCell("Responsável"),
          tealHeaderCell("Status"),
        ],
        ...rows,
      ],
    },
    layout: ANNEX_TABLE_LAYOUT,
  };
}

function buildLandscapePage(content: Content, pageBreak: "before" | undefined): Content {
  return {
    pageOrientation: "landscape",
    pageBreak,
    margin: [0, 0, 0, 0],
    stack: [content],
  };
}

function buildAnnexContent(snapshot: RuntimeSnapshot): Content[] {
  const content: Content[] = [];

  content.push(...buildAnnexCover("A", "INVENTÁRIO DE RISCOS OCUPACIONAIS", "annex_a"));
  snapshot.ghes.forEach((ghe, index) => {
    const firstPageBreak = index === 0 ? undefined : "before";
    content.push(
      buildLandscapePage(buildAnnexAmbienteTable(ghe, index), firstPageBreak),
      buildLandscapePage(buildAnnexAtividadeTable(ghe, index), "before"),
      buildLandscapePage(buildAnnexReconhecimentoTable(ghe, index), "before"),
    );
  });

  content.push(
    { text: "", pageOrientation: "portrait", pageBreak: "before" },
    ...buildAnnexCover("B", "DESCRIÇÃO DAS MEDIDAS DE PREVENÇÃO IMPLEMENTADAS", "annex_b"),
  );
  snapshot.ghes.forEach((ghe, index) => {
    content.push(
      { text: "", pageBreak: index === 0 ? undefined : "before" },
      buildAnnexMeasuresTable(ghe, index === 0 ? "annex_b_table" : undefined),
    );
  });

  content.push(
    { text: "", pageBreak: "before" },
    ...buildAnnexCover("C", "PLANO DE AÇÃO", "annex_c"),
  );
  snapshot.ghes.forEach((ghe, index) => {
    content.push(
      { text: "", pageBreak: index === 0 ? undefined : "before" },
      buildAnnexPlanTable(
        ghe,
        snapshot.program.responsavelImplementacao,
        index === 0 ? "annex_c_table" : undefined,
      ),
    );
  });

  content.push(
    { text: "", pageBreak: "before" },
    ...buildAnnexCover("D", "ART – ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA", "annex_d"),
  );
  content.push({
    table: {
      widths: [85, "*", 90],
      body: [
        [tealHeaderCell("Anexo"), tealHeaderCell("Descrição"), tealHeaderCell("Status")],
        [
          bodyCell("ART"),
          bodyCell("Documento técnico de responsabilidade"),
          bodyCell(snapshot.annexes.hasArtAnexo ? "Incluído" : "Não incluído"),
        ],
      ],
    },
    layout: THIN_TABLE_LAYOUT,
  });

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
      lineHeight: 1.55,
    },
    bodyParagraphIntro: {
      font: "WorkSansLight",
      color: COLORS.text,
      fontSize: 12,
      lineHeight: 1.55,
      margin: [0, 0, 0, 7],
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
      lineHeight: 1.45,
      margin: [10, 0, 0, 5],
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
      lineHeight: 1.45,
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
      fontSize: 9,
      alignment: "center",
    },
    matrixAxisCell: {
      font: "WorkSansMedium",
      color: COLORS.textStrong,
      fillColor: "#E8EFF4",
      fontSize: 9,
      alignment: "center",
    },
    matrixCellIrrelevante: {
      font: "WorkSansMedium",
      color: "#1E4E2C",
      fillColor: "#D9F2D9",
      fontSize: 8.6,
      alignment: "center",
    },
    matrixCellBaixo: {
      font: "WorkSansMedium",
      color: "#2F5C24",
      fillColor: "#BEE8B3",
      fontSize: 8.6,
      alignment: "center",
    },
    matrixCellModerado: {
      font: "WorkSansMedium",
      color: "#6A4A00",
      fillColor: "#FFE28A",
      fontSize: 8.6,
      alignment: "center",
    },
    matrixCellAlto: {
      font: "WorkSansMedium",
      color: "#6B2E00",
      fillColor: "#FFC18A",
      fontSize: 8.6,
      alignment: "center",
    },
    matrixCellCritico: {
      font: "WorkSansMedium",
      color: "#8B1C1C",
      fillColor: "#F8A7A7",
      fontSize: 8.6,
      alignment: "center",
    },
    fixedTableHeaderCell: {
      font: "WorkSansMedium",
      color: COLORS.white,
      fillColor: COLORS.teal,
      fontSize: 8.7,
      alignment: "center",
    },
    fixedTableBandCell: {
      font: "WorkSansMedium",
      color: COLORS.textStrong,
      fillColor: "#E8EFF4",
      fontSize: 8.7,
      alignment: "center",
    },
    fixedTableBodyCell: {
      font: "WorkSansLight",
      color: COLORS.text,
      fontSize: 8.5,
      lineHeight: 1.25,
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
      font: "WorkSansMedium",
      color: COLORS.teal,
      fontSize: 52,
    },
    annexCoverSubtitle: {
      font: "WorkSansLight",
      color: COLORS.teal,
      fontSize: 56,
      lineHeight: 1.15,
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
): any {
  const content: Content[] = [
    ...buildCoverPage(snapshot),
    ...buildUpdatePage(snapshot),
    ...buildSummaryPage(layout),
    ...buildIdentificationAndProgramPages(snapshot),
    ...buildNarrativeCoreAndAnnexIndex(snapshot),
    ...buildAnnexContent(snapshot),
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

      return {
        margin: [40, 46, 40, 6],
        table: {
          widths: ["67%", "33%"],
          body: [
            [
              {
                text: [
                  { text: "Empresa: ", style: "headerLabelRun" },
                  { text: snapshot.company.name, style: "headerValueRun" },
                ],
                style: "headerLeftCell",
              },
              { text: `ANL: ${snapshot.meta.anl || "01"}`, style: "headerRightCell" },
            ],
            [
              {
                text: [
                  { text: "Estabelecimento: ", style: "headerLabelRun" },
                  { text: snapshot.establishment.name, style: "headerValueRun" },
                ],
                style: "headerLeftCell",
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
