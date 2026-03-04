import type { DadosCadastraisDraft, InicioDraft } from "../steps/types";
import type { AnexoItem, GheGroup, HistoricoData, PgrFunction, RiskGheGroup } from "../types";

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
      epc: string[];
      epi: string[];
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
      }>;
    }>;
  };
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
  functionsData: PgrFunction[];
  planAction: {
    nr: string;
    vigencia: string;
  };
  anexos: AnexoItem[];
  anexoDiretriz: string;
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
      perigo: risk.perigo,
      meioPropagacao: risk.meioPropagacao,
      fontes: risk.fontes,
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

  const planoItens = caracterizacaoGhes.flatMap((ghe) =>
    ghe.riscos.map((risk) => ({
      ghe: ghe.nome,
      risco: risk.descricaoAgente || risk.perigo || "",
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
        })),
      })),
    },
  };
}

export function buildPgrDocxPayloadFromBackendState(input: {
  pgrId: string;
  generatedAt: string;
  totalSteps: number;
  backendState: any;
}): PgrDocxPayload {
  const state = input.backendState || {};
  const descricaoGhes = Array.isArray(state.descricao?.ghes) ? state.descricao.ghes : [];
  const caracterizacaoGhes = Array.isArray(state.caracterizacao?.ghes)
    ? state.caracterizacao.ghes
    : [];

  const fallbackFunctions: PgrFunction[] = [];
  const fallbackFunctionMap = new Map<string, string>();

  const fallbackGheGroups: GheGroup[] = descricaoGhes.map((ghe: any, gheIndex: number) => {
    const rawItems = Array.isArray(ghe?.funcoes) ? ghe.funcoes : [];
    const items = rawItems.map((fn: any, fnIndex: number) => {
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

  const fallbackRiskGheGroups: RiskGheGroup[] = caracterizacaoGhes.map((ghe: any, gheIndex: number) => ({
    id: ghe?.id || `ghe-${gheIndex + 1}`,
    name: ghe?.nome || `GHE ${gheIndex + 1}`,
    risks: Array.isArray(ghe?.riscos)
      ? ghe.riscos.map((risk: any, riskIndex: number) => ({
          id: risk?.id || `risk-${gheIndex + 1}-${riskIndex + 1}`,
          tipoAgente: risk?.tipoAgente || "",
          descricaoAgente: risk?.descricaoAgente || "",
          perigo: risk?.perigo || "",
          meioPropagacao: risk?.meioPropagacao || "",
          fontes: risk?.fontes || "",
          tipoAvaliacao: risk?.tipoAvaliacao || "",
          intensidade: risk?.intensidade || "",
          severidade: risk?.severidade || "",
          probabilidade: risk?.probabilidade || "",
          classificacao: risk?.classificacao || "",
          medidasControle: risk?.medidasControle || "",
          epc: Array.isArray(risk?.epc) ? risk.epc : [],
          epi: Array.isArray(risk?.epi) ? risk.epi : [],
        }))
      : [],
  }));

  const fallbackAnexos: AnexoItem[] = Array.isArray(state.anexos?.itens)
    ? state.anexos.itens.map((item: any, index: number) => ({
        id: item?.id || `anexo-${index + 1}`,
        title: item?.titulo || "",
        files: Array.isArray(item?.arquivos)
          ? item.arquivos.map((file: any, fileIndex: number) => ({
              id: file?.id || `file-${index + 1}-${fileIndex + 1}`,
              name: file?.nome || "",
            }))
          : [],
      }))
    : [];

  return buildPgrDocxPayload({
    pgrId: input.pgrId,
    generatedAt: input.generatedAt,
    completedSteps: Number.isFinite(Number(state.completedSteps ?? state.meta?.completedSteps))
      ? Number(state.completedSteps ?? state.meta?.completedSteps)
      : 0,
    totalSteps: input.totalSteps,
    stepStatusById: state.stepStatusById || state.meta?.stepStatusById || undefined,
    inicioDraft: (state.inicioDraft || state.inicio || {}) as InicioDraft,
    dadosCadastrais: state.dadosCadastrais || ({} as DadosCadastraisDraft),
    historicoData: (state.historico || state.historicoData || {}) as HistoricoData,
    gheGroups: Array.isArray(state.gheGroups) ? state.gheGroups : fallbackGheGroups,
    riskGheGroups: Array.isArray(state.riskGheGroups)
      ? state.riskGheGroups
      : fallbackRiskGheGroups,
    functionsData: Array.isArray(state.functions) ? state.functions : fallbackFunctions,
    planAction: {
      nr: state.planAction?.nr || state.planoAcao?.nr || "NR-01",
      vigencia: state.planAction?.vigencia || state.planoAcao?.vigencia || "",
    },
    anexos: Array.isArray(state.anexos) ? state.anexos : fallbackAnexos,
    anexoDiretriz: state.anexoDiretriz || state.anexos?.diretriz || "Diretriz 1",
  });
}
