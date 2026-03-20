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
    expect(payload.planoAcao.itens[0]?.risco).toBe("Ruido");
    expect(payload.anexos.totalArquivos).toBe(1);
    expect(payload.anexos.diretriz).toBe("Diretriz custom");
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
    expect(payload.anexos.totalArquivos).toBe(0);
    expect(payload.anexos.diretriz).toBe("Diretriz 1");
  });
});
