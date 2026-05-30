import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { HeroWaveComponent } from '../hero-wave/hero-wave.component';
import { IconComponent, IconName } from '../../../shared/icon/icon.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, HeroWaveComponent, IconComponent],
  template: `
    <app-navbar />

    <main class="landing">
      <!-- Hero with seat-map background -->
      <section class="hero">
        <app-hero-wave />
        <div class="hero-overlay"></div>
        <div class="hero-content fade-in">
          <span class="hero-tag">
            <span class="tag-dot"></span>
            Examination Seating Register
          </span>

          <h1 class="hero-title">
            Find your exam seat
            <span class="title-accent">in one search.</span>
          </h1>

          <p class="hero-sub">
            Enter your hall ticket number to locate your room, bench and seat —
            no login, no waiting in front of the notice board.
          </p>

          <form class="search-card" (ngSubmit)="search()">
            <label class="search-label" for="ht">Hall Ticket Number</label>
            <div class="search-row">
              <span class="search-affix"><app-icon name="search" [size]="18" /></span>
              <input
                id="ht"
                class="search-input mono"
                type="text"
                placeholder="21WH1A0501"
                [(ngModel)]="hallTicket"
                name="hallTicket"
                autocomplete="off"
                autocapitalize="characters"
                spellcheck="false"
              />
              <button type="submit" class="btn btn-primary btn-search" [disabled]="!hallTicket.trim()">
                Find Seat
                <app-icon name="arrow-right" [size]="17" />
              </button>
            </div>
            @if (error()) {
              <p class="search-error">{{ error() }}</p>
            } @else {
              <p class="search-hint">Tip: hall tickets aren't case-sensitive here.</p>
            }
          </form>

          <ul class="hero-trust">
            @for (t of trust; track t.label) {
              <li><app-icon [name]="t.icon" [size]="16" /> {{ t.label }}</li>
            }
          </ul>
        </div>
      </section>

      <!-- How it works — ledger -->
      <section class="how-it-works">
        <div class="hiw-inner">
          <div class="hiw-head">
            <span class="hiw-eyebrow">The process</span>
            <h2 class="hiw-title">Three steps to your seat</h2>
          </div>
          <ol class="steps">
            @for (step of steps; track step.num) {
              <li class="step">
                <span class="step-num">{{ step.num }}</span>
                <div class="step-body">
                  <h3>{{ step.title }}</h3>
                  <p>{{ step.desc }}</p>
                </div>
                <span class="step-icon"><app-icon [name]="step.icon" [size]="22" /></span>
              </li>
            }
          </ol>
        </div>
      </section>

      <footer class="landing-footer">
        <span class="footer-ref">REF · SEATLY / PUBLIC LOOKUP</span>
        <p>Built for colleges · No login required for students</p>
      </footer>
    </main>
  `,
  styles: [`
    .landing { min-height: 100vh; display: flex; flex-direction: column; }

    .hero {
      position: relative; flex: 1;
      display: flex; align-items: center; justify-content: center;
      padding: 116px 24px 90px; overflow: hidden; min-height: 660px;
    }
    .hero-overlay {
      position: absolute; inset: 0; z-index: 1;
      background: linear-gradient(to bottom, transparent 0%, var(--bg-primary) 96%);
    }
    .hero-content { position: relative; z-index: 2; max-width: 660px; width: 100%; text-align: center; }

    .hero-tag {
      display: inline-flex; align-items: center; gap: 9px;
      padding: 6px 14px 6px 12px; border-radius: 999px;
      background: var(--bg-card); color: var(--text-secondary);
      font-family: var(--font-mono);
      font-size: 0.7rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;
      margin-bottom: 26px; border: 1px solid var(--border-strong);
    }
    .tag-dot { width: 7px; height: 7px; border-radius: 999px; background: var(--accent-red); box-shadow: 0 0 0 0 var(--accent-red); animation: tagPulse 2.6s ease-in-out infinite; }
    @keyframes tagPulse { 0%, 100% { box-shadow: 0 0 0 0 oklch(0.55 0.19 25 / 0.5); } 50% { box-shadow: 0 0 0 5px oklch(0.55 0.19 25 / 0); } }

    .hero-title {
      font-family: var(--font-head);
      font-size: clamp(2.6rem, 6vw, 4.4rem); font-weight: 600;
      margin-bottom: 20px; line-height: 1.02; letter-spacing: -0.025em;
    }
    .title-accent { display: block; color: var(--accent-blue); font-style: italic; }

    .hero-sub { color: var(--text-secondary); font-size: 1.1rem; line-height: 1.55; margin: 0 auto 36px; max-width: 500px; }

    .search-card {
      padding: 18px; width: 100%; text-align: left;
      background: var(--glass-bg-strong);
      -webkit-backdrop-filter: blur(20px) saturate(1.5);
      backdrop-filter: blur(20px) saturate(1.5);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg); box-shadow: var(--shadow-lg), var(--glass-sheen);
    }
    .search-label { display: block; font-family: var(--font-mono); font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-muted); margin-bottom: 10px; }
    .search-row { display: flex; align-items: stretch; gap: 10px; position: relative; }
    .search-affix {
      position: absolute; left: 14px; top: 0; bottom: 0; display: flex; align-items: center;
      color: var(--text-muted); pointer-events: none; z-index: 1;
    }
    .search-input {
      flex: 1; min-width: 0;
      background: var(--bg-secondary); border: 1px solid var(--border-color);
      border-radius: var(--radius-sm); color: var(--text-primary);
      font-size: 1.05rem; padding: 14px 16px 14px 42px; letter-spacing: 0.08em;
      outline: none; transition: border-color var(--transition), box-shadow var(--transition);
    }
    .search-input::placeholder { color: var(--text-muted); }
    .search-input:focus { border-color: var(--accent-blue); box-shadow: var(--ring-focus); }
    .btn-search { flex-shrink: 0; font-size: 0.95rem; padding: 14px 24px; gap: 8px; }
    .search-error { color: var(--accent-red); font-size: 0.86rem; margin-top: 12px; font-weight: 500; }
    .search-hint { color: var(--text-muted); font-size: 0.82rem; margin-top: 12px; }
    @media (max-width: 520px) {
      .search-row { flex-direction: column; }
      .search-affix { top: 0; height: 52px; bottom: auto; }
      .btn-search { justify-content: center; }
    }

    .hero-trust {
      list-style: none; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px 26px;
      margin-top: 26px; padding: 0;
    }
    .hero-trust li { display: inline-flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--text-muted); }
    .hero-trust app-icon { color: var(--accent-green); }

    .how-it-works { position: relative; padding: 84px 24px; border-top: 1px solid var(--border-color); background: var(--bg-secondary); }
    .hiw-inner { max-width: 760px; margin: 0 auto; }
    .hiw-head { margin-bottom: 30px; }
    .hiw-eyebrow { font-family: var(--font-mono); font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; color: var(--accent-blue); }
    .hiw-title { font-size: clamp(1.6rem, 3vw, 2.1rem); margin-top: 8px; letter-spacing: -0.02em; }

    .steps { list-style: none; display: flex; flex-direction: column; margin: 0; padding: 0; }
    .step { display: flex; align-items: center; gap: 22px; padding: 24px 4px; border-top: 1px solid var(--border-color); }
    .step:first-child { border-top: none; }
    .step-num { font-family: var(--font-head); font-size: 2rem; font-weight: 600; font-style: italic; color: var(--accent-blue); line-height: 1; min-width: 1.5em; }
    .step-body { flex: 1; }
    .step-body h3 { font-size: 1.12rem; margin-bottom: 5px; }
    .step-body p { color: var(--text-secondary); font-size: 0.92rem; }
    .step-icon {
      flex-shrink: 0; width: 46px; height: 46px; display: inline-flex; align-items: center; justify-content: center;
      border-radius: var(--radius-md); color: var(--accent-blue);
      background: oklch(0.42 0.13 274 / 0.08); border: 1px solid oklch(0.42 0.13 274 / 0.18);
    }
    @media (max-width: 520px) { .step-icon { display: none; } }

    .landing-footer {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      text-align: center; padding: 32px; color: var(--text-muted);
      font-family: var(--font-mono); font-size: 0.74rem; letter-spacing: 0.04em;
      border-top: 1px solid var(--border-color);
    }
    .footer-ref { font-size: 0.66rem; letter-spacing: 0.18em; color: var(--text-muted); opacity: 0.65; }
  `]
})
export class LandingComponent {
  private router = inject(Router);
  hallTicket = '';
  error = signal('');

  trust: { icon: IconName; label: string }[] = [
    { icon: 'check-circle', label: 'No account needed' },
    { icon: 'bolt', label: 'Instant results' },
    { icon: 'printer', label: 'Printable seat slip' }
  ];

  steps: { num: string; icon: IconName; title: string; desc: string }[] = [
    { num: '1', icon: 'document', title: 'Enter your hall ticket', desc: 'Type your hall ticket number in the search box above.' },
    { num: '2', icon: 'search', title: 'We search every published exam', desc: 'The register is scanned for your number across all current exams.' },
    { num: '3', icon: 'pin', title: 'See your exact seat', desc: 'Room, floor, bench and seat position — ready to print.' }
  ];

  search() {
    const ht = this.hallTicket.trim();
    if (!ht) { this.error.set('Please enter your hall ticket number.'); return; }
    this.error.set('');
    this.router.navigate(['/search'], { queryParams: { q: ht } });
  }
}
