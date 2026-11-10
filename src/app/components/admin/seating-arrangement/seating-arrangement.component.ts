import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { LoaderComponent } from '../../../shared/loader/loader.component';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ExamService } from '../../../services/exam.service';
import { RoomService } from '../../../services/room.service';
import { TeacherService } from '../../../services/teacher.service';
import { ToastService } from '../../../services/toast.service';
import { AttendanceService } from '../../../services/attendance.service';
import { Student } from '../../../models/student.model';
import { Room, roomColumns, benchGrid, formatFloor } from '../../../models/room.model';
import { Exam } from '../../../models/exam.model';
import { Teacher } from '../../../models/teacher.model';
import { BRAND } from '../../../brand';
import { firstValueFrom } from 'rxjs';

interface SeatSlot { seatNo: number; student: Student | null; }
interface BenchCell { bench: number; seats: SeatSlot[]; }
interface HallColumn { index: number; benches: BenchCell[]; }
interface RoomPlan { room: Room; columns: HallColumn[]; seated: number; benches: number; }

@Component({
  selector: 'app-seating-arrangement',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminSidebarComponent, LoaderComponent, ToastComponent, IconComponent],
  template: `
    <app-toast />
    <div class="admin-layout">
      <app-admin-sidebar />
      <main class="admin-main">
        @if (loading()) {
          <app-loader message="Drawing hall plans…" />
        } @else {
          <div class="page-content fade-in" [class.show-attendance]="printMode() === 'attendance'">

            <header class="map-head no-print">
              <div class="map-id">
                <a [routerLink]="['/admin/exams', examId]" class="back-link">
                  <app-icon name="arrow-left" [size]="14" /> Back to exam
                </a>
                <span class="eyebrow">Hall plan</span>
                <h1 class="page-title">{{ exam()?.name || 'Seating' }}</h1>
                @if (exam(); as ex) {
                  <div class="map-meta">
                    @if (ex.subjectCode) { <span class="badge badge-gray">{{ ex.subjectCode }}</span> }
                    @if (ex.date) { <span><app-icon name="calendar" [size]="13" /> {{ ex.date | date:'EEE, dd MMM yyyy' }}</span> }
                    @if (ex.startTime) { <span><app-icon name="clock" [size]="13" /> {{ ex.startTime }} – {{ ex.endTime }}</span> }
                    <span><app-icon name="users" [size]="13" /> {{ allSeated().length }} seated</span>
                  </div>
                }
              </div>

              <div class="map-actions">
                <button class="btn btn-outline" (click)="printMap()"><app-icon name="printer" [size]="15" /> Print plan</button>
                <button class="btn btn-outline" (click)="printAttendanceSheet()"><app-icon name="clipboard" [size]="15" /> Attendance sheet</button>
                <button class="btn btn-ghost" (click)="exportCsv()"><app-icon name="upload" [size]="15" /> CSV</button>
              </div>
            </header>

            <!-- Print letterhead -->
            @if (exam(); as ex) {
              <div class="sheet-head print-only">
                <div class="sheet-org">{{ stamp }}</div>
                <h1 class="sheet-title">{{ ex.name }}</h1>
                <div class="sheet-meta">
                  <span>{{ ex.subjectCode }}</span>
                  <span>{{ ex.date | date:'dd MMM yyyy' }}</span>
                  <span>{{ ex.startTime }} – {{ ex.endTime }}</span>
                </div>
              </div>
            }

            @if (roomPlans().length === 0) {
              <div class="card empty-state">
                <div class="empty-state-icon"><app-icon name="seat" [size]="26" /></div>
                <h3>No seating allotted yet</h3>
                <p>Go back to the exam and run the allotment — the hall plans appear here once seats are assigned.</p>
                <a [routerLink]="['/admin/exams', examId]" class="btn btn-primary mt-16">Back to exam</a>
              </div>
            } @else {
              <div class="legend no-print">
                <span><i class="key key-free"></i> Empty</span>
                <span><i class="key key-taken"></i> Allotted</span>
                <span><i class="key key-absent"></i> Absent</span>
                <span class="legend-note">Benches are numbered down each column, front to back.</span>
              </div>

              @for (plan of roomPlans(); track plan.room.id) {
                <section class="card hall">
                  <header class="hall-head">
                    <div class="hall-id">
                      <h2 class="hall-name">{{ plan.room.name }}</h2>
                      <div class="hall-meta">
                        <span class="badge badge-gray">{{ formatFloor(plan.room.floor) }}</span>
                        <span class="badge badge-blue">{{ plan.seated }} / {{ plan.room.totalCapacity }} seated</span>
                        @if (roomAbsentCount(plan.room.id) > 0) {
                          <span class="badge badge-red">{{ roomAbsentCount(plan.room.id) }} absent</span>
                        }
                        <span class="hall-shape mono">{{ plan.columns.length }} col · {{ plan.benches }} benches · {{ plan.room.seatsPerBench }}/bench</span>
                      </div>
                    </div>
                    <div class="hall-invig">
                      <span class="eyebrow">Invigilator</span>
                      <span class="invig-names">
                        {{ invigilatorsFor(plan.room.id).length ? invigilatorsFor(plan.room.id).join(' · ') : '—' }}
                      </span>
                    </div>
                  </header>

                  <div class="hall-plan">
                    <div class="board"><span>Board · front of hall</span></div>

                    <div class="plan-scroll">
                      <div class="plan-columns">
                        @for (col of plan.columns; track col.index) {
                          <div class="hall-col">
                            <div class="hall-col-label">Column {{ col.index }}</div>
                            @for (cell of col.benches; track cell.bench) {
                              <div class="bench">
                                <span class="bench-no mono">{{ cell.bench }}</span>
                                <div class="bench-seats">
                                  @for (slot of cell.seats; track slot.seatNo) {
                                    <div class="seat"
                                      [class.taken]="slot.student !== null"
                                      [class.absent]="slot.student && isAbsent(slot.student.hallTicketNo)"
                                      >
                                      @if (slot.student) {
                                        <span class="s-ticket mono">{{ slot.student.hallTicketNo }}</span>
                                        <span class="s-name">{{ slot.student.name }}</span>
                                        <span class="s-foot">
                                          <span class="s-dept">{{ slot.student.department || '—' }}</span>
                                          <span class="s-pos mono">S{{ slot.seatNo }}</span>
                                        </span>
                                      } @else {
                                        <span class="s-empty mono">S{{ slot.seatNo }}</span>
                                      }
                                    </div>
                                  }
                                </div>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    </div>

                    <div class="rear"><span>Back of hall</span></div>
                  </div>
                </section>
              }
            }

            <!-- Printable attendance register (print-only) -->
            <div class="attendance-sheet">
              @for (plan of roomPlans(); track plan.room.id) {
                <section class="att-room">
                  <div class="att-room-head">
                    <div class="sheet-org">{{ stamp }}</div>
                    <h2>{{ exam()?.name }} — {{ plan.room.name }}</h2>
                    <div class="att-room-meta">
                      @if (exam()?.date) { <span>{{ exam()!.date | date:'dd MMM yyyy' }}</span> }
                      @if (exam()?.startTime) { <span>{{ exam()!.startTime }} – {{ exam()!.endTime }}</span> }
                      <span>{{ formatFloor(plan.room.floor) }}</span>
                      <span>Invigilator: {{ invigilatorsFor(plan.room.id).length ? invigilatorsFor(plan.room.id).join(', ') : '____________' }}</span>
                    </div>
                  </div>
                  <table class="att-table">
                    <thead>
                      <tr><th>#</th><th>Hall ticket</th><th>Name</th><th>Bench / seat</th><th>Present</th><th>Signature</th></tr>
                    </thead>
                    <tbody>
                      @for (s of attendanceRoom(plan); track s.hallTicketNo; let i = $index) {
                        <tr [class.att-absent]="isAbsent(s.hallTicketNo)">
                          <td>{{ i + 1 }}</td>
                          <td class="mono">{{ s.hallTicketNo }}</td>
                          <td>{{ s.name }}</td>
                          <td class="mono">B{{ s.assignedBench }} · S{{ s.assignedSeat }}</td>
                          <td class="att-mark">{{ isAbsent(s.hallTicketNo) ? 'A' : '' }}</td>
                          <td></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  <div class="att-foot">
                    <span>Present: {{ attendanceRoom(plan).length - roomAbsentCount(plan.room.id) }}</span>
                    <span>Absent: {{ roomAbsentCount(plan.room.id) }}</span>
                    <span>Total: {{ attendanceRoom(plan).length }}</span>
                    <span class="att-sign">Invigilator signature: ____________________</span>
                  </div>
                </section>
              }
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`

    .map-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-bottom: 18px; }
    .back-link { display: inline-flex; align-items: center; gap: 5px; color: var(--text-muted); font-size: 0.79rem; margin-bottom: 10px; }
    .back-link:hover { color: var(--text-primary); }
    .map-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin-top: 8px; font-size: 0.82rem; color: var(--text-secondary); }
    .map-meta span { display: inline-flex; align-items: center; gap: 6px; }
    .map-meta app-icon { color: var(--text-muted); }
    .map-actions { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
    .att-tally { font-size: 0.8rem; margin-right: 4px; color: var(--text-secondary); }

    .notice {
      display: flex; align-items: center; gap: 9px; margin-bottom: 16px;
      padding: 10px 13px; border-radius: var(--radius-sm); font-size: 0.85rem;
      color: var(--text-secondary); background: var(--bg-secondary); border: 1px solid var(--border-color);
    }
    .notice app-icon { color: var(--accent-blue); flex-shrink: 0; }

    .legend { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; font-size: 0.76rem; color: var(--text-muted); }
    .legend span { display: inline-flex; align-items: center; gap: 6px; }
    .legend-note { margin-left: auto; }
    .key { width: 13px; height: 13px; border-radius: 2px; border: 1px solid var(--border-strong); display: inline-block; }
    .key-free { background: var(--bg-secondary); }
    .key-taken { background: color-mix(in oklch, var(--accent-blue) 14%, var(--bg-card)); border-color: color-mix(in oklch, var(--accent-blue) 40%, transparent); }
    .key-absent { background: color-mix(in oklch, var(--accent-red) 14%, var(--bg-card)); border-color: color-mix(in oklch, var(--accent-red) 45%, transparent); }

    /* ── Hall ── */
    .hall { margin-bottom: 20px; overflow: hidden; }
    .hall-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 15px 18px; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary); }
    .hall-name { font-size: 1.28rem; letter-spacing: -0.012em; }
    .hall-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 7px; }
    .hall-shape { font-size: 0.71rem; color: var(--text-muted); letter-spacing: 0.03em; }
    .hall-invig { text-align: right; display: flex; flex-direction: column; gap: 3px; }
    .invig-names { font-size: 0.88rem; color: var(--text-primary); }

    .hall-plan { padding: 0; }
    .board, .rear {
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase;
      color: var(--text-muted);
    }
    .board { padding: 11px; background: var(--bg-sunken); border-bottom: 1px solid var(--border-color); }
    .board span { position: relative; }
    .board span::before, .board span::after { content: ''; position: absolute; top: 50%; width: 40px; height: 1px; background: var(--border-strong); }
    .board span::before { right: calc(100% + 12px); }
    .board span::after { left: calc(100% + 12px); }
    .rear { padding: 10px; border-top: 1px solid var(--border-color); }

    .plan-scroll { overflow-x: auto; padding: 18px; }
    .plan-columns { display: flex; gap: 22px; align-items: flex-start; min-width: min-content; }
    .hall-col { display: flex; flex-direction: column; gap: 6px; flex: 0 0 auto; }
    .hall-col-label { font-family: var(--font-mono); font-size: 0.61rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 2px; text-align: center; }

    .bench { display: flex; align-items: stretch; gap: 5px; }
    .bench-no {
      flex: 0 0 auto; width: 22px; display: flex; align-items: center; justify-content: center;
      font-size: 0.64rem; color: var(--text-muted);
      border-right: 1px dashed var(--border-color);
    }
    .bench-seats { display: flex; gap: 4px; }

    .seat {
      width: 104px; min-height: 50px;
      display: flex; flex-direction: column; gap: 1px; justify-content: center;
      padding: 5px 7px; border-radius: 3px;
      border: 1px solid var(--border-color); background: var(--bg-secondary);
      transition: border-color var(--transition), background var(--transition);
    }
    .seat.taken { background: color-mix(in oklch, var(--accent-blue) 7%, var(--bg-card)); border-color: color-mix(in oklch, var(--accent-blue) 30%, transparent); }
    .seat.actionable { cursor: pointer; }
    .seat.actionable:hover { border-color: var(--accent-blue); }
    .seat.absent { background: color-mix(in oklch, var(--accent-red) 9%, var(--bg-card)) !important; border-color: color-mix(in oklch, var(--accent-red) 45%, transparent) !important; }
    .seat.absent .s-ticket, .seat.absent .s-name { text-decoration: line-through; opacity: 0.65; }

    .s-ticket { font-size: 0.67rem; font-weight: 500; color: var(--accent-blue); letter-spacing: 0.01em; }
    .s-name { font-size: 0.72rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .s-foot { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 0.6rem; color: var(--text-muted); }
    .s-dept { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .s-empty { display: flex; align-items: center; justify-content: center; height: 100%; min-height: 38px; font-size: 0.66rem; color: var(--text-muted); opacity: 0.5; }

    /* ── Print ── */
    .print-only { display: none; }
    .sheet-org { font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.2em; color: #555; margin-bottom: 6px; }
    .sheet-title { font-size: 1.4rem; }
    .sheet-meta { display: flex; gap: 14px; flex-wrap: wrap; font-family: var(--font-mono); font-size: 0.74rem; color: #444; margin-top: 4px; }

    .attendance-sheet { display: none; }
    .att-room-head h2 { font-size: 1.15rem; margin-bottom: 4px; }
    .att-room-meta { display: flex; gap: 14px; flex-wrap: wrap; font-size: 0.78rem; color: #333; margin-bottom: 8px; }
    .att-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    .att-table th, .att-table td { border: 1px solid #999; padding: 5px 8px; text-align: left; }
    .att-table th { background: #efefef; }
    .att-table .att-mark { text-align: center; font-weight: 700; }
    .att-absent td { background: #f4f4f4; }
    .att-foot { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 8px; font-size: 0.8rem; }
    .att-foot .att-sign { margin-left: auto; }

    @media print {
      @page { margin: 12mm; size: A4 landscape; }
      app-admin-sidebar, .no-print { display: none !important; }
      .print-only { display: block !important; }
      .page-content { padding: 0; max-width: 100%; }
      :host { color: #000; }

      .sheet-head { margin-bottom: 10px; border-bottom: 1.5px solid #000; padding-bottom: 8px; }

      .attendance-sheet { display: block; }
      .att-room { break-inside: avoid; page-break-inside: avoid; }
      .att-room + .att-room { page-break-before: always; }
      .page-content:not(.show-attendance) .attendance-sheet { display: none !important; }
      .show-attendance .hall,
      .show-attendance .sheet-head { display: none !important; }

      .hall { break-inside: avoid; page-break-inside: avoid; margin-bottom: 12px; border: 1.5px solid #000 !important; }
      .hall + .hall { page-break-before: always; }
      .hall-head { background: #f2f2f2 !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .board, .rear { background: #f7f7f7 !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .plan-scroll { overflow: visible !important; padding: 10px; }
      .plan-columns { gap: 12px; }
      .seat { width: 92px; min-height: 42px; break-inside: avoid; }
      .seat.taken { border-color: #000 !important; background: #fff !important; }
      .s-ticket { color: #000 !important; font-weight: 600; }
    }
  `]
})
export class SeatingArrangementComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private examService = inject(ExamService);
  private roomService = inject(RoomService);
  private teacherService = inject(TeacherService);
  private attendance = inject(AttendanceService);
  private toastService = inject(ToastService);

  examId = '';
  stamp = BRAND.stamp;
  loading = signal(true);
  exam = signal<Exam | null>(null);
  roomPlans = signal<RoomPlan[]>([]);
  teachers = signal<Teacher[]>([]);
  formatFloor = formatFloor;

  allSeated = signal<Student[]>([]);
  absentSet = signal<Set<string>>(new Set());

  printMode = signal<'map' | 'attendance'>('map');

  private printWith(mode: 'map' | 'attendance') {
    this.printMode.set(mode);
    // Let the bound class flush to the DOM before the print dialog opens.
    setTimeout(() => window.print(), 60);
  }
  printMap() { this.printWith('map'); }
  printAttendanceSheet() { this.printWith('attendance'); }

  attendanceRoom = (plan: RoomPlan) =>
    this.allSeated()
      .filter(s => s.assignedRoom === plan.room.id)
      .sort((a, b) => (a.assignedBench ?? 0) - (b.assignedBench ?? 0) || (a.assignedSeat ?? 0) - (b.assignedSeat ?? 0));

  exportCsv() {
    const rows = [['Hall Ticket', 'Name', 'Department', 'Hall', 'Floor', 'Bench', 'Seat', 'Status']];
    for (const plan of this.roomPlans()) {
      for (const s of this.attendanceRoom(plan)) {
        rows.push([
          s.hallTicketNo, s.name, s.department ?? '', plan.room.name, plan.room.floor,
          String(s.assignedBench ?? ''), String(s.assignedSeat ?? ''),
          this.isAbsent(s.hallTicketNo) ? 'Absent' : 'Present'
        ]);
      }
    }
    if (rows.length === 1) { this.toastService.error('Nothing to export yet.'); return; }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${(this.exam()?.name ?? 'exam').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toastService.success(`Exported ${rows.length - 1} rows.`);
  }

  isAbsent = (ticket: string) => this.absentSet().has(ticket);
  absentCount = () => this.allSeated().filter(s => this.absentSet().has(s.hallTicketNo)).length;
  roomAbsentCount = (roomId: string) =>
    this.allSeated().filter(s => s.assignedRoom === roomId && this.absentSet().has(s.hallTicketNo)).length;

  /** Absentees come from the invigilators' submitted sheets — one source of truth. */
  private async loadAbsent() {
    const sheets = await this.attendance.forExam(this.examId).catch(() => []);
    this.absentSet.set(new Set(sheets.flatMap(x => x.absentHallTickets)));
  }

  /** Invigilator names assigned to a hall, for the hall header. */
  invigilatorsFor(roomId: string): string[] {
    const ids = this.exam()?.invigilators?.[roomId] ?? [];
    return ids.map(id => this.teachers().find(t => t.id === id)?.name).filter((n): n is string => !!n);
  }

  async ngOnInit() {
    this.examId = this.route.snapshot.paramMap.get('id')!;
    try {
      const [exam, students, rooms, teachers] = await Promise.all([
        this.examService.getExam(this.examId),
        this.examService.getStudents(this.examId),
        firstValueFrom(this.roomService.getRooms()),
        firstValueFrom(this.teacherService.getTeachers())
      ]);
      this.exam.set(exam);
      this.teachers.set(teachers ?? []);
      this.allSeated.set(students.filter(s => s.isSeated));
      await this.loadAbsent();
      this.roomPlans.set(this.buildPlans(rooms ?? []));
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Could not load the hall plans.');
    } finally { this.loading.set(false); }
  }

  /** Lay each hall out as columns of benches, filled from the seated roster. */
  private buildPlans(rooms: Room[]): RoomPlan[] {
    const seated = this.allSeated();
    const plans: RoomPlan[] = [];

    for (const room of rooms) {
      const occupants = seated.filter(s => s.assignedRoom === room.id);
      if (occupants.length === 0) continue;

      // One lookup per bench beats a filter() inside the render loop.
      const byBench = new Map<number, Student[]>();
      for (const s of occupants) {
        const b = s.assignedBench ?? 0;
        if (!byBench.has(b)) byBench.set(b, []);
        byBench.get(b)!.push(s);
      }

      const grid = benchGrid(roomColumns(room));
      const columns: HallColumn[] = grid.map((benchNumbers, ci) => ({
        index: ci + 1,
        benches: benchNumbers.map(bench => ({
          bench,
          seats: Array.from({ length: room.seatsPerBench }, (_, i) => ({
            seatNo: i + 1,
            student: byBench.get(bench)?.find(s => s.assignedSeat === i + 1) ?? null
          }))
        }))
      }));

      plans.push({
        room,
        columns,
        seated: occupants.length,
        benches: grid.reduce((n, c) => n + c.length, 0)
      });
    }

    return plans;
  }
}
