import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { AuthShellComponent } from '../../../shared/auth-shell/auth-shell.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ToastComponent, AuthShellComponent],
  template: `
    <app-toast />
    <app-auth-shell
      eyebrow="Examination office"
      heading="Sign in"
      subheading="Access hall allotment, invigilation duty and the published register for your institution."
      note="Every seat, every invigilator, on one register.">

      <form (ngSubmit)="login()" novalidate>
        <div class="form-group">
          <label class="form-label" for="login-email">Email</label>
          <input id="login-email" class="form-control" type="email" [(ngModel)]="email" name="email"
            required placeholder="office@college.edu" autocomplete="email" />
        </div>
        <div class="form-group">
          <label class="form-label" for="login-password">Password</label>
          <input id="login-password" class="form-control" type="password" [(ngModel)]="password" name="password"
            required placeholder="••••••••" autocomplete="current-password" />
        </div>

        @if (error()) { <p class="form-error mb-16" role="alert">{{ error() }}</p> }

        <button type="submit" class="btn btn-primary w-full btn-lg" [disabled]="loading()">
          {{ loading() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="alt">No account yet? <a routerLink="/admin/register">Register your institution</a></p>
    </app-auth-shell>
  `,
  styles: [`
    .alt { margin-top: 14px; font-size: 0.85rem; color: var(--text-muted); }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  async login() {
    this.error.set('');
    if (!this.email || !this.password) { this.error.set('Enter your email and password.'); return; }
    this.loading.set(true);
    try {
      await this.authService.login(this.email, this.password);
      this.router.navigate(['/admin/dashboard']);
    } catch (e: any) {
      this.error.set(this.friendlyError(e?.code));
    } finally {
      this.loading.set(false);
    }
  }

  private friendlyError(code: string): string {
    if (code?.includes('user-not-found') || code?.includes('wrong-password') || code?.includes('invalid-credential')) return 'Invalid email or password.';
    if (code?.includes('too-many-requests')) return 'Too many attempts. Try again in a few minutes.';
    if (code?.includes('network')) return 'Network unavailable. Check your connection and try again.';
    return 'Sign-in failed. Please try again.';
  }
}
