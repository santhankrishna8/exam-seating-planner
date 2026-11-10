import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ThemeService } from '../../../services/theme.service';
import { IconComponent, IconName } from '../../../shared/icon/icon.component';
import { BrandMarkComponent } from '../../../shared/brand-mark/brand-mark.component';
import { BRAND } from '../../../brand';

interface NavItem { route: string; icon: IconName; label: string; group: string; }

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent, BrandMarkComponent],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed()">
      <div class="sidebar-header">
        <a routerLink="/" class="brand">
          <app-brand-mark [size]="30" />
          @if (!collapsed()) {
            <span class="brand-words">
              <span class="brand-name">{{ brand.name }}</span>
              <span class="brand-desc">{{ brand.descriptor }}</span>
            </span>
          }
        </a>
        <button class="collapse-btn" (click)="collapsed.set(!collapsed())"
          [attr.aria-label]="collapsed() ? 'Expand navigation' : 'Collapse navigation'"
          [attr.aria-expanded]="!collapsed()"
          [title]="collapsed() ? 'Expand' : 'Collapse'">
          <app-icon [name]="collapsed() ? 'chevron-right' : 'chevron-left'" [size]="16" />
        </button>
      </div>

      <nav class="sidebar-nav" aria-label="Administration">
        @for (group of groups; track group) {
          @if (!collapsed()) { <span class="nav-group">{{ group }}</span> }
          @for (item of itemsIn(group); track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active" class="nav-item"
              [title]="collapsed() ? item.label : ''">
              <span class="nav-icon"><app-icon [name]="item.icon" [size]="17" /></span>
              @if (!collapsed()) { <span class="nav-label">{{ item.label }}</span> }
            </a>
          }
        }
      </nav>

      <div class="sidebar-footer">
        <button class="nav-item" (click)="theme.toggle()"
          [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
          [title]="collapsed() ? (theme.isDark() ? 'Light mode' : 'Dark mode') : ''">
          <span class="nav-icon"><app-icon [name]="theme.isDark() ? 'sun' : 'moon'" [size]="17" /></span>
          @if (!collapsed()) { <span class="nav-label">{{ theme.isDark() ? 'Light mode' : 'Dark mode' }}</span> }
        </button>
        <button class="nav-item logout" (click)="logout()" aria-label="Sign out"
          [title]="collapsed() ? 'Sign out' : ''">
          <span class="nav-icon"><app-icon name="logout" [size]="17" /></span>
          @if (!collapsed()) { <span class="nav-label">Sign out</span> }
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: var(--sidebar-width);
      min-height: 100vh;
      position: sticky; top: 0; align-self: flex-start;
      background: var(--bg-card);
      border-right: 1px solid var(--border-color);
      display: flex; flex-direction: column;
      transition: width 0.2s cubic-bezier(0.32, 0.72, 0, 1);
      flex-shrink: 0; z-index: 20;
    }
    .sidebar.collapsed { width: 64px; }

    .sidebar-header {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 0 12px; height: 62px;
      border-bottom: 1px solid var(--border-color);
    }
    .sidebar.collapsed .sidebar-header { justify-content: center; padding: 0 8px; }
    .sidebar.collapsed .collapse-btn { display: none; }
    .sidebar.collapsed:hover .collapse-btn {
      display: inline-flex; position: absolute; right: -11px; top: 21px;
      background: var(--bg-elevated); border: 1px solid var(--border-color); border-radius: 99px;
    }

    .brand { display: flex; align-items: center; gap: 9px; color: var(--text-primary); min-width: 0; }
    app-brand-mark {
      flex-shrink: 0;
    }
    .brand-words { display: flex; flex-direction: column; min-width: 0; }
    .brand-name { font-family: var(--font-head); font-weight: 600; font-size: 1.18rem; line-height: 1.05; letter-spacing: -0.01em; }
    .brand-desc {
      font-family: var(--font-mono); font-size: 0.53rem; letter-spacing: 0.13em; text-transform: uppercase;
      color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .collapse-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; flex-shrink: 0;
      border: 0; background: none; color: var(--text-muted); border-radius: 4px;
      transition: color var(--transition), background var(--transition);
    }
    .collapse-btn:hover { color: var(--text-primary); background: var(--bg-secondary); }

    .sidebar-nav { flex: 1; padding: 14px 10px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
    .nav-group {
      font-family: var(--font-mono); font-size: 0.66rem; letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--text-muted); padding: 14px 10px 5px;
    }
    .nav-group:first-child { padding-top: 2px; }

    .nav-item {
      position: relative;
      display: flex; align-items: center; gap: 11px;
      padding: 8px 10px; border-radius: var(--radius-sm);
      color: var(--text-secondary); font-size: 0.865rem; font-weight: 450;
      border: none; background: none; width: 100%; text-align: left;
      transition: background var(--transition), color var(--transition);
    }
    .nav-item:hover { background: var(--bg-secondary); color: var(--text-primary); }
    .nav-item.active { background: var(--bg-secondary); color: var(--text-primary); font-weight: 500; }
    .nav-item.active::before {
      content: ''; position: absolute; left: -10px; top: 50%; transform: translateY(-50%);
      width: 2px; height: 18px; border-radius: 0 2px 2px 0; background: var(--accent-red);
    }
    .nav-icon { flex-shrink: 0; width: 20px; display: inline-flex; align-items: center; justify-content: center; }
    .sidebar.collapsed .nav-item { justify-content: center; gap: 0; }
    .sidebar.collapsed .nav-item.active::before { left: -10px; }
    .nav-label { white-space: nowrap; overflow: hidden; }

    .sidebar-footer { padding: 10px; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 2px; }
    .logout { color: var(--text-secondary); }
    .logout:hover { background: color-mix(in oklch, var(--accent-red) 10%, transparent); color: var(--accent-red); }

    /* Below tablet the rail becomes a top bar so content keeps full width. */
    @media (max-width: 860px) {
      .sidebar, .sidebar.collapsed {
        width: 100%; min-height: 0; position: sticky; top: 0;
        flex-direction: row; align-items: center; gap: 6px;
        border-right: 0; border-bottom: 1px solid var(--border-color);
        padding: 0 12px;
      }
      .sidebar-header { border-bottom: 0; padding: 0; height: 54px; }
      .collapse-btn, .sidebar.collapsed:hover .collapse-btn { display: none !important; }
      .brand-desc { display: none; }
      .sidebar-nav { flex-direction: row; padding: 0; gap: 1px; overflow-x: auto; flex: 1; justify-content: flex-end; }
      .nav-group { display: none; }
      .nav-item.active::before { left: 50%; top: auto; bottom: -1px; transform: translateX(-50%); width: 18px; height: 2px; border-radius: 2px 2px 0 0; }
      .nav-label { display: none; }
      .sidebar-footer { flex-direction: row; border-top: 0; padding: 0; }
    }
  `]
})
export class AdminSidebarComponent {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  theme = inject(ThemeService);
  brand = BRAND;

  collapsed = signal(false);

  navItems: NavItem[] = [
    { route: '/admin/dashboard', icon: 'dashboard', label: 'Overview',  group: 'Register' },
    { route: '/admin/exams',     icon: 'document',  label: 'Examinations', group: 'Register' },
    { route: '/admin/rooms',     icon: 'building',  label: 'Halls',     group: 'Resources' },
    { route: '/admin/teachers',  icon: 'badge',     label: 'Invigilators', group: 'Resources' }
  ];

  groups = [...new Set(this.navItems.map(i => i.group))];
  itemsIn = (group: string) => this.navItems.filter(i => i.group === group);

  async logout() {
    await this.authService.logout();
    this.toastService.success('Signed out.');
    this.router.navigate(['/admin/login']);
  }
}
