import type {
  CampoAdicionalDraft,
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

let contratanteIdSequence = 0;
let responsavelTecnicoIdSequence = 0;
let campoAdicionalIdSequence = 0;

const createContratanteId = () => {
  contratanteIdSequence += 1;
  return `contratante-${contratanteIdSequence}`;
};
const createResponsavelTecnicoId = () => {
  responsavelTecnicoIdSequence += 1;
  return `responsavel-tecnico-${responsavelTecnicoIdSequence}`;
};
const createCampoAdicionalId = () => {
  campoAdicionalIdSequence += 1;
  return `campo-adicional-${campoAdicionalIdSequence}`;
};

export const normalizeAdditionalFields = (value: unknown): CampoAdicionalDraft[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const source = item as Record<string, unknown>;
    return {
      id: String(source?.id || createCampoAdicionalId() || `campo-adicional-${index + 1}`),
      title: String(source?.title || source?.label || ""),
      value: String(source?.value || ""),
    };
  });
};

export const createEmptyContratante = (): ContratanteDraft => ({
  id: createContratanteId(),
  nomeFantasia: "",
  razaoSocial: "",
  cnpj: "",
  cnae: "",
  endereco: "",
  numero: "",
  bairro: "",
  cep: "",
  cidade: "",
  estado: "",
  grauRisco: "",
  atividadePrincipal: "",
  camposAdicionais: [],
});

export const createEmptyResponsavelCoordenacaoTecnica =
  (): ResponsavelCoordenacaoTecnicaDraft => ({
    id: createResponsavelTecnicoId(),
    nome: "",
    funcao: "",
    registroProfissional: "",
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
  numero: String(dados.contratanteNumero || ""),
  bairro: String(dados.contratanteBairro || ""),
  cep: maskCep(String(dados.contratanteCep || "")),
  cidade: String(dados.contratanteCidade || ""),
  estado: String(dados.contratanteEstado || ""),
  grauRisco: normalizeRiskGrade(String(dados.contratanteGrauRisco || "")),
  atividadePrincipal: String(dados.contratanteAtividadePrincipal || ""),
  camposAdicionais: normalizeAdditionalFields(
    (dados as DadosCadastraisDraft & {
      contratanteCamposAdicionais?: unknown;
    }).contratanteCamposAdicionais
  ),
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
        numero: String(item.numero || (index === 0 ? dados.contratanteNumero || "" : "")),
        bairro: String(item.bairro || ""),
        grauRisco: normalizeRiskGrade(String(item.grauRisco || "")),
        camposAdicionais: normalizeAdditionalFields(item.camposAdicionais),
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
    registroProfissional: String(item.registroProfissional || ""),
    telefone: maskPhoneBr(String(item.telefone || "")),
    email: normalizeEmail(String(item.email || "")),
    cpf: maskCpf(String(item.cpf || "")),
  }));

  // Regra de negócio: apenas um responsável técnico por documento.
  const firstCoordinator = normalized[0];
  return firstCoordinator
    ? [firstCoordinator]
    : [createEmptyResponsavelCoordenacaoTecnica()];
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
    contratanteNumero: first?.numero || "",
    contratanteBairro: first?.bairro || "",
    contratanteCep: first?.cep || "",
    contratanteCidade: first?.cidade || "",
    contratanteEstado: first?.estado || "",
    contratanteGrauRisco: first?.grauRisco || "",
    contratanteAtividadePrincipal: first?.atividadePrincipal || "",
  };
};
