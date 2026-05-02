export interface KnapItem {
  taskId: string | number;
  duration: number;
  impact: number;
}

export interface KnapResult {
  selected: KnapItem[];
  totalImpact: number;
  totalDuration: number;
  budget: number;
}

export const solveZeroOneKnapsack = (
  items: KnapItem[],
  capacity: number
): KnapResult => {
  const cap = Math.max(0, Math.floor(capacity));
  const n = items.length;

  if (n === 0 || cap === 0) {
    return { selected: [], totalImpact: 0, totalDuration: 0, budget: cap };
  }

  const grid: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(cap + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    const item = items[i - 1];
    const w = Math.max(0, Math.floor(item.duration));
    const v = item.impact;
    for (let c = 0; c <= cap; c++) {
      const skip = grid[i - 1][c];
      const take = w <= c ? grid[i - 1][c - w] + v : -Infinity;
      grid[i][c] = take > skip ? take : skip;
    }
  }

  const picks: KnapItem[] = [];
  let remaining = cap;
  for (let i = n; i >= 1; i--) {
    if (grid[i][remaining] !== grid[i - 1][remaining]) {
      const item = items[i - 1];
      picks.push(item);
      remaining -= Math.max(0, Math.floor(item.duration));
    }
  }
  picks.reverse();

  const totalDuration = picks.reduce((s, it) => s + it.duration, 0);
  const totalImpact = picks.reduce((s, it) => s + it.impact, 0);

  return {
    selected: picks,
    totalImpact,
    totalDuration,
    budget: cap,
  };
};
