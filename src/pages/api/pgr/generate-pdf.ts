import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import { ensureRuntimeFontsFromTemplate, getRuntimeFontDefinitions } from "@/lib/pgr-pdf-runtime/fonts";
import { buildRuntimeSnapshot } from "@/lib/pgr-pdf-runtime/snapshot";
import { resolveRuntimeTemplate } from "@/lib/pgr-pdf-runtime/template-registry";
import { ensureRuntimeVisualAssetsFromTemplate } from "@/lib/pgr-pdf-runtime/assets";

const TEMPLATE_FILE_NAME = "Modelo de PGR.docx";
const PdfPrinter = require("pdfmake");

function sanitizeText(value: unknown) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
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
    const runtimeTemplate = resolveRuntimeTemplate(payload);
    const definition = runtimeTemplate.build(snapshot, visualAssets);
    const pdfBuffer = await buildPdfBuffer(definition, fontDefinitions);
    const filenameBase = buildFilename(snapshot.company.name || `pgr-${snapshot.meta.pgrId}`);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filenameBase}-pgr.pdf\"`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-PDF-Engine", "runtime-pdfmake-v1");
    res.setHeader("X-PDF-Schema", snapshot.schemaVersion);
    res.setHeader("X-PDF-Template", runtimeTemplate.id);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerar PDF";
    return res.status(500).json({
      message: "Falha ao gerar PDF via engine runtime.",
      details: message,
    });
  }
}
