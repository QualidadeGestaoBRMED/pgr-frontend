import type { HistoricoChange } from "../types";

const DATE_INTERVAL_DIGIT_LIMIT = 16;
const VIGENCIA_YEARS = 2;

const extractVersionNumber = (value: unknown) => {
  const match = String(value ?? "").match(/(\d{1,4})/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseHistoricoDate = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const brMatch = raw.match(/^(\d{2})[./-](\d{2})[./-](\d{4})/);
  if (brMatch) {
    return new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
  }

  return null;
};

const addYearsSafe = (date: Date, years: number) => {
  const next = new Date(date);
  next.setFullYear(date.getFullYear() + years);
  if (next.getMonth() !== date.getMonth()) {
    next.setDate(0);
  }
  return next;
};

const formatBrDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
};

const parseCompleteBrDate = (value: string) => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
};

const calculateEndDate = (startDate: Date) => {
  const endDate = addYearsSafe(startDate, VIGENCIA_YEARS);
  endDate.setDate(endDate.getDate() - 1);
  return endDate;
};

const formatPartialDate = (dateDigits: string) => {
  const digits = dateDigits.replace(/\D/g, "").slice(0, 8);
  const parts = [];
  if (digits.length >= 2) {
    parts.push(digits.slice(0, 2));
  } else if (digits.length > 0) {
    parts.push(digits);
  }
  if (digits.length >= 4) {
    parts.push(digits.slice(2, 4));
  } else if (digits.length > 2) {
    parts.push(digits.slice(2));
  }
  if (digits.length > 4) {
    parts.push(digits.slice(4));
  }
  return parts.join("/");
};

export const maskVigenciaInterval = (value: string) => {
  const compactDigits = value.replace(/\D/g, "").slice(0, DATE_INTERVAL_DIGIT_LIMIT);
  if (!value.includes("-") && compactDigits.length > 8) {
    return `${formatPartialDate(compactDigits.slice(0, 8))} - ${formatPartialDate(
      compactDigits.slice(8)
    )}`;
  }

  const [rawFirstDate = "", rawSecondDate = ""] = value.split(/\s*-\s*/, 2);
  const formattedFirstDate = formatPartialDate(rawFirstDate);
  const formattedSecondDate = formatPartialDate(rawSecondDate);
  const startDate = parseCompleteBrDate(formattedFirstDate);
  const isEditingIncompleteFirstDate = value.includes("-") && !startDate;

  if (isEditingIncompleteFirstDate) {
    return formattedFirstDate;
  }

  if (formattedSecondDate) {
    return `${formattedFirstDate} - ${formattedSecondDate}`;
  }
  if (value.includes("-")) {
    return `${formattedFirstDate} - `;
  }
  return formattedFirstDate;
};

export const completeVigenciaInterval = (value: string) => {
  const masked = maskVigenciaInterval(value);
  const [firstDate = "", secondDate = ""] = masked.split(/\s*-\s*/, 2);
  const startDate = parseCompleteBrDate(firstDate.trim());
  if (!startDate || secondDate.trim()) {
    return masked;
  }
  return `${firstDate.trim()} - ${formatBrDate(calculateEndDate(startDate))}`;
};

export const calculatePlanActionVigencia = (
  changes: Array<Pick<HistoricoChange, "analysis" | "change" | "date">>
) => {
  const parsedRows = changes
    .map((item) => ({
      analysis: extractVersionNumber(item.analysis),
      change: extractVersionNumber(item.change) ?? 1,
      date: parseHistoricoDate(item.date),
    }))
    .filter(
      (item): item is { analysis: number; change: number; date: Date } =>
        item.analysis !== null && item.date !== null
    );

  if (!parsedRows.length) return "";

  const latestAnalysis = Math.max(...parsedRows.map((item) => item.analysis));
  const latestRows = parsedRows.filter((item) => item.analysis === latestAnalysis);
  const firstChangeRows = latestRows.filter((item) => item.change === 1);
  const candidates = firstChangeRows.length ? firstChangeRows : latestRows;
  const startDate = candidates.reduce(
    (earliest, item) =>
      item.date.getTime() < earliest.getTime() ? item.date : earliest,
    candidates[0].date
  );
  const endDate = calculateEndDate(startDate);

  return `${formatBrDate(startDate)} - ${formatBrDate(endDate)}`;
};
