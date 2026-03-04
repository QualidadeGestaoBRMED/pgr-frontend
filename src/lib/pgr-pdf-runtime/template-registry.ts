import { buildRuntimeDocDefinition } from "./document";
import type { RuntimeSnapshot } from "./snapshot";
import type { RuntimeVisualAssets } from "./assets";

export type RuntimeTemplateId = "base_v1";

export type RuntimeTemplate = {
  id: RuntimeTemplateId;
  label: string;
  build: (snapshot: RuntimeSnapshot, visualAssets?: RuntimeVisualAssets) => any;
};

const BASE_TEMPLATE: RuntimeTemplate = {
  id: "base_v1",
  label: "Template Base v1",
  build: (snapshot, visualAssets) => buildRuntimeDocDefinition(snapshot, visualAssets),
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
