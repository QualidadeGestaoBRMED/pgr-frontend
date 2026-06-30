import type { HistoricoData } from "../types";

const extractHistoricoNumericCode = (value: string) => {
  const match = String(value || "").match(/(\d{1,4})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed < 0) return Number.MAX_SAFE_INTEGER;
  return parsed;
};

export const sortHistoricoChanges = <T extends { id: string; analysis: string; change: string }>(
  changes: T[]
) =>
  [...changes].sort((a, b) => {
    const analysisA = extractHistoricoNumericCode(a.analysis);
    const analysisB = extractHistoricoNumericCode(b.analysis);
    if (analysisA !== analysisB) return analysisA - analysisB;

    const changeA = extractHistoricoNumericCode(a.change);
    const changeB = extractHistoricoNumericCode(b.change);
    if (changeA !== changeB) return changeA - changeB;

    return String(a.id).localeCompare(String(b.id));
  });

const formatExportVersionCode = (value: string) => {
  const numericCode = extractHistoricoNumericCode(value);
  if (numericCode === Number.MAX_SAFE_INTEGER) return "00";
  return String(Math.max(0, numericCode)).padStart(2, "0");
};

export const sanitizeExportFilenamePart = (value: string) =>
  String(value || "")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[\\/:*?"<>|\x00-\x1F()]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .replace(/^-|-$/g, "");

export const buildPgrExportFileBase = (args: {
  companyName: string;
  historico: HistoricoData;
  fallbackPgrId: string;
}) => {
  const sortedChanges = sortHistoricoChanges(args.historico.changes || []);
  const latestChange = sortedChanges[sortedChanges.length - 1];
  const companyName =
    sanitizeExportFilenamePart(args.companyName) ||
    sanitizeExportFilenamePart(args.fallbackPgrId) ||
    "DOCUMENTO";
  const analysisCode = formatExportVersionCode(latestChange?.analysis || "00");
  const changeCode = formatExportVersionCode(latestChange?.change || "00");
  const year = new Date().getFullYear();

  return `PGR-${companyName}-ANL${analysisCode}-ALT${changeCode}-${year}`;
};
