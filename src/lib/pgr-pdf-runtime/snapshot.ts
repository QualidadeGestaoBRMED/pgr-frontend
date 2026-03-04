export type RuntimeRisk = {
  tipoAgente: string;
  descricaoAgente: string;
  perigo: string;
  meioPropagacao: string;
  fontes: string;
  tipoAvaliacao: string;
  intensidade: string;
  severidade: string;
  probabilidade: string;
  classificacao: string;
  medidasControle: string;
  epc: string[];
  epi: string[];
};

export type RuntimeGhe = {
  id: string;
  nome: string;
  processo: string;
  observacoes: string;
  ambiente: string;
  funcoes: Array<{
    setor: string;
    funcao: string;
    descricaoAtividades: string;
    numeroFuncionarios: string;
  }>;
  riscos: RuntimeRisk[];
  planoItens: Array<{
    risco: string;
    classificacao: string;
    medidas: string;
  }>;
};

export type RuntimeSnapshot = {
  schemaVersion: "pgr.runtime.v1";
  meta: {
    pgrId: string;
    generatedDate: string;
    anl: string;
    revisionReason: string;
  };
  company: {
    name: string;
    razaoSocial: string;
    cnpj: string;
    cnae: string;
    atividadePrincipal: string;
    grauRisco: string;
    enderecoCompleto: string;
  };
  establishment: {
    name: string;
    cnpj: string;
    cnae: string;
    atividadePrincipal: string;
    grauRisco: string;
  };
  program: {
    nr: string;
    vigencia: string;
    totalEmployees: number;
    responsavelElaboracao: string;
    responsavelCoordenacao: string;
    responsavelImplementacao: string;
  };
  annexes: {
    hasInventario: boolean;
    hasMedidas: boolean;
    hasPlano: boolean;
    hasArtAnexo: boolean;
  };
  ghes: RuntimeGhe[];
};

function sanitizeText(value: unknown) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseInt(String(value ?? "").replace(/\D+/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateOnly(value: string) {
  const normalized = sanitizeText(value);
  const match = normalized.match(/\d{2}\/\d{2}\/\d{4}/);
  if (match) return match[0];
  return new Date().toLocaleDateString("pt-BR");
}

function normalizeKey(value: unknown) {
  return sanitizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function formatAnl(value: unknown) {
  const parsed = Number.parseInt(String(value ?? "").replace(/\D+/g, ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return "01";
  return String(parsed).padStart(2, "0");
}

function resolveAnlValue(payload: any, historico: any) {
  const explicit =
    payload?.meta?.anl ??
    payload?.meta?.analise ??
    payload?.meta?.analysis ??
    payload?.inicio?.anl ??
    payload?.inicioDraft?.anl;

  if (explicit) return formatAnl(explicit);

  const changes = Array.isArray(historico?.changes) ? historico.changes : [];
  if (!changes.length) return "01";

  const latest = changes[changes.length - 1] || {};
  const candidates = [
    latest?.analysis,
    latest?.analise,
    latest?.anl,
    latest?.version,
    latest?.versao,
  ];

  for (const candidate of candidates) {
    const text = sanitizeText(candidate);
    if (!text) continue;
    const direct = text.match(/ANL\D*(\d{1,4})/i);
    if (direct?.[1]) return formatAnl(direct[1]);
    const fallback = text.match(/(\d{1,4})/);
    if (fallback?.[1]) return formatAnl(fallback[1]);
  }

  return formatAnl(changes.length + 1);
}

function extractRevisionReason(historico: any) {
  if (!Array.isArray(historico?.changes) || !historico.changes.length) {
    return "Elaboração inicial";
  }
  const latest = historico.changes[historico.changes.length - 1] || {};
  return sanitizeText(latest?.reason) || sanitizeText(latest?.analysis) || "Atualização do PGR";
}

export function buildRuntimeSnapshot(payload: any): RuntimeSnapshot {
  const inicio = payload?.inicio ?? payload?.inicioDraft ?? {};
  const dados = payload?.dadosCadastrais ?? {};
  const descricao = payload?.descricao ?? {};
  const caracterizacao = payload?.caracterizacao ?? {};
  const planoAcao = payload?.planoAcao ?? payload?.planAction ?? {};
  const historico = payload?.historico ?? payload?.historicoData ?? {};
  const anexos = payload?.anexos ?? {};

  const companyName =
    sanitizeText(inicio.companyName) ||
    sanitizeText(dados.empresaNome) ||
    sanitizeText(dados.empresaRazaoSocial) ||
    "NÃO INFORMADO";

  const establishmentName =
    sanitizeText(dados.estabelecimentoNome) || sanitizeText(inicio.unitName) || "NÃO INFORMADO";

  const generatedDate = formatDateOnly(payload?.meta?.generatedAt);
  const vigencia = sanitizeText(planoAcao.vigencia) || generatedDate;

  const responsavelNome =
    sanitizeText(dados.responsavelPgrNome) || sanitizeText(inicio.responsible) || "NÃO INFORMADO";
  const responsavelFuncao = sanitizeText(dados.responsavelPgrFuncao) || "Responsável técnico";
  const responsavelContato = [
    sanitizeText(dados.responsavelPgrTelefone),
    sanitizeText(dados.responsavelPgrEmail),
    sanitizeText(dados.responsavelPgrCpf) ? `CPF ${sanitizeText(dados.responsavelPgrCpf)}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
  const responsavelElaboracao = [responsavelNome, responsavelFuncao, responsavelContato]
    .filter(Boolean)
    .join(" - ");
  const responsavelCoordenacao =
    [sanitizeText(inicio.responsible), sanitizeText(inicio.email)].filter(Boolean).join(" - ") ||
    responsavelElaboracao;
  const responsavelImplementacao =
    sanitizeText(dados.responsavelPgrNome) || sanitizeText(inicio.responsible) || responsavelNome;

  const descricaoGhes = Array.isArray(descricao?.ghes) ? descricao.ghes : [];
  const caracterizacaoGhes = Array.isArray(caracterizacao?.ghes) ? caracterizacao.ghes : [];
  const planoItens = Array.isArray(planoAcao?.itens) ? planoAcao.itens : [];

  const riscosByGheId = new Map<string, RuntimeRisk[]>();
  const riscosByGheNome = new Map<string, RuntimeRisk[]>();
  caracterizacaoGhes.forEach((ghe: any) => {
    const riscos = Array.isArray(ghe?.riscos)
      ? ghe.riscos.map((risk: any) => ({
          tipoAgente: sanitizeText(risk?.tipoAgente),
          descricaoAgente: sanitizeText(risk?.descricaoAgente),
          perigo: sanitizeText(risk?.perigo),
          meioPropagacao: sanitizeText(risk?.meioPropagacao),
          fontes: sanitizeText(risk?.fontes),
          tipoAvaliacao: sanitizeText(risk?.tipoAvaliacao),
          intensidade: sanitizeText(risk?.intensidade),
          severidade: sanitizeText(risk?.severidade),
          probabilidade: sanitizeText(risk?.probabilidade),
          classificacao: sanitizeText(risk?.classificacao),
          medidasControle: sanitizeText(risk?.medidasControle),
          epc: Array.isArray(risk?.epc) ? risk.epc.map(sanitizeText).filter(Boolean) : [],
          epi: Array.isArray(risk?.epi) ? risk.epi.map(sanitizeText).filter(Boolean) : [],
        }))
      : [];
    const id = sanitizeText(ghe?.id);
    if (id) riscosByGheId.set(id, riscos);
    const nomeKey = normalizeKey(ghe?.nome);
    if (nomeKey) riscosByGheNome.set(nomeKey, riscos);
  });

  const planoByGhe = new Map<string, Array<{ risco: string; classificacao: string; medidas: string }>>();
  planoItens.forEach((item: any) => {
    const key = normalizeKey(item?.ghe);
    if (!key) return;
    const current = planoByGhe.get(key) || [];
    current.push({
      risco: sanitizeText(item?.risco),
      classificacao: sanitizeText(item?.classificacao),
      medidas: sanitizeText(item?.medidas),
    });
    planoByGhe.set(key, current);
  });

  const resolvedGhes = descricaoGhes.length
    ? descricaoGhes
    : caracterizacaoGhes.map((ghe: any, index: number) => ({
        id: ghe?.id || `ghe-${index + 1}`,
        nome: ghe?.nome || `GHE ${index + 1}`,
        processo: "",
        observacoes: "",
        ambiente: "",
        funcoes: [],
      }));

  const ghes: RuntimeGhe[] = resolvedGhes.map((ghe: any, index: number) => {
    const nome = sanitizeText(ghe?.nome) || `GHE ${index + 1}`;
    const id = sanitizeText(ghe?.id) || `ghe-${index + 1}`;
    const riscos =
      riscosByGheId.get(id) || riscosByGheNome.get(normalizeKey(nome)) || [];
    const planoRows = planoByGhe.get(normalizeKey(nome)) || [];

    const funcoes = Array.isArray(ghe?.funcoes)
      ? ghe.funcoes.map((fn: any) => ({
          setor: sanitizeText(fn?.setor),
          funcao: sanitizeText(fn?.funcao),
          descricaoAtividades: sanitizeText(fn?.descricaoAtividades),
          numeroFuncionarios: sanitizeText(fn?.numeroFuncionarios),
        }))
      : [];

    return {
      id,
      nome,
      processo: sanitizeText(ghe?.processo),
      observacoes: sanitizeText(ghe?.observacoes),
      ambiente: sanitizeText(ghe?.ambiente),
      funcoes,
      riscos,
      planoItens: planoRows,
    };
  });

  const totalEmployees = ghes.reduce(
    (acc, ghe) =>
      acc + ghe.funcoes.reduce((local, fn) => local + toNumber(fn.numeroFuncionarios), 0),
    0
  );

  const anexoItems = Array.isArray(anexos?.itens) ? anexos.itens : [];
  const hasArtAnexo = anexoItems.some(
    (item: any) =>
      /art/i.test(sanitizeText(item?.titulo)) &&
      Array.isArray(item?.arquivos) &&
      item.arquivos.length > 0
  );
  const hasInventario = ghes.some((ghe) => ghe.funcoes.length > 0 || ghe.riscos.length > 0);
  const hasMedidas = ghes.some((ghe) => ghe.riscos.length > 0);
  const hasPlano = ghes.some((ghe) => ghe.planoItens.length > 0);

  return {
    schemaVersion: "pgr.runtime.v1",
    meta: {
      pgrId: sanitizeText(payload?.meta?.pgrId) || sanitizeText(inicio.pipefyCardId),
      generatedDate,
      anl: resolveAnlValue(payload, historico),
      revisionReason: extractRevisionReason(historico),
    },
    company: {
      name: companyName,
      razaoSocial: sanitizeText(dados?.empresaRazaoSocial) || companyName,
      cnpj: sanitizeText(dados?.empresaCnpj),
      cnae: sanitizeText(dados?.empresaCnae),
      atividadePrincipal: sanitizeText(dados?.empresaAtividadePrincipal),
      grauRisco: sanitizeText(dados?.empresaGrauRisco),
      enderecoCompleto: [
        sanitizeText(dados?.empresaEndereco),
        sanitizeText(dados?.empresaCidade),
        sanitizeText(dados?.empresaEstado),
        sanitizeText(dados?.empresaCep),
      ]
        .filter(Boolean)
        .join(" - "),
    },
    establishment: {
      name: sanitizeText(dados?.estabelecimentoNome) || establishmentName,
      cnpj: sanitizeText(dados?.estabelecimentoCnpj),
      cnae: sanitizeText(dados?.estabelecimentoCnae),
      atividadePrincipal: sanitizeText(dados?.estabelecimentoAtividadePrincipal),
      grauRisco: sanitizeText(dados?.estabelecimentoGrauRisco),
    },
    program: {
      nr: sanitizeText(planoAcao?.nr) || "NR-01",
      vigencia,
      totalEmployees,
      responsavelElaboracao,
      responsavelCoordenacao,
      responsavelImplementacao,
    },
    annexes: {
      hasInventario,
      hasMedidas,
      hasPlano,
      hasArtAnexo,
    },
    ghes,
  };
}
