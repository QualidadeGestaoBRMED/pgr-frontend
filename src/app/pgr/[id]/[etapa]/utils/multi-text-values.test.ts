import { describe, expect, it } from "vitest";
import {
  MULTI_VALUE_SEPARATOR,
  parseMultiTextValues,
  toMultiTextValue,
} from "./multi-text-values";

const CATALOGO = [
  "1",
  "TESTANDO ISSO DAQUI 1,2,3",
  "A ser evidenciado na fase de reconhecimento",
  "Realizar avaliação quantitativa do agente",
];

describe("toMultiTextValue", () => {
  it("joins with the unambiguous separator instead of a comma", () => {
    expect(toMultiTextValue(["Medida A", "Medida B"])).toBe("Medida A; Medida B");
  });

  it("survives a round trip for a measure whose name contains commas", () => {
    const valor = toMultiTextValue(["1", "TESTANDO ISSO DAQUI 1,2,3"]);

    expect(parseMultiTextValues(valor, CATALOGO)).toEqual([
      "1",
      "TESTANDO ISSO DAQUI 1,2,3",
    ]);
  });

  it("dedupes and drops blanks", () => {
    expect(toMultiTextValue(["Medida", " Medida ", "", "  "])).toBe("Medida");
  });
});

describe("parseMultiTextValues", () => {
  it("returns an empty list for blank values", () => {
    expect(parseMultiTextValues("")).toEqual([]);
    expect(parseMultiTextValues(null)).toEqual([]);
    expect(parseMultiTextValues(undefined)).toEqual([]);
  });

  it("splits on the current separator", () => {
    expect(parseMultiTextValues(`Medida A${MULTI_VALUE_SEPARATOR}Medida B`)).toEqual([
      "Medida A",
      "Medida B",
    ]);
  });

  it("splits legacy newline-joined values", () => {
    expect(parseMultiTextValues("Medida A\nMedida B")).toEqual(["Medida A", "Medida B"]);
  });

  it("keeps a comma-named measure whole when it is the entire value", () => {
    expect(parseMultiTextValues("TESTANDO ISSO DAQUI 1,2,3", CATALOGO)).toEqual([
      "TESTANDO ISSO DAQUI 1,2,3",
    ]);
  });

  it("rebuilds a legacy comma-joined pair using the known measures", () => {
    expect(
      parseMultiTextValues("A ser evidenciado na fase de reconhecimento, 1", CATALOGO)
    ).toEqual(["A ser evidenciado na fase de reconhecimento", "1"]);
  });

  it("rebuilds a legacy pair where one name itself contains commas", () => {
    expect(parseMultiTextValues("TESTANDO ISSO DAQUI 1,2,3, 1", CATALOGO)).toEqual([
      "TESTANDO ISSO DAQUI 1,2,3",
      "1",
    ]);
  });

  it("keeps an unrecognized comma text whole rather than shredding it", () => {
    expect(parseMultiTextValues("Texto livre, digitado pelo analista", CATALOGO)).toEqual([
      "Texto livre, digitado pelo analista",
    ]);
  });

  it("keeps a comma text whole when there is no catalog to match against", () => {
    expect(parseMultiTextValues("Medida A, Medida B")).toEqual(["Medida A, Medida B"]);
  });

  it("matches known measures ignoring case and accents", () => {
    expect(
      parseMultiTextValues("realizar avaliacao quantitativa do agente, 1", CATALOGO)
    ).toEqual(["Realizar avaliação quantitativa do agente", "1"]);
  });
});
