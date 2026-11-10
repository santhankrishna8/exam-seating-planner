import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { IconComponent, IconName } from '../../../shared/icon/icon.component';
import { BrandMarkComponent } from '../../../shared/brand-mark/brand-mark.component';
import { BRAND } from '../../../brand';
import { normalizeHallTicket } from '../../../utils/hall-ticket';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, IconComponent, BrandMarkComponent],
  template: `
    <app-navbar />

    <main class="landing">
      <!-- ── Hero ── -->
      <section class="hero" id="find">
        <div class="seat-field" aria-hidden="true">
          @for (col of field; track $index) {
            <div class="seat-col" [style.animation-delay]="($index * -1.3) + 's'">
              @for (bar of col; track $index) {
                <span class="seat-bar" [class.you]="bar === 2"></span>
              }
            </div>
          }
        </div>

        <div class="hero-copy fade-in">
          <h1 class="hero-title">Find your exam seat.</h1>
          <p class="hero-sub">Enter your hall ticket number to see your hall, bench and seat. No account, nothing to install.</p>

          <div class="find-wrap">
            <span class="example-tag">Example <b>Bench 14 · Seat 2</b></span>
            <form class="find" (ngSubmit)="search()" novalidate>
              <span class="find-icon"><app-icon name="seat" [size]="26" /></span>
              <h2 class="find-title">Enter your hall ticket number</h2>
              <p class="find-sub">Every published examination is searched at once.</p>
              <div class="find-row">
                <input id="ht" class="find-input" type="text" inputmode="text" placeholder="e.g. 21WH1A0501"
                  [(ngModel)]="hallTicket" (ngModelChange)="error.set('')" name="hallTicket"
                  autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Hall ticket number"
                  [attr.aria-invalid]="error() ? 'true' : null" aria-describedby="find-note" />
                <button type="submit" class="btn btn-primary find-go">Find my seat <app-icon name="arrow-right" [size]="18" /></button>
              </div>
            </form>
            <p id="find-note" class="find-note" [class.is-error]="error()">
              {{ error() || 'Capital letters and spaces do not matter, so 21wh1a0501 finds the same seat.' }}
            </p>
          </div>
        </div>
      </section>

      <!-- ── How it works ── -->
      <section class="block" id="how">
        <div class="inner">
          <h2 class="block-title">Three steps, ten seconds</h2>
          <ol class="steps">
            @for (step of steps; track step.num) {
              <li class="step card">
                <span class="step-num">{{ step.num }}</span>
                <h3>{{ step.title }}</h3>
                <p>{{ step.desc }}</p>
              </li>
            }
          </ol>
        </div>
      </section>

      <!-- ── For colleges ── -->
      <section class="block tint" id="office">
        <div class="inner">
          <span class="eyebrow">For the examination office</span>
          <h2 class="block-title">Seating a whole exam takes minutes</h2>
          <div class="caps">
            @for (c of capabilities; track c.title) {
              <article class="cap card">
                <span class="cap-icon"><app-icon [name]="c.icon" [size]="22" /></span>
                <h3>{{ c.title }}</h3>
                <p>{{ c.text }}</p>
              </article>
            }
          </div>
          <div class="cta">
            <a routerLink="/admin/register" class="btn btn-primary btn-lg">Register your college</a>
            <a routerLink="/admin/login" class="btn btn-outline btn-lg">Office sign in</a>
          </div>
        </div>
      </section>

      <footer class="site-foot">
        <div class="foot-inner">
          <div class="foot-brand"><app-brand-mark [size]="30" /> <b>{{ brand.name }}</b><span class="text-muted">{{ brand.publicTagline }}</span></div>
          <nav class="foot-links" aria-label="Footer">
            <a routerLink="/admin/login">Office sign in</a>
            <a routerLink="/admin/register">Register a college</a>
          </nav>
        </div>
      </footer>
    </main>
  `,
  styles: [`
    .landing { position: relative; z-index: 1; margin-top: -76px; }

    /* ── Hero: a field of benches with one lit seat ── */
    .hero { position: relative; overflow: hidden; padding: 150px 20px 90px; text-align: center; min-height: 720px; }
    .seat-field {
      position: absolute; inset: 0; display: flex; justify-content: space-between; padding: 0 1%; pointer-events: none;
      /* bars fade out behind the headline and search card so text stays readable */
      -webkit-mask-image: radial-gradient(ellipse 52% 58% at 50% 46%, transparent 35%, #000 85%);
      mask-image: radial-gradient(ellipse 52% 58% at 50% 46%, transparent 35%, #000 85%);
    }
    .seat-col { display: flex; flex-direction: column; gap: 26px; padding-top: 70px; animation: drift 9s ease-in-out infinite alternate; }
    .seat-bar { display: block; width: 145px; height: 31px; border-radius: 9px; background: var(--seat-bar); }
    .seat-bar.you { background: var(--brand-yellow) !important; box-shadow: 0 0 0 5px rgb(255 255 255 / 0.55), 0 10px 24px -8px rgb(255 214 51 / 0.8); }
    @keyframes drift { from { transform: translateY(-8px); } to { transform: translateY(10px); } }
    @media (max-width: 900px) { .seat-col:nth-child(n+6) { display: none; } .seat-field { justify-content: space-around; } }
    @media (max-width: 560px) { .seat-col:nth-child(n+4) { display: none; } .seat-bar { width: 100px; } }

    .hero-copy { position: relative; max-width: 860px; margin: 0 auto; }
    .hero-title { font-size: clamp(2.8rem, 8vw, 5.6rem); font-weight: 800; letter-spacing: -0.05em; line-height: 1; margin-bottom: 20px; }
    .hero-sub { max-width: 560px; margin: 0 auto 44px; font-size: 1.15rem; line-height: 1.6; color: var(--text-primary); }

    .find-wrap { position: relative; max-width: 640px; margin: 0 auto; padding: 12px; border-radius: 28px; background: var(--halo); }
    .example-tag {
      position: absolute; top: -18px; right: -10px; z-index: 2; transform: rotate(3deg);
      padding: 7px 14px; border-radius: 10px; background: var(--brand-yellow); color: #0b1b4d;
      font-size: 0.78rem; box-shadow: var(--shadow-md);
    }
    .example-tag b { font-size: 1rem; margin-left: 4px; }
    .find { padding: 30px 28px 28px; border-radius: 20px; background: var(--bg-card); box-shadow: var(--shadow-lg); border: 1px solid var(--border-color); }
    .find-icon { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 18px; background: #0b1b4d; color: #fff; margin-bottom: 16px; }
    .find-title { font-size: 1.45rem; font-weight: 800; letter-spacing: -0.03em; }
    .find-sub { color: var(--text-secondary); margin: 6px 0 22px; }
    .find-row { display: flex; gap: 10px; }
    .find-input {
      flex: 1; min-width: 0; height: 56px; padding: 0 18px; border-radius: 14px; font-size: 1.05rem; letter-spacing: 0.04em;
      background: var(--bg-primary); border: 1.5px solid var(--border-color); color: var(--text-primary); outline: none;
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .find-input:focus { border-color: var(--accent-blue); box-shadow: var(--ring-focus); }
    .find-go { height: 56px; padding: 0 24px; font-size: 1rem; border-radius: 14px; }
    .find-note { margin-top: 14px; font-size: 0.85rem; color: var(--text-secondary); }
    .find-note.is-error { color: var(--accent-red); font-weight: 600; }
    @media (max-width: 560px) { .find-row { flex-direction: column; } .find-input { flex: none; width: 100%; } .find { padding: 24px 18px; } .example-tag { right: 6px; } }

    /* ── Sections ── */
    .block { padding: 84px 20px; }
    .block.tint { background: var(--bg-secondary); }
    .inner { max-width: 1100px; margin: 0 auto; }
    .block-title { font-size: clamp(1.9rem, 4vw, 2.8rem); font-weight: 800; letter-spacing: -0.04em; margin: 6px 0 34px; }
    .steps { list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 18px; padding: 0; }
    .step { padding: 26px; }
    .step-num { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; background: var(--brand-yellow); color: #0b1b4d; font-weight: 800; margin-bottom: 14px; }
    .step h3, .cap h3 { font-size: 1.2rem; margin-bottom: 6px; }
    .step p, .cap p { color: var(--text-secondary); line-height: 1.6; }
    .caps { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; }
    .cap { padding: 26px; }
    .cap-icon { display: inline-flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 14px; background: color-mix(in srgb, var(--accent-blue) 14%, transparent); color: var(--accent-blue); margin-bottom: 14px; }
    .cta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 36px; }

    .site-foot { padding: 28px 20px; border-top: 1px solid var(--border-color); }
    .foot-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .foot-brand { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .foot-brand app-brand-mark { --mark-bg: #0b1b4d; --mark-seat: rgb(255 255 255 / 0.7); --mark-you: var(--brand-yellow); }
    .foot-links { display: flex; gap: 20px; }
    .foot-links a { color: var(--text-secondary); font-weight: 500; }
  `]
})
export class LandingComponent {
  private router = inject(Router);
  brand = BRAND;
  hallTicket = '';
  error = signal('');

  /** Decorative bench field: 11 columns of bars; the lit seat is the one marked 2. */
  field: number[][] = Array.from({ length: 11 }, (_, c) =>
    Array.from({ length: c % 3 === 1 ? 9 : 10 }, (_, r) => (c === 1 && r === 4 ? 2 : 1)));

  capabilities: { icon: IconName; title: string; text: string }[] = [
    { icon: 'building', title: 'Add your halls once',
      text: 'Describe each hall the way it really is — columns of benches, seats per bench. Reuse it for every exam.' },
    { icon: 'seat', title: 'Seat students in one click',
      text: 'Upload a spreadsheet, pick halls and a rule (shuffled, mixed departments, gap seats). Clashes and shortages are caught for you.' },
    { icon: 'badge', title: 'Invigilators without accounts',
      text: 'Auto-allot staff fairly, then send each hall a private link. The invigilator marks absentees on their phone.' }
  ];

  steps = [
    { num: '1', title: 'Type your hall ticket', desc: 'Spaces and capital letters do not matter.' },
    { num: '2', title: 'We search every exam', desc: 'All published examinations are checked at once.' },
    { num: '3', title: 'See your seat', desc: 'Hall, floor, bench and seat — with a slip you can print.' }
  ];

  search() {
    const ht = normalizeHallTicket(this.hallTicket);
    if (!ht) { this.error.set('Enter your hall ticket number to search.'); return; }
    if (ht.length < 4) { this.error.set('That looks too short for a hall ticket number.'); return; }
    this.error.set('');
    this.router.navigate(['/search'], { queryParams: { q: ht } });
  }
}
