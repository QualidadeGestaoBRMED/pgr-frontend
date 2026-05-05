import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const backendBase = (
  process.env.BACKEND_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:8001"
).replace(/\/$/, "");

const emptyPayload = {
  riskAgents: [],
  riskDescriptions: [],
  hazards: [],
  riskSources: [],
  propagationPaths: [],
  healthDamages: [],
  technicalCriteria: [],
  riskMatrix: {
    activeTemplateId: null,
    templates: [],
    exposure: [],
    qualitative: [],
    quantitative: [],
    actionPlan: [],
  },
};

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get("cookie");
    const upstream = await fetch(`${backendBase}/api/v1/frontend/catalogs/risk`, {
      method: "GET",
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });
    const raw = await upstream.text();
    if (!upstream.ok) {
      return NextResponse.json(emptyPayload, {
        status: upstream.status,
        headers: {
          "cache-control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    let parsedPayload: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        parsedPayload = parsed as Record<string, unknown>;
      }
    } catch {
      parsedPayload = {};
    }

    return NextResponse.json({ ...emptyPayload, ...parsedPayload }, {
      status: 200,
      headers: {
        "cache-control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json(
      { ...emptyPayload, message: "Falha ao consultar catálogo no backend" },
      {
        status: 502,
        headers: {
          "cache-control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
