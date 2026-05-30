import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';
import { IconComponent, IconName } from '../icon/icon.component';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="toast-container" aria-live="polite" aria-atomic="true">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast-{{ toast.type }} fade-in" role="status">
          <span class="toast-icon"><app-icon [name]="icons[toast.type]" [size]="18" /></span>
          <span class="toast-msg">{{ toast.message }}</span>
          <button class="toast-close" (click)="toastService.dismiss(toast.id)" aria-label="Dismiss notification">
            <app-icon name="x-circle" [size]="15" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed; bottom: 24px; right: 24px;
      display: flex; flex-direction: column; gap: 10px; z-index: 10000;
      max-width: 380px; width: calc(100vw - 48px);
    }
    .toast {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: 12px;
      background: var(--glass-bg-strong);
      -webkit-backdrop-filter: blur(18px) saturate(1.5);
      backdrop-filter: blur(18px) saturate(1.5);
      border: 1px solid var(--glass-border);
      box-shadow: var(--shadow-lg), var(--glass-sheen); font-size: 0.875rem; color: var(--text-primary);
    }
    .toast-success { border-left: 3px solid var(--accent-green); }
    .toast-success .toast-icon { color: var(--accent-green); }
    .toast-error { border-left: 3px solid var(--accent-red); }
    .toast-error .toast-icon { color: var(--accent-red); }
    .toast-info { border-left: 3px solid var(--accent-blue); }
    .toast-info .toast-icon { color: var(--accent-blue); }
    .toast-icon { flex-shrink: 0; display: inline-flex; }
    .toast-msg { flex: 1; }
    .toast-close {
      display: inline-flex; background: none; border: none; color: var(--text-muted);
      cursor: pointer; padding: 3px; border-radius: 4px; transition: color 0.2s;
    }
    .toast-close:hover { color: var(--text-primary); }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
  icons: Record<'success' | 'error' | 'info', IconName> = {
    success: 'check-circle', error: 'x-circle', info: 'info'
  };
}
