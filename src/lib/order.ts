// The element at index `from` moved to index `to`, as a new array. `to` is clamped into the list, and an unknown
// `from` changes nothing. Shared by field order and want ranks (ADR 0004): callers renumber 1..n from the result.
export const moveInList = <T>(list: readonly T[], from: number, to: number): T[] => {
  const moved = list[from];
  if (!(from in list)) return [...list];
  const target = Math.min(Math.max(to, 0), list.length - 1);
  return list.toSpliced(from, 1).toSpliced(target, 0, moved as T);
};
