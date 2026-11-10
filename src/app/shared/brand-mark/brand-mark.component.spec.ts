import { TestBed } from '@angular/core/testing';
import { BrandMarkComponent } from './brand-mark.component';

function render(part: 'mark' | 'word', size: number): HTMLElement {
  const fixture = TestBed.createComponent(BrandMarkComponent);
  fixture.componentRef.setInput('part', part);
  fixture.componentRef.setInput('size', size);
  fixture.detectChanges();
  return fixture.nativeElement;
}

describe('BrandMarkComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [BrandMarkComponent] }));

  it('draws the roundel: three candidates, the middle head in the "you" colour', () => {
    const svg = render('mark', 32).querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    const heads = Array.from(svg.querySelectorAll('circle')).filter(c => c.getAttribute('r') === '2.5');
    expect(heads).toHaveLength(3);
    expect(heads.filter(c => c.getAttribute('fill')?.includes('--mark-you'))).toHaveLength(1);
  });

  it('draws the wordmark as a labelled image with three i-dots, the middle one accented', () => {
    const svg = render('word', 26)!.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Invigil');
    expect(svg.getAttribute('height')).toBe('26');
    expect(svg.querySelector('path')!.getAttribute('d')!.length).toBeGreaterThan(500);
    const dots = Array.from(svg.querySelectorAll('circle'));
    expect(dots).toHaveLength(3);
    expect(dots.filter(c => c.getAttribute('fill')?.includes('--mark-word-dot'))).toHaveLength(1);
  });
});
