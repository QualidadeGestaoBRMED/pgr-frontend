#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const API_BASE_URL = (process.env.API_BASE_URL || "http://127.0.0.1:8001").replace(
  /\/$/,
  ""
);

const nowBr = new Date().toLocaleString("pt-BR");

async function requestJson(method, route, body) {
  const response = await fetch(`${API_BASE_URL}${route}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[${method} ${route}] HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

async function requestPdf(route, body) {
  const response = await fetch(`${API_BASE_URL}${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[POST ${route}] HTTP ${response.status}: ${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
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

  const home = await requestJson("GET", "/api/frontend/home");
  checks.push(`home carregado (${Array.isArray(home.cards) ? home.cards.length : 0} cards)`);

  const created = await requestJson("POST", "/api/frontend/pgrs", {});
  const pgrId = created?.pgrId;
  if (!pgrId) {
    throw new Error("Resposta de criação sem pgrId.");
  }
  checks.push(`pgr criado (${pgrId})`);

  const stateBefore = await requestJson("GET", `/api/frontend/pgr/${pgrId}/state`);
  checks.push("state inicial carregado");

  await requestJson("PUT", `/api/frontend/pgr/${pgrId}/state`, {
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

  await requestJson("POST", `/api/frontend/pgr/${pgrId}/sync-pipefy`, {});
  checks.push("sync pipefy executado");

  const stateAfter = await requestJson("GET", `/api/frontend/pgr/${pgrId}/state`);
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

  const pdfBuffer = await requestPdf(`/api/frontend/pgr/${pgrId}/fake-pdf`, fakePdfPayload);
  const outputFile = path.join("/tmp", `${pgrId}-smoke.pdf`);
  await fs.writeFile(outputFile, pdfBuffer);
  checks.push(`pdf fake gerado (${outputFile})`);

  console.log(`\nSmoke test concluído em ${nowBr}`);
  console.log(`API base: ${API_BASE_URL}`);
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
