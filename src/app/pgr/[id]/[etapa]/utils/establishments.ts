import type { DadosCadastraisDraft, EstabelecimentoDraft } from "../steps/types";
import { maskCep, maskCnpj, normalizeRiskGrade } from "../validation/br-field-utils";

let estabelecimentoIdSequence = 0;

const createEstabelecimentoId = () => {
  estabelecimentoIdSequence += 1;
  return `estabelecimento-${estabelecimentoIdSequence}`;
};

export const createEmptyEstabelecimento = (): EstabelecimentoDraft => ({
  id: createEstabelecimentoId(),
  tipo: "",
  nome: "",
  cnpj: "",
  razaoSocial: "",
  cnae: "",
  endereco: "",
  numero: "",
  bairro: "",
  cep: "",
  cidade: "",
  estado: "",
  grauRisco: "",
  atividadePrincipal: "",
});

const isBlankEstabelecimento = (
  estabelecimento: Pick<
    EstabelecimentoDraft,
    "nome" | "cnpj" | "razaoSocial" | "cnae" | "grauRisco" | "atividadePrincipal"
    | "endereco" | "cep" | "cidade" | "estado"
  >,
) =>
  !estabelecimento.nome &&
  !estabelecimento.cnpj &&
  !estabelecimento.razaoSocial &&
  !estabelecimento.cnae &&
  !estabelecimento.endereco &&
  !estabelecimento.cep &&
  !estabelecimento.cidade &&
  !estabelecimento.estado &&
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
  endereco: String(dados.estabelecimentoEndereco || ""),
  numero: String(dados.estabelecimentoNumero || ""),
  bairro: String(dados.estabelecimentoBairro || ""),
  cep: maskCep(String(dados.estabelecimentoCep || "")),
  cidade: String(dados.estabelecimentoCidade || ""),
  estado: String(dados.estabelecimentoEstado || ""),
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
          endereco: String(source.endereco || ""),
          numero: String(source.numero || (index === 0 ? dados.estabelecimentoNumero || "" : "")),
          bairro: String(source.bairro || ""),
          cep: maskCep(String(source.cep || "")),
          cidade: String(source.cidade || ""),
          estado: String(source.estado || ""),
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
    estabelecimentoEndereco: first.endereco || "",
    estabelecimentoNumero: first.numero || "",
    estabelecimentoBairro: first.bairro || "",
    estabelecimentoCep: first.cep || "",
    estabelecimentoCidade: first.cidade || "",
    estabelecimentoEstado: first.estado || "",
    estabelecimentoGrauRisco: first.grauRisco || "",
    estabelecimentoAtividadePrincipal: first.atividadePrincipal || "",
    estabelecimentoSelecionado: first.tipo || estabelecimentoSelecionado || "",
  };
};
