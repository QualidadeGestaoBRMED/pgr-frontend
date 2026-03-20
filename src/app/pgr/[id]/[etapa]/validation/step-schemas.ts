import { z } from "zod";
import type { DadosCadastraisDraft, InicioDraft } from "../steps/types";
import type { GheGroup, GheRisk } from "../types";

const requiredText = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} é obrigatório`);

export const inicioDraftSchema = z.object({
  documentTitle: requiredText("Título do documento"),
  companyName: requiredText("Empresa"),
  cnpj: requiredText("CNPJ"),
  responsible: requiredText("Responsável"),
  email: requiredText("E-mail"),
});

export const dadosCadastraisSchema = z.object({
  empresaRazaoSocial: requiredText("Razão social"),
  empresaCnpj: requiredText("CNPJ da empresa"),
  empresaCnae: requiredText("CNAE da empresa"),
  empresaEndereco: requiredText("Endereço da empresa"),
  empresaCidade: requiredText("Cidade da empresa"),
  empresaEstado: requiredText("Estado da empresa"),
  responsavelPgrNome: requiredText("Nome do responsável PGR"),
  responsavelPgrFuncao: requiredText("Função do responsável PGR"),
  responsavelPgrTelefone: requiredText("Telefone do responsável PGR"),
  responsavelPgrEmail: requiredText("E-mail do responsável PGR"),
  responsavelPgrCpf: requiredText("CPF do responsável PGR"),
});

export const gheInfoSchema = z.object({
  processo: requiredText("Processo"),
  observacoes: requiredText("Observações"),
  ambiente: requiredText("Ambiente"),
});

export const gheRiskSchema = z.object({
  tipoAgente: requiredText("Tipo de agente"),
  descricaoAgente: requiredText("Descrição do agente"),
  perigo: requiredText("Perigo"),
  meioPropagacao: requiredText("Meio de propagação"),
  fontes: requiredText("Fontes"),
  tipoAvaliacao: requiredText("Tipo de avaliação"),
  intensidade: requiredText("Intensidade"),
  severidade: requiredText("Severidade"),
  probabilidade: requiredText("Probabilidade"),
  classificacao: requiredText("Classificação"),
  medidasControle: requiredText("Medidas de controle"),
  epc: z.array(z.string().trim().min(1)).min(1, "Selecione ao menos um EPC"),
  epi: z.array(z.string().trim().min(1)).min(1, "Selecione ao menos um EPI"),
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
