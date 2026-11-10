import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ExamService } from '../../../services/exam.service';
import { ToastService } from '../../../services/toast.service';

/**
 * Just the basics: what, when. Halls, seating rules, students and invigilators
 * are all set up on the exam page, next to the buttons that use them.
 */
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
          <header class="page-head">
            <div>
              <span class="eyebrow">Examination</span>
              <h1 class="page-title">{{ editing() ? 'Edit details' : 'New examination' }}</h1>
              <p class="page-sub">{{ editing() ? 'Change the name or schedule.' : 'Name and schedule. You\\'ll add students and halls on the next page.' }}</p>
            </div>
            <a [routerLink]="editing() ? ['/admin/exams', examId] : ['/admin/exams']" class="btn btn-outline btn-sm"><app-icon name="arrow-left" [size]="14" /> Back</a>
          </header>

          <form class="card form-section" (ngSubmit)="save()">
            <div class="form-group">
              <label class="form-label" for="ex-name">Exam name *</label>
              <input id="ex-name" class="form-control" name="name" [(ngModel)]="form.name" placeholder="Data Structures – Mid 1" autofocus />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="ex-date">Date *</label>
                <input id="ex-date" class="form-control" type="date" name="date" [(ngModel)]="form.date" />
              </div>
              <div class="form-group">
                <label class="form-label" for="ex-start">Start *</label>
                <input id="ex-start" class="form-control" type="time" name="start" [(ngModel)]="form.startTime" />
              </div>
              <div class="form-group">
                <label class="form-label" for="ex-end">End *</label>
                <input id="ex-end" class="form-control" type="time" name="end" [(ngModel)]="form.endTime" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="ex-code">Subject code</label>
                <input id="ex-code" class="form-control" name="code" [(ngModel)]="form.subjectCode" placeholder="CS301 (optional)" />
              </div>
              <div class="form-group">
                <label class="form-label" for="ex-dept">Department</label>
                <input id="ex-dept" class="form-control" name="dept" [(ngModel)]="form.department" placeholder="Optional" />
                <span class="form-hint">Staff of this department are not picked as invigilators.</span>
              </div>
            </div>
            <div class="create-actions">
              <button type="submit" class="btn btn-primary" [disabled]="saving()">
                {{ saving() ? 'Saving…' : (editing() ? 'Save changes' : 'Continue') }}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }
    .form-section { padding: 24px; max-width: 760px; }
    .create-actions { display: flex; justify-content: flex-end; margin-top: 8px; }
  `]
})
export class ExamCreateComponent implements OnInit {
  private examService = inject(ExamService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  saving = signal(false);
  editing = signal(false);
  examId = '';
  form = { name: '', subjectCode: '', department: '', date: '', startTime: '09:00', endTime: '12:00' };

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.editing.set(true);
    this.examId = id;
    const exam = await this.examService.getExam(id);
    if (!exam) { this.toastService.error('Exam not found.'); this.router.navigate(['/admin/exams']); return; }
    this.form = {
      name: exam.name, subjectCode: exam.subjectCode ?? '', department: exam.department ?? '',
      date: this.toDateInput(exam.date), startTime: exam.startTime || '09:00', endTime: exam.endTime || '12:00'
    };
  }

  private toDateInput(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  async save() {
    const f = this.form;
    if (!f.name.trim() || !f.date) { this.toastService.error('Enter the exam name and date.'); return; }
    if (!f.startTime || !f.endTime) { this.toastService.error('Set the start and end time.'); return; }
    if (f.endTime <= f.startTime) { this.toastService.error('End time must be after start time.'); return; }

    // "YYYY-MM-DD" → local midnight (new Date(string) would be UTC and can show the previous day).
    const [y, m, d] = f.date.split('-').map(Number);
    const details = {
      name: f.name.trim(), subjectCode: f.subjectCode.trim(), department: f.department.trim(),
      date: new Date(y, m - 1, d), startTime: f.startTime, endTime: f.endTime
    };

    this.saving.set(true);
    try {
      if (this.editing()) {
        await this.examService.updateExam(this.examId, details);
        const exam = await this.examService.getExam(this.examId);
        // A published exam's public copy and invigilator links carry the schedule.
        if (exam?.status === 'published') await this.examService.publishExam(this.examId);
        this.toastService.success('Details saved.');
        this.router.navigate(['/admin/exams', this.examId]);
      } else {
        const id = await this.examService.createExam({
          ...details, status: 'draft', shuffleMode: 'sequential', spacing: false,
          selectedRooms: [], teachersPerRoom: 1, invigilators: {}
        });
        this.router.navigate(['/admin/exams', id]);
      }
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Could not save.');
    } finally { this.saving.set(false); }
  }
}
