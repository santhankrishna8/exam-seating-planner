import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { TeacherService } from '../../../services/teacher.service';
import { ToastService } from '../../../services/toast.service';
import { ExamService } from '../../../services/exam.service';
import { RoomService } from '../../../services/room.service';
import { Teacher } from '../../../models/teacher.model';
import { firstValueFrom } from 'rxjs';

interface DutyRow {
  teacherId: string;
  teacherName: string;
  examName: string;
  roomName: string;
  date: Date;
  dateKey: string;
  time: string;
}

@Component({
  selector: 'app-teacher-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent, ToastComponent, ConfirmDialogComponent, IconComponent],
  template: `
    <app-toast />
    <app-confirm-dialog
      [visible]="deleteTarget() !== null"
      title="Remove Teacher"
      message="Remove this teacher from your staff list? Existing duty rosters keep their names."
      confirmLabel="Remove"
      (confirm)="confirmDelete()"
      (cancel)="deleteTarget.set(null)"
    />

    <div class="admin-layout">
      <app-admin-sidebar />
      <main class="admin-main">
        <div class="page-content fade-in">
          <header class="page-head">
            <div>
              <span class="eyebrow">Resources</span>
              <h1 class="page-title">Invigilators</h1>
              <p class="page-sub">
                {{ teachers().length }} on roll · {{ availableCount() }} available for duty
                @if (withoutEmail() > 0) { · <span class="text-warning">{{ withoutEmail() }} without an email</span> }
              </p>
            </div>
            <button class="btn btn-primary" (click)="openForm()"><app-icon name="plus" [size]="15" /> Add invigilator</button>
          </header>

          @if (showForm()) {
            <div class="card teacher-form mb-24">
              <h3 class="mb-16">{{ editingId() ? 'Edit Teacher' : 'Add Teacher' }}</h3>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Name *</label>
                  <input class="form-control" [(ngModel)]="form.name" placeholder="Dr. A. Sharma" />
                </div>
                <div class="form-group">
                  <label class="form-label">Department</label>
                  <input class="form-control" [(ngModel)]="form.department" placeholder="Computer Science" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input class="form-control" type="email" [(ngModel)]="form.email" placeholder="a.sharma@college.edu" />
                  <span class="form-hint">Required for the invigilator portal — duties are matched to this address.</span>
                </div>
                <div class="form-group">
                  <label class="form-label">Phone</label>
                  <input class="form-control" [(ngModel)]="form.phone" placeholder="98765 43210" />
                </div>
              </div>
              <label class="toggle-row">
                <input type="checkbox" [(ngModel)]="form.isActive" />
                <span>
                  <span class="toggle-title">Available for duty</span>
                  <span class="toggle-sub text-muted">Only available teachers are auto-allotted to exams.</span>
                </span>
              </label>
              <div class="form-actions mt-16">
                <button class="btn btn-outline" (click)="cancelForm()">Cancel</button>
                <button class="btn btn-primary" (click)="saveTeacher()" [disabled]="saving()">
                  {{ saving() ? 'Saving…' : editingId() ? 'Update' : 'Add Teacher' }}
                </button>
              </div>
            </div>
          }

          @if (teachers().length === 0) {
            <div class="card empty-state">
              <div class="empty-state-icon"><app-icon name="badge" [size]="30" /></div>
              <h3>No teachers yet</h3>
              <p>Add your teaching staff so they can be allotted as invigilators.</p>
            </div>
          } @else {
            <div class="table-wrapper card">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Contact</th>
                    <th>Duties</th>
                    <th>Status</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of teachers(); track t.id) {
                    <tr>
                      <td><strong>{{ t.name }}</strong></td>
                      <td>{{ t.department || '—' }}</td>
                      <td class="contact">
                        @if (t.email) { <span>{{ t.email }}</span> }
                        @if (t.phone) { <span class="text-muted">{{ t.phone }}</span> }
                        @if (!t.email && !t.phone) { <span class="text-muted">—</span> }
                      </td>
                      <td class="duty-n">{{ dutyCountFor(t.id) }}</td>
                      <td>
                        <span class="badge" [class.badge-green]="t.isActive" [class.badge-gray]="!t.isActive">
                          {{ t.isActive ? 'Available' : 'Inactive' }}
                        </span>
                      </td>
                      <td class="text-right">
                        <button class="btn btn-ghost btn-icon" title="Edit" aria-label="Edit teacher" (click)="editTeacher(t)"><app-icon name="pencil" [size]="16" /></button>
                        <button class="btn btn-ghost btn-icon" title="Remove" aria-label="Remove teacher" (click)="deleteTarget.set(t.id)"><app-icon name="trash" [size]="16" /></button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- Duty roster: who's where -->
          <div class="section-header mt-24">
            <div>
              <h2 class="section-title">Duty roster</h2>
              <p class="text-muted" style="font-size:0.82rem">Who is invigilating where, across every live examination.</p>
            </div>
            @if (dutyDates().length) {
              <select class="form-control" style="width:auto" [ngModel]="filterDate()" (ngModelChange)="filterDate.set($event)">
                <option value="">All dates</option>
                @for (d of dutyDates(); track d) {
                  <option [value]="d">{{ d | date:'EEE, dd MMM yyyy' }}</option>
                }
              </select>
            }
          </div>

          @if (filteredDuties().length === 0) {
            <div class="card empty-state">
              <div class="empty-state-icon"><app-icon name="clipboard" [size]="30" /></div>
              <h3>No duties yet</h3>
              <p>Auto-allot invigilators from an exam's page and assignments appear here.</p>
            </div>
          } @else {
            <div class="table-wrapper card">
              <table>
                <thead>
                  <tr><th>Teacher</th><th>Exam</th><th>Room</th><th>Date</th><th>Time</th></tr>
                </thead>
                <tbody>
                  @for (d of filteredDuties(); track $index) {
                    <tr>
                      <td><strong>{{ d.teacherName }}</strong></td>
                      <td>{{ d.examName }}</td>
                      <td>{{ d.roomName }}</td>
                      <td>{{ d.date | date:'dd MMM yyyy' }}</td>
                      <td class="mono">{{ d.time }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }
    .teacher-form { padding: 24px; }
    .duty-n { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; }
    .toggle-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); cursor: pointer; margin-top: 4px; }
    .toggle-row input { accent-color: var(--accent-blue); width: 16px; height: 16px; margin-top: 2px; }
    .toggle-title { display: block; font-size: 0.9rem; font-weight: 500; }
    .toggle-sub { display: block; font-size: 0.8rem; margin-top: 2px; }
    .contact { display: flex; flex-direction: column; gap: 2px; font-size: 0.85rem; }
    td.text-right, th.text-right { text-align: right; white-space: nowrap; }
  `]
})
export class TeacherManagementComponent implements OnInit {
  private teacherService = inject(TeacherService);
  private toastService = inject(ToastService);
  private examService = inject(ExamService);
  private roomService = inject(RoomService);

  teachers = signal<Teacher[]>([]);
  duties = signal<DutyRow[]>([]);
  filterDate = signal<string>('');
  showForm = signal(false);
  editingId = signal<string | null>(null);
  deleteTarget = signal<string | null>(null);
  saving = signal(false);

  form: Omit<Teacher, 'id'> = { name: '', department: '', email: '', phone: '', isActive: true };

  availableCount = () => this.teachers().filter(t => t.isActive).length;
  /** Duty documents are keyed by email, so staff without one get no portal login. */
  withoutEmail = () => this.teachers().filter(t => !(t.email ?? '').trim()).length;
  dutyCountFor = (id: string) => this.duties().filter(d => d.teacherId === id).length;

  ngOnInit() { this.load(); this.loadDuties(); }

  load() { this.teacherService.getTeachers().subscribe(t => this.teachers.set(t)); }

  private async loadDuties() {
    const [exams, rooms, teachers] = await Promise.all([
      firstValueFrom(this.examService.getExams()),
      firstValueFrom(this.roomService.getRooms()),
      firstValueFrom(this.teacherService.getTeachers())
    ]);
    const roomName = new Map((rooms ?? []).map(r => [r.id, r.name]));
    const teacherName = new Map((teachers ?? []).map(t => [t.id, t.name]));
    const rows: DutyRow[] = [];
    for (const e of exams ?? []) {
      if (e.status === 'archived') continue;
      for (const [roomId, ids] of Object.entries(e.invigilators ?? {})) {
        for (const tid of ids) {
          rows.push({
            teacherId: tid,
            teacherName: teacherName.get(tid) ?? '(removed teacher)',
            examName: e.name,
            roomName: roomName.get(roomId) ?? roomId,
            date: e.date,
            dateKey: this.dateKey(e.date),
            time: `${e.startTime || '—'}–${e.endTime || '—'}`
          });
        }
      }
    }
    rows.sort((a, b) => a.date.getTime() - b.date.getTime() || a.teacherName.localeCompare(b.teacherName));
    this.duties.set(rows);
  }

  private dateKey(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  dutyDates = () => [...new Set(this.duties().map(d => d.dateKey))];
  filteredDuties = () => {
    const f = this.filterDate();
    return f ? this.duties().filter(d => d.dateKey === f) : this.duties();
  };

  openForm() { this.resetForm(); this.showForm.set(true); }
  cancelForm() { this.showForm.set(false); this.editingId.set(null); }
  resetForm() { this.form = { name: '', department: '', email: '', phone: '', isActive: true }; this.editingId.set(null); }

  editTeacher(t: Teacher) {
    this.editingId.set(t.id);
    this.form = { name: t.name, department: t.department ?? '', email: t.email ?? '', phone: t.phone ?? '', isActive: t.isActive };
    this.showForm.set(true);
  }

  async saveTeacher() {
    if (!this.form.name.trim()) { this.toastService.error('Teacher name is required.'); return; }
    this.saving.set(true);
    try {
      if (this.editingId()) {
        await this.teacherService.updateTeacher(this.editingId()!, this.form);
        this.toastService.success('Teacher updated.');
      } else {
        await this.teacherService.addTeacher(this.form);
        this.toastService.success('Teacher added.');
      }
      this.cancelForm();
      this.load();
    } catch (e: any) { this.toastService.error(e?.message ?? 'Failed to save teacher.'); }
    finally { this.saving.set(false); }
  }

  async confirmDelete() {
    const id = this.deleteTarget();
    if (!id) return;
    try {
      await this.teacherService.deleteTeacher(id);
      this.toastService.success('Teacher removed.');
      this.load();
    } catch { this.toastService.error('Failed to remove teacher.'); }
    this.deleteTarget.set(null);
  }
}
