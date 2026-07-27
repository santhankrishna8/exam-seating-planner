import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { LoaderComponent } from '../../../shared/loader/loader.component';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ExamService } from '../../../services/exam.service';
import { RoomService } from '../../../services/room.service';
import { SeatingService } from '../../../services/seating.service';
import { ToastService } from '../../../services/toast.service';
import { FileUploadService } from '../../../services/file-upload.service';
import { TeacherService } from '../../../services/teacher.service';
import { DutyService } from '../../../services/duty.service';
import { CollegeService } from '../../../services/college.service';
import { Exam } from '../../../models/exam.model';
import { Student } from '../../../models/student.model';
import { Room, formatFloor } from '../../../models/room.model';
import { Teacher } from '../../../models/teacher.model';
import { Duty } from '../../../models/duty.model';
import { firstValueFrom } from 'rxjs';

interface Stage { key: string; label: string; state: 'done' | 'active' | 'todo'; note: string; }

@Component({
  selector: 'app-exam-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminSidebarComponent, LoaderComponent, ToastComponent, ConfirmDialogComponent, IconComponent],
  template: `
    <app-toast />
    <app-confirm-dialog
      [visible]="showPublishDialog()"
      title="Publish seating"
      message="Publishing makes this seating visible to every student and to the assigned invigilators. You can archive it later to withdraw it."
      confirmLabel="Publish"
      [destructive]="false"
      (confirm)="publishExam()"
      (cancel)="showPublishDialog.set(false)"
    />
    <app-confirm-dialog
      [visible]="showArchiveDialog()"
      title="Archive examination"
      message="Archived examinations disappear from the public lookup. The record is kept."
      confirmLabel="Archive"
      [destructive]="false"
      (confirm)="archiveExam()"
      (cancel)="showArchiveDialog.set(false)"
    />
    <app-confirm-dialog
      [visible]="showDeleteDialog()"
      title="Delete examination"
      message="This permanently removes the examination, its roster and any published seating. It cannot be undone."
      confirmLabel="Delete"
      (confirm)="deleteExam()"
      (cancel)="showDeleteDialog.set(false)"
    />

    <div class="admin-layout">
      <app-admin-sidebar />
      <main class="admin-main">
        @if (loading()) {
          <app-loader message="Opening the examination…" />
        } @else if (!exam()) {
          <div class="page-content">
            <div class="card empty-state">
              <div class="empty-state-icon"><app-icon name="alert" [size]="26" /></div>
              <h3>Examination not found</h3>
              <p>It may have been deleted from the register.</p>
              <a routerLink="/admin/exams" class="btn btn-primary mt-16">Back to examinations</a>
            </div>
          </div>
        } @else {
          <div class="page-content fade-in">
            <header class="exam-head">
              <div class="exam-id">
                <a routerLink="/admin/exams" class="back-link"><app-icon name="arrow-left" [size]="14" /> All examinations</a>
                <span class="eyebrow">{{ exam()!.subjectCode || 'Examination' }}</span>
                <h1 class="page-title">{{ exam()!.name }}</h1>
                <div class="exam-meta">
                  <span [class]="'badge ' + statusBadge(exam()!.status)">{{ exam()!.status }}</span>
                  <span><app-icon name="calendar" [size]="13" /> {{ exam()!.date | date:'EEE, dd MMM yyyy' }}</span>
                  <span><app-icon name="clock" [size]="13" /> {{ exam()!.startTime }} – {{ exam()!.endTime }}</span>
                  @if (exam()!.department) { <span><app-icon name="building" [size]="13" /> {{ exam()!.department }}</span> }
                </div>
              </div>

              <div class="exam-actions">
                @if (exam()!.status === 'draft') {
                  <a [routerLink]="['/admin/exams', examId, 'edit']" class="btn btn-outline"><app-icon name="pencil" [size]="15" /> Edit</a>
                }
                @if (exam()!.status === 'published') {
                  <a [routerLink]="['/exam', examId]" class="btn btn-outline" target="_blank"><app-icon name="eye" [size]="15" /> Public view</a>
                  <button class="btn btn-outline" (click)="showArchiveDialog.set(true)">Archive</button>
                }
                <button class="btn btn-ghost btn-icon" title="Delete examination" aria-label="Delete examination"
                  (click)="showDeleteDialog.set(true)" [disabled]="actionLoading()">
                  <app-icon name="trash" [size]="16" />
                </button>
              </div>
            </header>

            <!-- Workflow rail -->
            <ol class="stages">
              @for (s of stages(); track s.key) {
                <li class="stage" [class.done]="s.state === 'done'" [class.active]="s.state === 'active'">
                  <span class="stage-dot">
                    @if (s.state === 'done') { <app-icon name="check-circle" [size]="14" /> }
                  </span>
                  <span class="stage-body">
                    <span class="stage-label">{{ s.label }}</span>
                    <span class="stage-note">{{ s.note }}</span>
                  </span>
                </li>
              }
            </ol>

            <div class="detail-grid">
              <div class="detail-main">
                <!-- Roster -->
                <section class="card panel">
                  <header class="panel-head">
                    <div>
                      <h2 class="panel-title">Roster</h2>
                      <span class="panel-sub">
                        @if (students().length) {
                          {{ students().length }} candidates · {{ seatedCount() }} seated
                          @if (unseatedCount() > 0) { <b class="text-danger">· {{ unseatedCount() }} unseated</b> }
                        } @else { No candidates uploaded }
                      </span>
                    </div>
                    @if (exam()!.status === 'draft') {
                      <label class="btn btn-outline btn-sm upload-btn">
                        <app-icon name="upload" [size]="14" />
                        {{ students().length ? 'Replace file' : 'Upload roster' }}
                        <input type="file" accept=".csv,.xlsx,.xls" (change)="onFileChange($event)" [disabled]="actionLoading()" />
                      </label>
                    }
                  </header>

                  @if (students().length === 0) {
                    <div class="empty-state">
                      <div class="empty-state-icon"><app-icon name="users" [size]="24" /></div>
                      <h3>No candidates yet</h3>
                      <p>Upload a CSV or Excel file with columns: hall ticket, name, department, section.</p>
                    </div>
                  } @else {
                    <div class="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Hall ticket</th>
                            <th>Name</th>
                            <th>Department</th>
                            @if (seatingGenerated()) { <th>Hall</th><th>Bench</th><th>Seat</th> }
                          </tr>
                        </thead>
                        <tbody>
                          @for (s of visibleStudents(); track s.hallTicketNo) {
                            <tr [class.unseated]="seatingGenerated() && !s.isSeated">
                              <td class="mono">{{ s.hallTicketNo }}</td>
                              <td>{{ s.name }}</td>
                              <td>{{ s.department || '—' }}</td>
                              @if (seatingGenerated()) {
                                <td>{{ s.isSeated ? getRoomName(s.assignedRoom) : 'Unseated' }}</td>
                                <td class="mono">{{ s.isSeated ? s.assignedBench : '—' }}</td>
                                <td class="mono">{{ s.isSeated ? s.assignedSeat : '—' }}</td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                    @if (students().length > visibleStudents().length) {
                      <div class="panel-foot">
                        <span class="text-muted">Showing {{ visibleStudents().length }} of {{ students().length }}</span>
                        <button class="btn btn-ghost btn-sm" (click)="showAll.set(true)">Show all</button>
                      </div>
                    }
                  }
                </section>

                <!-- Invigilators -->
                <section class="card panel">
                  <header class="panel-head">
                    <div>
                      <h2 class="panel-title">Invigilation duty</h2>
                      <span class="panel-sub">{{ exam()!.teachersPerRoom }} per hall · {{ assignedInvigilatorCount() }} on duty</span>
                    </div>
                    <div class="panel-actions">
                      @if (teachers().length === 0) {
                        <a routerLink="/admin/teachers" class="btn btn-outline btn-sm"><app-icon name="badge" [size]="14" /> Add staff</a>
                      } @else {
                        @if (hasInvigilators()) {
                          <button class="btn btn-ghost btn-sm" (click)="clearInvigilators()" [disabled]="actionLoading()">Clear</button>
                        }
                        <button class="btn btn-outline btn-sm" (click)="allotInvigilators()" [disabled]="actionLoading()">
                          <app-icon name="shuffle" [size]="14" /> {{ hasInvigilators() ? 'Re-allot' : 'Auto-allot' }}
                        </button>
                      }
                    </div>
                  </header>

                  @if (hasInvigilators()) {
                    <div class="table-wrapper">
                      <table>
                        <thead><tr><th>Hall</th><th>Invigilator(s)</th></tr></thead>
                        <tbody>
                          @for (row of invigilatorRoster(); track row.roomId) {
                            <tr>
                              <td><strong>{{ row.roomName }}</strong></td>
                              <td>
                                @if (row.teachers.length) {
                                  <div class="chips">
                                    @for (t of row.teachers; track t.id) {
                                      <span class="chip"><app-icon name="badge" [size]="12" /> {{ t.name }}@if (t.department) {<span class="text-muted"> · {{ t.department }}</span>}</span>
                                    }
                                  </div>
                                } @else {
                                  <span class="text-warning">Unstaffed</span>
                                }
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                    <div class="panel-foot">
                      <span class="text-muted">Invigilator attendance: <strong>{{ submittedCount() }}</strong> / {{ submittedDuties().length }} submitted</span>
                      @if (hasSubmissions()) {
                        <button class="btn btn-outline btn-sm" (click)="applySubmittedAttendance()" [disabled]="actionLoading()">
                          <app-icon name="check-circle" [size]="14" /> Apply to records
                        </button>
                      }
                    </div>
                  } @else {
                    <div class="empty-state">
                      <div class="empty-state-icon"><app-icon name="badge" [size]="24" /></div>
                      <h3>No duty roster yet</h3>
                      <p>{{ teachers().length ? 'Auto-allot spreads duty by workload and department, and never books a teacher twice at the same hour.' : 'Add teaching staff before rostering invigilators.' }}</p>
                    </div>
                  }
                </section>
              </div>

              <!-- Allotment sidebar -->
              <aside class="detail-side">
                <section class="card panel">
                  <header class="panel-head">
                    <h2 class="panel-title">Hall allotment</h2>
                  </header>

                  <div class="allot-body">
                    <div class="allot-figures">
                      <div>
                        <span class="af-label">Candidates</span>
                        <span class="af-value">{{ students().length }}</span>
                      </div>
                      <div>
                        <span class="af-label">Seats available</span>
                        <span class="af-value" [class.text-danger]="capacityShort()">{{ capacity() }}</span>
                      </div>
                    </div>

                    @if (capacityShort()) {
                      <p class="allot-warn">
                        <app-icon name="alert" [size]="14" />
                        The selected halls are short by {{ students().length - capacity() }} seats.
                        Add halls in the exam settings or turn off the gap-seat rule.
                      </p>
                    }

                    @if (seatingGenerated()) {
                      <ul class="hall-list">
                        @for (row of allotmentByRoom(); track row.roomId) {
                          <li>
                            <span class="hl-name">{{ row.roomName }}</span>
                            <span class="hl-floor">{{ row.floor }}</span>
                            <span class="hl-count mono">{{ row.count }}</span>
                          </li>
                        }
                      </ul>
                      <a [routerLink]="['/admin/exams', examId, 'seating']" class="btn btn-outline w-full">
                        <app-icon name="seat" [size]="15" /> Open hall plan
                      </a>
                    } @else {
                      <p class="allot-hint">
                        Seats are filled down each column of every hall, front to back.
                        {{ modeHint() }}
                      </p>
                    }

                    @if (exam()!.status === 'draft') {
                      <button class="btn btn-outline w-full mt-8" (click)="generateSeating()"
                        [disabled]="actionLoading() || students().length === 0">
                        <app-icon name="bolt" [size]="15" />
                        {{ seatingGenerated() ? 'Re-run allotment' : 'Run allotment' }}
                      </button>
                      <button class="btn btn-primary w-full mt-8" (click)="showPublishDialog.set(true)"
                        [disabled]="actionLoading() || !seatingGenerated()">
                        <app-icon name="send" [size]="15" /> Publish seating
                      </button>
                      @if (!seatingGenerated()) {
                        <p class="allot-hint small">Publishing unlocks once seats have been allotted.</p>
                      }
                    } @else if (exam()!.status === 'published') {
                      <p class="allot-hint small">
                        Published. Students can look up their seat and invigilators can mark attendance.
                      </p>
                    }
                  </div>
                </section>
              </aside>
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .exam-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-bottom: 20px; }
    .back-link { display: inline-flex; align-items: center; gap: 5px; color: var(--text-muted); font-size: 0.79rem; margin-bottom: 10px; }
    .back-link:hover { color: var(--text-primary); }
    .exam-meta { display: flex; align-items: center; gap: 8px 14px; flex-wrap: wrap; margin-top: 9px; font-size: 0.82rem; color: var(--text-secondary); }
    .exam-meta span { display: inline-flex; align-items: center; gap: 6px; }
    .exam-meta app-icon { color: var(--text-muted); }
    .exam-actions { display: flex; gap: 7px; flex-wrap: wrap; }

    /* Workflow rail */
    .stages { list-style: none; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin: 0 0 20px; padding: 0; background: var(--border-color); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; }
    @media (max-width: 820px) { .stages { grid-template-columns: repeat(2, 1fr); } }
    .stage { display: flex; align-items: flex-start; gap: 10px; padding: 13px 15px; background: var(--bg-card); }
    .stage-dot {
      flex: 0 0 auto; width: 20px; height: 20px; margin-top: 1px; border-radius: 99px;
      border: 1.5px solid var(--border-strong); display: inline-flex; align-items: center; justify-content: center;
      color: var(--bg-card);
    }
    .stage.done .stage-dot { background: var(--accent-green); border-color: var(--accent-green); color: oklch(0.99 0.005 88); }
    .stage.active .stage-dot { border-color: var(--accent-blue); box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent-blue) 16%, transparent); }
    .stage-body { display: flex; flex-direction: column; min-width: 0; }
    .stage-label { font-size: 0.85rem; font-weight: 500; color: var(--text-secondary); }
    .stage.active .stage-label, .stage.done .stage-label { color: var(--text-primary); }
    .stage-note { font-size: 0.72rem; color: var(--text-muted); }

    .detail-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; align-items: start; }
    @media (max-width: 1040px) { .detail-grid { grid-template-columns: 1fr; } }
    .detail-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
    .detail-side { position: sticky; top: 18px; }

    .panel { overflow: hidden; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 13px 18px; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary); }
    .panel-title { font-size: 1.05rem; }
    .panel-sub { display: block; font-size: 0.76rem; color: var(--text-muted); margin-top: 2px; }
    .panel-actions { display: flex; gap: 6px; }
    .panel-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 11px 18px; border-top: 1px solid var(--border-color); font-size: 0.8rem; }

    .upload-btn { position: relative; overflow: hidden; cursor: pointer; }
    .upload-btn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

    tr.unseated td { background: color-mix(in oklch, var(--accent-red) 7%, transparent); }
    .chips { display: flex; flex-wrap: wrap; gap: 5px; }
    .chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 3px; background: var(--bg-secondary); border: 1px solid var(--border-color); font-size: 0.78rem; }
    .chip app-icon { color: var(--text-muted); }

    /* Allotment side panel */
    .allot-body { padding: 16px 18px 18px; }
    .allot-figures { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    .af-label { display: block; font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.11em; text-transform: uppercase; color: var(--text-muted); }
    .af-value { display: block; font-family: var(--font-head); font-size: 1.6rem; font-weight: 600; line-height: 1.1; letter-spacing: -0.035em; font-variant-numeric: tabular-nums; }
    .allot-warn {
      display: flex; align-items: flex-start; gap: 8px; margin-bottom: 14px;
      padding: 9px 11px; border-radius: var(--radius-sm); font-size: 0.78rem; line-height: 1.5;
      color: var(--accent-red);
      background: color-mix(in oklch, var(--accent-red) 8%, transparent);
      border: 1px solid color-mix(in oklch, var(--accent-red) 26%, transparent);
    }
    .allot-warn app-icon { flex-shrink: 0; margin-top: 1px; }
    .allot-hint { font-size: 0.78rem; color: var(--text-muted); line-height: 1.55; margin-bottom: 12px; }
    .allot-hint.small { margin: 10px 0 0; font-size: 0.74rem; }

    .hall-list { list-style: none; margin: 0 0 14px; padding: 0; border-top: 1px solid var(--border-color); }
    .hall-list li { display: flex; align-items: baseline; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border-color); font-size: 0.83rem; }
    .hl-name { font-weight: 500; }
    .hl-floor { flex: 1; font-size: 0.7rem; color: var(--text-muted); }
    .hl-count { color: var(--accent-blue); font-weight: 500; }
  `]
})
export class ExamDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private examService = inject(ExamService);
  private roomService = inject(RoomService);
  private seatingService = inject(SeatingService);
  private toastService = inject(ToastService);
  private fileUploadService = inject(FileUploadService);
  private teacherService = inject(TeacherService);
  private dutyService = inject(DutyService);
  private collegeService = inject(CollegeService);
  private router = inject(Router);

  examId = '';
  collegeName = '';
  submittedDuties = signal<Duty[]>([]);
  loading = signal(true);
  actionLoading = signal(false);
  exam = signal<Exam | null>(null);
  students = signal<Student[]>([]);
  rooms = signal<Room[]>([]);
  teachers = signal<Teacher[]>([]);
  showAll = signal(false);
  showPublishDialog = signal(false);
  showArchiveDialog = signal(false);
  showDeleteDialog = signal(false);

  seatingGenerated = () => this.students().some(s => s.isSeated);
  seatedCount = () => this.students().filter(s => s.isSeated).length;
  unseatedCount = () => (this.seatingGenerated() ? this.students().length - this.seatedCount() : 0);
  getRoomName = (roomId?: string) => this.rooms().find(r => r.id === roomId)?.name ?? roomId ?? '—';
  visibleStudents = () => (this.showAll() ? this.students() : this.students().slice(0, 25));

  examRooms = (): Room[] => {
    const e = this.exam();
    if (!e) return [];
    const all = this.rooms();
    return e.selectedRooms.length ? all.filter(r => e.selectedRooms.includes(r.id)) : all;
  };
  capacity = () => this.seatingService.capacityOf(this.examRooms(), this.exam()?.spacing ?? false);
  capacityShort = () => this.students().length > 0 && this.capacity() < this.students().length;

  modeHint = () => ({
    sequential: 'Candidates keep their uploaded order.',
    random: 'Candidates are shuffled before allotment.',
    department: 'Bench-mates are drawn from different departments.'
  }[this.exam()?.shuffleMode ?? 'sequential']);

  allotmentByRoom = () => {
    const counts = new Map<string, number>();
    for (const s of this.students()) {
      if (!s.isSeated || !s.assignedRoom) continue;
      counts.set(s.assignedRoom, (counts.get(s.assignedRoom) ?? 0) + 1);
    }
    return [...counts.entries()].map(([roomId, count]) => {
      const room = this.rooms().find(r => r.id === roomId);
      return { roomId, roomName: room?.name ?? roomId, floor: formatFloor(room?.floor ?? ''), count };
    }).sort((a, b) => a.roomName.localeCompare(b.roomName, undefined, { numeric: true }));
  };

  stages = (): Stage[] => {
    const e = this.exam()!;
    const roster = this.students().length > 0;
    const seated = this.seatingGenerated();
    const staffed = this.hasInvigilators();
    const published = e.status === 'published' || e.status === 'archived';
    const state = (done: boolean, active: boolean): Stage['state'] => done ? 'done' : active ? 'active' : 'todo';
    return [
      { key: 'roster', label: 'Roster', state: state(roster, !roster), note: roster ? `${this.students().length} candidates` : 'Upload the candidate list' },
      { key: 'allot', label: 'Allotment', state: state(seated, roster && !seated), note: seated ? `${this.seatedCount()} seated` : 'Not yet run' },
      { key: 'duty', label: 'Invigilators', state: state(staffed, seated && !staffed), note: staffed ? `${this.assignedInvigilatorCount()} on duty` : 'No roster' },
      { key: 'publish', label: 'Publication', state: state(published, seated && !published), note: published ? e.status : 'Not published' }
    ];
  };

  hasInvigilators = () => Object.values(this.exam()?.invigilators ?? {}).some(ids => ids.length > 0);
  assignedInvigilatorCount = () => Object.values(this.exam()?.invigilators ?? {}).reduce((n, ids) => n + ids.length, 0);
  private teacherById = (id: string) => this.teachers().find(t => t.id === id);
  invigilatorRoster = (): { roomId: string; roomName: string; teachers: Teacher[] }[] => {
    const inv = this.exam()?.invigilators ?? {};
    return this.examRooms().map(r => ({
      roomId: r.id,
      roomName: r.name,
      teachers: (inv[r.id] ?? []).map(id => this.teacherById(id)).filter((t): t is Teacher => !!t)
    }));
  };

  async ngOnInit() {
    this.examId = this.route.snapshot.paramMap.get('id')!;
    try {
      const [exam, students, rooms, teachers, college, duties] = await Promise.all([
        this.examService.getExam(this.examId),
        this.examService.getStudents(this.examId),
        firstValueFrom(this.roomService.getRooms()),
        firstValueFrom(this.teacherService.getTeachers()),
        this.collegeService.getMyCollege().catch(() => null),
        this.dutyService.getDutiesForExam(this.examId).catch(() => [])
      ]);
      this.exam.set(exam);
      this.students.set(students);
      this.rooms.set(rooms ?? []);
      this.teachers.set(teachers ?? []);
      this.collegeName = college?.name ?? '';
      this.submittedDuties.set(duties);
    } finally { this.loading.set(false); }
  }

  async generateSeating() {
    const exam = this.exam();
    if (!exam) return;
    if (this.students().length === 0) { this.toastService.error('Upload the roster first.'); return; }

    const selectedRooms = this.examRooms();
    if (selectedRooms.length === 0) { this.toastService.error('No halls available. Add halls first.'); return; }

    this.actionLoading.set(true);
    try {
      // A hall already allotted to another examination at an overlapping time
      // cannot be allotted again.
      const conflicts = await this.examService.getRoomConflicts(
        this.examId, selectedRooms.map(r => r.id), exam.date, exam.startTime, exam.endTime
      );
      if (conflicts.length) {
        const names = [...new Set(conflicts.map(c => c.roomName))].join(', ');
        this.toastService.error(`Cannot allot — ${names} clashes with "${conflicts[0].examName}" at ${conflicts[0].time}.`);
        return;
      }

      const assigned = this.seatingService.assignSeats(this.students(), selectedRooms, { mode: exam.shuffleMode, spacing: exam.spacing });
      await this.examService.saveAssignedStudents(this.examId, assigned);
      this.students.set(assigned);
      this.toastService.success(`Allotted ${assigned.filter(s => s.isSeated).length} seats across ${this.allotmentByRoom().length} halls.`);
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Allotment failed.');
    } finally { this.actionLoading.set(false); }
  }

  async publishExam() {
    this.showPublishDialog.set(false);
    this.actionLoading.set(true);
    try {
      await this.examService.publishExam(this.examId);
      this.exam.update(e => e ? { ...e, status: 'published' } : e);
      this.toastService.success('Published. Students can now look up their seats.');
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Publishing failed.');
    } finally { this.actionLoading.set(false); }
  }

  async archiveExam() {
    this.showArchiveDialog.set(false);
    this.actionLoading.set(true);
    try {
      await this.examService.archiveExam(this.examId);
      this.exam.update(e => e ? { ...e, status: 'archived' } : e);
      this.toastService.success('Archived — withdrawn from the public lookup.');
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Could not archive.');
    } finally { this.actionLoading.set(false); }
  }

  async allotInvigilators() {
    const exam = this.exam();
    if (!exam) return;
    if (this.teachers().filter(t => t.isActive).length === 0) {
      this.toastService.error('No staff are available for duty.'); return;
    }
    const roomObjs = this.examRooms();
    if (roomObjs.length === 0) { this.toastService.error('This examination has no halls selected.'); return; }

    this.actionLoading.set(true);
    try {
      const [busy, dutyCounts] = await Promise.all([
        this.examService.getBusyTeachers(this.examId, exam.date, exam.startTime, exam.endTime),
        this.examService.getDutyCounts(this.examId)
      ]);
      const res = this.teacherService.allot({
        roomIds: roomObjs.map(r => r.id),
        teachersPerRoom: exam.teachersPerRoom,
        teachers: this.teachers(),
        busyTeacherIds: busy,
        examDepartment: exam.department,
        dutyCounts
      });
      await this.examService.saveInvigilators(this.examId, res.allotment, exam.teachersPerRoom);
      const updated = { ...exam, invigilators: res.allotment };
      this.exam.set(updated);
      // Publish teacher-readable duty documents for the invigilator portal.
      const teachersById = new Map(this.teachers().map(t => [t.id, t]));
      const roomNames = new Map(this.rooms().map(r => [r.id, r.name]));
      await this.dutyService.publishDuties(updated, teachersById, roomNames, this.collegeName).catch(() => {});
      this.submittedDuties.set(await this.dutyService.getDutiesForExam(this.examId).catch(() => []));
      if (res.shortBy > 0) {
        this.toastService.error(`Allotted ${res.assignedCount} — ${res.shortBy} more invigilator(s) needed; some halls are unstaffed.`);
      } else {
        this.toastService.success(`Duty rostered across ${roomObjs.length} hall(s).`);
      }
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Could not roster invigilators.');
    } finally { this.actionLoading.set(false); }
  }

  async clearInvigilators() {
    const exam = this.exam();
    if (!exam) return;
    this.actionLoading.set(true);
    try {
      await this.examService.saveInvigilators(this.examId, {}, exam.teachersPerRoom);
      await this.dutyService.clearDuties(this.examId).catch(() => {});
      this.exam.update(e => e ? { ...e, invigilators: {} } : e);
      this.submittedDuties.set([]);
      this.toastService.success('Duty roster cleared.');
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Could not clear the roster.');
    } finally { this.actionLoading.set(false); }
  }

  submittedCount = () => this.submittedDuties().filter(d => d.submitted).length;
  hasSubmissions = () => this.submittedCount() > 0;

  async applySubmittedAttendance() {
    this.actionLoading.set(true);
    try {
      const duties = await this.dutyService.getDutiesForExam(this.examId);
      const absent = new Set<string>();
      for (const d of duties) for (const ht of d.absentHallTickets ?? []) absent.add(ht);
      const updates = this.students().filter(s => s.isSeated)
        .map(s => ({ hallTicketNo: s.hallTicketNo, absent: absent.has(s.hallTicketNo) }));
      await this.examService.saveAttendance(this.examId, updates);
      this.students.update(list => list.map(s => s.isSeated ? { ...s, absent: absent.has(s.hallTicketNo) } : s));
      this.submittedDuties.set(duties);
      this.toastService.success(`Applied invigilator attendance · ${absent.size} absent.`);
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Could not apply attendance.');
    } finally { this.actionLoading.set(false); }
  }

  async deleteExam() {
    this.showDeleteDialog.set(false);
    this.actionLoading.set(true);
    try {
      await this.examService.deleteExam(this.examId);
      this.toastService.success('Examination deleted.');
      this.router.navigate(['/admin/exams']);
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Could not delete.');
      this.actionLoading.set(false);
    }
  }

  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.actionLoading.set(true);
    try {
      const students = await this.fileUploadService.parseFile(file);
      await this.examService.saveStudents(this.examId, students);
      this.students.set(students);
      this.showAll.set(false);
      this.toastService.success(`${students.length} candidates loaded. Run the allotment next.`);
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Could not read that file.');
    } finally {
      input.value = '';           // allow re-selecting the same file
      this.actionLoading.set(false);
    }
  }

  statusBadge(s: string): string {
    return s === 'published' ? 'badge-green' : s === 'archived' ? 'badge-gray' : 'badge-amber';
  }
}
