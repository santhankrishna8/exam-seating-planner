import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { AttendanceService } from '../../../services/attendance.service';
import { Exam, ShuffleMode } from '../../../models/exam.model';
import { Student } from '../../../models/student.model';
import { Room, formatFloor, roomCapacity } from '../../../models/room.model';
import { Teacher } from '../../../models/teacher.model';
import { Attendance } from '../../../models/attendance.model';
import { firstValueFrom } from 'rxjs';

type DialogKind = '' | 'publish' | 'unpublish' | 'delete' | 'replace';

@Component({
  selector: 'app-exam-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminSidebarComponent, LoaderComponent, ToastComponent, ConfirmDialogComponent, IconComponent],
  template: `
    <app-toast />
    <app-confirm-dialog [visible]="dialog() === 'publish'" title="Publish seating"
      message="Students will be able to find their seat, and invigilators get their attendance links. You can unpublish any time."
      confirmLabel="Publish" [destructive]="false" (confirm)="publish()" (cancel)="dialog.set('')" />
    <app-confirm-dialog [visible]="dialog() === 'unpublish'" title="Unpublish seating"
      message="Students will no longer see their seats and invigilator links stop working. Attendance already submitted will be cleared. The draft is kept."
      confirmLabel="Unpublish" (confirm)="unpublish()" (cancel)="dialog.set('')" />
    <app-confirm-dialog [visible]="dialog() === 'delete'" title="Delete examination"
      message="This permanently removes the examination, its students and anything published. It cannot be undone."
      confirmLabel="Delete" (confirm)="deleteExam()" (cancel)="dialog.set('')" />
    <app-confirm-dialog [visible]="dialog() === 'replace'" title="Replace students"
      message="Uploading a new file replaces the current students and clears the seating you have already run."
      confirmLabel="Choose file" [destructive]="false" (confirm)="pickFile()" (cancel)="dialog.set('')" />
    <input #fileInput type="file" accept=".csv,.xlsx,.xls" hidden (change)="onFileChange($event)" />

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
              <p>It may have been deleted.</p>
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
                  <span [class]="'badge ' + (published() ? 'badge-green' : 'badge-amber')">{{ published() ? 'published' : 'draft' }}</span>
                  <span><app-icon name="calendar" [size]="13" /> {{ exam()!.date | date:'EEE, dd MMM yyyy' }}</span>
                  <span><app-icon name="clock" [size]="13" /> {{ exam()!.startTime }} – {{ exam()!.endTime }}</span>
                </div>
              </div>
              <div class="exam-actions">
                <a [routerLink]="['/admin/exams', examId, 'edit']" class="btn btn-outline"><app-icon name="pencil" [size]="15" /> Edit details</a>
                <button class="btn btn-ghost btn-icon" title="Delete examination" aria-label="Delete examination"
                  (click)="dialog.set('delete')" [disabled]="busy()"><app-icon name="trash" [size]="16" /></button>
              </div>
            </header>

            <ol class="stages">
              @for (s of stages(); track s.label) {
                <li class="stage" [class.done]="s.done" [class.active]="s.active">
                  <span class="stage-dot">@if (s.done) { <app-icon name="check-circle" [size]="14" /> }</span>
                  <span class="stage-body"><span class="stage-label">{{ s.label }}</span><span class="stage-note">{{ s.note }}</span></span>
                </li>
              }
            </ol>

            <!-- 1 · Students -->
            <section class="card panel step-card">
              <header class="panel-head">
                <div>
                  <h2 class="panel-title"><span class="step-num" [class.done]="students().length > 0">1</span>Students</h2>
                  <span class="panel-sub">
                    @if (students().length) { {{ students().length }} candidates } @else { Upload a CSV or Excel file: hall ticket, name, department (optional) }
                  </span>
                </div>
                @if (!published()) {
                  <button class="btn btn-outline btn-sm" (click)="askUpload()" [disabled]="busy()">
                    <app-icon name="upload" [size]="14" /> {{ students().length ? 'Replace file' : 'Upload students' }}
                  </button>
                }
              </header>
              @if (students().length) {
                <div class="table-wrapper">
                  <table>
                    <thead><tr><th>Hall ticket</th><th>Name</th><th>Dept</th>
                      @if (seatingGenerated()) { <th>Hall</th><th>Bench</th><th>Seat</th> }
                      @if (published()) { <th>Attendance</th> }</tr></thead>
                    <tbody>
                      @for (s of visibleStudents(); track s.hallTicketNo) {
                        <tr [class.unseated]="seatingGenerated() && !s.isSeated">
                          <td class="mono">{{ s.hallTicketNo }}</td>
                          <td>{{ s.name }}</td>
                          <td>{{ s.department || '—' }}</td>
                          @if (seatingGenerated()) {
                            <td>{{ s.isSeated ? roomName(s.assignedRoom) : 'Unseated' }}</td>
                            <td class="mono">{{ s.isSeated ? s.assignedBench : '—' }}</td>
                            <td class="mono">{{ s.isSeated ? s.assignedSeat : '—' }}</td>
                          }
                          @if (published()) { <td>@if (absentSet().has(s.hallTicketNo)) { <span class="badge badge-red">Absent</span> } @else { — }</td> }
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

            <!-- 2 · Halls & seating -->
            <section class="card panel step-card">
              <header class="panel-head">
                <div>
                  <h2 class="panel-title"><span class="step-num" [class.done]="seatingGenerated() && !dirty()">2</span>Halls &amp; seating</h2>
                  <span class="panel-sub">Choose halls and how students are placed. Seats fill down each column, front to back.</span>
                </div>
              </header>
              <div class="panel-body">
                @if (rooms().length === 0) {
                  <p class="text-muted">No halls yet. <a routerLink="/admin/rooms">Add a hall</a> first.</p>
                } @else {
                  <div class="hall-pick">
                    @for (r of rooms(); track r.id) {
                      <label class="hall-opt" [class.on]="isPicked(r.id)">
                        <input type="checkbox" [checked]="isPicked(r.id)" [disabled]="published() || busy()" (change)="toggleRoom(r.id)" />
                        <span class="grow"><b>{{ r.name }}</b> <small>{{ formatFloor(r.floor) }}</small></span>
                        <span class="mono">{{ seatsIn(r) }} seats</span>
                      </label>
                    }
                  </div>
                  <div class="rules">
                    <div class="form-group" style="margin:0">
                      <label class="form-label" for="mode">Placement</label>
                      <select id="mode" class="form-control" [ngModel]="exam()!.shuffleMode" [disabled]="published() || busy()" (ngModelChange)="setMode($event)">
                        <option value="sequential">Keep upload order</option>
                        <option value="random">Shuffle everyone</option>
                        <option value="department">Mix departments on each bench</option>
                      </select>
                    </div>
                    <label class="gap-toggle">
                      <input type="checkbox" [ngModel]="exam()!.spacing" [disabled]="published() || busy()" (ngModelChange)="setSpacing($event)" />
                      Leave a gap seat between students
                    </label>
                  </div>

                  @if (pickedRooms().length === 0) {
                    <div class="fit warn"><app-icon name="alert" [size]="15" /> Pick at least one hall.</div>
                  } @else if (capacityShort()) {
                    <div class="fit bad"><app-icon name="alert" [size]="15" /> {{ capacity() }} seats for {{ students().length }} students — short by {{ students().length - capacity() }}. Add halls or turn off the gap seat.</div>
                  } @else {
                    <div class="fit"><app-icon name="check-circle" [size]="15" /> {{ capacity() }} seats{{ students().length ? ' for ' + students().length + ' students — fits' : '' }}.</div>
                  }

                  @if (!published()) {
                    <div class="row-actions">
                      <button class="btn btn-primary" (click)="runSeating()"
                        [disabled]="busy() || students().length === 0 || pickedRooms().length === 0 || capacityShort()">
                        <app-icon name="bolt" [size]="15" /> {{ seatingGenerated() ? 'Run seating again' : 'Run seating' }}
                      </button>
                      @if (seatingGenerated()) {
                        <a [routerLink]="['/admin/exams', examId, 'seating']" class="btn btn-outline"><app-icon name="seat" [size]="15" /> View hall plan</a>
                      }
                    </div>
                    @if (students().length === 0) { <p class="note">Upload students first.</p> }
                    @if (dirty()) { <p class="note text-warning">Settings changed since the last run — run seating again before publishing.</p> }
                  } @else {
                    <div class="row-actions">
                      <a [routerLink]="['/admin/exams', examId, 'seating']" class="btn btn-outline"><app-icon name="seat" [size]="15" /> View hall plan</a>
                    </div>
                    <p class="note">Locked while published. Unpublish to change halls or seating.</p>
                  }

                  @if (seatingGenerated()) {
                    <ul class="hall-list" style="margin-top:14px">
                      @for (row of allotmentByRoom(); track row.roomId) {
                        <li><span class="hl-name">{{ row.roomName }}</span><span class="hl-floor">{{ row.floor }}</span><span class="hl-count mono">{{ row.count }}</span></li>
                      }
                    </ul>
                  }
                }
              </div>
            </section>

            <!-- 3 · Publish -->
            <section class="card panel step-card">
              <header class="panel-head">
                <div>
                  <h2 class="panel-title"><span class="step-num" [class.done]="published()">3</span>Publish</h2>
                  <span class="panel-sub">Makes seats searchable by hall ticket.</span>
                </div>
              </header>
              <div class="panel-body">
                @if (published()) {
                  <div class="live">
                    <app-icon name="check-circle" [size]="16" /> Live — students can find their seats.
                    <a [routerLink]="['/exam', examId]" target="_blank" class="btn btn-outline btn-sm"><app-icon name="eye" [size]="14" /> Public view</a>
                    <button class="btn btn-outline btn-sm" (click)="dialog.set('unpublish')" [disabled]="busy()">Unpublish</button>
                  </div>
                } @else {
                  <button class="btn btn-primary" (click)="dialog.set('publish')" [disabled]="busy() || !canPublish()">
                    <app-icon name="send" [size]="15" /> Publish seating
                  </button>
                  @if (!seatingGenerated()) { <p class="note">Run the seating first.</p> }
                  @else if (unseatedCount() > 0) { <p class="note text-danger">{{ unseatedCount() }} students have no seat. Add halls and run seating again.</p> }
                  @else if (dirty()) { <p class="note text-warning">Settings changed — run seating again.</p> }
                }
              </div>
            </section>

            <!-- Invigilators (optional) -->
            <section class="card panel step-card">
              <header class="panel-head">
                <div>
                  <h2 class="panel-title">Invigilators <span class="text-muted" style="font-weight:400;font-size:0.8rem">· optional</span></h2>
                  <span class="panel-sub">Spread by workload and department; nobody is booked twice at the same time.</span>
                </div>
                <div class="panel-actions">
                  @if (teachers().length === 0) {
                    <a routerLink="/admin/teachers" class="btn btn-outline btn-sm"><app-icon name="badge" [size]="14" /> Add staff</a>
                  } @else if (dutyRooms().length) {
                    <input class="form-control" style="width:64px;height:32px" type="number" min="1" max="5" aria-label="Invigilators per hall"
                      [ngModel]="exam()!.teachersPerRoom" (ngModelChange)="setPerRoom($event)" />
                    <span class="text-muted" style="align-self:center;font-size:0.78rem">per hall</span>
                    @if (hasInvigilators()) { <button class="btn btn-ghost btn-sm" (click)="clearInvigilators()" [disabled]="busy()">Clear</button> }
                    <button class="btn btn-outline btn-sm" (click)="autoAllot()" [disabled]="busy()">
                      <app-icon name="shuffle" [size]="14" /> {{ hasInvigilators() ? 'Re-allot' : 'Auto-allot' }}
                    </button>
                  }
                </div>
              </header>
              @if (dutyRooms().length === 0) {
                <div class="panel-body"><p class="text-muted">Pick halls above first.</p></div>
              } @else {
                <div class="table-wrapper">
                  <table>
                    <thead><tr><th>Hall</th><th>Invigilator(s)</th>@if (published()) { <th>Attendance</th><th></th> }</tr></thead>
                    <tbody>
                      @for (row of dutyRows(); track row.room.id) {
                        <tr>
                          <td><strong>{{ row.room.name }}</strong></td>
                          <td>
                            <div class="chips">
                              @for (t of row.teachers; track t.id) {
                                <span class="chip">{{ t.name }}<button class="x" type="button" [attr.aria-label]="'Remove ' + t.name" (click)="removeTeacher(row.room.id, t.id)">×</button></span>
                              }
                              @if (teachers().length) {
                                <select class="add-sel" aria-label="Add invigilator" (change)="addTeacher(row.room.id, $any($event.target).value); $any($event.target).value = ''">
                                  <option value="">+ Add</option>
                                  @for (t of availableFor(row.room.id); track t.id) { <option [value]="t.id">{{ t.name }}{{ t.department ? ' · ' + t.department : '' }}</option> }
                                </select>
                              }
                            </div>
                          </td>
                          @if (published()) {
                            <td>
                              @if (row.sheet?.submitted) { <span class="badge badge-green">Submitted · {{ row.sheet!.absentHallTickets.length }} absent</span> }
                              @else { <span class="badge badge-amber">Pending</span> }
                            </td>
                            <td class="text-right">
                              @if (row.sheet) {
                                <button class="btn btn-outline btn-sm" (click)="copyLink(row.sheet)"><app-icon name="clipboard" [size]="13" /> Copy link</button>
                                <a class="btn btn-ghost btn-sm" [href]="linkOf(row.sheet)" target="_blank">Open</a>
                              }
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                @if (published()) {
                  <div class="panel-foot">
                    <span class="text-muted">Send each invigilator their hall's link — they mark absentees on their phone, no login. {{ submittedCount() }} / {{ sheets().length }} submitted.</span>
                    <button class="btn btn-ghost btn-sm" (click)="refreshSheets()">Refresh</button>
                  </div>
                } @else {
                  <div class="panel-foot"><span class="text-muted">Attendance links are created when you publish.</span></div>
                }
              }
            </section>
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

    .step-card { margin-bottom: 16px; }
    .step-num { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; margin-right: 8px; border-radius: 99px; font-size: 0.75rem; font-weight: 600; background: var(--ink-face); color: var(--ink-text); }
    .step-num.done { background: var(--accent-green); }
    .panel-body { padding: 16px 18px; }
    .hall-pick { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .hall-opt { display: flex; align-items: center; gap: 10px; padding: 8px 11px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); cursor: pointer; font-size: 0.88rem; }
    .hall-opt.on { border-color: var(--accent-blue); background: color-mix(in oklch, var(--accent-blue) 7%, transparent); }
    .hall-opt input { accent-color: var(--accent-blue); width: 16px; height: 16px; }
    .hall-opt .grow { flex: 1; }
    .hall-opt small { color: var(--text-muted); }
    .rules { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: end; margin-bottom: 12px; }
    @media (max-width: 620px) { .rules { grid-template-columns: 1fr; } }
    .gap-toggle { display: flex; align-items: center; gap: 9px; font-size: 0.88rem; padding-bottom: 9px; }
    .gap-toggle input { accent-color: var(--accent-blue); width: 16px; height: 16px; }
    .fit { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: var(--radius-sm); font-size: 0.84rem; margin-bottom: 14px; color: var(--accent-green); background: color-mix(in oklch, var(--accent-green) 9%, transparent); }
    .fit.bad { color: var(--accent-red); background: color-mix(in oklch, var(--accent-red) 9%, transparent); }
    .fit.warn { color: var(--accent-amber, #b45309); background: color-mix(in oklch, #f59e0b 12%, transparent); }
    .row-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .note { font-size: 0.8rem; color: var(--text-muted); margin-top: 10px; line-height: 1.5; }
    .chip .x { background: none; border: 0; padding: 0 0 0 3px; cursor: pointer; color: var(--text-muted); font-size: 0.95rem; line-height: 1; }
    .chip .x:hover { color: var(--accent-red); }
    .add-sel { font-size: 0.78rem; padding: 3px 6px; border: 1px dashed var(--border-strong); border-radius: 3px; background: none; color: var(--text-secondary); max-width: 150px; }
    .live { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 11px 14px; border-radius: var(--radius-sm); background: color-mix(in oklch, var(--accent-green) 9%, transparent); font-size: 0.86rem; }
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
  private attendance = inject(AttendanceService);
  private router = inject(Router);

  examId = '';
  loading = signal(true);
  busy = signal(false);
  dialog = signal<DialogKind>('');
  exam = signal<Exam | null>(null);
  students = signal<Student[]>([]);
  rooms = signal<Room[]>([]);
  teachers = signal<Teacher[]>([]);
  sheets = signal<Attendance[]>([]);
  showAll = signal(false);
  dirty = signal(false);               // settings changed after seating was last run
  formatFloor = formatFloor;

  published = () => this.exam()?.status === 'published';
  seatingGenerated = () => this.students().some(s => s.isSeated);
  seatedCount = () => this.students().filter(s => s.isSeated).length;
  unseatedCount = () => (this.seatingGenerated() ? this.students().length - this.seatedCount() : 0);
  canPublish = () => this.seatingGenerated() && this.unseatedCount() === 0 && !this.dirty();
  roomName = (id?: string) => this.rooms().find(r => r.id === id)?.name ?? '—';
  visibleStudents = () => (this.showAll() ? this.students() : this.students().slice(0, 25));

  pickedRooms = (): Room[] => {
    const ids = this.exam()?.selectedRooms ?? [];
    return this.rooms().filter(r => ids.includes(r.id));
  };
  isPicked = (id: string) => (this.exam()?.selectedRooms ?? []).includes(id);
  seatsIn = (r: Room) => roomCapacity(r.columnLayout, r.seatsPerBench, this.exam()?.spacing ?? false);
  capacity = () => this.seatingService.capacityOf(this.pickedRooms(), this.exam()?.spacing ?? false);
  capacityShort = () => this.students().length > 0 && this.capacity() < this.students().length;

  absentSet = () => new Set(this.sheets().flatMap(s => s.absentHallTickets));
  submittedCount = () => this.sheets().filter(s => s.submitted).length;

  allotmentByRoom = () => {
    const counts = new Map<string, number>();
    for (const s of this.students()) if (s.isSeated && s.assignedRoom) counts.set(s.assignedRoom, (counts.get(s.assignedRoom) ?? 0) + 1);
    return [...counts.entries()].map(([roomId, count]) => {
      const room = this.rooms().find(r => r.id === roomId);
      return { roomId, roomName: room?.name ?? roomId, floor: formatFloor(room?.floor ?? ''), count };
    }).sort((a, b) => a.roomName.localeCompare(b.roomName, undefined, { numeric: true }));
  };

  stages = () => {
    const roster = this.students().length > 0;
    const seated = this.seatingGenerated() && !this.dirty();
    const pub = this.published();
    return [
      { label: 'Students', done: roster, active: !roster, note: roster ? `${this.students().length} candidates` : 'Upload the list' },
      { label: 'Halls & seating', done: seated, active: roster && !seated, note: seated ? `${this.seatedCount()} seated` : 'Pick halls, run seating' },
      { label: 'Publish', done: pub, active: seated && !pub, note: pub ? 'Live' : 'Not published' }
    ];
  };

  // ── invigilators ──
  dutyRooms = (): Room[] => {
    if (this.seatingGenerated()) {
      const ids = new Set(this.students().filter(s => s.isSeated).map(s => s.assignedRoom));
      return this.rooms().filter(r => ids.has(r.id));
    }
    return this.pickedRooms();
  };
  hasInvigilators = () => Object.values(this.exam()?.invigilators ?? {}).some(ids => ids.length > 0);
  dutyRows = () => {
    const inv = this.exam()?.invigilators ?? {};
    return this.dutyRooms().map(room => ({
      room,
      teachers: (inv[room.id] ?? []).map(id => this.teachers().find(t => t.id === id)).filter((t): t is Teacher => !!t),
      sheet: this.sheets().find(s => s.roomId === room.id) ?? null
    }));
  };
  availableFor = (roomId: string) => {
    const inv = this.exam()?.invigilators ?? {};
    const taken = new Set(Object.values(inv).flat());
    return this.teachers().filter(t => t.isActive && !taken.has(t.id) && !(inv[roomId] ?? []).includes(t.id));
  };

  async ngOnInit() {
    this.examId = this.route.snapshot.paramMap.get('id')!;
    try {
      const [exam, students, rooms, teachers, sheets] = await Promise.all([
        this.examService.getExam(this.examId),
        this.examService.getStudents(this.examId),
        firstValueFrom(this.roomService.getRooms()),
        firstValueFrom(this.teacherService.getTeachers()),
        this.attendance.forExam(this.examId).catch(() => [])
      ]);
      this.exam.set(exam);
      this.students.set(students);
      this.rooms.set(rooms ?? []);
      this.teachers.set(teachers ?? []);
      this.sheets.set(sheets);
      // A saved allotment that no longer matches the chosen halls is stale.
      if (exam && students.some(s => s.isSeated)) {
        const picked = new Set(exam.selectedRooms);
        this.dirty.set(students.some(s => s.isSeated && !picked.has(s.assignedRoom ?? '')));
      }
    } finally { this.loading.set(false); }
  }

  // ── setup (saved as you click) ──
  private async patch(change: Partial<Exam>) {
    const exam = this.exam();
    if (!exam) return;
    this.exam.set({ ...exam, ...change });
    if (this.seatingGenerated()) this.dirty.set(true);
    try { await this.examService.updateExam(this.examId, change); }
    catch (e: any) { this.exam.set(exam); this.toastService.error(e?.message ?? 'Could not save.'); }
  }
  toggleRoom(id: string) {
    const cur = this.exam()?.selectedRooms ?? [];
    this.patch({ selectedRooms: cur.includes(id) ? cur.filter(r => r !== id) : [...cur, id] });
  }
  setMode(mode: ShuffleMode) { this.patch({ shuffleMode: mode }); }
  setSpacing(on: boolean) { this.patch({ spacing: !!on }); }
  async setPerRoom(n: number) {
    const exam = this.exam();
    if (!exam) return;
    const v = Math.min(5, Math.max(1, Math.trunc(Number(n) || 1)));
    this.exam.set({ ...exam, teachersPerRoom: v });
    await this.examService.updateExam(this.examId, { teachersPerRoom: v }).catch(() => {});
  }

  // ── students ──
  private fileInput() { return document.querySelector<HTMLInputElement>('input[type=file][hidden]'); }
  askUpload() { if (this.seatingGenerated()) this.dialog.set('replace'); else this.pickFile(); }
  pickFile() { this.dialog.set(''); this.fileInput()?.click(); }

  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.busy.set(true);
    try {
      const students = await this.fileUploadService.parseFile(file);
      await this.examService.saveStudents(this.examId, students);
      this.students.set(students);
      this.dirty.set(false);
      this.showAll.set(false);
      this.toastService.success(`${students.length} students loaded.`);
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Could not read that file.');
    } finally { input.value = ''; this.busy.set(false); }
  }

  // ── seating ──
  async runSeating() {
    const exam = this.exam();
    if (!exam) return;
    this.busy.set(true);
    try {
      const assigned = this.seatingService.assignSeats(this.students(), this.pickedRooms(), { mode: exam.shuffleMode, spacing: exam.spacing });
      // Only halls that actually receive students can clash with another exam.
      const used = [...new Set(assigned.filter(s => s.isSeated).map(s => s.assignedRoom!))];
      const conflicts = await this.examService.getRoomConflicts(this.examId, used, exam.date, exam.startTime, exam.endTime);
      if (conflicts.length) {
        const names = [...new Set(conflicts.map(c => c.roomName))].join(', ');
        this.toastService.error(`${names} already used by "${conflicts[0].examName}" at ${conflicts[0].time}. Pick other halls.`);
        return;
      }
      await this.examService.saveAssignedStudents(this.examId, assigned);
      this.students.set(assigned);
      this.dirty.set(false);
      // Invigilators for halls that are no longer used no longer apply.
      const inv: Record<string, string[]> = {};
      for (const [rid, ids] of Object.entries(exam.invigilators ?? {})) if (used.includes(rid)) inv[rid] = ids;
      if (Object.keys(inv).length !== Object.keys(exam.invigilators ?? {}).length) {
        this.exam.set({ ...exam, invigilators: inv });
        await this.examService.saveInvigilators(this.examId, inv, exam.teachersPerRoom);
      }
      this.toastService.success(`Seated ${used.length ? assigned.filter(s => s.isSeated).length : 0} students across ${used.length} hall(s).`);
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Seating failed.');
    } finally { this.busy.set(false); }
  }

  // ── publish ──
  async publish() {
    this.dialog.set('');
    this.busy.set(true);
    try {
      await this.examService.publishExam(this.examId);
      this.exam.update(e => e ? { ...e, status: 'published' } : e);
      await this.refreshSheets();
      this.toastService.success('Published. Copy each hall\'s link to its invigilator.');
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Publishing failed.');
    } finally { this.busy.set(false); }
  }

  async unpublish() {
    this.dialog.set('');
    this.busy.set(true);
    try {
      await this.examService.unpublishExam(this.examId);
      this.exam.update(e => e ? { ...e, status: 'draft' } : e);
      this.sheets.set([]);
      this.toastService.success('Unpublished. You can edit and publish again.');
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Could not unpublish.');
    } finally { this.busy.set(false); }
  }

  async deleteExam() {
    this.dialog.set('');
    this.busy.set(true);
    try {
      await this.examService.deleteExam(this.examId);
      this.toastService.success('Examination deleted.');
      this.router.navigate(['/admin/exams']);
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Could not delete.');
      this.busy.set(false);
    }
  }

  // ── invigilators ──
  private async saveInv(next: Record<string, string[]>) {
    const exam = this.exam()!;
    this.exam.set({ ...exam, invigilators: next });
    await this.examService.saveInvigilators(this.examId, next, exam.teachersPerRoom);
    if (this.published()) {
      await this.examService.syncAttendance({ ...exam, invigilators: next });   // keeps links and marks
      await this.refreshSheets();
    }
  }

  async autoAllot() {
    const exam = this.exam();
    if (!exam) return;
    if (this.teachers().filter(t => t.isActive).length === 0) { this.toastService.error('No staff available.'); return; }
    this.busy.set(true);
    try {
      const [busy, counts] = await Promise.all([
        this.examService.getBusyTeachers(this.examId, exam.date, exam.startTime, exam.endTime),
        this.examService.getDutyCounts(this.examId)
      ]);
      const res = this.teacherService.allot({
        roomIds: this.dutyRooms().map(r => r.id), teachersPerRoom: exam.teachersPerRoom,
        teachers: this.teachers(), busyTeacherIds: busy, examDepartment: exam.department, dutyCounts: counts
      });
      await this.saveInv(res.allotment);
      if (res.shortBy > 0) this.toastService.error(`${res.shortBy} more invigilator(s) needed — some halls are short.`);
      else this.toastService.success('Invigilators allotted.');
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Could not allot invigilators.');
    } finally { this.busy.set(false); }
  }

  async clearInvigilators() {
    this.busy.set(true);
    try { await this.saveInv({}); this.toastService.success('Cleared.'); }
    catch (e: any) { this.toastService.error(e?.message ?? 'Could not clear.'); }
    finally { this.busy.set(false); }
  }

  async addTeacher(roomId: string, teacherId: string) {
    if (!teacherId) return;
    const inv = { ...(this.exam()?.invigilators ?? {}) };
    inv[roomId] = [...(inv[roomId] ?? []), teacherId];
    try { await this.saveInv(inv); } catch (e: any) { this.toastService.error(e?.message ?? 'Could not add.'); }
  }

  async removeTeacher(roomId: string, teacherId: string) {
    const inv = { ...(this.exam()?.invigilators ?? {}) };
    inv[roomId] = (inv[roomId] ?? []).filter(id => id !== teacherId);
    try { await this.saveInv(inv); } catch (e: any) { this.toastService.error(e?.message ?? 'Could not remove.'); }
  }

  // ── attendance links ──
  linkOf = (a: Attendance) => this.attendance.linkFor(a);
  async refreshSheets() { this.sheets.set(await this.attendance.forExam(this.examId).catch(() => [])); }
  async copyLink(a: Attendance) {
    const link = this.linkOf(a);
    try { await navigator.clipboard.writeText(link); this.toastService.success(`Link for ${a.roomName} copied.`); }
    catch { window.prompt('Copy this link:', link); }
  }
}
