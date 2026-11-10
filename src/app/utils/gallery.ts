/** One entry of the landing gallery manifest (BRAND.gallery). Only `src` and `alt` are required; role "hero" is the page hero. */
export interface LandingPhoto {
  src: string;
  alt: string;
  role?: string;
  srcset?: string;
  pos?: string;
  credit?: string;
  url?: string;
}

/** Keeps only well-formed entries, so a bad manifest degrades to colour fields instead of throwing. */
export function parseGallery(list: unknown): LandingPhoto[] {
  return (Array.isArray(list) ? list : [])
    .filter((p): p is LandingPhoto => typeof p?.src === 'string' && typeof p?.alt === 'string');
}

/** Fisher-Yates on a copy; `rand` is injectable so the order can be tested. */
export function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The hero photograph, plus the two door photographs (only when the manifest holds two or more besides the hero). */
export function splitGallery(pool: readonly LandingPhoto[]): { hero?: LandingPhoto; doors: LandingPhoto[] } {
  const rest = pool.filter(p => p.role !== 'hero');
  return { hero: pool.find(p => p.role === 'hero'), doors: rest.length >= 2 ? rest.slice(0, 2) : [] };
}
