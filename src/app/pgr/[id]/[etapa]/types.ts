export type HistoricoChange = {
  id: string;
  company: string;
  analysis: string;
  change: string;
  reason: string;
  date: string;
  status?: string;
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
  quantitativo?: string;
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
  meioPropagacao: string;
  fontes: string;
  danosSaude?: string;
  unidadeMedida?: string;
  valorMedido?: string;
  tipoAvaliacao: string;
  intensidade: string;
  nivelAcao?: string;
  severidade: string;
  probabilidade: string;
  classificacao: string;
  medidasControle: string;
  normas?: string;
  epc: string;
  epi: string;
  tipoMedida?: string;
  prazoAcao?: string;
  responsavelAcao?: string;
  acompanhamento?: string;
  afericaoResultado?: string;
};

export type RiskGheGroup = {
  id: string;
  name: string;
  risks: GheRisk[];
};

export type HistoryEntry = {
  gheGroups: GheGroup[];
  currentGheId: string;
  selectedLeftIds: string[];
  selectedRightIds: string[];
  riskGheGroups: RiskGheGroup[];
  currentRiskGheId: string;
};

export type RiskCatalogItem = {
  name: string;
  agent: number;
};

export type RiskMatrixTemplateItem = {
  id: number;
  name: string;
  isActive?: boolean;
};

export type RiskMatrixExposureItem = {
  id: number;
  templateId: number;
  value: number;
  minLimit: number;
  maxLimit: number;
};

export type RiskMatrixQualitativeItem = {
  id: number;
  templateId: number;
  severityValue: number;
  probabilityValue: number;
  classificationId: number;
  classificationName: string;
};

export type RiskMatrixQuantitativeItem = {
  id: number;
  templateId: number;
  qualitativeId?: number;
  qualitativeClassificationId?: number;
  severityValue?: number;
  levelValue: number;
  levelId: number;
  classificationId: number;
  classificationName: string;
};

export type RiskMatrixActionPlanItem = {
  id: number;
  templateId: number;
  riskEvaluationClassificationId: number;
  riskEvaluationClassificationName?: string;
  exposureId: number;
  exposureValue: number;
  classificationId: number;
  classificationName: string;
};

export type RiskMatrixPayload = {
  activeTemplateId?: number | null;
  templates: RiskMatrixTemplateItem[];
  exposure?: RiskMatrixExposureItem[];
  qualitative: RiskMatrixQualitativeItem[];
  quantitative: RiskMatrixQuantitativeItem[];
  actionPlan?: RiskMatrixActionPlanItem[];
};

export type TechnicalCriteriaCatalogItem = {
  description: string;
  standard?: string;
  source?: string;
  sourceChildren?: unknown;
  source_children?: unknown;
  propagationPath?: string;
  propagation_path?: string;
  propagationPathChildren?: unknown;
  propagation_path_children?: unknown;
  evaluationType?: string;
  evaluation_type?: string;
  hasQuantitative?: boolean;
  has_quantitative?: boolean;
  severity?: string | number | { value?: string | number; name?: string };
  limit?: string | number | null;
  toleranceLimit?: string | number | null;
  tolerance_limit?: string | number | null;
  actionLevel?: string | number | null;
  action_level?: string | number | null;
  isCalculated?: boolean;
  is_calculated?: boolean;
  unit?: string;
  unitChildren?: unknown;
  unit_children?: unknown;
  controlMeasureDescriptionChildren?: unknown;
  control_measure_description_children?: unknown;
  actionDescriptionChildren?: unknown;
  action_description_children?: unknown;
  ppeChildren?: unknown;
  ppe_children?: unknown;
  cpeChildren?: unknown;
  cpe_children?: unknown;
  agent: number | string;
};

export type RiskCatalogPayload = {
  riskAgents: Array<{ id: number; name: string }>;
  standards?: Array<{ id?: number; name: string }>;
  riskDescriptions: RiskCatalogItem[];
  hazards: RiskCatalogItem[];
  riskSources: RiskCatalogItem[];
  propagationPaths: RiskCatalogItem[];
  healthDamages: RiskCatalogItem[];
  technicalCriteria: TechnicalCriteriaCatalogItem[];
  riskMatrix?: RiskMatrixPayload;
};

export type ParsedDescricaoImport = {
  functions: PgrFunction[];
  gheGroups: GheGroup[];
  riskGheGroups: RiskGheGroup[];
};

export type ExcelImportMissingRequiredFieldRow = {
  lineNumber: number;
  missingFields: string[];
};

export type ExcelImportFeedback = {
  type: "success" | "error";
  message: string;
  missingRequiredFieldRows?: ExcelImportMissingRequiredFieldRow[];
};

export type AnexoFile = {
  id: string;
  name: string;
  url?: string;
  originalName?: string;
  sizeBytes?: number;
  uploadedAt?: string;
};

export type AnexoItem = {
  id: string;
  title: string;
  files: AnexoFile[];
};
