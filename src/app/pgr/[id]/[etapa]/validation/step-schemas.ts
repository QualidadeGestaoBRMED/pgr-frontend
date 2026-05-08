import { z } from "zod";
import type { ContratanteDraft, DadosCadastraisDraft, InicioDraft } from "../steps/types";
import type { GheGroup, GheRisk } from "../types";
import {
  isValidCnpj,
  isValidCpf,
  isValidEmail,
  isValidPhoneBr,
  isValidRiskGrade,
} from "./br-field-utils";

const requiredText = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} é obrigatório`);

const cnpjField = (label: string) =>
  requiredText(label).refine((value) => isValidCnpj(value), `${label} inválido`);

const emailField = (label: string) =>
  requiredText(label).refine((value) => isValidEmail(value), `${label} inválido`);

const phoneField = (label: string) =>
  requiredText(label).refine((value) => isValidPhoneBr(value), `${label} inválido`);

const riskGradeField = (label: string) =>
  requiredText(label).refine(
    (value) => isValidRiskGrade(value),
    `${label} deve ser inteiro entre 1 e 4`,
  );

const cpfField = (label: string) =>
  requiredText(label).refine((value) => isValidCpf(value), `${label} inválido`);

const optionalStringOrArrayField = () =>
  z.union([z.string(), z.array(z.string())]).optional();

export const inicioDraftSchema = z.object({
  documentTitle: requiredText("Título do documento"),
  companyName: requiredText("Empresa"),
  cnpj: cnpjField("CNPJ"),
  responsible: requiredText("Responsável"),
  email: emailField("E-mail"),
});

const contratanteSchema: z.ZodType<ContratanteDraft> = z.object({
  id: requiredText("ID do contratante"),
  nomeFantasia: requiredText("Nome fantasia da contratante"),
  razaoSocial: requiredText("Razão social da contratante"),
  cnpj: cnpjField("CNPJ da contratante"),
  cnae: requiredText("CNAE da contratante"),
  endereco: requiredText("Endereço da contratante"),
  cep: requiredText("CEP da contratante"),
  cidade: requiredText("Cidade da contratante"),
  estado: requiredText("Estado da contratante"),
  grauRisco: riskGradeField("Grau de risco da contratante"),
  atividadePrincipal: requiredText("Atividade principal da contratante"),
});

export const dadosCadastraisSchema = z.object({
  empresaRazaoSocial: requiredText("Razão social"),
  empresaCnpj: cnpjField("CNPJ da empresa"),
  empresaCnae: requiredText("CNAE da empresa"),
  empresaEndereco: requiredText("Endereço da empresa"),
  empresaCidade: requiredText("Cidade da empresa"),
  empresaEstado: requiredText("Estado da empresa"),
  empresaGrauRisco: riskGradeField("Grau de risco da empresa"),
  estabelecimentoCnpj: cnpjField("CNPJ do estabelecimento"),
  estabelecimentoGrauRisco: riskGradeField("Grau de risco do estabelecimento"),
  contratantes: z.array(contratanteSchema),
  responsavelPgrNome: requiredText("Nome do responsável PGR"),
  responsavelPgrFuncao: requiredText("Função do responsável PGR"),
  responsavelPgrTelefone: phoneField("Telefone do responsável PGR"),
  responsavelPgrEmail: emailField("E-mail do responsável PGR"),
  responsavelPgrCpf: cpfField("CPF do responsável PGR"),
});

export const gheInfoSchema = z.object({
  processo: requiredText("Processo"),
  observacoes: requiredText("Observações"),
  ambiente: requiredText("Ambiente"),
});

export const gheRiskSchema = z.object({
  tipoAgente: requiredText("Tipo de agente"),
  descricaoAgente: requiredText("Descrição do agente"),
  perigo: z.string().optional(),
  meioPropagacao: requiredText("Meio de propagação"),
  fontes: requiredText("Fontes"),
  tipoAvaliacao: requiredText("Tipo de avaliação"),
  intensidade: requiredText("Intensidade"),
  severidade: requiredText("Severidade"),
  probabilidade: requiredText("Probabilidade"),
  classificacao: requiredText("Classificação"),
  medidasControle: requiredText("Medidas de controle"),
  epc: optionalStringOrArrayField(),
  epi: optionalStringOrArrayField(),
});

export function isInicioDraftComplete(input: InicioDraft): boolean {
  return inicioDraftSchema.safeParse(input).success;
}

export function isDadosCadastraisComplete(input: DadosCadastraisDraft): boolean {
  return dadosCadastraisSchema.safeParse(input).success;
}

export function isGheInfoComplete(input: GheGroup["info"]): boolean {
  return gheInfoSchema.safeParse(input).success;
}

export function isRiskComplete(input: GheRisk): boolean {
  return gheRiskSchema.safeParse(input).success;
}

const dedupeMessages = (messages: string[]) =>
  Array.from(new Set(messages.map((message) => String(message || "").trim()).filter(Boolean)));

const riskFieldLabels: Record<string, string> = {
  tipoAgente: "Tipo de agente",
  descricaoAgente: "Descrição do agente",
  meioPropagacao: "Meio de propagação",
  fontes: "Fontes",
  tipoAvaliacao: "Tipo de avaliação",
  intensidade: "Intensidade",
  severidade: "Severidade",
  probabilidade: "Probabilidade",
  classificacao: "Classificação",
  medidasControle: "Medidas de controle",
  epc: "EPC",
  epi: "EPI",
};

export function getInicioDraftIssues(input: InicioDraft): string[] {
  const result = inicioDraftSchema.safeParse(input);
  if (result.success) return [];
  return dedupeMessages(result.error.issues.map((issue) => issue.message));
}

export function getDadosCadastraisIssues(input: DadosCadastraisDraft): string[] {
  const result = dadosCadastraisSchema.safeParse(input);
  if (result.success) return [];
  return dedupeMessages(
    result.error.issues.map((issue) => {
      const [root, index] = issue.path;
      if (root === "contratantes" && typeof index === "number") {
        return `Contratante ${index + 1}: ${issue.message}`;
      }
      return issue.message;
    })
  );
}

export function getGheInfoIssues(input: GheGroup["info"]): string[] {
  const result = gheInfoSchema.safeParse(input);
  if (result.success) return [];
  return dedupeMessages(result.error.issues.map((issue) => issue.message));
}

export function getRiskIssues(input: GheRisk): string[] {
  const result = gheRiskSchema.safeParse(input);
  if (result.success) return [];
  return dedupeMessages(
    result.error.issues.map((issue) => {
      if (issue.message !== "Invalid input") return issue.message;
      const firstPath = String(issue.path[0] || "");
      const label = riskFieldLabels[firstPath];
      if (!label) return issue.message;
      return `${label} é obrigatório`;
    })
  );
}
