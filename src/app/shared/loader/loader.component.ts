import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loader-wrap" [class.overlay]="overlay">
      <div class="spinner"></div>
      @if (message) { <p class="loader-msg">{{ message }}</p> }
    </div>
  `,
  styles: [`
    .loader-wrap {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 12px; padding: 40px;
    }
    .loader-wrap.overlay {
      position: fixed; inset: 0; background: oklch(0.55 0.02 274 / 0.32); z-index: 999;
    }
    .spinner {
      width: 42px; height: 42px;
      border: 3px solid var(--border-color);
      border-top-color: var(--accent-blue);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    .loader-msg { color: var(--text-secondary); font-size: 0.875rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class LoaderComponent {
  @Input() overlay = false;
  @Input() message = '';
}
