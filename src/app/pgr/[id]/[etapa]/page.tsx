"use client";

import {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  FileSpreadsheet,
  MinusCircle,
  PlusCircle,
  Save,
  Search,
} from "lucide-react";
import { PgrShell } from "@/components/pgr-shell";
import { PgrHistoricoPanel } from "@/components/pgr-historico-panel";
import { pgrSteps, type PgrStepId } from "@/app/pgr/steps";
import { notFound } from "next/navigation";
import { usePgrProgress } from "@/app/pgr/use-pgr-progress";

const mockPgrDetail = {
  completedSteps: 1,
  historico: {
    title: "Histórico de Versões",
    subtitle: "Visualize o histórico de alterações do PGR",
    changes: [
      {
        id: "chg-1",
        company: "Indústria Metalúrgica ABC Ltda",
        analysis: "Análise Preliminar de Riscos",
        change: "Inclusão de novo GHE",
        reason: "Expansão do setor de soldagem",
        date: "14/01/2024",
      },
      {
        id: "chg-2",
        company: "Indústria Metalúrgica ABC Ltda",
        analysis: "Análise Preliminar de Riscos",
        change: "Inclusão de novo GHE",
        reason: "Expansão do setor de soldagem",
        date: "14/01/2024",
      },
    ],
  },
};

const mockFunctions = [
  {
    id: "func-1",
    setor: "Setor 2",
    funcao: "Função D",
    descricao: "Descrição da Função D",
  },
  {
    id: "func-2",
    setor: "Setor 2",
    funcao: "Função D",
    descricao: "Descrição da Função D",
  },
  {
    id: "func-3",
    setor: "Setor 1",
    funcao: "Função C",
    descricao: "Descrição da Função C",
  },
  {
    id: "func-4",
    setor: "Setor 1",
    funcao: "Função B",
    descricao: "Descrição da Função B",
  },
  {
    id: "func-5",
    setor: "Setor 3",
    funcao: "Função A",
    descricao: "Descrição da Função A",
  },
  {
    id: "func-6",
    setor: "Setor 3",
    funcao: "Função D",
    descricao: "Descrição da Função D",
  },
  {
    id: "func-7",
    setor: "Setor 4",
    funcao: "Função E",
    descricao: "Descrição da Função E",
  },
  {
    id: "func-8",
    setor: "Setor 4",
    funcao: "Função F",
    descricao: "Descrição da Função F",
  },
];

export default function PgrEtapaPage({
  params,
}: {
  params: { id: string; etapa: string };
}) {
  const router = useRouter();
  const step = pgrSteps.find((item) => item.id === params.etapa);
  if (!step) {
    notFound();
  }

  const currentIndex = useMemo(
    () => pgrSteps.findIndex((item) => item.id === step.id),
    [step.id]
  );
  const prevStep = currentIndex > 0 ? pgrSteps[currentIndex - 1] : null;
  const nextStep =
    currentIndex < pgrSteps.length - 1 ? pgrSteps[currentIndex + 1] : null;
  const initialCompletedSteps = Math.max(
    mockPgrDetail.completedSteps,
    currentIndex
  );
  const [completedSteps, setCompletedSteps] = usePgrProgress(
    params.id,
    initialCompletedSteps
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [extraEstabelecimentoFields, setExtraEstabelecimentoFields] = useState<
    Array<{ id: string; title: string; value: string }>
  >([]);
  const [preventionRows, setPreventionRows] = useState<
    Array<{
      id: string;
      ghe: string;
      agente: string;
      medidas: string;
      epc: string;
      epi: string;
    }>
  >([
    {
      id: "prev-1",
      ghe: "GHE 01 - Setor de Soldagem",
      agente: "Radiação não ionizante (ultravioleta)",
      medidas: "Rodízio de atividades, pausas programadas",
      epc: "Cortinas de proteção para soldagem",
      epi: "Máscara de solda automática (CA 12345)",
    },
    {
      id: "prev-2",
      ghe: "GHE 01 - Setor de Soldagem",
      agente: "Radiação não ionizante (ultravioleta)",
      medidas: "Rodízio de atividades, pausas programadas",
      epc: "Cortinas de proteção para soldagem",
      epi: "Máscara de solda automática (CA 12345)",
    },
  ]);
  const [selectedLeftIds, setSelectedLeftIds] = useState<string[]>([]);
  const [selectedRightIds, setSelectedRightIds] = useState<string[]>([]);
  const [gheGroups, setGheGroups] = useState<
    Array<{
      id: string;
      name: string;
      info: {
        processo: string;
        observacoes: string;
        ambiente: string;
      };
      items: Array<{ functionId: string; funcionarios: string }>;
    }>
  >([
    {
      id: "ghe-1",
      name: "GHE 1",
      info: { processo: "", observacoes: "", ambiente: "" },
      items: [],
    },
  ]);
  type HistoryEntry = {
    gheGroups: typeof gheGroups;
    currentGheId: string;
    selectedLeftIds: string[];
    selectedRightIds: string[];
  };
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentGheId, setCurrentGheId] = useState("ghe-1");
  const [isGheModalOpen, setIsGheModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoModalMode, setInfoModalMode] = useState<"next" | "advance">("next");
  const [gheSearch, setGheSearch] = useState("");
  const [gheFilterId, setGheFilterId] = useState<"all" | string>("all");
  const [isGheListView, setIsGheListView] = useState(false);
  const [riskGheGroups, setRiskGheGroups] = useState<
    Array<{
      id: string;
      name: string;
      risks: Array<{
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
      }>;
    }>
  >([
    {
      id: "ghe-1",
      name: "GHE 1",
      risks: [
        {
          id: "risk-1",
          tipoAgente: "Físico",
          descricaoAgente: "Ruído",
          perigo: "Perda auditiva",
          meioPropagacao: "Ar",
          fontes: "Máquinas industriais",
          tipoAvaliacao: "Quantitativa",
          intensidade: "85 dB",
          severidade: "Alta",
          probabilidade: "Média",
          classificacao: "Crítico",
        },
      ],
    },
    {
      id: "ghe-2",
      name: "GHE 2",
      risks: [
        {
          id: "risk-2",
          tipoAgente: "Químico",
          descricaoAgente: "Vapores",
          perigo: "Irritação respiratória",
          meioPropagacao: "Ar",
          fontes: "Solventes",
          tipoAvaliacao: "Qualitativa",
          intensidade: "Moderada",
          severidade: "Média",
          probabilidade: "Alta",
          classificacao: "Elevado",
        },
      ],
    },
    {
      id: "ghe-3",
      name: "GHE 3",
      risks: [],
    },
  ]);
  const [currentRiskGheId, setCurrentRiskGheId] = useState("ghe-1");
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const [riskGheSearch, setRiskGheSearch] = useState("");
  const [dragOverZone, setDragOverZone] = useState<null | "left" | "right">(
    null
  );
  const [selectionBox, setSelectionBox] = useState<null | {
    side: "left" | "right";
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  }>(null);
  const selectionRef = useRef<typeof selectionBox>(null);
  const leftListRef = useRef<HTMLDivElement | null>(null);
  const rightListRef = useRef<HTMLDivElement | null>(null);
  const copyMenuRef = useRef<HTMLDivElement | null>(null);
  const cloneGheGroups = (value: typeof gheGroups) =>
    JSON.parse(JSON.stringify(value)) as typeof gheGroups;
  const pushHistory = () => {
    setHistory((prev) => {
      const entry: HistoryEntry = {
        gheGroups: cloneGheGroups(gheGroups),
        currentGheId,
        selectedLeftIds: [...selectedLeftIds],
        selectedRightIds: [...selectedRightIds],
      };
      const next = [...prev, entry];
      return next.length > 30 ? next.slice(next.length - 30) : next;
    });
  };
  const getZoomFactor = () => {
    if (typeof window === "undefined") return 1;
    const zoomValue = window.getComputedStyle(document.body).zoom;
    const zoom = Number.parseFloat(zoomValue || "1");
    return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  };
  const normalizePoint = (x: number, y: number) => {
    const zoom = getZoomFactor();
    return { x: x / zoom, y: y / zoom };
  };
  const inputBaseClass =
    "mt-2 h-[40px] w-full rounded-[8px] border border-border bg-muted px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const inputInlineClass =
    "h-[40px] w-full rounded-[8px] border border-border bg-muted px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const textareaBaseClass =
    "mt-2 min-h-[96px] w-full rounded-[10px] border border-border bg-muted px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const miniInputClass =
    "h-8 w-20 rounded-[8px] border border-border bg-muted px-2 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const selectBaseClass =
    "h-[40px] w-full appearance-none rounded-[8px] border border-border bg-muted px-3 pr-10 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const selectSmallClass =
    "h-[38px] w-full appearance-none rounded-[8px] border border-border bg-muted px-3 pr-8 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const normalizedSearchTerm = useMemo(
    () => normalizeText(searchTerm.trim()),
    [searchTerm]
  );
  const normalizedGheSearch = useMemo(
    () => normalizeText(gheSearch.trim()),
    [gheSearch]
  );
  const normalizedRiskGheSearch = useMemo(
    () => normalizeText(riskGheSearch.trim()),
    [riskGheSearch]
  );
  const isManyRiskGhes = riskGheGroups.length > 10;
  const currentRiskGhe = useMemo(
    () =>
      riskGheGroups.find((ghe) => ghe.id === currentRiskGheId) ??
      riskGheGroups[0],
    [riskGheGroups, currentRiskGheId]
  );
  const filteredRiskGheGroups = useMemo(() => {
    if (!normalizedRiskGheSearch) {
      return riskGheGroups;
    }
    const filtered = riskGheGroups.filter((ghe) =>
      normalizeText(ghe.name).includes(normalizedRiskGheSearch)
    );
    if (
      currentRiskGhe &&
      !filtered.some((ghe) => ghe.id === currentRiskGhe.id)
    ) {
      return [currentRiskGhe, ...filtered];
    }
    return filtered;
  }, [currentRiskGhe, normalizedRiskGheSearch, riskGheGroups]);
  const copySourceGhes = useMemo(
    () => riskGheGroups.filter((ghe) => ghe.id !== currentRiskGheId),
    [riskGheGroups, currentRiskGheId]
  );
  const functionMap = useMemo(
    () => new Map(mockFunctions.map((item) => [item.id, item])),
    []
  );
  const functionAssignments = useMemo(() => {
    const map = new Map<string, string>();
    gheGroups.forEach((ghe) => {
      ghe.items.forEach((item) => {
        map.set(item.functionId, ghe.id);
      });
    });
    return map;
  }, [gheGroups]);
  const availableFunctions = useMemo(
    () => mockFunctions.filter((item) => !functionAssignments.has(item.id)),
    [functionAssignments]
  );
  const filteredFunctions = useMemo(() => {
    if (!normalizedSearchTerm) {
      return availableFunctions;
    }
    return availableFunctions.filter((item) => {
      const haystack = normalizeText(
        `${item.setor} ${item.funcao} ${item.descricao}`
      );
      return haystack.includes(normalizedSearchTerm);
    });
  }, [availableFunctions, normalizedSearchTerm]);
  const groupedFunctions = useMemo(() => {
    const groups = new Map<string, typeof filteredFunctions>();
    filteredFunctions.forEach((item) => {
      const current = groups.get(item.setor) ?? [];
      current.push(item);
      groups.set(item.setor, current);
    });
    return Array.from(groups.entries()).map(([setor, items]) => ({
      setor,
      items,
    }));
  }, [filteredFunctions]);
  const availableCountLabel = normalizedSearchTerm
    ? `${filteredFunctions.length} resultados`
    : `${availableFunctions.length} disponíveis`;
  const currentGhe = useMemo(
    () => gheGroups.find((ghe) => ghe.id === currentGheId) ?? gheGroups[0],
    [gheGroups, currentGheId]
  );
  const currentGheName = currentGhe?.name ?? "GHE";
  const currentItems = currentGhe?.items ?? [];
  const remainingCount = availableFunctions.length;
  const canOpenInfoModal = currentItems.length > 0;
  const canCreateNextGhe = remainingCount > 0 && canOpenInfoModal;
  const [lastGheNotice, setLastGheNotice] = useState<null | {
    from: string;
    to: string;
  }>(null);
  const filteredAllFunctions = useMemo(() => {
    return mockFunctions.filter((item) => {
      if (gheFilterId !== "all") {
        const assigned = functionAssignments.get(item.id);
        if (assigned !== gheFilterId) {
          return false;
        }
      }
      if (!normalizedGheSearch) {
        return true;
      }
      const haystack = normalizeText(
        `${item.setor} ${item.funcao} ${item.descricao}`
      );
      return haystack.includes(normalizedGheSearch);
    });
  }, [gheFilterId, functionAssignments, normalizedGheSearch]);
  const filteredFunctionIds = useMemo(
    () => new Set(filteredAllFunctions.map((item) => item.id)),
    [filteredAllFunctions]
  );
  const filteredGheGroupsForList = useMemo(() => {
    const scoped = gheGroups.filter((ghe) =>
      gheFilterId === "all" ? true : ghe.id === gheFilterId
    );
    if (!gheSearch.trim()) {
      return scoped;
    }
    return scoped
      .map((ghe) => ({
        ...ghe,
        items: ghe.items.filter((item) =>
          filteredFunctionIds.has(item.functionId)
        ),
      }))
      .filter((ghe) => ghe.items.length > 0);
  }, [gheGroups, gheFilterId, gheSearch, filteredFunctionIds]);

  const handleAdvance = () => {
    // TODO: temporário. Considera a etapa atual como concluída ao avançar.
    setCompletedSteps((prev) => Math.max(prev, currentIndex + 1));
    if (nextStep) {
      router.push(`/pgr/${params.id}/${nextStep.id}`);
    }
  };

  const handleAddEstabelecimentoField = () => {
    setExtraEstabelecimentoFields((prev) => [
      ...prev,
      {
        id: `est-field-${Date.now()}-${prev.length + 1}`,
        title: "",
        value: "",
      },
    ]);
  };

  const handleExtraEstabelecimentoFieldChange = (
    id: string,
    field: "title" | "value",
    value: string
  ) => {
    setExtraEstabelecimentoFields((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handlePreventionChange = (
    id: string,
    field: "ghe" | "agente" | "medidas" | "epc" | "epi",
    value: string
  ) => {
    setPreventionRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleToggleLeftSelection = (id: string) => {
    setSelectedLeftIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleRightSelection = (id: string) => {
    setSelectedRightIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddSelected = () => {
    if (!selectedLeftIds.length || !currentGhe) return;
    addFunctionsToCurrent(selectedLeftIds);
  };

  const handleRemoveSelected = () => {
    if (!selectedRightIds.length || !currentGhe) return;
    removeFunctionsFromCurrent(selectedRightIds);
  };

  const addFunctionsToCurrent = (ids: string[]) => {
    if (!ids.length || !currentGhe) return;
    const toAdd = availableFunctions.filter((item) => ids.includes(item.id));
    if (!toAdd.length) return;
    pushHistory();
    setGheGroups((prev) =>
      prev.map((ghe) =>
        ghe.id === currentGhe.id
          ? {
              ...ghe,
              items: [
                ...ghe.items,
                ...toAdd.map((item) => ({
                  functionId: item.id,
                  funcionarios: "",
                })),
              ],
            }
          : ghe
      )
    );
    setSelectedLeftIds([]);
  };

  const removeFunctionsFromCurrent = (ids: string[]) => {
    if (!ids.length || !currentGhe) return;
    const hasAny = currentGhe.items.some((item) =>
      ids.includes(item.functionId)
    );
    if (!hasAny) return;
    pushHistory();
    setGheGroups((prev) =>
      prev.map((ghe) =>
        ghe.id === currentGhe.id
          ? {
              ...ghe,
              items: ghe.items.filter((item) => !ids.includes(item.functionId)),
            }
          : ghe
      )
    );
    setSelectedRightIds((prev) => prev.filter((id) => !ids.includes(id)));
  };

  const handleRemoveSingle = (id: string) => {
    if (!currentGhe) return;
    removeFunctionsFromCurrent([id]);
  };

  const handleFuncionarioChange = useCallback(
    (id: string, value: string) => {
      if (!currentGhe) return;
      const normalized = value === "" ? "0" : value;
      const parsed = Number.parseInt(normalized, 10);
      const safeValue = Number.isNaN(parsed) ? "0" : String(Math.max(0, parsed));
      setGheGroups((prev) =>
        prev.map((ghe) =>
          ghe.id === currentGhe.id
            ? {
                ...ghe,
                items: ghe.items.map((item) =>
                  item.functionId === id
                    ? { ...item, funcionarios: safeValue }
                    : item
                ),
              }
            : ghe
        )
      );
    },
    [currentGhe]
  );

  const handleCreateNextGhe = () => {
    if (!canOpenInfoModal) return;
    setInfoModalMode(remainingCount > 0 ? "next" : "advance");
    setIsInfoModalOpen(true);
  };

  const handleOpenInfoForAdvance = () => {
    if (!canOpenInfoModal) return;
    setInfoModalMode("advance");
    setIsInfoModalOpen(true);
  };

  const handleConfirmInfoModal = () => {
    if (infoModalMode === "advance") {
      setIsInfoModalOpen(false);
      handleAdvance();
      return;
    }
    if (!canCreateNextGhe) return;
    pushHistory();
    const nextIndex = gheGroups.length + 1;
    const newId = `ghe-${nextIndex}`;
    const nextName = `GHE ${nextIndex}`;
    setGheGroups((prev) => [
      ...prev,
      {
        id: newId,
        name: nextName,
        info: { processo: "", observacoes: "", ambiente: "" },
        items: [],
      },
    ]);
    setCurrentGheId(newId);
    setLastGheNotice({ from: currentGheName, to: nextName });
    setSelectedLeftIds([]);
    setSelectedRightIds([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsInfoModalOpen(false);
  };

  const handleSelectGhe = (id: string) => {
    setCurrentGheId(id);
    setLastGheNotice(null);
    setSelectedLeftIds([]);
    setSelectedRightIds([]);
    setIsGheModalOpen(false);
  };

  const handleAssignFunction = (functionId: string, targetGheId: string) => {
    const currentAssignment = functionAssignments.get(functionId) ?? "none";
    if (currentAssignment === targetGheId) {
      return;
    }
    pushHistory();
    setGheGroups((prev) => {
      let currentAssignment: string | null = null;
      let cachedItem: { functionId: string; funcionarios: string } | null = null;

      const removed = prev.map((ghe) => {
        const existing = ghe.items.find(
          (item) => item.functionId === functionId
        );
        if (!existing) return ghe;
        currentAssignment = ghe.id;
        cachedItem = existing;
        return {
          ...ghe,
          items: ghe.items.filter((item) => item.functionId !== functionId),
        };
      });

      if (targetGheId === currentAssignment) {
        return prev;
      }

      if (targetGheId === "none") {
        return removed;
      }

      const itemToAdd = cachedItem ?? {
        functionId,
        funcionarios: "",
      };

      return removed.map((ghe) =>
        ghe.id === targetGheId
          ? { ...ghe, items: [...ghe.items, itemToAdd] }
          : ghe
      );
    });
    setSelectedLeftIds((prev) => prev.filter((id) => id !== functionId));
    setSelectedRightIds((prev) => prev.filter((id) => id !== functionId));
  };

  const handleDragStartLeft = (
    event: DragEvent<HTMLLabelElement>,
    id: string
  ) => {
    const ids = selectedLeftIds.includes(id) ? selectedLeftIds : [id];
    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ source: "left", ids })
    );
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragStartRight = (
    event: DragEvent<HTMLDivElement>,
    id: string
  ) => {
    const ids = selectedRightIds.includes(id) ? selectedRightIds : [id];
    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ source: "right", ids })
    );
    event.dataTransfer.effectAllowed = "move";
  };

  const parseDragPayload = (event: DragEvent) => {
    try {
      const raw = event.dataTransfer.getData("text/plain");
      if (!raw) return null;
      return JSON.parse(raw) as { source: "left" | "right"; ids: string[] };
    } catch {
      return null;
    }
  };

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>,
    zone: "left" | "right"
  ) => {
    event.preventDefault();
    setDragOverZone(zone);
  };

  const handleDragLeave = () => {
    setDragOverZone(null);
  };

  const handleDropToRight = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOverZone(null);
    const payload = parseDragPayload(event);
    if (!payload || payload.source !== "left") return;
    addFunctionsToCurrent(payload.ids);
  };

  const handleDropToLeft = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOverZone(null);
    const payload = parseDragPayload(event);
    if (!payload || payload.source !== "right") return;
    removeFunctionsFromCurrent(payload.ids);
  };

  const handleSelectionStart = (
    event: ReactPointerEvent<HTMLDivElement>,
    side: "left" | "right"
  ) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-select-item]")) {
      return;
    }
    if (target?.closest("input,button,select,textarea")) {
      return;
    }
    const start = normalizePoint(event.clientX, event.clientY);
    setSelectionBox({
      side,
      startX: start.x,
      startY: start.y,
      currentX: start.x,
      currentY: start.y,
    });
  };

  const applySelection = (payload: {
    side: "left" | "right";
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    additive: boolean;
  }) => {
    const { side, startX, startY, currentX, currentY, additive } = payload;
    const left = Math.min(startX, currentX);
    const right = Math.max(startX, currentX);
    const top = Math.min(startY, currentY);
    const bottom = Math.max(startY, currentY);
    const container = side === "left" ? leftListRef.current : rightListRef.current;
    if (!container) return;
    const selector = side === "left" ? "[data-left-id]" : "[data-right-id]";
    const nodes = Array.from(container.querySelectorAll<HTMLElement>(selector));
    const zoom = getZoomFactor();
    const selected = nodes
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const rectLeft = rect.left / zoom;
        const rectRight = rect.right / zoom;
        const rectTop = rect.top / zoom;
        const rectBottom = rect.bottom / zoom;
        return (
          rectRight >= left &&
          rectLeft <= right &&
          rectBottom >= top &&
          rectTop <= bottom
        );
      })
      .map((node) =>
        side === "left"
          ? node.dataset.leftId ?? ""
          : node.dataset.rightId ?? ""
      )
      .filter(Boolean);

    if (side === "left") {
      setSelectedLeftIds((prev) =>
        additive ? Array.from(new Set([...prev, ...selected])) : selected
      );
      return;
    }
    setSelectedRightIds((prev) =>
      additive ? Array.from(new Set([...prev, ...selected])) : selected
    );
  };

  useEffect(() => {
    selectionRef.current = selectionBox;
  }, [selectionBox]);

  useEffect(() => {
    if (!selectionBox) return;
    const handleMove = (event: PointerEvent) => {
      const point = normalizePoint(event.clientX, event.clientY);
      setSelectionBox((prev) =>
        prev
          ? {
              ...prev,
              currentX: point.x,
              currentY: point.y,
            }
          : prev
      );
    };
    const handleUp = (event: PointerEvent) => {
      const currentSelection = selectionRef.current;
      if (currentSelection) {
        const additive = event.ctrlKey || event.metaKey;
        applySelection({ ...currentSelection, additive });
      }
      setSelectionBox(null);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [selectionBox !== null]);

  useEffect(() => {
    const container = rightListRef.current;
    if (!container) return;
    const handleWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      const input = target?.closest<HTMLInputElement>(
        "input[data-funcionarios]"
      );
      if (!input) return;
      event.preventDefault();
      event.stopPropagation();
      const step = event.shiftKey ? 5 : 1;
      const delta = event.deltaY < 0 ? step : -step;
      const parsed = Number.parseInt(input.value || "0", 10);
      const nextValue = Math.max(
        0,
        (Number.isNaN(parsed) ? 0 : parsed) + delta
      );
      const funcId = input.dataset.funcId;
      if (!funcId) return;
      handleFuncionarioChange(funcId, String(nextValue));
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [handleFuncionarioChange]);

  const handleInfoChange = (
    field: "processo" | "observacoes" | "ambiente",
    value: string
  ) => {
    if (!currentGhe) return;
    setGheGroups((prev) =>
      prev.map((ghe) =>
        ghe.id === currentGhe.id
          ? { ...ghe, info: { ...ghe.info, [field]: value } }
          : ghe
      )
    );
  };

  const handleUndo = () => {
    setHistory((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setGheGroups(last.gheGroups);
      setCurrentGheId(last.currentGheId);
      setSelectedLeftIds(last.selectedLeftIds);
      setSelectedRightIds(last.selectedRightIds);
      return prev.slice(0, -1);
    });
  };

  const createRiskId = () => `risk-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const handleAddRisk = () => {
    if (!currentRiskGhe) return;
    const newRisk = {
      id: createRiskId(),
      tipoAgente: "",
      descricaoAgente: "",
      perigo: "",
      meioPropagacao: "",
      fontes: "",
      tipoAvaliacao: "",
      intensidade: "",
      severidade: "",
      probabilidade: "",
      classificacao: "",
    };
    setRiskGheGroups((prev) =>
      prev.map((ghe) =>
        ghe.id === currentRiskGhe.id
          ? { ...ghe, risks: [...ghe.risks, newRisk] }
          : ghe
      )
    );
    setTimeout(() => {
      const el = document.querySelector(`[data-risk-id="${newRisk.id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const firstInput = el.querySelector<HTMLInputElement>("input");
        firstInput?.focus();
      }
    }, 0);
  };

  const handleDuplicateRisk = (riskId: string) => {
    if (!currentRiskGhe) return;
    const risk = currentRiskGhe.risks.find((item) => item.id === riskId);
    if (!risk) return;
    const clone = { ...risk, id: createRiskId() };
    setRiskGheGroups((prev) =>
      prev.map((ghe) =>
        ghe.id === currentRiskGhe.id
          ? { ...ghe, risks: [...ghe.risks, clone] }
          : ghe
      )
    );
  };

  const handleRemoveRisk = (riskId: string) => {
    if (!currentRiskGhe) return;
    setRiskGheGroups((prev) =>
      prev.map((ghe) =>
        ghe.id === currentRiskGhe.id
          ? { ...ghe, risks: ghe.risks.filter((risk) => risk.id !== riskId) }
          : ghe
      )
    );
  };

  const handleRiskChange = (
    riskId: string,
    field:
      | "tipoAgente"
      | "descricaoAgente"
      | "perigo"
      | "meioPropagacao"
      | "fontes"
      | "tipoAvaliacao"
      | "intensidade"
      | "severidade"
      | "probabilidade"
      | "classificacao",
    value: string
  ) => {
    if (!currentRiskGhe) return;
    setRiskGheGroups((prev) =>
      prev.map((ghe) =>
        ghe.id === currentRiskGhe.id
          ? {
              ...ghe,
              risks: ghe.risks.map((risk) =>
                risk.id === riskId ? { ...risk, [field]: value } : risk
              ),
            }
          : ghe
      )
    );
  };

  const handleCopyRiskStructure = (sourceGheId: string) => {
    if (!currentRiskGhe) return;
    const source = riskGheGroups.find((ghe) => ghe.id === sourceGheId);
    if (!source) return;
    const clonedRisks = source.risks.map((risk) => ({
      ...risk,
      id: createRiskId(),
    }));
    setRiskGheGroups((prev) =>
      prev.map((ghe) =>
        ghe.id === currentRiskGhe.id ? { ...ghe, risks: clonedRisks } : ghe
      )
    );
    setIsCopyMenuOpen(false);
  };

  const handleMockRiskGhes = () => {
    const total = 50;
    const newGroups = Array.from({ length: total }, (_, index) => {
      const idx = index + 1;
      return {
        id: `ghe-${idx}`,
        name: `GHE ${idx}`,
        risks:
          idx % 7 === 0
            ? []
            : [
                {
                  id: createRiskId(),
                  tipoAgente: idx % 2 === 0 ? "Físico" : "Químico",
                  descricaoAgente: idx % 2 === 0 ? "Ruído" : "Vapores",
                  perigo:
                    idx % 2 === 0
                      ? "Perda auditiva"
                      : "Irritação respiratória",
                  meioPropagacao: "Ar",
                  fontes: idx % 2 === 0 ? "Máquinas" : "Solventes",
                  tipoAvaliacao: idx % 2 === 0 ? "Quantitativa" : "Qualitativa",
                  intensidade: idx % 2 === 0 ? "85 dB" : "Moderada",
                  severidade: idx % 2 === 0 ? "Alta" : "Média",
                  probabilidade: idx % 2 === 0 ? "Média" : "Alta",
                  classificacao: idx % 2 === 0 ? "Crítico" : "Elevado",
                },
              ],
      };
    });
    setRiskGheGroups(newGroups);
    setCurrentRiskGheId(newGroups[0]?.id ?? "ghe-1");
    setRiskGheSearch("");
    setIsCopyMenuOpen(false);
  };

  const renderRiskCards = (withMargin: boolean) => (
    <div className={`${withMargin ? "mt-6" : ""} space-y-4`}>
      {currentRiskGhe?.risks.length ? (
        currentRiskGhe.risks.map((risk) => (
          <div
            key={risk.id}
            data-risk-id={risk.id}
            className="rounded-[14px] border border-border/60 bg-card px-4 py-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] font-semibold text-foreground">
                Risco cadastrado
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDuplicateRisk(risk.id)}
                  className="btn-outline px-3 py-1 text-[12px]"
                >
                  Duplicar risco
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveRisk(risk.id)}
                  className="btn-outline px-3 py-1 text-[12px] text-danger hover:bg-danger/10"
                >
                  Excluir risco
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Tipo de Agente
                </label>
                <div className="relative mt-2">
                  <select
                    className={selectSmallClass}
                    value={risk.tipoAgente}
                    onChange={(event) =>
                      handleRiskChange(
                        risk.id,
                        "tipoAgente",
                        event.target.value
                      )
                    }
                  >
                    <option value="">Selecione</option>
                    <option value="Físico">Físico</option>
                    <option value="Químico">Químico</option>
                    <option value="Biológico">Biológico</option>
                    <option value="Ergonômico">Ergonômico</option>
                    <option value="Acidente">Acidente</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Descrição do Agente
                </label>
                <div className="relative mt-2">
                  <select
                    className={selectSmallClass}
                    value={risk.descricaoAgente}
                    onChange={(event) =>
                      handleRiskChange(
                        risk.id,
                        "descricaoAgente",
                        event.target.value
                      )
                    }
                  >
                    <option value="">Selecione</option>
                    <option value="Ruído">Ruído</option>
                    <option value="Vibração">Vibração</option>
                    <option value="Calor">Calor</option>
                    <option value="Frio">Frio</option>
                    <option value="Vapores">Vapores</option>
                    <option value="Poeira">Poeira</option>
                    <option value="Fumos metálicos">Fumos metálicos</option>
                    <option value="Bactérias">Bactérias</option>
                    <option value="Vírus">Vírus</option>
                    <option value="Postura">Postura</option>
                    <option value="Movimentos repetitivos">
                      Movimentos repetitivos
                    </option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Perigo
                </label>
                <input
                  className={inputBaseClass}
                  value={risk.perigo}
                  onChange={(event) =>
                    handleRiskChange(risk.id, "perigo", event.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Meio de Propagação
                </label>
                <input
                  className={inputBaseClass}
                  value={risk.meioPropagacao}
                  onChange={(event) =>
                    handleRiskChange(
                      risk.id,
                      "meioPropagacao",
                      event.target.value
                    )
                  }
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Fontes/Circunstâncias
                </label>
                <input
                  className={inputBaseClass}
                  value={risk.fontes}
                  onChange={(event) =>
                    handleRiskChange(risk.id, "fontes", event.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Tipo de Avaliação
                </label>
                <input
                  className={inputBaseClass}
                  value={risk.tipoAvaliacao}
                  onChange={(event) =>
                    handleRiskChange(
                      risk.id,
                      "tipoAvaliacao",
                      event.target.value
                    )
                  }
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Intensidade/Concentração
                </label>
                <input
                  className={inputBaseClass}
                  value={risk.intensidade}
                  onChange={(event) =>
                    handleRiskChange(
                      risk.id,
                      "intensidade",
                      event.target.value
                    )
                  }
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Severidade
                </label>
                <input
                  className={inputBaseClass}
                  value={risk.severidade}
                  onChange={(event) =>
                    handleRiskChange(
                      risk.id,
                      "severidade",
                      event.target.value
                    )
                  }
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Probabilidade
                </label>
                <input
                  className={inputBaseClass}
                  value={risk.probabilidade}
                  onChange={(event) =>
                    handleRiskChange(
                      risk.id,
                      "probabilidade",
                      event.target.value
                    )
                  }
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Classificação de Risco
                </label>
                <input
                  className={inputBaseClass}
                  value={risk.classificacao}
                  onChange={(event) =>
                    handleRiskChange(
                      risk.id,
                      "classificacao",
                      event.target.value
                    )
                  }
                />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-[12px] border border-dashed border-border/70 px-4 py-8 text-center text-[13px] text-muted-foreground">
          Nenhum risco cadastrado neste GHE.
        </div>
      )}
    </div>
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isUndo =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z" &&
        !event.shiftKey;
      if (!isUndo) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      handleUndo();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isCopyMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!copyMenuRef.current || !target) return;
      if (!copyMenuRef.current.contains(target)) {
        setIsCopyMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isCopyMenuOpen]);

  const getSelectionStyle = (side: "left" | "right") => {
    if (!selectionBox || selectionBox.side !== side) return null;
    const container = side === "left" ? leftListRef.current : rightListRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const zoom = getZoomFactor();
    const rectLeft = rect.left / zoom;
    const rectTop = rect.top / zoom;
    const left =
      Math.min(selectionBox.startX, selectionBox.currentX) - rectLeft;
    const top = Math.min(selectionBox.startY, selectionBox.currentY) - rectTop;
    const width = Math.abs(selectionBox.currentX - selectionBox.startX);
    const height = Math.abs(selectionBox.currentY - selectionBox.startY);
    return {
      left: Math.max(0, left),
      top: Math.max(0, top),
      width,
      height,
    };
  };

  return (
    <PgrShell
      pgrId={params.id}
      currentStep={step.id as PgrStepId}
      completedSteps={completedSteps}
    >
      {step.id === "historico" ? (
        <PgrHistoricoPanel
          title={mockPgrDetail.historico.title}
          subtitle={mockPgrDetail.historico.subtitle}
          changes={mockPgrDetail.historico.changes}
        />
      ) : step.id === "dados" ? (
        <>
          <section className="px-2">
            <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
              Dados cadastrais
            </h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Preencha os dados da empresa, estabelecimento e contratante
            </p>
          </section>

          <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
            <h2 className="text-[16px] font-medium text-foreground">
              Identificação da Empresa:
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-[2fr_1fr_1.2fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Razão Social:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Grupo:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  CNPJ:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_1.2fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Empresa:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  CNAE:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_0.7fr_1.6fr_1.1fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Endereço
                </label>
                <input
                  defaultValue="Avenida Armando Lombardi, 55"
                  className={inputBaseClass}
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  CEP:
                </label>
                <input
                  defaultValue="20230-130"
                  className={inputBaseClass}
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Cidade:
                </label>
                <input
                  defaultValue="São José do Vale do Rio Preto"
                  className={inputBaseClass}
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Estado:
                </label>
                <input
                  defaultValue="Rio de Janeiro"
                  className={inputBaseClass}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1.6fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Grau de Risco:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Descrição de Atividade Principal:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>
          </section>

          <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
            <h2 className="text-[16px] font-medium text-foreground">
              Identificação da Estabelecimento:
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_1.2fr_1fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Nome do Estabelecimento:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  CNPJ:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Estabelecimento:
                </label>
                <div className="relative mt-2">
                  <select className={selectBaseClass}>
                    <option>Selecione:</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_1.2fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Razão Social:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  CNAE:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1.6fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Grau de Risco:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Descrição de Atividade Principal:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>

            {extraEstabelecimentoFields.length ? (
              <div className="mt-6 space-y-4">
                <p className="text-[12px] font-semibold text-foreground">
                  Campos adicionais
                </p>
                {extraEstabelecimentoFields.map((field) => (
                  <div key={field.id}>
                    <label className="text-[12px] font-medium text-foreground">
                      Campo adicional
                    </label>
                    <div className="mt-2 space-y-3">
                      <input
                        className={inputBaseClass}
                        value={field.title}
                        onChange={(event) =>
                          handleExtraEstabelecimentoFieldChange(
                            field.id,
                            "title",
                            event.target.value
                          )
                        }
                        placeholder="Título do campo"
                      />
                      <input
                        className={inputBaseClass}
                        value={field.value}
                        onChange={(event) =>
                          handleExtraEstabelecimentoFieldChange(
                            field.id,
                            "value",
                            event.target.value
                          )
                        }
                        placeholder="Valor"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleAddEstabelecimentoField}
                className="btn-outline rounded-[10px] px-4 py-2 text-[14px]"
              >
                <PlusCircle className="h-4 w-4" />
                Adicionar Campo
              </button>
            </div>
          </section>

          <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
            <h2 className="text-[16px] font-medium text-foreground">
              Identificação da Contratante:
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_1.6fr_1fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Nome Fantasia:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Razão social:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  CNAE:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_0.7fr_1.6fr_1.1fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Endereço
                </label>
                <input
                  defaultValue="Avenida Armando Lombardi, 55"
                  className={inputBaseClass}
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  CEP:
                </label>
                <input
                  defaultValue="20230-130"
                  className={inputBaseClass}
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Cidade:
                </label>
                <input
                  defaultValue="São José do Vale do Rio Preto"
                  className={inputBaseClass}
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Estado:
                </label>
                <input
                  defaultValue="Rio de Janeiro"
                  className={inputBaseClass}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1.6fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Grau de Risco:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Descrição de Atividade Principal:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>
          </section>

          <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
            <h2 className="text-[16px] font-medium text-foreground">
              Responsável pelo PGR na Organização:
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-[1.6fr_1.2fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Nome:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Função:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_0.9fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Telefone:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Email:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  CPF:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>
          </section>
        </>
      ) : step.id === "descricao" ? (
        <>
          <section className="px-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
                Descrição do GHE
              </h1>
              <div className="group relative">
                <button
                  type="button"
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-semibold text-muted-foreground"
                  aria-label="Ajuda sobre o fluxo do GHE"
                >
                  ?
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-[260px] -translate-x-1/2 rounded-[10px] bg-popover p-3 text-[12px] text-popover-foreground shadow-[0px_8px_20px_rgba(25,59,79,0.15)] opacity-0 transition group-hover:opacity-100">
                  Dica rápida: Associar as funções ao GHE e,
                  depois, preencher processo, observações e ambiente. Atenção à
                  ordem pois é um processo repetitivo e pode gerar erros.
                </div>
              </div>
            </div>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Descreva o processo produtivo, ambiente e funções do GHE
            </p>
          </section>

          <section className="rounded-[14px] bg-card px-6 py-5 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[20px] font-semibold text-foreground">
                  {currentGheName}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Você está montando e descrevendo este GHE.
                </p>
              </div>
            </div>
            {lastGheNotice ? (
              <div className="mt-3 rounded-[10px] border border-border/70 bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
                {lastGheNotice.from} finalizado. Agora você está no{" "}
                <span className="font-semibold text-foreground">
                  {lastGheNotice.to}
                </span>
                .
              </div>
            ) : null}
          </section>

          <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3 px-2">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[16px] font-medium text-foreground">
                    Funções do GHE
                  </h2>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
                    {currentGheName}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {currentItems.length} funções associadas
                  {remainingCount
                    ? ` · ${remainingCount} funções restantes`
                    : " · Todas as funções já estão associadas"}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsGheModalOpen(true)}
              className="btn-primary px-4"
            >
              Ver GHEs
            </button>
            <button
              type="button"
              className="btn-primary px-4"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Importar do Excel
            </button>
          </div>
        </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
              <div
                ref={leftListRef}
                onPointerDown={(event) => handleSelectionStart(event, "left")}
                onDragOver={(event) => handleDragOver(event, "left")}
                onDragLeave={handleDragLeave}
                onDrop={handleDropToLeft}
                className={`relative rounded-[14px] border bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none ${
                  dragOverZone === "left"
                    ? "border-primary/50 ring-1 ring-primary/30"
                    : "border-border/70"
                } select-none`}
              >
                {getSelectionStyle("left") ? (
                  <div
                    className="pointer-events-none absolute z-10 rounded-[8px] border border-primary/40 bg-primary/10"
                    style={getSelectionStyle("left") ?? undefined}
                  />
                ) : null}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">
                      Lista geral de funções
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      Selecione ou arraste para o GHE atual
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-[12px] font-semibold text-foreground/70">
                    {availableCountLabel}
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-4">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className={`${inputInlineClass} pl-10`}
                      placeholder="Buscar por setor ou função"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-6">
                  <p className="text-[11px] text-muted-foreground">
                    Arraste uma ou várias funções selecionadas para o GHE.
                  </p>
                  {groupedFunctions.length ? (
                    groupedFunctions.map((group) => (
                      <div key={group.setor} className="space-y-3">
                        <h3 className="text-[16px] font-semibold text-foreground">
                          {group.setor}
                        </h3>
                        <div className="space-y-2 text-[13px] text-foreground/80">
                          {group.items.map((funcao) => (
                            <label
                              key={funcao.id}
                              data-select-item
                              data-left-id={funcao.id}
                              draggable
                              onDragStart={(event) =>
                                handleDragStartLeft(event, funcao.id)
                              }
                              onDragEnd={handleDragLeave}
                              className="flex cursor-grab items-center gap-2 rounded-[8px] px-2 py-1 transition hover:bg-muted/70"
                            >
                              <input
                                type="checkbox"
                                checked={selectedLeftIds.includes(funcao.id)}
                                onChange={() =>
                                  handleToggleLeftSelection(funcao.id)
                                }
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                              />
                              <span>
                                {funcao.funcao} - {funcao.descricao}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[13px] text-muted-foreground">
                      Nenhuma função encontrada.
                    </p>
                  )}
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleAddSelected}
                    disabled={!selectedLeftIds.length}
                    className={
                      selectedLeftIds.length
                        ? "btn-primary px-4"
                        : "btn-disabled px-4"
                    }
                  >
                    Adicionar selecionadas
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 self-center">
                <button
                  type="button"
                  onClick={handleAddSelected}
                  disabled={!selectedLeftIds.length}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                    selectedLeftIds.length
                      ? "border-primary text-primary hover:bg-primary/10"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRemoveSelected}
                  disabled={!selectedRightIds.length}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                    selectedRightIds.length
                      ? "border-primary text-primary hover:bg-primary/10"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>

              <div
                ref={rightListRef}
                onPointerDown={(event) => handleSelectionStart(event, "right")}
                onDragOver={(event) => handleDragOver(event, "right")}
                onDragLeave={handleDragLeave}
                onDrop={handleDropToRight}
                className={`relative rounded-[14px] border bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none ${
                  dragOverZone === "right"
                    ? "border-primary/50 ring-1 ring-primary/30"
                    : "border-border/70"
                } select-none`}
              >
                {getSelectionStyle("right") ? (
                  <div
                    className="pointer-events-none absolute z-10 rounded-[8px] border border-primary/40 bg-primary/10"
                    style={getSelectionStyle("right") ?? undefined}
                  />
                ) : null}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">
                      Funções no {currentGheName}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      Arraste para devolver à lista geral
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
                    {currentItems.length} associadas
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-[auto_1fr_1fr_1.4fr_auto_auto] gap-4 text-[12px] font-semibold text-muted-foreground">
                  <span />
                  <span>Setor</span>
                  <span>Função</span>
                  <span>Descrição de atividades</span>
                  <span>Nº de funcionários</span>
                  <span />
                </div>
                <div className="mt-3 space-y-2">
                  {currentItems.length ? (
                    currentItems.map((item) => {
                      const data = functionMap.get(item.functionId);
                      if (!data) return null;
                      return (
                      <div
                        key={item.functionId}
                        data-select-item
                        data-right-id={item.functionId}
                        draggable
                        onDragStart={(event) =>
                          handleDragStartRight(event, item.functionId)
                        }
                        onDragEnd={handleDragLeave}
                        className="grid cursor-grab grid-cols-[auto_1fr_1fr_1.4fr_auto_auto] items-center gap-4 rounded-[10px] border border-border/60 px-3 py-3 text-[13px] text-foreground/80 transition hover:bg-muted/70"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRightIds.includes(item.functionId)}
                          onChange={() =>
                            handleToggleRightSelection(item.functionId)
                          }
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="font-semibold text-foreground">
                          {data.setor}
                        </span>
                        <span className="font-medium text-foreground/90">
                          {data.funcao}
                        </span>
                        <span className="text-muted-foreground">
                          {data.descricao}
                        </span>
                        <input
                          className={miniInputClass}
                          type="number"
                          min={0}
                          step={1}
                          value={item.funcionarios || "0"}
                          data-funcionarios
                          data-func-id={item.functionId}
                          onChange={(event) =>
                            handleFuncionarioChange(
                              item.functionId,
                              event.target.value
                            )
                          }
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSingle(item.functionId)}
                          className="text-muted-foreground transition hover:text-primary"
                          title="Remover"
                        >
                          <MinusCircle className="h-4 w-4" />
                        </button>
                      </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[10px] border border-dashed border-border/70 px-3 py-6 text-center text-[13px] text-muted-foreground">
                      Nenhuma função adicionada ao GHE.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {isGheModalOpen ? (
            <div className="fixed -inset-6 z-50">
              <div className="absolute inset-0 bg-black/65" />
              <div className="absolute inset-0 backdrop-blur-[2px]" />
              <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
                <div className="w-full max-w-5xl rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-[18px] font-semibold text-foreground">
                        GHEs construídos
                      </h3>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Visualize e edite as funções associadas a cada GHE
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsGheModalOpen(false)}
                      className="btn-outline px-3 py-1 text-[12px]"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => setGheFilterId("all")}
                        className={`w-full rounded-[12px] border px-4 py-4 text-left ${
                          gheFilterId === "all"
                            ? "border-primary/50 bg-primary/5"
                            : "border-border/70 bg-background/40"
                        }`}
                      >
                        <p className="text-[14px] font-semibold text-foreground">
                          Todos os GHEs
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          {gheGroups.reduce(
                            (total, ghe) => total + ghe.items.length,
                            0
                          )}{" "}
                          funções associadas
                        </p>
                      </button>
                      {gheGroups.map((ghe) => (
                        <div
                          key={ghe.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setGheFilterId(ghe.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setGheFilterId(ghe.id);
                            }
                          }}
                          className={`rounded-[12px] border px-4 py-4 ${
                            gheFilterId === ghe.id
                              ? "border-primary/50 bg-primary/5"
                              : "border-border/70 bg-background/40"
                          } cursor-pointer`}
                        >
                          <div className="w-full text-left">
                            <p className="text-[14px] font-semibold text-foreground">
                              {ghe.name}
                            </p>
                            <p className="text-[12px] text-muted-foreground">
                              {ghe.items.length} funções associadas
                            </p>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleSelectGhe(ghe.id);
                              }}
                              className="btn-outline px-3 py-1 text-[12px]"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-[12px] border border-border/70 bg-background/40 px-4 py-4">
                      <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={gheSearch}
                          onChange={(event) => setGheSearch(event.target.value)}
                          className={`${inputInlineClass} pl-10`}
                          placeholder="Buscar por setor ou função"
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[12px] text-muted-foreground">
                          {gheFilterId === "all"
                            ? "Visualizando todas as funções"
                            : `Filtro: ${gheGroups.find(
                                (ghe) => ghe.id === gheFilterId
                              )?.name ?? "GHE"}`}
                          {normalizedGheSearch
                            ? ` · ${filteredAllFunctions.length} resultados`
                            : ""}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsGheListView((prev) => !prev)}
                          className="btn-outline px-3 py-1 text-[12px]"
                        >
                          {isGheListView
                            ? "Voltar para edição"
                            : "Visualizar em lista"}
                        </button>
                      </div>
                    {isGheListView ? (
                      <div className="mt-4 max-h-[360px] space-y-4 overflow-auto pr-2">
                        {filteredGheGroupsForList.length ? (
                          filteredGheGroupsForList.map((ghe) => (
                          <div
                            key={ghe.id}
                            className="rounded-[10px] border border-border/60 bg-card px-3 py-3"
                          >
                            <p className="text-[13px] font-semibold text-foreground">
                              {ghe.name}
                            </p>
                            {ghe.items.length ? (
                              <ul className="mt-2 space-y-1 text-[12px] text-muted-foreground">
                                {ghe.items.map((item) => {
                                  const data = functionMap.get(item.functionId);
                                  if (!data) return null;
                                  return (
                                    <li key={item.functionId}>
                                      {data.funcao} · {data.setor}
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <p className="mt-2 text-[12px] text-muted-foreground">
                                Nenhuma função associada.
                              </p>
                            )}
                          </div>
                          ))
                        ) : (
                          <div className="rounded-[10px] border border-dashed border-border/70 px-3 py-6 text-center text-[12px] text-muted-foreground">
                            Nenhum resultado para o filtro aplicado.
                          </div>
                        )}
                      </div>
                    ) : (
                        <div className="mt-4 max-h-[360px] space-y-3 overflow-auto pr-2">
                          {filteredAllFunctions.map((funcao) => {
                            const assignedGheId = functionAssignments.get(
                              funcao.id
                            );
                            const assignedGhe = gheGroups.find(
                              (ghe) => ghe.id === assignedGheId
                            );
                            return (
                              <div
                                key={funcao.id}
                                className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-border/60 bg-card px-3 py-3"
                              >
                                <div>
                                  <p className="text-[13px] font-semibold text-foreground">
                                    {funcao.funcao}
                                  </p>
                                  <p className="text-[12px] text-muted-foreground">
                                    {funcao.setor} · {funcao.descricao}
                                  </p>
                                  <p className="text-[12px] text-muted-foreground">
                                    {assignedGhe
                                      ? `Atrelado ao ${assignedGhe.name}`
                                      : "Sem GHE"}
                                  </p>
                                </div>
                                <select
                                  value={assignedGheId ?? "none"}
                                  onChange={(event) =>
                                    handleAssignFunction(
                                      funcao.id,
                                      event.target.value
                                    )
                                  }
                                  className={`${selectBaseClass} w-[170px]`}
                                >
                                  <option value="none">Sem GHE</option>
                                  {gheGroups.map((ghe) => (
                                    <option key={ghe.id} value={ghe.id}>
                                      {ghe.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {isInfoModalOpen ? (
            <div className="fixed -inset-6 z-50">
              <div className="absolute inset-0 bg-black/65" />
              <div className="absolute inset-0 backdrop-blur-[2px]" />
              <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
                <div className="w-full max-w-3xl rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[18px] font-semibold text-foreground">
                          Informações do Processo
                        </h3>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
                          {currentGheName}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Preencha as informações do {currentGheName} que você acabou de montar
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsInfoModalOpen(false)}
                      className="btn-outline px-3 py-1 text-[12px]"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <label className="text-[12px] font-medium text-foreground">
                        Descrição Sucinta do Processo Produtivo
                      </label>
                      <textarea
                        className={textareaBaseClass}
                        value={currentGhe?.info.processo ?? ""}
                        onChange={(event) =>
                          handleInfoChange("processo", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-medium text-foreground">
                        Observações do GHE:
                      </label>
                      <textarea
                        className={textareaBaseClass}
                        value={currentGhe?.info.observacoes ?? ""}
                        onChange={(event) =>
                          handleInfoChange("observacoes", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-medium text-foreground">
                        Descrição do Ambiente do GHE:
                      </label>
                      <textarea
                        className={textareaBaseClass}
                        value={currentGhe?.info.ambiente ?? ""}
                        onChange={(event) =>
                          handleInfoChange("ambiente", event.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsInfoModalOpen(false)}
                      className="btn-outline px-4"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmInfoModal}
                      className="btn-primary px-5"
                    >
                      {infoModalMode === "advance"
                        ? "Salvar e avançar"
                        : "Salvar e continuar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : step.id === "caracterizacao" ? (
        <>
          <section className="px-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
                  Caracterização de Risco
                </h1>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  Cadastre e gerencie os riscos identificados no GHE
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleMockRiskGhes}
                  className="btn-outline px-3 py-2 text-[12px]"
                >
                  Mockar 50 GHEs
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold text-foreground">
                  Riscos atribuídos a um GHE
                </p>
                <p className="text-[12px] text-muted-foreground">
                  Selecione o GHE para editar os riscos vinculados
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
                  {currentRiskGhe?.name ?? "GHE"}
                </span>
                <div ref={copyMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCopyMenuOpen((prev) => !prev)}
                    disabled={!copySourceGhes.length}
                    className={
                      copySourceGhes.length
                        ? "btn-outline px-4"
                        : "btn-disabled px-4"
                    }
                  >
                    Copiar Estrutura do GHE
                  </button>
                  {isCopyMenuOpen ? (
                    <div className="absolute right-0 z-10 mt-2 w-72 rounded-[12px] border border-border/70 bg-card p-3 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                      <p className="text-[12px] font-semibold text-foreground">
                        Copiar estrutura para{" "}
                        <span className="font-semibold text-foreground">
                          {currentRiskGhe?.name ?? "GHE"}
                        </span>
                      </p>
                      <div className="mt-2 max-h-[220px] space-y-2 overflow-auto pr-1">
                        {copySourceGhes.map((ghe) => (
                          <button
                            key={ghe.id}
                            type="button"
                            onClick={() => handleCopyRiskStructure(ghe.id)}
                            className="flex w-full items-center justify-between rounded-[10px] border border-border/60 px-3 py-2 text-left text-[12px] text-foreground hover:bg-muted/60"
                          >
                            <span>
                              {ghe.name} → {currentRiskGhe?.name ?? "GHE"}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {ghe.risks.length} riscos
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleAddRisk}
                  className="btn-primary px-4"
                >
                  <PlusCircle className="h-4 w-4" />
                  Adicionar Risco
                </button>
              </div>
            </div>

            {isManyRiskGhes ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr] lg:items-start">
                <div className="self-start rounded-[12px] border border-border/70 bg-background/40 p-3">
                  <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                    <span>Lista de GHEs</span>
                    <span>
                      {filteredRiskGheGroups.length} de {riskGheGroups.length}
                    </span>
                  </div>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={riskGheSearch}
                      onChange={(event) =>
                        setRiskGheSearch(event.target.value)
                      }
                      className={`${inputInlineClass} pl-10`}
                      placeholder="Buscar GHE"
                    />
                  </div>
                  <div className="mt-3 max-h-[280px] space-y-2 overflow-auto pr-1">
                    {filteredRiskGheGroups.map((ghe) => (
                      <button
                        key={ghe.id}
                        type="button"
                        onClick={() => setCurrentRiskGheId(ghe.id)}
                        className={`w-full rounded-[10px] border px-3 py-2 text-left text-[12px] transition ${
                          currentRiskGheId === ghe.id
                            ? "border-primary/50 bg-primary/5"
                            : "border-border/70 bg-background/60 hover:bg-muted/60"
                        }`}
                      >
                        <p className="font-semibold text-foreground">
                          {ghe.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {ghe.risks.length} riscos cadastrados
                        </p>
                      </button>
                    ))}
                    {!filteredRiskGheGroups.length ? (
                      <div className="rounded-[10px] border border-dashed border-border/70 px-3 py-4 text-center text-[12px] text-muted-foreground">
                        Nenhum GHE encontrado.
                      </div>
                    ) : null}
                  </div>
                </div>
                <div>{renderRiskCards(false)}</div>
              </div>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="relative w-full max-w-[260px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={riskGheSearch}
                      onChange={(event) => setRiskGheSearch(event.target.value)}
                      className={`${inputInlineClass} pl-10`}
                      placeholder="Buscar GHE"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <span>
                      {filteredRiskGheGroups.length} de {riskGheGroups.length}{" "}
                      GHEs
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                  {filteredRiskGheGroups.map((ghe) => (
                    <button
                      key={ghe.id}
                      type="button"
                      onClick={() => setCurrentRiskGheId(ghe.id)}
                      className={`min-w-[150px] rounded-[12px] border px-3 py-2 text-left transition ${
                        currentRiskGheId === ghe.id
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/70 bg-background/40 hover:bg-muted/60"
                      }`}
                    >
                      <p className="text-[12px] font-semibold text-foreground">
                        {ghe.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {ghe.risks.length} riscos
                      </p>
                    </button>
                  ))}
                  {!filteredRiskGheGroups.length ? (
                    <div className="rounded-[12px] border border-dashed border-border/70 px-4 py-3 text-[12px] text-muted-foreground">
                      Nenhum GHE encontrado.
                    </div>
                  ) : null}
                </div>
                {renderRiskCards(true)}
              </>
            )}
          </section>
        </>
      ) : step.id === "medidas" ? (
        <>
          <section className="px-2">
            <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
              Descrição das Medidas de Prevenção Implementadas
            </h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Descreva as medidas de controle e EPIs utilizados
            </p>
          </section>

          <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
            <div className="grid gap-4 border-b border-border/60 pb-3 text-[12px] font-semibold text-muted-foreground md:grid-cols-[1.2fr_1.6fr_2fr_1.3fr_1.3fr]">
              <span>GHE</span>
              <span>Descrição do Agente de Risco</span>
              <span>Medidas de Controle Administrativas e/ou de Engenharia</span>
              <span>EPC</span>
              <span>EPI / C.A.</span>
            </div>

            <div className="mt-4 space-y-4">
              {preventionRows.map((row) => (
                <div
                  key={row.id}
                  className="grid gap-4 border-b border-border/60 pb-4 md:grid-cols-[1.2fr_1.6fr_2fr_1.3fr_1.3fr]"
                >
                  <div>
                    <div className="relative">
                      <select
                        className={selectSmallClass}
                        value={row.ghe}
                        onChange={(event) =>
                          handlePreventionChange(
                            row.id,
                            "ghe",
                            event.target.value
                          )
                        }
                      >
                        {riskGheGroups.map((ghe) => (
                          <option key={ghe.id} value={ghe.name}>
                            {ghe.name}
                          </option>
                        ))}
                        {!riskGheGroups.length ? (
                          <option value="GHE 01">GHE 01</option>
                        ) : null}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <input
                      className={inputBaseClass}
                      value={row.agente}
                      onChange={(event) =>
                        handlePreventionChange(
                          row.id,
                          "agente",
                          event.target.value
                        )
                      }
                    />
                  </div>
                  <div>
                    <textarea
                      className={`${textareaBaseClass} min-h-[80px]`}
                      value={row.medidas}
                      onChange={(event) =>
                        handlePreventionChange(
                          row.id,
                          "medidas",
                          event.target.value
                        )
                      }
                    />
                  </div>
                  <div>
                    <textarea
                      className={`${textareaBaseClass} min-h-[80px]`}
                      value={row.epc}
                      onChange={(event) =>
                        handlePreventionChange(
                          row.id,
                          "epc",
                          event.target.value
                        )
                      }
                    />
                  </div>
                  <div>
                    <textarea
                      className={`${textareaBaseClass} min-h-[80px]`}
                      value={row.epi}
                      onChange={(event) =>
                        handlePreventionChange(
                          row.id,
                          "epi",
                          event.target.value
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
          <h1 className="text-[22px] font-semibold text-foreground sm:text-[24px]">
            {step.title}
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">{step.subtitle}</p>
          <div className="mt-6 rounded-[10px] bg-muted px-4 py-4 text-[14px] text-muted-foreground">
            Conteúdo da etapa <strong>{step.title}</strong> será exibido aqui.
          </div>
        </section>
      )}

      {step.id === "descricao" ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          {prevStep ? (
            <button
              type="button"
              onClick={() => router.push(`/pgr/${params.id}/${prevStep.id}`)}
              className="btn-outline"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="btn-disabled"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCreateNextGhe}
              disabled={!canOpenInfoModal}
              className={canOpenInfoModal ? "btn-primary px-4" : "btn-disabled px-4"}
            >
              Descrever este GHE
            </button>
            <button
              type="button"
              className="btn-outline px-4"
            >
              <Save className="h-4 w-4" />
              Salvar
            </button>
            {nextStep ? (
              <button
                type="button"
                onClick={handleOpenInfoForAdvance}
                disabled={remainingCount > 0 || !canOpenInfoModal}
                className={
                  remainingCount > 0 || !canOpenInfoModal
                    ? "btn-disabled px-6"
                    : "btn-outline px-6"
                }
              >
                Avançar
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="btn-disabled border-0 px-6"
              >
                Avançar
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ) : step.id === "medidas" ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          {prevStep ? (
            <button
              type="button"
              onClick={() => router.push(`/pgr/${params.id}/${prevStep.id}`)}
              className="btn-outline"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          ) : (
            <button type="button" disabled className="btn-disabled">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-outline px-4">
              <Save className="h-4 w-4" />
              Salvar
            </button>
            {nextStep ? (
              <button
                type="button"
                onClick={handleAdvance}
                className="btn-primary px-6"
              >
                Avançar
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" disabled className="btn-disabled border-0 px-6">
                Avançar
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          {prevStep ? (
            <button
              type="button"
              onClick={() => router.push(`/pgr/${params.id}/${prevStep.id}`)}
              className="btn-outline"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          ) : (
            <button type="button" disabled className="btn-disabled">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          )}

          {nextStep ? (
            <button type="button" onClick={handleAdvance} className="btn-primary px-6">
              Avançar
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" disabled className="btn-disabled border-0 px-6">
              Avançar
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </PgrShell>
  );
}
