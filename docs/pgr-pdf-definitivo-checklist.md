# Checklist Definitivo - Motor de PDF PGR

## 1) Sistema
- [ ] O endpoint de geração lê **somente** o estado persistido no backend (`/api/frontend/pgr/{id}/state`).
- [ ] O front dispara persistência imediata antes da geração.
- [ ] O endpoint de geração é idempotente para o mesmo snapshot de estado.
- [ ] O artefato gerado inclui metadados mínimos: `pgrId`, `generatedAt`, `templateVersion`, `engineVersion`.
- [ ] A resposta de geração retorna PDF válido (`application/pdf`) e nome de arquivo consistente.

## 2) Engine
- [ ] O PDF é montado em tempo de execução por biblioteca dedicada (sem merge em DOCX).
- [ ] Fontes do template são carregadas explicitamente na engine.
- [ ] Quebras de página são controladas por seção (evitar cortes de cabeçalho de tabela).
- [ ] Tabelas multipágina funcionam com dados de 10, 50 e 100 páginas.
- [ ] Conteúdos longos possuem regra explícita de quebra/truncamento.

## 3) Contrato de Dados
- [ ] Existe normalização única do payload (`snapshot`).
- [ ] `ANL` segue regra de negócio: sem histórico = `01`.
- [ ] Campos obrigatórios possuem `default` rastreável.
- [ ] O mapeamento campo destino <- origem JSON está documentado.
- [ ] O snapshot é versionado (`schemaVersion`).

## 4) Seções
- [ ] Seções 1-5 preenchidas integralmente.
- [ ] Seções 5-18 renderizadas como base estável (sem regressão visual).
- [ ] Seção 19+ renderizada por GHE (não consolidada de forma ilegível).
- [ ] Índice de anexos marca data somente quando houver conteúdo real.
- [ ] EPC / EPI / C.A com separação correta de coluna.

## 5) Operação
- [ ] Existe checklist de regressão visual.
- [ ] Existe fallback de erro com mensagem acionável.
- [ ] Tempo de geração medido e registrado.
- [ ] Logs de geração sem expor dados sensíveis.
