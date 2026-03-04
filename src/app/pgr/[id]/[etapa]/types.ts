export type HistoricoChange = {
  id: string;
  company: string;
  analysis: string;
  change: string;
  reason: string;
  date: string;
};

export type CycleTimeData = {
  totalMs: number;
  firstOpenedAt: string | null;
  lastActiveAt: string | null;
  byStepMs: Record<string, number>;
};

export type HistoricoData = {
  title: string;
  subtitle: string;
  changes: HistoricoChange[];
  cycleTime?: CycleTimeData;
};

export type PgrFunction = {
  id: string;
  setor: string;
  funcao: string;
  descricao: string;
};

export type GheGroup = {
  id: string;
  name: string;
  info: {
    processo: string;
    observacoes: string;
    ambiente: string;
  };
  items: Array<{ functionId: string; funcionarios: string }>;
};

export type GheRisk = {
  id: string;
  tipoAgente: string;
  descricaoAgente: string;
  perigo: string;
  meioPropagacao: string;
  fontes: string;
  tipoAvaliacao: string;
  intensidade: string;
  severidade: string;
  probabilidade: string;
  classificacao: string;
  medidasControle: string;
  epc: string[];
  epi: string[];
};

export type RiskGheGroup = {
  id: string;
  name: string;
  risks: GheRisk[];
};

export type RiskCatalogItem = {
  name: string;
  agent: number;
};

export type RiskCatalogPayload = {
  riskAgents: Array<{ id: number; name: string }>;
  riskDescriptions: RiskCatalogItem[];
  hazards: RiskCatalogItem[];
  riskSources: RiskCatalogItem[];
  propagationPaths: RiskCatalogItem[];
  healthDamages: RiskCatalogItem[];
};

export type ParsedDescricaoImport = {
  functions: PgrFunction[];
  gheGroups: GheGroup[];
  riskGheGroups: RiskGheGroup[];
};

export type AnexoFile = {
  id: string;
  name: string;
};

export type AnexoItem = {
  id: string;
  title: string;
  files: AnexoFile[];
};
