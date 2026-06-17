import type { DadosCadastraisDraft, EstabelecimentoDraft } from "../steps/types";
import { maskCnpj, normalizeRiskGrade } from "../validation/br-field-utils";

const createEstabelecimentoId = () =>
  `estabelecimento-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export const createEmptyEstabelecimento = (): EstabelecimentoDraft => ({
  id: createEstabelecimentoId(),
  tipo: "",
  nome: "",
  cnpj: "",
  razaoSocial: "",
  cnae: "",
  grauRisco: "",
  atividadePrincipal: "",
});

const isBlankEstabelecimento = (
  estabelecimento: Pick<
    EstabelecimentoDraft,
    "nome" | "cnpj" | "razaoSocial" | "cnae" | "grauRisco" | "atividadePrincipal"
  >,
) =>
  !estabelecimento.nome &&
  !estabelecimento.cnpj &&
  !estabelecimento.razaoSocial &&
  !estabelecimento.cnae &&
  !estabelecimento.grauRisco &&
  !estabelecimento.atividadePrincipal;

const fromLegacyFields = (
  dados: Partial<DadosCadastraisDraft>,
  fallbackId?: string,
): EstabelecimentoDraft => ({
  id: fallbackId || createEstabelecimentoId(),
  tipo: String((dados as DadosCadastraisDraft & { estabelecimentoSelecionado?: string }).estabelecimentoSelecionado || ""),
  nome: String(dados.estabelecimentoNome || ""),
  cnpj: maskCnpj(String(dados.estabelecimentoCnpj || "")),
  razaoSocial: String(dados.estabelecimentoRazaoSocial || ""),
  cnae: String(dados.estabelecimentoCnae || ""),
  grauRisco: normalizeRiskGrade(String(dados.estabelecimentoGrauRisco || "")),
  atividadePrincipal: String(dados.estabelecimentoAtividadePrincipal || ""),
});

export const normalizeEstablishments = (
  dados: Partial<DadosCadastraisDraft>,
  fallbackTipo = "",
): EstabelecimentoDraft[] => {
  const rawItems = (dados as DadosCadastraisDraft & { estabelecimentos?: unknown }).estabelecimentos;
  if (Array.isArray(rawItems)) {
    const normalized = rawItems
      .map((item, index) => {
        const source = item as Partial<EstabelecimentoDraft>;
        const legacy = fromLegacyFields({}, source.id || `estabelecimento-${index + 1}`);
        return {
          ...legacy,
          ...source,
          id: String(source.id || legacy.id),
          tipo: String(source.tipo || fallbackTipo || ""),
          nome: String(source.nome || ""),
          cnpj: maskCnpj(String(source.cnpj || "")),
          razaoSocial: String(source.razaoSocial || ""),
          cnae: String(source.cnae || ""),
          grauRisco: normalizeRiskGrade(String(source.grauRisco || "")),
          atividadePrincipal: String(source.atividadePrincipal || ""),
        };
      })
      .filter((item) => !isBlankEstabelecimento(item));

    if (normalized.length) return normalized;
  }

  const legacy = fromLegacyFields(dados);
  if (fallbackTipo && !legacy.tipo) {
    legacy.tipo = fallbackTipo;
  }
  if (isBlankEstabelecimento(legacy)) {
    return [{ ...legacy, id: legacy.id || createEstabelecimentoId() }];
  }
  return [legacy];
};

export const syncLegacyEstablishmentFields = (
  dados: DadosCadastraisDraft,
  estabelecimentoSelecionado = "",
): DadosCadastraisDraft & { estabelecimentoSelecionado?: string } => {
  const normalizedEstablishments = normalizeEstablishments(dados, estabelecimentoSelecionado);
  const first = normalizedEstablishments[0] || createEmptyEstabelecimento();
  return {
    ...dados,
    estabelecimentos: normalizedEstablishments,
    estabelecimentoNome: first.nome || "",
    estabelecimentoCnpj: first.cnpj || "",
    estabelecimentoRazaoSocial: first.razaoSocial || "",
    estabelecimentoCnae: first.cnae || "",
    estabelecimentoGrauRisco: first.grauRisco || "",
    estabelecimentoAtividadePrincipal: first.atividadePrincipal || "",
    estabelecimentoSelecionado: first.tipo || estabelecimentoSelecionado || "",
  };
};
