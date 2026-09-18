/**
 * Serialização dos campos do PGR que guardam vários valores de catálogo dentro
 * de um único texto: fontes geradoras, danos à saúde, EPI/EPC, medidas de
 * controle da Caracterização e medidas de prevenção do Plano de Ação.
 *
 * O separador é `"; "` e nunca a vírgula, porque nome de item de catálogo pode
 * conter vírgula -- ex. a Descrição de Ação "TESTANDO ISSO DAQUI 1,2,3". Com
 * vírgula como separador, o item era picado em pedaços na releitura: a própria
 * opção aparecia desmarcada (o nome inteiro não batia com nenhum pedaço) e os
 * fragmentos passavam a contar como valores selecionados.
 *
 * Valor gravado antes dessa convenção vem unido por vírgula e é ambíguo -- não
 * há como saber se a vírgula separa dois itens ou pertence ao nome de um.
 * `parseMultiTextValues` reconstrói esses casos casando o texto contra as
 * opções conhecidas do risco, do trecho mais longo para o mais curto. O que
 * não casa volta inteiro, preservando o texto que sai no documento.
 */

export const MULTI_VALUE_SEPARATOR = "; ";

export const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Chave de comparação com o catálogo. Além de acento e caixa, ignora espaço em
 * volta da vírgula: o valor legado foi gravado unindo com `", "`, então um nome
 * escrito sem espaço no catálogo ("TESTANDO ISSO DAQUI 1,2,3") só volta a casar
 * se as duas formas colapsarem na mesma chave.
 */
const normalizeLookupKey = (value: string) =>
  normalizeText(value)
    .replace(/\s*,\s*/g, ",")
    .replace(/\s+/g, " ")
    .trim();

const buildOptionLookup = (options: string[]) =>
  new Map(
    options
      .map((option) => String(option || "").trim())
      .filter(Boolean)
      .map((option) => [normalizeLookupKey(option), option] as const)
  );

const tryParseLegacyCommaList = (rawValue: string, availableOptions: string[]) => {
  const normalizedRaw = rawValue.trim();
  if (!normalizedRaw.includes(",")) return null;

  const optionLookup = buildOptionLookup(availableOptions);
  if (!optionLookup.size) return null;

  // O texto inteiro é uma opção do catálogo cujo nome tem vírgula: não separa.
  const directMatch = optionLookup.get(normalizeLookupKey(normalizedRaw));
  if (directMatch) return [directMatch];

  const chunks = normalizedRaw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (chunks.length <= 1) return null;

  const parsed: string[] = [];
  let cursor = 0;
  while (cursor < chunks.length) {
    let matched: string | null = null;
    let matchedSize = 0;

    // Trecho mais longo primeiro: assim um nome que contém vírgula é
    // remontado antes de ser confundido com dois itens distintos.
    for (let size = chunks.length - cursor; size >= 1; size -= 1) {
      const candidate = chunks.slice(cursor, cursor + size).join(", ").trim();
      const optionMatch = optionLookup.get(normalizeLookupKey(candidate));
      if (!optionMatch) continue;
      matched = optionMatch;
      matchedSize = size;
      break;
    }

    if (!matched || matchedSize === 0) return null;
    parsed.push(matched);
    cursor += matchedSize;
  }

  return parsed.length ? parsed : null;
};

export const parseMultiTextValues = (
  value: string | undefined | null,
  availableOptions: string[] = []
) => {
  const rawValue = String(value || "").trim();
  if (!rawValue) return [];

  // `;` e `\n` não aparecem em nome de catálogo, então são inequívocos.
  if (/[;\n]/.test(rawValue)) {
    return rawValue
      .split(/[;\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const legacyParsed = tryParseLegacyCommaList(rawValue, availableOptions);
  if (legacyParsed) return legacyParsed;

  return [rawValue];
};

export const toMultiTextValue = (values: string[]) =>
  Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).join(
    MULTI_VALUE_SEPARATOR
  );
