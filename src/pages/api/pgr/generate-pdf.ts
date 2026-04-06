import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import fs from "fs/promises";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFEmbeddedPage, type PDFImage, type PDFPage, type PDFFont } from "pdf-lib";
import { ensureRuntimeFontsFromTemplate, getRuntimeFontDefinitions } from "@/lib/pgr-pdf-runtime/fonts";
import { buildRuntimeSnapshot } from "@/lib/pgr-pdf-runtime/snapshot";
import { resolveRuntimeTemplate } from "@/lib/pgr-pdf-runtime/template-registry";
import { ensureRuntimeVisualAssetsFromTemplate } from "@/lib/pgr-pdf-runtime/assets";
import { normalizePdfLayoutState } from "@/lib/pgr-pdf-runtime/layout";

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
const HEADER_BORDER_COLOR = rgb(0.839, 0.867, 0.89);
const FOOTER_TEXT_COLOR = rgb(0.55, 0.55, 0.55);
const GRID_COLOR = rgb(0.84, 0.87, 0.89);
const TEXT_STRONG = rgb(0.098, 0.231, 0.31);

type AnnexFile = { id: string; nome: string };
type AnnexItem = { id: string; titulo: string; arquivos: AnnexFile[] };
type AttachmentKind = "pdf" | "png" | "jpeg" | "unknown";

const RUNTIME_COLORS = {
  text: "#434343",
  textStrong: "#193B4F",
  teal: "#007891",
  grid: "#F3F3F3",
};

function sanitizeText(value: unknown) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
}

function truncateText(value: unknown, maxLength: number) {
  const text = sanitizeText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function fitTextByWidth(options: {
  text: string;
  font: PDFFont;
  size: number;
  maxWidth: number;
}) {
  const { font, size, maxWidth } = options;
  let text = sanitizeText(options.text);
  if (!text) return "";
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;

  while (text.length > 1) {
    text = text.slice(0, -1).trimEnd();
    const candidate = `${text}...`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      return candidate;
    }
  }
  return "...";
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

function detectAttachmentKind(data: Uint8Array): AttachmentKind {
  if (data.length >= 5) {
    const isPdf =
      data[0] === 0x25 && // %
      data[1] === 0x50 && // P
      data[2] === 0x44 && // D
      data[3] === 0x46 && // F
      data[4] === 0x2d; // -
    if (isPdf) return "pdf";
  }

  if (data.length >= 8) {
    const isPng =
      data[0] === 0x89 &&
      data[1] === 0x50 &&
      data[2] === 0x4e &&
      data[3] === 0x47 &&
      data[4] === 0x0d &&
      data[5] === 0x0a &&
      data[6] === 0x1a &&
      data[7] === 0x0a;
    if (isPng) return "png";
  }

  if (data.length >= 3) {
    const isJpeg = data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    if (isJpeg) return "jpeg";
  }

  return "unknown";
}

type AnnexHeaderFooterOptions = {
  pdfDoc: PDFDocument;
  companyName: string;
  establishmentName: string;
  anl: string;
  brandLogo?: string;
  fontLight: PDFFont;
  fontMedium: PDFFont;
  pageNumber?: number;
};

type AnnexCoverOptions = {
  label: string;
  title: string;
  fontLight: PDFFont;
  fontSemiBold: PDFFont;
};

function drawAnnexCover(page: PDFPage, options: AnnexCoverOptions) {
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

async function drawAnnexHeaderFooter(page: PDFPage, options: AnnexHeaderFooterOptions) {
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
  const companyValue = fitTextByWidth({
    text: options.companyName,
    font: options.fontLight,
    size: fontSize,
    maxWidth: leftColWidth - (cellPaddingX * 2) - companyLabelWidth,
  });
  page.drawText(companyValue, {
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
  const establishmentValue = fitTextByWidth({
    text: options.establishmentName,
    font: options.fontLight,
    size: fontSize,
    maxWidth: leftColWidth - (cellPaddingX * 2) - establishmentLabelWidth,
  });
  page.drawText(establishmentValue, {
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
    header: undefined,
    footer: undefined,
  };
}

async function buildAnnexShellPageBuffer(options: {
  fontDefinitions: Record<string, { normal: string; bold?: string; italics?: string; bolditalics?: string }>;
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
  fontDefinitions: Record<string, { normal: string; bold?: string; italics?: string; bolditalics?: string }>;
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
  const fontLightPath = options.fontDefinitions?.WorkSansLight?.normal;
  const fontMediumPath = options.fontDefinitions?.WorkSansMedium?.normal;
  if (!fontLightPath || !fontMediumPath) {
    throw new Error("Fontes WorkSansLight/WorkSansMedium indisponíveis para renderizar anexos.");
  }
  const [fontLightBytes, fontMediumBytes] = await Promise.all([
    fs.readFile(fontLightPath),
    fs.readFile(fontMediumPath),
  ]);
  const fontLight = await baseDoc.embedFont(fontLightBytes);
  const fontMedium = await baseDoc.embedFont(fontMediumBytes);

  const lastIndex = baseDoc.getPageCount() - 1;
  let insertIndex = lastIndex > 0 ? lastIndex : baseDoc.getPageCount();

  const backendBase = resolveBackendBaseUrl();
  const headerCookie = options.requestHeaders.cookie;

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
      const titlePage = baseDoc.insertPage(insertIndex, shellPage);
      await drawAnnexHeaderFooter(titlePage, {
        pdfDoc: baseDoc,
        companyName: options.companyName,
        establishmentName: options.establishmentName,
        anl: options.anl,
        brandLogo: options.brandLogo,
        fontLight,
        fontMedium,
        pageNumber,
      });
      insertIndex += 1;
    }

    for (const file of item.arquivos) {
      const url = `${backendBase}/api/v1/frontend/pgr/${options.pgrId}/attachments/${file.id}/download`;
      const response = await fetch(url, {
        headers: {
          ...(headerCookie ? { cookie: headerCookie } : {}),
        },
      });
      if (!response.ok) {
        continue;
      }
      const fileBytes = new Uint8Array(await response.arrayBuffer());
      const attachmentKind = detectAttachmentKind(fileBytes);

      const drawEmbeddedPdfPageOnShell = async (embeddedPage: PDFEmbeddedPage) => {
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
        const scale = Math.min(maxWidth / embeddedPage.width, maxHeight / embeddedPage.height);
        const drawWidth = embeddedPage.width * scale;
        const drawHeight = embeddedPage.height * scale;
        const x = (A4_WIDTH - drawWidth) / 2;
        const y = 70 + (maxHeight - drawHeight) / 2;

        page.drawPage(embeddedPage, { x, y, width: drawWidth, height: drawHeight });
        await drawAnnexHeaderFooter(page, {
          pdfDoc: baseDoc,
          companyName: options.companyName,
          establishmentName: options.establishmentName,
          anl: options.anl,
          brandLogo: options.brandLogo,
          fontLight,
          fontMedium,
          pageNumber,
        });
        insertIndex += 1;
      };

      const drawEmbeddedImageOnShell = async (embeddedImage: PDFImage) => {
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
        const scale = Math.min(maxWidth / embeddedImage.width, maxHeight / embeddedImage.height);
        const drawWidth = embeddedImage.width * scale;
        const drawHeight = embeddedImage.height * scale;
        const x = (A4_WIDTH - drawWidth) / 2;
        const y = 70 + (maxHeight - drawHeight) / 2;

        page.drawImage(embeddedImage, { x, y, width: drawWidth, height: drawHeight });
        await drawAnnexHeaderFooter(page, {
          pdfDoc: baseDoc,
          companyName: options.companyName,
          establishmentName: options.establishmentName,
          anl: options.anl,
          brandLogo: options.brandLogo,
          fontLight,
          fontMedium,
          pageNumber,
        });
        insertIndex += 1;
      };

      if (attachmentKind === "pdf") {
        try {
          const annexDoc = await PDFDocument.load(fileBytes);
          const annexIndices = annexDoc.getPageIndices();
          for (const annexIndex of annexIndices) {
            const [embeddedPage] = await baseDoc.embedPages([annexDoc.getPage(annexIndex)]);
            await drawEmbeddedPdfPageOnShell(embeddedPage);
          }
        } catch {
          // Ignora anexos inválidos para manter a geração do PDF principal.
        }
        continue;
      }

      if (attachmentKind === "png" || attachmentKind === "jpeg") {
        try {
          const embeddedImage =
            attachmentKind === "png"
              ? await baseDoc.embedPng(fileBytes)
              : await baseDoc.embedJpg(fileBytes);
          await drawEmbeddedImageOnShell(embeddedImage);
        } catch {
          // Ignora anexos inválidos para manter a geração do PDF principal.
        }
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

async function buildPdfBuffer(
  definition: Record<string, unknown>,
  fonts: Record<string, { normal: string; bold?: string; italics?: string; bolditalics?: string }>
): Promise<Buffer> {
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
    const payload = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as Record<string, unknown>;
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
    const normalizedPdfLayout = normalizePdfLayoutState(payload?.pdfLayout);
    const definition = runtimeTemplate.build(snapshot, visualAssets, {
      measureTextWidth,
      pageSize: { width: 595.28, height: 841.89 },
      pageMargins: [40, 96, 40, 36],
    }, normalizedPdfLayout) as Record<string, unknown>;
    const pdfBuffer = await buildPdfBuffer(definition, fontDefinitions);
    const rawAnexos = payload.anexos as { itens?: unknown[] } | undefined;
    const annexItems: AnnexItem[] = Array.isArray(rawAnexos?.itens)
      ? rawAnexos.itens.map((item) => {
          const parsedItem = item as { id?: unknown; titulo?: unknown; arquivos?: unknown[] };
          return {
            id: String(parsedItem.id || ""),
            titulo: sanitizeText(parsedItem.titulo),
            arquivos: Array.isArray(parsedItem.arquivos)
              ? parsedItem.arquivos
                  .map((file) => {
                    const parsedFile = file as { id?: unknown; nome?: unknown };
                    return { id: String(parsedFile?.id || ""), nome: sanitizeText(parsedFile?.nome) };
                  })
                  .filter((file: AnnexFile) => file.id)
              : [],
          };
        })
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
