#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const API_BASE_URL = (process.env.API_BASE_URL || "http://127.0.0.1:8001").replace(
  /\/$/,
  ""
);
const API_PREFIX = process.env.API_PREFIX || "/api/v1/frontend";
const SMOKE_USERNAME = process.env.SMOKE_USERNAME || "admin@example.com";
const SMOKE_PASSWORD = process.env.SMOKE_PASSWORD || "admin";

const nowBr = new Date().toLocaleString("pt-BR");
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

async function requestJson(method, route, body) {
  const response = await fetch(`${API_BASE_URL}${joinRoute(route)}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  updateCookieFromResponse(response);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[${method} ${joinRoute(route)}] HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

async function requestPdf(route, body) {
  const response = await fetch(`${API_BASE_URL}${joinRoute(route)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    },
    body: JSON.stringify(body),
  });
  updateCookieFromResponse(response);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[POST ${joinRoute(route)}] HTTP ${response.status}: ${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function requestMultipart(method, route, formData) {
  const response = await fetch(`${API_BASE_URL}${joinRoute(route)}`, {
    method,
    headers: {
      ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    },
    body: formData,
  });
  updateCookieFromResponse(response);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[${method} ${joinRoute(route)}] HTTP ${response.status}: ${text}`);
  }
  return response.json();
}

async function requestBlob(method, route) {
  const response = await fetch(`${API_BASE_URL}${joinRoute(route)}`, {
    method,
    headers: {
      ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    },
  });
  updateCookieFromResponse(response);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[${method} ${joinRoute(route)}] HTTP ${response.status}: ${text}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function getRiskCount(riskGheGroups) {
  if (!Array.isArray(riskGheGroups)) return 0;
  return riskGheGroups.reduce((total, ghe) => {
    const risks = Array.isArray(ghe?.risks) ? ghe.risks.length : 0;
    return total + risks;
  }, 0);
}

function getAnexoCount(anexos) {
  if (!Array.isArray(anexos)) return 0;
  return anexos.reduce((total, anexo) => {
    const files = Array.isArray(anexo?.files) ? anexo.files.length : 0;
    return total + files;
  }, 0);
}

async function run() {
  const checks = [];

  await requestJson("POST", "/auth/login", {
    username: SMOKE_USERNAME,
    password: SMOKE_PASSWORD,
  });
  checks.push(`login autenticado (${SMOKE_USERNAME})`);

  const home = await requestJson("GET", "/home");
  checks.push(`home carregado (${Array.isArray(home.cards) ? home.cards.length : 0} cards)`);

  const created = await requestJson("POST", "/pgrs", {});
  const pgrId = created?.pgrId;
  if (!pgrId) {
    throw new Error("Resposta de criação sem pgrId.");
  }
  checks.push(`pgr criado (${pgrId})`);

  const stateBefore = await requestJson("GET", `/pgr/${pgrId}/state`);
  checks.push("state inicial carregado");

  await requestJson("PUT", `/pgr/${pgrId}/state`, {
    completedSteps: 3,
    inicioDraft: {
      ...stateBefore?.inicioDraft,
      documentTitle: stateBefore?.inicioDraft?.documentTitle || "Programa de Gerenciamento de Riscos - PGR",
      companyName: "Clínica Exemplo",
      responsible: "Usuário Teste",
      email: "usuario.teste@exemplo.com",
    },
  });
  checks.push("state atualizado");

  await requestJson("POST", `/pgr/${pgrId}/sync-pipefy`, {});
  checks.push("sync pipefy executado");

  const form = new FormData();
  form.append("anexoId", "anexo-art");
  const minimalPdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
  form.append(
    "file",
    new Blob([minimalPdf], { type: "application/pdf" }),
    "smoke-art.pdf"
  );
  const upload = await requestMultipart("POST", `/pgr/${pgrId}/attachments/upload`, form);
  checks.push("upload de anexo validado");

  const uploadedFileId = upload?.file?.id;
  if (!uploadedFileId) {
    throw new Error("Upload retornou sem file.id");
  }
  const downloaded = await requestBlob(
    "GET",
    `/pgr/${pgrId}/attachments/${uploadedFileId}/download`
  );
  if (!downloaded.length) {
    throw new Error("Download de anexo retornou vazio");
  }
  checks.push("download de anexo validado");

  const stateAfter = await requestJson("GET", `/pgr/${pgrId}/state`);
  const inicioDraft = stateAfter?.inicioDraft || {};
  const planAction = stateAfter?.planAction || {};

  const fakePdfPayload = {
    pgrId,
    generatedAt: nowBr,
    documentTitle: inicioDraft.documentTitle || "PGR",
    pipefyCardId: inicioDraft.pipefyCardId || "",
    companyName: inicioDraft.companyName || "",
    unitName: inicioDraft.unitName || "",
    cnpj: inicioDraft.cnpj || "",
    responsible: inicioDraft.responsible || "",
    email: inicioDraft.email || "",
    notes: inicioDraft.notes || "",
    completedSteps: Number(stateAfter?.completedSteps || 0),
    totalSteps: 8,
    gheCount: Array.isArray(stateAfter?.gheGroups) ? stateAfter.gheGroups.length : 0,
    riskCount: getRiskCount(stateAfter?.riskGheGroups),
    anexoCount: getAnexoCount(stateAfter?.anexos),
    diretriz: stateAfter?.anexoDiretriz || "Diretriz 1",
    nr: planAction.nr || "NR-01",
    vigencia: planAction.vigencia || "",
  };

  const pdfBuffer = await requestPdf(`/pgr/${pgrId}/fake-pdf`, fakePdfPayload);
  const outputFile = path.join("/tmp", `${pgrId}-smoke.pdf`);
  await fs.writeFile(outputFile, pdfBuffer);
  checks.push(`pdf fake gerado (${outputFile})`);

  console.log(`\nSmoke test concluído em ${nowBr}`);
  console.log(`API base: ${API_BASE_URL}`);
  console.log(`API prefix: ${API_PREFIX}`);
  console.log("Checklist:");
  for (const item of checks) {
    console.log(`- OK: ${item}`);
  }
}

run().catch((error) => {
  console.error("\nFalha no smoke test.");
  console.error(String(error?.message || error));
  process.exit(1);
});
