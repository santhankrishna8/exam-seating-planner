import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

// Product logomark: an examination "seal" enclosing a 3×3 seat grid with one
// seat stamped in seal-red — the "your seat" motif that runs through the app.
// Deliberately bespoke so the brand never reads as a stock/AI emoji.
@Component({
  selector: 'app-brand-mark',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 40 40" fill="none"
         class="mark" aria-hidden="true" focusable="false">
      <rect x="1.5" y="1.5" width="37" height="37" rx="9"
            fill="var(--mark-bg, currentColor)" />
      <rect x="4.5" y="4.5" width="31" height="31" rx="6.5"
            fill="none" stroke="var(--mark-ring, rgba(255,255,255,0.28))" stroke-width="1" />
      <g fill="var(--mark-seat, rgba(255,255,255,0.55))">
        <rect x="11" y="11" width="5" height="5" rx="1.2"/>
        <rect x="17.5" y="11" width="5" height="5" rx="1.2"/>
        <rect x="24" y="11" width="5" height="5" rx="1.2"/>
        <rect x="11" y="17.5" width="5" height="5" rx="1.2"/>
        <rect x="24" y="17.5" width="5" height="5" rx="1.2"/>
        <rect x="11" y="24" width="5" height="5" rx="1.2"/>
        <rect x="17.5" y="24" width="5" height="5" rx="1.2"/>
        <rect x="24" y="24" width="5" height="5" rx="1.2"/>
      </g>
      <rect x="17.5" y="17.5" width="5" height="5" rx="1.2" fill="var(--mark-you, #e5484d)"/>
    </svg>
  `,
  styles: [`
    :host { display: inline-flex; line-height: 0; }
    .mark { display: block; }
  `]
})
export class BrandMarkComponent {
  @Input() size = 38;
}
