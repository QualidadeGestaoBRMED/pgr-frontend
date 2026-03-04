import type { GheGroup, ParsedDescricaoImport, PgrFunction, RiskGheGroup } from "../types";

const normalizeExcelHeader = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeExcelCell = (value: unknown) =>
  String(value ?? "")
    .replace(/[\u0080-\u009F]/g, " ")
    .replace(/\uFFFD/g, " ")
    .replace(/^([A-Za-z])\+F\d+:F\d+/i, "$1")
    .replace(/\b([A-Za-z])\+F\d+:F\d+/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();

const isExcelInstructionText = (value: string) => {
  const normalized = normalizeExcelHeader(value);
  if (!normalized) return false;
  const instructionTokens = [
    "obrigatorio",
    "deveestarcadastrado",
    "apenasnumeros",
    "formato",
    "paraestrangeiros",
    "inclu",
  ];
  return instructionTokens.some((token) => normalized.includes(token));
};

export const parseDescricaoExcel = async (
  file: File
): Promise<ParsedDescricaoImport> => {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("A planilha não possui abas.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  if (!rows.length) {
    throw new Error("A planilha não possui linhas com dados.");
  }

  const headerToOriginal = new Map<string, string>();
  for (const header of Object.keys(rows[0])) {
    const normalized = normalizeExcelHeader(header);
    if (!headerToOriginal.has(normalized)) {
      headerToOriginal.set(normalized, header);
    }
  }

  const getColumn = (...aliases: string[]) => {
    for (const alias of aliases) {
      const found = headerToOriginal.get(normalizeExcelHeader(alias));
      if (found) return found;
    }
    return null;
  };

  const setorColumn = getColumn("Setor");
  const funcaoColumn = getColumn("Função", "Funcao");
  const descricaoColumn = getColumn("Descrição da Função", "Descricao da Funcao");
  const gheColumn = getColumn("GHE");

  if (!setorColumn && !funcaoColumn && !descricaoColumn && !gheColumn) {
    throw new Error(
      "Colunas esperadas não encontradas. Esperado: Setor, Função, Descrição da Função e GHE."
    );
  }

  const functionCatalog = new Map<
    string,
    { key: string; setor: string; funcao: string; descricao: string }
  >();
  const gheAssignments = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const rawSetor = normalizeExcelCell(setorColumn ? row[setorColumn] : "");
    const rawFuncao = normalizeExcelCell(funcaoColumn ? row[funcaoColumn] : "");
    const rawDescricao = normalizeExcelCell(
      descricaoColumn ? row[descricaoColumn] : ""
    );
    const setor = isExcelInstructionText(rawSetor) ? "" : rawSetor;
    const funcao = isExcelInstructionText(rawFuncao) ? "" : rawFuncao;
    const descricaoRaw = isExcelInstructionText(rawDescricao) ? "" : rawDescricao;
    const descricao = descricaoRaw || funcao;
    const rawGheName = normalizeExcelCell(gheColumn ? row[gheColumn] : "");
    const sanitizedGhe = isExcelInstructionText(rawGheName) ? "" : rawGheName;
    const gheNumericMatch =
      sanitizedGhe.match(/^ghe\s*0*(\d+)$/i) ?? sanitizedGhe.match(/^0*(\d+)$/);
    const gheName = gheNumericMatch
      ? `GHE ${Number.parseInt(gheNumericMatch[1], 10)}`
      : sanitizedGhe;

    if (!setor && !funcao && !descricao && !gheName) continue;
    if (!setor && !funcao && !descricao) continue;

    const baseKey = `${setor}|${funcao}|${descricao}`;
    const catalogKey = gheName ? `${gheName}|${baseKey}` : baseKey;
    if (!functionCatalog.has(catalogKey)) {
      functionCatalog.set(catalogKey, {
        key: catalogKey,
        setor,
        funcao,
        descricao,
      });
    }

    if (gheName) {
      const bucket = gheAssignments.get(gheName) ?? new Map<string, number>();
      bucket.set(catalogKey, (bucket.get(catalogKey) ?? 0) + 1);
      gheAssignments.set(gheName, bucket);
    }
  }

  if (!functionCatalog.size) {
    throw new Error("Nenhuma função válida foi encontrada para importação.");
  }

  const sortedFunctionsBase = Array.from(functionCatalog.values()).sort((a, b) =>
    `${a.setor} ${a.funcao} ${a.descricao}`.localeCompare(
      `${b.setor} ${b.funcao} ${b.descricao}`,
      "pt-BR",
      { sensitivity: "base" }
    )
  );
  const functions: PgrFunction[] = sortedFunctionsBase.map((item, index) => ({
    id: `func-${index + 1}`,
    setor: item.setor,
    funcao: item.funcao,
    descricao: item.descricao,
  }));
  const functionIdByKey = new Map<string, string>();
  sortedFunctionsBase.forEach((item, index) => {
    functionIdByKey.set(item.key, `func-${index + 1}`);
  });

  const gheNames = Array.from(gheAssignments.keys()).sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base", numeric: true })
  );
  const normalizedGheNames = gheNames.length ? gheNames : ["GHE 1"];
  const gheGroups: GheGroup[] = normalizedGheNames.map((name, index) => {
    const assignment = gheAssignments.get(name);
    const items = assignment
      ? Array.from(assignment.entries())
          .map(([key, count]) => ({
            functionId: functionIdByKey.get(key) || "",
            funcionarios: String(count),
          }))
          .filter((item) => item.functionId)
      : [];
    return {
      id: `ghe-${index + 1}`,
      name,
      info: { processo: "", observacoes: "", ambiente: "" },
      items,
    };
  });

  const riskGheGroups: RiskGheGroup[] = gheGroups.map((group) => ({
    id: group.id,
    name: group.name,
    risks: [],
  }));

  return { functions, gheGroups, riskGheGroups };
};
