import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

type CatalogAgent = { name?: string };
type CatalogDescription = { name?: string; agent?: number | string };

type CatalogPayload = {
  risk_agent?: CatalogAgent[];
  risk_description?: CatalogDescription[];
  hazard?: CatalogDescription[];
  risk_source?: CatalogDescription[];
  propagation_path?: CatalogDescription[];
  health_damage?: CatalogDescription[];
};

const normalizeName = (value: string) =>
  value
    .replace(/\u00A0/g, " ")
    .replace(/_/g, " ")
    .replace(/^\d+\.\s*/, "")
    .replace(/\(\s*n[ãa]o\s+utilizar\s*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeToken = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const isPropagationPlaceholder = (value: string) => {
  const token = normalizeToken(value);
  return token === "agentequimico";
};

const toCatalogList = (
  items: CatalogDescription[] | undefined,
  riskDescriptions: CatalogDescription[],
  riskAgentCount: number,
  options?: { discardPropagationPlaceholders?: boolean }
) => {
  const source = items || [];
  const useIndexMapping = source.length === riskDescriptions.length;

  return source
    .map((item, index) => {
      const name = normalizeName(String(item.name || ""));
      if (!name) return null;
      if (options?.discardPropagationPlaceholders && isPropagationPlaceholder(name)) {
        return null;
      }

      const rawAgent = Number(item.agent || 0);
      let resolvedAgent = useIndexMapping
        ? Number(riskDescriptions[index]?.agent || 0)
        : rawAgent;

      if (!(resolvedAgent >= 1 && resolvedAgent <= riskAgentCount)) {
        // Alguns catálogos referenciam o índice da risk_description (1-based) no campo agent.
        if (rawAgent >= 1 && rawAgent <= riskDescriptions.length) {
          resolvedAgent = Number(riskDescriptions[rawAgent - 1]?.agent || 0);
        }
      }

      if (!(resolvedAgent >= 1 && resolvedAgent <= riskAgentCount)) {
        return null;
      }

      return {
        name,
        agent: resolvedAgent,
      };
    })
    .filter((item): item is { name: string; agent: number } => Boolean(item));
};

export async function GET() {
  try {
    const catalogsPath = path.resolve(process.cwd(), "../pgr-backend/catalogs.json");
    const raw = await fs.readFile(catalogsPath, "utf8");
    const parsed = JSON.parse(raw) as CatalogPayload;

    const riskAgents = (parsed.risk_agent || [])
      .map((agent, index) => ({
        id: index + 1,
        name: normalizeName(String(agent.name || "")),
      }))
      .filter((agent) => agent.name.length > 0);

    const riskDescriptions = toCatalogList(
      parsed.risk_description,
      parsed.risk_description || [],
      riskAgents.length
    );
    const hazards = toCatalogList(
      parsed.hazard,
      parsed.risk_description || [],
      riskAgents.length
    );
    const riskSources = toCatalogList(
      parsed.risk_source,
      parsed.risk_description || [],
      riskAgents.length
    );
    const propagationPaths = toCatalogList(
      parsed.propagation_path,
      parsed.risk_description || [],
      riskAgents.length,
      { discardPropagationPlaceholders: true }
    );
    const healthDamages = toCatalogList(
      parsed.health_damage,
      parsed.risk_description || [],
      riskAgents.length
    );

    return NextResponse.json({
      riskAgents,
      riskDescriptions,
      hazards,
      riskSources,
      propagationPaths,
      healthDamages,
    });
  } catch {
    return NextResponse.json(
      {
        riskAgents: [],
        riskDescriptions: [],
        hazards: [],
        riskSources: [],
        propagationPaths: [],
        healthDamages: [],
      },
      { status: 200 }
    );
  }
}
