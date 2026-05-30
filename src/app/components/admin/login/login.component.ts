import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { BrandMarkComponent } from '../../../shared/brand-mark/brand-mark.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ToastComponent, BrandMarkComponent],
  template: `
    <app-toast />
    <div class="auth-page">
      <div class="auth-card glass-card fade-in">
        <div class="auth-logo"><app-brand-mark [size]="52" /></div>
        <h2 class="auth-title">Admin Login</h2>
        <p class="auth-sub text-muted">Sign in to manage your exam seating</p>

        <form (ngSubmit)="login()" #f="ngForm" novalidate>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-control" type="email" [(ngModel)]="email" name="email" required placeholder="admin@college.edu" autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-control" type="password" [(ngModel)]="password" name="password" required placeholder="••••••••" autocomplete="current-password" />
          </div>
          @if (error()) {
            <p class="form-error mb-16">{{ error() }}</p>
          }
          <button type="submit" class="btn btn-primary w-full" [disabled]="loading()">
            @if (loading()) { Signing in… } @else { Sign In }
          </button>
        </form>

        <p class="auth-footer text-muted">
          Don't have an account? <a routerLink="/admin/register">Register college</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .auth-card { padding: 44px 40px; width: 100%; max-width: 440px; text-align: center; }
    .auth-logo {
      margin: 0 auto 20px; width: 72px; height: 72px;
      display: flex; align-items: center; justify-content: center;
    }
    .auth-logo app-brand-mark {
      --mark-bg: var(--accent-blue); --mark-seat: oklch(1 0 0 / 0.6);
      --mark-ring: oklch(1 0 0 / 0.28); --mark-you: var(--accent-red);
      filter: drop-shadow(var(--shadow-md));
    }
    .auth-title { font-size: 1.8rem; margin-bottom: 8px; }
    .auth-sub { margin-bottom: 30px; font-size: 0.9rem; }
    .auth-footer { margin-top: 22px; font-size: 0.875rem; }
    form { text-align: left; }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  async login() {
    this.error.set('');
    if (!this.email || !this.password) { this.error.set('Please fill in all fields.'); return; }
    this.loading.set(true);
    try {
      await this.authService.login(this.email, this.password);
      this.router.navigate(['/admin/dashboard']);
    } catch (e: any) {
      this.error.set(this.friendlyError(e.code));
    } finally {
      this.loading.set(false);
    }
  }

  private friendlyError(code: string): string {
    if (code?.includes('user-not-found') || code?.includes('wrong-password') || code?.includes('invalid-credential')) return 'Invalid email or password.';
    if (code?.includes('too-many-requests')) return 'Too many attempts. Please try again later.';
    return 'Login failed. Please try again.';
  }
}
