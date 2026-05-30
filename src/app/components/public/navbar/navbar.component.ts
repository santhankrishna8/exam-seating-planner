import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../services/theme.service';
import { IconComponent } from '../../../shared/icon/icon.component';
import { BrandMarkComponent } from '../../../shared/brand-mark/brand-mark.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent, BrandMarkComponent],
  template: `
    <nav class="navbar">
      <div class="nav-inner">
        <a class="nav-brand" routerLink="/">
          <app-brand-mark [size]="34" />
          <span class="brand-text">Seatly</span>
        </a>
        <div class="nav-links">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="nav-link">Home</a>
          <button class="theme-toggle btn btn-ghost btn-icon" (click)="theme.toggle()"
            [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
            [title]="theme.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
            <app-icon [name]="theme.isDark() ? 'sun' : 'moon'" [size]="18" />
          </button>
          <a routerLink="/admin/login" class="btn btn-outline btn-sm">Admin Login</a>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      position: sticky; top: 0; z-index: 100;
      background: var(--glass-bg-strong);
      -webkit-backdrop-filter: saturate(1.4) blur(18px);
      backdrop-filter: saturate(1.4) blur(18px);
      border-bottom: 1px solid var(--glass-border);
      box-shadow: var(--glass-sheen);
      transition: background 0.3s;
    }
    .nav-inner {
      max-width: 1240px; margin: 0 auto; padding: 0 24px;
      height: 68px; display: flex; align-items: center; justify-content: space-between;
    }
    .nav-brand { display: flex; align-items: center; gap: 11px; text-decoration: none; color: var(--text-primary); }
    app-brand-mark {
      --mark-bg: var(--accent-blue); --mark-seat: oklch(1 0 0 / 0.62);
      --mark-ring: oklch(1 0 0 / 0.28); --mark-you: var(--accent-red);
      filter: drop-shadow(var(--shadow-sm));
    }
    .brand-text { font-family: var(--font-head); font-size: 1.3rem; font-weight: 600; letter-spacing: -0.01em; }
    .nav-links { display: flex; align-items: center; gap: 14px; }
    .nav-link { color: var(--text-secondary); font-size: 0.9rem; font-weight: 500; transition: color var(--transition); text-decoration: none; }
    .nav-link:hover, .nav-link.active { color: var(--text-primary); }
    .theme-toggle { padding: 9px; border-radius: var(--radius-sm); }
  `]
})
export class NavbarComponent {
  theme = inject(ThemeService);
}
