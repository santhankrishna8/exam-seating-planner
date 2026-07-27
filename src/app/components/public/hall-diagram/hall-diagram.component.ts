import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * The product's own visual language used as the hero illustration: a hall
 * drawn from above as columns of benches of *different* depths — the real
 * shape of an examination hall — with one seat struck in seal red and called
 * out the way a student sees it after a lookup.
 */
@Component({
  selector: 'app-hall-diagram',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="diagram">
      <figcaption class="dg-head">
        <span class="dg-name">Block B · Hall 204</span>
        <span class="dg-shape mono">4 columns · 21 benches · 2 per bench</span>
      </figcaption>

      <div class="dg-board"><span>Board</span></div>

      <div class="dg-plan" aria-hidden="true">
        @for (col of columns; track col.id) {
          <div class="dg-col">
            @for (bench of col.benches; track bench.n) {
              <div class="dg-bench" [class.is-mine]="bench.n === marked">
                <i class="dg-seat" [class.taken]="bench.left"></i>
                <i class="dg-seat" [class.taken]="bench.right" [class.mine]="bench.n === marked"></i>
              </div>
            }
          </div>
        }
      </div>

      <div class="dg-callout">
        <span class="dg-callout-label">Your seat</span>
        <span class="dg-callout-value mono">B14 · S2</span>
      </div>
    </figure>
  `,
  styles: [`
    :host { display: block; }
    .diagram {
      position: relative; margin: 0;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      background: var(--bg-card);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
    }
    .dg-head {
      display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap;
      padding: 13px 16px; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary);
    }
    .dg-name { font-family: var(--font-head); font-weight: 600; letter-spacing: -0.025em; font-size: 1.05rem; }
    .dg-shape { font-size: 0.66rem; letter-spacing: 0.06em; color: var(--text-muted); }

    .dg-board {
      display: flex; align-items: center; justify-content: center;
      padding: 8px; background: var(--bg-sunken); border-bottom: 1px solid var(--border-color);
      font-family: var(--font-mono); font-size: 0.58rem; letter-spacing: 0.22em; text-transform: uppercase;
      color: var(--text-muted);
    }
    .dg-board span { position: relative; }
    .dg-board span::before, .dg-board span::after {
      content: ''; position: absolute; top: 50%; width: 54px; height: 1px; background: var(--border-strong);
    }
    .dg-board span::before { right: calc(100% + 12px); }
    .dg-board span::after { left: calc(100% + 12px); }

    .dg-plan { display: flex; justify-content: center; gap: 16px; padding: 22px 18px 30px; }
    .dg-col { display: flex; flex-direction: column; gap: 5px; }
    .dg-bench {
      display: flex; gap: 3px; padding: 3px;
      border: 1px solid var(--border-color); border-radius: 2px; background: var(--bg-secondary);
    }
    .dg-bench.is-mine { border-color: color-mix(in oklch, var(--accent-red) 55%, transparent); }
    .dg-seat { width: 19px; height: 11px; border-radius: 1px; background: var(--bg-sunken); display: block; }
    .dg-seat.taken { background: color-mix(in oklch, var(--accent-blue) 30%, transparent); }
    .dg-seat.mine {
      background: var(--accent-red);
      animation: seatMark 3s cubic-bezier(0.32, 0.72, 0, 1) infinite;
    }
    @keyframes seatMark {
      0%, 100% { box-shadow: 0 0 0 0 color-mix(in oklch, var(--accent-red) 45%, transparent); }
      45% { box-shadow: 0 0 0 5px color-mix(in oklch, var(--accent-red) 0%, transparent); }
    }

    .dg-callout {
      position: absolute; right: 16px; bottom: 16px;
      display: flex; flex-direction: column; gap: 1px;
      padding: 8px 12px; border-radius: var(--radius-sm);
      background: var(--ink-face); color: var(--ink-text);
      box-shadow: var(--shadow-md);
    }
    .dg-callout-label { font-family: var(--font-mono); font-size: 0.55rem; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.7; }
    .dg-callout-value { font-size: 0.95rem; font-weight: 500; letter-spacing: 0.02em; }

    @media (prefers-reduced-motion: reduce) { .dg-seat.mine { animation: none; } }
    @media (max-width: 520px) {
      .dg-plan { gap: 10px; padding: 16px 10px 26px; }
      .dg-seat { width: 14px; height: 9px; }
    }
  `]
})
export class HallDiagramComponent {
  /** Bench struck in seal red — the "your seat" moment. */
  readonly marked = 14;

  // Deliberately uneven columns: 6, 5, 6, 4 benches.
  readonly columns = [6, 5, 6, 4].map((len, ci) => {
    const start = [6, 5, 6, 4].slice(0, ci).reduce((a, b) => a + b, 0);
    return {
      id: ci,
      benches: Array.from({ length: len }, (_, i) => {
        const n = start + i + 1;
        return { n, left: n % 5 !== 3, right: n % 4 !== 0 || n === 14 };
      })
    };
  });
}
