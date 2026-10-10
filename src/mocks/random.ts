/** Детерминированный ГПСЧ (mulberry32), чтобы моки не менялись между перезапусками. */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error("pick: пустой массив");
  return item;
}

export function int(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Случайная денежная сумма в заданном диапазоне, строка с 2 знаками. */
export function moneyAmount(
  rng: () => number,
  min: number,
  max: number,
): string {
  return (rng() * (max - min) + min).toFixed(2);
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
