import {
  maskCep,
  maskCnpj,
  normalizeRiskGrade,
} from "../validation/br-field-utils";

export type CnpjRegistrationData = {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  cnae: string;
  atividadePrincipal: string;
  grauRisco: string;
  endereco: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
};

const text = (value: unknown) => String(value ?? "").trim();

export const formatCnae = (value: unknown) => {
  const raw = text(value);
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 7) return raw;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}-${digits.slice(4, 5)}-${digits.slice(5)}`;
};

export function mapCnpjLookupToRegistration(
  data: Record<string, unknown>,
  riskDegree: unknown
): CnpjRegistrationData {
  return {
    nomeFantasia: text(data.nome_fantasia),
    razaoSocial: text(data.razao_social),
    cnpj: maskCnpj(text(data.cnpj)),
    cnae: formatCnae(data.cnae_fiscal),
    atividadePrincipal: text(data.cnae_fiscal_descricao),
    grauRisco: normalizeRiskGrade(text(riskDegree)),
    endereco: text(data.logradouro),
    numero: text(data.numero),
    bairro: text(data.bairro),
    cep: maskCep(text(data.cep)),
    cidade: text(data.municipio),
    estado: text(data.uf).toUpperCase(),
  };
}
