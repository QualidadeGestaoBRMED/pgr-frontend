import { useCallback, useEffect, useRef } from "react";
import { apiGet, apiPut } from "@/lib/api";
import { pgrSteps } from "@/app/pgr/steps";

let riskCatalogsRuntimeCache: any | null | undefined;

export function usePgrPersistence(ctx: any) {
  const {
    params,
    shouldHydrateFromApi,
    defaultHistorico,
    initialInicioDraft,
    initialDadosCadastrais,
    defaultAnexos,
    applyMissingRiskDefaults,
    areStringArraysEqual,
    riskCatalogs,
    setRiskCatalogs,
    setters,
    state,
    refs,
    setRuntimeCachedStateFn,
  } = ctx;

  const {
    setCompletedSteps,
    setInicioDraft,
    setDadosCadastrais,
    setCardMeta,
    setHistoricoData,
    setFunctionsData,
    setExtraEstabelecimentoFields,
    setEstabelecimentoSelecionado,
    setPlanAction,
    setAnexos,
    setAnexoDiretriz,
    setGheGroups,
    setCurrentGheId,
    setRiskGheGroups,
    setCurrentRiskGheId,
    setIsStateLoading,
  } = setters;

  const {
    completedSteps,
    inicioDraft,
    dadosCadastrais,
    cardMeta,
    historicoData,
    functionsData,
    extraEstabelecimentoFields,
    estabelecimentoSelecionado,
    planAction,
    anexos,
    anexoDiretriz,
    gheGroups,
    currentGheId,
    riskGheGroups,
    currentRiskGheId,
    isStateLoading,
  } = state;

  const { saveTimerRef } = refs;
  const skipInitialPersistRef = useRef(true);
  const pendingPersistPayloadRef = useRef<any | null>(null);

  const buildRuntimeCacheState = ({
    completed,
    inicio,
    dados,
    card,
    historico,
    functions,
    extraFields,
    estabelecimento,
    plan,
    anexosState,
    diretriz,
    ghes,
    gheId,
    riskGhes,
    riskGheId,
  }: {
    completed: number;
    inicio: any;
    dados: any;
    card: any;
    historico: any;
    functions: any[];
    extraFields: any[];
    estabelecimento: string;
    plan: any;
    anexosState: any[];
    diretriz: string;
    ghes: any[];
    gheId: string;
    riskGhes: any[];
    riskGheId: string;
  }) => ({
    serverSynced: true,
    syncedAt: Date.now(),
    completedSteps: completed,
    inicioDraft: inicio,
    dadosCadastrais: dados,
    cardMeta: card,
    historicoData: historico,
    functionsData: functions,
    extraEstabelecimentoFields: extraFields,
    estabelecimentoSelecionado: estabelecimento,
    planAction: plan,
    anexos: anexosState,
    anexoDiretriz: diretriz,
    gheGroups: ghes,
    currentGheId: gheId,
    riskGheGroups: riskGhes,
    currentRiskGheId: riskGheId,
  });

  const persistPayload = useCallback(
    (payload: any) => {
      pendingPersistPayloadRef.current = payload;
      return apiPut(`/api/frontend/pgr/${params.id}/state`, payload)
        .then(() => {
          setRuntimeCachedStateFn(
            params.id,
            buildRuntimeCacheState({
              completed: payload.completedSteps,
              inicio: payload.inicioDraft,
              dados: payload.dadosCadastrais,
              card: payload.cardMeta,
              historico: payload.historico,
              functions: payload.functions,
              extraFields: payload.extraEstabelecimentoFields,
              estabelecimento: payload.estabelecimentoSelecionado,
              plan: payload.planAction,
              anexosState: payload.anexos,
              diretriz: payload.anexoDiretriz,
              ghes: payload.gheGroups,
              gheId: payload.currentGheId,
              riskGhes: payload.riskGheGroups,
              riskGheId: payload.currentRiskGheId,
            })
          );
        })
        .catch(() => {})
        .finally(() => {
          if (pendingPersistPayloadRef.current === payload) {
            pendingPersistPayloadRef.current = null;
          }
        });
    },
    [params.id, setRuntimeCachedStateFn]
  );

  useEffect(() => {
    if (riskCatalogsRuntimeCache !== undefined) {
      setRiskCatalogs(riskCatalogsRuntimeCache);
      return;
    }

    let active = true;
    const loadRiskCatalogs = async () => {
      try {
        const data = await apiGet("/api/catalogs/risk");
        if (!active) return;
        riskCatalogsRuntimeCache = data;
        setRiskCatalogs(data);
      } catch {
        if (!active) return;
        riskCatalogsRuntimeCache = null;
        setRiskCatalogs(null);
      }
    };
    loadRiskCatalogs();
    return () => {
      active = false;
    };
  }, [setRiskCatalogs]);

  useEffect(() => {
    if (!riskCatalogs) return;
    setRiskGheGroups((prev: any[]) => {
      let changed = false;
      const next = prev.map((ghe) => {
        const risks = ghe.risks.map((risk: any) => {
          const normalized = applyMissingRiskDefaults(risk);
          const same =
            normalized.perigo === risk.perigo &&
            normalized.meioPropagacao === risk.meioPropagacao &&
            normalized.fontes === risk.fontes &&
            normalized.tipoAvaliacao === risk.tipoAvaliacao &&
            normalized.intensidade === risk.intensidade &&
            normalized.severidade === risk.severidade &&
            normalized.probabilidade === risk.probabilidade &&
            normalized.classificacao === risk.classificacao &&
            normalized.medidasControle === risk.medidasControle &&
            areStringArraysEqual(normalized.epc, risk.epc) &&
            areStringArraysEqual(normalized.epi, risk.epi);
          if (!same) changed = true;
          return same ? risk : normalized;
        });
        const sameRisks = risks.every((risk: any, index: number) => risk === ghe.risks[index]);
        return sameRisks ? ghe : { ...ghe, risks };
      });
      return changed ? next : prev;
    });
  }, [applyMissingRiskDefaults, areStringArraysEqual, riskCatalogs, setRiskGheGroups]);

  useEffect(() => {
    skipInitialPersistRef.current = true;
  }, [params.id]);

  useEffect(() => {
    if (!shouldHydrateFromApi) {
      setIsStateLoading(false);
      return;
    }
    let active = true;

    const loadState = async () => {
      try {
        const state = await apiGet<any>(`/api/frontend/pgr/${params.id}/state`);
        if (!active) return;

        const rawCompleted = Number(state.completedSteps);
        const normalizedCompleted = Number.isFinite(rawCompleted)
          ? Math.max(0, Math.min(rawCompleted, pgrSteps.length))
          : 0;
        const loadedInicioDraft = { ...initialInicioDraft, ...(state.inicioDraft || {}) };
        const loadedDadosCadastrais = {
          ...initialDadosCadastrais,
          ...(state.dadosCadastrais || {}),
        };
        const loadedCardMeta = {
          pipefyCardId: state.cardMeta?.pipefyCardId || "",
          cardName: state.cardMeta?.cardName || "",
          dueDate: state.cardMeta?.dueDate || "",
          companyId:
            typeof state.cardMeta?.companyId === "number" ? state.cardMeta.companyId : null,
          responsibleId:
            typeof state.cardMeta?.responsibleId === "number"
              ? state.cardMeta.responsibleId
              : null,
        };
        const loadedHistoricoData = {
          ...defaultHistorico,
          ...(state.historico || {}),
          changes: state.historico?.changes || [],
        };
        const loadedFunctions = state.functions?.length ? state.functions : [];
        const loadedExtraFields = Array.isArray(state.extraEstabelecimentoFields)
          ? state.extraEstabelecimentoFields.map((field: any) => ({
              id: field.id || `est-field-${Date.now()}-${Math.random()}`,
              title: field.title || "",
              value: field.value || "",
              scope: field.scope || "estabelecimento",
            }))
          : [];
        const loadedEstabelecimento = state.estabelecimentoSelecionado || "";
        const loadedPlanAction = { nr: "NR-01", vigencia: "", ...(state.planAction || {}) };
        const loadedAnexos = state.anexos?.length ? state.anexos : defaultAnexos;
        const loadedAnexoDiretriz = state.anexoDiretriz || "Diretriz 1";
        const loadedGheGroups = state.gheGroups?.length ? state.gheGroups : gheGroups;
        const loadedCurrentGheId = state.currentGheId || loadedGheGroups[0]?.id || currentGheId;
        const loadedRiskGheGroups = state.riskGheGroups?.length
          ? state.riskGheGroups.map((ghe: any) => ({
              ...ghe,
              risks: (ghe.risks || []).map((risk: any) => applyMissingRiskDefaults(risk)),
            }))
          : riskGheGroups;
        const loadedCurrentRiskGheId =
          state.currentRiskGheId || loadedRiskGheGroups[0]?.id || currentRiskGheId;

        setCompletedSteps(normalizedCompleted);
        setInicioDraft(loadedInicioDraft);
        setDadosCadastrais(loadedDadosCadastrais);
        setCardMeta(loadedCardMeta);
        setHistoricoData(loadedHistoricoData);
        setFunctionsData(loadedFunctions);
        setExtraEstabelecimentoFields(loadedExtraFields);
        setEstabelecimentoSelecionado(loadedEstabelecimento);
        setPlanAction(loadedPlanAction);
        setAnexos(loadedAnexos);
        setAnexoDiretriz(loadedAnexoDiretriz);

        setGheGroups(loadedGheGroups);
        setCurrentGheId(loadedCurrentGheId);
        setRiskGheGroups(loadedRiskGheGroups);
        setCurrentRiskGheId(loadedCurrentRiskGheId);

        setRuntimeCachedStateFn(
          params.id,
          buildRuntimeCacheState({
            completed: normalizedCompleted,
            inicio: loadedInicioDraft,
            dados: loadedDadosCadastrais,
            card: loadedCardMeta,
            historico: loadedHistoricoData,
            functions: loadedFunctions,
            extraFields: loadedExtraFields,
            estabelecimento: loadedEstabelecimento,
            plan: loadedPlanAction,
            anexosState: loadedAnexos,
            diretriz: loadedAnexoDiretriz,
            ghes: loadedGheGroups,
            gheId: loadedCurrentGheId,
            riskGhes: loadedRiskGheGroups,
            riskGheId: loadedCurrentRiskGheId,
          })
        );
      } catch {
        // Mantém estado padrão local caso a API falhe.
      } finally {
        if (active) setIsStateLoading(false);
      }
    };

    loadState();

    return () => {
      active = false;
    };
    // Recarrega estado apenas ao trocar de card (ou quando cache expira).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, shouldHydrateFromApi]);

  useEffect(() => {
    setRiskGheGroups((prev: any[]) => {
      const prevById = new Map(prev.map((group) => [group.id, group]));
      const next = gheGroups.map((ghe: any) => ({
        id: ghe.id,
        name: ghe.name,
        risks: prevById.get(ghe.id)?.risks || [],
      }));
      const unchanged =
        next.length === prev.length &&
        next.every(
          (item: any, index: number) =>
            item.id === prev[index]?.id &&
            item.name === prev[index]?.name &&
            item.risks === prev[index]?.risks
        );
      return unchanged ? prev : next;
    });
  }, [gheGroups, setRiskGheGroups]);

  useEffect(() => {
    if (!riskGheGroups.length) return;
    if (!riskGheGroups.some((ghe: any) => ghe.id === currentRiskGheId)) {
      setCurrentRiskGheId(riskGheGroups[0].id);
    }
  }, [riskGheGroups, currentRiskGheId, setCurrentRiskGheId]);

  useEffect(() => {
    if (isStateLoading) return;
    if (skipInitialPersistRef.current) {
      skipInitialPersistRef.current = false;
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    const payload = {
      completedSteps,
      inicioDraft,
      dadosCadastrais,
      cardMeta,
      historico: historicoData,
      functions: functionsData,
      extraEstabelecimentoFields,
      estabelecimentoSelecionado,
      planAction,
      anexos,
      anexoDiretriz,
      gheGroups,
      currentGheId,
      riskGheGroups,
      currentRiskGheId,
    };

    pendingPersistPayloadRef.current = payload;
    saveTimerRef.current = window.setTimeout(() => {
      if (typeof window !== "undefined") {
        console.info("[PGR][STATE->BACKEND]", payload);
      }
      void persistPayload(payload);
      saveTimerRef.current = null;
    }, 600);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [
    anexoDiretriz,
    anexos,
    cardMeta,
    completedSteps,
    currentGheId,
    currentRiskGheId,
    dadosCadastrais,
    estabelecimentoSelecionado,
    extraEstabelecimentoFields,
    functionsData,
    gheGroups,
    historicoData,
    inicioDraft,
    isStateLoading,
    params.id,
    persistPayload,
    planAction,
    riskGheGroups,
    saveTimerRef,
    setRuntimeCachedStateFn,
  ]);

  useEffect(() => {
    return () => {
      const pendingPayload = pendingPersistPayloadRef.current;
      if (!pendingPayload) return;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      void persistPayload(pendingPayload);
    };
  }, [persistPayload, saveTimerRef]);
}
