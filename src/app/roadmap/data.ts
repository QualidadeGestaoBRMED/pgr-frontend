export type RoadmapStatus = "done" | "in-progress" | "todo";

export type RoadmapItem = {
  id: string;
  titulo: string;
  sigla: string;
  descricao_curta: string;
  status: RoadmapStatus;
  nr_relacionada: string;
  destaque?: string;
};

export const roadmapItems: RoadmapItem[] = [
  {
    id: "pgr",
    titulo: "Programa de Gerenciamento de Riscos",
    sigla: "PGR",
    descricao_curta:
      "Base do ciclo de SST. Estrutura perigos, inventário de riscos e plano de ação contínuo.",
    status: "done",
    nr_relacionada: "NR 01",
    destaque: "Origina os riscos e controles que abastecem as próximas entregas.",
  },
  {
    id: "pcmso",
    titulo: "Programa de Controle Médico de Saúde Ocupacional",
    sigla: "PCMSO",
    descricao_curta:
      "Traduz os riscos ocupacionais em vigilância médica, exames e acompanhamentos clínicos.",
    status: "todo",
    nr_relacionada: "NR 07",
  },
  {
    id: "ltcat",
    titulo: "Laudo Técnico das Condições Ambientais do Trabalho",
    sigla: "LTCAT",
    descricao_curta:
      "Consolida exposições com foco previdenciário e sustenta enquadramentos para aposentadoria especial.",
    status: "todo",
    nr_relacionada: "INSS",
    destaque: "Quando o mapa de riscos do PGR amadurece, o LTCAT ganha precisão e lastro técnico.",
  },
  {
    id: "aet",
    titulo: "Análise Ergonômica do Trabalho",
    sigla: "AET",
    descricao_curta:
      "Aprofunda a leitura ergonômica da operação e orienta adequações em postos, ritmo e organização.",
    status: "todo",
    nr_relacionada: "NR 17",
  },
  {
    id: "lip",
    titulo: "Laudo de Insalubridade e Periculosidade",
    sigla: "LIP",
    descricao_curta:
      "Avalia adicional legal, enquadramentos e evidencia exposições relevantes para a atividade.",
    status: "todo",
    nr_relacionada: "NR 15 e NR 16",
  },
  {
    id: "ppp",
    titulo: "Perfil Profissiográfico Previdenciário",
    sigla: "PPP",
    descricao_curta:
      "Conecta histórico laboral, registros ambientais e informações previdenciárias do trabalhador.",
    status: "todo",
    nr_relacionada: "Decreto 3.048/99",
  },
  {
    id: "aso",
    titulo: "Atestado de Saúde Ocupacional",
    sigla: "ASO",
    descricao_curta:
      "Formaliza aptidão clínica e evidências médicas dentro da rotina operacional da empresa.",
    status: "todo",
    nr_relacionada: "NR 07",
  },
  {
    id: "ppr",
    titulo: "Programa de Proteção Respiratória",
    sigla: "PPR",
    descricao_curta:
      "Estrutura critérios de seleção, uso e manutenção de respiradores conforme exposições existentes.",
    status: "todo",
    nr_relacionada: "Fundacentro / PPR",
  },
  {
    id: "pca",
    titulo: "Programa de Conservação Auditiva",
    sigla: "PCA",
    descricao_curta:
      "Endereça ruído ocupacional com monitoramento, medidas preventivas e vigilância auditiva.",
    status: "todo",
    nr_relacionada: "NR 07",
  },
  {
    id: "cat",
    titulo: "Comunicação de Acidente de Trabalho",
    sigla: "CAT",
    descricao_curta:
      "Garante rastreabilidade e resposta formal quando há acidente, incidente ou doença relacionada ao trabalho.",
    status: "todo",
    nr_relacionada: "Lei 8.213/91",
  },
  {
    id: "os",
    titulo: "Ordem de Serviço de SST",
    sigla: "OS",
    descricao_curta:
      "Transforma controles e orientações em instrução formal para execução segura das atividades.",
    status: "todo",
    nr_relacionada: "NR 01",
  },
  {
    id: "cipa",
    titulo: "Comissão Interna de Prevenção de Acidentes e Assédio",
    sigla: "CIPA",
    descricao_curta:
      "Ativa governança participativa, investigação preventiva e rituais permanentes de melhoria.",
    status: "todo",
    nr_relacionada: "NR 05",
  },
  {
    id: "ppe",
    titulo: "Plano de Proteção de Emergências",
    sigla: "PPE",
    descricao_curta:
      "Fecha a jornada com resposta estruturada, fluxos de emergência e prontidão operacional.",
    status: "todo",
    nr_relacionada: "NR 23 / PAE",
  },
];
