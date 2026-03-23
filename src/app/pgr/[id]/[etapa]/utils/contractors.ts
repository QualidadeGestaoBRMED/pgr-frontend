import type { ContratanteDraft, DadosCadastraisDraft } from "../steps/types";
import { maskCep, maskCnpj, normalizeRiskGrade } from "../validation/br-field-utils";

const createContratanteId = () =>
  `contratante-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export const createEmptyContratante = (): ContratanteDraft => ({
  id: createContratanteId(),
  nomeFantasia: "",
  razaoSocial: "",
  cnpj: "",
  cnae: "",
  endereco: "",
  cep: "",
  cidade: "",
  estado: "",
  grauRisco: "",
  atividadePrincipal: "",
});

const fromLegacyFields = (
  dados: Partial<DadosCadastraisDraft>,
  fallbackId?: string,
): ContratanteDraft => ({
  id: fallbackId || createContratanteId(),
  nomeFantasia: String(dados.contratanteNomeFantasia || ""),
  razaoSocial: String(dados.contratanteRazaoSocial || ""),
  cnpj: maskCnpj(String(dados.contratanteCnpj || "")),
  cnae: String(dados.contratanteCnae || ""),
  endereco: String(dados.contratanteEndereco || ""),
  cep: maskCep(String(dados.contratanteCep || "")),
  cidade: String(dados.contratanteCidade || ""),
  estado: String(dados.contratanteEstado || ""),
  grauRisco: normalizeRiskGrade(String(dados.contratanteGrauRisco || "")),
  atividadePrincipal: String(dados.contratanteAtividadePrincipal || ""),
});

export const normalizeContractors = (
  dados: Partial<DadosCadastraisDraft>,
): ContratanteDraft[] => {
  const provided = Array.isArray(dados.contratantes) ? dados.contratantes : [];
  if (provided.length) {
    return provided.map((item, index) => {
      const legacy = fromLegacyFields({}, item.id || `contratante-${index + 1}`);
      return {
        ...legacy,
        ...item,
        id: String(item.id || legacy.id),
        cnpj: maskCnpj(String(item.cnpj || "")),
        cep: maskCep(String(item.cep || "")),
        grauRisco: normalizeRiskGrade(String(item.grauRisco || "")),
      };
    });
  }
  return [fromLegacyFields(dados)];
};

export const syncLegacyContractorFields = (
  dados: DadosCadastraisDraft,
): DadosCadastraisDraft => {
  const normalizedContractors = normalizeContractors(dados);
  const first = normalizedContractors[0] ?? createEmptyContratante();
  return {
    ...dados,
    contratantes: normalizedContractors,
    contratanteNomeFantasia: first.nomeFantasia,
    contratanteRazaoSocial: first.razaoSocial,
    contratanteCnpj: first.cnpj,
    contratanteCnae: first.cnae,
    contratanteEndereco: first.endereco,
    contratanteCep: first.cep,
    contratanteCidade: first.cidade,
    contratanteEstado: first.estado,
    contratanteGrauRisco: first.grauRisco,
    contratanteAtividadePrincipal: first.atividadePrincipal,
  };
};
