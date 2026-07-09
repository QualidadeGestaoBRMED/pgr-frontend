import { describe, expect, it } from "vitest";

import {
  createEmptyEstabelecimento,
  normalizeEstablishments,
  syncLegacyEstablishmentFields,
} from "./establishments";
import type { DadosCadastraisDraft } from "../steps/types";

describe("establishment helpers", () => {
  it("keeps explicit blank establishments created by the UI", () => {
    const first = {
      ...createEmptyEstabelecimento(),
      id: "estabelecimento-1",
      nome: "Unidade Centro",
    };
    const second = {
      ...createEmptyEstabelecimento(),
      id: "estabelecimento-2",
    };

    const normalized = normalizeEstablishments({ estabelecimentos: [first, second] });

    expect(normalized).toHaveLength(2);
    expect(normalized[0]?.nome).toBe("Unidade Centro");
    expect(normalized[1]?.id).toBe("estabelecimento-2");
  });

  it("preserves appended blank establishments when syncing legacy fields", () => {
    const first = {
      ...createEmptyEstabelecimento(),
      id: "estabelecimento-1",
      nome: "Unidade Centro",
    };
    const second = {
      ...createEmptyEstabelecimento(),
      id: "estabelecimento-2",
    };

    const synced = syncLegacyEstablishmentFields(
      { estabelecimentos: [first, second] } as DadosCadastraisDraft,
      "Próprio"
    );

    expect(synced.estabelecimentos).toHaveLength(2);
    expect(synced.estabelecimentoNome).toBe("Unidade Centro");
  });
});
