import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../services/theme.service';
import { IconComponent } from '../../../shared/icon/icon.component';
import { BrandMarkComponent } from '../../../shared/brand-mark/brand-mark.component';
import { BRAND } from '../../../brand';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent, BrandMarkComponent],
  template: `
    <header class="topbar">
      <div class="nav-inner">
        <a class="brand" routerLink="/">
          <app-brand-mark [size]="30" />
          <span class="brand-words">
            <span class="brand-name">{{ brand.name }}</span>
            <span class="brand-desc">{{ brand.descriptor }}</span>
          </span>
        </a>

        <nav class="nav-links" aria-label="Primary">
          <button class="icon-btn" (click)="theme.toggle()"
            [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
            [title]="theme.isDark() ? 'Light mode' : 'Dark mode'">
            <app-icon [name]="theme.isDark() ? 'sun' : 'moon'" [size]="17" />
          </button>
          <a routerLink="/teacher/login" class="nav-link">Invigilators</a>
          <a routerLink="/admin/login" class="btn btn-outline btn-sm">Examination office</a>
        </nav>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      position: sticky; top: 0; z-index: 100;
      background: color-mix(in oklch, var(--bg-primary) 88%, transparent);
      -webkit-backdrop-filter: saturate(1.2) blur(10px);
      backdrop-filter: saturate(1.2) blur(10px);
      border-bottom: 1px solid var(--border-color);
    }
    .nav-inner {
      max-width: 1220px; margin: 0 auto; padding: 0 24px;
      height: 62px; display: flex; align-items: center; justify-content: space-between; gap: 16px;
    }
    .brand { display: flex; align-items: center; gap: 10px; color: var(--text-primary); min-width: 0; }
    app-brand-mark {
      --mark-bg: var(--ink-face);
      --mark-seat: color-mix(in oklch, var(--ink-text) 45%, transparent);
      --mark-ring: color-mix(in oklch, var(--ink-text) 22%, transparent);
      --mark-you: var(--accent-red);
      flex-shrink: 0;
    }
    .brand-words { display: flex; flex-direction: column; min-width: 0; }
    .brand-name { font-family: var(--font-head); font-weight: 600; font-size: 1.22rem; line-height: 1.05; letter-spacing: -0.01em; }
    .brand-desc {
      font-family: var(--font-mono); font-size: 0.53rem; letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--text-muted); white-space: nowrap;
    }

    .nav-links { display: flex; align-items: center; gap: 14px; }
    .nav-link { color: var(--text-secondary); font-size: 0.87rem; }
    .nav-link:hover { color: var(--text-primary); }
    .icon-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border: 1px solid transparent; border-radius: var(--radius-sm);
      background: none; color: var(--text-secondary);
      transition: color var(--transition), background var(--transition), border-color var(--transition);
    }
    .icon-btn:hover { color: var(--text-primary); background: var(--bg-secondary); border-color: var(--border-color); }

    @media (max-width: 560px) {
      .nav-inner { padding: 0 16px; }
      .brand-desc { display: none; }
      .nav-links { gap: 8px; }
      .nav-link { display: none; }
    }
  `]
})
export class NavbarComponent {
  theme = inject(ThemeService);
  brand = BRAND;
}
