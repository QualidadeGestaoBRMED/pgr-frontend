import { describe, expect, it } from "vitest";
import {
  DEFAULT_PDF_LAYOUT_STATE,
  normalizePdfLayoutState,
  resolveTableWidths,
} from "./layout";

describe("pdf layout", () => {
  it("normalizes invalid payload to defaults", () => {
    const normalized = normalizePdfLayoutState({
      selectedTableId: "unknown",
      tableWeights: {
        header_main: ["x", -10],
      },
    });

    expect(normalized.selectedTableId).toBe(DEFAULT_PDF_LAYOUT_STATE.selectedTableId);
    expect(normalized.tableWeights.header_main[0]).toBe(67);
    expect(normalized.tableWeights.header_main[1]).toBe(33);
  });

  it("resolves percentage widths from stored weights", () => {
    const widths = resolveTableWidths(
      {
        ...DEFAULT_PDF_LAYOUT_STATE,
        tableWeights: {
          ...DEFAULT_PDF_LAYOUT_STATE.tableWeights,
          header_main: [60, 40],
        },
      },
      "header_main",
      [67, 33],
    );
    expect(widths).toEqual(["60.00%", "40.00%"]);
  });
});
