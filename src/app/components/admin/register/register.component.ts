import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { AuthShellComponent } from '../../../shared/auth-shell/auth-shell.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ToastComponent, AuthShellComponent],
  template: `
    <app-toast />
    <app-auth-shell
      eyebrow="New institution"
      heading="Register"
      subheading="Create the examination office account. Halls, invigilators and examinations are private to your institution."
      note="Set up once. Run every examination from the same register.">

      <form (ngSubmit)="register()" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="reg-college">Institution</label>
            <input id="reg-college" class="form-control" type="text" [(ngModel)]="collegeName" name="collegeName"
              required placeholder="JNTU Hyderabad" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-code">Code</label>
            <input id="reg-code" class="form-control" type="text" [(ngModel)]="collegeCode" name="collegeCode"
              required placeholder="JNTU-HYD" autocapitalize="characters" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-email">Office email</label>
          <input id="reg-email" class="form-control" type="email" [(ngModel)]="email" name="email"
            required placeholder="office@college.edu" autocomplete="email" />
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-password">Password</label>
          <input id="reg-password" class="form-control" type="password" [(ngModel)]="password" name="password"
            required placeholder="At least 6 characters" autocomplete="new-password" />
          <span class="form-hint">Minimum 6 characters.</span>
        </div>

        @if (error()) { <p class="form-error mb-16" role="alert">{{ error() }}</p> }

        <button type="submit" class="btn btn-primary w-full btn-lg" [disabled]="loading()">
          {{ loading() ? 'Creating account…' : 'Create account' }}
        </button>
      </form>

      <p class="alt">Already registered? <a routerLink="/admin/login">Sign in</a></p>
    </app-auth-shell>
  `,
  styles: [`
    .alt { margin-top: 14px; font-size: 0.85rem; color: var(--text-muted); }
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
    if (!this.collegeName.trim() || !this.collegeCode.trim() || !this.email || !this.password) {
      this.error.set('Fill in every field.'); return;
    }
    if (this.password.length < 6) { this.error.set('Password must be at least 6 characters.'); return; }

    this.loading.set(true);
    try {
      await this.authService.register(this.email, this.password, this.collegeName.trim(), this.collegeCode.trim());
      this.router.navigate(['/admin/dashboard']);
    } catch (e: any) {
      const code = e?.code ?? '';
      if (code.includes('email-already-in-use')) this.error.set('That email already has an account — sign in instead.');
      else if (code.includes('weak-password')) this.error.set('Password is too weak.');
      else if (code.includes('invalid-email')) this.error.set('That email address does not look valid.');
      else this.error.set('Registration failed. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
