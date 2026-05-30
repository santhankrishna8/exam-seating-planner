import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ExamService } from '../../../services/exam.service';
import { Exam } from '../../../models/exam.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-exam-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminSidebarComponent, ToastComponent, IconComponent],
  template: `
    <app-toast />
    <div class="admin-layout">
      <app-admin-sidebar />
      <main class="admin-main">
        <div class="page-content fade-in">
          <div class="section-header">
            <h1>Exams</h1>
            <div class="header-actions">
              <select class="form-control" style="width:auto" [(ngModel)]="filterStatus">
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <a routerLink="/admin/exams/new" class="btn btn-primary"><app-icon name="plus" [size]="16" /> New Exam</a>
            </div>
          </div>

          @if (filteredExams().length === 0) {
            <div class="glass-card empty-state">
              <div class="empty-state-icon"><app-icon name="document" [size]="30" /></div>
              <h3>No exams found</h3>
              <p>Create your first exam to get started.</p>
              <a routerLink="/admin/exams/new" class="btn btn-primary mt-16">Create Exam</a>
            </div>
          } @else {
            <div class="exams-grid">
              @for (exam of filteredExams(); track exam.id) {
                <div class="exam-card glass-card">
                  <div class="exam-card-header">
                    <div class="exam-code badge badge-gray">{{ exam.subjectCode }}</div>
                    <span [class]="'badge ' + statusBadge(exam.status)">{{ exam.status }}</span>
                  </div>
                  <h3 class="exam-name">{{ exam.name }}</h3>
                  <div class="exam-meta">
                    <span><app-icon name="calendar" [size]="15" /> {{ exam.date | date:'dd MMM yyyy' }}</span>
                    <span><app-icon name="clock" [size]="15" /> {{ exam.startTime }} – {{ exam.endTime }}</span>
                  </div>
                  <div class="exam-footer">
                    <span class="text-muted" style="font-size:0.8rem">{{ exam.shuffleMode }} seating</span>
                    <a [routerLink]="['/admin/exams', exam.id]" class="btn btn-outline btn-sm">Manage <app-icon name="arrow-right" [size]="15" /></a>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .admin-layout { display: flex; min-height: 100vh; }
    .admin-main { flex: 1; overflow-y: auto; }
    .header-actions { display: flex; gap: 10px; align-items: center; }
    .exams-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .exam-card { padding: 20px; display: flex; flex-direction: column; gap: 10px; }
    .exam-card-header { display: flex; justify-content: space-between; align-items: center; }
    .exam-name { font-size: 1rem; }
    .exam-meta { display: flex; flex-direction: column; gap: 6px; font-size: 0.8rem; color: var(--text-secondary); }
    .exam-meta span { display: inline-flex; align-items: center; gap: 7px; }
    .exam-meta app-icon { color: var(--text-muted); }
    .exam-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
  `]
})
export class ExamListComponent implements OnInit {
  private examService = inject(ExamService);

  exams = signal<Exam[]>([]);
  filterStatus = '';

  filteredExams = () => {
    const all = [...this.exams()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (!this.filterStatus) return all;
    return all.filter(e => e.status === this.filterStatus);
  };

  async ngOnInit() {
    const exams = await firstValueFrom(this.examService.getExams());
    this.exams.set(exams ?? []);
  }

  statusBadge(s: string): string {
    return s === 'published' ? 'badge-green' : s === 'archived' ? 'badge-gray' : 'badge-amber';
  }
}
