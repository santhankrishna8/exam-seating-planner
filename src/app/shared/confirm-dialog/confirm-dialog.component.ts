import {
  Component, Input, Output, EventEmitter, ElementRef, ViewChild,
  OnChanges, SimpleChanges, HostListener, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

let dialogSeq = 0;

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible) {
      <div class="backdrop" (click)="cancel.emit()">
        <div class="dialog card" role="dialog" aria-modal="true"
          [attr.aria-labelledby]="titleId" [attr.aria-describedby]="messageId"
          (click)="$event.stopPropagation()">
          <h3 [id]="titleId">{{ title }}</h3>
          <p [id]="messageId">{{ message }}</p>
          <div class="dialog-actions">
            <button #cancelBtn type="button" class="btn btn-outline" (click)="cancel.emit()">Cancel</button>
            <button type="button" class="btn" [class.btn-danger]="destructive" [class.btn-primary]="!destructive"
              (click)="confirm.emit()">{{ confirmLabel }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .backdrop {
      position: fixed; inset: 0; z-index: 9000;
      background: oklch(0.12 0.01 258 / 0.55);
      -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
      display: flex; align-items: center; justify-content: center; padding: 16px;
      animation: backdropIn 0.14s ease both;
    }
    @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
    .dialog {
      padding: 24px; max-width: 430px; width: 100%;
      box-shadow: var(--shadow-lg);
      animation: dialogIn 0.18s cubic-bezier(0.32, 0.72, 0, 1) both;
    }
    @keyframes dialogIn { from { opacity: 0; transform: translateY(8px) scale(0.99); } to { opacity: 1; transform: none; } }
    h3 { font-size: 1.2rem; margin-bottom: 8px; }
    p { color: var(--text-secondary); font-size: 0.88rem; line-height: 1.55; margin-bottom: 22px; }
    .dialog-actions { display: flex; gap: 8px; justify-content: flex-end; }
    @media (prefers-reduced-motion: reduce) { .dialog, .backdrop { animation: none; } }
  `]
})
export class ConfirmDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() title = 'Are you sure?';
  @Input() message = 'This action cannot be undone.';
  @Input() confirmLabel = 'Delete';
  /** Destructive confirmations get the red face; everything else gets ink. */
  @Input() destructive = true;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('cancelBtn') private cancelBtn?: ElementRef<HTMLButtonElement>;

  private readonly seq = ++dialogSeq;
  readonly titleId = `confirm-title-${this.seq}`;
  readonly messageId = `confirm-message-${this.seq}`;

  ngOnChanges(changes: SimpleChanges) {
    // Move focus into the dialog so Escape and Tab behave, and so a screen
    // reader announces the prompt instead of leaving focus behind it.
    if (changes['visible']?.currentValue) {
      queueMicrotask(() => this.cancelBtn?.nativeElement.focus());
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.visible) this.cancel.emit(); }
}
