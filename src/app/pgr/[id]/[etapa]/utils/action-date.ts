export const toUtcBrDate = (date: Date) => {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

export const maskActionDate = (value: string) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

export const normalizeActionDate = (value: string) => {
  const masked = maskActionDate(value);
  const match = masked.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return masked;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return masked;
  }
  return toUtcBrDate(parsed);
};

export const toBrDateValue = (value: string) => {
  const safe = String(value || "").trim();
  if (!safe) return "";
  const isoMatch = safe.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  return normalizeActionDate(safe);
};

export const parseActionStartDate = (raw: string) => {
  const value = String(raw || "").trim();
  if (!value) return null;
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (isoMatch) {
    const date = new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+\d{2}:\d{2}(?::\d{2})?)?$/);
  if (brMatch) {
    const date = new Date(Date.UTC(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1])));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

export const parseVigenciaStartDate = (raw: string) => {
  const value = String(raw || "").trim();
  if (!value) return null;
  const startDateToken = value.split(/\s*-\s*/)[0]?.trim() || value;
  return parseActionStartDate(startDateToken);
};

const normalizeText = (value: string) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const getActionDueDaysByPriority = (prioridade: string, classificacao: string) => {
  const text = normalizeText(`${prioridade} ${classificacao}`);
  if (text.includes("imediat") || text.includes("critic")) return 30;
  if (text.includes("alt")) return 90;
  if (text.includes("media") || text.includes("moderad")) return 180;
  return null;
};

export const addUtcDays = (date: Date, days: number) => {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

export const calculateAutomaticActionDueDate = ({
  vigencia,
  prioridade,
  classificacao,
}: {
  vigencia: string;
  prioridade: string;
  classificacao: string;
}) => {
  const startDate = parseVigenciaStartDate(vigencia);
  if (!startDate) return "";
  const days = getActionDueDaysByPriority(prioridade, classificacao);
  if (!days) return "";
  return toUtcBrDate(addUtcDays(startDate, days));
};

export const resolveActionDateValue = (
  localValue: string | undefined,
  persistedValue: string | undefined
) => {
  const normalizedLocalValue = toBrDateValue(localValue || "");
  if (normalizedLocalValue.trim()) return normalizedLocalValue;
  return toBrDateValue(persistedValue || "");
};
