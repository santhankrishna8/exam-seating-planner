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
        <a class="brand" routerLink="/" aria-label="Invigil home">
          <app-brand-mark [size]="36" />
          <app-brand-mark part="word" [size]="22" />
        </a>

        <nav class="nav-links" aria-label="Primary">
          <a routerLink="/" fragment="find" class="nav-link">Find my seat</a>
          <a routerLink="/" fragment="how" class="nav-link">How it works</a>
          <a routerLink="/" fragment="office" class="nav-link">For colleges</a>
        </nav>

        <div class="nav-actions">
          <a routerLink="/admin/login" class="btn btn-primary btn-sm office">Office sign in</a>
          <button class="icon-btn" (click)="theme.toggle()"
            [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
            [title]="theme.isDark() ? 'Light mode' : 'Dark mode'">
            <app-icon [name]="theme.isDark() ? 'sun' : 'moon'" [size]="18" />
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .topbar { position: sticky; top: 0; z-index: 100; }
    .nav-inner {
      max-width: 1220px; margin: 0 auto; padding: 14px 24px;
      display: flex; align-items: center; gap: 24px;
    }
    .brand { display: flex; align-items: center; gap: 10px; color: var(--text-primary); }
    .brand:hover { color: var(--text-primary); }
    .brand-name { font-family: var(--font-head); font-weight: 800; font-size: 1.45rem; letter-spacing: -0.04em; }
    .nav-links { display: flex; align-items: center; gap: 6px; flex: 1; }
    .nav-link { padding: 8px 12px; border-radius: 99px; color: var(--text-primary); font-size: 0.95rem; font-weight: 500; }
    .nav-link:hover { background: color-mix(in srgb, var(--bg-card) 60%, transparent); color: var(--text-primary); }
    .nav-actions { display: flex; align-items: center; gap: 10px; }
    .icon-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 40px; height: 40px; border: 1px solid var(--border-color); border-radius: 12px;
      background: var(--bg-card); color: var(--text-primary); box-shadow: var(--shadow-sm);
      transition: transform var(--transition), box-shadow var(--transition);
    }
    .icon-btn:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }
    @media (max-width: 720px) {
      .nav-inner { padding: 10px 16px; gap: 12px; }
      .nav-links { display: none; }
      .nav-actions { margin-left: auto; }
    }
  `]
})
export class NavbarComponent {
  theme = inject(ThemeService);
  brand = BRAND;
}
