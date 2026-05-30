import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { DutyService } from '../../../services/duty.service';
import { ExamService } from '../../../services/exam.service';
import { ToastService } from '../../../services/toast.service';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { LoaderComponent } from '../../../shared/loader/loader.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { BrandMarkComponent } from '../../../shared/brand-mark/brand-mark.component';
import { Duty } from '../../../models/duty.model';
import { PublicSeat } from '../../../models/student.model';

@Component({
  selector: 'app-teacher-portal',
  standalone: true,
  imports: [CommonModule, ToastComponent, LoaderComponent, IconComponent, BrandMarkComponent],
  template: `
    <app-toast />
    <nav class="tp-nav">
      <div class="tp-brand"><app-brand-mark [size]="32" /><span class="tp-title">Invigilator Portal</span></div>
      <div class="tp-user">
        @if (email()) { <span class="text-muted">{{ email() }}</span> }
        @if (duties().length) {
          <button class="btn btn-outline btn-sm" (click)="printDuties()"><app-icon name="printer" [size]="16" /> Print Duties</button>
        }
        <button class="btn btn-ghost btn-sm" (click)="logout()"><app-icon name="logout" [size]="16" /> Logout</button>
      </div>
    </nav>

    <main class="tp-main">
      @if (loading()) {
        <app-loader message="Loading your duties..." />
      } @else {
        <div class="tp-head fade-in">
          <h1>My Invigilation Duties</h1>
          <p class="text-muted">{{ duties().length }} {{ duties().length === 1 ? 'duty' : 'duties' }} assigned.</p>
        </div>

        @if (duties().length === 0) {
          <div class="glass-card empty-state">
            <div class="empty-state-icon"><app-icon name="badge" [size]="30" /></div>
            <h3>No duties yet</h3>
            <p>When your college allots you to an exam room, it appears here. Make sure you signed in with the email they registered for you.</p>
          </div>
        } @else {
          <div class="duty-list fade-in">
            @for (d of duties(); track d.id) {
              <div class="duty-card glass-card">
                <div class="duty-top">
                  <div>
                    @if (d.collegeName) { <div class="duty-college">{{ d.collegeName }}</div> }
                    <h3>{{ d.examName }}</h3>
                    <div class="duty-meta">
                      <span><app-icon name="building" [size]="14" /> {{ d.roomName }}</span>
                      @if (d.date) { <span><app-icon name="calendar" [size]="14" /> {{ d.date | date:'EEE, dd MMM yyyy' }}</span> }
                      @if (d.startTime) { <span><app-icon name="clock" [size]="14" /> {{ d.startTime }} – {{ d.endTime }}</span> }
                    </div>
                  </div>
                  <div class="duty-status">
                    @if (d.submitted) { <span class="badge badge-green"><app-icon name="check-circle" [size]="13" /> Submitted</span> }
                    @else { <span class="badge badge-amber">Pending</span> }
                  </div>
                </div>

                <div class="duty-actions">
                  <button class="btn btn-outline btn-sm" (click)="openDuty(d)" [disabled]="busy()">
                    <app-icon name="check-circle" [size]="15" /> {{ d.submitted ? 'Edit attendance' : 'Mark attendance' }}
                  </button>
                </div>

                @if (activeDutyId() === d.id) {
                  <div class="att-panel">
                    @if (seatsLoading()) {
                      <app-loader message="Loading students..." />
                    } @else if (roomStudents().length === 0) {
                      <p class="text-muted att-empty">No published seating found for this room yet. Ask your college to publish the exam first.</p>
                    } @else {
                      <div class="att-bar">
                        <span class="att-counts"><span class="text-success">{{ presentCount() }} present</span> · <span class="text-danger">{{ absentSet().size }} absent</span></span>
                        <span class="text-muted att-hint">Tap a student to toggle absent.</span>
                      </div>
                      <div class="student-grid">
                        @for (s of roomStudents(); track s.hallTicketNo) {
                          <button type="button" class="student-chip" [class.absent]="absentSet().has(s.hallTicketNo)" (click)="toggle(s.hallTicketNo)">
                            <span class="sc-ticket mono">{{ s.hallTicketNo }}</span>
                            <span class="sc-name">{{ s.name }}</span>
                            <span class="sc-seat mono">B{{ s.benchNumber }}·S{{ s.seatNumber }}</span>
                          </button>
                        }
                      </div>
                      <div class="att-foot">
                        <button class="btn btn-ghost btn-sm" (click)="activeDutyId.set(null)">Close</button>
                        <button class="btn btn-outline btn-sm" (click)="printDutySheet(d)"><app-icon name="printer" [size]="15" /> Print Sheet</button>
                        <button class="btn btn-success btn-sm" (click)="save(d)" [disabled]="busy()">
                          {{ busy() ? 'Saving…' : 'Submit Attendance' }}
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      }
    </main>

    <!-- Print-only: duty slip / room attendance sheet (Save as PDF) -->
    <div class="print-area">
      @if (printTarget() === 'duties') {
        <div class="dp-head">
          <h1>Invigilation Duty Slip</h1>
          <div class="dp-sub">{{ email() }}</div>
        </div>
        <table class="dp-table">
          <thead><tr><th>#</th><th>Exam</th><th>College</th><th>Room</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
          <tbody>
            @for (d of duties(); track d.id; let i = $index) {
              <tr>
                <td>{{ i + 1 }}</td>
                <td>{{ d.examName }}</td>
                <td>{{ d.collegeName || '—' }}</td>
                <td>{{ d.roomName }}</td>
                <td>{{ d.date ? (d.date | date:'dd MMM yyyy') : '—' }}</td>
                <td>{{ d.startTime }}–{{ d.endTime }}</td>
                <td>{{ d.submitted ? 'Submitted' : 'Pending' }}</td>
              </tr>
            }
          </tbody>
        </table>
        <div class="dp-foot"><span class="dp-sign">Invigilator signature: ____________________</span></div>
      } @else if (activeDuty(); as ad) {
        <div class="dp-head">
          <h1>{{ ad.examName }} — {{ ad.roomName }}</h1>
          <div class="dp-sub">
            @if (ad.date) { {{ ad.date | date:'dd MMM yyyy' }} · }{{ ad.startTime }}–{{ ad.endTime }} · Invigilator: {{ ad.teacherName || email() }}
          </div>
        </div>
        <table class="dp-table">
          <thead><tr><th>#</th><th>Hall Ticket</th><th>Name</th><th>Bench/Seat</th><th>Present</th><th>Signature</th></tr></thead>
          <tbody>
            @for (s of roomStudents(); track s.hallTicketNo; let i = $index) {
              <tr>
                <td>{{ i + 1 }}</td>
                <td>{{ s.hallTicketNo }}</td>
                <td>{{ s.name }}</td>
                <td>B{{ s.benchNumber }}·S{{ s.seatNumber }}</td>
                <td>{{ absentSet().has(s.hallTicketNo) ? 'A' : '' }}</td>
                <td></td>
              </tr>
            }
          </tbody>
        </table>
        <div class="dp-foot">
          <span>Present: {{ presentCount() }}</span>
          <span>Absent: {{ absentSet().size }}</span>
          <span>Total: {{ roomStudents().length }}</span>
          <span class="dp-sign">Invigilator signature: ____________________</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .tp-nav { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; height: 64px; background: var(--glass-bg-strong); -webkit-backdrop-filter: blur(18px) saturate(1.4); backdrop-filter: blur(18px) saturate(1.4); border-bottom: 1px solid var(--glass-border); }
    .tp-brand { display: flex; align-items: center; gap: 10px; }
    .tp-brand app-brand-mark { --mark-bg: var(--accent-blue); --mark-seat: oklch(1 0 0 / 0.6); --mark-ring: oklch(1 0 0 / 0.28); --mark-you: var(--accent-red); }
    .tp-title { font-family: var(--font-head); font-weight: 600; font-size: 1.15rem; }
    .tp-user { display: flex; align-items: center; gap: 12px; font-size: 0.85rem; }
    .tp-main { max-width: 860px; margin: 0 auto; padding: 28px 20px 64px; }
    .tp-head h1 { font-size: 1.8rem; }
    .tp-head { margin-bottom: 20px; }

    .duty-list { display: flex; flex-direction: column; gap: 14px; }
    .duty-card { padding: 18px 20px; }
    .duty-top { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .duty-college { font-size: 0.78rem; color: var(--text-muted); margin-bottom: 2px; }
    .duty-top h3 { font-size: 1.05rem; }
    .duty-meta { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 8px; font-size: 0.82rem; color: var(--text-secondary); }
    .duty-meta span { display: inline-flex; align-items: center; gap: 6px; }
    .duty-meta app-icon { color: var(--text-muted); }
    .duty-actions { margin-top: 14px; }

    .att-panel { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color); }
    .att-empty { padding: 8px 0; font-size: 0.88rem; }
    .att-bar { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; font-size: 0.84rem; }
    .att-counts { font-family: var(--font-mono); }
    .student-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
    .student-chip { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; text-align: left; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-secondary); cursor: pointer; transition: border-color 0.15s, background 0.15s; }
    .student-chip:hover { border-color: var(--accent-blue); }
    .student-chip.absent { background: oklch(0.50 0.19 25 / 0.12); border-color: oklch(0.50 0.19 25 / 0.45); }
    .student-chip.absent .sc-ticket, .student-chip.absent .sc-name { text-decoration: line-through; opacity: 0.75; }
    .sc-ticket { font-size: 0.78rem; color: var(--accent-blue); font-weight: 600; }
    .sc-name { font-size: 0.8rem; }
    .sc-seat { font-size: 0.68rem; color: var(--text-muted); }
    .att-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; flex-wrap: wrap; }

    /* Print-only duty slip / attendance sheet */
    .print-area { display: none; }
    @media print {
      .tp-nav, .tp-main { display: none !important; }
      .print-area { display: block !important; color: #000; }
      .dp-head h1 { font-size: 1.4rem; margin-bottom: 4px; }
      .dp-sub { color: #333; font-size: 0.85rem; margin-bottom: 12px; }
      .dp-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
      .dp-table th, .dp-table td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
      .dp-table th { background: #f0f0f0; }
      .dp-foot { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 12px; font-size: 0.85rem; }
      .dp-foot .dp-sign { margin-left: auto; }
      @page { margin: 14mm; }
    }
  `]
})
export class TeacherPortalComponent implements OnInit {
  private auth = inject(AuthService);
  private dutyService = inject(DutyService);
  private examService = inject(ExamService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  loading = signal(true);
  busy = signal(false);
  seatsLoading = signal(false);
  duties = signal<Duty[]>([]);
  email = signal<string | null>(null);

  activeDutyId = signal<string | null>(null);
  roomStudents = signal<PublicSeat[]>([]);
  absentSet = signal<Set<string>>(new Set());
  printTarget = signal<string>('');

  presentCount = () => this.roomStudents().length - this.absentSet().size;
  activeDuty = () => this.duties().find(d => d.id === this.activeDutyId()) ?? null;

  printDuties() { this.printTarget.set('duties'); setTimeout(() => window.print(), 60); }
  printDutySheet(d: Duty) { this.activeDutyId.set(d.id); this.printTarget.set(d.id); setTimeout(() => window.print(), 60); }

  async ngOnInit() {
    this.email.set(this.auth.currentEmail);
    try {
      this.duties.set(await this.dutyService.getMyDuties());
    } finally { this.loading.set(false); }
  }

  async openDuty(d: Duty) {
    if (this.activeDutyId() === d.id) { this.activeDutyId.set(null); return; }
    this.activeDutyId.set(d.id);
    this.roomStudents.set([]);
    this.seatsLoading.set(true);
    try {
      const seats = await this.examService.getPublicExamSeats(d.examId);
      const mine = seats
        .filter(s => s.roomName === d.roomName)
        .sort((a, b) => a.benchNumber - b.benchNumber || a.seatNumber - b.seatNumber);
      this.roomStudents.set(mine);
      this.absentSet.set(new Set(d.absentHallTickets ?? []));
    } finally { this.seatsLoading.set(false); }
  }

  toggle(ticket: string) {
    const next = new Set(this.absentSet());
    next.has(ticket) ? next.delete(ticket) : next.add(ticket);
    this.absentSet.set(next);
  }

  async save(d: Duty) {
    this.busy.set(true);
    try {
      const absent = [...this.absentSet()];
      await this.dutyService.submitAttendance(d.id, absent);
      this.duties.set(this.duties().map(x => x.id === d.id ? { ...x, absentHallTickets: absent, submitted: true } : x));
      this.toastService.success(`Attendance submitted · ${this.presentCount()} present, ${absent.length} absent.`);
      this.activeDutyId.set(null);
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Failed to submit attendance.');
    } finally { this.busy.set(false); }
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/teacher/login']);
  }
}
