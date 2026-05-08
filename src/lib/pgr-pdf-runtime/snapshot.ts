export type RuntimeRisk = {
  tipoAgente: string;
  descricaoAgente: string;
  meioPropagacao: string;
  danosSaude: string;
  fontes: string;
  unidadeMedida: string;
  valorMedido: string;
  nivelAcao: string;
  limiteTolerancia: string;
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
    tipoMedida: string;
    prazoAcao: string;
    responsavelAcao: string;
    acompanhamento: string;
    afericaoResultado: string;
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
  updateHistory: Array<{
    alteracao: string;
    motivo: string;
    data: string;
  }>;
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
  contractors: Array<{
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    cnae: string;
    endereco: string;
    cep: string;
    cidade: string;
    estado: string;
    grauRisco: string;
    atividadePrincipal: string;
  }>;
  identificationExtras: {
    empresa: Array<{ title: string; value: string }>;
    estabelecimento: Array<{ title: string; value: string }>;
    contratante: Array<{ title: string; value: string }>;
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
    items: Array<{
      titulo: string;
      arquivos: string[];
    }>;
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

function formatHistoryDate(value: unknown, fallbackDate: string) {
  const normalized = sanitizeText(value);
  if (!normalized) return fallbackDate;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) return normalized;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [yyyy, mm, dd] = normalized.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }
  const ptDate = normalized.match(/\d{2}\/\d{2}\/\d{4}/);
  if (ptDate?.[0]) return ptDate[0];
  const isoDate = normalized.match(/\d{4}-\d{2}-\d{2}/);
  if (isoDate?.[0]) {
    const [yyyy, mm, dd] = isoDate[0].split("-");
    return `${dd}/${mm}/${yyyy}`;
  }
  return fallbackDate;
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
  const extraFieldsRaw = Array.isArray(payload?.extraEstabelecimentoFields)
    ? payload.extraEstabelecimentoFields
    : [];
  const identificationExtras = {
    empresa: [] as Array<{ title: string; value: string }>,
    estabelecimento: [] as Array<{ title: string; value: string }>,
    contratante: [] as Array<{ title: string; value: string }>,
  };
  extraFieldsRaw.forEach((item: any) => {
    const scope = sanitizeText(item?.scope).toLowerCase();
    const title = sanitizeText(item?.title);
    const value = sanitizeText(item?.value);
    if (!title && !value) return;
    if (scope === "estabelecimento") {
      identificationExtras.estabelecimento.push({ title: title || "Campo adicional", value });
      return;
    }
    if (scope === "contratante") {
      identificationExtras.contratante.push({ title: title || "Campo adicional", value });
      return;
    }
    identificationExtras.empresa.push({ title: title || "Campo adicional", value });
  });
  const historicoChanges = Array.isArray(historico?.changes) ? historico.changes : [];
  const updateHistory = historicoChanges
    .map((item: any) => ({
      alteracao: sanitizeText(item?.change),
      motivo: sanitizeText(item?.reason),
      data: formatHistoryDate(item?.date, generatedDate),
    }))
    .filter(
      (item: { alteracao: string; motivo: string; data: string }) =>
        item.alteracao || item.motivo || item.data
    );

  const responsavelElaboracao = [
    sanitizeText(inicio.responsible),
    sanitizeText(inicio.email),
  ]
    .filter(Boolean)
    .join(" - ") || "NÃO INFORMADO";

  const coordenadoresRaw = Array.isArray(dados?.responsaveisCoordenacaoTecnica)
    ? dados.responsaveisCoordenacaoTecnica
    : [];
  const coordenadoresFormatados = coordenadoresRaw
    .map((item: any) => {
      const nome = sanitizeText(item?.nome);
      const funcao = sanitizeText(item?.funcao);
      const telefone = sanitizeText(item?.telefone);
      const email = sanitizeText(item?.email);
      const cpf = sanitizeText(item?.cpf);
      const contato = [telefone, email, cpf ? `CPF ${cpf}` : ""].filter(Boolean).join(" | ");
      return [nome, funcao, contato].filter(Boolean).join(" - ");
    })
    .filter(Boolean);
  const responsavelCoordenacao =
    coordenadoresFormatados.join("; ") || "NÃO INFORMADO";

  const responsavelImplementacaoNome = sanitizeText(dados.responsavelPgrNome);
  const responsavelImplementacaoFuncao = sanitizeText(dados.responsavelPgrFuncao);
  const responsavelImplementacaoContato = [
    sanitizeText(dados.responsavelPgrTelefone),
    sanitizeText(dados.responsavelPgrEmail),
    sanitizeText(dados.responsavelPgrCpf)
      ? `CPF ${sanitizeText(dados.responsavelPgrCpf)}`
      : "",
  ]
    .filter(Boolean)
    .join(" | ");
  const responsavelImplementacao = [
    responsavelImplementacaoNome,
    responsavelImplementacaoFuncao,
    responsavelImplementacaoContato,
  ]
    .filter(Boolean)
    .join(" - ") || "NÃO INFORMADO";

  const contractorsRaw = Array.isArray(dados?.contratantes) ? dados.contratantes : [];
  const contractors = contractorsRaw
    .map((item: any) => ({
      nomeFantasia: sanitizeText(item?.nomeFantasia),
      razaoSocial: sanitizeText(item?.razaoSocial),
      cnpj: sanitizeText(item?.cnpj),
      cnae: sanitizeText(item?.cnae),
      endereco: sanitizeText(item?.endereco),
      cep: sanitizeText(item?.cep),
      cidade: sanitizeText(item?.cidade),
      estado: sanitizeText(item?.estado),
      grauRisco: sanitizeText(item?.grauRisco),
      atividadePrincipal: sanitizeText(item?.atividadePrincipal),
    }))
    .filter((item: any) =>
      Object.values(item).some((value) => sanitizeText(value))
    );

  if (!contractors.length) {
    const legacyContractor = {
      nomeFantasia: sanitizeText(dados?.contratanteNomeFantasia),
      razaoSocial: sanitizeText(dados?.contratanteRazaoSocial),
      cnpj: sanitizeText(dados?.contratanteCnpj),
      cnae: sanitizeText(dados?.contratanteCnae),
      endereco: sanitizeText(dados?.contratanteEndereco),
      cep: sanitizeText(dados?.contratanteCep),
      cidade: sanitizeText(dados?.contratanteCidade),
      estado: sanitizeText(dados?.contratanteEstado),
      grauRisco: sanitizeText(dados?.contratanteGrauRisco),
      atividadePrincipal: sanitizeText(dados?.contratanteAtividadePrincipal),
    };
    if (Object.values(legacyContractor).some((value) => sanitizeText(value))) {
      contractors.push(legacyContractor);
    }
  }

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
          meioPropagacao: sanitizeText(risk?.meioPropagacao),
          danosSaude: sanitizeText(
            risk?.danosSaude ||
              risk?.danos_saude ||
              risk?.healthDamage ||
              risk?.health_damage ||
              risk?.perigo
          ),
          fontes: sanitizeText(risk?.fontes),
          unidadeMedida: sanitizeText(risk?.unidadeMedida || risk?.unidade_medida),
          valorMedido: sanitizeText(risk?.valorMedido || risk?.valor_medido),
          nivelAcao: sanitizeText(risk?.nivelAcao || risk?.nivel_acao),
          limiteTolerancia: sanitizeText(
            risk?.limiteTolerancia ||
              risk?.limite_tolerancia ||
              risk?.toleranceLimit ||
              risk?.tolerance_limit ||
              risk?.intensidade
          ),
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

  const planoByGhe = new Map<
    string,
    Array<{
      risco: string;
      classificacao: string;
      medidas: string;
      tipoMedida: string;
      prazoAcao: string;
      responsavelAcao: string;
      acompanhamento: string;
      afericaoResultado: string;
    }>
  >();
  planoItens.forEach((item: any) => {
    const key = normalizeKey(item?.ghe);
    if (!key) return;
    const current = planoByGhe.get(key) || [];
    current.push({
      risco: sanitizeText(item?.risco),
      classificacao: sanitizeText(item?.classificacao),
      medidas: sanitizeText(item?.medidas),
      tipoMedida: sanitizeText(
        item?.tipoMedida ||
          item?.tipo_medida ||
          item?.tipoMedidasPrevencao ||
          item?.tipo_medidas_prevencao
      ),
      prazoAcao: sanitizeText(item?.prazoAcao || item?.prazo_acao),
      responsavelAcao: sanitizeText(item?.responsavelAcao || item?.responsavel_acao),
      acompanhamento: sanitizeText(item?.acompanhamento),
      afericaoResultado: sanitizeText(
        item?.afericaoResultado || item?.afericao_resultado
      ),
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
    updateHistory:
      updateHistory.length > 0
        ? updateHistory
        : [
            {
              alteracao: "00",
              motivo: "Elaboração inicial",
              data: generatedDate,
            },
          ],
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
    contractors,
    identificationExtras,
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
      items: anexoItems.map((item: any) => ({
        titulo: sanitizeText(item?.titulo),
        arquivos: Array.isArray(item?.arquivos)
          ? item.arquivos.map((file: any) => sanitizeText(file?.nome)).filter(Boolean)
          : [],
      })),
    },
    ghes,
  };
}
