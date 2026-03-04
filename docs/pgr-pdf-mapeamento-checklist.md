# Checklist de Mapeamento - JSON -> PDF

## Entrada
- [ ] `meta.pgrId`
- [ ] `meta.generatedAt`
- [ ] `inicio`
- [ ] `dadosCadastrais`
- [ ] `historico`
- [ ] `descricao.ghes[]`
- [ ] `caracterizacao.ghes[]`
- [ ] `planoAcao.itens[]`
- [ ] `anexos.itens[]`

## Cabeçalho e Identificação
- [ ] Capa: nome da empresa
- [ ] Capa: estabelecimento
- [ ] Capa: vigência
- [ ] Cabeçalho de anexos: empresa
- [ ] Cabeçalho de anexos: ANL
- [ ] Cabeçalho de anexos: estabelecimento

## Tabelas 1-5
- [ ] Quadro de revisões (motivo/data)
- [ ] Identificação da empresa (razão social, CNPJ, CNAE, atividade, grau, endereço)
- [ ] Identificação do estabelecimento (nome, CNPJ, CNAE, atividade, grau)
- [ ] Quantitativo total de empregados
- [ ] Dados do programa (NR, data, elaboração, coordenação, implementação)

## Índice de Anexos
- [ ] Inventário com data quando existir
- [ ] Medidas com data quando existir
- [ ] Plano com data quando existir
- [ ] ART com data quando existir

## Bloco 19+ por GHE
- [ ] Ambiente: processo, observações, ambiente
- [ ] Atividades: setor, função, descrição, total trabalhadores
- [ ] Reconhecimento: 13 colunas completas
- [ ] Medidas: GHE, agente, medidas, EPC, EPI, C.A
- [ ] Plano: perigo/fator, prioridade, medidas, responsável, acompanhamento, status

## Regras
- [ ] `ANL`: sem histórico => `01`
- [ ] Se houver histórico, ANL incrementa corretamente
- [ ] Matching de GHE por `id` e fallback por `nome`
- [ ] Campos longos com política de truncamento/quebra
- [ ] Valores vazios com placeholder consistente
