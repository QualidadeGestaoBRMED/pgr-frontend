import type { PgrFunction } from "../types";

export type GheFunctionTableItem = {
  functionId: string;
  funcionarios?: string | number;
};

export type GheFunctionSortKey = "setor" | "funcao" | "descricao" | "quantitativo";

export type GheFunctionSort = {
  key: GheFunctionSortKey;
  direction: "asc" | "desc";
} | null;

export type GheFunctionFilters = Record<GheFunctionSortKey, string>;

const textCollator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  numeric: true,
});

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();

const getColumnValue = (
  item: GheFunctionTableItem,
  data: PgrFunction | undefined,
  key: GheFunctionSortKey
) => {
  if (key === "quantitativo") return String(item.funcionarios ?? "0");
  return String(data?.[key] ?? "");
};

export function filterAndSortGheFunctions(
  items: GheFunctionTableItem[],
  functionMap: Map<string, PgrFunction>,
  filters: GheFunctionFilters,
  sort: GheFunctionSort
): GheFunctionTableItem[] {
  const indexedItems = items.map((item, index) => ({ item, index }));
  const activeFilters = Object.entries(filters).filter(([, value]) => value.trim());

  const filtered = indexedItems.filter(({ item }) => {
    const data = functionMap.get(item.functionId);
    return activeFilters.every(([key, filter]) =>
      normalizeText(getColumnValue(item, data, key as GheFunctionSortKey)).includes(
        normalizeText(filter)
      )
    );
  });

  if (!sort) return filtered.map(({ item }) => item);

  return filtered
    .sort((left, right) => {
      const leftData = functionMap.get(left.item.functionId);
      const rightData = functionMap.get(right.item.functionId);
      const leftValue = getColumnValue(left.item, leftData, sort.key);
      const rightValue = getColumnValue(right.item, rightData, sort.key);
      let comparison: number;

      if (sort.key === "quantitativo") {
        const leftNumber = Number(leftValue);
        const rightNumber = Number(rightValue);
        comparison =
          Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
            ? leftNumber - rightNumber
            : textCollator.compare(leftValue, rightValue);
      } else {
        comparison = textCollator.compare(leftValue, rightValue);
      }

      if (comparison === 0) return left.index - right.index;
      return sort.direction === "asc" ? comparison : -comparison;
    })
    .map(({ item }) => item);
}

export function calculateGheQuantity(items: GheFunctionTableItem[]): number {
  return items.reduce((total, item) => {
    const quantity = Number(item.funcionarios);
    return total + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
  }, 0);
}

export function calculateGheQuantityPercentage(quantity: number, total: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(total) || total <= 0) return 0;
  return (Math.max(0, quantity) / total) * 100;
}
