import type { DadosCadastraisDraft, InicioDraft } from "./steps/types";
import type {
  AnexoItem,
  GheGroup,
  HistoricoData,
  PgrFunction,
  RiskGheGroup,
} from "./types";
import {
  createEmptyContratante,
  createEmptyResponsavelCoordenacaoTecnica,
} from "./utils/contractors";
import { createEmptyEstabelecimento } from "./utils/establishments";

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
    info: {
      processo: "",
      observacoes: "-",
      ambiente: "A ser evidenciado na fase de reconhecimento",
    },
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
  responsibleRole: "",
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
  empresaNumero: "",
  empresaBairro: "",
  empresaCep: "",
  empresaCidade: "",
  empresaEstado: "",
  empresaGrauRisco: "",
  empresaAtividadePrincipal: "",
  estabelecimentos: [createEmptyEstabelecimento()],
  estabelecimentoNome: "",
  estabelecimentoCnpj: "",
  estabelecimentoRazaoSocial: "",
  estabelecimentoCnae: "",
  estabelecimentoEndereco: "",
  estabelecimentoNumero: "",
  estabelecimentoBairro: "",
  estabelecimentoCep: "",
  estabelecimentoCidade: "",
  estabelecimentoEstado: "",
  estabelecimentoGrauRisco: "",
  estabelecimentoAtividadePrincipal: "",
  contratantes: [],
  contratanteNomeFantasia: "",
  contratanteRazaoSocial: "",
  contratanteCnpj: "",
  contratanteCnae: "",
  contratanteEndereco: "",
  contratanteNumero: "",
  contratanteBairro: "",
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
  responsavelImplementacaoPgrNome: "",
  responsavelImplementacaoPgrFuncao: "",
  responsavelImplementacaoPgrTelefone: "",
  responsavelImplementacaoPgrEmail: "",
  responsavelImplementacaoPgrCpf: "",
  responsavelImplementacaoPgrRegistroProfissional: "",
  responsaveisCoordenacaoTecnica: [createEmptyResponsavelCoordenacaoTecnica()],
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
