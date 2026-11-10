import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

// Invigil logomark: an examination seal. A squared stamp with a hairline
// inner rule enclosing a hall plan — three columns of benches viewed from
// above, with a single bench struck in seal red (the allotted seat).
// Bespoke geometry on purpose: the mark must never read as stock artwork.
@Component({
  selector: 'app-brand-mark',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 40 40" fill="none"
         class="mark" aria-hidden="true" focusable="false">
      <rect x="0.5" y="0.5" width="39" height="39" rx="11"
            fill="var(--mark-bg, currentColor)" />
      <rect x="4" y="4" width="32" height="32" rx="7"
            fill="none" stroke="var(--mark-ring, rgba(255,255,255,0.26))" stroke-width="0.9" />

      <!-- hall plan: three columns of benches, drawn as ruled bars -->
      <g fill="var(--mark-seat, rgba(255,255,255,0.58))">
        <rect x="8"    y="10.4" width="7" height="2.6" rx="0.6"/>
        <rect x="16.5" y="10.4" width="7" height="2.6" rx="0.6"/>
        <rect x="25"   y="10.4" width="7" height="2.6" rx="0.6"/>

        <rect x="8"    y="18.7" width="7" height="2.6" rx="0.6"/>
        <rect x="25"   y="18.7" width="7" height="2.6" rx="0.6"/>

        <rect x="8"    y="27" width="7" height="2.6" rx="0.6"/>
        <rect x="16.5" y="27" width="7" height="2.6" rx="0.6"/>
        <rect x="25"   y="27" width="7" height="2.6" rx="0.6"/>
      </g>

      <!-- the allotted bench -->
      <rect x="16.5" y="18.7" width="7" height="2.6" rx="0.6" fill="var(--mark-you, #ffd633)"/>
    </svg>
  `,
  styles: [`
    :host { display: inline-flex; line-height: 0; }
    .mark { display: block; }
  `]
})
export class BrandMarkComponent {
  @Input() size = 36;
}
