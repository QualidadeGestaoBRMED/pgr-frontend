import type { DadosCadastraisDraft, InicioDraft } from "../steps/types";
import type { PlanTableRow } from "../hooks/use-pgr-etapa-derived";
import type {
  AnexoItem,
  GheGroup,
  GheRisk,
  HistoricoData,
  PgrFunction,
  PlanGeneralMeasureRow,
  RiskGheGroup,
} from "../types";
import { defaultHistorico, initialDadosCadastrais, initialInicioDraft } from "../defaults";
import {
  DEFAULT_PDF_LAYOUT_STATE,
  normalizePdfLayoutState,
  type PdfLayoutState,
} from "@/lib/pgr-pdf-runtime/layout";
import {
  isModerateOrHigherPriority,
  normalizePriorityText,
} from "./plan-priority";

type ExtraFieldScope = "empresa" | "estabelecimento" | "contratante" | "quantitativo";

const normalizeExtraScope = (scope: unknown): ExtraFieldScope => {
  if (
    scope === "empresa" ||
    scope === "estabelecimento" ||
    scope === "contratante" ||
    scope === "quantitativo"
  ) {
    return scope;
  }
  return "empresa";
};

const _asText = (value: unknown) => String(value ?? "").trim();

const composeCityState = (city: unknown, state: unknown) => {
  const cityText = _asText(city);
  const stateText = _asText(state);
  if (cityText && stateText) return `${cityText}/${stateText}`;
  return cityText || stateText;
};

const withoutTrailingSegment = (value: unknown, segment: unknown) => {
  const valueText = _asText(value);
  const segmentText = _asText(segment);
  if (!valueText || !segmentText) return valueText;

  const parts = valueText.split(",").map((part) => part.trim()).filter(Boolean);
  const lastPart = parts[parts.length - 1];
  if (lastPart && lastPart.toLocaleLowerCase("pt-BR") === segmentText.toLocaleLowerCase("pt-BR")) {
    return parts.slice(0, -1).join(", ");
  }
  return valueText;
};

const buildAddressJson = ({
  endereco,
  numero,
  bairro,
  cidade,
  estado,
  cep,
}: {
  endereco: unknown;
  numero?: unknown;
  bairro?: unknown;
  cidade: unknown;
  estado: unknown;
  cep: unknown;
}) => {
  const bairroText = _asText(bairro);
  const enderecoText = withoutTrailingSegment(endereco, bairroText);
  const numeroText = _asText(numero);
  const cidadeEstado = composeCityState(cidade, estado);
  const cepText = _asText(cep);
  const enderecoCompleto = enderecoText
    ? [enderecoText, numeroText, bairroText, cidadeEstado, cepText ? `CEP: ${cepText}` : ""]
        .filter(Boolean)
        .join(", ")
    : "";
  return {
    numero: numeroText,
    enderecoCompleto,
  };
};

type BackendDescricaoFunction = {
  setor?: string;
  funcao?: string;
  descricaoAtividades?: string;
  numeroFuncionarios?: string | number;
};

type BackendDescricaoGhe = {
  id?: string;
  nome?: string;
  processo?: string;
  observacoes?: string;
  ambiente?: string;
  funcoes?: BackendDescricaoFunction[];
};

type BackendCaracterizacaoRisk = {
  id?: string;
  tipoAgente?: string;
  descricaoAgente?: string;
  perigo?: string;
  meioPropagacao?: string;
  fontes?: string;
  danosSaude?: string;
  danos_saude?: string;
  healthDamage?: string;
  health_damage?: string;
  unidadeMedida?: string;
  unidade_medida?: string;
  limiteTolerancia?: string;
  limite_tolerancia?: string;
  toleranceLimit?: string;
  tolerance_limit?: string;
  valorMedido?: string;
  valor_medido?: string;
  nivelAcao?: string;
  nivel_acao?: string;
  tipoAvaliacao?: string;
  intensidade?: string;
  severidade?: string;
  probabilidade?: string;
  classificacao?: string;
  medidasControle?: string;
  medidasPrevencaoPlano?: string;
  epc?: string;
  epi?: string;
};

type BackendCaracterizacaoGhe = {
  id?: string;
  nome?: string;
  riscos?: BackendCaracterizacaoRisk[];
};

type BackendNestedAnexoFile = {
  id?: string;
  nome?: string;
  data?: string;
  orientation?: "auto" | "portrait" | "landscape";
  orientacao?: "auto" | "portrait" | "landscape";
  url?: string;
};

type BackendNestedAnexoItem = {
  id?: string;
  titulo?: string;
  orientation?: "auto" | "portrait" | "landscape";
  orientacao?: "auto" | "portrait" | "landscape";
  arquivos?: BackendNestedAnexoFile[];
};

type BackendStateShape = {
  completedSteps?: number | string;
  meta?: {
    completedSteps?: number | string;
    stepStatusById?: Partial<Record<string, boolean>>;
  };
  stepStatusById?: Partial<Record<string, boolean>>;
  inicioDraft?: Partial<InicioDraft>;
  inicio?: Partial<InicioDraft>;
  dadosCadastrais?: Partial<DadosCadastraisDraft>;
  historico?: Partial<HistoricoData>;
  historicoData?: Partial<HistoricoData>;
  descricao?: {
    ghes?: BackendDescricaoGhe[];
  };
  caracterizacao?: {
    ghes?: BackendCaracterizacaoGhe[];
  };
  gheGroups?: GheGroup[];
  riskGheGroups?: RiskGheGroup[];
  planGeneralMeasures?: PlanGeneralMeasureRow[];
  planTableRows?: PlanTableRow[];
  removedPlanRiskKeys?: string[];
  functions?: PgrFunction[];
  planAction?: {
    nr?: string;
    vigencia?: string;
  };
  planoAcao?: {
    nr?: string;
    vigencia?: string;
  };
  anexos?:
    | AnexoItem[]
    | {
        diretriz?: string;
        itens?: BackendNestedAnexoItem[];
      };
  anexoDiretriz?: string;
  extraEstabelecimentoFields?: Array<{
    id?: string;
    title?: string;
    value?: string;
    scope?: "empresa" | "estabelecimento" | "contratante" | "quantitativo" | string;
  }>;
  pdfLayout?: unknown;
};

type AddressJsonFields = {
  numero: string;
  enderecoCompleto: string;
};

type DadosCadastraisJson = DadosCadastraisDraft & {
  empresaNumero: string;
  empresaEnderecoCompleto: string;
  estabelecimentoNumero: string;
  estabelecimentoEnderecoCompleto: string;
  contratanteNumero: string;
  contratanteEnderecoCompleto: string;
  estabelecimentos: Array<(DadosCadastraisDraft["estabelecimentos"][number] & AddressJsonFields)>;
  contratantes: Array<(DadosCadastraisDraft["contratantes"][number] & AddressJsonFields)>;
};

type DuplicateRiskStructureInfo = {
  duplicated: boolean;
  duplicatedWith: string[];
};

const normalizeRiskStructureText = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join(", ");
  }
  return String(value || "").trim();
};

const getRiskStructureKey = (risk: GheRisk) =>
  [
    risk.tipoAgente,
    risk.descricaoAgente,
    (risk as unknown as { danosSaude?: string; healthDamage?: string }).danosSaude ||
      (risk as unknown as { healthDamage?: string }).healthDamage ||
      "",
    risk.meioPropagacao,
    risk.fontes,
    risk.unidadeMedida || "",
    risk.valorMedido || "",
    risk.tipoAvaliacao,
    risk.intensidade,
    risk.nivelAcao || "",
    risk.severidade,
    risk.probabilidade,
    risk.classificacao,
    risk.medidasControle,
    (risk as unknown as { normas?: string }).normas || "",
    normalizeRiskStructureText(risk.epc),
    normalizeRiskStructureText(risk.epi),
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .join("||");

const buildDuplicateRiskStructureInfoByGheId = (
  riskGheGroups: RiskGheGroup[]
): Map<string, DuplicateRiskStructureInfo> => {
  const grouped = new Map<string, Array<{ id: string; name: string }>>();

  riskGheGroups.forEach((ghe) => {
    if (!Array.isArray(ghe.risks) || !ghe.risks.length) return;
    const structureKey = ghe.risks
      .map((risk) => getRiskStructureKey(risk))
      .sort()
      .join("##");
    const existing = grouped.get(structureKey) || [];
    existing.push({ id: ghe.id, name: ghe.name });
    grouped.set(structureKey, existing);
  });

  const result = new Map<string, DuplicateRiskStructureInfo>();
  grouped.forEach((group) => {
    if (group.length <= 1) return;
    group.forEach((ghe) => {
      result.set(ghe.id, {
        duplicated: true,
        duplicatedWith: group
          .filter((item) => item.id !== ghe.id)
          .map((item) => item.name),
      });
    });
  });
  return result;
};

export type PgrDocxPayload = {
  meta: {
    pgrId: string;
    generatedAt: string;
    completedSteps: number;
    totalSteps: number;
    stepStatusById?: Partial<Record<string, boolean>>;
  };
  inicio: InicioDraft;
  dadosCadastrais: DadosCadastraisJson;
  historico: HistoricoData;
  descricao: {
    gheCount: number;
    ghes: Array<{
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
    }>;
  };
  caracterizacao: {
    gheCount: number;
    riskCount: number;
    ghes: Array<{
      id: string;
      nome: string;
      estruturaDuplicada: boolean;
      estruturaDuplicadaCom: string[];
      riscos: Array<{
        id: string;
        tipoAgente: string;
        descricaoAgente: string;
        meioPropagacao: string;
        fontes: string;
        danosSaude?: string;
        unidadeMedida?: string;
        valorMedido?: string;
        nivelAcao?: string;
        limiteTolerancia?: string;
        tipoAvaliacao: string;
        intensidade: string;
        severidade: string;
        probabilidade: string;
        classificacao: string;
        medidasControle: string;
        medidasPrevencaoPlano?: string;
        epc: string;
        epi: string;
      }>;
    }>;
  };
  planoAcao: {
    nr: string;
    vigencia: string;
    itens: Array<{
      ghe: string;
      risco: string;
      prioridade: string;
      classificacao: string;
      medida: string;
      medidas: string;
      epc: string;
      epi: string;
      tipoMedida: string;
      prazoAcao: string;
      responsavelAcao: string;
      acompanhamento: string;
      afericaoResultado: string;
    }>;
  };
  program: {
    nr: string;
    vigencia: string;
    totalEmployees: number;
    totalEmployeesAdditionalFields?: Array<{
      label: string;
      value: string;
    }>;
    responsavelElaboracao: string;
    responsavelCoordenacao: string;
    responsavelImplementacao: string;
  };
  anexos: {
    diretriz: string;
    totalArquivos: number;
    itens: Array<{
      id: string;
      titulo: string;
      arquivos: Array<{
        id: string;
        nome: string;
        orientation?: "auto" | "portrait" | "landscape";
        url?: string;
      }>;
    }>;
  };
  extraEstabelecimentoFields?: Array<{
    id: string;
    title: string;
    value: string;
    scope: ExtraFieldScope;
  }>;
  pdfLayout: PdfLayoutState;
};

export function buildPgrDocxPayload(input: {
  pgrId: string;
  generatedAt: string;
  completedSteps: number;
  totalSteps: number;
  stepStatusById?: Partial<Record<string, boolean>>;
  inicioDraft: InicioDraft;
  dadosCadastrais: DadosCadastraisDraft;
  historicoData: HistoricoData;
  gheGroups: GheGroup[];
  riskGheGroups: RiskGheGroup[];
  planGeneralMeasures?: PlanGeneralMeasureRow[];
  planTableRows?: PlanTableRow[];
  removedPlanRiskKeys?: string[];
  functionsData: PgrFunction[];
  planAction: {
    nr: string;
    vigencia: string;
  };
  anexos: AnexoItem[];
  anexoDiretriz: string;
  extraEstabelecimentoFields?: Array<{
    id: string;
    title: string;
    value: string;
    scope: ExtraFieldScope;
  }>;
  pdfLayout: PdfLayoutState;
}): PgrDocxPayload {
  const functionById = new Map(input.functionsData.map((item) => [item.id, item]));

  const descricaoGhes = input.gheGroups.map((ghe) => ({
    id: ghe.id,
    nome: ghe.name,
    processo: ghe.info.processo,
    observacoes: ghe.info.observacoes,
    ambiente: ghe.info.ambiente,
    funcoes: ghe.items.map((item) => {
      const fn = functionById.get(item.functionId);
      return {
        setor: fn?.setor || "",
        funcao: fn?.funcao || "",
        descricaoAtividades: fn?.descricao || "",
        numeroFuncionarios: item.funcionarios || "",
      };
    }),
  }));

  const duplicateRiskStructureInfoByGheId = buildDuplicateRiskStructureInfoByGheId(
    input.riskGheGroups
  );
  const caracterizacaoGhes = input.riskGheGroups.map((ghe) => {
    const duplicateInfo = duplicateRiskStructureInfoByGheId.get(ghe.id);
    return {
      id: ghe.id,
      nome: ghe.name,
      estruturaDuplicada: duplicateInfo?.duplicated ?? false,
      estruturaDuplicadaCom: duplicateInfo?.duplicatedWith ?? [],
      riscos: ghe.risks.map((risk) => ({
        id: risk.id,
        tipoAgente: risk.tipoAgente,
        descricaoAgente: risk.descricaoAgente,
        meioPropagacao: risk.meioPropagacao,
        fontes: risk.fontes,
        danosSaude: (risk as unknown as { danosSaude?: string; healthDamage?: string }).danosSaude
          || (risk as unknown as { danosSaude?: string; healthDamage?: string }).healthDamage
          || (risk as unknown as { perigo?: string }).perigo
          || "",
        unidadeMedida: risk.unidadeMedida || "",
        valorMedido: risk.valorMedido || "",
        nivelAcao: risk.nivelAcao || "",
        limiteTolerancia: (risk as unknown as { limiteTolerancia?: string; toleranceLimit?: string }).limiteTolerancia
          || (risk as unknown as { limiteTolerancia?: string; toleranceLimit?: string }).toleranceLimit
          || risk.intensidade
          || "",
        tipoAvaliacao: risk.tipoAvaliacao,
        intensidade: risk.intensidade,
        severidade: risk.severidade,
        probabilidade: risk.probabilidade,
        classificacao: risk.classificacao,
        medidasControle: risk.medidasControle,
        medidasPrevencaoPlano: risk.medidasPrevencaoPlano || "",
        epc: risk.epc,
        epi: risk.epi,
      })),
    };
  });

  const mapPlanTableRowToPreviewItem = (row: PlanTableRow) => ({
    ghe: row.gheName || "Todos os GHEs",
    risco: row.descricaoAgente || "",
    prioridade: normalizePriorityText(row.prioridade),
    classificacao: row.classificacao || row.prioridade || "",
    medida: row.medidasPrevencao || "",
    medidas: row.medidasPrevencao || "",
    epc: "",
    epi: "",
    tipoMedida: row.tipoMedida || "",
    prazoAcao: row.prazoAcao || "",
    responsavelAcao: row.responsavelAcao || "",
    acompanhamento: row.acompanhamento || "",
    afericaoResultado: row.afericaoResultado || "",
  });

  const planoItensFromPlanTableRows = Array.isArray(input.planTableRows)
    ? input.planTableRows
        .filter((row) => String(row.medidasPrevencao || "").trim().length > 0)
        .map(mapPlanTableRowToPreviewItem)
    : [];

  const excludedPlanKeys = new Set(input.removedPlanRiskKeys ?? []);
  const planoItensFallback = caracterizacaoGhes.flatMap((ghe) =>
    ghe.riscos
      .filter((risk) => !excludedPlanKeys.has(`${ghe.id}::${risk.id}`))
      .filter((risk) =>
        isModerateOrHigherPriority(
          _asText((risk as unknown as { prioridade?: string }).prioridade) ||
            _asText(risk.classificacao)
        )
      )
      .map((risk) => ({
        ghe: ghe.nome,
        risco: risk.descricaoAgente || "",
        prioridade: normalizePriorityText(
          _asText((risk as unknown as { prioridade?: string }).prioridade) ||
            _asText(risk.classificacao)
        ),
        classificacao: risk.classificacao,
        medida: risk.medidasPrevencaoPlano || "",
        medidas: risk.medidasPrevencaoPlano || "",
        epc: risk.epc,
        epi: risk.epi,
        tipoMedida: _asText((risk as unknown as { tipoMedida?: string }).tipoMedida),
        prazoAcao: _asText((risk as unknown as { prazoAcao?: string }).prazoAcao),
        responsavelAcao: _asText(
          (risk as unknown as { responsavelAcao?: string }).responsavelAcao
        ),
        acompanhamento: _asText(
          (risk as unknown as { acompanhamento?: string }).acompanhamento
        ),
        afericaoResultado: _asText(
          (risk as unknown as { afericaoResultado?: string }).afericaoResultado
        ),
      }))
  );
  const planoItensGeraisFallback = Array.isArray(input.planGeneralMeasures)
    ? input.planGeneralMeasures
        .filter((item) => String(item.descricao || "").trim().length > 0)
        .map((item) => ({
          ghe: item.gheName || "Todos os GHEs",
          risco: "Medidas Gerais",
          prioridade: "Média",
          classificacao: "Risco Moderado",
          medida: item.descricao,
          medidas: item.descricao,
          epc: "",
          epi: "",
          tipoMedida: item.tipoMedida || "",
          prazoAcao: item.prazoAcao || "",
          responsavelAcao: item.responsavelAcao || "",
          acompanhamento: item.acompanhamento || "",
          afericaoResultado: item.afericaoResultado || "",
        }))
    : [];
  const planoItens = planoItensFromPlanTableRows.length
    ? planoItensFromPlanTableRows
    : [...planoItensGeraisFallback, ...planoItensFallback];

  const empresaAddressJson = buildAddressJson({
    endereco: input.dadosCadastrais.empresaEndereco,
    numero: input.dadosCadastrais.empresaNumero,
    bairro: input.dadosCadastrais.empresaBairro,
    cidade: input.dadosCadastrais.empresaCidade,
    estado: input.dadosCadastrais.empresaEstado,
    cep: input.dadosCadastrais.empresaCep,
  });
  const estabelecimentoAddressJson = buildAddressJson({
    endereco: input.dadosCadastrais.estabelecimentoEndereco,
    numero: input.dadosCadastrais.estabelecimentoNumero,
    bairro: input.dadosCadastrais.estabelecimentoBairro,
    cidade: input.dadosCadastrais.estabelecimentoCidade,
    estado: input.dadosCadastrais.estabelecimentoEstado,
    cep: input.dadosCadastrais.estabelecimentoCep,
  });
  const contratantesJson = Array.isArray(input.dadosCadastrais.contratantes)
    ? input.dadosCadastrais.contratantes.map((item, index) => ({
      ...item,
      ...buildAddressJson({
        endereco: item.endereco,
        numero: item.numero || (index === 0 ? input.dadosCadastrais.contratanteNumero : ""),
        bairro: item.bairro,
        cidade: item.cidade,
        estado: item.estado,
        cep: item.cep,
      }),
      }))
    : [];
  const contratanteAddressJson = buildAddressJson({
    endereco: input.dadosCadastrais.contratanteEndereco,
    numero: input.dadosCadastrais.contratanteNumero,
    bairro: input.dadosCadastrais.contratanteBairro,
    cidade: input.dadosCadastrais.contratanteCidade,
    estado: input.dadosCadastrais.contratanteEstado,
    cep: input.dadosCadastrais.contratanteCep,
  });
  const estabelecimentosJson = Array.isArray(input.dadosCadastrais.estabelecimentos)
    ? input.dadosCadastrais.estabelecimentos.map((item, index) => ({
      ...item,
      ...buildAddressJson({
        endereco: item.endereco,
        numero: item.numero || (index === 0 ? input.dadosCadastrais.estabelecimentoNumero : ""),
        bairro: item.bairro,
        cidade: item.cidade,
        estado: item.estado,
        cep: item.cep,
      }),
      }))
    : [];
  const dadosCadastrais: DadosCadastraisJson = {
    ...input.dadosCadastrais,
    empresaNumero: empresaAddressJson.numero,
    empresaEnderecoCompleto: empresaAddressJson.enderecoCompleto,
    estabelecimentoNumero: estabelecimentoAddressJson.numero,
    estabelecimentoEnderecoCompleto: estabelecimentoAddressJson.enderecoCompleto,
    contratanteNumero: contratanteAddressJson.numero,
    contratanteEnderecoCompleto: contratanteAddressJson.enderecoCompleto,
    estabelecimentos: estabelecimentosJson,
    contratantes: contratantesJson,
  };

  const totalArquivos = input.anexos.reduce((total, anexo) => total + anexo.files.length, 0);
  const totalEmployees = descricaoGhes.reduce(
    (groupTotal, ghe) =>
      groupTotal +
      ghe.funcoes.reduce((funcTotal, funcao) => {
        const digits = String(funcao.numeroFuncionarios || "").replace(/\D+/g, "");
        return funcTotal + Number.parseInt(digits || "0", 10);
      }, 0),
    0
  );
  const responsavelElaboracao =
    input.dadosCadastrais.responsavelPgrNome || input.inicioDraft.responsible || "";
  const responsavelCoordenacao =
    input.dadosCadastrais.responsaveisCoordenacaoTecnica?.[0]?.nome || "";
  const responsavelImplementacao =
    input.dadosCadastrais.responsavelImplementacaoPgrNome || "";
  const totalEmployeesAdditionalFields = Array.isArray(input.extraEstabelecimentoFields)
    ? input.extraEstabelecimentoFields
        .filter((item) => item.scope === "quantitativo")
        .map((item) => ({
          label: String(item.title || "").trim(),
          value: String(item.value || "").trim(),
        }))
        .filter((item) => item.label || item.value)
    : [];

  return {
    meta: {
      pgrId: input.pgrId,
      generatedAt: input.generatedAt,
      completedSteps: input.completedSteps,
      totalSteps: input.totalSteps,
      stepStatusById: input.stepStatusById,
    },
    inicio: input.inicioDraft,
    dadosCadastrais,
    historico: input.historicoData,
    descricao: {
      gheCount: descricaoGhes.length,
      ghes: descricaoGhes,
    },
    caracterizacao: {
      gheCount: caracterizacaoGhes.length,
      riskCount: planoItens.length,
      ghes: caracterizacaoGhes,
    },
    planoAcao: {
      nr: input.planAction.nr,
      vigencia: input.planAction.vigencia,
      itens: planoItens,
    },
    program: {
      nr: input.planAction.nr,
      vigencia: input.planAction.vigencia,
      totalEmployees,
      totalEmployeesAdditionalFields,
      responsavelElaboracao,
      responsavelCoordenacao,
      responsavelImplementacao,
    },
    anexos: {
      diretriz: input.anexoDiretriz,
      totalArquivos,
      itens: input.anexos.map((anexo) => ({
        id: anexo.id,
        titulo: anexo.title,
        arquivos: anexo.files.map((file) => ({
          id: file.id,
          nome: file.name,
          orientation: file.orientation ?? "auto",
          url: file.url,
        })),
      })),
    },
    extraEstabelecimentoFields: Array.isArray(input.extraEstabelecimentoFields)
      ? input.extraEstabelecimentoFields.map((item) => ({
          ...item,
          scope: normalizeExtraScope(item.scope),
        }))
      : [],
    pdfLayout: normalizePdfLayoutState(input.pdfLayout || DEFAULT_PDF_LAYOUT_STATE),
  };
}

export function buildPgrDocxPayloadFromBackendState(input: {
  pgrId: string;
  generatedAt: string;
  totalSteps: number;
  backendState: unknown;
}): PgrDocxPayload {
  const state =
    input.backendState && typeof input.backendState === "object"
      ? (input.backendState as BackendStateShape)
      : ({} as BackendStateShape);
  const descricaoGhes = Array.isArray(state.descricao?.ghes) ? state.descricao.ghes : [];
  const caracterizacaoGhes = Array.isArray(state.caracterizacao?.ghes)
    ? state.caracterizacao.ghes
    : [];

  const fallbackFunctions: PgrFunction[] = [];
  const fallbackFunctionMap = new Map<string, string>();

  const fallbackGheGroups: GheGroup[] = descricaoGhes.map((ghe, gheIndex: number) => {
    const rawItems = Array.isArray(ghe?.funcoes) ? ghe.funcoes : [];
    const items = rawItems.map((fn, fnIndex: number) => {
      const key = `${fn?.setor || ""}__${fn?.funcao || ""}__${fn?.descricaoAtividades || ""}`;
      let functionId = fallbackFunctionMap.get(key);
      if (!functionId) {
        functionId = `fn-${gheIndex + 1}-${fnIndex + 1}`;
        fallbackFunctionMap.set(key, functionId);
        fallbackFunctions.push({
          id: functionId,
          setor: fn?.setor || "",
          funcao: fn?.funcao || "",
          descricao: fn?.descricaoAtividades || "",
        });
      }
      return {
        functionId,
        funcionarios: String(fn?.numeroFuncionarios || ""),
      };
    });

    return {
      id: ghe?.id || `ghe-${gheIndex + 1}`,
      name: ghe?.nome || `GHE ${gheIndex + 1}`,
      info: {
        processo: ghe?.processo || "",
        observacoes: ghe?.observacoes || "",
        ambiente: ghe?.ambiente || "",
      },
      items,
    };
  });

  const fallbackRiskGheGroups: RiskGheGroup[] = caracterizacaoGhes.map((ghe, gheIndex: number) => ({
    id: ghe?.id || `ghe-${gheIndex + 1}`,
    name: ghe?.nome || `GHE ${gheIndex + 1}`,
    risks: Array.isArray(ghe?.riscos)
      ? ghe.riscos.map((risk, riskIndex: number) => ({
          id: risk?.id || `risk-${gheIndex + 1}-${riskIndex + 1}`,
          tipoAgente: risk?.tipoAgente || "",
          descricaoAgente: risk?.descricaoAgente || "",
          meioPropagacao: risk?.meioPropagacao || "",
          fontes: risk?.fontes || "",
          danosSaude:
            risk?.danosSaude ||
            risk?.danos_saude ||
            risk?.healthDamage ||
            risk?.health_damage ||
            risk?.perigo ||
            "",
          unidadeMedida: risk?.unidadeMedida || risk?.unidade_medida || "",
          valorMedido: risk?.valorMedido || risk?.valor_medido || "",
          nivelAcao: risk?.nivelAcao || risk?.nivel_acao || "",
          limiteTolerancia:
            risk?.limiteTolerancia ||
            risk?.limite_tolerancia ||
            risk?.toleranceLimit ||
            risk?.tolerance_limit ||
            risk?.intensidade ||
            "",
          tipoAvaliacao: risk?.tipoAvaliacao || "",
          intensidade: risk?.intensidade || "",
          severidade: risk?.severidade || "",
          probabilidade: risk?.probabilidade || "",
          classificacao: risk?.classificacao || "",
          medidasControle: risk?.medidasControle || "",
          medidasPrevencaoPlano: (risk as { medidasPrevencaoPlano?: string } | undefined)?.medidasPrevencaoPlano || "",
          epc: risk?.epc || "",
          epi: risk?.epi || "",
        }))
      : [],
  }));

  const nestedAnexos = !Array.isArray(state.anexos) ? state.anexos : undefined;
  const fallbackAnexos: AnexoItem[] = Array.isArray(nestedAnexos?.itens)
    ? nestedAnexos.itens.map((item, index: number) => ({
        id: item?.id || `anexo-${index + 1}`,
        title: item?.titulo || "",
        files: Array.isArray(item?.arquivos)
          ? item.arquivos.map((file, fileIndex: number) => ({
              id: file?.id || `file-${index + 1}-${fileIndex + 1}`,
              name: file?.nome || "",
              date: file?.data || "",
              orientation:
                file?.orientation ||
                file?.orientacao ||
                "auto",
              url: file?.url,
            }))
          : [],
      }))
    : [];
  const inicioDraft: InicioDraft = {
    ...initialInicioDraft,
    ...(state.inicioDraft || state.inicio || {}),
  };
  const dadosCadastrais: DadosCadastraisDraft = {
    ...initialDadosCadastrais,
    ...(state.dadosCadastrais || {}),
  };
  const historicoData: HistoricoData = {
    ...defaultHistorico,
    ...(state.historico || state.historicoData || {}),
  };

  return buildPgrDocxPayload({
    pgrId: input.pgrId,
    generatedAt: input.generatedAt,
    completedSteps: Number.isFinite(Number(state.completedSteps ?? state.meta?.completedSteps))
      ? Number(state.completedSteps ?? state.meta?.completedSteps)
      : 0,
    totalSteps: input.totalSteps,
    stepStatusById: state.stepStatusById || state.meta?.stepStatusById || undefined,
    inicioDraft,
    dadosCadastrais,
    historicoData,
    gheGroups: Array.isArray(state.gheGroups) ? state.gheGroups : fallbackGheGroups,
    riskGheGroups: Array.isArray(state.riskGheGroups)
      ? state.riskGheGroups
      : fallbackRiskGheGroups,
    planGeneralMeasures: Array.isArray(state.planGeneralMeasures)
      ? state.planGeneralMeasures
          .map((item) => ({
            id: String(item?.id || "").trim(),
            nr: String(item?.nr || "").trim(),
            descricao: String(item?.descricao || "").trim(),
            gheName: String(item?.gheName || "").trim(),
            targetGheIds: Array.isArray(item?.targetGheIds)
              ? item.targetGheIds.map((id) => String(id || "").trim()).filter(Boolean)
              : [],
            tipoMedida: String(item?.tipoMedida || "").trim(),
            prazoAcao: String(item?.prazoAcao || "").trim(),
            responsavelAcao: String(item?.responsavelAcao || "").trim(),
            acompanhamento: String(item?.acompanhamento || "").trim(),
            afericaoResultado: String(item?.afericaoResultado || "").trim(),
          }))
          .filter((item) => item.id && item.descricao)
      : [],
    planTableRows: Array.isArray(state.planTableRows) ? state.planTableRows : undefined,
    removedPlanRiskKeys: Array.isArray(state.removedPlanRiskKeys)
      ? state.removedPlanRiskKeys.filter((item): item is string => typeof item === "string")
      : [],
    functionsData: Array.isArray(state.functions) ? state.functions : fallbackFunctions,
    planAction: {
      nr: state.planAction?.nr || state.planoAcao?.nr || "NR-01",
      vigencia: state.planAction?.vigencia || state.planoAcao?.vigencia || "",
    },
    anexos: Array.isArray(state.anexos) ? state.anexos : fallbackAnexos,
    anexoDiretriz: state.anexoDiretriz || nestedAnexos?.diretriz || "Diretriz 1",
    extraEstabelecimentoFields: Array.isArray(state.extraEstabelecimentoFields)
      ? state.extraEstabelecimentoFields
          .map((item): { id: string; title: string; value: string; scope: ExtraFieldScope } => ({
            id: String(item?.id || "").trim(),
            title: String(item?.title || "").trim(),
            value: String(item?.value || "").trim(),
            scope: normalizeExtraScope(item?.scope),
          }))
          .filter((item) => item.title || item.value)
      : [],
    pdfLayout: normalizePdfLayoutState(state.pdfLayout ?? DEFAULT_PDF_LAYOUT_STATE),
  });
}
