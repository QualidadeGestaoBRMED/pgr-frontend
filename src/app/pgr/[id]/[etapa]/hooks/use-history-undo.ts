import { useCallback, useEffect } from "react";

type UseHistoryUndoArgs = {
  setHistory: React.Dispatch<React.SetStateAction<any[]>>;
  setGheGroups: React.Dispatch<React.SetStateAction<any[]>>;
  setCurrentGheId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedLeftIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedRightIds: React.Dispatch<React.SetStateAction<string[]>>;
  setRiskGheGroups: React.Dispatch<React.SetStateAction<any[]>>;
  setCurrentRiskGheId: React.Dispatch<React.SetStateAction<string>>;
};

export function useHistoryUndo({
  setHistory,
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
