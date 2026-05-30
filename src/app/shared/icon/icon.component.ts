import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export type IconName =
  | 'dashboard' | 'building' | 'seat' | 'document' | 'check-circle' | 'search'
  | 'pin' | 'plus' | 'clipboard' | 'logout' | 'sun' | 'moon' | 'printer'
  | 'upload' | 'file' | 'bolt' | 'send' | 'eye' | 'pencil' | 'trash'
  | 'calendar' | 'clock' | 'users' | 'arrow-left' | 'arrow-right'
  | 'chevron-left' | 'chevron-right' | 'shuffle' | 'list-ordered' | 'inbox'
  | 'x-circle' | 'info' | 'alert' | 'badge';

// Hand-tuned 24×24 stroke geometry, single source of truth.
// No emoji anywhere in the product UI — icons read as crafted, not AI-default.
const PATHS: Record<IconName, string> = {
  'dashboard': '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  'building': '<path d="M3 21h18"/><path d="M5 21V5l7-2v18"/><path d="M19 21V9l-7-4"/><path d="M9 9h.01M9 13h.01M9 17h.01"/>',
  'seat': '<path d="M5 11V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5"/><path d="M4 11h16a1 1 0 0 1 1 1v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a1 1 0 0 1 1-1Z"/><path d="M6 17v3M18 17v3"/>',
  'document': '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M5 3h9l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M9 13h6M9 17h4"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5L16 9"/>',
  'search': '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  'pin': '<path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10Z"/><circle cx="12" cy="11" r="2.2"/>',
  'plus': '<path d="M12 5v14M5 12h14"/>',
  'clipboard': '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M9 12h6M9 16h4"/>',
  'logout': '<path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  'moon': '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
  'printer': '<path d="M6 9V3h12v6"/><path d="M6 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1"/><rect x="6" y="14" width="12" height="7" rx="1"/>',
  'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 9l5-5 5 5"/><path d="M12 4v12"/>',
  'file': '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M5 3h9l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/>',
  'bolt': '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  'send': '<path d="M21 3 10.5 13.5"/><path d="M21 3l-6.5 18a.5.5 0 0 1-.9 0L10.5 13.5 3 9.9a.5.5 0 0 1 0-.9L21 3Z"/>',
  'eye': '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  'pencil': '<path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3Z"/><path d="M14.5 6.5l3 3"/>',
  'trash': '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M9 7V4h6v3"/>',
  'calendar': '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
  'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  'users': '<circle cx="9" cy="8" r="3.2"/><path d="M3 21v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1"/><path d="M16 4.2a3.2 3.2 0 0 1 0 6.2M21 21v-1a5 5 0 0 0-4-4.9"/>',
  'arrow-left': '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>',
  'chevron-left': '<path d="M15 18l-6-6 6-6"/>',
  'chevron-right': '<path d="M9 18l6-6-6-6"/>',
  'shuffle': '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/>',
  'list-ordered': '<path d="M11 6h10M11 12h10M11 18h10"/><path d="M4 6h1v4M4 10h2"/><path d="M4 15h2a1 1 0 0 1 0 2l-2 2h2"/>',
  'inbox': '<path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/>',
  'x-circle': '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
  'info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  'alert': '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  'badge': '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6.5 16a2.6 2.6 0 0 1 5 0"/><path d="M15 10h3.5M15 13h3.5"/>',
};

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size" [attr.height]="size"
      viewBox="0 0 24 24" fill="none"
      [attr.stroke-width]="strokeWidth"
      stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
      class="icon" aria-hidden="true" focusable="false"
      [innerHTML]="svg"></svg>
  `,
  styles: [`
    :host { display: inline-flex; line-height: 0; }
    .icon { display: block; }
  `]
})
export class IconComponent {
  private sanitizer = inject(DomSanitizer);
  private static cache = new Map<IconName, SafeHtml>();

  @Input({ required: true }) name!: IconName;
  @Input() size = 20;
  @Input() strokeWidth = 1.75;

  get svg(): SafeHtml {
    let html = IconComponent.cache.get(this.name);
    if (!html) {
      // Paths are compile-time constants from PATHS — safe to trust.
      html = this.sanitizer.bypassSecurityTrustHtml(PATHS[this.name] ?? '');
      IconComponent.cache.set(this.name, html);
    }
    return html;
  }
}
