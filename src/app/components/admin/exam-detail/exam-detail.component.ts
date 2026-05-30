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
import { Exam } from '../../../models/exam.model';
import { Student } from '../../../models/student.model';
import { Room } from '../../../models/room.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-exam-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminSidebarComponent, LoaderComponent, ToastComponent, ConfirmDialogComponent, IconComponent],
  template: `
    <app-toast />
    <app-confirm-dialog
      [visible]="showPublishDialog()"
      title="Publish Exam"
      [message]="seatingGenerated()
        ? 'Publishing will make this seating visible to all students. This cannot be undone easily.'
        : 'Seating has NOT been generated yet. Students will see no seat info. Generate seating first, then publish.'"
      confirmLabel="Publish"
      (confirm)="publishExam()"
      (cancel)="showPublishDialog.set(false)"
    />
    <app-confirm-dialog
      [visible]="showArchiveDialog()"
      title="Archive Exam"
      message="Archived exams are no longer visible to students."
      confirmLabel="Archive"
      (confirm)="archiveExam()"
      (cancel)="showArchiveDialog.set(false)"
    />
    <app-confirm-dialog
      [visible]="showDeleteDialog()"
      title="Delete Exam"
      message="This permanently deletes the exam, its students and any published seating. This cannot be undone."
      confirmLabel="Delete"
      (confirm)="deleteExam()"
      (cancel)="showDeleteDialog.set(false)"
    />

    <div class="admin-layout">
      <app-admin-sidebar />
      <main class="admin-main">
        @if (loading()) {
          <app-loader message="Loading exam..." />
        } @else if (!exam()) {
          <div class="page-content">
            <p class="text-danger">Exam not found.</p>
            <a routerLink="/admin/exams" class="btn btn-outline mt-16">← Back to Exams</a>
          </div>
        } @else {
          <div class="page-content fade-in">
            <div class="section-header">
              <div>
                <a routerLink="/admin/exams" class="back-link">← All Exams</a>
                <h1>{{ exam()!.name }}</h1>
                <div class="exam-meta-row">
                  <span class="badge badge-gray">{{ exam()!.subjectCode }}</span>
                  <span [class]="'badge ' + statusBadge(exam()!.status)">{{ exam()!.status }}</span>
                  <span class="text-muted">{{ exam()!.date | date:'dd MMM yyyy' }}</span>
                  <span class="text-muted">{{ exam()!.startTime }} – {{ exam()!.endTime }}</span>
                </div>
              </div>
              <div class="header-actions">
                @if (exam()!.status === 'draft') {
                  <a [routerLink]="['/admin/exams', examId, 'edit']" class="btn btn-outline"><app-icon name="pencil" [size]="16" /> Edit</a>
                  <button class="btn btn-primary" (click)="generateSeating()" [disabled]="actionLoading()">
                    @if (actionLoading()) { Working... } @else { <app-icon name="bolt" [size]="17" /> Generate Seating }
                  </button>
                  <button class="btn btn-success" (click)="showPublishDialog.set(true)" [disabled]="actionLoading() || students().length === 0">
                    <app-icon name="send" [size]="17" /> Publish
                  </button>
                }
                @if (exam()!.status === 'published') {
                  <a [routerLink]="['/exam', examId]" class="btn btn-outline" target="_blank"><app-icon name="eye" [size]="17" /> Public View</a>
                  <button class="btn btn-warning" (click)="showArchiveDialog.set(true)">Archive</button>
                }
                <button class="btn btn-ghost btn-icon" title="Delete exam" aria-label="Delete exam" (click)="showDeleteDialog.set(true)" [disabled]="actionLoading()">
                  <app-icon name="trash" [size]="17" />
                </button>
              </div>
            </div>

            <!-- Status banners -->
            @if (exam()!.status === 'draft' && students().length === 0) {
              <div class="info-banner banner-blue">
                <app-icon name="inbox" [size]="18" /> Upload students first, then generate seating, then publish.
              </div>
            } @else if (exam()!.status === 'draft' && !seatingGenerated()) {
              <div class="info-banner banner-amber">
                <app-icon name="bolt" [size]="18" /> Students loaded but seating not yet generated. Click "Generate Seating" before publishing.
              </div>
            } @else if (exam()!.status === 'draft' && seatingGenerated()) {
              <div class="info-banner banner-green">
                <app-icon name="check-circle" [size]="18" /> Seating generated for {{ students().length }} students. Ready to publish.
              </div>
            }

            <!-- Upload students -->
            @if (exam()!.status === 'draft') {
              <div class="glass-card upload-section mb-16">
                <div class="upload-header">
                  <div>
                    <h3>Students</h3>
                    @if (students().length > 0) {
                      <span class="text-muted" style="font-size:0.8rem">{{ students().length }} loaded · {{ seatedCount() }} seated</span>
                    }
                  </div>
                  <label class="btn btn-outline btn-sm" style="cursor:pointer">
                    <app-icon name="upload" [size]="16" /> Upload CSV/Excel
                    <input type="file" accept=".csv,.xlsx,.xls" (change)="onFileChange($event)" class="hidden-input" />
                  </label>
                </div>
              </div>
            }

            <!-- Student Table -->
            @if (students().length > 0) {
              <div class="glass-card mb-16">
                <div class="table-header-row">
                  <h3>Students ({{ students().length }})</h3>
                  @if (seatingGenerated()) {
                    <a [routerLink]="['/admin/exams', examId, 'seating']" class="btn btn-outline btn-sm"><app-icon name="seat" [size]="16" /> View Seating Map</a>
                  }
                </div>
                <div class="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Hall Ticket</th>
                        <th>Name</th>
                        <th>Dept</th>
                        @if (seatingGenerated()) {
                          <th>Room</th>
                          <th>Bench</th>
                          <th>Seat</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (s of students().slice(0, 50); track s.hallTicketNo) {
                        <tr>
                          <td><code>{{ s.hallTicketNo }}</code></td>
                          <td>{{ s.name }}</td>
                          <td>{{ s.department || '—' }}</td>
                          @if (seatingGenerated()) {
                            <td>{{ getRoomName(s.assignedRoom) }}</td>
                            <td>{{ s.assignedBench || '—' }}</td>
                            <td>{{ s.assignedSeat || '—' }}</td>
                          }
                        </tr>
                      }
                      @if (students().length > 50) {
                        <tr><td [attr.colspan]="seatingGenerated() ? 6 : 3" class="text-center text-muted" style="padding:12px">… and {{ students().length - 50 }} more</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            } @else {
              <div class="glass-card empty-state mb-16">
                <div class="empty-state-icon"><app-icon name="users" [size]="30" /></div>
                <h3>No students uploaded</h3>
                <p>Upload a CSV or Excel file with student hall ticket numbers to get started.</p>
              </div>
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
    h1 { font-size: 1.6rem; margin-bottom: 8px; }
    .exam-meta-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

    .info-banner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-size: 0.875rem; margin-bottom: 16px; }
    .info-banner app-icon { flex-shrink: 0; }
    .banner-blue { background: oklch(0.42 0.13 274 / 0.08); border: 1px solid oklch(0.42 0.13 274 / 0.25); color: var(--text-secondary); }
    .banner-amber { background: oklch(0.62 0.13 75 / 0.10); border: 1px solid oklch(0.62 0.13 75 / 0.30); color: var(--accent-amber); }
    .banner-green { background: oklch(0.50 0.13 150 / 0.10); border: 1px solid oklch(0.50 0.13 150 / 0.25); color: var(--accent-green); }

    .upload-section { padding: 16px 20px; }
    .upload-header { display: flex; justify-content: space-between; align-items: center; }
    .hidden-input { display: none; }
    .table-header-row { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; }
    .table-header-row h3 { font-size: 0.95rem; flex: 1; }
    code { font-family: monospace; font-size: 0.85rem; color: var(--accent-blue); }
  `]
})
export class ExamDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private examService = inject(ExamService);
  private roomService = inject(RoomService);
  private seatingService = inject(SeatingService);
  private toastService = inject(ToastService);
  private fileUploadService = inject(FileUploadService);
  private router = inject(Router);

  examId = '';
  loading = signal(true);
  actionLoading = signal(false);
  exam = signal<Exam | null>(null);
  students = signal<Student[]>([]);
  rooms = signal<Room[]>([]);
  showPublishDialog = signal(false);
  showArchiveDialog = signal(false);
  showDeleteDialog = signal(false);

  seatingGenerated = () => this.students().some(s => s.isSeated);
  seatedCount = () => this.students().filter(s => s.isSeated).length;
  getRoomName = (roomId?: string) => this.rooms().find(r => r.id === roomId)?.name ?? roomId ?? '—';

  async ngOnInit() {
    this.examId = this.route.snapshot.paramMap.get('id')!;
    try {
      const [exam, students, rooms] = await Promise.all([
        this.examService.getExam(this.examId),
        this.examService.getStudents(this.examId),
        firstValueFrom(this.roomService.getRooms())
      ]);
      this.exam.set(exam);
      this.students.set(students);
      this.rooms.set(rooms ?? []);
    } finally { this.loading.set(false); }
  }

  async generateSeating() {
    const exam = this.exam();
    if (!exam) return;
    if (this.students().length === 0) { this.toastService.error('No students uploaded yet.'); return; }

    const selectedRooms = exam.selectedRooms.length
      ? this.rooms().filter(r => exam.selectedRooms.includes(r.id))
      : this.rooms();

    if (selectedRooms.length === 0) { this.toastService.error('No rooms available. Add rooms first.'); return; }

    this.actionLoading.set(true);
    try {
      // Block double-booking: a room already allotted to another exam at an
      // overlapping date + time cannot be allotted again.
      const conflicts = await this.examService.getRoomConflicts(
        this.examId, selectedRooms.map(r => r.id), exam.date, exam.startTime, exam.endTime
      );
      if (conflicts.length) {
        const names = conflicts.map(c => c.roomName).join(', ');
        this.toastService.error(
          `Can't allot — already occupied: ${names} (clashes with "${conflicts[0].examName}" at ${conflicts[0].time}).`
        );
        return;
      }

      const assigned = this.seatingService.assignSeats(this.students(), selectedRooms, { mode: exam.shuffleMode, spacing: exam.spacing });
      await this.examService.saveAssignedStudents(this.examId, assigned);
      this.students.set(assigned);
      this.toastService.success(`Seating generated for ${assigned.filter(s => s.isSeated).length} students!`);
    } catch (e: any) {
      this.toastService.error(e.message ?? 'Failed to generate seating.');
      console.error('Generate seating error:', e);
    } finally { this.actionLoading.set(false); }
  }

  async publishExam() {
    this.showPublishDialog.set(false);
    this.actionLoading.set(true);
    try {
      await this.examService.publishExam(this.examId);
      this.exam.update(e => e ? { ...e, status: 'published' } : e);
      this.toastService.success('Exam published! Students can now find their seats.');
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to publish exam.';
      this.toastService.error(msg);
      console.error('Publish error:', e);
    } finally { this.actionLoading.set(false); }
  }

  async archiveExam() {
    this.showArchiveDialog.set(false);
    this.actionLoading.set(true);
    try {
      await this.examService.archiveExam(this.examId);
      this.exam.update(e => e ? { ...e, status: 'archived' } : e);
      this.toastService.success('Exam archived.');
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Failed to archive exam.');
    } finally { this.actionLoading.set(false); }
  }

  async deleteExam() {
    this.showDeleteDialog.set(false);
    this.actionLoading.set(true);
    try {
      await this.examService.deleteExam(this.examId);
      this.toastService.success('Exam deleted.');
      this.router.navigate(['/admin/exams']);
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Failed to delete exam.');
      this.actionLoading.set(false);
    }
  }

  async onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const students = await this.fileUploadService.parseFile(file);
      await this.examService.saveStudents(this.examId, students);
      this.students.set(students);
      this.toastService.success(`${students.length} students uploaded.`);
    } catch (e: any) { this.toastService.error(e.message); }
  }

  statusBadge(s: string): string {
    return s === 'published' ? 'badge-green' : s === 'archived' ? 'badge-gray' : 'badge-amber';
  }
}
