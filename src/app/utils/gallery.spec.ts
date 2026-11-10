import { parseGallery, shuffle, splitGallery, LandingPhoto } from './gallery';

const photo = (src: string, extra: Partial<LandingPhoto> = {}): LandingPhoto => ({ src, alt: src, ...extra });

describe('parseGallery', () => {
  it('keeps well-formed entries and drops the rest', () => {
    const list = [photo('a.webp'), { src: 'no-alt.webp' }, { alt: 'no-src' }, null, 'junk', 7, photo('b.webp')];
    expect(parseGallery(list).map(p => p.src)).toEqual(['a.webp', 'b.webp']);
  });

  it('turns anything that is not an array into an empty gallery', () => {
    expect(parseGallery(undefined)).toEqual([]);
    expect(parseGallery({ src: 'a', alt: 'a' })).toEqual([]);
    expect(parseGallery('[]')).toEqual([]);
  });
});

describe('shuffle', () => {
  it('returns a permutation and leaves the input alone', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(input);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('is deterministic for a fixed random source', () => {
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
  });
});

describe('splitGallery', () => {
  const hero = photo('hero.webp', { role: 'hero' });

  it('uses the role "hero" entry as the hero and the next two as the doors', () => {
    const { hero: h, doors } = splitGallery([photo('a'), hero, photo('b'), photo('c')]);
    expect(h).toBe(hero);
    expect(doors.map(d => d.src)).toEqual(['a', 'b']);
  });

  it('gives the doors no photographs unless there are two to show', () => {
    expect(splitGallery([hero, photo('a')]).doors).toEqual([]);
    expect(splitGallery([hero]).doors).toEqual([]);
  });

  it('has no hero when the manifest names none, and copes with an empty manifest', () => {
    expect(splitGallery([photo('a'), photo('b')]).hero).toBeUndefined();
    expect(splitGallery([])).toEqual({ hero: undefined, doors: [] });
  });
});
