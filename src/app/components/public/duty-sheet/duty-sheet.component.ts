import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AttendanceService } from '../../../services/attendance.service';
import { ExamService } from '../../../services/exam.service';
import { ToastService } from '../../../services/toast.service';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { LoaderComponent } from '../../../shared/loader/loader.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { BrandMarkComponent } from '../../../shared/brand-mark/brand-mark.component';
import { Attendance } from '../../../models/attendance.model';
import { PublicSeat } from '../../../models/student.model';
import { BRAND } from '../../../brand';

/**
 * The invigilator's whole experience: open the private link, tap absentees,
 * submit. No account, no login — the link is the key.
 */
@Component({
  selector: 'app-duty-sheet',
  standalone: true,
  imports: [CommonModule, ToastComponent, LoaderComponent, IconComponent, BrandMarkComponent],
  template: `
    <app-toast />
    <nav class="ds-nav">
      <app-brand-mark [size]="28" />
      <span class="ds-brand">{{ brand.name }}</span>
    </nav>

    <main class="ds-main">
      @if (loading()) {
        <app-loader message="Opening attendance sheet…" />
      } @else if (!sheet()) {
        <div class="card empty-state">
          <div class="empty-state-icon"><app-icon name="alert" [size]="26" /></div>
          <h3>This link isn't active</h3>
          <p>The exam may have been withdrawn or the link is mistyped. Ask the examination office for the current link.</p>
        </div>
      } @else {
        <header class="ds-head fade-in">
          @if (sheet()!.collegeName) { <span class="eyebrow">{{ sheet()!.collegeName }}</span> }
          <h1 class="page-title">{{ sheet()!.examName }}</h1>
          <div class="ds-meta">
            <span><app-icon name="building" [size]="14" /> {{ sheet()!.roomName }}</span>
            @if (sheet()!.date) { <span><app-icon name="calendar" [size]="14" /> {{ sheet()!.date | date:'EEE, dd MMM yyyy' }}</span> }
            @if (sheet()!.startTime) { <span><app-icon name="clock" [size]="14" /> {{ sheet()!.startTime }} – {{ sheet()!.endTime }}</span> }
          </div>
          @if (sheet()!.invigilators.length) { <p class="ds-inv">Invigilator: {{ sheet()!.invigilators.join(', ') }}</p> }
        </header>

        @if (students().length === 0) {
          <div class="card empty-state"><p>No candidates are seated in this hall.</p></div>
        } @else {
          <div class="ds-bar">
            <span class="mono"><b class="text-success">{{ students().length - absent().size }}</b> present ·
              <b class="text-danger">{{ absent().size }}</b> absent</span>
            <span class="text-muted">Tap a student to mark absent.</span>
          </div>
          <div class="student-grid">
            @for (s of students(); track s.hallTicketNo) {
              <button type="button" class="student-chip" [class.absent]="absent().has(s.hallTicketNo)" (click)="toggle(s.hallTicketNo)">
                <span class="sc-ticket mono">{{ s.hallTicketNo }}</span>
                <span class="sc-name">{{ s.name }}</span>
                <span class="sc-seat mono">Bench {{ s.benchNumber }} · Seat {{ s.seatNumber }}</span>
              </button>
            }
          </div>
          <div class="ds-foot">
            @if (sheet()!.submitted) { <span class="badge badge-green"><app-icon name="check-circle" [size]="13" /> Submitted</span> }
            <button class="btn btn-outline" (click)="print()"><app-icon name="printer" [size]="15" /> Print</button>
            <button class="btn btn-success" (click)="save()" [disabled]="busy()">
              {{ busy() ? 'Saving…' : sheet()!.submitted ? 'Update attendance' : 'Submit attendance' }}
            </button>
          </div>
        }
      }
    </main>

    @if (sheet(); as sh) {
      <div class="print-area">
        <h1>{{ sh.examName }} — {{ sh.roomName }}</h1>
        <p>{{ sh.date | date:'dd MMM yyyy' }} · {{ sh.startTime }}–{{ sh.endTime }} · Invigilator: {{ sh.invigilators.join(', ') || '____________' }}</p>
        <table>
          <thead><tr><th>#</th><th>Hall ticket</th><th>Name</th><th>Bench/Seat</th><th>Absent</th><th>Signature</th></tr></thead>
          <tbody>
            @for (s of students(); track s.hallTicketNo; let i = $index) {
              <tr><td>{{ i + 1 }}</td><td>{{ s.hallTicketNo }}</td><td>{{ s.name }}</td><td>B{{ s.benchNumber }}·S{{ s.seatNumber }}</td>
                <td>{{ absent().has(s.hallTicketNo) ? 'A' : '' }}</td><td></td></tr>
            }
          </tbody>
        </table>
        <p>Present {{ students().length - absent().size }} · Absent {{ absent().size }} · Total {{ students().length }}</p>
      </div>
    }
  `,
  styles: [`
    .ds-nav { display: flex; align-items: center; gap: 10px; height: 56px; padding: 0 20px; background: var(--bg-card); border-bottom: 1px solid var(--border-color); }
    .ds-brand { font-family: var(--font-head); font-weight: 600; font-size: 1.1rem; }
    .ds-main { max-width: 880px; margin: 0 auto; padding: 24px 16px 64px; }
    .ds-meta { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 8px; font-size: 0.85rem; color: var(--text-secondary); }
    .ds-meta span { display: inline-flex; align-items: center; gap: 6px; }
    .ds-inv { margin-top: 6px; font-size: 0.82rem; color: var(--text-muted); }
    .ds-bar { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin: 18px 0 12px; font-size: 0.85rem; }
    .student-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
    .student-chip { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; text-align: left; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-card); cursor: pointer; }
    .student-chip:hover { border-color: var(--accent-blue); }
    .student-chip.absent { background: color-mix(in oklch, var(--accent-red) 12%, transparent); border-color: color-mix(in oklch, var(--accent-red) 45%, transparent); }
    .student-chip.absent .sc-ticket, .student-chip.absent .sc-name { text-decoration: line-through; opacity: 0.75; }
    .sc-ticket { font-size: 0.8rem; color: var(--accent-blue); font-weight: 600; }
    .sc-name { font-size: 0.82rem; }
    .sc-seat { font-size: 0.68rem; color: var(--text-muted); }
    .ds-foot { position: sticky; bottom: 0; display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 18px; padding: 12px 0; background: var(--bg-primary); }
    .print-area { display: none; }
    @media print {
      .ds-nav, .ds-main { display: none !important; }
      .print-area { display: block !important; color: #000; }
      .print-area table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin: 10px 0; }
      .print-area th, .print-area td { border: 1px solid #999; padding: 5px 8px; text-align: left; }
    }
  `]
})
export class DutySheetComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private attendance = inject(AttendanceService);
  private exams = inject(ExamService);
  private toast = inject(ToastService);

  brand = BRAND;
  loading = signal(true);
  busy = signal(false);
  sheet = signal<Attendance | null>(null);
  students = signal<PublicSeat[]>([]);
  absent = signal<Set<string>>(new Set());

  async ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token')!;
    try {
      const sheet = await this.attendance.get(token);
      if (sheet) {
        const seats = await this.exams.getPublicExamSeats(sheet.examId);
        this.students.set(seats
          .filter(s => s.roomId === sheet.roomId)
          .sort((a, b) => a.benchNumber - b.benchNumber || a.seatNumber - b.seatNumber));
        this.absent.set(new Set(sheet.absentHallTickets));
      }
      this.sheet.set(sheet);
    } catch { this.sheet.set(null); }
    finally { this.loading.set(false); }
  }

  toggle(ticket: string) {
    const next = new Set(this.absent());
    next.has(ticket) ? next.delete(ticket) : next.add(ticket);
    this.absent.set(next);
  }

  print() { window.print(); }

  async save() {
    const sheet = this.sheet();
    if (!sheet) return;
    this.busy.set(true);
    try {
      const list = [...this.absent()];
      await this.attendance.submit(sheet.id, list);
      this.sheet.set({ ...sheet, absentHallTickets: list, submitted: true });
      this.toast.success(`Submitted · ${this.students().length - list.length} present, ${list.length} absent.`);
    } catch (e: any) {
      this.toast.error(e?.message ?? 'Could not submit. Check your connection and try again.');
    } finally { this.busy.set(false); }
  }
}
