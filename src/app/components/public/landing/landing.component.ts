import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { HallDiagramComponent } from '../hall-diagram/hall-diagram.component';
import { IconComponent, IconName } from '../../../shared/icon/icon.component';
import { BrandMarkComponent } from '../../../shared/brand-mark/brand-mark.component';
import { BRAND } from '../../../brand';
import { normalizeHallTicket } from '../../../utils/hall-ticket';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, HallDiagramComponent, IconComponent, BrandMarkComponent],
  template: `
    <app-navbar />

    <main class="landing">
      <!-- ── Hero ── -->
      <section class="hero">
        <div class="hero-inner">
          <div class="hero-copy fade-in">
            <span class="eyebrow hero-eyebrow">Public seat lookup</span>

            <h1 class="hero-title">
              Every seat, on the
              <em>record.</em>
            </h1>

            <p class="hero-sub">
              {{ brand.name }} allots examination halls bench by bench, rosters the invigilators,
              and publishes the register. Students find their seat with a hall ticket number —
              nothing to install, no account to create.
            </p>

            <form class="lookup" (ngSubmit)="search()" novalidate>
              <label class="lookup-label" for="ht">Hall ticket number</label>
              <div class="lookup-row">
                <span class="lookup-affix"><app-icon name="search" [size]="17" /></span>
                <input
                  id="ht"
                  class="lookup-input mono"
                  type="text"
                  inputmode="text"
                  placeholder="21WH1A0501"
                  [(ngModel)]="hallTicket"
                  (ngModelChange)="error.set('')"
                  name="hallTicket"
                  autocomplete="off"
                  autocapitalize="characters"
                  spellcheck="false"
                  [attr.aria-invalid]="error() ? 'true' : null"
                  aria-describedby="lookup-note"
                />
                <button type="submit" class="btn btn-primary lookup-go">
                  Find my seat
                  <app-icon name="arrow-right" [size]="16" />
                </button>
              </div>
              <p id="lookup-note" class="lookup-note" [class.is-error]="error()">
                {{ error() || 'Case and spacing are ignored. Results cover every published examination.' }}
              </p>
            </form>

            <ul class="assurances">
              @for (a of assurances; track a.label) {
                <li><app-icon [name]="a.icon" [size]="15" /> {{ a.label }}</li>
              }
            </ul>
          </div>

          <div class="hero-visual fade-in">
            <app-hall-diagram />
          </div>
        </div>
      </section>

      <!-- ── What the office runs ── -->
      <section class="capabilities">
        <div class="cap-inner">
          <header class="cap-head">
            <span class="eyebrow">For the examination office</span>
            <h2 class="cap-title">One register, from allotment to attendance</h2>
          </header>

          <div class="cap-grid">
            @for (c of capabilities; track c.title) {
              <article class="cap">
                <span class="cap-index mono">{{ c.index }}</span>
                <h3 class="cap-name">{{ c.title }}</h3>
                <p class="cap-text">{{ c.text }}</p>
              </article>
            }
          </div>
        </div>
      </section>

      <!-- ── Procedure ── -->
      <section class="procedure">
        <div class="proc-inner">
          <header class="proc-head">
            <span class="eyebrow">Procedure</span>
            <h2 class="proc-title">Three steps for the student</h2>
          </header>
          <ol class="steps">
            @for (step of steps; track step.num) {
              <li class="step">
                <span class="step-num">{{ step.num }}</span>
                <div class="step-body">
                  <h3>{{ step.title }}</h3>
                  <p>{{ step.desc }}</p>
                </div>
              </li>
            }
          </ol>
        </div>
      </section>

      <!-- ── Footer ── -->
      <footer class="site-foot">
        <div class="foot-inner">
          <div class="foot-brand">
            <app-brand-mark [size]="28" />
            <div>
              <div class="foot-name">{{ brand.name }}</div>
              <div class="foot-desc">{{ brand.descriptor }}</div>
            </div>
          </div>
          <nav class="foot-links" aria-label="Footer">
            <a routerLink="/admin/login">Examination office</a>
            <a routerLink="/admin/register">Register an institution</a>
          </nav>
        </div>
        <div class="foot-rule"></div>
        <div class="foot-stamp mono">{{ brand.stamp }} · PUBLIC LOOKUP</div>
      </footer>
    </main>
  `,
  styles: [`
    .landing { position: relative; z-index: 1; }

    /* ── Hero ── */
    .hero { padding: 64px 24px 72px; border-bottom: 1px solid var(--border-color); }
    .hero-inner {
      max-width: 1220px; margin: 0 auto;
      display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
      gap: 56px; align-items: center;
    }
    @media (max-width: 980px) {
      .hero { padding: 44px 20px 52px; }
      .hero-inner { grid-template-columns: 1fr; gap: 38px; }
      .hero-visual { order: -1; }
    }

    .hero-eyebrow { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 18px; color: var(--accent-red); }
    .hero-eyebrow::before { content: ''; width: 18px; height: 1px; background: currentColor; }

    .hero-title {
      font-size: clamp(2.7rem, 5.6vw, 4.3rem);
      line-height: 0.98; letter-spacing: -0.025em; margin-bottom: 20px;
    }
    .hero-title em { font-style: normal; color: var(--accent-red); }

    .hero-sub { color: var(--text-secondary); font-size: 1.03rem; line-height: 1.6; max-width: 52ch; margin-bottom: 30px; }

    .lookup {
      padding: 16px; border-radius: var(--radius-lg);
      background: var(--bg-card); border: 1px solid var(--border-strong);
      box-shadow: var(--shadow-md);
    }
    .lookup-label {
      display: block; font-family: var(--font-mono); font-size: 0.63rem; font-weight: 500;
      text-transform: uppercase; letter-spacing: 0.14em; color: var(--text-muted); margin-bottom: 9px;
    }
    .lookup-row { display: flex; align-items: stretch; gap: 8px; position: relative; }
    .lookup-affix {
      position: absolute; left: 12px; top: 0; height: 46px; display: flex; align-items: center;
      color: var(--text-muted); pointer-events: none; z-index: 1;
    }
    .lookup-input {
      flex: 1; min-width: 0; height: 46px;
      background: var(--bg-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-sm);
      color: var(--text-primary); font-size: 1rem; letter-spacing: 0.09em;
      padding: 0 14px 0 38px; outline: none;
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .lookup-input::placeholder { color: var(--text-muted); opacity: 0.6; }
    .lookup-input:focus { border-color: var(--accent-blue); box-shadow: var(--ring-focus); }
    .lookup-go { flex-shrink: 0; height: 46px; padding: 0 20px; font-size: 0.92rem; }
    .lookup-note { margin-top: 10px; font-size: 0.78rem; color: var(--text-muted); }
    .lookup-note.is-error { color: var(--accent-red); font-weight: 500; }
    @media (max-width: 540px) {
      .lookup-row { flex-direction: column; }
      .lookup-go { width: 100%; }
    }

    .assurances { list-style: none; display: flex; flex-wrap: wrap; gap: 10px 24px; margin: 22px 0 0; padding: 0; }
    .assurances li { display: inline-flex; align-items: center; gap: 7px; font-size: 0.81rem; color: var(--text-muted); }
    .assurances app-icon { color: var(--accent-green); }

    /* ── Capabilities ── */
    .capabilities { padding: 68px 24px; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary); }
    .cap-inner { max-width: 1220px; margin: 0 auto; }
    .cap-head { margin-bottom: 34px; max-width: 46ch; }
    .cap-title { font-size: clamp(1.6rem, 3vw, 2.2rem); letter-spacing: -0.018em; margin-top: 9px; }
    .cap-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 0; border-top: 1px solid var(--border-color); }
    .cap { padding: 26px 26px 26px 0; border-right: 1px solid var(--border-color); }
    .cap:last-child { border-right: 0; }
    @media (min-width: 760px) { .cap + .cap { padding-left: 26px; } }
    @media (max-width: 759px) {
      .cap { border-right: 0; border-bottom: 1px solid var(--border-color); padding: 22px 0; }
      .cap:last-child { border-bottom: 0; }
    }
    .cap-index { display: block; font-size: 0.66rem; letter-spacing: 0.16em; color: var(--accent-red); margin-bottom: 12px; }
    .cap-name { font-size: 1.22rem; margin-bottom: 8px; letter-spacing: -0.012em; }
    .cap-text { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; }

    /* ── Procedure ── */
    .procedure { padding: 66px 24px; }
    .proc-inner { max-width: 780px; margin: 0 auto; }
    .proc-head { margin-bottom: 22px; }
    .proc-title { font-size: clamp(1.5rem, 2.6vw, 2rem); letter-spacing: -0.018em; margin-top: 9px; }
    .steps { list-style: none; margin: 0; padding: 0; }
    .step { display: flex; align-items: baseline; gap: 22px; padding: 22px 0; border-top: 1px solid var(--border-color); }
    .step-num { font-family: var(--font-mono); font-size: 1.15rem; font-weight: 500; color: var(--accent-red); line-height: 1.4; min-width: 2.2em; letter-spacing: 0.02em; }
    .step-body h3 { font-family: var(--font-body); font-size: 1.02rem; font-weight: 600; margin-bottom: 4px; }
    .step-body p { color: var(--text-secondary); font-size: 0.9rem; }

    /* ── Footer ── */
    .site-foot { padding: 34px 24px 26px; border-top: 1px solid var(--border-color); background: var(--bg-secondary); }
    .foot-inner { max-width: 1220px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
    .foot-brand { display: flex; align-items: center; gap: 11px; }
    .foot-brand app-brand-mark {
      --mark-bg: var(--ink-face);
      --mark-seat: color-mix(in oklch, var(--ink-text) 45%, transparent);
      --mark-ring: color-mix(in oklch, var(--ink-text) 22%, transparent);
      --mark-you: var(--accent-red);
    }
    .foot-name { font-family: var(--font-head); font-weight: 600; letter-spacing: -0.025em; font-size: 1.1rem; line-height: 1.1; }
    .foot-desc { font-family: var(--font-mono); font-size: 0.55rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-muted); }
    .foot-links { display: flex; gap: 20px; flex-wrap: wrap; }
    .foot-links a { font-size: 0.83rem; color: var(--text-secondary); }
    .foot-links a:hover { color: var(--text-primary); }
    .foot-rule { max-width: 1220px; margin: 22px auto 12px; height: 1px; background: var(--border-color); }
    .foot-stamp { max-width: 1220px; margin: 0 auto; font-size: 0.6rem; letter-spacing: 0.2em; color: var(--text-muted); opacity: 0.75; }
  `]
})
export class LandingComponent {
  private router = inject(Router);
  brand = BRAND;
  hallTicket = '';
  error = signal('');

  assurances: { icon: IconName; label: string }[] = [
    { icon: 'check-circle', label: 'No account needed' },
    { icon: 'bolt', label: 'Results in seconds' },
    { icon: 'printer', label: 'Printable seat slip' }
  ];

  capabilities = [
    {
      index: '01',
      title: 'Hall allotment',
      text: 'Describe each hall as it really is — columns of benches of differing depths — and seats are filled down the columns, never across a rectangle that does not exist.'
    },
    {
      index: '02',
      title: 'Invigilation duty',
      text: 'Duties are spread by workload and department, a teacher is never booked twice at the same hour, and each hall gets a private link where the invigilator marks attendance — no account needed.'
    },
    {
      index: '03',
      title: 'Publication',
      text: 'Publishing writes a read-only register: students look up a seat, invigilators mark absentees, and the office reconciles attendance back into the record.'
    }
  ];

  steps = [
    { num: '1', title: 'Enter the hall ticket number', desc: 'Type it into the field above — spacing and case do not matter.' },
    { num: '2', title: 'Every published examination is searched', desc: 'The register is scanned across all live examinations at once.' },
    { num: '3', title: 'Read off hall, bench and seat', desc: 'The exact position is shown with a printable slip to carry in.' }
  ];

  search() {
    const ht = normalizeHallTicket(this.hallTicket);
    if (!ht) { this.error.set('Enter your hall ticket number to search.'); return; }
    if (ht.length < 4) { this.error.set('That looks too short for a hall ticket number.'); return; }
    this.error.set('');
    this.router.navigate(['/search'], { queryParams: { q: ht } });
  }
}
