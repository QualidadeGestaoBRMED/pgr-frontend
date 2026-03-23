import { buildRuntimeDocDefinition } from "./document";
import type { RuntimeSnapshot } from "./snapshot";
import type { RuntimeVisualAssets } from "./assets";
import type { PdfLayoutState } from "./layout";

export type RuntimeTemplateId = "base_v1";

export type RuntimeTemplate = {
  id: RuntimeTemplateId;
  label: string;
  build: (
    snapshot: RuntimeSnapshot,
    visualAssets?: RuntimeVisualAssets,
    layout?: { measureTextWidth?: (text: string) => number; pageSize?: { width: number; height: number }; pageMargins?: [number, number, number, number] },
    pdfLayout?: PdfLayoutState,
  ) => any;
};

const BASE_TEMPLATE: RuntimeTemplate = {
  id: "base_v1",
  label: "Template Base v1",
  build: (snapshot, visualAssets, layout, pdfLayout) =>
    buildRuntimeDocDefinition(snapshot, visualAssets, layout, pdfLayout),
};

export function resolveRuntimeTemplate(payload: any): RuntimeTemplate {
  const requested = String(payload?.meta?.templateId || payload?.meta?.template || "")
    .trim()
    .toLowerCase();

  if (requested === "base_v1" || requested === "base-v1") {
    return BASE_TEMPLATE;
  }

  return BASE_TEMPLATE;
}
