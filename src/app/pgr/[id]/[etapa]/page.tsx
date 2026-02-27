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
  Check,
  Eye,
  FileDown,
  FileSpreadsheet,
  LoaderCircle,
  MinusCircle,
  Pencil,
  PlusCircle,
  Save,
  Search,
  TriangleAlert,
} from "lucide-react";
import { PgrShell } from "@/components/pgr-shell";
import { PgrHistoricoPanel } from "@/components/pgr-historico-panel";
import { pgrSteps, type PgrStepId } from "@/app/pgr/steps";
import { notFound } from "next/navigation";
import { usePgrProgress } from "@/app/pgr/use-pgr-progress";
import { usePgrDraft } from "@/app/pgr/use-pgr-draft";
import {
  buildFakePgrPdfBlob,
  buildFakePgrPreviewLines,
  type FakePgrPdfInput,
} from "@/app/pgr/fake-pdf";

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

type InicioDraft = {
  syncedAt: string | null;
  pipefyCardId: string;
  documentTitle: string;
  companyName: string;
  unitName: string;
  cnpj: string;
  responsible: string;
  email: string;
  notes: string;
};

const initialInicioDraft: InicioDraft = {
  syncedAt: null,
  pipefyCardId: "",
  documentTitle: "Programa de Gerenciamento de Riscos - PGR",
  companyName: "",
  unitName: "",
  cnpj: "",
  responsible: "",
  email: "",
  notes: "",
};

const pipefyMockDraft: Omit<InicioDraft, "syncedAt"> = {
  pipefyCardId: "PIPE-9012",
  documentTitle: "PGR 2026 - Unidade Fabril",
  companyName: "Indústria Metalúrgica ABC Ltda",
  unitName: "Filial 01 - Soldagem",
  cnpj: "12.345.678/0001-90",
  responsible: "João Silva",
  email: "joao.silva@empresa.com.br",
  notes:
    "Dados simulados do Pipefy para validação de fluxo da elaboração do documento.",
};

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

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
  const [inicioDraft, setInicioDraft] = usePgrDraft<InicioDraft>(
    params.id,
    "inicio",
    initialInicioDraft
  );
  const [isPipefySyncing, setIsPipefySyncing] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isGeneratingFakePdf, setIsGeneratingFakePdf] = useState(false);
  const [lastFakePdfAt, setLastFakePdfAt] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [estabelecimentoSelecionado, setEstabelecimentoSelecionado] =
    useState("");
  const [extraEstabelecimentoFields, setExtraEstabelecimentoFields] = useState<
    Array<{ id: string; title: string; value: string }>
  >([]);
  const [planAction, setPlanAction] = useState({
    nr: "NR-01",
    vigencia: "",
  });
  const [isPlanActionModalOpen, setIsPlanActionModalOpen] = useState(false);
  const [planActionScope, setPlanActionScope] = useState<
    "all" | "ghe" | "risk"
  >("risk");
  const [planActionGheId, setPlanActionGheId] = useState("");
  const [planActionRiskId, setPlanActionRiskId] = useState("");
  const [planActionDescription, setPlanActionDescription] = useState("");
  const [editingMedidasId, setEditingMedidasId] = useState<string | null>(null);
  const [editingMedidasValue, setEditingMedidasValue] = useState("");
  const [planTablePage, setPlanTablePage] = useState(1);
  const planTablePageSize = 8;
  const [anexos, setAnexos] = useState<
    Array<{ id: string; title: string; files: Array<{ id: string; name: string }> }>
  >([
    {
      id: "anexo-art",
      title: "ART - Anotação de Responsabilidade Técnica",
      files: [],
    },
  ]);
  const [anexoDiretriz, setAnexoDiretriz] = useState("Diretriz 1");
  const [draggedAnexoId, setDraggedAnexoId] = useState<string | null>(null);
  const [dragOverAnexoId, setDragOverAnexoId] = useState<string | null>(null);
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
    riskGheGroups: typeof riskGheGroups;
    currentRiskGheId: string;
  };
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentGheId, setCurrentGheId] = useState("ghe-1");
  const [isGheModalOpen, setIsGheModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoModalMode, setInfoModalMode] = useState<"next" | "advance">("next");
  const [gheSearch, setGheSearch] = useState("");
  const [gheFilterId, setGheFilterId] = useState<"all" | string>("all");
  const [isGheListView, setIsGheListView] = useState(false);
  const [openMultiSelect, setOpenMultiSelect] = useState<null | {
    riskId: string;
    field: "epc" | "epi";
  }>(null);
  const [multiSelectQuery, setMultiSelectQuery] = useState("");
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
        medidasControle: string;
        epc: string[];
        epi: string[];
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
        medidasControle: "Rodízio de atividades, pausas programadas",
        epc: ["Cortinas de proteção"],
        epi: ["Máscara de solda (CA 12345)"],
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
        medidasControle: "Exaustão local e ventilação do ambiente",
        epc: ["Sistema de exaustão"],
        epi: ["Respirador (CA 67890)"],
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
  const cloneRiskGheGroups = (value: typeof riskGheGroups) =>
    JSON.parse(JSON.stringify(value)) as typeof riskGheGroups;
  const pushHistory = () => {
    setHistory((prev) => {
      const entry: HistoryEntry = {
        gheGroups: cloneGheGroups(gheGroups),
        currentGheId,
        selectedLeftIds: [...selectedLeftIds],
        selectedRightIds: [...selectedRightIds],
        riskGheGroups: cloneRiskGheGroups(riskGheGroups),
        currentRiskGheId,
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
  const epcOptions = [
    "N/A",
    "Sistema de exaustão",
    "Cortinas de proteção",
    "Ventilação local",
    "Barreiras físicas",
  ];
  const epiOptions = [
    "N/A",
    "Respirador (CA 67890)",
    "Máscara de solda (CA 12345)",
    "Óculos de proteção (CA 55555)",
    "Protetor auricular (CA 44444)",
  ];
  const tipoAgenteOptions = [
    "Físico",
    "Químico",
    "Biológico",
    "Ergonômico",
    "Acidente",
  ];
  const descricaoAgenteOptions = [
    "Ruído",
    "Vibração",
    "Calor",
    "Frio",
    "Vapores",
    "Poeira",
    "Fumos metálicos",
    "Bactérias",
    "Vírus",
    "Postura",
    "Movimentos repetitivos",
  ];
  const diretrizOptions = ["Diretriz 1", "Diretriz 2", "Diretriz 3"];
  const estabelecimentoOptions = [
    "Matriz",
    "Filial 01",
    "Filial 02",
    "Filial 03",
  ];
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
  const assignGheOptions = useMemo(
    () => [
      { label: "Sem GHE", value: "none" },
      ...gheGroups.map((ghe) => ({ label: ghe.name, value: ghe.id })),
    ],
    [gheGroups]
  );
  const planTableRows = useMemo(() => {
    return riskGheGroups.flatMap((ghe) =>
      ghe.risks.map((risk) => ({
        id: `${ghe.id}-${risk.id}`,
        gheId: ghe.id,
        riskId: risk.id,
        gheName: ghe.name,
        descricaoAgente: risk.descricaoAgente || "Não informado",
        classificacao: risk.classificacao || "Não informado",
        medidasPrevencao: risk.medidasControle || "",
      }))
    );
  }, [riskGheGroups]);
  const planActionGheOptions = useMemo(
    () =>
      riskGheGroups.map((ghe) => ({
        label: ghe.name,
        value: ghe.id,
      })),
    [riskGheGroups]
  );
  const selectedPlanActionGhe =
    riskGheGroups.find((ghe) => ghe.id === planActionGheId) ??
    riskGheGroups[0];
  const planActionRiskOptions = useMemo(() => {
    if (!selectedPlanActionGhe) return [];
    return selectedPlanActionGhe.risks.map((risk, index) => ({
      label: `${risk.descricaoAgente || `Risco ${index + 1}`} · ${
        risk.classificacao || "Sem classificação"
      }`,
      value: risk.id,
    }));
  }, [selectedPlanActionGhe]);
  const planTableTotalPages = Math.max(
    1,
    Math.ceil(planTableRows.length / planTablePageSize)
  );
  const planTableCurrentPage = Math.min(planTablePage, planTableTotalPages);
  const planTableStart = (planTableCurrentPage - 1) * planTablePageSize;
  const planTableRowsPage = planTableRows.slice(
    planTableStart,
    planTableStart + planTablePageSize
  );
  const handleInicioDraftChange = (
    field: keyof Omit<InicioDraft, "syncedAt">,
    value: string
  ) => {
    setInicioDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLoadPipefyMock = () => {
    setIsPipefySyncing(true);
    window.setTimeout(() => {
      setInicioDraft((prev) => ({
        ...prev,
        ...pipefyMockDraft,
        syncedAt: new Date().toLocaleString("pt-BR"),
      }));
      setIsPipefySyncing(false);
    }, 500);
  };

  const fakePdfInput = useMemo<FakePgrPdfInput>(
    () => ({
      pgrId: params.id,
      generatedAt: new Date().toLocaleString("pt-BR"),
      documentTitle: inicioDraft.documentTitle,
      pipefyCardId: inicioDraft.pipefyCardId,
      companyName: inicioDraft.companyName,
      unitName: inicioDraft.unitName,
      cnpj: inicioDraft.cnpj,
      responsible: inicioDraft.responsible,
      email: inicioDraft.email,
      notes: inicioDraft.notes,
      completedSteps,
      totalSteps: pgrSteps.length,
      gheCount: gheGroups.length,
      riskCount: riskGheGroups.reduce((total, ghe) => total + ghe.risks.length, 0),
      anexoCount: anexos.reduce((total, anexo) => total + anexo.files.length, 0),
      diretriz: anexoDiretriz,
      nr: planAction.nr,
      vigencia: planAction.vigencia,
    }),
    [
      anexoDiretriz,
      anexos,
      completedSteps,
      gheGroups.length,
      inicioDraft.cnpj,
      inicioDraft.companyName,
      inicioDraft.documentTitle,
      inicioDraft.email,
      inicioDraft.notes,
      inicioDraft.pipefyCardId,
      inicioDraft.responsible,
      inicioDraft.unitName,
      params.id,
      planAction.nr,
      planAction.vigencia,
      riskGheGroups,
    ]
  );

  const fakePreviewLines = useMemo(
    () => buildFakePgrPreviewLines(fakePdfInput),
    [fakePdfInput]
  );

  const handleGenerateFakePdf = useCallback(() => {
    setIsGeneratingFakePdf(true);
    const blob = buildFakePgrPdfBlob(fakePdfInput);
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileBase =
      slugify(inicioDraft.companyName) || `pgr-${slugify(params.id) || "documento"}`;
    link.href = objectUrl;
    link.download = `${fileBase}-fake.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setLastFakePdfAt(new Date().toLocaleString("pt-BR"));
    window.setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
      setIsGeneratingFakePdf(false);
    }, 200);
  }, [fakePdfInput, inicioDraft.companyName, params.id]);

  useEffect(() => {
    if (planTablePage > planTableTotalPages) {
      setPlanTablePage(planTableTotalPages);
    }
  }, [planTablePage, planTableTotalPages]);

  const handleOpenPlanActionModal = () => {
    const firstGhe = riskGheGroups[0];
    const firstRisk = firstGhe?.risks[0];
    setPlanActionScope(firstRisk ? "risk" : firstGhe ? "ghe" : "all");
    setPlanActionGheId(firstGhe?.id ?? "");
    setPlanActionRiskId(firstRisk?.id ?? "");
    setPlanActionDescription("");
    setIsPlanActionModalOpen(true);
  };

  const handleChangePlanActionScope = (scope: "all" | "ghe" | "risk") => {
    setPlanActionScope(scope);
    if (scope === "all") return;
    const currentGhe =
      riskGheGroups.find((ghe) => ghe.id === planActionGheId) ??
      riskGheGroups[0];
    const gheId = currentGhe?.id ?? "";
    setPlanActionGheId(gheId);
    if (scope === "risk") {
      setPlanActionRiskId(currentGhe?.risks[0]?.id ?? "");
    }
  };

  const handlePlanActionGheChange = (value: string) => {
    setPlanActionGheId(value);
    if (planActionScope !== "risk") return;
    const ghe = riskGheGroups.find((item) => item.id === value);
    setPlanActionRiskId(ghe?.risks[0]?.id ?? "");
  };

  const handlePlanMedidasChange = (
    gheId: string,
    riskId: string,
    value: string
  ) => {
    setRiskGheGroups((prev) =>
      prev.map((ghe) => {
        if (ghe.id !== gheId) return ghe;
        return {
          ...ghe,
          risks: ghe.risks.map((risk) =>
            risk.id === riskId ? { ...risk, medidasControle: value } : risk
          ),
        };
      })
    );
  };

  const handleEditMedidasStart = (rowId: string, value: string) => {
    setEditingMedidasId(rowId);
    setEditingMedidasValue(value);
  };

  const handleEditMedidasCancel = () => {
    setEditingMedidasId(null);
    setEditingMedidasValue("");
  };

  const handleEditMedidasSave = (gheId: string, riskId: string) => {
    handlePlanMedidasChange(gheId, riskId, editingMedidasValue.trim());
    setEditingMedidasId(null);
    setEditingMedidasValue("");
  };

  const handleSavePlanActionModal = () => {
    setIsPlanActionModalOpen(false);
  };

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

  const maskDate = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const parts = [];
    if (digits.length >= 2) {
      parts.push(digits.slice(0, 2));
    } else if (digits.length > 0) {
      parts.push(digits);
    }
    if (digits.length >= 4) {
      parts.push(digits.slice(2, 4));
    } else if (digits.length > 2) {
      parts.push(digits.slice(2));
    }
    if (digits.length > 4) {
      parts.push(digits.slice(4));
    }
    return parts.join("/");
  };

  const handleAnexoFiles = (anexoId: string, files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: file.name.replace(/\.pdf$/i, ""),
    }));
    setAnexos((prev) =>
      prev.map((anexo) =>
        anexo.id === anexoId
          ? { ...anexo, files: [...anexo.files, ...incoming] }
          : anexo
      )
    );
  };

  const handleAnexoFileRename = (
    anexoId: string,
    fileId: string,
    value: string
  ) => {
    setAnexos((prev) =>
      prev.map((anexo) =>
        anexo.id === anexoId
          ? {
              ...anexo,
              files: anexo.files.map((file) =>
                file.id === fileId ? { ...file, name: value } : file
              ),
            }
          : anexo
      )
    );
  };

  const handleAnexoFileRemove = (anexoId: string, fileId: string) => {
    setAnexos((prev) =>
      prev.map((anexo) =>
        anexo.id === anexoId
          ? { ...anexo, files: anexo.files.filter((f) => f.id !== fileId) }
          : anexo
      )
    );
  };

  const handleAddAnexo = () => {
    const nextIndex = anexos.length + 1;
    setAnexos((prev) => [
      ...prev,
      {
        id: `anexo-${Date.now()}-${nextIndex}`,
        title: `Novo anexo ${nextIndex}`,
        files: [],
      },
    ]);
  };

  const handleMoveAnexo = (anexoId: string, direction: "up" | "down") => {
    setAnexos((prev) => {
      const index = prev.findIndex((item) => item.id === anexoId);
      if (index === -1) return prev;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  };

  const handleRenameAnexoTitle = (anexoId: string, value: string) => {
    setAnexos((prev) =>
      prev.map((anexo) =>
        anexo.id === anexoId ? { ...anexo, title: value } : anexo
      )
    );
  };

  const handleAnexoDragStart = (anexoId: string) => {
    setDraggedAnexoId(anexoId);
  };

  const handleAnexoDragOver = (event: React.DragEvent, anexoId: string) => {
    event.preventDefault();
    if (anexoId !== dragOverAnexoId) {
      setDragOverAnexoId(anexoId);
    }
  };

  const handleAnexoDrop = (anexoId: string) => {
    if (!draggedAnexoId || draggedAnexoId === anexoId) {
      setDragOverAnexoId(null);
      return;
    }
    setAnexos((prev) => {
      const fromIndex = prev.findIndex((item) => item.id === draggedAnexoId);
      const toIndex = prev.findIndex((item) => item.id === anexoId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
    setDragOverAnexoId(null);
  };

  const handleAnexoDragEnd = () => {
    setDraggedAnexoId(null);
    setDragOverAnexoId(null);
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
      setRiskGheGroups(last.riskGheGroups);
      setCurrentRiskGheId(last.currentRiskGheId);
      setOpenMultiSelect(null);
      return prev.slice(0, -1);
    });
  };

  const createRiskId = () => `risk-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const handleAddRisk = () => {
    if (!currentRiskGhe) return;
    pushHistory();
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
      medidasControle: "",
      epc: [],
      epi: [],
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
    pushHistory();
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
    pushHistory();
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
      | "classificacao"
      | "medidasControle",
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

  const handleToggleRiskMultiSelect = (
    riskId: string,
    field: "epc" | "epi",
    option: string
  ) => {
    if (!currentRiskGhe) return;
    pushHistory();
    setRiskGheGroups((prev) =>
      prev.map((ghe) => {
        if (ghe.id !== currentRiskGhe.id) return ghe;
        return {
          ...ghe,
          risks: ghe.risks.map((risk) => {
            if (risk.id !== riskId) return risk;
            const current = risk[field] ?? [];
            let next: string[] = [];
            if (option === "N/A") {
              next = current.includes("N/A") ? [] : ["N/A"];
            } else {
              const withoutNa = current.filter((item) => item !== "N/A");
              if (withoutNa.includes(option)) {
                next = withoutNa.filter((item) => item !== option);
              } else {
                next = [...withoutNa, option];
              }
            }
            return { ...risk, [field]: next };
          }),
        };
      })
    );
  };

  const filterOptionsByQuery = (options: string[]) => {
    const term = normalizeText(multiSelectQuery.trim());
    if (!term) return options;
    return options.filter((option) =>
      normalizeText(option).includes(term)
    );
  };

  const handleCopyRiskStructure = (sourceGheId: string) => {
    if (!currentRiskGhe) return;
    const source = riskGheGroups.find((ghe) => ghe.id === sourceGheId);
    if (!source) return;
    pushHistory();
    const clonedRisks = source.risks.map((risk) => ({
      ...risk,
      medidasControle: risk.medidasControle ?? "",
      epc: [...(risk.epc ?? [])],
      epi: [...(risk.epi ?? [])],
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
                  medidasControle:
                    idx % 2 === 0
                      ? "Rodízio de atividades, pausas programadas"
                      : "Exaustão local e ventilação do ambiente",
                  epc: idx % 2 === 0 ? ["Cortinas de proteção"] : ["Sistema de exaustão"],
                  epi:
                    idx % 2 === 0
                      ? ["Máscara de solda (CA 12345)"]
                      : ["Respirador (CA 67890)"],
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
                <div className="mt-2">
                  <SearchableSelect
                    value={risk.tipoAgente}
                    onChange={(value) =>
                      handleRiskChange(risk.id, "tipoAgente", value)
                    }
                    options={tipoAgenteOptions.map((option) => ({
                      label: option,
                      value: option,
                    }))}
                    buttonClassName={selectSmallClass}
                    searchPlaceholder="Filtrar agente"
                  />
                </div>
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Descrição do Agente
                </label>
                <div className="mt-2">
                  <SearchableSelect
                    value={risk.descricaoAgente}
                    onChange={(value) =>
                      handleRiskChange(risk.id, "descricaoAgente", value)
                    }
                    options={descricaoAgenteOptions.map((option) => ({
                      label: option,
                      value: option,
                    }))}
                    buttonClassName={selectSmallClass}
                    searchPlaceholder="Filtrar descrição"
                  />
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
            <div className="mt-8">
              <p className="text-[13px] font-semibold text-foreground">
                Medidas de prevenção
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-[12px] font-medium text-foreground">
                    Medidas de Controle Administrativas e/ou de Engenharia
                  </label>
                  <textarea
                    className={`${textareaBaseClass} min-h-[80px]`}
                    value={risk.medidasControle}
                    onChange={(event) =>
                      handleRiskChange(
                        risk.id,
                        "medidasControle",
                        event.target.value
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-foreground">
                    EPC
                  </label>
                  <div className="relative mt-2" data-multiselect>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMultiSelect((prev) =>
                          prev?.riskId === risk.id && prev.field === "epc"
                            ? null
                            : { riskId: risk.id, field: "epc" }
                        )
                      }
                      className={`${selectSmallClass} flex items-center justify-between text-left`}
                    >
                      <span className="truncate">
                        {risk.epc.length ? risk.epc.join(", ") : "Selecione"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {openMultiSelect?.riskId === risk.id &&
                    openMultiSelect.field === "epc" ? (
                      <div className="absolute z-10 mt-2 w-full rounded-[10px] border border-border/70 bg-card p-2 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                        <input
                          className={`${inputInlineClass} h-[32px]`}
                          value={multiSelectQuery}
                          onChange={(event) =>
                            setMultiSelectQuery(event.target.value)
                          }
                          placeholder="Filtrar..."
                        />
                        <div className="mt-2 max-h-[180px] space-y-1 overflow-auto pr-1">
                          {filterOptionsByQuery(epcOptions).map((option) => (
                            <label
                              key={option}
                              className="flex items-center gap-2 rounded-[8px] px-2 py-1 text-[12px] text-foreground hover:bg-muted/60"
                            >
                              <input
                                type="checkbox"
                                checked={risk.epc.includes(option)}
                                onChange={() =>
                                  handleToggleRiskMultiSelect(
                                    risk.id,
                                    "epc",
                                    option
                                  )
                                }
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                          {!filterOptionsByQuery(epcOptions).length ? (
                            <div className="rounded-[8px] border border-dashed border-border/60 px-2 py-2 text-center text-[12px] text-muted-foreground">
                              Nenhum resultado
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-medium text-foreground">
                    EPI / C.A.
                  </label>
                  <div className="relative mt-2" data-multiselect>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMultiSelect((prev) =>
                          prev?.riskId === risk.id && prev.field === "epi"
                            ? null
                            : { riskId: risk.id, field: "epi" }
                        )
                      }
                      className={`${selectSmallClass} flex items-center justify-between text-left`}
                    >
                      <span className="truncate">
                        {risk.epi.length ? risk.epi.join(", ") : "Selecione"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {openMultiSelect?.riskId === risk.id &&
                    openMultiSelect.field === "epi" ? (
                      <div className="absolute z-10 mt-2 w-full rounded-[10px] border border-border/70 bg-card p-2 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                        <input
                          className={`${inputInlineClass} h-[32px]`}
                          value={multiSelectQuery}
                          onChange={(event) =>
                            setMultiSelectQuery(event.target.value)
                          }
                          placeholder="Filtrar..."
                        />
                        <div className="mt-2 max-h-[180px] space-y-1 overflow-auto pr-1">
                          {filterOptionsByQuery(epiOptions).map((option) => (
                            <label
                              key={option}
                              className="flex items-center gap-2 rounded-[8px] px-2 py-1 text-[12px] text-foreground hover:bg-muted/60"
                            >
                              <input
                                type="checkbox"
                                checked={risk.epi.includes(option)}
                                onChange={() =>
                                  handleToggleRiskMultiSelect(
                                    risk.id,
                                    "epi",
                                    option
                                  )
                                }
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                          {!filterOptionsByQuery(epiOptions).length ? (
                            <div className="rounded-[8px] border border-dashed border-border/60 px-2 py-2 text-center text-[12px] text-muted-foreground">
                              Nenhum resultado
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
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

  type SelectOption = { label: string; value: string };
  const SearchableSelect = ({
    value,
    options,
    onChange,
    placeholder = "Selecione",
    buttonClassName = selectSmallClass,
    menuClassName = "",
    disabled = false,
    searchPlaceholder = "Filtrar...",
  }: {
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    placeholder?: string;
    buttonClassName?: string;
    menuClassName?: string;
    disabled?: boolean;
    searchPlaceholder?: string;
  }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const selectedLabel =
      options.find((opt) => opt.value === value)?.label ?? "";
    const filteredOptions = query
      ? options.filter((opt) =>
          normalizeText(opt.label).includes(normalizeText(query))
        )
      : options;

    useEffect(() => {
      if (!open) return;
      const handleOutside = (event: MouseEvent) => {
        const target = event.target as Node | null;
        if (!containerRef.current || !target) return;
        if (!containerRef.current.contains(target)) {
          setOpen(false);
        }
      };
      window.addEventListener("mousedown", handleOutside);
      return () => window.removeEventListener("mousedown", handleOutside);
    }, [open]);

    useEffect(() => {
      if (open) {
        setQuery("");
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }, [open]);

    return (
      <div ref={containerRef} className={`relative ${menuClassName}`}>
        <button
          type="button"
          onClick={() => !disabled && setOpen((prev) => !prev)}
          className={`${buttonClassName} flex items-center justify-between text-left ${
            disabled ? "opacity-60" : ""
          }`}
        >
          <span className="truncate">
            {selectedLabel || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
        {open ? (
          <div className="absolute z-10 mt-2 w-full rounded-[10px] border border-border/70 bg-card p-2 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
            <input
              ref={inputRef}
              className={`${inputInlineClass} h-[34px]`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
            />
            <div className="mt-2 max-h-[180px] space-y-1 overflow-auto pr-1">
              {filteredOptions.length ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-[8px] px-2 py-1 text-[12px] text-foreground hover:bg-muted/60 ${
                      option.value === value ? "bg-muted/60" : ""
                    }`}
                  >
                    <span>{option.label}</span>
                  </button>
                ))
              ) : (
                <div className="rounded-[8px] border border-dashed border-border/60 px-2 py-2 text-center text-[12px] text-muted-foreground">
                  Nenhum resultado
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

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

  useEffect(() => {
    if (!openMultiSelect) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-multiselect]")) {
        return;
      }
      setOpenMultiSelect(null);
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [openMultiSelect]);

  useEffect(() => {
    if (openMultiSelect) {
      setMultiSelectQuery("");
    }
  }, [openMultiSelect]);

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
      {step.id === "inicio" ? (
        <>
          <section className="px-2">
            <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
              Início da elaboração do PGR
            </h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Nesta etapa você inicia o documento com os dados-base que virão do
              Pipefy.
            </p>
          </section>

          <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold text-foreground">
                  Origem dos dados
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {inicioDraft.syncedAt
                    ? `Última sincronização mock: ${inicioDraft.syncedAt}`
                    : "Sem sincronização ainda. Use o mock do Pipefy para preencher rapidamente."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadPipefyMock}
                disabled={isPipefySyncing}
                className={
                  isPipefySyncing ? "btn-disabled px-4" : "btn-primary px-4"
                }
              >
                {isPipefySyncing ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  "Carregar dados mock do Pipefy"
                )}
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Card do Pipefy
                </label>
                <input
                  className={inputBaseClass}
                  value={inicioDraft.pipefyCardId}
                  onChange={(event) =>
                    handleInicioDraftChange("pipefyCardId", event.target.value)
                  }
                  placeholder="Ex: PIPE-9012"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Título do documento
                </label>
                <input
                  className={inputBaseClass}
                  value={inicioDraft.documentTitle}
                  onChange={(event) =>
                    handleInicioDraftChange("documentTitle", event.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Empresa
                </label>
                <input
                  className={inputBaseClass}
                  value={inicioDraft.companyName}
                  onChange={(event) =>
                    handleInicioDraftChange("companyName", event.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Unidade
                </label>
                <input
                  className={inputBaseClass}
                  value={inicioDraft.unitName}
                  onChange={(event) =>
                    handleInicioDraftChange("unitName", event.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  CNPJ
                </label>
                <input
                  className={inputBaseClass}
                  value={inicioDraft.cnpj}
                  onChange={(event) =>
                    handleInicioDraftChange("cnpj", event.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Responsável
                </label>
                <input
                  className={inputBaseClass}
                  value={inicioDraft.responsible}
                  onChange={(event) =>
                    handleInicioDraftChange("responsible", event.target.value)
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[12px] font-medium text-foreground">
                  E-mail de contato
                </label>
                <input
                  className={inputBaseClass}
                  value={inicioDraft.email}
                  onChange={(event) =>
                    handleInicioDraftChange("email", event.target.value)
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[12px] font-medium text-foreground">
                  Observações iniciais
                </label>
                <textarea
                  className={textareaBaseClass}
                  value={inicioDraft.notes}
                  onChange={(event) =>
                    handleInicioDraftChange("notes", event.target.value)
                  }
                  placeholder="Ex: contexto, unidade atendida, observações do card."
                />
              </div>
            </div>
          </section>
        </>
      ) : step.id === "historico" ? (
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
                <div className="mt-2">
                  <SearchableSelect
                    value={estabelecimentoSelecionado}
                    onChange={(value) => setEstabelecimentoSelecionado(value)}
                    options={estabelecimentoOptions.map((option) => ({
                      label: option,
                      value: option,
                    }))}
                    buttonClassName={selectBaseClass}
                    placeholder="Selecione"
                    searchPlaceholder="Filtrar estabelecimento"
                  />
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
                                <SearchableSelect
                                  value={assignedGheId ?? "none"}
                                  onChange={(value) =>
                                    handleAssignFunction(funcao.id, value)
                                  }
                                  options={assignGheOptions}
                                  buttonClassName={`${selectBaseClass} w-[170px]`}
                                  searchPlaceholder="Filtrar GHE"
                                />
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
      ) : step.id === "plano" ? (
        <>
          <section className="px-2">
            <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
              Plano de Ação
            </h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Defina as ações para mitigação dos riscos identificados
            </p>
          </section>

          <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <div>
                <p className="text-[12px] font-semibold text-muted-foreground">
                  NRs
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "NR-01",
                    "NR-06",
                    "NR-07",
                    "NR-09",
                    "NR-10",
                    "NR-12",
                    "NR-17",
                    "NR-18",
                    "NR-33",
                    "NR-35",
                  ].map((nr) => (
                    <button
                      key={nr}
                      type="button"
                      onClick={() =>
                        setPlanAction((prev) => ({ ...prev, nr }))
                      }
                      className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${
                        planAction.nr === nr
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/70 text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      {nr}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[12px] font-semibold text-muted-foreground">
                  Vigência (DD/MM/AAAA)
                </label>
                <input
                  className={inputBaseClass}
                  value={planAction.vigencia}
                  onChange={(event) =>
                    setPlanAction((prev) => ({
                      ...prev,
                      vigencia: maskDate(event.target.value),
                    }))
                  }
                  placeholder="Ex: 10/03/2025"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  Ações por risco
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {planTableRows.length} registros gerados a partir da
                  caracterização de risco
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenPlanActionModal}
                className="btn-primary px-4 text-[12px]"
              >
                Criar ação
              </button>
            </div>

            {planTableRows.length ? (
              <div className="mt-4 space-y-3">
                <div className="max-h-[420px] overflow-auto rounded-[12px] border border-border/60">
                  <table className="min-w-[720px] w-full border-separate border-spacing-0 text-left text-[12px]">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">GHE</th>
                      <th className="border-l border-border/60 px-4 py-3 font-semibold">
                        Descrição agente de risco
                      </th>
                      <th className="border-l border-border/60 px-4 py-3 font-semibold">
                        Classificação
                      </th>
                      <th className="border-l border-border/60 px-4 py-3 font-semibold">
                        Medidas de prevenção
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {planTableRowsPage.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-border/60"
                      >
                        <td className="px-4 py-3 text-foreground">
                          {row.gheName}
                        </td>
                        <td className="border-l border-border/60 px-4 py-3 text-foreground">
                          {row.descricaoAgente}
                        </td>
                        <td className="border-l border-border/60 px-4 py-3 text-foreground">
                          {row.classificacao}
                        </td>
                        <td className="border-l border-border/60 px-4 py-3 text-foreground">
                          {editingMedidasId === row.id ? (
                            <div className="space-y-2">
                              <textarea
                                className={`${textareaBaseClass} min-h-[96px]`}
                                value={editingMedidasValue}
                                onChange={(event) =>
                                  setEditingMedidasValue(event.target.value)
                                }
                                placeholder="Descreva as medidas de prevenção"
                              />
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEditMedidasSave(
                                      row.gheId,
                                      row.riskId
                                    )
                                  }
                                  className="btn-primary px-3 py-1 text-[11px]"
                                >
                                  Salvar
                                </button>
                                <button
                                  type="button"
                                  onClick={handleEditMedidasCancel}
                                  className="btn-outline px-3 py-1 text-[11px]"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="group px-1 py-1">
                              <div className="flex items-start justify-between gap-3">
                                <p
                                  className={`text-[12px] leading-relaxed ${
                                    row.medidasPrevencao
                                      ? "text-foreground"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {row.medidasPrevencao
                                    ? row.medidasPrevencao
                                    : "Sem medidas cadastradas."}
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEditMedidasStart(
                                      row.id,
                                      row.medidasPrevencao
                                    )
                                  }
                                  className="opacity-0 transition group-hover:opacity-100"
                                  title="Editar medidas de prevenção"
                                >
                                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 text-muted-foreground/70 hover:text-foreground hover:border-border">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </span>
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted-foreground">
                  <span>
                    Página {planTableCurrentPage} de {planTableTotalPages} ·{" "}
                    {planTableRows.length} registros
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPlanTablePage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={planTableCurrentPage === 1}
                      className={
                        planTableCurrentPage === 1
                          ? "btn-disabled px-3 py-1 text-[11px]"
                          : "btn-outline px-3 py-1 text-[11px]"
                      }
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPlanTablePage((prev) =>
                          Math.min(planTableTotalPages, prev + 1)
                        )
                      }
                      disabled={planTableCurrentPage === planTableTotalPages}
                      className={
                        planTableCurrentPage === planTableTotalPages
                          ? "btn-disabled px-3 py-1 text-[11px]"
                          : "btn-outline px-3 py-1 text-[11px]"
                      }
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-[12px] border border-dashed border-border/60 px-4 py-6 text-center text-[12px] text-muted-foreground">
                Nenhum risco cadastrado para gerar o plano de ação.
              </div>
            )}
          </section>

          {isPlanActionModalOpen ? (
            <div className="fixed -inset-6 z-50">
              <div className="absolute inset-0 bg-black/65" />
              <div className="absolute inset-0 backdrop-blur-[2px]" />
              <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
                <div className="w-full max-w-3xl rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-[18px] font-semibold text-foreground">
                        Criar ação
                      </h3>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Defina o escopo da ação a partir do inventário.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPlanActionModalOpen(false)}
                      className="btn-outline px-3 py-1 text-[12px]"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <p className="text-[12px] font-semibold text-muted-foreground">
                        Escopo da ação
                      </p>
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        {[
                          {
                            value: "risk",
                            label: "Risco específico",
                            helper: "Direciona a um risco pontual.",
                          },
                          {
                            value: "ghe",
                            label: "GHE específico",
                            helper: "Aplica a um GHE inteiro.",
                          },
                          {
                            value: "all",
                            label: "Todos os GHEs",
                            helper: "Ação transversal.",
                          },
                        ].map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() =>
                              handleChangePlanActionScope(
                                item.value as "all" | "ghe" | "risk"
                              )
                            }
                            className={`rounded-[12px] border px-4 py-3 text-left text-[12px] ${
                              planActionScope === item.value
                                ? "border-primary/50 bg-primary/5 text-foreground"
                                : "border-border/70 bg-background/40 text-muted-foreground"
                            }`}
                          >
                            <p className="font-semibold">{item.label}</p>
                            <p className="mt-1 text-[11px]">{item.helper}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {planActionScope !== "all" ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-[12px] font-semibold text-muted-foreground">
                            GHE
                          </label>
                          <div className="mt-2">
                            <SearchableSelect
                              value={planActionGheId}
                              onChange={handlePlanActionGheChange}
                              options={planActionGheOptions}
                              buttonClassName={selectBaseClass}
                              searchPlaceholder="Filtrar GHE"
                              disabled={!planActionGheOptions.length}
                            />
                          </div>
                        </div>
                        {planActionScope === "risk" ? (
                          <div>
                            <label className="text-[12px] font-semibold text-muted-foreground">
                              Risco
                            </label>
                            <div className="mt-2">
                              <SearchableSelect
                                value={planActionRiskId}
                                onChange={setPlanActionRiskId}
                                options={planActionRiskOptions}
                                buttonClassName={selectBaseClass}
                                searchPlaceholder="Filtrar risco"
                                disabled={!planActionRiskOptions.length}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div>
                      <label className="text-[12px] font-semibold text-muted-foreground">
                        Descrição da ação
                      </label>
                      <textarea
                        className={`${textareaBaseClass} min-h-[120px]`}
                        value={planActionDescription}
                        onChange={(event) =>
                          setPlanActionDescription(event.target.value)
                        }
                        placeholder="Descreva a ação preventiva..."
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPlanActionModalOpen(false)}
                      className="btn-outline px-4"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePlanActionModal}
                      className="btn-primary px-5"
                    >
                      Salvar ação
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : step.id === "anexos" ? (
        <>
          <section className="px-2">
            <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
              Inclusão de Anexos
            </h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Insira documentos
            </p>
          </section>

          <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
            <div className="grid gap-4 md:grid-cols-[1.2fr_1.4fr]">
              <div>
                <label className="text-[12px] font-semibold text-muted-foreground">
                  Diretriz para geração de PDF
                </label>
                <div className="mt-2">
                  <SearchableSelect
                    value={anexoDiretriz}
                    onChange={(value) => setAnexoDiretriz(value)}
                    options={diretrizOptions.map((option) => ({
                      label: option,
                      value: option,
                    }))}
                    buttonClassName={selectBaseClass}
                    searchPlaceholder="Filtrar diretriz"
                  />
                </div>
              </div>
              <div>
                <label className="text-[12px] font-semibold text-muted-foreground">
                  ART - Anotação de Responsabilidade Técnica
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <label className="btn-outline px-3 py-2 text-[12px]">
                    Escolher arquivos
                    <input
                      type="file"
                      accept="application/pdf"
                      multiple
                      className="hidden"
                      onChange={(event) =>
                        handleAnexoFiles("anexo-art", event.target.files)
                      }
                    />
                  </label>
                  <span className="text-[12px] text-muted-foreground">
                    {anexos.find((item) => item.id === "anexo-art")?.files
                      .length ?? 0}{" "}
                    arquivos
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {anexos.map((anexo) => (
                <div
                  key={anexo.id}
                  draggable
                  onDragStart={() => handleAnexoDragStart(anexo.id)}
                  onDragOver={(event) => handleAnexoDragOver(event, anexo.id)}
                  onDrop={() => handleAnexoDrop(anexo.id)}
                  onDragEnd={handleAnexoDragEnd}
                  className={`rounded-[12px] border px-4 py-4 ${
                    dragOverAnexoId === anexo.id
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/60 bg-background/40"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <input
                      className={`${inputInlineClass} max-w-[320px]`}
                      value={anexo.title}
                      onChange={(event) =>
                        handleRenameAnexoTitle(anexo.id, event.target.value)
                      }
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveAnexo(anexo.id, "up")}
                        className="btn-outline px-3 py-1 text-[12px]"
                      >
                        Subir
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveAnexo(anexo.id, "down")}
                        className="btn-outline px-3 py-1 text-[12px]"
                      >
                        Descer
                      </button>
                      <label className="btn-outline px-3 py-1 text-[12px]">
                        Adicionar PDF
                        <input
                          type="file"
                          accept="application/pdf"
                          multiple
                          className="hidden"
                          onChange={(event) =>
                            handleAnexoFiles(anexo.id, event.target.files)
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {anexo.files.length ? (
                      anexo.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex flex-wrap items-center gap-3 rounded-[10px] border border-border/60 bg-card px-3 py-2"
                        >
                          <input
                            className={`${inputInlineClass} max-w-[320px]`}
                            value={file.name}
                            onChange={(event) =>
                              handleAnexoFileRename(
                                anexo.id,
                                file.id,
                                event.target.value
                              )
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleAnexoFileRemove(anexo.id, file.id)
                            }
                            className="btn-outline px-3 py-1 text-[12px] text-danger hover:bg-danger/10"
                          >
                            Excluir
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-[12px] text-muted-foreground">
                        Nenhum arquivo anexado.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleAddAnexo}
                className="btn-outline px-4 py-2"
              >
                Adicionar novo anexo
              </button>
            </div>
          </section>
        </>
      ) : step.id === "revisao" ? (
        <>
          <section className="px-2">
            <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
              Revisão dos Campos
            </h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Revise todas as seções preenchidas antes de finalizar o documento
            </p>
          </section>

          <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
            <div className="space-y-3">
              {pgrSteps
                .filter((item) => item.id !== "revisao" && item.id !== "inicio")
                .map((item, index) => {
                  const isDone = index < completedSteps;
                  const statusLabel = isDone ? "Completo" : "Incompleto";
                  return (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-border/60 bg-background/40 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                            isDone
                              ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                              : "border-rose-300 bg-rose-50 text-rose-600"
                          }`}
                        >
                          {isDone ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <TriangleAlert className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-foreground">
                            {item.title}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                            isDone
                              ? "bg-emerald-500 text-white"
                              : "bg-rose-500 text-white"
                          }`}
                        >
                          {statusLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => router.push(`/pgr/${params.id}/${item.id}`)}
                          className="btn-outline px-2 py-1"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="mt-6 rounded-[12px] border border-border/60 bg-background/40 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-foreground">
                    Finalizar Documento
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    Complete todas as seções para finalizar o documento.
                  </p>
                  {lastFakePdfAt ? (
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      Último PDF fake gerado em {lastFakePdfAt}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPreviewModalOpen(true)}
                    className="btn-outline px-4"
                  >
                    <Eye className="h-4 w-4" />
                    Visualizar prévia
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateFakePdf}
                    disabled={isGeneratingFakePdf}
                    className={
                      isGeneratingFakePdf ? "btn-disabled px-5" : "btn-primary px-5"
                    }
                  >
                    {isGeneratingFakePdf ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4" />
                        Gerar PDF fake
                      </>
                    )}
                  </button>
                </div>
              </div>
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

      {step.id === "revisao" && isPreviewModalOpen ? (
        <div className="fixed -inset-6 z-50">
          <div className="absolute inset-0 bg-black/65" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />
          <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
            <div className="w-full max-w-5xl rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-[18px] font-semibold text-foreground">
                    Prévia do documento
                  </h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Visualização aproximada do PGR antes da geração do PDF fake.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="btn-outline px-3 py-1 text-[12px]"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-6 max-h-[65vh] overflow-auto rounded-[12px] border border-border/60 bg-background/40 px-4 py-4">
                <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-foreground">
                  {fakePreviewLines.join("\n")}
                </pre>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="btn-outline px-4"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleGenerateFakePdf}
                  disabled={isGeneratingFakePdf}
                  className={
                    isGeneratingFakePdf ? "btn-disabled px-5" : "btn-primary px-5"
                  }
                >
                  {isGeneratingFakePdf ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-4 w-4" />
                      Gerar PDF fake
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
      ) : step.id === "plano" ? (
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
      ) : step.id === "anexos" ? (
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
      ) : step.id === "revisao" ? (
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
