import { useCallback, useEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { GheGroup, RiskGheGroup } from "../types";

type UseDescricaoInteractionsArgs = {
  currentGhe: GheGroup | undefined;
  currentGheName: string;
  nextExistingGhe: GheGroup | null;
  canOpenInfoModal: boolean;
  canCreateNextGhe: boolean;
  remainingCount: number;
  allGhesDescribed: boolean;
  infoModalMode: "next" | "next-existing" | "advance";
  infoModalError: string;
  availableFunctions: Array<{ id: string }>;
  selectedLeftIds: string[];
  selectedRightIds: string[];
  functionAssignments: Map<string, string>;
  gheGroups: GheGroup[];
  isGheInfoComplete: (ghe?: GheGroup) => boolean;
  setGheGroups: React.Dispatch<React.SetStateAction<GheGroup[]>>;
  setRiskGheGroups: React.Dispatch<React.SetStateAction<RiskGheGroup[]>>;
  setCurrentGheId: React.Dispatch<React.SetStateAction<string>>;
  setCurrentRiskGheId: React.Dispatch<React.SetStateAction<string>>;
  setLastGheNotice: React.Dispatch<
    React.SetStateAction<null | { from: string; to: string }>
  >;
  setSelectedLeftIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedRightIds: React.Dispatch<React.SetStateAction<string[]>>;
  setInfoModalError: React.Dispatch<React.SetStateAction<string>>;
  setInfoModalMode: React.Dispatch<
    React.SetStateAction<"next" | "next-existing" | "advance">
  >;
  setIsInfoModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsGheModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pushHistory: () => void;
  handleAdvance: () => void;
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

export function useDescricaoInteractions({
  currentGhe,
  currentGheName,
  nextExistingGhe,
  canOpenInfoModal,
  canCreateNextGhe,
  remainingCount,
  allGhesDescribed,
  infoModalMode,
  infoModalError,
  availableFunctions,
  selectedLeftIds,
  selectedRightIds,
  functionAssignments,
  gheGroups,
  isGheInfoComplete,
  setGheGroups,
  setRiskGheGroups,
  setCurrentGheId,
  setCurrentRiskGheId,
  setLastGheNotice,
  setSelectedLeftIds,
  setSelectedRightIds,
  setInfoModalError,
  setInfoModalMode,
  setIsInfoModalOpen,
  setIsGheModalOpen,
  pushHistory,
  handleAdvance,
}: UseDescricaoInteractionsArgs) {
  const [dragOverZone, setDragOverZone] = useState<null | "left" | "right">(null);
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
    const hasAny = currentGhe.items.some((item) => ids.includes(item.functionId));
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
    [currentGhe, setGheGroups]
  );

  const handleCreateNextGhe = () => {
    if (!canOpenInfoModal) return;
    setInfoModalError("");
    if (nextExistingGhe) {
      setInfoModalMode("next-existing");
    } else {
      setInfoModalMode(remainingCount > 0 ? "next" : "advance");
    }
    setIsInfoModalOpen(true);
  };

  const handleOpenInfoForAdvance = () => {
    if (!canOpenInfoModal || !allGhesDescribed) return;
    setInfoModalError("");
    setInfoModalMode("advance");
    setIsInfoModalOpen(true);
  };

  const handleConfirmInfoModal = () => {
    if (!isGheInfoComplete(currentGhe)) {
      setInfoModalError(
        "Preencha Processo, Observações e Ambiente para considerar este GHE descrito."
      );
      return;
    }
    setInfoModalError("");

    if (infoModalMode === "advance") {
      setIsInfoModalOpen(false);
      handleAdvance();
      return;
    }

    if (infoModalMode === "next-existing") {
      if (!nextExistingGhe) return;
      setCurrentGheId(nextExistingGhe.id);
      setCurrentRiskGheId(nextExistingGhe.id);
      setLastGheNotice({ from: currentGheName, to: nextExistingGhe.name });
      setSelectedLeftIds([]);
      setSelectedRightIds([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setIsInfoModalOpen(false);
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
    setCurrentRiskGheId(newId);
    setRiskGheGroups((prev) => [...prev, { id: newId, name: nextName, risks: [] }]);
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
      let currentAssignmentId: string | null = null;
      let cachedItem: { functionId: string; funcionarios: string } | null = null;

      const removed = prev.map((ghe) => {
        const existing = ghe.items.find((item) => item.functionId === functionId);
        if (!existing) return ghe;
        currentAssignmentId = ghe.id;
        cachedItem = existing;
        return {
          ...ghe,
          items: ghe.items.filter((item) => item.functionId !== functionId),
        };
      });

      if (targetGheId === currentAssignmentId) {
        return prev;
      }
      if (targetGheId === "none") {
        return removed;
      }

      const itemToAdd = cachedItem ?? { functionId, funcionarios: "" };
      return removed.map((ghe) =>
        ghe.id === targetGheId ? { ...ghe, items: [...ghe.items, itemToAdd] } : ghe
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
    event.dataTransfer.setData("text/plain", JSON.stringify({ source: "left", ids }));
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragStartRight = (
    event: DragEvent<HTMLDivElement>,
    id: string
  ) => {
    const ids = selectedRightIds.includes(id) ? selectedRightIds : [id];
    event.dataTransfer.setData("text/plain", JSON.stringify({ source: "right", ids }));
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
    if (target?.closest("[data-select-item]")) return;
    if (target?.closest("input,button,select,textarea")) return;
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
      .map((node) => (side === "left" ? node.dataset.leftId ?? "" : node.dataset.rightId ?? ""))
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
        prev ? { ...prev, currentX: point.x, currentY: point.y } : prev
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
    // Mantém sem deps adicionais para evitar rebind a cada frame de seleção.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionBox !== null]);

  useEffect(() => {
    const container = rightListRef.current;
    if (!container) return;
    const handleWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      const input = target?.closest<HTMLInputElement>("input[data-funcionarios]");
      if (!input) return;
      event.preventDefault();
      event.stopPropagation();
      const step = event.shiftKey ? 5 : 1;
      const delta = event.deltaY < 0 ? step : -step;
      const parsed = Number.parseInt(input.value || "0", 10);
      const nextValue = Math.max(0, (Number.isNaN(parsed) ? 0 : parsed) + delta);
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
    if (infoModalError) setInfoModalError("");
    setGheGroups((prev) =>
      prev.map((ghe) =>
        ghe.id === currentGhe.id
          ? { ...ghe, info: { ...ghe.info, [field]: value } }
          : ghe
      )
    );
  };

  const getSelectionStyle = (side: "left" | "right") => {
    if (!selectionBox || selectionBox.side !== side) return null;
    const container = side === "left" ? leftListRef.current : rightListRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const zoom = getZoomFactor();
    const rectLeft = rect.left / zoom;
    const rectTop = rect.top / zoom;
    const left = Math.min(selectionBox.startX, selectionBox.currentX) - rectLeft;
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

  return {
    dragOverZone,
    leftListRef,
    rightListRef,
    handleToggleLeftSelection,
    handleToggleRightSelection,
    handleAddSelected,
    handleRemoveSelected,
    handleCreateNextGhe,
    handleOpenInfoForAdvance,
    handleConfirmInfoModal,
    handleSelectGhe,
    handleAssignFunction,
    handleDragStartLeft,
    handleDragStartRight,
    handleDragOver,
    handleDragLeave,
    handleDropToRight,
    handleDropToLeft,
    handleSelectionStart,
    handleFuncionarioChange,
    handleRemoveSingle,
    handleInfoChange,
    getSelectionStyle,
  };
}
