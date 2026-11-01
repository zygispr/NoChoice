/** Budgets from plan.md § Performance Goals. A gate fails only 10% above its budget (Principle V). */
export const TOLERANCE = 1.1;
export const CLASSIFY_BUDGET_MS = 2;
export const TASK_BUDGET_MS = 50;
export const SETTINGS_BUDGET_MS = 50;
/** Page-load overhead fails only above both limits: the frame floor stops timer noise failing it. */
export const LOAD_OVERHEAD_LIMIT = 0.1;
export const LOAD_OVERHEAD_FLOOR_MS = 16;

export function report(name: string, measuredMs: number, budget: string): void {
  console.log(`${name}: ${measuredMs.toFixed(2)} ms (budget: ${budget})`);
}

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const value = sorted[Math.floor(sorted.length / 2)];
  if (value === undefined) throw new Error('Cannot take the median of nothing');
  return value;
}
