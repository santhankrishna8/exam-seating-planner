import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { LoaderComponent } from '../../../shared/loader/loader.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ExamService, SearchHit } from '../../../services/exam.service';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, NavbarComponent, LoaderComponent, RouterLink, IconComponent],
  template: `
    <app-navbar />

    <main class="results-page">
      <div class="results-inner fade-in">
        <div class="back-link">
          <a routerLink="/">← Back to Search</a>
        </div>

        @if (loading()) {
          <app-loader message="Searching for your seat..." />
        } @else {
          <div class="query-header">
            <h2>Results for <span class="text-accent">{{ hallTicket }}</span></h2>
            @if (results().length > 0) {
              <button class="btn btn-outline btn-sm no-print" (click)="print()"><app-icon name="printer" [size]="16" /> Print Slip</button>
            }
          </div>

          @if (results().length === 0) {
            <div class="glass-card empty-state">
              <div class="empty-state-icon"><app-icon name="search" [size]="30" /></div>
              <h3>No seats found</h3>
              <p>No published exams found for hall ticket <strong>{{ hallTicket }}</strong>. Please check the number or contact your college admin.</p>
            </div>
          } @else {
            @if (results().length > 1) {
              <div class="summary-table table-wrapper glass-card no-print">
                <table>
                  <thead>
                    <tr><th>Exam</th><th>Date</th><th>Time</th><th>Room</th><th>Bench</th><th>Seat</th></tr>
                  </thead>
                  <tbody>
                    @for (r of results(); track r.examId) {
                      <tr>
                        <td>{{ r.examName }}</td>
                        <td>{{ r.date ? (r.date | date:'dd MMM yyyy') : '—' }}</td>
                        <td class="mono">{{ r.startTime || '—' }}@if (r.endTime) {–{{ r.endTime }}}</td>
                        <td>{{ r.seat.roomName }}</td>
                        <td class="mono">{{ r.seat.benchNumber }}</td>
                        <td class="mono">{{ r.seat.seatNumber }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <div class="results-list">
              @for (r of results(); track r.examId) {
                <div class="result-card glass-card">
                  <div class="result-header">
                    <div>
                      @if (r.collegeName) { <div class="result-college">{{ r.collegeName }}</div> }
                      <h3 class="result-exam">{{ r.examName }}</h3>
                      @if (r.date || r.startTime) {
                        <div class="result-when">
                          @if (r.date) { <span><app-icon name="calendar" [size]="14" /> {{ r.date | date:'EEE, dd MMM yyyy' }}</span> }
                          @if (r.startTime) { <span><app-icon name="clock" [size]="14" /> {{ r.startTime }}@if (r.endTime) { – {{ r.endTime }} }</span> }
                        </div>
                      }
                    </div>
                    <a [routerLink]="['/exam', r.examId]" class="btn btn-outline btn-sm no-print">View Full Room</a>
                  </div>

                  <div class="seat-info-grid">
                    <div class="seat-info-item">
                      <div class="seat-info-label">Student Name</div>
                      <div class="seat-info-value">{{ r.seat.name }}</div>
                    </div>
                    <div class="seat-info-item">
                      <div class="seat-info-label">Hall Ticket</div>
                      <div class="seat-info-value text-accent">{{ r.seat.hallTicketNo }}</div>
                    </div>
                    <div class="seat-info-item highlight">
                      <div class="seat-info-label">Room</div>
                      <div class="seat-info-value">{{ r.seat.roomName }}</div>
                    </div>
                    <div class="seat-info-item">
                      <div class="seat-info-label">Floor</div>
                      <div class="seat-info-value">{{ r.seat.floor || '—' }}</div>
                    </div>
                    <div class="seat-info-item highlight">
                      <div class="seat-info-label">Bench No.</div>
                      <div class="seat-info-value">{{ r.seat.benchNumber }}</div>
                    </div>
                    <div class="seat-info-item highlight">
                      <div class="seat-info-label">Seat No.</div>
                      <div class="seat-info-value">{{ r.seat.seatNumber }}</div>
                    </div>
                  </div>

                  <div class="bench-visual">
                    <div class="bench-label">Your position on Bench {{ r.seat.benchNumber }}</div>
                    <div class="bench-row">
                      @for (s of range(r.seat.seatsPerBench); track s) {
                        <div class="bench-seat" [class.yours]="s === r.seat.seatNumber">
                          @if (s === r.seat.seatNumber) { <span>You</span> } @else { <span>{{ s }}</span> }
                        </div>
                      }
                    </div>
                  </div>

                  <div class="slip-stamp print-only">Seatly · official seating slip · verify with your invigilator</div>
                </div>
              }
            </div>
          }
        }
      </div>
    </main>
  `,
  styles: [`
    .results-page { padding: 32px 24px; max-width: 800px; margin: 0 auto; }
    .results-inner { display: flex; flex-direction: column; gap: 20px; }
    .back-link a { color: var(--text-secondary); font-size: 0.875rem; text-decoration: none; }
    .back-link a:hover { color: var(--text-primary); }
    .query-header h2 { font-size: 1.4rem; }
    .results-list { display: flex; flex-direction: column; gap: 16px; }
    .result-card { padding: 24px; }
    .result-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .result-college { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; }
    .result-exam { font-size: 1.1rem; }
    .result-when { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 8px; font-size: 0.82rem; color: var(--text-secondary); }
    .result-when span { display: inline-flex; align-items: center; gap: 6px; }
    .result-when app-icon { color: var(--text-muted); }
    .seat-info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .seat-info-item { padding: 12px 14px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color); }
    .seat-info-item.highlight { border-color: oklch(0.42 0.13 274 / 0.3); background: oklch(0.42 0.13 274 / 0.06); }
    .seat-info-label { font-family: var(--font-mono); font-size: 0.68rem; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.08em; }
    .seat-info-value { font-family: var(--font-mono); font-size: 1.15rem; font-weight: 600; }
    .bench-visual { padding: 16px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color); }
    .bench-label { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px; }
    .bench-row { display: flex; gap: 8px; }
    .bench-seat {
      width: 52px; height: 52px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      background: var(--bg-secondary); border: 1px solid var(--border-color);
      font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-secondary); font-weight: 500;
    }
    .bench-seat.yours { background: var(--accent-red); border-color: transparent; color: oklch(0.98 0.01 82); font-weight: 600; box-shadow: var(--shadow-md); animation: pulse 2s ease-in-out infinite; }
    .query-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }

    .print-only { display: none; }
    .slip-stamp { margin-top: 16px; padding-top: 12px; border-top: 1px dashed var(--border-strong); font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.04em; color: var(--text-muted); text-align: center; }

    @media print {
      :host { color: #000; }
      .no-print, app-navbar, .back-link { display: none !important; }
      .print-only { display: block !important; }
      .results-page { padding: 0; max-width: 100%; }
      .results-inner { gap: 0; }
      .result-card {
        break-inside: avoid; box-shadow: none !important;
        background: #fff !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
        border: 1.5px solid #000 !important; margin-bottom: 18px; padding: 22px;
        print-color-adjust: exact; -webkit-print-color-adjust: exact;
      }
      .bench-seat.yours { animation: none !important; }
    }
  `]
})
export class SearchResultsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private examService = inject(ExamService);

  hallTicket = '';
  loading = signal(true);
  results = signal<SearchHit[]>([]);

  range = (n: number): number[] => Array.from({ length: Math.max(n || 0, 1) }, (_, i) => i + 1);
  print() { window.print(); }

  async ngOnInit() {
    this.hallTicket = this.route.snapshot.queryParamMap.get('q') ?? '';
    if (!this.hallTicket) { this.loading.set(false); return; }
    try {
      const raw = await this.examService.searchByHallTicket(this.hallTicket);
      this.results.set(raw);
    } catch {
      this.results.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
