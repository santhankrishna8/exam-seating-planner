import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';
import { IconComponent, IconName } from '../icon/icon.component';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="false">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast-{{ toast.type }}" role="status">
          <span class="toast-icon"><app-icon [name]="icons[toast.type]" [size]="17" /></span>
          <span class="toast-msg">{{ toast.message }}</span>
          <button class="toast-close" (click)="toastService.dismiss(toast.id)" aria-label="Dismiss notification">
            <app-icon name="x-circle" [size]="15" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed; bottom: 20px; right: 20px; z-index: 10000;
      display: flex; flex-direction: column; gap: 8px;
      max-width: 380px; width: calc(100vw - 40px);
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      display: flex; align-items: flex-start; gap: 10px;
      padding: 11px 13px;
      border-radius: var(--radius-md);
      background: var(--bg-elevated);
      border: 1px solid var(--border-strong);
      border-left-width: 3px;
      box-shadow: var(--shadow-lg);
      font-size: 0.86rem; line-height: 1.45; color: var(--text-primary);
      animation: toastIn 0.22s cubic-bezier(0.32, 0.72, 0, 1) both;
    }
    @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    .toast-success { border-left-color: var(--accent-green); }
    .toast-success .toast-icon { color: var(--accent-green); }
    .toast-error { border-left-color: var(--accent-red); }
    .toast-error .toast-icon { color: var(--accent-red); }
    .toast-info { border-left-color: var(--accent-blue); }
    .toast-info .toast-icon { color: var(--accent-blue); }
    .toast-icon { flex-shrink: 0; display: inline-flex; padding-top: 1px; }
    .toast-msg { flex: 1; min-width: 0; }
    .toast-close {
      flex-shrink: 0; display: inline-flex; background: none; border: 0; color: var(--text-muted);
      padding: 2px; border-radius: 3px; transition: color var(--transition);
    }
    .toast-close:hover { color: var(--text-primary); }
    @media (max-width: 520px) { .toast-stack { left: 16px; right: 16px; bottom: 16px; width: auto; max-width: none; } }
    @media print { .toast-stack { display: none !important; } }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
  icons: Record<'success' | 'error' | 'info', IconName> = {
    success: 'check-circle', error: 'x-circle', info: 'info'
  };
}
