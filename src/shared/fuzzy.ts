// Subsequence-based fuzzy scorer for the command palette. Pure, no imports —
// unit-tested via Node's native type stripping.

export interface FuzzyMatch {
  score: number;
  /** Indices into the target string, ascending. */
  positions: number[];
}

const BONUS_START = 12; // match at the very start of the target
const BONUS_BOUNDARY = 8; // after space/dash/slash, or camelCase hump
const BONUS_CONSECUTIVE = 5;
const PENALTY_GAP = -1; // per skipped char in the target

function isBoundary(target: string, index: number): boolean {
  if (index === 0) return false; // start handled separately (BONUS_START)
  const prev = target[index - 1];
  if (prev === ' ' || prev === '-' || prev === '_' || prev === '/' || prev === ':') return true;
  const ch = target[index];
  return ch >= 'A' && ch <= 'Z' && !(prev >= 'A' && prev <= 'Z'); // camelCase hump
}

/**
 * Score `query` against `target` as a subsequence (case-insensitive).
 * Returns null when the query is not a subsequence. Higher is better:
 * boundary hits and consecutive runs beat scattered matches.
 */
export function fuzzyScore(query: string, target: string): FuzzyMatch | null {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return { score: 0, positions: [] };
  const t = target.toLowerCase();

  const positions: number[] = [];
  let score = 0;
  let ti = 0;
  let gap = 0;

  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    let found = -1;
    while (ti < t.length) {
      if (t[ti] === ch) {
        found = ti;
        break;
      }
      ti++;
      if (positions.length > 0) gap++;
    }
    if (found === -1) return null;

    score += 1 + PENALTY_GAP * gap;
    gap = 0;
    if (found === 0) score += BONUS_START;
    else if (isBoundary(target, found)) score += BONUS_BOUNDARY;
    const prev = positions[positions.length - 1];
    if (prev !== undefined && found === prev + 1) score += BONUS_CONSECUTIVE;

    positions.push(found);
    ti = found + 1;
  }

  return { score, positions };
}

export interface ScoredItem<T> {
  item: T;
  score: number;
  positions: number[];
}

/**
 * Score-and-sort helper: keeps items matching `query` (empty query keeps all,
 * in original order), best score first. Ties keep original order (stable).
 */
export function fuzzyFilter<T>(query: string, items: readonly T[], label: (item: T) => string): ScoredItem<T>[] {
  if (query.trim().length === 0) {
    return items.map((item) => ({ item, score: 0, positions: [] }));
  }
  const scored: ScoredItem<T>[] = [];
  for (const item of items) {
    const match = fuzzyScore(query, label(item));
    if (match) scored.push({ item, score: match.score, positions: match.positions });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
}
