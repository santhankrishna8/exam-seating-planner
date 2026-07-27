import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../navbar/navbar.component';
import { LoaderComponent } from '../../../shared/loader/loader.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ExamService, SearchHit } from '../../../services/exam.service';
import { BRAND } from '../../../brand';
import { normalizeHallTicket } from '../../../utils/hall-ticket';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, LoaderComponent, RouterLink, IconComponent],
  template: `
    <app-navbar />

    <main class="results-page">
      <div class="results-inner">
        <div class="crumb no-print">
          <a routerLink="/"><app-icon name="arrow-left" [size]="14" /> New search</a>
        </div>

        @if (loading()) {
          <app-loader message="Searching the register…" />
        } @else {
          <header class="query-head no-print fade-in">
            <div>
              <span class="eyebrow">Register lookup</span>
              <h1 class="query-title">{{ hallTicket }}</h1>
              <p class="query-sub">
                {{ results().length }}
                {{ results().length === 1 ? 'seat found' : 'seats found' }}
                across published examinations
              </p>
            </div>
            @if (results().length > 0) {
              <button class="btn btn-outline" (click)="print()">
                <app-icon name="printer" [size]="15" /> Print slip
              </button>
            }
          </header>

          @if (results().length === 0) {
            <div class="card empty-state fade-in">
              <div class="empty-state-icon"><app-icon name="search" [size]="26" /></div>
              <h3>No seat on the register</h3>
              <p>
                Nothing is published for <strong class="mono">{{ hallTicket }}</strong> yet.
                Check the number, or ask your examination office whether the seating has been released.
              </p>
              <form class="retry no-print" (ngSubmit)="retry()">
                <input class="form-control mono" [(ngModel)]="retryTicket" name="retryTicket"
                  placeholder="Try another number" autocapitalize="characters" spellcheck="false"
                  aria-label="Hall ticket number" />
                <button class="btn btn-primary" type="submit">Search</button>
              </form>
            </div>
          } @else {
            <div class="slips fade-in">
              @for (r of results(); track r.examId) {
                <article class="card slip">
                  <header class="slip-head">
                    <div class="slip-org">
                      <span class="slip-stamp mono">{{ stamp }}</span>
                      @if (r.collegeName) { <span class="slip-college">{{ r.collegeName }}</span> }
                    </div>
                    <h2 class="slip-exam">{{ r.examName }}</h2>
                    <div class="slip-when">
                      @if (r.subjectCode) { <span class="badge badge-gray">{{ r.subjectCode }}</span> }
                      @if (r.date) { <span><app-icon name="calendar" [size]="13" /> {{ r.date | date:'EEE, dd MMM yyyy' }}</span> }
                      @if (r.startTime) { <span><app-icon name="clock" [size]="13" /> {{ r.startTime }}@if (r.endTime) { – {{ r.endTime }} }</span> }
                    </div>
                  </header>

                  <div class="slip-who">
                    <div class="who-item">
                      <span class="who-label">Candidate</span>
                      <span class="who-value">{{ r.seat.name }}</span>
                    </div>
                    <div class="who-item">
                      <span class="who-label">Hall ticket</span>
                      <span class="who-value mono">{{ r.seat.hallTicketNo }}</span>
                    </div>
                  </div>

                  <div class="allotment">
                    <div class="allot-cell">
                      <span class="allot-label">Hall</span>
                      <span class="allot-value">{{ r.seat.roomName || '—' }}</span>
                      <span class="allot-note">{{ r.seat.floor || 'Floor not stated' }}</span>
                    </div>
                    <div class="allot-cell">
                      <span class="allot-label">Bench</span>
                      <span class="allot-value mono">{{ r.seat.benchNumber }}</span>
                      <span class="allot-note">Counted down the column</span>
                    </div>
                    <div class="allot-cell">
                      <span class="allot-label">Seat</span>
                      <span class="allot-value mono">{{ r.seat.seatNumber }}</span>
                      <span class="allot-note">{{ seatSideLabel(r) }}</span>
                    </div>
                  </div>

                  <div class="bench-view">
                    <span class="bench-view-label">Bench {{ r.seat.benchNumber }}, seen from the front of the hall</span>
                    <div class="bench-strip">
                      @for (s of range(r.seat.seatsPerBench); track s) {
                        <div class="bench-seat" [class.yours]="s === r.seat.seatNumber">
                          {{ s === r.seat.seatNumber ? 'You' : s }}
                        </div>
                      }
                    </div>
                  </div>

                  <footer class="slip-foot">
                    <span class="foot-note">Carry this slip. Seats are verified by the invigilator before the paper is issued.</span>
                    <a [routerLink]="['/exam', r.examId]" class="btn btn-ghost btn-sm no-print">
                      Full hall list <app-icon name="arrow-right" [size]="14" />
                    </a>
                  </footer>
                </article>
              }
            </div>
          }
        }
      </div>
    </main>
  `,
  styles: [`
    .results-page { position: relative; z-index: 1; padding: 30px 24px 72px; max-width: 860px; margin: 0 auto; }
    .results-inner { display: flex; flex-direction: column; gap: 20px; }
    .crumb a { display: inline-flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 0.82rem; }
    .crumb a:hover { color: var(--text-primary); }

    .query-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .query-title { font-size: 1.8rem; letter-spacing: 0.01em; font-family: var(--font-mono); font-weight: 500; margin-top: 6px; }
    .query-sub { color: var(--text-muted); font-size: 0.84rem; margin-top: 4px; }

    .retry { display: flex; gap: 8px; margin-top: 18px; width: 100%; max-width: 340px; }
    .retry .form-control { text-transform: uppercase; }

    .slips { display: flex; flex-direction: column; gap: 18px; }
    .slip { padding: 0; overflow: hidden; }

    .slip-head { padding: 20px 22px 16px; border-bottom: 1px solid var(--border-color); }
    .slip-org { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
    .slip-stamp { font-size: 0.56rem; letter-spacing: 0.2em; color: var(--text-muted); }
    .slip-college { font-size: 0.8rem; color: var(--text-secondary); }
    .slip-exam { font-size: 1.5rem; letter-spacing: -0.015em; }
    .slip-when { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin-top: 9px; font-size: 0.81rem; color: var(--text-secondary); }
    .slip-when span { display: inline-flex; align-items: center; gap: 6px; }
    .slip-when app-icon { color: var(--text-muted); }

    .slip-who { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border-color); border-bottom: 1px solid var(--border-color); }
    .who-item { background: var(--bg-card); padding: 12px 22px; display: flex; flex-direction: column; gap: 2px; }
    .who-label { font-family: var(--font-mono); font-size: 0.58rem; letter-spacing: 0.13em; text-transform: uppercase; color: var(--text-muted); }
    .who-value { font-size: 0.95rem; font-weight: 500; }

    .allotment { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border-color); }
    .allot-cell { background: var(--bg-secondary); padding: 18px 22px; display: flex; flex-direction: column; gap: 3px; }
    .allot-label { font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-muted); }
    .allot-value { font-family: var(--font-head); font-size: 1.85rem; font-weight: 600; line-height: 1.05; letter-spacing: -0.035em; font-variant-numeric: tabular-nums; }
    .allot-note { font-size: 0.7rem; color: var(--text-muted); }
    @media (max-width: 620px) {
      .allotment { grid-template-columns: 1fr; }
      .slip-who { grid-template-columns: 1fr; }
    }

    .bench-view { padding: 18px 22px; border-top: 1px solid var(--border-color); }
    .bench-view-label { display: block; font-size: 0.76rem; color: var(--text-muted); margin-bottom: 11px; }
    .bench-strip { display: flex; gap: 7px; }
    .bench-seat {
      width: 58px; height: 46px; border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      background: var(--bg-secondary); border: 1px solid var(--border-color);
      font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);
    }
    .bench-seat.yours {
      background: var(--accent-red); border-color: transparent;
      color: oklch(0.99 0.005 88); font-weight: 500;
      box-shadow: var(--shadow-md);
    }

    .slip-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 22px; border-top: 1px solid var(--border-color); background: var(--bg-secondary); }
    .foot-note { font-size: 0.74rem; color: var(--text-muted); }

    @media print {
      :host { color: #000; }
      .no-print, app-navbar { display: none !important; }
      .results-page { padding: 0; max-width: 100%; }
      .results-inner { gap: 0; }
      .slip { break-inside: avoid; margin-bottom: 14px; border: 1.5px solid #000 !important; }
      .allot-cell, .slip-foot, .who-item { background: #fff !important; }
      .allotment, .slip-who { gap: 0; }
      .allot-cell { border-right: 1px solid #000; }
      .allot-cell:last-child { border-right: 0; }
      .bench-seat.yours { background: #000 !important; color: #fff !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  `]
})
export class SearchResultsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private examService = inject(ExamService);

  stamp = BRAND.stamp;
  hallTicket = '';
  retryTicket = '';
  loading = signal(true);
  results = signal<SearchHit[]>([]);

  range = (n: number): number[] => Array.from({ length: Math.max(n || 0, 1) }, (_, i) => i + 1);
  print() { window.print(); }

  /** "Aisle side" / "Wall side" reads better than a bare number on a 2-seat bench. */
  seatSideLabel(r: SearchHit): string {
    const total = Math.max(1, r.seat.seatsPerBench || 1);
    if (total < 2) return 'Single occupancy';
    if (r.seat.seatNumber === 1) return `Left of ${total}`;
    if (r.seat.seatNumber === total) return `Right of ${total}`;
    return `Seat ${r.seat.seatNumber} of ${total}`;
  }

  retry() {
    const ht = normalizeHallTicket(this.retryTicket);
    if (!ht) return;
    this.router.navigate(['/search'], { queryParams: { q: ht } });
  }

  ngOnInit() {
    // Re-run on every query change so the retry form works without a reload.
    this.route.queryParamMap.subscribe(async params => {
      this.hallTicket = normalizeHallTicket(params.get('q') ?? '');
      this.retryTicket = '';
      if (!this.hallTicket) { this.results.set([]); this.loading.set(false); return; }
      this.loading.set(true);
      try {
        this.results.set(await this.examService.searchByHallTicket(this.hallTicket));
      } catch {
        this.results.set([]);
      } finally {
        this.loading.set(false);
      }
    });
  }
}
