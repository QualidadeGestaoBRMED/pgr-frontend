import { describe, expect, it } from "vitest";

import { buildPgrDocxPayloadFromBackendState } from "./docx-payload";

describe("docx payload mapping", () => {
  it("maps legacy backend nested shape to frontend docx payload", () => {
    const payload = buildPgrDocxPayloadFromBackendState({
      pgrId: "1309722312",
      generatedAt: "2026-03-19T12:00:00Z",
      totalSteps: 8,
      backendState: {
        completedSteps: "4",
        stepStatusById: { inicio: true, dados: true },
        inicio: {
          documentTitle: "PGR",
          companyName: "Empresa X",
          cnpj: "12.345.678/0001-90",
          responsible: "Pedro",
          email: "pedro@empresa.com",
        },
        descricao: {
          ghes: [
            {
              id: "g-1",
              nome: "GHE 1",
              processo: "Soldagem",
              observacoes: "Obs",
              ambiente: "Area externa",
              funcoes: [
                {
                  setor: "Operacao",
                  funcao: "Soldador",
                  descricaoAtividades: "Soldar tubos",
                  numeroFuncionarios: 5,
                },
              ],
            },
          ],
        },
        caracterizacao: {
          ghes: [
            {
              id: "g-1",
              nome: "GHE 1",
              riscos: [
                {
                  id: "r-1",
                  tipoAgente: "Fisico",
                  descricaoAgente: "Ruido",
                  perigo: "Exposicao",
                  meioPropagacao: "Ar",
                  fontes: "Maquina",
                  tipoAvaliacao: "Quantitativa",
                  intensidade: "85 dB",
                  severidade: "Alta",
                  probabilidade: "Media",
                  classificacao: "Significativo",
                  medidasControle: "Isolamento",
                  epc: ["Barreira"],
                  epi: ["Protetor"],
                },
              ],
            },
          ],
        },
        planoAcao: {
          nr: "NR-01",
          vigencia: "2026",
        },
        anexos: {
          diretriz: "Diretriz custom",
          itens: [
            {
              id: "a-1",
              titulo: "ART",
              arquivos: [{ id: "f-1", nome: "arquivo.pdf", url: "http://file.local/1.pdf" }],
            },
          ],
        },
      },
    });

    expect(payload.meta.pgrId).toBe("1309722312");
    expect(payload.meta.completedSteps).toBe(4);
    expect(payload.descricao.gheCount).toBe(1);
    expect(payload.caracterizacao.riskCount).toBe(1);
    expect(payload.planoAcao.nr).toBe("NR-01");
    expect(payload.program.nr).toBe("NR-01");
    expect(payload.program.totalEmployees).toBe(5);
    expect(payload.program.responsavelElaboracao).toBe("Pedro");
    expect(payload.planoAcao.itens[0]?.risco).toBe("Ruido");
    expect(payload.planoAcao.itens[0]?.medida).toBe("");
    expect(payload.anexos.totalArquivos).toBe(1);
    expect(payload.anexos.diretriz).toBe("Diretriz custom");
  });

  it("uses plan-specific prevention measures without changing inventory measures", () => {
    const payload = buildPgrDocxPayloadFromBackendState({
      pgrId: "1309722312",
      generatedAt: "2026-03-19T12:00:00Z",
      totalSteps: 8,
      backendState: {
        caracterizacao: {
          ghes: [
            {
              id: "g-1",
              nome: "GHE 1",
              riscos: [
                {
                  id: "r-1",
                  descricaoAgente: "Ruido",
                  tipoAgente: "Fisico",
                  meioPropagacao: "Ar",
                  fontes: "Maquina",
                  tipoAvaliacao: "Quantitativa",
                  intensidade: "85 dB",
                  severidade: "Alta",
                  probabilidade: "Media",
                  classificacao: "Significativo",
                  medidasControle: "A ser evidenciado na fase de reconhecimento.",
                  medidasPrevencaoPlano: "Implementar enclausuramento acústico.",
                  epc: [],
                  epi: [],
                },
              ],
            },
          ],
        },
      },
    });

    expect(payload.caracterizacao.ghes[0]?.riscos[0]?.medidasControle).toBe(
      "A ser evidenciado na fase de reconhecimento."
    );
    expect(payload.planoAcao.itens[0]?.medidas).toBe(
      "Implementar enclausuramento acústico."
    );
    expect(payload.planoAcao.itens[0]?.medida).toBe(
      "Implementar enclausuramento acústico."
    );
  });

  it("does not fall back to inventory control measures for action plan items", () => {
    const payload = buildPgrDocxPayloadFromBackendState({
      pgrId: "1309722312",
      generatedAt: "2026-03-19T12:00:00Z",
      totalSteps: 8,
      backendState: {
        caracterizacao: {
          ghes: [
            {
              id: "g-1",
              nome: "GHE 1",
              riscos: [
                {
                  id: "r-1",
                  descricaoAgente: "Ruido",
                  tipoAgente: "Fisico",
                  meioPropagacao: "Ar",
                  fontes: "Maquina",
                  tipoAvaliacao: "Quantitativa",
                  intensidade: "85 dB",
                  severidade: "Alta",
                  probabilidade: "Media",
                  classificacao: "Significativo",
                  medidasControle: "A ser evidenciado na fase de reconhecimento.",
                  epc: [],
                  epi: [],
                },
              ],
            },
          ],
        },
      },
    });

    expect(payload.planoAcao.itens[0]?.medidas).toBe("");
    expect(payload.planoAcao.itens[0]?.medida).toBe("");
  });

  it("keeps target GHE label for independent general plan actions", () => {
    const payload = buildPgrDocxPayloadFromBackendState({
      pgrId: "1309722312",
      generatedAt: "2026-03-19T12:00:00Z",
      totalSteps: 8,
      backendState: {
        planGeneralMeasures: [
          {
            id: "plan-action-1",
            nr: "NR-01",
            descricao: "Implantar ventilacao local exaustora",
            gheName: "GHE 2",
            targetGheIds: ["g-2"],
          },
        ],
      },
    });

    expect(payload.planoAcao.itens[0]?.ghe).toBe("GHE 2");
    expect(payload.planoAcao.itens[0]?.risco).toBe("Medidas Gerais");
    expect(payload.planoAcao.itens[0]?.medida).toBe(
      "Implantar ventilacao local exaustora"
    );
  });

  it("uses effective plan table rows for grouped plan export", () => {
    const payload = buildPgrDocxPayloadFromBackendState({
      pgrId: "1309722312",
      generatedAt: "2026-03-19T12:00:00Z",
      totalSteps: 8,
      backendState: {
        planTableRows: [
          {
            id: "plan-grouped-ghe-2-risk-calor-2",
            gheId: "__group__",
            riskId: "__group__",
            gheName: "GHE 2, 3",
            tipoAgente: "Físico",
            descricaoAgente: "Calor",
            prioridade: "Prioridade Média",
            classificacao: "Risco Alto",
            exposureValue: 2,
            medidasPrevencao: "Monitorar IBUTG e pausas térmicas",
            tipoMedida: "Administrativa",
            prazoAcao: "2026-12-07",
            responsavelAcao: "Segurança do Trabalho",
            acompanhamento: "Mensal",
            afericaoResultado: "Relatório de acompanhamento",
            groupTargets: [
              { gheId: "ghe-2", riskId: "risk-calor-2" },
              { gheId: "ghe-3", riskId: "risk-calor-3" },
            ],
          },
        ],
        caracterizacao: {
          ghes: [
            {
              id: "ghe-2",
              nome: "GHE 2",
              riscos: [
                {
                  id: "risk-calor-2",
                  descricaoAgente: "Calor",
                  tipoAgente: "Físico",
                  meioPropagacao: "Ar",
                  fontes: "Ambiente externo",
                  tipoAvaliacao: "Qualitativa",
                  intensidade: "N/A",
                  severidade: "Alta",
                  probabilidade: "Alta",
                  classificacao: "Risco Alto",
                  medidasControle: "Controle de inventário",
                  medidasPrevencaoPlano: "Monitorar IBUTG e pausas térmicas",
                  epc: "",
                  epi: "",
                },
              ],
            },
          ],
        },
      },
    });

    expect(payload.planoAcao.itens).toHaveLength(1);
    expect(payload.planoAcao.itens[0]?.ghe).toBe("GHE 2, 3");
    expect(payload.planoAcao.itens[0]?.risco).toBe("Calor");
    expect(payload.planoAcao.itens[0]?.prioridade).toBe("Média");
    expect(payload.planoAcao.itens[0]?.classificacao).toBe("Risco Alto");
  });

  it("falls back to defaults when backend state is invalid", () => {
    const payload = buildPgrDocxPayloadFromBackendState({
      pgrId: "1",
      generatedAt: "2026-03-19T12:00:00Z",
      totalSteps: 8,
      backendState: null,
    });

    expect(payload.meta.completedSteps).toBe(0);
    expect(payload.inicio.documentTitle).toBe("Programa de Gerenciamento de Riscos - PGR");
    expect(payload.dadosCadastrais.empresaRazaoSocial).toBe("");
    expect(payload.historico.title).toBe("Histórico de Versões");
    expect(payload.descricao.gheCount).toBe(0);
    expect(payload.caracterizacao.riskCount).toBe(0);
    expect(payload.program.totalEmployees).toBe(0);
    expect(payload.anexos.totalArquivos).toBe(0);
    expect(payload.anexos.diretriz).toBe("Diretriz 1");
  });

  it("adds merged address fields to the json payload", () => {
    const payload = buildPgrDocxPayloadFromBackendState({
      pgrId: "10",
      generatedAt: "2026-03-19T12:00:00Z",
      totalSteps: 8,
      backendState: {
        dadosCadastrais: {
          empresaEndereco: "Rua A, Centro",
          empresaNumero: "100",
          empresaBairro: "Centro",
          empresaCidade: "São Paulo",
          empresaEstado: "SP",
          empresaCep: "01001-000",
          estabelecimentoEndereco: "Av. B, Cambuí",
          estabelecimentoNumero: "200",
          estabelecimentoBairro: "Cambuí",
          estabelecimentoCidade: "Campinas",
          estabelecimentoEstado: "SP",
          estabelecimentoCep: "13010-000",
          contratanteNumero: "300",
          contratantes: [
            {
              id: "contratante-1",
              nomeFantasia: "Cliente",
              razaoSocial: "Cliente Ltda",
              cnpj: "12.345.678/0001-99",
              cnae: "6201-5/01",
              endereco: "Rua C, Centro",
              bairro: "Centro",
              cidade: "Santos",
              estado: "SP",
              cep: "11010-000",
              grauRisco: "2",
              atividadePrincipal: "Serviços",
              camposAdicionais: [],
            },
          ],
        },
      },
    });

    expect(payload.dadosCadastrais.empresaEnderecoCompleto).toBe(
      "Rua A, 100, Centro, São Paulo/SP, CEP: 01001-000"
    );
    expect(payload.dadosCadastrais.estabelecimentoEnderecoCompleto).toBe(
      "Av. B, 200, Cambuí, Campinas/SP, CEP: 13010-000"
    );
    expect(payload.dadosCadastrais.contratantes[0]?.enderecoCompleto).toBe(
      "Rua C, 300, Centro, Santos/SP, CEP: 11010-000"
    );
  });

  it("mirrors duplicated GHE risk structure in the json payload", () => {
    const payload = buildPgrDocxPayloadFromBackendState({
      pgrId: "10",
      generatedAt: "2026-03-19T12:00:00Z",
      totalSteps: 8,
      backendState: {
        riskGheGroups: [
          {
            id: "ghe-1",
            name: "GHE 1",
            risks: [
              {
                id: "risk-1",
                tipoAgente: "Fisico",
                descricaoAgente: "Ruido",
                meioPropagacao: "Ar",
                fontes: "Maquina",
                unidadeMedida: "dB(A)",
                valorMedido: "85",
                tipoAvaliacao: "Quantitativa",
                intensidade: "85",
                nivelAcao: "80",
                severidade: "4",
                probabilidade: "2",
                classificacao: "Moderado",
                medidasControle: "Protetor auditivo",
                epc: "",
                epi: "Protetor",
              },
            ],
          },
          {
            id: "ghe-2",
            name: "GHE 2",
            risks: [
              {
                id: "risk-2",
                tipoAgente: "Fisico",
                descricaoAgente: "Ruido",
                meioPropagacao: "Ar",
                fontes: "Maquina",
                unidadeMedida: "dB(A)",
                valorMedido: "85",
                tipoAvaliacao: "Quantitativa",
                intensidade: "85",
                nivelAcao: "80",
                severidade: "4",
                probabilidade: "2",
                classificacao: "Moderado",
                medidasControle: "Protetor auditivo",
                epc: "",
                epi: "Protetor",
              },
            ],
          },
        ],
      },
    });

    expect(payload.caracterizacao.ghes[0]?.estruturaDuplicada).toBe(true);
    expect(payload.caracterizacao.ghes[0]?.estruturaDuplicadaCom).toEqual(["GHE 2"]);
    expect(payload.caracterizacao.ghes[1]?.estruturaDuplicada).toBe(true);
    expect(payload.caracterizacao.ghes[1]?.estruturaDuplicadaCom).toEqual(["GHE 1"]);
  });
});
