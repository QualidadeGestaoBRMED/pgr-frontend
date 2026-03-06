export type FixedRuntimeTable = {
  rows: string[][];
  cols: number;
};

export const SECTION_14_TABLES: FixedRuntimeTable[] = [
  {
    cols: 4,
    rows: [
      ["Nº", "Nível", "Magnitude das Possíveis Consequências das Lesões", "Magnitude dos Possíveis Agravos à Saúde"],
      ["1", "Leve", "Lesões superficiais com poucos cuidados médicos e recuperação rápida.", "Agravos à saúde reversíveis pouco preocupantes, exigindo no máximo tratamento de primeiros socorros."],
      ["2", "Baixo", "Lesões moderadas que requerem atendimento especializado, mas que não são consideradas de ameaça à vida e não exigem internação.", "Agravos à saúde reversíveis preocupantes que normalmente resultam em tratamento médico."],
      ["3", "Moderado", "Lesões reversíveis que requerem tratamento e geram incapacidade temporária.", "Agravos à saúde irreversíveis que normalmente resultam em uma doença com perda de tempo, mas não incapacitantes."],
      ["4", "Alto", "Fatalidade e/ou lesão irreversível grave ou ocorrência de acidente ampliado que pode gerar lesões reversíveis graves.", "Agravos à saúde que geram fatalidade ou efeitos irreversíveis para a saúde e incapacitantes."],
      ["5", "Catastrófico", "Ocorrência de acidente ampliado que gera fatalidades ou lesões irreversíveis.", "Agravos à saúde que geram múltiplas fatalidades ou doenças incapacitantes graves para várias pessoas."],
    ],
  },
  {
    cols: 3,
    rows: [
      ["Nº", "Nível", "Acidentes ou Mecânicos"],
      ["1", "Improvável", "Ocorrências nunca foram registradas ou as medidas de prevenção existentes representam a melhor tecnologia ou prática disponível."],
      ["2", "Remoto", "Ocorrências similares já foram registradas no ramo de atividade da empresa ou as medidas de prevenção seguem as normas legais e são mantidas adequadamente."],
      ["3", "Possível", "Ocorrências similares já foram registradas na empresa ou as medidas de prevenção são adequadas, mas com pequenas deficiências na operação ou manutenção."],
      ["4", "Provável", "Uma ocorrência registrada na empresa nos últimos 12 meses ou as medidas de prevenção são incompletas e/ou com deficiências relevantes."],
      ["5", "Muito Provável", "Mais de uma ocorrência registrada na empresa nos últimos 12 meses ou as medidas de prevenção são inexistentes ou totalmente inadequadas."],
    ],
  },
  {
    cols: 3,
    rows: [
      ["Nº", "Nível", "Fatores Ergonômicos"],
      ["1", "Improvável", "É natural do corpo humano o tipo de movimento, postura ou exigência psicofisiológica ou avaliações ergonômicas indicam inexistência de risco."],
      ["2", "Remoto", "Existe uma exigência ergonômica, além de uma ação técnica normal, porém há baixa probabilidade de distúrbio ou lesão devido às circunstâncias, geralmente pela existência de algum mecanismo de regulação ou avaliações ergonômicas que indicam que as medidas preventivas existentes controlam o risco."],
      ["3", "Possível", "Situações consideradas como causadoras de desconforto, dificuldade, fadiga e distúrbios ou avaliações ergonômicas indicam existência de risco com necessidade de aprimoramento de medidas preventivas."],
      ["4", "Provável", "Situações consideradas como potencialmente causadoras de lesões ou avaliações ergonômicas indicam a existência de risco não controlado e com necessidade de introdução de medidas preventivas."],
      ["5", "Muito Provável", "Situações consideradas potencialmente causadoras de lesões graves ou avaliações ergonômicas indicam existência de alto risco com necessidade imediata de introdução de medidas preventivas para redução do nível de risco."],
    ],
  },
  {
    cols: 3,
    rows: [
      ["Nº", "Nível", "Agentes Físicos - Situações Não Quantificadas"],
      ["1", "Improvável", "Em condições normais de trabalho, o contato dos trabalhadores com o agente é inexistente ou improvável. Não há incremento da exposição devido ao ambiente de trabalho. A exposição no ambiente de trabalho é praticamente a mesma do ambiente externo. As medidas de prevenção existentes representam a melhor tecnologia ou prática disponível."],
      ["2", "Remoto", "Em condições normais de trabalho, o contato dos trabalhadores com o agente é esporádico, por curto espaço de tempo. É típico para aqueles que não mantêm contato com as fontes de emissão, mas que podem acessar locais com a presença do agente por breves períodos ou em caso de exposições rotineiras existem medidas de prevenção eficazes de ordem coletiva ou de engenharia que seguem as normas legais e são mantidas adequadamente. O agente e/ou as condições de trabalho podem representar apenas um aspecto de desconforto e não de risco."],
      ["3", "Possível", "Em condições normais de trabalho, o contato dos trabalhadores com o agente é diário ou na maior parte da semana. As medidas de prevenção seguem as normas legais e são mantidas adequadamente, mas estão focadas apenas em medidas de proteção individuais ou administrativas. Podem existir medidas de prevenção de ordem coletiva ou de engenharia, porém sem evidências de manutenção ou com pequenas deficiências na operação."],
      ["4", "Provável", "Em condições normais de trabalho, o contato dos trabalhadores com o agente é diário em proximidade ou em contato com as fontes de emissão durante a maior parte da jornada. As medidas de prevenção são incompletas e/ou com deficiências relevantes. As práticas operacionais e/ou as condições ambientais são sugestivas de descontrole de exposição."],
      ["5", "Muito Provável", "Em condições normais de trabalho, o contato dos trabalhadores com o agente é diário em proximidade ou em contato com as fontes de emissão durante toda a jornada. Refere-se a situações em que o agente não sofre nenhum tipo de controle e há situações aparentes de risco grave e iminente por agentes físicos."],
    ],
  },
  {
    cols: 7,
    rows: [
      ["Nº", "Nível", "Agentes Físicos - Situações Quantificadas (*)", "", "", "", ""],
      ["", "", "Ruído", "VCI (aren)", "VCI (VDVR)", "VMB (aren)", "Calor"],
      ["1", "Improvável", "Exposições < 80 dB (A)", "Exposições < 0,1 m/s²", "Exposições < 5 m/s1,75", "Exposições < 0,5 m/s²", "Exposições < 50% dos limites estabelecidos na Tabela 1 da NHO 06"],
      ["2", "Remoto", "Exposições > 80 dB(A) e < 85 dB(A) ou exposições > 85 dB(A) com medidas prevenção Coletivas eficazes e mantidas adequadamente.", "Exposições ≥ 0,1 m/s² e ≤ 0,5 m/s²", "Exposições ≥ 5 m/s1,75 e ≤ 9,1 m/s1,75", "Exposições ≥ 0,5 m/s² e ≤ 2,5 m/s²", "Exposições ≥ 50% a < 100% dos limites estabelecidos na Tabela 1 da NHO 06"],
      ["3", "Possível", "Exposições > 85 dB (A) com medidas de prevenção individuais com deficiências na comprovação da eficácia, mesmo que pequenas.", "Exposições > 0,5 m/s² e < 0,9 m/s²", "Exposições > 9,1 m/s1,75 e < 16,4 m/s1,7", "Exposições > 2,5 m/s² e < 3,5 m/s²", "Exposições > 100% dos limites estabelecidos na Tabela 1 da NHO 06 a ≤ os limites inferiores da região de incerteza da Tabela 4 da NHO 06"],
      ["4", "Provável", "Exposições > 85 dB (A) com medidas de prevenção individuais com deficiências relevantes comprovação da eficácia.", "Exposições ≥ 0,9 m/s² e ≤ 1,1 m/s²", "Exposições ≥ 16,4 m/s1,75 e ≤ 21 m/s1,75", "Exposições ≥ 3,5 m/s² e ≤ 5,0 m/s²", "Exposições no intervalo de valores estabelecidos na Tabela 4 da NHO 06"],
      ["5", "Muito Provável", "Exposições > 85 dB (A) sem medidas de prevenção ou totalmente inadequadas ou incompletas.", "Exposições > 1,1 m/s²", "Exposições > 21 m/s1,75", "Exposições > 5,0 m/s²", "Exposições > 100% dos limites da Tabela 2 da NHO 06 ou situação térmica do ciclo de exposição > 100% dos limites da Tabela 4"],
    ],
  },
  {
    cols: 4,
    rows: [
      ["Nº", "Nível", "Agentes Químicos", ""],
      ["", "", "Situações Não Quantificadas (*)", "Situação Quantificada (*)"],
      ["1", "Improvável", "Em condições normais de trabalho, o contato dos trabalhadores com o agente é inexistente ou improvável. Não há incremento da exposição devido ao ambiente de trabalho. A exposição no ambiente de trabalho é praticamente a mesma do ambiente externo. As medidas de prevenção existentes representam a melhor tecnologia ou prática disponível.", "Exposições < 10% LEO ou exposições >10% e < 50% LEO com medidas preventivas mantidas adequadamente."],
      ["2", "Remoto", "Em condições normais de trabalho, o contato dos trabalhadores com o agente é esporádico, por curto espaço de tempo. É típico para aqueles que não mantêm contato com as fontes de emissão, mas que podem acessar locais com a presença do agente por breves períodos ou em caso de exposições rotineiras existem medidas de prevenção eficazes de ordem coletiva ou de engenharia que seguem as normas legais e são mantidas adequadamente. O agente e/ou as condições de trabalho podem representar apenas um aspecto de desconforto e não de risco.", "Exposições > 10% e < 50% LEO ou exposições > 50% e < 100% LEO com medidas preventivas mantidas adequadamente."],
      ["3", "Possível", "Em condições normais de trabalho, o contato dos trabalhadores com o agente é diário ou na maior parte da semana. O agente não possui limite de exposição do tipo teto ou de curta duração e o valor de limite de exposição do tipo média ponderada é consideravelmente alto (centenas de ppm). As medidas de prevenção seguem as normas legais e são mantidas adequadamente, mas estão focadas apenas em medidas de proteção individuais ou administrativas. Podem existir medidas de prevenção de ordem coletiva ou de engenharia, porém sem evidências de manutenção ou com pequenas deficiências na operação.", "Exposições > 50% e < 100% LEO sem medidas de prevenção ou não mantidas adequadamente ou exposições > 100% LEO com medidas de prevenção individuais eficazes apenas sob o ponto de vista legal."],
      ["4", "Provável", "Em condições normais de trabalho, o contato dos trabalhadores com o agente é diário em proximidade ou em contato com as fontes de emissão durante a maior parte da jornada. O agente possui limite de exposição do tipo valor teto ou de curta duração ou do tipo média ponderada muito baixo (alguns ppm). Há possibilidade de deficiência de oxigênio. Não há proteção cutânea específica no manuseio de substâncias com notação pele. As medidas de prevenção são incompletas e/ou com deficiências relevantes. As práticas operacionais e/ou as condições ambientais são sugestivas de descontrole de exposição. Há queixas sistematizadas específicas ou indicadores biológicos de exposição excedidos no PCMSO.", "Exposições > 100% LEO com medidas de prevenção individuais com deficiências na comprovação da eficácia, mesmo que pequenas"],
      ["5", "Muito Provável", "Em condições normais de trabalho, o contato dos trabalhadores com o agente é diário em proximidade ou em contato com as fontes de emissão durante toda a jornada. Envolve exposição a carcinogênicos, mutagênicos ou teratogênicos suspeitos ou comprovados em humanos. Há risco aparente de deficiência de oxigênio. O agente possui efeitos agudos, baixos limites de exposição e IPVS (concentração imediatamente perigosa à vida e à saúde). As queixas são específicas e frequentes, com indicadores biológicos de exposição excedidos. Há exposição cutânea severa a substâncias com notação pele. Refere-se a situações em que o agente não sofre nenhum tipo de controle e há situações aparentes de risco grave e iminente por agentes químicos.", "Exposições > 100% dos limites da Tabela 2 da NHO 06 ou Exposições > 100% LEO sem medidas de prevenção ou com medidas de prevenção totalmente inadequadas ou incompletas ou com deficiências relevantes."],
    ],
  },
  {
    cols: 3,
    rows: [
      ["Nº", "Nível", "Agentes Biológicos"],
      ["1", "Improvável", "Exposições em que a geração de bioaerossóis é escassa e esporádica. Exposições com frequência de contato ocasional e imprevisível. Exposições em que são manuseadas quantidades insignificantes de materiais com potencial presença de agentes biológicos. Exposições com medidas de prevenção existentes que representam a melhor tecnologia ou prática disponível."],
      ["2", "Remoto", "Exposições em que a geração de bioaerossóis é escassa ou moderada, mas esporádica. Exposições com frequência de contato menor que 20% da jornada de trabalho. Exposições em que são manuseadas pequenas quantidades de materiais com potencial presença de agentes biológicos (gramas ou mililitros). Exposições que as medidas de prevenção seguem as normas legais e são mantidas adequadamente."],
      ["3", "Possível", "Exposições em que a geração de bioaerossóis é moderada e não contínua ou alta, mas esporádica. Exposições com frequência de contato que não excedem 75% da jornada. Exposições em que são manuseadas quantidades médias de materiais com potencial presença de agentes biológicos (quilogramas ou litros). Exposições em que as medidas de prevenção são adequadas, mas com pequenas deficiências na operação ou manutenção."],
      ["4", "Provável", "Exposições em que a geração de bioaerossóis é alta ou moderada, mas contínua. Exposições com frequência de contato superior a 75% da jornada. Exposições em que são manuseadas quantidades grandes de materiais com potencial presença de agentes biológicos (toneladas ou metros cúbicos). Exposições em que as medidas de prevenção são incompletas e/ou com deficiências relevantes."],
      ["5", "Muito Provável", "Exposições em que a geração de bioaerossóis é alta e contínua. Exposições com frequência de contato durante 100% da jornada. Exposições em que são manuseadas quantidades enormes de materiais com potencial presença de agentes biológicos. Exposições em que as medidas de prevenção são inexistentes ou totalmente inadequadas."],
    ],
  },
];

export const SECTION_15_TABLES: FixedRuntimeTable[] = [
  {
    cols: 8,
    rows: [
      ["Gradação do Risco", "", "", "", "", "", "", ""],
      ["Severidade Severidade", "1", "Leve", "Risco Irrelevante", "Risco Irrelevante", "Risco Baixo", "Risco Baixo", "Risco Moderado"],
      ["", "2", "Baixo", "Risco Irrelevante", "Risco Baixo", "Risco Moderado", "Risco Moderado", "Risco Moderado"],
      ["", "3", "Moderado", "Risco Baixo", "Risco Moderado", "Risco Moderado", "Risco Alto", "Risco Alto"],
      ["", "4", "Alto", "Risco Baixo", "Risco Moderado", "Risco Alto", "Risco Alto", "Risco Crítico"],
      ["", "5", "Catastrófico", "Risco Moderado", "Risco Moderado", "Risco Alto", "Risco Crítico", "Risco Crítico"],
      ["", "", "", "1", "2", "3", "4", "5"],
      ["", "", "", "Improvável", "Remoto", "Possível", "Provável", "Muito Provável"],
      ["", "", "", "Probabilidade", "", "", "", ""],
    ],
  },
  {
    cols: 2,
    rows: [
      ["Índice", "Descrição"],
      ["Risco Irrelevante", "Efeitos reversíveis à saúde; Para contato – levemente irritante para pele, olhos e mucosas; Vapores e fumos irritantes em contato com a pele, olhos e membranas mucosas; Sem evidência de carcinogenicidade, teratogenicidade e mutagenicidade. (ACGIH A4 ou A5); Tomando por base os limites de tolerância ‐ acima de 500 ppm (vapores e gases), acima de 10 mg/m³ (particulados); Biossegurança ‐ baixa probabilidade de causar doença ao ser humano. (NR-32)."],
      ["Risco Baixo", "Efeitos reversíveis, mas severos, à saúde; Agente apresenta TLV/STEL; Para contato ‐ irritante para membranas mucosas, olhos, pele, sistema respiratório superior; Carcinogênico, teratogênico ou mutagênico confirmado somente para animais. (ACGIH A3); Tomando por base os limites de tolerância ‐ entre 101 e 500 ppm (vapores e gases), entre 1,1 e 10 mg/m³ (particulados); Biossegurança ‐ podem causar doenças ao ser humano, para as quais existem meios eficazes de profilaxia ou tratamento. (NR-32)."],
      ["Risco Moderado", "Efeitos irreversíveis à saúde; Agente apresenta TLV – CEIL (Valor Teto); Para contato – altamente irritante para membranas mucosas, olhos, pele, sistema respiratório e digestivo, resultando em lesões irreversíveis limitantes da capacidade funcional;"],
      ["Risco Alto", "Suspeito de ser carcinogênico, teratogênico ou mutagênico para seres humanos (ACGIH A2); Tomando por base os limites de tolerância entre 11 e 100 ppm (vapores e gases), entre 0,1 e 1,0 mg/m³ (particulados); Biossegurança - podem causar doenças e infecções graves ao ser humano, para as quais nem sempre existem meios eficazes de profilaxia ou tratamento (NR-32)."],
      ["Risco Crítico", "Ameaça de vida, lesão incapacitante ou doença; Agente apresenta baixo IDLH; Para contato – efeito cáustico e corrosivo severo sobre a pele, mucosa e olhos (pode causar perda da visão), podendo resultar em morte ou lesões incapacitantes; Carcinogênico, teratogênico ou mutagênico confirmado para seres humanos (ACGIH A1); Tomando por base os limites de tolerância - <= 10 ppm (vapores e gases), < 0,1 mg/m³ (particulados); Biossegurança – apresenta grande poder de transmissibilidade de um indivíduo a outro. Podem causar doenças graves ao ser humano, para as quais não existem meios eficazes de profilaxia ou tratamento (NR-32)."],
    ],
  },
  {
    cols: 8,
    rows: [
      ["Gradação do Risco", "", "", "", "", "", "", ""],
      ["Gradação de Risco Gradação de Risco", "1", "Irrelevante", "Nenhuma ação adicional é necessária", "Nenhuma ação adicional é necessária", "Prioridade baixa", "Prioridade baixa", "Prioridade Média"],
      ["", "2", "Baixo", "Nenhuma ação adicional é necessária", "Prioridade baixa", "Prioridade Média", "Prioridade Média", "Prioridade Média"],
      ["", "3", "Moderado", "Prioridade baixa", "Prioridade Média", "Prioridade Média", "Prioridade Alta", "Prioridade Alta"],
      ["", "4", "Alto", "Prioridade baixa", "Prioridade Média", "Prioridade Alta", "Prioridade Alta", "Ações Imediatas"],
      ["", "5", "Crítico", "Prioridade Média", "Prioridade Média", "Prioridade Alta", "Ações Imediatas", "Ações Imediatas"],
      ["", "", "", "1", "2", "3", "4", "5"],
      ["", "", "", "Até 10%", "10% a 50%", "50%", "51% a 75%", ">75%"],
      ["", "", "", "Número de Trabalhadores Possivelmente Afetados", "", "", "", ""],
    ],
  },
  {
    cols: 2,
    rows: [
      ["Priorização da Ação", "Ações"],
      ["Risco Irrelevante", "Nenhuma ação adicional é necessária."],
      ["Risco Baixo", "Manter as medidas de controle existentes; Manter o escopo de trabalho e procedimentos conforme normas técnicas aplicáveis; Considerações podem ser feitas para avaliar soluções mais efetivas e de menor custo ou ainda melhorias que não envolvem custo; Procedimentos e/ou objetivos e metas são opcionais; Registrar e informar aos trabalhadores."],
      ["Risco Moderado", "Ações consideradas no Plano de Ação; Esforços devem ser feitos para reduzir o risco, porém os custos de prevenção devem ser cuidadosamente estimados e definidos; Quando avaliadas e definidas como aplicáveis, as medidas a implementar devem ter definidos seus responsáveis e prazos de conclusão; Procedimentos de controle operacional e/ou planos de emergência são necessários."],
      ["Risco Alto", "Ações consideradas no Plano de Ação; Considerações podem ser feitas para avaliar soluções mais efetivas e de menor custo ou ainda melhorias que não envolvem custo; Avaliações adicionais devem ser definidas, para estabelecer mais precisamente as medidas de controle a serem melhoradas; Procedimentos e/ou objetivos e metas são opcionais; Registrar e informar aos trabalhadores. Esforços devem ser feitos para reduzir o risco, porém os custos de prevenção devem ser cuidadosamente estimados e definidos; Quando avaliadas e definidas como aplicáveis, as medidas a implementar devem ter definidos seus responsáveis e prazos de conclusão; Avaliações adicionais devem ser definidas, para estabelecer mais precisamente as medidas de controle a serem melhoradas; Procedimentos de controle operacional e/ou planos de emergência são necessários."],
      ["Risco Crítico", "Ações consideradas no Plano de Ação; O trabalho não deve ser iniciado até que o risco tenha sido reduzido para o nível Moderado; Provavelmente recursos consideráveis deverão ser alocados para reduzir o risco, o que implica em escalar o plano de ações a níveis mais elevados de responsabilidade; Quando o trabalho se encontrar em progresso, ação urgente deve ser adotada; Procedimentos de controle operacional, planos de emergência e objetivos e metas são mandatários."],
    ],
  },
];
