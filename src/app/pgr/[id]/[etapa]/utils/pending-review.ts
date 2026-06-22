import type { PgrStepId } from "@/app/pgr/steps";
import { slugify } from "./text";
import type { PendingReviewFocus, PendingReviewTarget } from "../types";

type SearchParamsLike = {
  get: (key: string) => string | null;
};

const QUERY_KEYS = {
  stepId: "pendingStep",
  issueId: "pendingIssue",
  message: "pendingMessage",
  fieldKey: "pendingField",
  sectionKey: "pendingSection",
  gheId: "pendingGheId",
  gheName: "pendingGheName",
  riskId: "pendingRiskId",
  itemIndex: "pendingItemIndex",
} as const;

export const buildPendingReviewTarget = (
  stepId: PgrStepId,
  message: string,
  extra: Omit<PendingReviewTarget, "id" | "stepId" | "message"> = {}
): PendingReviewTarget => ({
  id: `${stepId}-${slugify(message)}-${extra.gheId || extra.riskId || extra.itemIndex || "issue"}`,
  stepId,
  message,
  ...extra,
});

export const buildPendingReviewHref = (pgrId: string, target: PendingReviewTarget) => {
  const params = new URLSearchParams();
  params.set(QUERY_KEYS.stepId, target.stepId);
  params.set(QUERY_KEYS.issueId, target.id);
  params.set(QUERY_KEYS.message, target.message);
  if (target.fieldKey) params.set(QUERY_KEYS.fieldKey, target.fieldKey);
  if (target.sectionKey) params.set(QUERY_KEYS.sectionKey, target.sectionKey);
  if (target.gheId) params.set(QUERY_KEYS.gheId, target.gheId);
  if (target.gheName) params.set(QUERY_KEYS.gheName, target.gheName);
  if (target.riskId) params.set(QUERY_KEYS.riskId, target.riskId);
  if (typeof target.itemIndex === "number") {
    params.set(QUERY_KEYS.itemIndex, String(target.itemIndex));
  }
  return `/pgr/${pgrId}/${target.stepId}?${params.toString()}`;
};

export const parsePendingReviewFocus = (
  searchParams: SearchParamsLike | null
): PendingReviewFocus | null => {
  if (!searchParams) return null;
  const stepId = String(searchParams.get(QUERY_KEYS.stepId) || "").trim() as PgrStepId;
  const issueId = String(searchParams.get(QUERY_KEYS.issueId) || "").trim();
  const message = String(searchParams.get(QUERY_KEYS.message) || "").trim();
  if (!stepId || !issueId || !message) return null;

  const itemIndexRaw = String(searchParams.get(QUERY_KEYS.itemIndex) || "").trim();
  const itemIndex =
    itemIndexRaw && Number.isFinite(Number(itemIndexRaw)) ? Number(itemIndexRaw) : undefined;

  return {
    id: issueId,
    stepId,
    message,
    fieldKey: String(searchParams.get(QUERY_KEYS.fieldKey) || "").trim() || undefined,
    sectionKey: String(searchParams.get(QUERY_KEYS.sectionKey) || "").trim() || undefined,
    gheId: String(searchParams.get(QUERY_KEYS.gheId) || "").trim() || undefined,
    gheName: String(searchParams.get(QUERY_KEYS.gheName) || "").trim() || undefined,
    riskId: String(searchParams.get(QUERY_KEYS.riskId) || "").trim() || undefined,
    itemIndex,
  };
};
