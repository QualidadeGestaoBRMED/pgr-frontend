# Mapeamento de Template - PGR Runtime (pdfmake)

## Fonte de dados
Payload consolidado gerado em:
- `src/app/pgr/[id]/[etapa]/utils/docx-payload.ts`

Endpoint atual de geração:
- `POST /api/pgr/generate-pdf`
- arquivo: `src/pages/api/pgr/generate-pdf.ts`
- engine: `runtime-pdfmake-v1`

Pipeline runtime:
- normalização: `src/lib/pgr-pdf-runtime/snapshot.ts`
- documento: `src/lib/pgr-pdf-runtime/document.ts`
- fontes do template: `src/lib/pgr-pdf-runtime/fonts.ts`

## Capa e Cabeçalho
- `Nome da Empresa` <- `inicio.companyName` (fallback `dadosCadastrais.empresaNome` / `empresaRazaoSocial`)
- `Estabelecimento` <- `dadosCadastrais.estabelecimentoNome` (fallback `inicio.unitName`)
- `Vigência` <- `planoAcao.vigencia` (fallback `meta.generatedAt`)
- `ANL` <- regra de negócio (sem histórico = `01`)

## Quadro de Atualizações
- `Motivo da Revisão do PGR` <- `historico.changes[last].reason` (fallback `analysis` / `Elaboração inicial`)
- `Data` <- `meta.generatedAt` (formato data)

## 1 - Identificação da Empresa (Tabela)
- `Razão Social` <- `dadosCadastrais.empresaRazaoSocial`
- `CNPJ` <- `dadosCadastrais.empresaCnpj`
- `CNAE` <- `dadosCadastrais.empresaCnae`
- `Atividade Principal` <- `dadosCadastrais.empresaAtividadePrincipal`
- `Grau de Risco (Quadro I da NR-04)` <- `dadosCadastrais.empresaGrauRisco`
- `Endereço` <- concat de `empresaEndereco`, `empresaCidade`, `empresaEstado`, `empresaCep`

## 2 - Identificação do Estabelecimento (Tabela)
- `Estabelecimento` <- `dadosCadastrais.estabelecimentoNome`
- `CNPJ` <- `dadosCadastrais.estabelecimentoCnpj`
- `CNAE` <- `dadosCadastrais.estabelecimentoCnae`
- `Atividade Principal` <- `dadosCadastrais.estabelecimentoAtividadePrincipal`
- `Grau de Risco (Quadro I da NR-04)` <- `dadosCadastrais.estabelecimentoGrauRisco`

## 3 - Quantitativo Total de Empregados
- `Quantitativo de empregados ativos` <- soma de `descricao.ghes[].funcoes[].numeroFuncionarios`

## 4 - Dados do Programa
- `Norma Regulamentadora` <- `planoAcao.nr` (fallback `NR-01`)
- `Data de Elaboração do Documento` <- `meta.generatedAt`
- `Responsável pela Elaboração do PGR` <- `dadosCadastrais.responsavelPgrNome` (fallback `inicio.responsible`)
- `Responsável pela Coordenação Técnica` <- mesmo responsável acima
- `Responsável pela Implementação do PGR da organização` <- mesmo responsável acima

## Assinaturas
- Nome da coordenação técnica <- responsável
- Nome da implementação <- responsável
- `CREA/RJ` <- placeholder `A DEFINIR`

## Anexo A/B/C por GHE (runtime)

### Ambiente (por GHE)
- Título da tabela <- `descricao.ghes[n].nome`
- `Descrição sucinta do processo produtivo do GHE` <- `descricao.ghes[n].processo`
- `Observações sobre o GHE` <- `descricao.ghes[n].observacoes`
- `Condições ambientais do local de trabalho` <- `descricao.ghes[n].ambiente`

### Atividades (por GHE)
- Linhas dinâmicas <- `descricao.ghes[n].funcoes[]`
- Colunas: `Setor`, `Função`, `Descrição da Atividade`, `Total de Trabalhadores`

### Reconhecimento (por GHE)
- Linhas dinâmicas <- `caracterizacao.ghes[n].riscos[]` (matching por `id` e fallback por `nome`)
- Mapeamento de colunas:
  - `Tipo de Agente` <- `tipoAgente`
  - `Descrição do Agente` <- `descricaoAgente`
  - `Perigo` <- `perigo`
  - `Meio de Propagação` <- `meioPropagacao`
  - `Possíveis lesões e agravos à Saúde` <- sem origem atual (em branco)
  - `Fontes ou Circunstâncias` <- `fontes`
  - `Tipo de Avaliação` <- `tipoAvaliacao`
  - `Intensidade/Concentração` <- `intensidade`
  - `Limite de Tolerância` <- sem origem atual (em branco)
  - `Unidade de Medida` <- sem origem atual (em branco)
  - `Severidade` <- `severidade`
  - `Probabilidade` <- `probabilidade`
  - `Classificação de Risco` <- `classificacao`

## Medidas de Prevenção (por GHE)
- Linhas dinâmicas <- `caracterizacao.ghes[n].riscos[]`
- Colunas:
  - `GHE` <- nome do GHE
  - `Descrição Agente de Risco` <- `descricaoAgente` (fallback `perigo`)
  - `Descrição das Medidas de Controle Administrativas e/ou Engenharia` <- `medidasControle`
  - `EPC` <- `epc[]` join `; `
  - `EPI` <- `epi[]` join `; `
  - `C.A` <- extraído de `EPI` quando existir padrão `CA ####`

## Plano de Ação (por GHE)
- Linhas dinâmicas <- `planoAcao.itens[]` agrupadas por GHE
- Colunas:
  - `GHE` <- `ghe`
  - `Perigo ou Fator de Risco Ocupacional` <- `risco`
  - `Prioridade` <- `classificacao`
  - `Medidas de Prevenção/Ação` <- `medidas`
  - `Responsável pela Ação` <- responsável do PGR
  - `Acompanhamentos das Medidas de Prevenção` <- texto padrão
  - `Status` <- `Pendente` (padrão)

## Campos com gap de origem (precisam vir das steps/backend)
- Possíveis lesões e agravos à Saúde
- Limite de Tolerância
- Unidade de Medida
- C.A
- Responsável pela ação por item
- Acompanhamento e status reais por item

## Observação
O runtime não faz merge de DOCX. O template DOCX continua como referência visual e fonte tipográfica (Work Sans) para manter aderência ao layout real.
