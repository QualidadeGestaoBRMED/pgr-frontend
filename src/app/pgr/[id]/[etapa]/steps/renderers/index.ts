import { renderAnexosStep } from "./anexos-renderer";
import { renderCaracterizacaoStep } from "./caracterizacao-renderer";
import { renderDadosStep } from "./dados-renderer";
import { renderDescricaoStep } from "./descricao-renderer";
import { renderFallbackStep } from "./fallback-renderer";
import { renderHistoricoStep } from "./historico-renderer";
import { renderInicioStep } from "./inicio-renderer";
import { renderPlanoStep } from "./plano-renderer";
import { renderRevisaoStep } from "./revisao-renderer";
import type { StepRenderer } from "./types";

export const STEP_RENDERERS: Record<string, StepRenderer> = {
  inicio: renderInicioStep,
  historico: renderHistoricoStep,
  dados: renderDadosStep,
  descricao: renderDescricaoStep,
  caracterizacao: renderCaracterizacaoStep,
  plano: renderPlanoStep,
  anexos: renderAnexosStep,
  revisao: renderRevisaoStep,
};

export { renderFallbackStep };
