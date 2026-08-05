const DAY_MS = 24 * 60 * 60 * 1000;

export type FunctionInclusionDeadlineAlert = {
  severity: "warning" | "danger";
  daysRemaining: number;
  label: string;
  deadline: string;
};

const calendarDateToUtc = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.getTime();
};

export function parseFunctionInclusionDeadline(value: string): number | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const brazilian = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\D|$)/.exec(raw);
  if (brazilian) {
    return calendarDateToUtc(
      Number(brazilian[3]),
      Number(brazilian[2]),
      Number(brazilian[1])
    );
  }

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\D|$)/.exec(raw);
  if (iso) {
    return calendarDateToUtc(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  return null;
}

export function getFunctionInclusionDeadlineAlert(
  deadlines: string[],
  now = new Date()
): FunctionInclusionDeadlineAlert | null {
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const candidates = deadlines
    .map((deadline) => ({
      deadline: String(deadline || "").trim(),
      timestamp: parseFunctionInclusionDeadline(deadline),
    }))
    .filter(
      (candidate): candidate is { deadline: string; timestamp: number } =>
        candidate.timestamp !== null
    )
    .map((candidate) => ({
      ...candidate,
      daysRemaining: Math.round((candidate.timestamp - todayUtc) / DAY_MS),
    }))
    .sort((left, right) => left.daysRemaining - right.daysRemaining);

  const mostUrgent = candidates[0];
  if (!mostUrgent || mostUrgent.daysRemaining > 3) return null;

  if (mostUrgent.daysRemaining < 0) {
    const overdueDays = Math.abs(mostUrgent.daysRemaining);
    return {
      severity: "danger",
      daysRemaining: mostUrgent.daysRemaining,
      label: `Atrasado há ${overdueDays} ${overdueDays === 1 ? "dia" : "dias"}`,
      deadline: mostUrgent.deadline,
    };
  }

  if (mostUrgent.daysRemaining === 0) {
    return {
      severity: "warning",
      daysRemaining: 0,
      label: "Vence hoje",
      deadline: mostUrgent.deadline,
    };
  }

  return {
    severity: "warning",
    daysRemaining: mostUrgent.daysRemaining,
    label: `Vence em ${mostUrgent.daysRemaining} ${
      mostUrgent.daysRemaining === 1 ? "dia" : "dias"
    }`,
    deadline: mostUrgent.deadline,
  };
}
