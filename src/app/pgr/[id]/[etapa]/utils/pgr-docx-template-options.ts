import type {
  PgrDiretrizOption,
  PgrDocxTemplateOption,
} from "../types";

// Espelho de PGR_TEMPLATE_NR_CODE_BY_SELECTED_NR em
// src/apps/sst_core/services/pgr_docx_template_resolver.py -- mantenha as duas
// em sincronia, senão a lista de modelos oferecida aqui divergir do que o
// backend usa na geração.
//
// A NR-29 aponta para NR-01 de propósito (não tem modelo próprio). Antes isto
// era um `if` que devolvia NR-01 para tudo que não fosse NR-30, o que fazia a
// NR-18 cair no NR-01 junto.
const TEMPLATE_NR_CODE_BY_SELECTED_NR: Record<string, string> = {
  "NR-01": "NR-01",
  "NR-18": "NR-18",
  "NR-29": "NR-01",
  "NR-30": "NR-30",
};

const FALLBACK_TEMPLATE_NR_CODE = "NR-01";

export function resolveTemplateNrCode(nr: string): string {
  const normalized = String(nr || "").trim().toUpperCase();
  return TEMPLATE_NR_CODE_BY_SELECTED_NR[normalized] ?? FALLBACK_TEMPLATE_NR_CODE;
}

export function buildPgrDiretrizOptions(
  templates: PgrDocxTemplateOption[],
  selectedNr: string
): PgrDiretrizOption[] {
  const templateNrCode = resolveTemplateNrCode(selectedNr);
  const matchingTemplates = templates.filter(
    (item) => item.nrCode === templateNrCode
  );
  // A resolução do backend prioriza o Default específico da empresa e só
  // depois usa o global. A lista já vem limitada à empresa atual + globais.
  const effectiveDefault =
    matchingTemplates.find(
      (item) => item.isDefault && item.companyId != null
    ) ??
    matchingTemplates.find(
      (item) => item.isDefault && item.companyId == null
    );
  const fallbackNrLabel = String(selectedNr || "").trim() || "NR-01";
  const defaultOption: PgrDiretrizOption = {
    value: `default:${templateNrCode}`,
    label: effectiveDefault?.name || `Padrão BRMED ${fallbackNrLabel}`,
    templateId: null,
    nrCode: templateNrCode,
    isDefault: true,
  };
  const manualOptions = matchingTemplates
    // O Default já está representado pela opção com templateId null, que
    // preserva a resolução dinâmica caso o painel admin troque o padrão.
    .filter((item) => item.id !== effectiveDefault?.id)
    .sort((left, right) => {
      const leftCompany = left.companyId ? 1 : 0;
      const rightCompany = right.companyId ? 1 : 0;
      if (leftCompany !== rightCompany) return rightCompany - leftCompany;
      const leftVersion = Number(left.version || 0);
      const rightVersion = Number(right.version || 0);
      if (leftVersion !== rightVersion) return rightVersion - leftVersion;
      return left.name.localeCompare(right.name, "pt-BR");
    })
    .map<PgrDiretrizOption>((item) => ({
      value: `template:${item.id}`,
      label: item.name,
      templateId: item.id,
      nrCode: item.nrCode,
      isDefault: false,
    }));

  return [defaultOption, ...manualOptions];
}
