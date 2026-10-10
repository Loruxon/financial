export type CostCalculatorKey = "mongols" | "ermak" | "alsafi" | "stavropol";

export type ExecutionScheme = {
  id: string;
  name: string;
  calculator: CostCalculatorKey;
  /** Проверяется zod-схемой выбранного калькулятора. */
  parameters: unknown;
  archivedAt: string | null;
};
