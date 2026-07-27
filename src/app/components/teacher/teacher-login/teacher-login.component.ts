import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { AuthShellComponent } from '../../../shared/auth-shell/auth-shell.component';

@Component({
  selector: 'app-teacher-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ToastComponent, AuthShellComponent],
  template: `
    <app-toast />
    <app-auth-shell
      eyebrow="Invigilator portal"
      [heading]="signingUp() ? 'Create account' : 'Sign in'"
      subheading="Use the email your examination office recorded for you — duties are matched to that address."
      note="Your duties, your hall, your attendance sheet.">

      <form (ngSubmit)="submit()" novalidate>
        <div class="form-group">
          <label class="form-label" for="tl-email">Email</label>
          <input id="tl-email" class="form-control" type="email" [(ngModel)]="email" name="email"
            required placeholder="teacher@college.edu" autocomplete="email" />
        </div>
        <div class="form-group">
          <label class="form-label" for="tl-password">Password</label>
          <input id="tl-password" class="form-control" type="password" [(ngModel)]="password" name="password"
            required placeholder="••••••••"
            [attr.autocomplete]="signingUp() ? 'new-password' : 'current-password'" />
          @if (signingUp()) { <span class="form-hint">Minimum 6 characters.</span> }
        </div>

        @if (error()) { <p class="form-error mb-16" role="alert">{{ error() }}</p> }

        <button type="submit" class="btn btn-primary w-full btn-lg" [disabled]="loading()">
          {{ loading() ? 'Please wait…' : signingUp() ? 'Create account' : 'Sign in' }}
        </button>
      </form>

      <p class="alt">
        @if (signingUp()) {
          Already have an account?
          <button type="button" class="linkish" (click)="switch('signin')">Sign in</button>
        } @else {
          First time here?
          <button type="button" class="linkish" (click)="switch('signup')">Create an account</button>
        }
      </p>
      <p class="alt"><a routerLink="/admin/login">Examination office →</a></p>
    </app-auth-shell>
  `,
  styles: [`
    .alt { margin-top: 14px; font-size: 0.85rem; color: var(--text-muted); }
    .linkish { background: none; border: 0; padding: 0; font: inherit; color: var(--accent-blue); }
    .linkish:hover { color: var(--accent-blue-hover); text-decoration: underline; }
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

  signingUp = () => this.mode() === 'signup';
  switch(m: 'signin' | 'signup') { this.mode.set(m); this.error.set(''); }

  async submit() {
    this.error.set('');
    if (!this.email || !this.password) { this.error.set('Enter your email and password.'); return; }
    if (this.signingUp() && this.password.length < 6) { this.error.set('Password must be at least 6 characters.'); return; }

    this.loading.set(true);
    try {
      if (this.signingUp()) await this.authService.signUp(this.email, this.password);
      else await this.authService.login(this.email, this.password);
      this.router.navigate(['/teacher']);
    } catch (e: any) {
      this.error.set(this.friendly(e?.code ?? ''));
    } finally { this.loading.set(false); }
  }

  private friendly(code: string): string {
    if (code.includes('email-already-in-use')) return 'That email already has an account — sign in instead.';
    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'Invalid email or password.';
    if (code.includes('weak-password')) return 'Password is too weak.';
    if (code.includes('too-many-requests')) return 'Too many attempts. Try again in a few minutes.';
    return 'Something went wrong. Please try again.';
  }
}
