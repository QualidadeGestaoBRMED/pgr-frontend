import type {
  ContratanteDraft,
  DadosCadastraisDraft,
  ResponsavelCoordenacaoTecnicaDraft,
} from "../steps/types";
import {
  maskCep,
  maskCnpj,
  maskCpf,
  maskPhoneBr,
  normalizeEmail,
  normalizeRiskGrade,
} from "../validation/br-field-utils";

const createContratanteId = () =>
  `contratante-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const createResponsavelTecnicoId = () =>
  `responsavel-tecnico-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

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

export const createEmptyResponsavelCoordenacaoTecnica =
  (): ResponsavelCoordenacaoTecnicaDraft => ({
    id: createResponsavelTecnicoId(),
    nome: "",
    funcao: "",
    telefone: "",
    email: "",
    cpf: "",
  });

const isBlankContratante = (
  contratante: Pick<
    ContratanteDraft,
    | "nomeFantasia"
    | "razaoSocial"
    | "cnpj"
    | "cnae"
    | "endereco"
    | "cep"
    | "cidade"
    | "estado"
    | "grauRisco"
    | "atividadePrincipal"
  >,
) =>
  !contratante.nomeFantasia &&
  !contratante.razaoSocial &&
  !contratante.cnpj &&
  !contratante.cnae &&
  !contratante.endereco &&
  !contratante.cep &&
  !contratante.cidade &&
  !contratante.estado &&
  !contratante.grauRisco &&
  !contratante.atividadePrincipal;

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
  if (Array.isArray(dados.contratantes)) {
    return dados.contratantes.map((item, index) => {
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

  const legacy = fromLegacyFields(dados);
  if (isBlankContratante(legacy)) {
    return [];
  }
  return [legacy];
};

export const normalizeResponsaveisCoordenacaoTecnica = (
  dados: Partial<DadosCadastraisDraft>,
): ResponsavelCoordenacaoTecnicaDraft[] => {
  if (!Array.isArray(dados.responsaveisCoordenacaoTecnica)) {
    return [createEmptyResponsavelCoordenacaoTecnica()];
  }

  const normalized = dados.responsaveisCoordenacaoTecnica.map((item, index) => ({
    id: String(item.id || `responsavel-tecnico-${index + 1}`),
    nome: String(item.nome || ""),
    funcao: String(item.funcao || ""),
    telefone: maskPhoneBr(String(item.telefone || "")),
    email: normalizeEmail(String(item.email || "")),
    cpf: maskCpf(String(item.cpf || "")),
  }));

  return normalized.length ? normalized : [createEmptyResponsavelCoordenacaoTecnica()];
};

export const syncLegacyContractorFields = (
  dados: DadosCadastraisDraft,
): DadosCadastraisDraft => {
  const normalizedContractors = normalizeContractors(dados);
  const normalizedResponsaveisCoordenacaoTecnica =
    normalizeResponsaveisCoordenacaoTecnica(dados);
  const first = normalizedContractors[0];
  return {
    ...dados,
    contratantes: normalizedContractors,
    responsaveisCoordenacaoTecnica: normalizedResponsaveisCoordenacaoTecnica,
    contratanteNomeFantasia: first?.nomeFantasia || "",
    contratanteRazaoSocial: first?.razaoSocial || "",
    contratanteCnpj: first?.cnpj || "",
    contratanteCnae: first?.cnae || "",
    contratanteEndereco: first?.endereco || "",
    contratanteCep: first?.cep || "",
    contratanteCidade: first?.cidade || "",
    contratanteEstado: first?.estado || "",
    contratanteGrauRisco: first?.grauRisco || "",
    contratanteAtividadePrincipal: first?.atividadePrincipal || "",
  };
};
