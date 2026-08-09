export const LEVEL_NAMES = [
  "POSEUR",
  "HEADBANGER",
  "METALHEAD",
  "CULT MEMBER",
  "TRVE KVLT",
  "BLAST RIFF",
] as const;

// Index i = minimum trve_points required to be at level i + 1.
export const LEVEL_THRESHOLDS = [0, 500, 2000, 5000, 10000, 25000] as const;

export function getLevelFromPoints(points: number): number {
  if (points >= 25000) return 6;
  if (points >= 10000) return 5;
  if (points >= 5000) return 4;
  if (points >= 2000) return 3;
  if (points >= 500) return 2;
  return 1;
}

export function getLevelName(level: number): string {
  return LEVEL_NAMES[level - 1] ?? LEVEL_NAMES[0];
}

export function getNextLevelThreshold(level: number): number | null {
  return LEVEL_THRESHOLDS[level] ?? null;
}
