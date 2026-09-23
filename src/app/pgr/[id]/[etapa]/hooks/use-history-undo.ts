import { useCallback, useEffect } from "react";
import type { GheGroup, HistoryEntry, PgrFunction, RiskGheGroup } from "../types";

type UseHistoryUndoArgs = {
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  setFunctionsData: React.Dispatch<React.SetStateAction<PgrFunction[]>>;
  setGheGroups: React.Dispatch<React.SetStateAction<GheGroup[]>>;
  setCurrentGheId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedLeftIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedRightIds: React.Dispatch<React.SetStateAction<string[]>>;
  setRiskGheGroups: React.Dispatch<React.SetStateAction<RiskGheGroup[]>>;
  setCurrentRiskGheId: React.Dispatch<React.SetStateAction<string>>;
};

export function useHistoryUndo({
  setHistory,
  setFunctionsData,
  setGheGroups,
  setCurrentGheId,
  setSelectedLeftIds,
  setSelectedRightIds,
  setRiskGheGroups,
  setCurrentRiskGheId,
}: UseHistoryUndoArgs) {
  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setFunctionsData(last.functionsData);
      setGheGroups(last.gheGroups);
      setCurrentGheId(last.currentGheId);
      setSelectedLeftIds(last.selectedLeftIds);
      setSelectedRightIds(last.selectedRightIds);
      setRiskGheGroups(last.riskGheGroups);
      setCurrentRiskGheId(last.currentRiskGheId);
      return prev.slice(0, -1);
    });
  }, [
    setCurrentGheId,
    setCurrentRiskGheId,
    setFunctionsData,
    setGheGroups,
    setHistory,
    setRiskGheGroups,
    setSelectedLeftIds,
    setSelectedRightIds,
  ]);

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
  }, [handleUndo]);
}
