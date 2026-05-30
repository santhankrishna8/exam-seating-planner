import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { LoaderComponent } from '../../../shared/loader/loader.component';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ExamService } from '../../../services/exam.service';
import { RoomService } from '../../../services/room.service';
import { Student } from '../../../models/student.model';
import { Room } from '../../../models/room.model';
import { Exam } from '../../../models/exam.model';
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
          <div class="page-content fade-in">
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
              <button class="btn btn-outline" (click)="print()"><app-icon name="printer" [size]="17" /> Print</button>
            </div>

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
                        <span class="text-muted" style="font-size:0.8rem">{{ rd.room.rowsCount }} rows × {{ rd.room.benchesPerRow }} benches × {{ rd.room.seatsPerBench }} seats</span>
                      </div>
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
                                  <div class="seat-v" [class.occupied]="s.student !== null">
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

    .room-block { padding: 0; margin-bottom: 24px; overflow: hidden; }
    .room-block-header { padding: 16px 20px; border-bottom: 1px solid var(--border-color); }
    .room-header-info { display: flex; flex-direction: column; gap: 6px; }
    .room-block-title { font-size: 1.1rem; font-weight: 600; }
    .room-header-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

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

  examId = '';
  loading = signal(true);
  exam = signal<Exam | null>(null);
  roomData = signal<RoomData[]>([]);
  formatFloor = formatFloor;

  print() { window.print(); }

  async ngOnInit() {
    this.examId = this.route.snapshot.paramMap.get('id')!;
    try {
      const [exam, students, rooms] = await Promise.all([
        this.examService.getExam(this.examId),
        this.examService.getStudents(this.examId),
        firstValueFrom(this.roomService.getRooms())
      ]);
      this.exam.set(exam);
      this.roomData.set(this.buildRoomData(rooms ?? [], students));
    } finally { this.loading.set(false); }
  }

  buildRoomData(rooms: Room[], students: Student[]): RoomData[] {
    const seated = students.filter(s => s.isSeated);
    const result: RoomData[] = [];

    for (const room of rooms) {
      const roomStudents = seated.filter(s => s.assignedRoom === room.id);
      if (roomStudents.length === 0) continue;

      const benchesPerRow = room.benchesPerRow || Math.ceil(room.benchCount / (room.rowsCount || 1));
      const benchRows: BenchRow[] = [];

      for (let r = 0; r < room.rowsCount; r++) {
        const rowCells: SeatCell[] = [];
        for (let c = 0; c < benchesPerRow; c++) {
          const benchNum = r * benchesPerRow + c + 1;
          if (benchNum > room.benchCount) break;
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
