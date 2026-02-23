export type PgrStepId =
  | "inicio"
  | "historico"
  | "dados"
  | "descricao"
  | "caracterizacao"
  | "medidas"
  | "plano"
  | "anexos"
  | "revisao";

export const pgrSteps: Array<{
  id: PgrStepId;
  title: string;
  subtitle: string;
  tone?: "alert";
}> = [
  {
    id: "inicio",
    title: "Início",
    subtitle: "Informações básicas",
  },
  {
    id: "historico",
    title: "Histórico de Versões",
    subtitle: "Controle de versões",
  },
  {
    id: "dados",
    title: "Dados Cadastrais",
    subtitle: "Dados da empresa",
  },
  {
    id: "descricao",
    title: "Descrição do GHE",
    subtitle: "Grupos homogêneos",
  },
  {
    id: "caracterizacao",
    title: "Caracterização de Risco",
    subtitle: "Identificação dos riscos",
    tone: "alert",
  },
  {
    id: "medidas",
    title: "Medidas de Prevenção",
    subtitle: "Controles implementados",
  },
  {
    id: "plano",
    title: "Plano de ação",
    subtitle: "Ações preventivas",
  },
  {
    id: "anexos",
    title: "Inclusão de Anexos",
    subtitle: "Documentos extras",
  },
  {
    id: "revisao",
    title: "Revisão de campos",
    subtitle: "Validação final",
  },
];
