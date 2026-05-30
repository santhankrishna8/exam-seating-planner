import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { BrandMarkComponent } from '../../../shared/brand-mark/brand-mark.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ToastComponent, BrandMarkComponent],
  template: `
    <app-toast />
    <div class="auth-page">
      <div class="auth-card glass-card fade-in">
        <div class="auth-logo"><app-brand-mark [size]="52" /></div>
        <h2 class="auth-title">Register College</h2>
        <p class="auth-sub text-muted">Create an admin account for your institution</p>

        <form (ngSubmit)="register()" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">College Name</label>
              <input class="form-control" type="text" [(ngModel)]="collegeName" name="collegeName" required placeholder="JNTU Hyderabad" />
            </div>
            <div class="form-group">
              <label class="form-label">College Code</label>
              <input class="form-control" type="text" [(ngModel)]="collegeCode" name="collegeCode" required placeholder="JNTU-HYD" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Admin Email</label>
            <input class="form-control" type="email" [(ngModel)]="email" name="email" required placeholder="admin@college.edu" autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-control" type="password" [(ngModel)]="password" name="password" required placeholder="Min. 6 characters" autocomplete="new-password" />
            <span class="form-hint">Minimum 6 characters</span>
          </div>
          @if (error()) {
            <p class="form-error mb-16">{{ error() }}</p>
          }
          <button type="submit" class="btn btn-primary w-full" [disabled]="loading()">
            @if (loading()) { Creating account… } @else { Create Account }
          </button>
        </form>

        <p class="auth-footer text-muted">
          Already registered? <a routerLink="/admin/login">Sign in</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .auth-card { padding: 44px 40px; width: 100%; max-width: 500px; text-align: center; }
    .auth-logo {
      margin: 0 auto 20px; width: 72px; height: 72px;
      display: flex; align-items: center; justify-content: center;
    }
    .auth-logo app-brand-mark {
      --mark-bg: var(--accent-blue); --mark-seat: oklch(1 0 0 / 0.6);
      --mark-ring: oklch(1 0 0 / 0.28); --mark-you: var(--accent-red);
      filter: drop-shadow(var(--shadow-md));
    }
    .auth-title { font-size: 1.65rem; margin-bottom: 8px; }
    .auth-sub { margin-bottom: 30px; font-size: 0.9rem; }
    .auth-footer { margin-top: 22px; font-size: 0.875rem; }
    form { text-align: left; }
  `]
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  collegeName = '';
  collegeCode = '';
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  async register() {
    this.error.set('');
    if (!this.collegeName || !this.collegeCode || !this.email || !this.password) {
      this.error.set('Please fill in all fields.'); return;
    }
    if (this.password.length < 6) { this.error.set('Password must be at least 6 characters.'); return; }
    this.loading.set(true);
    try {
      await this.authService.register(this.email, this.password, this.collegeName, this.collegeCode);
      this.router.navigate(['/admin/dashboard']);
    } catch (e: any) {
      if (e.code?.includes('email-already-in-use')) this.error.set('This email is already registered.');
      else if (e.code?.includes('weak-password')) this.error.set('Password is too weak.');
      else this.error.set('Registration failed. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
