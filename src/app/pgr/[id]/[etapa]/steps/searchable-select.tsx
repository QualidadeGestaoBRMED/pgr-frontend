import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type SearchableSelectOption = {
  label: string;
  value: string;
};

export type SearchableSelectProps = {
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  buttonClassName: string;
  menuClassName?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Selecione",
  buttonClassName,
  menuClassName = "",
  disabled = false,
  searchPlaceholder = "Filtrar...",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedLabel = options.find((opt) => opt.value === value)?.label ?? "";
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
    if (!open) return;
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
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
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open ? (
        <div className="absolute z-10 mt-2 w-full rounded-[10px] border border-border/70 bg-card p-2 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
          <input
            ref={inputRef}
            className="h-[34px] w-full rounded-[8px] border border-border bg-muted px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
}
