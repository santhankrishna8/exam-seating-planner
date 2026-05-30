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
import { Student } from '../../../models/student.model';
import { Room, roomRowLayout } from '../../../models/room.model';
import { Exam } from '../../../models/exam.model';
import { Teacher } from '../../../models/teacher.model';
import { firstValueFrom } from 'rxjs';

interface SeatCell { students: Student[]; bench: number; }
interface BenchRow { rowIndex: number; cells: SeatCell[]; }
interface RoomData { room: Room; benchRows: BenchRow[]; seated: number; }

function formatFloor(floor: string): string {
  if (!floor) return '—';
  if (floor.toLowerCase().includes('floor') || floor.toLowerCase().includes('ground')) return floor;
  const n = parseInt(floor);
  if (isNaN(n)) return floor;
  if (n === 0) return 'Ground Floor';
  const s = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${s} Floor`;
}

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
          <app-loader message="Loading seating map..." />
        } @else {
          <div class="page-content fade-in" [class.show-attendance]="printMode() === 'attendance'">
            <div class="section-header no-print">
              <div>
                <a [routerLink]="['/admin/exams', examId]" class="back-link">← Back to Exam</a>
                <h1>Seating Map</h1>
                @if (exam(); as ex) {
                  <div class="map-meta">
                    <span class="map-exam">{{ ex.name }}</span>
                    @if (ex.date) { <span><app-icon name="calendar" [size]="14" /> {{ ex.date | date:'dd MMM yyyy' }}</span> }
                    @if (ex.startTime) { <span><app-icon name="clock" [size]="14" /> {{ ex.startTime }} – {{ ex.endTime }}</span> }
                  </div>
                }
              </div>
              <div class="map-actions">
                @if (attendanceMode()) {
                  <span class="att-summary">
                    <span class="text-success">{{ presentCount() }} present</span> ·
                    <span class="text-danger">{{ absentCount() }} absent</span>
                  </span>
                  <button class="btn btn-ghost" (click)="cancelAttendance()" [disabled]="savingAttendance()">Cancel</button>
                  <button class="btn btn-success" (click)="saveAttendance()" [disabled]="savingAttendance()">
                    {{ savingAttendance() ? 'Saving…' : 'Save Attendance' }}
                  </button>
                } @else {
                  <button class="btn btn-outline" (click)="attendanceMode.set(true)"><app-icon name="check-circle" [size]="17" /> Mark Attendance</button>
                  <button class="btn btn-outline" (click)="printMap()"><app-icon name="printer" [size]="17" /> Seating Map</button>
                  <button class="btn btn-outline" (click)="printAttendanceSheet()"><app-icon name="clipboard" [size]="17" /> Attendance Sheet</button>
                  <button class="btn btn-ghost" (click)="exportCsv()"><app-icon name="upload" [size]="17" /> CSV</button>
                }
              </div>
            </div>
            @if (attendanceMode()) {
              <div class="att-hint no-print"><app-icon name="info" [size]="16" /> Tap a student's seat to toggle present / absent, then Save.</div>
            }

            @if (exam(); as ex) {
              <div class="print-head print-only">
                <h1 class="print-title">{{ ex.name }}</h1>
                <div class="print-meta">
                  <span>{{ ex.subjectCode }}</span>
                  <span>{{ ex.date | date:'dd MMM yyyy' }}</span>
                  <span>{{ ex.startTime }} – {{ ex.endTime }}</span>
                </div>
              </div>
            }

            @if (roomData().length === 0) {
              <div class="glass-card empty-state">
                <div class="empty-state-icon"><app-icon name="seat" [size]="30" /></div>
                <h3>No seating generated yet</h3>
                <p>Go back and generate seating first.</p>
              </div>
            } @else {
              @for (rd of roomData(); track rd.room.id) {
                <div class="room-block glass-card">
                  <div class="room-block-header">
                    <div class="room-header-info">
                      <h2 class="room-block-title">{{ rd.room.name }}</h2>
                      <div class="room-header-meta">
                        @if (rd.room.floor) {
                          <span class="badge badge-gray"><app-icon name="pin" [size]="13" /> {{ formatFloor(rd.room.floor) }}</span>
                        }
                        <span class="badge badge-blue">{{ rd.seated }}/{{ rd.room.totalCapacity }} seated</span>
                        @if (roomAbsentCount(rd.room.id) > 0) {
                          <span class="badge badge-red">{{ roomAbsentCount(rd.room.id) }} absent</span>
                        }
                        <span class="text-muted" style="font-size:0.8rem">{{ rd.room.rowsCount }} rows × {{ rd.room.benchesPerRow }} benches × {{ rd.room.seatsPerBench }} seats</span>
                      </div>
                      @if (invigilatorsFor(rd.room.id).length) {
                        <div class="room-invig"><app-icon name="badge" [size]="14" /> Invigilator: {{ invigilatorsFor(rd.room.id).join(', ') }}</div>
                      }
                    </div>
                  </div>

                  <!-- Vertical room layout: each row of benches is a horizontal strip -->
                  <div class="room-layout">
                    <div class="room-direction-label">↑ Front of room</div>
                    @for (brow of rd.benchRows; track brow.rowIndex) {
                      <div class="bench-row-strip">
                        <div class="row-label">Row {{ brow.rowIndex }}</div>
                        <div class="bench-row-cells">
                          @for (cell of brow.cells; track cell.bench) {
                            <div class="bench-unit">
                              <div class="bench-num-label">B{{ cell.bench }}</div>
                              <div class="bench-seats-v">
                                @for (s of getSeatSlots(cell, rd.room.seatsPerBench); track s.seatNo) {
                                  <div class="seat-v"
                                    [class.occupied]="s.student !== null"
                                    [class.absent]="s.student && isAbsent(s.student.hallTicketNo)"
                                    [class.clickable]="attendanceMode() && s.student"
                                    (click)="s.student && attendanceMode() ? toggleAbsent(s.student.hallTicketNo) : null">
                                    @if (s.student) {
                                      <div class="sv-ticket">{{ s.student.hallTicketNo }}</div>
                                      <div class="sv-name">{{ s.student.name | slice:0:10 }}</div>
                                      @if (s.student.department) {
                                        <div class="sv-dept">{{ s.student.department | slice:0:6 }}</div>
                                      }
                                    } @else {
                                      <div class="sv-empty">S{{ s.seatNo }}</div>
                                    }
                                  </div>
                                }
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    }
                    <div class="room-direction-label">↓ Back of room</div>
                  </div>
                </div>
              }
            }

            <!-- Printable attendance sheet (print-only; shown when printing attendance) -->
            <div class="attendance-sheet">
              @for (rd of roomData(); track rd.room.id) {
                <section class="att-room">
                  <div class="att-room-head">
                    <h2>{{ exam()?.name }} — {{ rd.room.name }}</h2>
                    <div class="att-room-meta">
                      @if (exam()?.date) { <span>{{ exam()!.date | date:'dd MMM yyyy' }}</span> }
                      @if (exam()?.startTime) { <span>{{ exam()!.startTime }} – {{ exam()!.endTime }}</span> }
                      <span>Invigilator: {{ invigilatorsFor(rd.room.id).length ? invigilatorsFor(rd.room.id).join(', ') : '____________' }}</span>
                    </div>
                  </div>
                  <table class="att-table">
                    <thead>
                      <tr><th>#</th><th>Hall Ticket</th><th>Name</th><th>Bench/Seat</th><th>Present</th><th>Signature</th></tr>
                    </thead>
                    <tbody>
                      @for (s of attendanceRoom(rd); track s.hallTicketNo; let i = $index) {
                        <tr [class.att-absent]="isAbsent(s.hallTicketNo)">
                          <td>{{ i + 1 }}</td>
                          <td class="mono">{{ s.hallTicketNo }}</td>
                          <td>{{ s.name }}</td>
                          <td class="mono">B{{ s.assignedBench }}·S{{ s.assignedSeat }}</td>
                          <td class="att-mark">{{ isAbsent(s.hallTicketNo) ? 'A' : '' }}</td>
                          <td></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  <div class="att-foot">
                    <span>Present: {{ attendanceRoom(rd).length - roomAbsentCount(rd.room.id) }}</span>
                    <span>Absent: {{ roomAbsentCount(rd.room.id) }}</span>
                    <span>Total: {{ attendanceRoom(rd).length }}</span>
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
    .admin-layout { display: flex; min-height: 100vh; }
    .admin-main { flex: 1; overflow-y: auto; }
    .back-link { color: var(--text-muted); font-size: 0.8rem; text-decoration: none; display: block; margin-bottom: 6px; }
    .back-link:hover { color: var(--text-primary); }
    h1 { font-size: 1.5rem; }
    .map-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin-top: 6px; font-size: 0.85rem; color: var(--text-secondary); }
    .map-meta span { display: inline-flex; align-items: center; gap: 6px; }
    .map-meta .map-exam { font-weight: 500; color: var(--text-primary); }
    .map-meta app-icon { color: var(--text-muted); }
    .map-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .att-summary { font-size: 0.85rem; font-family: var(--font-mono); margin-right: 4px; }
    .att-hint { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-secondary); background: oklch(0.42 0.13 274 / 0.08); border: 1px solid oklch(0.42 0.13 274 / 0.2); }
    .seat-v.clickable { cursor: pointer; }
    .seat-v.clickable:hover { border-color: var(--accent-blue); }
    .seat-v.absent { background: oklch(0.50 0.19 25 / 0.12) !important; border-color: oklch(0.50 0.19 25 / 0.45) !important; }
    .seat-v.absent .sv-ticket, .seat-v.absent .sv-name { text-decoration: line-through; opacity: 0.7; }

    .room-block { padding: 0; margin-bottom: 24px; overflow: hidden; }
    .room-block-header { padding: 16px 20px; border-bottom: 1px solid var(--border-color); }
    .room-header-info { display: flex; flex-direction: column; gap: 6px; }
    .room-block-title { font-size: 1.1rem; font-weight: 600; }
    .room-header-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .room-invig { display: inline-flex; align-items: center; gap: 7px; margin-top: 4px; font-size: 0.82rem; color: var(--text-secondary); }
    .room-invig app-icon { color: var(--accent-blue); }

    .room-layout { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; overflow-x: auto; }
    .room-direction-label { font-size: 0.72rem; color: var(--text-muted); text-align: center; letter-spacing: 0.08em; padding: 4px; }

    .bench-row-strip { display: flex; align-items: flex-start; gap: 8px; }
    .row-label {
      font-size: 0.7rem; color: var(--text-muted); width: 44px; flex-shrink: 0;
      text-align: right; padding-top: 28px; font-weight: 600;
    }
    .bench-row-cells { display: flex; gap: 8px; flex-wrap: nowrap; }

    .bench-unit { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .bench-num-label { font-size: 0.65rem; color: var(--text-muted); font-weight: 600; letter-spacing: 0.05em; }

    .bench-seats-v { display: flex; flex-direction: column; gap: 3px; }

    .seat-v {
      width: 88px; min-height: 56px; border-radius: 6px; padding: 6px 7px;
      border: 1px solid var(--border-color); background: var(--bg-secondary);
      display: flex; flex-direction: column; gap: 2px;
      transition: border-color 0.2s;
    }
    .seat-v.occupied {
      background: oklch(0.42 0.13 274 / 0.07); border-color: oklch(0.42 0.13 274 / 0.28);
    }
    .sv-ticket { font-family: var(--font-mono); font-size: 0.68rem; color: var(--accent-blue); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sv-name { font-size: 0.72rem; color: var(--text-primary); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sv-dept { font-size: 0.62rem; color: var(--text-muted); }
    .sv-empty { display: flex; align-items: center; justify-content: center; height: 100%; min-height: 36px; font-size: 0.7rem; color: var(--text-muted); opacity: 0.5; }

    /* Attendance sheet — hidden on screen, shown only when printing attendance */
    .attendance-sheet { display: none; }
    .att-room { margin-bottom: 22px; }
    .att-room-head h2 { font-size: 1.2rem; margin-bottom: 4px; }
    .att-room-meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.82rem; color: #333; margin-bottom: 8px; }
    .att-table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
    .att-table th, .att-table td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
    .att-table th { background: #f0f0f0; }
    .att-table .att-mark { text-align: center; font-weight: 700; }
    .att-absent td { background: #f3f3f3; }
    .att-foot { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 8px; font-size: 0.82rem; }
    .att-foot .att-sign { margin-left: auto; }

    .print-only { display: none; }
    .print-head { margin-bottom: 14px; }
    .print-title { font-size: 1.5rem; margin-bottom: 4px; }
    .print-meta { display: flex; gap: 14px; flex-wrap: wrap; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); }

    @media print {
      @page { margin: 12mm; }
      app-admin-sidebar, .no-print { display: none !important; }
      .print-only { display: block !important; }
      .admin-layout { display: block; }
      .admin-main { padding: 0; overflow: visible; }
      .page-content { padding: 0; max-width: 100%; }
      :host { color: #000; }

      /* Attendance vs seating-map print switch */
      .attendance-sheet { display: block; }
      .att-room { break-inside: avoid; page-break-inside: avoid; }
      .att-room + .att-room { page-break-before: always; }
      .page-content:not(.show-attendance) .attendance-sheet { display: none !important; }
      .show-attendance .room-block,
      .show-attendance .print-head { display: none !important; }

      .room-block {
        break-inside: avoid; page-break-inside: avoid; margin-bottom: 16px;
        background: #fff !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
        border: 1.5px solid #000 !important; box-shadow: none !important; border-radius: 0;
        print-color-adjust: exact; -webkit-print-color-adjust: exact;
      }
      .room-block + .room-block { page-break-before: always; }
      .room-layout { overflow: visible !important; }
      .seat-v { break-inside: avoid; }
      .seat-v.occupied { border-color: #000 !important; }
      .sv-ticket { color: #000 !important; }
    }
  `]
})
export class SeatingArrangementComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private examService = inject(ExamService);
  private roomService = inject(RoomService);
  private teacherService = inject(TeacherService);
  private toastService = inject(ToastService);

  examId = '';
  loading = signal(true);
  exam = signal<Exam | null>(null);
  roomData = signal<RoomData[]>([]);
  teachers = signal<Teacher[]>([]);
  formatFloor = formatFloor;

  // attendance
  attendanceMode = signal(false);
  savingAttendance = signal(false);
  allSeated = signal<Student[]>([]);
  absentSet = signal<Set<string>>(new Set());

  printMode = signal<'map' | 'attendance'>('map');

  private printWith(mode: 'map' | 'attendance') {
    this.printMode.set(mode);
    // let the bound class flush to the DOM before the print dialog opens
    setTimeout(() => window.print(), 60);
  }
  printMap() { this.printWith('map'); }
  printAttendanceSheet() { this.printWith('attendance'); }

  /** Row list per room for the printable attendance sheet. */
  attendanceRoom = (rd: RoomData) =>
    this.allSeated()
      .filter(s => s.assignedRoom === rd.room.id)
      .sort((a, b) => (a.assignedBench ?? 0) - (b.assignedBench ?? 0) || (a.assignedSeat ?? 0) - (b.assignedSeat ?? 0));

  exportCsv() {
    const rows = [['Hall Ticket', 'Name', 'Department', 'Room', 'Bench', 'Seat', 'Status']];
    for (const rd of this.roomData()) {
      for (const s of this.attendanceRoom(rd)) {
        rows.push([
          s.hallTicketNo, s.name, s.department ?? '', rd.room.name,
          String(s.assignedBench ?? ''), String(s.assignedSeat ?? ''),
          this.isAbsent(s.hallTicketNo) ? 'Absent' : 'Present'
        ]);
      }
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${(this.exam()?.name ?? 'exam').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toastService.success('Attendance CSV exported.');
  }

  isAbsent = (ticket: string) => this.absentSet().has(ticket);
  presentCount = () => this.allSeated().length - this.absentCount();
  absentCount = () => this.allSeated().filter(s => this.absentSet().has(s.hallTicketNo)).length;
  roomAbsentCount = (roomId: string) =>
    this.allSeated().filter(s => s.assignedRoom === roomId && this.absentSet().has(s.hallTicketNo)).length;

  toggleAbsent(ticket: string) {
    const next = new Set(this.absentSet());
    next.has(ticket) ? next.delete(ticket) : next.add(ticket);
    this.absentSet.set(next);
  }

  private seedAbsent() {
    this.absentSet.set(new Set(this.allSeated().filter(s => s.absent).map(s => s.hallTicketNo)));
  }

  cancelAttendance() { this.seedAbsent(); this.attendanceMode.set(false); }

  async saveAttendance() {
    this.savingAttendance.set(true);
    try {
      const updates = this.allSeated().map(s => ({ hallTicketNo: s.hallTicketNo, absent: this.absentSet().has(s.hallTicketNo) }));
      await this.examService.saveAttendance(this.examId, updates);
      // reflect locally so a re-open shows the saved state
      this.allSeated.set(this.allSeated().map(s => ({ ...s, absent: this.absentSet().has(s.hallTicketNo) })));
      this.toastService.success(`Attendance saved · ${this.presentCount()} present, ${this.absentCount()} absent.`);
      this.attendanceMode.set(false);
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Failed to save attendance.');
    } finally { this.savingAttendance.set(false); }
  }

  /** Invigilator names assigned to a room, for the room header. */
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
      this.seedAbsent();
      this.roomData.set(this.buildRoomData(rooms ?? [], students));
    } finally { this.loading.set(false); }
  }

  buildRoomData(rooms: Room[], students: Student[]): RoomData[] {
    const seated = students.filter(s => s.isSeated);
    const result: RoomData[] = [];

    for (const room of rooms) {
      const roomStudents = seated.filter(s => s.assignedRoom === room.id);
      if (roomStudents.length === 0) continue;

      const layout = roomRowLayout(room);   // benches per row (uneven-aware)
      const benchRows: BenchRow[] = [];
      let benchNum = 0;

      for (let r = 0; r < layout.length; r++) {
        const rowCells: SeatCell[] = [];
        for (let c = 0; c < layout[r]; c++) {
          benchNum++;
          const students = roomStudents.filter(s => s.assignedBench === benchNum);
          rowCells.push({ bench: benchNum, students });
        }
        if (rowCells.length > 0) {
          benchRows.push({ rowIndex: r + 1, cells: rowCells });
        }
      }

      result.push({ room, benchRows, seated: roomStudents.length });
    }

    return result;
  }

  getSeatSlots(cell: SeatCell, seatsPerBench: number): { seatNo: number; student: Student | null }[] {
    return Array.from({ length: seatsPerBench }, (_, i) => ({
      seatNo: i + 1,
      student: cell.students.find(s => s.assignedSeat === i + 1) ?? null
    }));
  }
}
