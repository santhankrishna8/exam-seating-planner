import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { BrandMarkComponent } from '../../../shared/brand-mark/brand-mark.component';

@Component({
  selector: 'app-teacher-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ToastComponent, BrandMarkComponent],
  template: `
    <app-toast />
    <div class="auth-page">
      <div class="auth-card glass-card fade-in">
        <div class="auth-logo"><app-brand-mark [size]="52" /></div>
        <h2 class="auth-title">Invigilator Portal</h2>
        <p class="auth-sub text-muted">
          {{ mode() === 'signup' ? 'Create your account' : 'Sign in' }} with the email your college registered for you.
        </p>

        <form (ngSubmit)="submit()" #f="ngForm" novalidate>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-control" type="email" [(ngModel)]="email" name="email" required placeholder="teacher@college.edu" autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-control" type="password" [(ngModel)]="password" name="password" required placeholder="••••••••" [attr.autocomplete]="mode() === 'signup' ? 'new-password' : 'current-password'" />
            @if (mode() === 'signup') { <span class="form-hint">Minimum 6 characters.</span> }
          </div>
          @if (error()) { <p class="form-error mb-16">{{ error() }}</p> }
          <button type="submit" class="btn btn-primary w-full" [disabled]="loading()">
            @if (loading()) { Please wait… } @else { {{ mode() === 'signup' ? 'Create Account' : 'Sign In' }} }
          </button>
        </form>

        <p class="auth-footer text-muted">
          @if (mode() === 'signup') {
            Already have an account? <a (click)="switch('signin')" class="link">Sign in</a>
          } @else {
            First time here? <a (click)="switch('signup')" class="link">Create account</a>
          }
        </p>
        <p class="auth-footer text-muted"><a routerLink="/admin/login">College admin login →</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .auth-card { padding: 44px 40px; width: 100%; max-width: 440px; text-align: center; }
    .auth-logo { margin: 0 auto 20px; width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; }
    .auth-logo app-brand-mark { --mark-bg: var(--accent-blue); --mark-seat: oklch(1 0 0 / 0.6); --mark-ring: oklch(1 0 0 / 0.28); --mark-you: var(--accent-red); filter: drop-shadow(var(--shadow-md)); }
    .auth-title { font-size: 1.7rem; margin-bottom: 8px; }
    .auth-sub { margin-bottom: 28px; font-size: 0.9rem; }
    .auth-footer { margin-top: 16px; font-size: 0.875rem; }
    form { text-align: left; }
    .link { color: var(--accent-blue); cursor: pointer; }
  `]
})
export class TeacherLoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  mode = signal<'signin' | 'signup'>('signin');
  loading = signal(false);
  error = signal('');

  switch(m: 'signin' | 'signup') { this.mode.set(m); this.error.set(''); }

  async submit() {
    this.error.set('');
    if (!this.email || !this.password) { this.error.set('Please fill in all fields.'); return; }
    if (this.mode() === 'signup' && this.password.length < 6) { this.error.set('Password must be at least 6 characters.'); return; }
    this.loading.set(true);
    try {
      if (this.mode() === 'signup') await this.authService.signUp(this.email, this.password);
      else await this.authService.login(this.email, this.password);
      this.router.navigate(['/teacher']);
    } catch (e: any) {
      this.error.set(this.friendly(e?.code));
    } finally { this.loading.set(false); }
  }

  private friendly(code: string): string {
    if (code?.includes('email-already-in-use')) return 'This email already has an account — try signing in.';
    if (code?.includes('invalid-credential') || code?.includes('wrong-password') || code?.includes('user-not-found')) return 'Invalid email or password.';
    if (code?.includes('weak-password')) return 'Password is too weak.';
    if (code?.includes('too-many-requests')) return 'Too many attempts. Try again later.';
    return 'Something went wrong. Please try again.';
  }
}
