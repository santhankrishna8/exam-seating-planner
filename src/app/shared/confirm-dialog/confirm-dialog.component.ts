import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible) {
      <div class="backdrop" (click)="cancel.emit()">
        <div class="dialog glass-card fade-in" (click)="$event.stopPropagation()">
          <h3>{{ title }}</h3>
          <p>{{ message }}</p>
          <div class="dialog-actions">
            <button class="btn btn-outline" (click)="cancel.emit()">Cancel</button>
            <button class="btn btn-danger" (click)="confirm.emit()">{{ confirmLabel }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .backdrop {
      position: fixed; inset: 0; background: oklch(0.12 0.02 268 / 0.5); z-index: 9000;
      -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center; padding: 16px;
      animation: backdropIn 0.2s ease both;
    }
    @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
    .dialog { padding: 28px; max-width: 420px; width: 100%; }
    h3 { font-size: 1.1rem; margin-bottom: 8px; }
    p { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 24px; }
    .dialog-actions { display: flex; gap: 10px; justify-content: flex-end; }
  `]
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() title = 'Are you sure?';
  @Input() message = 'This action cannot be undone.';
  @Input() confirmLabel = 'Delete';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
