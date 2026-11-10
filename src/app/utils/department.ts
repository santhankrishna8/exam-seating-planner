/**
 * Department → regalia hue. A department's name picks its hue (FNV-1a hash, 8 slots),
 * so Physics is the same colour on every page. Within one view, a department whose slot
 * is already taken moves to the next free hue (alphabetical order decides who moves),
 * so departments shown together stay distinguishable up to eight.
 */
const slotOf = (key: string): number => {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return (h >>> 0) % 8;
};

export function deptPalette(names: Iterable<string | undefined | null>): (name?: string | null) => string {
  const key = (n?: string | null) => (n ?? '').trim().toLowerCase();
  const sorted = [...new Set([...names].map(key).filter(Boolean))].sort();
  const index = new Map<string, number>();
  const taken = new Set<number>();
  for (const n of sorted) {
    if (taken.size >= 8) taken.clear();
    let i = slotOf(n);
    while (taken.has(i)) i = (i + 1) % 8;
    taken.add(i);
    index.set(n, i);
  }
  /** CSS class (`dept-0` … `dept-7`) that sets the `--hood` colour, or '' for no department. */
  return (name) => (index.has(key(name)) ? `dept-${index.get(key(name))}` : '');
}
