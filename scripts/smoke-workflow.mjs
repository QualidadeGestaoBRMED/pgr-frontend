#!/usr/bin/env node

const API_BASE_URL = (process.env.API_BASE_URL || "http://127.0.0.1:8001").replace(/\/$/, "");
const API_PREFIX = process.env.API_PREFIX || "/api/v1/frontend";
const SMOKE_USERNAME = process.env.SMOKE_USERNAME || "admin";
const SMOKE_PASSWORD = process.env.SMOKE_PASSWORD || "admin";

let sessionCookie = "";

function joinRoute(route) {
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
  const normalizedPrefix = API_PREFIX.startsWith("/") ? API_PREFIX : `/${API_PREFIX}`;
  return `${normalizedPrefix}${normalizedRoute}`;
}

function updateCookieFromResponse(response) {
  const rawSetCookie = response.headers.get("set-cookie");
  if (!rawSetCookie) return;
  const first = rawSetCookie.split(",")[0];
  const parts = first.split(";").map((item) => item.trim());
  if (!parts.length) return;
  const cookiePair = parts[0];
  if (!cookiePair) return;
  sessionCookie = cookiePair;
}

async function requestJson(method, route, body, expectedStatus = 200) {
  const response = await fetch(`${API_BASE_URL}${joinRoute(route)}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  updateCookieFromResponse(response);

  if (response.status !== expectedStatus) {
    const text = await response.text();
    throw new Error(
      `[${method} ${joinRoute(route)}] esperado ${expectedStatus}, recebido ${response.status}: ${text}`
    );
  }

  return response.json();
}

async function run() {
  const checks = [];

  await requestJson("POST", "/auth/login", {
    username: SMOKE_USERNAME,
    password: SMOKE_PASSWORD,
  });
  checks.push("login");

  const created = await requestJson("POST", "/pgrs", {});
  const pgrId = created?.pgrId;
  if (!pgrId) {
    throw new Error("Criação de PGR sem pgrId.");
  }
  checks.push(`pgr criado (${pgrId})`);

  await requestJson("PUT", `/pgr/${pgrId}/state`, {
    completedSteps: 3,
    meta: {
      pgrId,
      progressPercent: 42,
    },
    inicioDraft: {
      syncedAt: null,
      pipefyCardId: "",
      documentTitle: "Programa de Gerenciamento de Riscos - PGR",
      companyName: "Empresa Teste",
      unitName: "Unidade 1",
      cnpj: "00.000.000/0001-00",
      responsible: "Admin",
      email: "admin@local.test",
      notes: "",
    },
  });
  checks.push("state salvo com progressPercent");

  const stateBeforeFinalize = await requestJson("GET", `/pgr/${pgrId}/state`);
  if (stateBeforeFinalize?.meta?.progressPercent !== 42) {
    throw new Error(`progressPercent esperado 42 antes da finalização, recebido ${stateBeforeFinalize?.meta?.progressPercent}`);
  }
  checks.push("progressPercent refletido no state");

  const finalized = await requestJson("POST", `/pgr/${pgrId}/finalize`);
  if (!finalized?.workflow?.isLocked) {
    throw new Error("Finalize não bloqueou documento.");
  }
  if (Number(finalized?.meta?.progressPercent) !== 100) {
    throw new Error(`Finalize deveria forçar 100%, recebido ${finalized?.meta?.progressPercent}`);
  }
  checks.push("finalize bloqueia e força 100%");

  await requestJson(
    "PUT",
    `/pgr/${pgrId}/state`,
    { completedSteps: 2 },
    409
  );
  checks.push("edição bloqueada após finalize (409)");

  const reopened = await requestJson("POST", `/pgr/${pgrId}/new-version`);
  if (reopened?.workflow?.isLocked) {
    throw new Error("Nova versão deveria desbloquear documento.");
  }
  if (Number(reopened?.workflow?.version) < 2) {
    throw new Error(`Versão deveria incrementar para >=2, recebido ${reopened?.workflow?.version}`);
  }
  checks.push("new-version reabre edição");

  await requestJson("PUT", `/pgr/${pgrId}/state`, {
    completedSteps: 4,
    meta: {
      pgrId,
      progressPercent: 55,
    },
  });
  checks.push("edição volta a funcionar após new-version");

  console.log("Smoke workflow concluído.");
  console.log(`API base: ${API_BASE_URL}`);
  console.log(`API prefix: ${API_PREFIX}`);
  for (const item of checks) {
    console.log(`- OK: ${item}`);
  }
}

run().catch((error) => {
  console.error("Falha no smoke workflow.");
  console.error(String(error?.message || error));
  process.exit(1);
});
