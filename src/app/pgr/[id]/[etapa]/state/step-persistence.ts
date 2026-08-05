export const stableSerialize = (value: unknown): string => {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));

  return `{${entries
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${stableSerialize(entryValue)}`
    )
    .join(",")}}`;
};

export type PersistPayloadSnapshot<T extends Record<string, unknown>> = {
  signature: string;
  keySignatures: Partial<Record<keyof T, string>>;
};

export function createPersistPayloadSnapshot<
  T extends Record<string, unknown>,
>(payload: T): PersistPayloadSnapshot<T> {
  const keySignatures: Partial<Record<keyof T, string>> = {};
  const entries = Object.entries(payload).sort(([left], [right]) =>
    left.localeCompare(right)
  );
  const signatureParts: string[] = [];

  for (const [key, value] of entries) {
    const typedKey = key as keyof T;
    const valueSignature = stableSerialize(value);
    keySignatures[typedKey] = valueSignature;
    signatureParts.push(`${JSON.stringify(key)}:${valueSignature}`);
  }

  return {
    signature: `{${signatureParts.join(",")}}`,
    keySignatures,
  };
}

/**
 * O estado continua completo no cliente, mas o autosave envia apenas chaves de
 * topo cujo conteúdo mudou desde o último save confirmado. Isso também captura
 * mudanças automáticas feitas fora da etapa visível (normalizações, histórico,
 * sincronização entre GHEs e riscos etc.).
 */
export function selectChangedPersistPayload<T extends Record<string, unknown>>(
  previous: PersistPayloadSnapshot<T> | null,
  current: T,
  currentSnapshot: PersistPayloadSnapshot<T> = createPersistPayloadSnapshot(current)
): Partial<T> {
  if (!previous) return current;

  const changed: Partial<T> = {};
  for (const key of Object.keys(current)) {
    const typedKey = key as keyof T;
    if (
      previous.keySignatures[typedKey] !==
      currentSnapshot.keySignatures[typedKey]
    ) {
      changed[typedKey] = current[typedKey];
    }
  }
  return changed;
}

/**
 * Considera tanto o último save confirmado quanto o último snapshot colocado
 * na fila. A união é necessária para persistir corretamente uma reversão feita
 * enquanto um save anterior ainda está em voo e para sobreviver à falha desse
 * save anterior.
 */
export function selectSafeQueuedPersistPayload<
  T extends Record<string, unknown>,
>(
  confirmed: PersistPayloadSnapshot<T> | null,
  enqueued: PersistPayloadSnapshot<T> | null,
  current: T,
  currentSnapshot: PersistPayloadSnapshot<T>
): Partial<T> {
  return {
    ...selectChangedPersistPayload(confirmed, current, currentSnapshot),
    ...selectChangedPersistPayload(enqueued, current, currentSnapshot),
  };
}
