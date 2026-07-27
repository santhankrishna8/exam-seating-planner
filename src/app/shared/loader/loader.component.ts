import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loader" [class.overlay]="overlay" role="status" [attr.aria-label]="message || 'Loading'">
      <div class="ruler" aria-hidden="true"><span></span></div>
      @if (message) { <p class="loader-msg">{{ message }}</p> }
    </div>
  `,
  styles: [`
    .loader { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 64px 24px; }
    .loader.overlay { position: fixed; inset: 0; z-index: 999; background: color-mix(in oklch, var(--bg-primary) 78%, transparent); }
    /* A ruling being drawn, not a spinner — it belongs to the register motif. */
    .ruler { width: 168px; height: 2px; background: var(--border-color); border-radius: 2px; overflow: hidden; }
    .ruler span { display: block; width: 40%; height: 100%; background: var(--accent-blue); animation: rule 1.15s cubic-bezier(0.65, 0, 0.35, 1) infinite; }
    @keyframes rule {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(350%); }
    }
    .loader-msg { color: var(--text-muted); font-size: 0.83rem; }
    @media (prefers-reduced-motion: reduce) { .ruler span { animation: none; width: 100%; opacity: 0.5; } }
  `]
})
export class LoaderComponent {
  @Input() overlay = false;
  @Input() message = '';
}
