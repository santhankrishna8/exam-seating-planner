import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ExamService } from '../../../services/exam.service';
import { RoomService } from '../../../services/room.service';
import { SeatingService } from '../../../services/seating.service';
import { FileUploadService } from '../../../services/file-upload.service';
import { ToastService } from '../../../services/toast.service';
import { Room } from '../../../models/room.model';
import { Student } from '../../../models/student.model';
import { ShuffleMode } from '../../../models/exam.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-exam-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminSidebarComponent, ToastComponent, IconComponent],
  template: `
    <app-toast />
    <div class="admin-layout">
      <app-admin-sidebar />
      <main class="admin-main">
        <div class="page-content fade-in">
          <div class="section-header">
            <h1>{{ editing() ? 'Edit Exam' : 'Create Exam' }}</h1>
            <a routerLink="/admin/exams" class="btn btn-outline btn-sm"><app-icon name="arrow-left" [size]="15" /> Back</a>
          </div>

          <div class="create-grid">
            <!-- Exam Info -->
            <div class="glass-card form-section">
              <h3 class="form-section-title">Exam Details</h3>
              <div class="form-group">
                <label class="form-label">Exam Name *</label>
                <input class="form-control" [(ngModel)]="form.name" placeholder="Data Structures – Mid 1" />
              </div>
              <div class="form-group">
                <label class="form-label">Subject Code</label>
                <input class="form-control" [(ngModel)]="form.subjectCode" placeholder="CS301" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Date *</label>
                  <input class="form-control" type="date" [(ngModel)]="form.date" />
                </div>
                <div class="form-group">
                  <label class="form-label">Start Time *</label>
                  <input class="form-control" type="time" [(ngModel)]="form.startTime" />
                </div>
                <div class="form-group">
                  <label class="form-label">End Time *</label>
                  <input class="form-control" type="time" [(ngModel)]="form.endTime" />
                </div>
              </div>
            </div>

            <!-- Seating Strategy -->
            <div class="glass-card form-section">
              <h3 class="form-section-title">Seating Strategy</h3>
              <div class="form-group">
                <label class="form-label">Allotment Mode</label>
                <select class="form-control" [(ngModel)]="form.shuffleMode">
                  <option value="sequential">Sequential — keep upload order</option>
                  <option value="random">Random — shuffle everyone</option>
                  <option value="department">Department spread — split bench-mates by dept</option>
                </select>
                <span class="form-hint">{{ modeHint() }}</span>
              </div>
              <label class="toggle-row">
                <input type="checkbox" [(ngModel)]="form.spacing" />
                <span>
                  <span class="toggle-title">Leave a gap seat</span>
                  <span class="toggle-sub text-muted">Skip alternate seats on each bench (halves capacity).</span>
                </span>
              </label>
            </div>
          </div>

          <!-- Room Selection -->
          <div class="glass-card form-section mt-16">
            <h3 class="form-section-title">Select Rooms *</h3>
            @if (rooms().length === 0) {
              <p class="text-muted">No rooms available. <a routerLink="/admin/rooms">Add rooms first.</a></p>
            } @else {
              <div class="room-select-list">
                @for (room of rooms(); track room.id) {
                  <label class="room-select-item" [class.selected]="isRoomSelected(room.id)">
                    <input type="checkbox" [checked]="isRoomSelected(room.id)" (change)="toggleRoom(room.id)" />
                    <div class="room-select-info">
                      <span class="room-select-name">{{ room.name }}</span>
                      @if (room.floor) { <span class="text-muted" style="font-size:0.8rem">{{ room.floor }}</span> }
                    </div>
                    <span class="badge badge-blue">{{ room.totalCapacity }} seats</span>
                  </label>
                }
              </div>
              <div class="capacity-info" [class.short]="capacityShort()">
                <span>
                  Capacity: <strong>{{ selectedCapacity() }}</strong> seats
                  @if (form.spacing) { <span class="text-muted">(with gap)</span> }
                  @if (knownStudentCount() > 0) { · <strong>{{ knownStudentCount() }}</strong> students }
                </span>
                @if (capacityShort()) {
                  <span class="cap-warn"><app-icon name="alert" [size]="15" /> {{ selectedCapacity() === 0 ? 'Select at least one room' : 'Not enough seats — add rooms or turn off gap' }}</span>
                } @else if (knownStudentCount() > 0) {
                  <span class="cap-ok"><app-icon name="check-circle" [size]="15" /> Fits</span>
                }
              </div>
            }
          </div>

          <!-- Student Upload -->
          <div class="glass-card form-section mt-16">
            <h3 class="form-section-title">{{ editing() ? 'Replace Students' : 'Upload Students' }}</h3>
            <p class="text-muted mb-16" style="font-size:0.875rem">
              Upload a CSV or Excel file. Columns: <code>Hall Ticket No, Name, Department (optional), Section (optional)</code>
              @if (editing() && existingStudents() > 0 && students().length === 0) {
                <br>Currently <strong>{{ existingStudents() }}</strong> students. Uploading a new file replaces them and clears any seating.
              }
            </p>

            <div class="upload-zone" [class.has-file]="students().length > 0"
              (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
              <input type="file" accept=".csv,.xlsx,.xls" (change)="onFileChange($event)" #fileInput class="file-input" />
              @if (students().length === 0) {
                <div class="upload-prompt" (click)="fileInput.click()">
                  <div class="upload-icon"><app-icon name="upload" [size]="26" /></div>
                  <p>Drag & drop or <span class="text-accent">click to browse</span></p>
                  <p class="text-muted" style="font-size:0.8rem">CSV, XLS, XLSX supported</p>
                </div>
              } @else {
                <div class="upload-success">
                  <span class="text-success d-flex align-center gap-8"><app-icon name="check-circle" [size]="18" /> {{ students().length }} students loaded</span>
                  <button class="btn btn-ghost btn-sm" (click)="students.set([]); fileInput.value = ''">Clear</button>
                </div>
              }
            </div>

            @if (students().length > 0) {
              <div class="table-wrapper mt-16" style="max-height:300px;overflow-y:auto">
                <table>
                  <thead>
                    <tr><th>#</th><th>Hall Ticket</th><th>Name</th><th>Dept</th></tr>
                  </thead>
                  <tbody>
                    @for (s of students().slice(0, 20); track s.hallTicketNo; let i = $index) {
                      <tr>
                        <td>{{ i + 1 }}</td>
                        <td><code>{{ s.hallTicketNo }}</code></td>
                        <td>{{ s.name }}</td>
                        <td>{{ s.department || '—' }}</td>
                      </tr>
                    }
                    @if (students().length > 20) {
                      <tr><td colspan="4" class="text-center text-muted">… and {{ students().length - 20 }} more</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <div class="create-actions mt-24">
            <a routerLink="/admin/exams" class="btn btn-outline">Cancel</a>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
              {{ saving() ? 'Saving…' : (editing() ? 'Save Changes' : 'Create Exam') }}
            </button>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .admin-layout { display: flex; min-height: 100vh; }
    .admin-main { flex: 1; overflow-y: auto; }
    .create-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 900px) { .create-grid { grid-template-columns: 1fr; } }
    .form-section { padding: 24px; }
    .form-section-title { font-size: 1rem; font-weight: 600; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color); }

    .toggle-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); cursor: pointer; }
    .toggle-row input { accent-color: var(--accent-blue); width: 16px; height: 16px; margin-top: 2px; }
    .toggle-title { display: block; font-size: 0.9rem; font-weight: 500; }
    .toggle-sub { display: block; font-size: 0.8rem; margin-top: 2px; }

    .room-select-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
    .room-select-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer; transition: all 0.2s; }
    .room-select-item:hover { border-color: oklch(0.42 0.13 274 / 0.4); background: oklch(0.42 0.13 274 / 0.04); }
    .room-select-item.selected { border-color: var(--accent-blue); background: oklch(0.42 0.13 274 / 0.08); }
    .room-select-item input[type=checkbox] { accent-color: var(--accent-blue); width: 16px; height: 16px; }
    .room-select-info { flex: 1; display: flex; flex-direction: column; }
    .room-select-name { font-size: 0.875rem; font-weight: 500; }
    .capacity-info { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.85rem; color: var(--text-secondary); padding: 10px 12px; background: oklch(0.50 0.13 150 / 0.10); border-radius: 6px; border: 1px solid oklch(0.50 0.13 150 / 0.25); }
    .capacity-info.short { background: oklch(0.50 0.19 25 / 0.10); border-color: oklch(0.50 0.19 25 / 0.3); }
    .cap-warn { display: inline-flex; align-items: center; gap: 6px; color: var(--accent-red); font-weight: 600; }
    .cap-ok { display: inline-flex; align-items: center; gap: 6px; color: var(--accent-green); font-weight: 600; }

    .upload-zone { border: 2px dashed var(--border-color); border-radius: var(--radius-md); padding: 32px; text-align: center; transition: border-color 0.2s; }
    .upload-zone:hover { border-color: var(--accent-blue); }
    .upload-zone.has-file { border-color: var(--accent-green); border-style: solid; padding: 16px; }
    .file-input { display: none; }
    .upload-prompt { cursor: pointer; }
    .upload-icon { color: var(--accent-blue); display: flex; justify-content: center; margin-bottom: 8px; }
    .upload-success { display: flex; justify-content: space-between; align-items: center; }
    .create-actions { display: flex; gap: 10px; justify-content: flex-end; }
    code { font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent-blue); }
  `]
})
export class ExamCreateComponent implements OnInit {
  private examService = inject(ExamService);
  private roomService = inject(RoomService);
  private seatingService = inject(SeatingService);
  private fileUploadService = inject(FileUploadService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  rooms = signal<Room[]>([]);
  students = signal<Student[]>([]);
  existingStudents = signal(0);
  saving = signal(false);
  editing = signal(false);
  examId = '';
  selectedRooms: Set<string> = new Set();

  form = {
    name: '', subjectCode: '', date: '', startTime: '09:00', endTime: '12:00',
    shuffleMode: 'sequential' as ShuffleMode, spacing: false
  };

  modeHint = () => ({
    sequential: 'Students keep the order they were uploaded in.',
    random: 'Everyone is shuffled before being seated.',
    department: 'Adjacent seats get different departments to deter copying.'
  } as Record<ShuffleMode, string>)[this.form.shuffleMode];

  // Plain getters: re-evaluated each change-detection pass so they react to
  // the gap-seat checkbox (a plain field) and the mutable room Set alike.
  selectedCapacity = (): number => {
    const chosen = this.rooms().filter(r => this.selectedRooms.has(r.id));
    return this.seatingService.capacityOf(chosen, this.form.spacing);
  };

  knownStudentCount = (): number => this.students().length || this.existingStudents();

  capacityShort = (): boolean => {
    const need = this.knownStudentCount();
    const cap = this.selectedCapacity();
    return cap === 0 || (need > 0 && cap < need);
  };

  async ngOnInit() {
    const rooms = await firstValueFrom(this.roomService.getRooms());
    this.rooms.set(rooms ?? []);

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editing.set(true);
      this.examId = id;
      await this.loadExam(id);
    }
  }

  private async loadExam(id: string) {
    const [exam, students] = await Promise.all([
      this.examService.getExam(id),
      this.examService.getStudents(id)
    ]);
    if (!exam) { this.toastService.error('Exam not found.'); this.router.navigate(['/admin/exams']); return; }
    this.form = {
      name: exam.name,
      subjectCode: exam.subjectCode ?? '',
      date: this.toDateInput(exam.date),
      startTime: exam.startTime || '09:00',
      endTime: exam.endTime || '12:00',
      shuffleMode: exam.shuffleMode,
      spacing: exam.spacing
    };
    this.selectedRooms = new Set(exam.selectedRooms);
    this.existingStudents.set(students.length);
  }

  private toDateInput(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  isRoomSelected(id: string): boolean { return this.selectedRooms.has(id); }

  toggleRoom(id: string) {
    if (this.selectedRooms.has(id)) this.selectedRooms.delete(id);
    else this.selectedRooms.add(id);
  }

  private async readFile(file?: File) {
    if (!file) return;
    try {
      const students = await this.fileUploadService.parseFile(file);
      this.students.set(students);
      this.toastService.success(`Loaded ${students.length} students.`);
    } catch (e: any) { this.toastService.error(e.message); }
  }

  onFileChange(event: Event) { this.readFile((event.target as HTMLInputElement).files?.[0]); }
  onDrop(event: DragEvent) { event.preventDefault(); this.readFile(event.dataTransfer?.files[0]); }

  async save() {
    if (!this.form.name || !this.form.date) { this.toastService.error('Please fill in exam name and date.'); return; }
    if (!this.form.startTime || !this.form.endTime) { this.toastService.error('Please set the exam start and end time.'); return; }
    if (this.form.endTime <= this.form.startTime) { this.toastService.error('End time must be after start time.'); return; }
    if (this.selectedRooms.size === 0) { this.toastService.error('Select at least one room.'); return; }
    if (this.capacityShort() && this.knownStudentCount() > 0) {
      this.toastService.error('Selected rooms can’t seat that many students. Add rooms or turn off the gap seat.');
      return;
    }

    this.saving.set(true);
    const payload = {
      name: this.form.name,
      subjectCode: this.form.subjectCode,
      date: new Date(this.form.date),
      startTime: this.form.startTime,
      endTime: this.form.endTime,
      shuffleMode: this.form.shuffleMode,
      spacing: this.form.spacing,
      selectedRooms: Array.from(this.selectedRooms)
    };

    try {
      if (this.editing()) {
        await this.examService.updateExam(this.examId, payload);
        if (this.students().length > 0) {
          await this.examService.saveStudents(this.examId, this.students());
        }
        this.toastService.success('Exam updated.');
        this.router.navigate(['/admin/exams', this.examId]);
      } else {
        const examId = await this.examService.createExam({ ...payload, status: 'draft' });
        if (this.students().length > 0) {
          await this.examService.saveStudents(examId, this.students());
        }
        this.toastService.success('Exam created successfully.');
        this.router.navigate(['/admin/exams', examId]);
      }
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Failed to save exam.');
    } finally { this.saving.set(false); }
  }
}
