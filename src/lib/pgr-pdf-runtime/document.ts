import type { RuntimeGhe, RuntimeSnapshot } from "./snapshot";
import type { RuntimeVisualAssets } from "./assets";

type Content = any;
type TableCell = any;
type StyleDictionary = Record<string, any>;

const COLORS = {
  text: "#434343",
  textStrong: "#193B4F",
  teal: "#007891",
  tealDark: "#0E6F84",
  grid: "#D6DDE3",
  white: "#FFFFFF",
};

function sanitizeText(value: unknown) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
}

function truncateText(value: unknown, maxLength = 260) {
  const text = sanitizeText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function toUpper(value: unknown) {
  return sanitizeText(value).toLocaleUpperCase("pt-BR");
}

function bodyCell(value: unknown, style = "tableBodyCell"): TableCell {
  return { text: sanitizeText(value), style };
}

function infoLabelCell(value: string): TableCell {
  return { text: value, style: "infoLabelCell" };
}

function tealHeaderCell(value: string): TableCell {
  return { text: value, style: "tealHeaderCell" };
}

function sectionTitle(value: string): Content {
  return { text: value, style: "sectionTitle", margin: [0, 16, 0, 8] };
}

function dottedLine(label: string, page: string) {
  const cleanLabel = sanitizeText(label);
  const cleanPage = sanitizeText(page);
  const dots = ".".repeat(Math.max(6, 110 - cleanLabel.length - cleanPage.length));
  return `${cleanLabel}${dots}${cleanPage}`;
}

const THIN_TABLE_LAYOUT = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => COLORS.grid,
  vLineColor: () => COLORS.grid,
  paddingLeft: () => 5,
  paddingRight: () => 5,
  paddingTop: () => 4,
  paddingBottom: () => 4,
};

const HEADER_TABLE_LAYOUT = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => COLORS.grid,
  vLineColor: () => COLORS.grid,
  paddingLeft: () => 5,
  paddingRight: () => 5,
  paddingTop: () => 2,
  paddingBottom: () => 2,
};

const ANNEX_TABLE_LAYOUT = {
  ...THIN_TABLE_LAYOUT,
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 3,
  paddingBottom: () => 3,
};

function buildCoverPage(snapshot: RuntimeSnapshot): Content[] {
  return [
    {
      stack: [
        {
          text: "Programa de\nGerenciamento\nde Riscos",
          style: "coverProgramName",
          margin: [0, 282, 0, 34],
        },
        { text: "PGR - NR 01", style: "coverMainTitle", margin: [0, 0, 0, 34] },
        {
          text: "Portaria nº 1.419, de 24 de Agosto de 2024\nInventário de Riscos e Plano de Ação",
          style: "coverSubtitle",
          margin: [0, 0, 0, 34],
        },
        {
          text: [
            { text: "Nome da Empresa: ", style: "coverMetaLabel" },
            { text: sanitizeText(snapshot.company.razaoSocial || snapshot.company.name), style: "coverMetaValue" },
            { text: "\n" },
            { text: "Estabelecimento: ", style: "coverMetaLabel" },
            { text: sanitizeText(snapshot.establishment.name), style: "coverMetaValue" },
          ],
          margin: [0, 0, 0, 30],
        },
        {
          text: [
            { text: "Vigência: ", style: "coverMetaLabel" },
            { text: sanitizeText(snapshot.program.vigencia || snapshot.meta.generatedDate), style: "coverMetaValue" },
          ],
        },
      ],
      margin: [0, 0, 0, 0],
    },
    { text: "", pageBreak: "after" },
  ];
}

function buildUpdatePage(snapshot: RuntimeSnapshot): Content[] {
  return [
    sectionTitle("Quadro de Atualizações do Programa"),
    {
      text:
        "O seguinte quadro relaciona as atualizações feitas a este Programa rastreadas pela versão.\nUtiliza-se para descrever mudanças e acréscimos cada vez que for republicado. A descrição deve\nincluir a maior quantidade possível de detalhes das mudanças.",
      style: "bodyParagraph",
      margin: [0, 0, 0, 16],
    },
    {
      table: {
        headerRows: 1,
        widths: [80, "*", 100],
        body: [
          [tealHeaderCell("Alteração"), tealHeaderCell("Motivo da Revisão do PGR"), tealHeaderCell("Data")],
          [
            bodyCell("00", "tableBodyCellCenter"),
            bodyCell(snapshot.meta.revisionReason || "Elaboração inicial", "tableBodyCellCenter"),
            bodyCell(snapshot.meta.generatedDate, "tableBodyCellCenter"),
          ],
        ],
      },
      layout: THIN_TABLE_LAYOUT,
    },
    { text: "", pageBreak: "after" },
  ];
}

function buildSummaryPage(): Content[] {
  const tocEntries = [
    ["1 - Identificação da Empresa", "5"],
    ["2 - Identificação do Estabelecimento", "5"],
    ["3 - Quantitativo Total de Empregados", "5"],
    ["4 - Dados do Programa", "6"],
    ["5 - Introdução", "7"],
    ["6 - Objetivo", "8"],
    ["7 - Documento", "10"],
    ["8 - Inventário de Riscos Ocupacionais", "10"],
    ["9 - Plano de Ação", "10"],
    ["10 - Definição das Responsabilidades", "11"],
    ["11 - Abrangência", "13"],
    ["12 - Definições", "13"],
    ["13 - Etapas do Programa de Gerenciamento de Riscos", "17"],
    ["14 - Caracterização de Perigos e Critérios de Avaliação", "19"],
    ["15 - Gradação do Risco", "26"],
    ["16 - Plano de Ação com Metas e Forma de Acompanhamento", "34"],
    ["16 - Relação de Prestação de Serviços a Terceiros", "34"],
    ["17 - Exames, Discussão do Plano de Ação e Considerações Finais", "34"],
    ["18 - Assinatura", "36"],
    ["19 - Índice de Anexos", "37"],
    ["ANEXO A: INVENTÁRIO DE RISCOS OCUPACIONAIS", "38"],
    ["ANEXO B: DESCRIÇÃO DAS MEDIDAS DE PREVENÇÃO IMPLEMENTADAS", "40"],
    ["ANEXO C: PLANO DE AÇÃO (MEDIDAS DE PREVENÇÃO INTRODUZIDAS E APRIMORADAS)", "42"],
    ["ANEXO D: ART – ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA", "44"],
  ];

  return [
    {
      stack: tocEntries.map(([label, page]) => ({
        text: dottedLine(label, page),
        style: "tocLine",
      })),
      margin: [0, 8, 0, 0],
    },
    { text: "", pageBreak: "after" },
  ];
}

function buildIdentificationAndProgramPages(snapshot: RuntimeSnapshot): Content[] {
  const commonInfoRows = (isCompany = true): TableCell[][] => {
    if (isCompany) {
      return [
        [infoLabelCell("Razão Social"), bodyCell(snapshot.company.razaoSocial || snapshot.company.name)],
        [infoLabelCell("CNPJ"), bodyCell(snapshot.company.cnpj)],
        [infoLabelCell("CNAE"), bodyCell(snapshot.company.cnae)],
        [infoLabelCell("Atividade Principal"), bodyCell(snapshot.company.atividadePrincipal)],
        [infoLabelCell("Grau de Risco (Quadro I da NR-04)"), bodyCell(snapshot.company.grauRisco)],
        [infoLabelCell("Endereço"), bodyCell(snapshot.company.enderecoCompleto)],
      ];
    }

    return [
      [infoLabelCell("Estabelecimento"), bodyCell(snapshot.establishment.name)],
      [infoLabelCell("CNPJ"), bodyCell(snapshot.establishment.cnpj)],
      [infoLabelCell("CNAE"), bodyCell(snapshot.establishment.cnae)],
      [infoLabelCell("Atividade Principal"), bodyCell(snapshot.establishment.atividadePrincipal)],
      [infoLabelCell("Grau de Risco (Quadro I da NR-04)"), bodyCell(snapshot.establishment.grauRisco)],
    ];
  };

  return [
    sectionTitle("1 - Identificação da Empresa"),
    {
      table: { widths: ["43%", "*"], body: commonInfoRows(true) },
      layout: THIN_TABLE_LAYOUT,
    },
    sectionTitle("2 - Identificação do Estabelecimento"),
    {
      table: { widths: ["43%", "*"], body: commonInfoRows(false) },
      layout: THIN_TABLE_LAYOUT,
    },
    sectionTitle("3 - Quantitativo Total de Empregados"),
    {
      table: {
        widths: ["43%", "*"],
        body: [[infoLabelCell("Quantitativo de empregados ativos"), bodyCell(String(snapshot.program.totalEmployees || 0))]],
      },
      layout: THIN_TABLE_LAYOUT,
    },
    { text: "", pageBreak: "after" },

    sectionTitle("4 - Dados do Programa"),
    {
      table: {
        widths: ["43%", "*"],
        body: [
          [infoLabelCell("Norma Regulamentadora"), bodyCell(snapshot.program.nr)],
          [infoLabelCell("Data de Elaboração do Documento"), bodyCell(snapshot.meta.generatedDate)],
          [infoLabelCell("Responsável pela Elaboração do PGR"), bodyCell(snapshot.program.responsavelElaboracao)],
          [infoLabelCell("Responsável pela Coordenação Técnica"), bodyCell(snapshot.program.responsavelCoordenacao)],
          [infoLabelCell("Responsável pela Implementação do PGR da organização"), bodyCell(snapshot.program.responsavelImplementacao)],
        ],
      },
      layout: THIN_TABLE_LAYOUT,
    },
    { text: "", pageBreak: "after" },
  ];
}

function buildNarrativeCoreAndAnnexIndex(snapshot: RuntimeSnapshot): Content[] {
  return [
    sectionTitle("5 - Introdução"),
    {
      text:
        "Em 12 de março de 2020, a Portaria nº 6.730 da Secretaria Especial de Previdência e Trabalho publicou a atualização da NR-01, que estabelece as disposições gerais e as diretrizes para o Gerenciamento de Riscos Ocupacionais (GRO).\n\nPosteriormente, em 27 de agosto de 2024, a Portaria MTE nº 1.419 trouxe atualização do texto normativo, com reforço das medidas preventivas e integração com os demais programas de Segurança e Saúde no Trabalho (SST).\n\nO Programa de Gerenciamento de Riscos – PGR deve contemplar o inventário de riscos e o plano de ação, considerando os perigos, a avaliação dos riscos e a implementação de controles adequados.\n\n○ O PGR pode ser atendido por sistemas de gestão, desde que cumpram os requisitos legais.\n○ O PGR deve contemplar ou estar integrado com planos, programas e documentos de SST.\n○ Este documento serve de base para ações preventivas e para integração com o PCMSO.",
      style: "bodyParagraphLong",
    },
    { text: "", pageBreak: "after" },

    sectionTitle("6 - Objetivo"),
    {
      text:
        "Preservar a saúde e a integridade física dos trabalhadores, por meio da identificação de perigos, avaliação e classificação de riscos e definição de medidas de prevenção priorizadas.",
      style: "bodyParagraph",
    },
    sectionTitle("7 - Documento"),
    {
      text:
        "Este documento consolida o inventário de riscos ocupacionais e o plano de ação, sendo referência para monitoramento e revisão do programa durante a vigência.",
      style: "bodyParagraph",
    },
    sectionTitle("8 - Inventário de Riscos Ocupacionais"),
    { text: "Apresentado nos anexos dinâmicos por GHE.", style: "bodyParagraph" },
    sectionTitle("9 - Plano de Ação"),
    { text: "Apresentado no Anexo C com medidas, responsáveis e status.", style: "bodyParagraph" },
    sectionTitle("10 a 18 - Conteúdo Base do Template"),
    {
      text:
        "As seções 10 a 18 seguem o texto-base corporativo do template oficial, incluindo responsabilidades, abrangência, definições e recomendações gerais.",
      style: "bodyParagraph",
      margin: [0, 0, 0, 10],
    },
    sectionTitle("19 - Índice de Anexos"),
    {
      table: {
        widths: [65, "*", 110],
        body: [
          [tealHeaderCell("Anexo"), tealHeaderCell("Título"), tealHeaderCell("Data da Inclusão")],
          [bodyCell("A"), bodyCell("INVENTÁRIO DE RISCOS OCUPACIONAIS"), bodyCell(snapshot.meta.generatedDate)],
          [bodyCell("B"), bodyCell("DESCRIÇÃO DAS MEDIDAS DE PREVENÇÃO IMPLEMENTADAS"), bodyCell(snapshot.meta.generatedDate)],
          [bodyCell("C"), bodyCell("PLANO DE AÇÃO"), bodyCell(snapshot.meta.generatedDate)],
          [bodyCell("D"), bodyCell("ART – ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA"), bodyCell(snapshot.meta.generatedDate)],
        ],
      },
      layout: THIN_TABLE_LAYOUT,
    },
    { text: "", pageBreak: "after" },
  ];
}

function buildAnnexCover(letter: "A" | "B" | "C" | "D", title: string): Content[] {
  return [
    {
      stack: [
        { text: `ANEXO ${letter}:`, style: "annexCoverTitle", margin: [0, 165, 0, 6] },
        { text: title, style: "annexCoverSubtitle" },
      ],
      margin: [0, 0, 0, 0],
    },
    { text: "", pageBreak: "after" },
  ];
}

function buildAnnexAmbienteTable(ghe: RuntimeGhe, index: number): Content {
  const ambienteRows =
    ghe.funcoes.length > 0
      ? ghe.funcoes.slice(0, 6).map((funcao) => [bodyCell(funcao.setor), bodyCell(truncateText(ghe.ambiente || funcao.descricaoAtividades, 220))])
      : [[bodyCell("-"), bodyCell(truncateText(ghe.ambiente, 220))]];

  return {
    table: {
      headerRows: 0,
      widths: [130, "*"],
      body: [
        [{ text: `GHE ${index + 1} - Descrição do Ambiente`, style: "annexBarCell", colSpan: 2 }, {}],
        [{ text: "Descrição sucinta do processo produtivo do GHE", style: "annexLeftHeaderCell" }, bodyCell(truncateText(ghe.processo, 220))],
        [{ text: "Observações sobre o GHE", style: "annexLeftHeaderCell" }, bodyCell(truncateText(ghe.observacoes, 220))],
        [{ text: "Setor", style: "annexHeaderCell" }, { text: "Descrição do Ambiente de Trabalho", style: "annexHeaderCell" }],
        ...ambienteRows,
      ],
    },
    layout: ANNEX_TABLE_LAYOUT,
  };
}

function buildAnnexAtividadeTable(ghe: RuntimeGhe, index: number): Content {
  const rows =
    ghe.funcoes.length > 0
      ? ghe.funcoes.map((funcao) => [
          bodyCell(truncateText(funcao.setor, 55)),
          bodyCell(truncateText(funcao.funcao, 60)),
          bodyCell(truncateText(funcao.descricaoAtividades, 240)),
          bodyCell(truncateText(funcao.numeroFuncionarios, 20), "tableBodyCellCenter"),
        ])
      : [[bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-")]];

  return {
    table: {
      widths: [70, 90, "*", 95],
      body: [
        [{ text: `GHE ${index + 1} - Descrição de Atividade`, style: "annexBarCell", colSpan: 4 }, {}, {}, {}],
        [tealHeaderCell("Setor"), tealHeaderCell("Função"), tealHeaderCell("Descrição da Atividade"), tealHeaderCell("Total de Trabalhadores")],
        ...rows,
      ],
    },
    layout: ANNEX_TABLE_LAYOUT,
  };
}

function buildAnnexReconhecimentoTable(ghe: RuntimeGhe, index: number): Content {
  const rows =
    ghe.riscos.length > 0
      ? ghe.riscos.map((risk) => [
          bodyCell(truncateText(risk.tipoAgente, 24)),
          bodyCell(truncateText(risk.descricaoAgente, 38)),
          bodyCell(truncateText(risk.perigo, 32)),
          bodyCell(truncateText(risk.meioPropagacao, 30)),
          bodyCell(truncateText(risk.perigo, 36)),
          bodyCell(truncateText(risk.fontes, 42)),
          bodyCell(truncateText(risk.tipoAvaliacao, 25)),
          bodyCell(truncateText(risk.intensidade, 26)),
          bodyCell(""),
          bodyCell(""),
          bodyCell(truncateText(risk.severidade, 22)),
          bodyCell(truncateText(risk.probabilidade, 24)),
          bodyCell(truncateText(risk.classificacao, 24)),
        ])
      : [[bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-")]];

  return {
    table: {
      widths: [33, 38, 32, 36, 33, 40, 31, 36, 29, 28, 30, 33, 34],
      body: [
        [{ text: `GHE ${index + 1} - Reconhecimento dos Riscos Ocupacionais`, style: "annexBarCell", colSpan: 13 }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
        [
          { text: "Análise dos Perigos", style: "annexHeaderCell", colSpan: 6, alignment: "center" },
          {},
          {},
          {},
          {},
          {},
          { text: "Monitoramento das Exposições", style: "annexHeaderCell", colSpan: 4, alignment: "center" },
          {},
          {},
          {},
          { text: "Avaliação do Risco", style: "annexHeaderCell", colSpan: 3, alignment: "center" },
          {},
          {},
        ],
        [
          tealHeaderCell("Tipo de Agente"),
          tealHeaderCell("Descrição do Agente"),
          tealHeaderCell("Perigo"),
          tealHeaderCell("Meio de Propagação"),
          tealHeaderCell("Possíveis lesões e agravos à Saúde"),
          tealHeaderCell("Fontes ou Circunstâncias"),
          tealHeaderCell("Tipo de Avaliação"),
          tealHeaderCell("Intensidade/Concentração"),
          tealHeaderCell("Limite de Tolerância"),
          tealHeaderCell("Unidade de Medida"),
          tealHeaderCell("Severidade"),
          tealHeaderCell("Probabilidade"),
          tealHeaderCell("Classificação de Risco"),
        ],
        ...rows,
      ],
    },
    layout: ANNEX_TABLE_LAYOUT,
    fontSize: 7.2,
  };
}

function buildAnnexMeasuresTable(ghe: RuntimeGhe): Content {
  const rows =
    ghe.riscos.length > 0
      ? ghe.riscos.map((risk) => [
          bodyCell(ghe.nome),
          bodyCell(truncateText(risk.descricaoAgente || risk.perigo, 55)),
          bodyCell(truncateText(risk.medidasControle, 120)),
          bodyCell(truncateText(risk.epc.join("; "), 55)),
          bodyCell(truncateText(risk.epi.join("; "), 55)),
        ])
      : [[bodyCell(ghe.nome), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell("-")]];

  return {
    table: {
      widths: [72, 85, "*", 85, 85],
      body: [
        [{ text: "Medidas de Prevenção Implantadas", style: "annexBarCell", colSpan: 5 }, {}, {}, {}, {}],
        [
          tealHeaderCell("GHE"),
          tealHeaderCell("Descrição Agente de Risco"),
          tealHeaderCell("Descrição das Medidas de Controle Administrativas e/ou Engenharia"),
          tealHeaderCell("EPC"),
          tealHeaderCell("EPI"),
        ],
        ...rows,
      ],
    },
    layout: ANNEX_TABLE_LAYOUT,
  };
}

function buildAnnexPlanTable(ghe: RuntimeGhe, responsible: string): Content {
  const rows =
    ghe.planoItens.length > 0
      ? ghe.planoItens.map((item) => [
          bodyCell(ghe.nome),
          bodyCell(truncateText(item.risco, 65)),
          bodyCell(truncateText(item.classificacao, 24)),
          bodyCell(truncateText(item.medidas, 125)),
          bodyCell(truncateText(responsible, 55)),
          bodyCell("Pendente"),
        ])
      : [[bodyCell(ghe.nome), bodyCell("-"), bodyCell("-"), bodyCell("-"), bodyCell(truncateText(responsible, 55)), bodyCell("Pendente")]];

  return {
    table: {
      widths: [65, 95, 54, "*", 90, 70],
      body: [
        [{ text: "Plano de Ação", style: "annexBarCell", colSpan: 6 }, {}, {}, {}, {}, {}],
        [
          tealHeaderCell("GHE"),
          tealHeaderCell("Perigo/Fator de Risco"),
          tealHeaderCell("Prioridade"),
          tealHeaderCell("Medidas de Prevenção/Ação"),
          tealHeaderCell("Responsável"),
          tealHeaderCell("Status"),
        ],
        ...rows,
      ],
    },
    layout: ANNEX_TABLE_LAYOUT,
  };
}

function buildLandscapePage(content: Content, pageBreak: "before" | undefined): Content {
  return {
    pageOrientation: "landscape",
    pageBreak,
    margin: [0, 0, 0, 0],
    stack: [content],
  };
}

function buildAnnexContent(snapshot: RuntimeSnapshot): Content[] {
  const content: Content[] = [];

  content.push(...buildAnnexCover("A", "INVENTÁRIO DE RISCOS OCUPACIONAIS"));
  snapshot.ghes.forEach((ghe, index) => {
    const firstPageBreak = index === 0 ? undefined : "before";
    content.push(
      buildLandscapePage(buildAnnexAmbienteTable(ghe, index), firstPageBreak),
      buildLandscapePage(buildAnnexAtividadeTable(ghe, index), "before"),
      buildLandscapePage(buildAnnexReconhecimentoTable(ghe, index), "before"),
    );
  });

  content.push(
    { text: "", pageOrientation: "portrait", pageBreak: "before" },
    ...buildAnnexCover("B", "DESCRIÇÃO DAS MEDIDAS DE PREVENÇÃO IMPLEMENTADAS"),
  );
  snapshot.ghes.forEach((ghe, index) => {
    content.push(
      { text: "", pageBreak: index === 0 ? undefined : "before" },
      buildAnnexMeasuresTable(ghe),
    );
  });

  content.push({ text: "", pageBreak: "before" }, ...buildAnnexCover("C", "PLANO DE AÇÃO"));
  snapshot.ghes.forEach((ghe, index) => {
    content.push(
      { text: "", pageBreak: index === 0 ? undefined : "before" },
      buildAnnexPlanTable(ghe, snapshot.program.responsavelImplementacao),
    );
  });

  content.push({ text: "", pageBreak: "before" }, ...buildAnnexCover("D", "ART – ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA"));
  content.push({
    table: {
      widths: [85, "*", 90],
      body: [
        [tealHeaderCell("Anexo"), tealHeaderCell("Descrição"), tealHeaderCell("Status")],
        [
          bodyCell("ART"),
          bodyCell("Documento técnico de responsabilidade"),
          bodyCell(snapshot.annexes.hasArtAnexo ? "Incluído" : "Não incluído"),
        ],
      ],
    },
    layout: THIN_TABLE_LAYOUT,
  });

  return content;
}

function buildBackCoverPage(visualAssets: RuntimeVisualAssets): Content[] {
  const backCoverBackground = visualAssets.pageBackground || visualAssets.coverBackground;

  return [
    {
      text: "",
      pageOrientation: "portrait",
      pageBreak: "before",
      pageMargins: [0, 0, 0, 0],
    },
    backCoverBackground
      ? {
          image: backCoverBackground,
          width: 595.28,
          height: 841.89,
          absolutePosition: { x: 0, y: 0 },
        }
      : {
          canvas: [
            {
              type: "rect",
              x: 0,
              y: 0,
              w: 595.28,
              h: 841.89,
              color: "#F1F3F5",
            },
          ],
        },
    visualAssets.brandLogo
      ? {
          image: visualAssets.brandLogo,
          width: 170,
          absolutePosition: { x: (595.28 - 170) / 2, y: 330 },
        }
      : {
          text: "BR MED",
          style: "backCoverFallbackLogo",
          absolutePosition: { x: 0, y: 380 },
          width: 595.28,
          alignment: "center",
        },
    {
      text: "R. Beatriz Larragoiti Lucas, 121 - 5º andar\nCidade Nova, Rio de Janeiro - RJ, 20211-175\n+55 21 3175 0014",
      style: "backCoverAddress",
      alignment: "center",
      absolutePosition: { x: 0, y: 742 },
      width: 595.28,
    },
  ];
}

function buildStyles(): StyleDictionary {
  return {
    coverProgramName: {
      font: "WorkSansLight",
      color: COLORS.textStrong,
      fontSize: 30,
      lineHeight: 1.25,
    },
    coverMainTitle: {
      font: "WorkSansSemiBold",
      color: COLORS.textStrong,
      fontSize: 30,
    },
    coverSubtitle: {
      font: "WorkSansLight",
      color: COLORS.textStrong,
      fontSize: 18,
      lineHeight: 1.3,
    },
    coverMetaLabel: {
      font: "WorkSansLight",
      color: COLORS.textStrong,
      fontSize: 14,
    },
    coverMetaValue: {
      font: "WorkSansSemiBold",
      color: COLORS.textStrong,
      fontSize: 14,
    },
    sectionTitle: {
      font: "WorkSansMedium",
      color: COLORS.teal,
      fontSize: 20,
    },
    bodyParagraph: {
      font: "WorkSansLight",
      color: COLORS.text,
      fontSize: 12,
      lineHeight: 1.55,
    },
    bodyParagraphLong: {
      font: "WorkSansLight",
      color: COLORS.text,
      fontSize: 12,
      lineHeight: 1.55,
    },
    tocLine: {
      font: "WorkSansMedium",
      color: COLORS.textStrong,
      fontSize: 11,
      lineHeight: 1.35,
    },
    infoLabelCell: {
      font: "WorkSansLight",
      color: "#5A7082",
      fontSize: 10.5,
    },
    tableBodyCell: {
      font: "WorkSansLight",
      color: COLORS.text,
      fontSize: 10,
    },
    tableBodyCellCenter: {
      font: "WorkSansLight",
      color: COLORS.text,
      fontSize: 10,
      alignment: "center",
    },
    tealHeaderCell: {
      font: "WorkSansMedium",
      color: COLORS.white,
      fillColor: COLORS.teal,
      fontSize: 10,
      alignment: "center",
    },
    annexBarCell: {
      font: "WorkSansMedium",
      color: COLORS.white,
      fillColor: COLORS.tealDark,
      fontSize: 9.6,
      alignment: "center",
    },
    annexHeaderCell: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: COLORS.teal,
      fontSize: 9.3,
      alignment: "center",
    },
    annexLeftHeaderCell: {
      font: "WorkSansLight",
      color: COLORS.white,
      fillColor: COLORS.teal,
      fontSize: 9.3,
      alignment: "left",
    },
    annexCoverTitle: {
      font: "WorkSansMedium",
      color: COLORS.teal,
      fontSize: 52,
    },
    annexCoverSubtitle: {
      font: "WorkSansLight",
      color: COLORS.teal,
      fontSize: 56,
      lineHeight: 1.15,
    },
    headerLeftCell: {
      font: "WorkSansLight",
      color: COLORS.textStrong,
      fontSize: 9.2,
    },
    headerRightCell: {
      font: "WorkSansLight",
      color: COLORS.textStrong,
      fontSize: 9.2,
      alignment: "left",
    },
    headerLabelRun: {
      font: "WorkSansMedium",
      color: COLORS.textStrong,
      fontSize: 9.2,
    },
    headerValueRun: {
      font: "WorkSansLight",
      color: COLORS.textStrong,
      fontSize: 9.2,
    },
    footerPageNumber: {
      font: "WorkSansMedium",
      color: COLORS.textStrong,
      fontSize: 10,
    },
    backCoverAddress: {
      font: "WorkSansLight",
      color: "#6E8090",
      fontSize: 11.5,
      lineHeight: 1.25,
    },
    backCoverFallbackLogo: {
      font: "WorkSansSemiBold",
      color: COLORS.textStrong,
      fontSize: 28,
    },
  };
}

export function buildRuntimeDocDefinition(
  snapshot: RuntimeSnapshot,
  visualAssets: RuntimeVisualAssets = {},
): any {
  const content: Content[] = [
    ...buildCoverPage(snapshot),
    ...buildUpdatePage(snapshot),
    ...buildSummaryPage(),
    ...buildIdentificationAndProgramPages(snapshot),
    ...buildNarrativeCoreAndAnnexIndex(snapshot),
    ...buildAnnexContent(snapshot),
    ...buildBackCoverPage(visualAssets),
  ];

  return {
    info: {
      title: `PGR ${snapshot.company.name}`,
      author: "Sistema PGR",
      subject: "Programa de Gerenciamento de Riscos",
      creator: "PGR Frontend",
      producer: "pdfmake runtime engine",
      keywords: `PGR, ${snapshot.meta.pgrId}`,
    },
    pageSize: "A4",
    pageMargins: [40, 86, 40, 36],
    defaultStyle: {
      font: "WorkSansLight",
      fontSize: 10,
      color: COLORS.text,
      lineHeight: 1.3,
    },
    background: (currentPage: number, pageSize: { width: number; height: number }) => {
      if (currentPage !== 1 || !visualAssets.coverBackground) return null;

      return [
        {
          canvas: [
            {
              type: "rect",
              x: 0,
              y: 0,
              w: pageSize.width,
              h: pageSize.height,
              color: "#F1F3F5",
            },
          ],
        },
        {
          image: visualAssets.coverBackground,
          width: pageSize.width,
          height: pageSize.height,
          absolutePosition: { x: 0, y: 0 },
        },
      ];
    },
    header: (currentPage: number, pageCount: number) => {
      if (currentPage === 1 || currentPage === pageCount) return null;

      return {
        margin: [40, 46, 40, 0],
        table: {
          widths: ["67%", "33%"],
          body: [
            [
              {
                text: [
                  { text: "Empresa: ", style: "headerLabelRun" },
                  { text: snapshot.company.name, style: "headerValueRun" },
                ],
                style: "headerLeftCell",
              },
              { text: `ANL: ${snapshot.meta.anl || "01"}`, style: "headerRightCell" },
            ],
            [
              {
                text: [
                  { text: "Estabelecimento: ", style: "headerLabelRun" },
                  { text: snapshot.establishment.name, style: "headerValueRun" },
                ],
                style: "headerLeftCell",
              },
              { text: "", style: "headerRightCell" },
            ],
          ],
        },
        layout: HEADER_TABLE_LAYOUT,
      };
    },
    footer: (currentPage: number, pageCount: number) => {
      if (currentPage === 1 || currentPage === pageCount) return null;

      return {
        margin: [40, 0, 40, 22],
        columns: [
          { width: "*", text: "" },
          visualAssets.brandLogo
            ? {
                image: visualAssets.brandLogo,
                width: 110,
                alignment: "center",
                relativePosition: { x: 0, y: -12 },
              }
            : {
                width: "auto",
                text: "BR MED",
                style: "footerPageNumber",
                alignment: "center",
                relativePosition: { x: 0, y: -12 },
              },
          {
            width: "*",
            text: String(currentPage),
            style: "footerPageNumber",
            alignment: "right",
            relativePosition: { x: 0, y: -10 },
          },
        ],
      };
    },
    styles: buildStyles(),
    content,
  };
}
