const normalizePriorityToken = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const normalizePriorityText = (value: unknown) => {
  const raw = String(value ?? "").trim();
  const normalized = normalizePriorityToken(value);

  if (!normalized) return "";
  if (normalized.includes("imediat") || normalized.includes("critic")) return "Imediata";
  if (normalized.includes("alta") || normalized.includes("alto")) return "Alta";
  if (normalized.includes("media") || normalized.includes("moderad")) return "Média";
  if (normalized.includes("baixa") || normalized.includes("baixo")) return "Baixa";
  return raw;
};

export const isModerateOrHigherPriority = (value: unknown) => {
  const normalized = normalizePriorityToken(normalizePriorityText(value));

  if (!normalized) return false;
  if (normalized.includes("baixa") || normalized.includes("baixo")) return false;
  return (
    normalized.includes("media") ||
    normalized.includes("moderad") ||
    normalized.includes("alta") ||
    normalized.includes("alto") ||
    normalized.includes("imediat") ||
    normalized.includes("critic")
  );
};
