import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandMarkComponent } from '../brand-mark/brand-mark.component';
import { BRAND } from '../../brand';

/**
 * Shared frame for every sign-in surface: a letterhead panel on the left,
 * the form on the right. Keeps the three auth screens identical without
 * repeating sixty lines of layout in each one.
 */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterLink, BrandMarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth">
      <aside class="letterhead">
        <a routerLink="/" class="lh-brand">
          <app-brand-mark [size]="34" />
          <span class="lh-words">
            <span class="lh-name">{{ brand.name }}</span>
            <span class="lh-desc">{{ brand.descriptor }}</span>
          </span>
        </a>

        <div class="lh-body">
          <p class="lh-quote">{{ note }}</p>
        </div>

        <div class="lh-plan" aria-hidden="true">
          @for (col of planColumns; track col.id) {
            <span class="lh-col">
              @for (b of col.benches; track b) { <i></i> }
            </span>
          }
        </div>

        <span class="lh-stamp mono">{{ brand.stamp }}</span>
      </aside>

      <main class="panel">
        <div class="panel-inner fade-in">
          <span class="eyebrow">{{ eyebrow }}</span>
          <h1 class="panel-title">{{ heading }}</h1>
          @if (subheading) { <p class="panel-sub">{{ subheading }}</p> }
          <ng-content />
        </div>
      </main>
    </div>
  `,
  styles: [`
    .auth { min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    @media (max-width: 900px) { .auth { grid-template-columns: 1fr; } }

    /* ── Letterhead ── */
    .letterhead {
      position: relative; overflow: hidden;
      display: flex; flex-direction: column; justify-content: space-between;
      padding: 34px 38px;
      background: #0b1b4d; color: #fff;
    }
    @media (max-width: 900px) {
      .letterhead { padding: 22px; min-height: 0; }
      .lh-body, .lh-plan, .lh-stamp { display: none; }
    }

    .lh-brand { display: flex; align-items: center; gap: 11px; color: inherit; position: relative; z-index: 1; }
    .lh-brand app-brand-mark {
      --mark-bg: rgb(255 255 255 / 0.12);
      --mark-you: var(--brand-yellow);
    }
    .lh-words { display: flex; flex-direction: column; }
    .lh-name { font-family: var(--font-head); font-weight: 600; letter-spacing: -0.025em; font-size: 1.35rem; line-height: 1.05; }
    .lh-desc { font-family: var(--font-mono); font-size: 0.54rem; letter-spacing: 0.15em; text-transform: uppercase; opacity: 0.6; }

    .lh-body { position: relative; z-index: 1; max-width: 34ch; }
    .lh-quote { font-family: var(--font-head); font-weight: 600; font-size: 1.7rem; line-height: 1.2; letter-spacing: -0.015em; }

    .lh-plan {
      position: absolute; right: -40px; bottom: 84px; z-index: 0;
      display: flex; gap: 12px; opacity: 0.16;
    }
    .lh-col { display: flex; flex-direction: column; gap: 5px; }
    .lh-col i { display: block; width: 34px; height: 8px; border-radius: 1px; background: currentColor; }

    .lh-stamp { position: relative; z-index: 1; font-size: 0.56rem; letter-spacing: 0.2em; opacity: 0.5; }

    /* ── Form panel ── */
    .panel { display: flex; align-items: center; justify-content: center; padding: 40px 24px; }
    .panel-inner { width: 100%; max-width: 380px; }
    .panel-title { font-size: 2rem; letter-spacing: -0.02em; margin-top: 8px; }
    .panel-sub { color: var(--text-secondary); font-size: 0.88rem; margin: 8px 0 26px; line-height: 1.55; }
  `]
})
export class AuthShellComponent {
  @Input() eyebrow = 'Sign in';
  @Input({ required: true }) heading!: string;
  @Input() subheading = '';
  @Input() note = 'One register for hall allotment, invigilation duty and published seating.';

  brand = BRAND;

  // Decorative hall plan — uneven columns, same motif as the product.
  planColumns = [7, 5, 7, 4].map((len, id) => ({ id, benches: Array.from({ length: len }, (_, i) => i) }));
}
