/** Compares two "x.y.z" version strings. Returns -1, 0, or 1 like a normal comparator. */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map((n) => parseInt(n, 10) || 0);
  const partsB = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < len; i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/** True if `current` is older than `minVersion`. */
export function isVersionBelow(current: string, minVersion: string): boolean {
  return compareVersions(current, minVersion) < 0;
}
