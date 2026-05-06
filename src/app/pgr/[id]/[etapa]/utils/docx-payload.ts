import type { DadosCadastraisDraft, InicioDraft } from "../steps/types";
import type { AnexoItem, GheGroup, HistoricoData, PgrFunction, RiskGheGroup } from "../types";
import { defaultHistorico, initialDadosCadastrais, initialInicioDraft } from "../defaults";
import {
  DEFAULT_PDF_LAYOUT_STATE,
  normalizePdfLayoutState,
  type PdfLayoutState,
} from "@/lib/pgr-pdf-runtime/layout";

type ExtraFieldScope = "empresa" | "estabelecimento" | "contratante";

const normalizeExtraScope = (scope: unknown): ExtraFieldScope => {
  if (scope === "empresa" || scope === "estabelecimento" || scope === "contratante") {
    return scope;
  }
  return "empresa";
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
  url?: string;
};

type BackendNestedAnexoItem = {
  id?: string;
  titulo?: string;
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
    scope?: "empresa" | "estabelecimento" | "contratante" | string;
  }>;
  pdfLayout?: unknown;
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
  dadosCadastrais: DadosCadastraisDraft;
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
      classificacao: string;
      medidas: string;
      epc: string;
      epi: string;
    }>;
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

  const caracterizacaoGhes = input.riskGheGroups.map((ghe) => ({
    id: ghe.id,
    nome: ghe.name,
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
      epc: risk.epc,
      epi: risk.epi,
    })),
  }));

  const excludedPlanKeys = new Set(input.removedPlanRiskKeys ?? []);
  const planoItens = caracterizacaoGhes.flatMap((ghe) =>
    ghe.riscos
      .filter((risk) => !excludedPlanKeys.has(`${ghe.id}::${risk.id}`))
      .map((risk) => ({
        ghe: ghe.nome,
        risco: risk.descricaoAgente || "",
        classificacao: risk.classificacao,
        medidas: risk.medidasControle,
        epc: risk.epc,
        epi: risk.epi,
      }))
  );

  const totalArquivos = input.anexos.reduce((total, anexo) => total + anexo.files.length, 0);
  return {
    meta: {
      pgrId: input.pgrId,
      generatedAt: input.generatedAt,
      completedSteps: input.completedSteps,
      totalSteps: input.totalSteps,
      stepStatusById: input.stepStatusById,
    },
    inicio: input.inicioDraft,
    dadosCadastrais: input.dadosCadastrais,
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
    anexos: {
      diretriz: input.anexoDiretriz,
      totalArquivos,
      itens: input.anexos.map((anexo) => ({
        id: anexo.id,
        titulo: anexo.title,
        arquivos: anexo.files.map((file) => ({
          id: file.id,
          nome: file.name,
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
