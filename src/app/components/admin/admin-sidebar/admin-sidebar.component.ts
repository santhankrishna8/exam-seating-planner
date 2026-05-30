import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ThemeService } from '../../../services/theme.service';
import { IconComponent, IconName } from '../../../shared/icon/icon.component';
import { BrandMarkComponent } from '../../../shared/brand-mark/brand-mark.component';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent, BrandMarkComponent],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed()">
      <div class="sidebar-header">
        @if (!collapsed()) {
          <a routerLink="/" class="sidebar-brand">
            <app-brand-mark [size]="32" />
            <span class="brand-text">Seatly</span>
          </a>
        }
        <button class="collapse-btn btn btn-ghost btn-icon" (click)="collapsed.set(!collapsed())"
          [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
          [attr.aria-expanded]="!collapsed()"
          [title]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
          <app-icon [name]="collapsed() ? 'chevron-right' : 'chevron-left'" [size]="18" />
        </button>
      </div>

      <nav class="sidebar-nav">
        @for (item of navItems; track item.route) {
          <a [routerLink]="item.route" routerLinkActive="active" class="nav-item"
            [attr.aria-label]="item.label"
            [title]="collapsed() ? item.label : ''">
            <span class="nav-icon"><app-icon [name]="item.icon" [size]="19" /></span>
            @if (!collapsed()) { <span class="nav-label">{{ item.label }}</span> }
          </a>
        }
      </nav>

      <div class="sidebar-footer">
        <button class="nav-item theme-btn w-full" (click)="theme.toggle()"
          [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
          [title]="theme.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
          <span class="nav-icon"><app-icon [name]="theme.isDark() ? 'sun' : 'moon'" [size]="19" /></span>
          @if (!collapsed()) { <span class="nav-label">{{ theme.isDark() ? 'Light Mode' : 'Dark Mode' }}</span> }
        </button>
        <button class="nav-item logout-btn w-full" (click)="logout()" aria-label="Logout"
          [title]="collapsed() ? 'Logout' : ''">
          <span class="nav-icon"><app-icon name="logout" [size]="19" /></span>
          @if (!collapsed()) { <span class="nav-label">Logout</span> }
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: var(--sidebar-width); min-height: 100vh;
      position: sticky; top: 0; align-self: flex-start;
      background: var(--glass-bg-strong);
      -webkit-backdrop-filter: blur(20px) saturate(1.4);
      backdrop-filter: blur(20px) saturate(1.4);
      border-right: 1px solid var(--glass-border);
      box-shadow: var(--glass-sheen);
      display: flex; flex-direction: column;
      transition: width 0.22s cubic-bezier(0.22,1,0.36,1); flex-shrink: 0;
    }
    .sidebar.collapsed { width: 72px; }
    .sidebar-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 14px; border-bottom: 1px solid var(--border-color); height: 68px;
    }
    .sidebar.collapsed .sidebar-header { justify-content: center; }
    .sidebar-brand { display: flex; align-items: center; gap: 10px; color: var(--text-primary); text-decoration: none; overflow: hidden; }
    app-brand-mark {
      --mark-bg: var(--accent-blue); --mark-seat: oklch(1 0 0 / 0.6);
      --mark-ring: oklch(1 0 0 / 0.28); --mark-you: var(--accent-red);
      flex-shrink: 0; filter: drop-shadow(var(--shadow-sm));
    }
    .brand-text { font-family: var(--font-head); font-weight: 600; font-size: 1.15rem; white-space: nowrap; letter-spacing: -0.01em; }
    .collapse-btn { color: var(--text-muted); font-size: 1rem; flex-shrink: 0; }
    .sidebar-nav { flex: 1; padding: 16px 12px; display: flex; flex-direction: column; gap: 5px; }
    .nav-item {
      position: relative;
      display: flex; align-items: center; gap: 13px; padding: 11px 13px;
      border-radius: var(--radius-sm); color: var(--text-secondary);
      text-decoration: none; font-size: 0.9rem; font-weight: 500;
      transition: all var(--transition); border: none; background: none; cursor: pointer; width: 100%;
    }
    .nav-item:hover { background: var(--border-color); color: var(--text-primary); }
    .nav-item.active { background: oklch(0.42 0.13 274 / 0.12); color: var(--accent-blue); }
    .nav-item.active::before {
      content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
      width: 3px; height: 60%; border-radius: 99px; background: var(--grad-brand);
    }
    .nav-icon { flex-shrink: 0; width: 22px; display: inline-flex; align-items: center; justify-content: center; }
    .sidebar.collapsed .nav-item { justify-content: center; }
    .nav-label { white-space: nowrap; overflow: hidden; }
    .sidebar-footer { padding: 14px 12px; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 5px; }
    .theme-btn { color: var(--text-secondary); }
    .theme-btn:hover { background: var(--border-color); color: var(--text-primary); }
    .logout-btn { color: var(--accent-red); }
    .logout-btn:hover { background: oklch(0.50 0.19 25 / 0.12); color: var(--accent-red); }
  `]
})
export class AdminSidebarComponent {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  theme = inject(ThemeService);

  collapsed = signal(false);

  navItems: { route: string; icon: IconName; label: string }[] = [
    { route: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { route: '/admin/rooms', icon: 'building', label: 'Rooms' },
    { route: '/admin/teachers', icon: 'badge', label: 'Teachers' },
    { route: '/admin/exams', icon: 'document', label: 'Exams' }
  ];

  async logout() {
    await this.authService.logout();
    this.toastService.success('Logged out successfully.');
    this.router.navigate(['/admin/login']);
  }
}
