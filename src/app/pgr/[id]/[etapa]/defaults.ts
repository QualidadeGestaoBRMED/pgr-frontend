import type { DadosCadastraisDraft, InicioDraft } from "./steps/types";
import type {
  AnexoItem,
  GheGroup,
  HistoricoData,
  PgrFunction,
  RiskGheGroup,
} from "./types";

export const defaultHistorico: HistoricoData = {
  title: "Histórico de Versões",
  subtitle: "Visualize o histórico de alterações do PGR",
  changes: [],
  cycleTime: {
    totalMs: 0,
    firstOpenedAt: null,
    lastActiveAt: null,
    byStepMs: {},
  },
};

export const defaultFunctions: PgrFunction[] = [];

export const defaultGheGroups: GheGroup[] = [
  {
    id: "ghe-1",
    name: "GHE 1",
    info: { processo: "", observacoes: "", ambiente: "" },
    items: [],
  },
];

export const defaultRiskGheGroups: RiskGheGroup[] = [
  {
    id: "ghe-1",
    name: "GHE 1",
    risks: [],
  },
];

export const initialInicioDraft: InicioDraft = {
  syncedAt: null,
  pipefyCardId: "",
  documentTitle: "Programa de Gerenciamento de Riscos - PGR",
  companyName: "",
  unitName: "",
  cnpj: "",
  responsible: "",
  email: "",
  notes: "",
};

export const initialDadosCadastrais: DadosCadastraisDraft = {
  empresaRazaoSocial: "",
  empresaGrupo: "",
  empresaCnpj: "",
  empresaNome: "",
  empresaCnae: "",
  empresaEndereco: "",
  empresaCep: "",
  empresaCidade: "",
  empresaEstado: "",
  empresaGrauRisco: "",
  empresaAtividadePrincipal: "",
  estabelecimentoNome: "",
  estabelecimentoCnpj: "",
  estabelecimentoRazaoSocial: "",
  estabelecimentoCnae: "",
  estabelecimentoGrauRisco: "",
  estabelecimentoAtividadePrincipal: "",
  contratanteNomeFantasia: "",
  contratanteRazaoSocial: "",
  contratanteCnpj: "",
  contratanteCnae: "",
  contratanteEndereco: "",
  contratanteCep: "",
  contratanteCidade: "",
  contratanteEstado: "",
  contratanteGrauRisco: "",
  contratanteAtividadePrincipal: "",
  responsavelPgrNome: "",
  responsavelPgrFuncao: "",
  responsavelPgrTelefone: "",
  responsavelPgrEmail: "",
  responsavelPgrCpf: "",
};

export const defaultAnexos: AnexoItem[] = [
  {
    id: "anexo-art",
    title: "ART - Anotação de Responsabilidade Técnica",
    files: [],
  },
];

export const DEFAULT_TIPO_AGENTE_OPTIONS = [
  "Físico",
  "Químico",
  "Biológico",
  "Ergonômico",
  "Acidente",
];

export const DEFAULT_DESCRICAO_AGENTE_OPTIONS = [
  "Ruído",
  "Vibração",
  "Calor",
  "Frio",
  "Vapores",
  "Poeira",
  "Fumos metálicos",
  "Bactérias",
  "Vírus",
  "Postura",
  "Movimentos repetitivos",
];
