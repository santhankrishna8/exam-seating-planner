import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { LoaderComponent } from '../../../shared/loader/loader.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ExamService } from '../../../services/exam.service';
import { RoomService } from '../../../services/room.service';
import { Exam, ExamStatus } from '../../../models/exam.model';
import { firstValueFrom } from 'rxjs';

type Filter = '' | ExamStatus;

@Component({
  selector: 'app-exam-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminSidebarComponent, ToastComponent, LoaderComponent, IconComponent],
  template: `
    <app-toast />
    <div class="admin-layout">
      <app-admin-sidebar />
      <main class="admin-main">
        <div class="page-content fade-in">
          <header class="page-head">
            <div>
              <span class="eyebrow">Register</span>
              <h1 class="page-title">Examinations</h1>
              <p class="page-sub">{{ exams().length }} on record · {{ count('published') }} published · {{ count('draft') }} in draft</p>
            </div>
            <a routerLink="/admin/exams/new" class="btn btn-primary"><app-icon name="plus" [size]="15" /> New examination</a>
          </header>

          @if (loading()) {
            <app-loader message="Reading the register…" />
          } @else if (exams().length === 0) {
            <div class="card empty-state">
              <div class="empty-state-icon"><app-icon name="document" [size]="26" /></div>
              <h2>The register is empty</h2>
              <p>Create an examination to seat students and publish the plan.</p>
              <a routerLink="/admin/exams/new" class="btn btn-primary mt-16">Create examination</a>
            </div>
          } @else {
            <div class="toolbar">
              <div class="filters" role="group" aria-label="Filter by status">
                @for (f of filters; track f.value) {
                  <button type="button" class="chip" [class.on]="filterStatus === f.value"
                    [attr.aria-pressed]="filterStatus === f.value" (click)="filterStatus = f.value">
                    {{ f.label }}
                    <span class="chip-n mono">{{ f.value ? count(f.value) : exams().length }}</span>
                  </button>
                }
              </div>
              <div class="search">
                <app-icon name="search" [size]="15" />
                <input [(ngModel)]="query" placeholder="Search name or subject code" aria-label="Search examinations" />
              </div>
            </div>

            @if (filtered().length === 0) {
              <div class="card empty-state">
                <div class="empty-state-icon"><app-icon name="search" [size]="26" /></div>
                <h2>Nothing matches</h2>
                <p>No examination matches this filter. Clear the search or pick another status.</p>
                <button class="btn btn-outline mt-16" (click)="clearFilters()">Clear filters</button>
              </div>
            } @else {
              <div class="card table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Examination</th>
                      <th>Date</th>
                      <th>Session</th>
                      <th>Halls</th>
                      <th>Allotment</th>
                      <th>Status</th>
                      <th class="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (exam of filtered(); track exam.id) {
                      <tr>
                        <td>
                          <a [routerLink]="['/admin/exams', exam.id]" class="row-name">{{ exam.name }}</a>
                          @if (exam.subjectCode) { <span class="row-code mono">{{ exam.subjectCode }}</span> }
                        </td>
                        <td class="mono nowrap">{{ exam.date | date:'dd MMM yyyy' }}</td>
                        <td class="mono nowrap">{{ exam.startTime }}–{{ exam.endTime }}</td>
                        <td class="mono">{{ exam.selectedRooms.length || roomCount() }}</td>
                        <td class="nowrap">{{ modeLabel(exam) }}</td>
                        <td><span [class]="'badge ' + statusBadge(exam.status)">{{ exam.status }}</span></td>
                        <td class="text-right">
                          <a [routerLink]="['/admin/exams', exam.id]" class="btn btn-ghost btn-sm">
                            Open <app-icon name="arrow-right" [size]="14" />
                          </a>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }

    .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
    .filters { display: flex; gap: 5px; flex-wrap: wrap; }
    .chip {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 6px 11px; border-radius: var(--radius-sm);
      border: 1px solid var(--border-color); background: var(--bg-card);
      color: var(--text-secondary); font-size: 0.82rem;
      transition: border-color var(--transition), color var(--transition), background var(--transition);
    }
    .chip:hover { border-color: var(--border-strong); color: var(--text-primary); }
    .chip.on { background: var(--ink-face); border-color: var(--ink-face); color: var(--ink-text); }
    .chip-n { font-size: 0.7rem; opacity: 0.65; }

    .search {
      display: flex; align-items: center; gap: 8px;
      padding: 0 11px; height: 34px; min-width: 250px;
      border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-card);
      color: var(--text-muted);
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .search:focus-within { border-color: var(--accent-blue); box-shadow: var(--ring-focus); }
    .search input { flex: 1; min-width: 0; border: 0; background: none; outline: none; color: var(--text-primary); font-size: 0.86rem; }

    .row-name { display: block; font-weight: 500; color: var(--text-primary); }
    .row-name:hover { color: var(--accent-blue); }
    .row-code { font-size: 0.7rem; color: var(--text-muted); }
    .nowrap { white-space: nowrap; }
  `]
})
export class ExamListComponent implements OnInit {
  private examService = inject(ExamService);
  private roomService = inject(RoomService);

  exams = signal<Exam[]>([]);
  roomCount = signal(0);
  loading = signal(true);
  filterStatus: Filter = '';
  query = '';

  filters: { value: Filter; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' }
  ];

  count = (status: ExamStatus) => this.exams().filter(e => e.status === status).length;

  modeLabel = (e: Exam) => {
    const mode = { sequential: 'Sequential', random: 'Randomised', department: 'Department spread' }[e.shuffleMode] ?? e.shuffleMode;
    return e.spacing ? `${mode} · gap seat` : mode;
  };

  filtered = () => {
    const q = this.query.trim().toLowerCase();
    return this.exams()
      .filter(e => !this.filterStatus || e.status === this.filterStatus)
      .filter(e => !q || e.name.toLowerCase().includes(q) || (e.subjectCode ?? '').toLowerCase().includes(q))
      .sort((a, b) => +b.date - +a.date);
  };

  clearFilters() { this.filterStatus = ''; this.query = ''; }

  async ngOnInit() {
    try {
      const [exams, rooms] = await Promise.all([
        firstValueFrom(this.examService.getExams()),
        firstValueFrom(this.roomService.getRooms())
      ]);
      this.exams.set(exams ?? []);
      this.roomCount.set((rooms ?? []).length);
    } finally { this.loading.set(false); }
  }

  statusBadge(s: string): string {
    return s === 'published' ? 'badge-green' : 'badge-amber';
  }
}
