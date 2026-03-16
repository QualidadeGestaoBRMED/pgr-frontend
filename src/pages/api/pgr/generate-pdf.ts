import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import fs from "fs/promises";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import { ensureRuntimeFontsFromTemplate, getRuntimeFontDefinitions } from "@/lib/pgr-pdf-runtime/fonts";
import { buildRuntimeSnapshot } from "@/lib/pgr-pdf-runtime/snapshot";
import { resolveRuntimeTemplate } from "@/lib/pgr-pdf-runtime/template-registry";
import { ensureRuntimeVisualAssetsFromTemplate } from "@/lib/pgr-pdf-runtime/assets";

const TEMPLATE_FILE_NAME = "Modelo de PGR.docx";
const PdfPrinter = require("pdfmake");
const PdfKit = require("pdfkit");

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const ANNEX_TITLE_COLOR = rgb(0, 0.45, 0.52);
const ANNEX_COVER_FONT_SIZE = 30;
const ANNEX_COVER_LEFT = 40;
const ANNEX_COVER_TOP = 96 + 165;
const ANNEX_COVER_TITLE_GAP = 22;
const ANNEX_COVER_MAX_WIDTH = A4_WIDTH - ANNEX_COVER_LEFT * 2;
const HEADER_TEXT_COLOR = rgb(0.098, 0.231, 0.31);
const HEADER_VALUE_COLOR = rgb(0.098, 0.231, 0.31);
const HEADER_BORDER_COLOR = rgb(0.953, 0.953, 0.953);
const FOOTER_TEXT_COLOR = rgb(0.55, 0.55, 0.55);
const GRID_COLOR = rgb(0.84, 0.87, 0.89);
const TEXT_STRONG = rgb(0.098, 0.231, 0.31);

type AnnexFile = { id: string; nome: string };
type AnnexItem = { id: string; titulo: string; arquivos: AnnexFile[] };

const RUNTIME_COLORS = {
  text: "#434343",
  textStrong: "#193B4F",
  teal: "#007891",
  grid: "#F3F3F3",
};

const HEADER_SHELL_WIDTH = A4_WIDTH - 80;
const HEADER_SHELL_HEIGHT = 38;
const HEADER_SHELL_LEFT_WIDTH = HEADER_SHELL_WIDTH * 0.67;
const HEADER_SHELL_RIGHT_X = 40 + HEADER_SHELL_LEFT_WIDTH + 5;

function sanitizeText(value: unknown) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
}

function resolveBackendBaseUrl() {
  return (
    process.env.BACKEND_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://127.0.0.1:8001"
  ).replace(/\/$/, "");
}

function isArtAnnex(title: string) {
  return /\bart\b/i.test(title) || /responsabilidade\s*t[ée]cnica/i.test(title);
}

function sortAnnexItems(items: AnnexItem[]) {
  const artItems = items.filter((item) => isArtAnnex(item.titulo));
  const otherItems = items
    .filter((item) => !isArtAnnex(item.titulo))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR", { sensitivity: "base" }));

  return { artItems, otherItems };
}

function buildAnnexLabel(letter: string) {
  return `ANEXO ${letter}:`;
}

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], data: Buffer.from(match[2], "base64") };
}

type AnnexHeaderFooterOptions = {
  pdfDoc: PDFDocument;
  companyName: string;
  establishmentName: string;
  anl: string;
  brandLogo?: string;
  fontLight: any;
  fontMedium: any;
  pageNumber?: number;
};

type AnnexCoverOptions = {
  label: string;
  title: string;
  fontLight: any;
  fontSemiBold: any;
};

function drawAnnexCover(page: any, options: AnnexCoverOptions) {
  const labelY = A4_HEIGHT - ANNEX_COVER_TOP - ANNEX_COVER_FONT_SIZE;
  const titleY = labelY - ANNEX_COVER_TITLE_GAP - ANNEX_COVER_FONT_SIZE;

  page.drawText(options.label, {
    x: ANNEX_COVER_LEFT,
    y: labelY,
    size: ANNEX_COVER_FONT_SIZE,
    font: options.fontSemiBold,
    color: ANNEX_TITLE_COLOR,
  });
  page.drawText(options.title, {
    x: ANNEX_COVER_LEFT,
    y: titleY,
    size: ANNEX_COVER_FONT_SIZE,
    font: options.fontLight,
    color: ANNEX_TITLE_COLOR,
    maxWidth: ANNEX_COVER_MAX_WIDTH,
    lineHeight: ANNEX_COVER_FONT_SIZE * 1.2,
  });
}

async function drawAnnexHeaderFooter(page: any, options: AnnexHeaderFooterOptions) {
  const headerLeftX = 40;
  const headerTop = A4_HEIGHT - 46;
  const footerY = 34;
  const tableWidth = A4_WIDTH - 80;
  const leftColWidth = tableWidth * 0.67;
  const tableHeight = 34;
  const tableTop = headerTop;
  const tableBottom = headerTop - tableHeight;
  const midLine = tableTop - tableHeight / 2;
  const cellPaddingX = 5;
  const cellPaddingY = 4;
  const fontSize = 9.2;

  const companyLabel = "Empresa: ";
  const anlLabel = "ANL: ";
  const establishmentLabel = "Estabelecimento: ";

  page.drawRectangle({
    x: headerLeftX,
    y: tableBottom,
    width: tableWidth,
    height: tableHeight,
    borderColor: HEADER_BORDER_COLOR,
    borderWidth: 0.5,
  });
  page.drawLine({
    start: { x: headerLeftX + leftColWidth, y: tableBottom },
    end: { x: headerLeftX + leftColWidth, y: tableTop },
    thickness: 0.5,
    color: HEADER_BORDER_COLOR,
  });
  page.drawLine({
    start: { x: headerLeftX, y: midLine },
    end: { x: headerLeftX + tableWidth, y: midLine },
    thickness: 0.5,
    color: HEADER_BORDER_COLOR,
  });

  const row1Y = tableTop - cellPaddingY - fontSize;
  const row2Y = row1Y - (tableHeight / 2);

  page.drawText(companyLabel, {
    x: headerLeftX + cellPaddingX,
    y: row1Y,
    size: fontSize,
    font: options.fontMedium,
    color: HEADER_TEXT_COLOR,
  });
  const companyLabelWidth = options.fontMedium.widthOfTextAtSize(companyLabel, fontSize);
  page.drawText(options.companyName, {
    x: headerLeftX + cellPaddingX + companyLabelWidth,
    y: row1Y,
    size: fontSize,
    font: options.fontLight,
    color: HEADER_VALUE_COLOR,
  });
  page.drawText(anlLabel, {
    x: headerLeftX + leftColWidth + cellPaddingX,
    y: row1Y,
    size: fontSize,
    font: options.fontMedium,
    color: HEADER_VALUE_COLOR,
  });
  const anlLabelWidth = options.fontMedium.widthOfTextAtSize(anlLabel, fontSize);
  page.drawText(options.anl || "01", {
    x: headerLeftX + leftColWidth + cellPaddingX + anlLabelWidth,
    y: row1Y,
    size: fontSize,
    font: options.fontLight,
    color: HEADER_VALUE_COLOR,
  });
  page.drawText(establishmentLabel, {
    x: headerLeftX + cellPaddingX,
    y: row2Y,
    size: fontSize,
    font: options.fontMedium,
    color: HEADER_TEXT_COLOR,
  });
  const establishmentLabelWidth = options.fontMedium.widthOfTextAtSize(establishmentLabel, fontSize);
  page.drawText(options.establishmentName, {
    x: headerLeftX + cellPaddingX + establishmentLabelWidth,
    y: row2Y,
    size: fontSize,
    font: options.fontLight,
    color: HEADER_VALUE_COLOR,
  });

  if (options.brandLogo) {
    const decoded = decodeDataUrl(options.brandLogo);
    if (decoded?.data) {
      const image =
        decoded.mime === "image/jpeg"
          ? await options.pdfDoc.embedJpg(decoded.data)
          : await options.pdfDoc.embedPng(decoded.data);
      const targetWidth = 110;
      const scale = targetWidth / image.width;
      const targetHeight = image.height * scale;
      page.drawImage(image, {
        x: (A4_WIDTH - targetWidth) / 2,
        y: footerY - 6,
        width: targetWidth,
        height: targetHeight,
      });
    }
  } else {
    const fallbackText = "BR MED";
    const fallbackWidth = options.fontMedium.widthOfTextAtSize(fallbackText, 10);
    page.drawText(fallbackText, {
      x: (A4_WIDTH - fallbackWidth) / 2,
      y: footerY,
      size: 10,
      font: options.fontMedium,
      color: TEXT_STRONG,
    });
  }

  if (options.pageNumber) {
    const pageText = String(options.pageNumber);
    const pageWidth = options.fontMedium.widthOfTextAtSize(pageText, 10);
    page.drawText(pageText, {
      x: headerLeftX + tableWidth - pageWidth,
      y: footerY,
      size: 10,
      font: options.fontMedium,
      color: TEXT_STRONG,
    });
  }

}

async function buildAnnexTitlePage(options: {
  label: string;
  title: string;
  companyName: string;
  establishmentName: string;
  anl: string;
  brandLogo?: string;
  fontLightPath: string;
  fontMediumPath: string;
  fontSemiBoldPath: string;
  pageNumber?: number;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const [fontLightBytes, fontMediumBytes, fontSemiBoldBytes] = await Promise.all([
    fs.readFile(options.fontLightPath),
    fs.readFile(options.fontMediumPath),
    fs.readFile(options.fontSemiBoldPath),
  ]);
  const fontLight = await pdfDoc.embedFont(fontLightBytes);
  const fontMedium = await pdfDoc.embedFont(fontMediumBytes);
  const fontSemiBold = await pdfDoc.embedFont(fontSemiBoldBytes);

  await drawAnnexHeaderFooter(page, {
    pdfDoc,
    companyName: options.companyName,
    establishmentName: options.establishmentName,
    anl: options.anl,
    brandLogo: options.brandLogo,
    fontLight,
    fontMedium,
    pageNumber: options.pageNumber,
  });

  drawAnnexCover(page, {
    label: options.label,
    title: options.title,
    fontLight,
    fontSemiBold,
  });

  return pdfDoc.save();
}

function buildAnnexShellDefinition(options: {
  companyName: string;
  establishmentName: string;
  anl: string;
  pageNumber: number;
  brandLogo?: string;
  label?: string;
  title?: string;
}) {
  const content = options.label && options.title
    ? [
        {
          stack: [
            { text: options.label, style: "annexCoverTitle", margin: [0, 165, 0, 6] },
            { text: options.title, style: "annexCoverSubtitle" },
          ],
          margin: [0, 0, 0, 0],
        },
      ]
    : [{ text: "" }];

  return {
    pageSize: "A4",
    pageMargins: [40, 96, 40, 36],
    defaultStyle: {
      font: "WorkSansLight",
      fontSize: 10,
      color: RUNTIME_COLORS.text,
      lineHeight: 1.3,
    },
    content,
    styles: {
      annexCoverTitle: {
        font: "WorkSansSemiBold",
        color: RUNTIME_COLORS.teal,
        fontSize: 30,
      },
      annexCoverSubtitle: {
        font: "WorkSansLight",
        color: RUNTIME_COLORS.teal,
        fontSize: 30,
        lineHeight: 1.2,
      },
      headerLeftCell: {
        font: "WorkSansLight",
        color: RUNTIME_COLORS.textStrong,
        fontSize: 9.2,
      },
      headerRightCell: {
        font: "WorkSansLight",
        color: RUNTIME_COLORS.textStrong,
        fontSize: 9.2,
        alignment: "left",
      },
      headerLabelRun: {
        font: "WorkSansMedium",
        color: RUNTIME_COLORS.textStrong,
        fontSize: 9.2,
      },
      headerValueRun: {
        font: "WorkSansLight",
        color: RUNTIME_COLORS.textStrong,
        fontSize: 9.2,
      },
      footerPageNumber: {
        font: "WorkSansMedium",
        color: RUNTIME_COLORS.textStrong,
        fontSize: 10,
      },
    },
    header: [
      {
        absolutePosition: { x: 40, y: 46 },
        canvas: [
          {
            type: "rect",
            x: 0,
            y: 0,
            w: HEADER_SHELL_WIDTH,
            h: HEADER_SHELL_HEIGHT,
            lineColor: RUNTIME_COLORS.grid,
            lineWidth: 0.5,
          },
          {
            type: "line",
            x1: HEADER_SHELL_LEFT_WIDTH,
            y1: 0,
            x2: HEADER_SHELL_LEFT_WIDTH,
            y2: HEADER_SHELL_HEIGHT,
            lineColor: RUNTIME_COLORS.grid,
            lineWidth: 0.5,
          },
          {
            type: "line",
            x1: 0,
            y1: HEADER_SHELL_HEIGHT / 2,
            x2: HEADER_SHELL_WIDTH,
            y2: HEADER_SHELL_HEIGHT / 2,
            lineColor: RUNTIME_COLORS.grid,
            lineWidth: 0.5,
          },
        ],
      },
      {
        absolutePosition: { x: 45, y: 51 },
        text: [
          { text: "Empresa: ", style: "headerLabelRun" },
          { text: options.companyName, style: "headerValueRun" },
        ],
        style: "headerLeftCell",
      },
      {
        absolutePosition: { x: HEADER_SHELL_RIGHT_X, y: 51 },
        text: [
          { text: "ANL: ", style: "headerLabelRun" },
          { text: options.anl || "01", style: "headerValueRun" },
        ],
        style: "headerRightCell",
      },
      {
        absolutePosition: { x: 45, y: 70 },
        text: [
          { text: "Estabelecimento: ", style: "headerLabelRun" },
          { text: options.establishmentName, style: "headerValueRun" },
        ],
        style: "headerLeftCell",
      },
    ],
    footer: {
      margin: [40, 0, 40, 22],
      columns: [
        { width: "*", text: "" },
        options.brandLogo
          ? {
              image: options.brandLogo,
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
          text: String(options.pageNumber),
          style: "footerPageNumber",
          alignment: "right",
        },
      ],
    },
  };
}

async function buildAnnexShellPageBuffer(options: {
  fontDefinitions: any;
  companyName: string;
  establishmentName: string;
  anl: string;
  pageNumber: number;
  brandLogo?: string;
  label?: string;
  title?: string;
}) {
  return buildPdfBuffer(
    buildAnnexShellDefinition({
      companyName: options.companyName,
      establishmentName: options.establishmentName,
      anl: options.anl,
      pageNumber: options.pageNumber,
      brandLogo: options.brandLogo,
      label: options.label,
      title: options.title,
    }),
    options.fontDefinitions,
  );
}

async function mergeWithAnnexes(options: {
  basePdf: Buffer;
  fontDefinitions: any;
  annexItems: AnnexItem[];
  requestHeaders: NextApiRequest["headers"];
  pgrId: string;
  companyName: string;
  establishmentName: string;
  anl: string;
  brandLogo?: string;
}) {
  if (!options.annexItems.length) return options.basePdf;

  const baseDoc = await PDFDocument.load(options.basePdf);
  baseDoc.registerFontkit(fontkit);
  const lastIndex = baseDoc.getPageCount() - 1;
  let insertIndex = lastIndex > 0 ? lastIndex : baseDoc.getPageCount();

  const backendBase = resolveBackendBaseUrl();
  const headerCookie = options.requestHeaders.cookie;
  const frontendUsername = options.requestHeaders["x-frontend-username"];

  const { artItems, otherItems } = sortAnnexItems(options.annexItems);
  const orderedItems = [...artItems, ...otherItems].filter((item) => item.arquivos.length);
  if (!orderedItems.length) return options.basePdf;

  let letterCode = "E".charCodeAt(0);

  for (const item of orderedItems) {
    const letter = isArtAnnex(item.titulo) ? "D" : String.fromCharCode(letterCode++);
    const label = buildAnnexLabel(letter);
    if (!isArtAnnex(item.titulo)) {
      const titleText = item.titulo || "ANEXO";
      const pageNumber = insertIndex + 1;
      const shellBuffer = await buildAnnexShellPageBuffer({
        fontDefinitions: options.fontDefinitions,
        companyName: options.companyName,
        establishmentName: options.establishmentName,
        anl: options.anl,
        brandLogo: options.brandLogo,
        pageNumber,
        label,
        title: titleText,
      });
      const shellDoc = await PDFDocument.load(shellBuffer);
      const [shellPage] = await baseDoc.copyPages(shellDoc, [0]);
      baseDoc.insertPage(insertIndex, shellPage);
      insertIndex += 1;
    }

    for (const file of item.arquivos) {
      const url = `${backendBase}/api/frontend/pgr/${options.pgrId}/attachments/${file.id}/download`;
      const response = await fetch(url, {
        headers: {
          ...(headerCookie ? { cookie: headerCookie } : {}),
          ...(frontendUsername ? { "X-Frontend-Username": String(frontendUsername) } : {}),
        },
      });
      if (!response.ok) {
        continue;
      }
      const buffer = await response.arrayBuffer();
      const annexDoc = await PDFDocument.load(buffer);
      const annexIndices = annexDoc.getPageIndices();
      for (const annexIndex of annexIndices) {
        const [embedded] = await baseDoc.embedPages([annexDoc.getPage(annexIndex)]);
        const pageNumber = insertIndex + 1;
        const shellBuffer = await buildAnnexShellPageBuffer({
          fontDefinitions: options.fontDefinitions,
          companyName: options.companyName,
          establishmentName: options.establishmentName,
          anl: options.anl,
          brandLogo: options.brandLogo,
          pageNumber,
        });
        const shellDoc = await PDFDocument.load(shellBuffer);
        const [shellPage] = await baseDoc.copyPages(shellDoc, [0]);
        const page = baseDoc.insertPage(insertIndex, shellPage);

        const maxWidth = A4_WIDTH - 96;
        const maxHeight = A4_HEIGHT - 160;
        const scale = Math.min(maxWidth / embedded.width, maxHeight / embedded.height);
        const drawWidth = embedded.width * scale;
        const drawHeight = embedded.height * scale;
        const x = (A4_WIDTH - drawWidth) / 2;
        const y = 70 + (maxHeight - drawHeight) / 2;

        page.drawPage(embedded, { x, y, width: drawWidth, height: drawHeight });
        insertIndex += 1;
      }
    }
  }

  return Buffer.from(await baseDoc.save());
}

function buildFilename(baseName: string) {
  const cleaned = sanitizeText(baseName)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  return cleaned || "pgr";
}

async function buildPdfBuffer(definition: any, fonts: any): Promise<Buffer> {
  const printer = new PdfPrinter(fonts);
  const pdfDoc = printer.createPdfKitDocument(definition);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    pdfDoc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    pdfDoc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    pdfDoc.on("error", (error: Error) => {
      reject(error);
    });
    pdfDoc.end();
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const snapshot = buildRuntimeSnapshot(payload);
    const templatePath = path.join(process.cwd(), TEMPLATE_FILE_NAME);
    const [fontPaths, visualAssets] = await Promise.all([
      ensureRuntimeFontsFromTemplate(templatePath),
      ensureRuntimeVisualAssetsFromTemplate(templatePath),
    ]);
    const fontDefinitions = getRuntimeFontDefinitions(fontPaths);
    const measureDoc = new PdfKit({ size: "A4", margin: 0 });
    measureDoc.font(fontPaths.workSansMedium.normal).fontSize(10);
    const measureTextWidth = (text: string) => measureDoc.widthOfString(String(text || ""));
    const runtimeTemplate = resolveRuntimeTemplate(payload);
    const definition = runtimeTemplate.build(snapshot, visualAssets, {
      measureTextWidth,
      pageSize: { width: 595.28, height: 841.89 },
      pageMargins: [40, 96, 40, 36],
    });
    const pdfBuffer = await buildPdfBuffer(definition, fontDefinitions);
    const annexItems: AnnexItem[] = Array.isArray(payload?.anexos?.itens)
      ? payload.anexos.itens.map((item: any) => ({
          id: String(item?.id || ""),
          titulo: sanitizeText(item?.titulo),
          arquivos: Array.isArray(item?.arquivos)
            ? item.arquivos
                .map((file: any) => ({ id: String(file?.id || ""), nome: sanitizeText(file?.nome) }))
                .filter((file: AnnexFile) => file.id)
            : [],
        }))
      : [];
    const mergedPdf = await mergeWithAnnexes({
      basePdf: pdfBuffer,
      fontDefinitions,
      annexItems,
      requestHeaders: req.headers,
      pgrId: snapshot.meta.pgrId,
      companyName: snapshot.company.name,
      establishmentName: snapshot.establishment.name,
      anl: snapshot.meta.anl,
      brandLogo: visualAssets.brandLogo,
    });
    const filenameBase = buildFilename(snapshot.company.name || `pgr-${snapshot.meta.pgrId}`);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filenameBase}-pgr.pdf\"`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-PDF-Engine", "runtime-pdfmake-v1");
    res.setHeader("X-PDF-Schema", snapshot.schemaVersion);
    res.setHeader("X-PDF-Template", runtimeTemplate.id);
    return res.status(200).send(mergedPdf);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerar PDF";
    return res.status(500).json({
      message: "Falha ao gerar PDF via engine runtime.",
      details: message,
    });
  }
}
