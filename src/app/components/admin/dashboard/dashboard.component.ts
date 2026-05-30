import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { LoaderComponent } from '../../../shared/loader/loader.component';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { RoomService } from '../../../services/room.service';
import { ExamService } from '../../../services/exam.service';
import { CollegeService } from '../../../services/college.service';
import { Room } from '../../../models/room.model';
import { Exam } from '../../../models/exam.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminSidebarComponent, LoaderComponent, ToastComponent, IconComponent],
  template: `
    <app-toast />
    <div class="admin-layout">
      <app-admin-sidebar />
      <main class="admin-main">
        @if (loading()) {
          <app-loader message="Loading dashboard..." />
        } @else {
          <div class="page-content fade-in">
            <div class="page-header mb-24">
              <h1>Dashboard</h1>
              @if (collegeName()) { <p class="text-muted">{{ collegeName() }}</p> }
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon"><app-icon name="building" [size]="20" /></div>
                <div class="stat-label">Total Rooms</div>
                <div class="stat-value">{{ rooms().length }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon"><app-icon name="seat" [size]="20" /></div>
                <div class="stat-label">Total Capacity</div>
                <div class="stat-value">{{ totalCapacity() }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon"><app-icon name="document" [size]="20" /></div>
                <div class="stat-label">Total Exams</div>
                <div class="stat-value">{{ exams().length }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon"><app-icon name="check-circle" [size]="20" /></div>
                <div class="stat-label">Published Exams</div>
                <div class="stat-value">{{ publishedCount() }}</div>
              </div>
            </div>

            <div class="section-header">
              <h2 class="section-title">Recent Exams</h2>
              <a routerLink="/admin/exams/new" class="btn btn-primary btn-sm"><app-icon name="plus" [size]="16" /> New Exam</a>
            </div>

            @if (recentExams().length === 0) {
              <div class="glass-card empty-state">
                <div class="empty-state-icon"><app-icon name="document" [size]="30" /></div>
                <h3>No exams yet</h3>
                <p>Create your first exam to get started.</p>
                <a routerLink="/admin/exams/new" class="btn btn-primary mt-16">Create Exam</a>
              </div>
            } @else {
              <div class="table-wrapper glass-card">
                <table>
                  <thead>
                    <tr>
                      <th>Exam Name</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (exam of recentExams(); track exam.id) {
                      <tr>
                        <td>{{ exam.name }}</td>
                        <td>{{ exam.date | date:'dd MMM yyyy' }}</td>
                        <td><span [class]="'badge ' + statusBadge(exam.status)">{{ exam.status }}</span></td>
                        <td><a [routerLink]="['/admin/exams', exam.id]" class="btn btn-ghost btn-sm">View <app-icon name="arrow-right" [size]="15" /></a></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <div class="quick-actions mt-24">
              <h2 class="section-title mb-16">Quick Actions</h2>
              <div class="action-grid">
                <a routerLink="/admin/rooms" class="action-card glass-card">
                  <span class="action-icon"><app-icon name="building" [size]="22" /></span>
                  <div>
                    <div class="action-title">Manage Rooms</div>
                    <div class="action-sub text-muted">Add or edit exam halls</div>
                  </div>
                  <app-icon name="arrow-right" [size]="18" class="action-go" />
                </a>
                <a routerLink="/admin/exams/new" class="action-card glass-card">
                  <span class="action-icon"><app-icon name="plus" [size]="22" /></span>
                  <div>
                    <div class="action-title">Create Exam</div>
                    <div class="action-sub text-muted">Set up seating for a new exam</div>
                  </div>
                  <app-icon name="arrow-right" [size]="18" class="action-go" />
                </a>
                <a routerLink="/admin/exams" class="action-card glass-card">
                  <span class="action-icon"><app-icon name="clipboard" [size]="22" /></span>
                  <div>
                    <div class="action-title">All Exams</div>
                    <div class="action-sub text-muted">View and manage all exams</div>
                  </div>
                  <app-icon name="arrow-right" [size]="18" class="action-go" />
                </a>
              </div>
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .admin-layout { display: flex; min-height: 100vh; }
    .admin-main { flex: 1; overflow-y: auto; min-width: 0; }
    .page-header h1 { font-size: 2.1rem; }
    .page-header p { margin-top: 4px; }
    .action-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 18px; }
    .action-card { display: flex; align-items: center; gap: 16px; padding: 22px; text-decoration: none; color: var(--text-primary); transition: transform var(--transition), box-shadow var(--transition), border-color var(--transition); }
    .action-card > div { flex: 1; }
    .action-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--border-strong); }
    .action-go { color: var(--text-muted); opacity: 0; transform: translateX(-6px); transition: opacity var(--transition), transform var(--transition), color var(--transition); }
    .action-card:hover .action-go { opacity: 1; transform: translateX(0); color: var(--accent-blue); }
    .action-icon {
      flex-shrink: 0; color: var(--accent-blue);
      width: 54px; height: 54px; display: inline-flex; align-items: center; justify-content: center;
      border-radius: var(--radius-sm); background: oklch(0.42 0.13 274 / 0.12); border: 1px solid oklch(0.42 0.13 274 / 0.24);
    }
    .action-title { font-family: var(--font-head); font-weight: 600; font-size: 1.05rem; margin-bottom: 4px; }
    .action-sub { font-size: 0.82rem; }
  `]
})
export class DashboardComponent implements OnInit {
  private roomService = inject(RoomService);
  private examService = inject(ExamService);
  private collegeService = inject(CollegeService);

  loading = signal(true);
  rooms = signal<Room[]>([]);
  exams = signal<Exam[]>([]);
  collegeName = signal('');

  totalCapacity = () => this.rooms().reduce((s, r) => s + r.totalCapacity, 0);
  publishedCount = () => this.exams().filter(e => e.status === 'published').length;
  recentExams = () => [...this.exams()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);

  async ngOnInit() {
    try {
      const [college, rooms, exams] = await Promise.all([
        this.collegeService.getMyCollege(),
        firstValueFrom(this.roomService.getRooms()),
        firstValueFrom(this.examService.getExams())
      ]);
      this.collegeName.set(college?.name ?? '');
      this.rooms.set(rooms ?? []);
      this.exams.set(exams ?? []);
    } finally {
      this.loading.set(false);
    }
  }

  statusBadge(s: string): string {
    return s === 'published' ? 'badge-green' : s === 'archived' ? 'badge-gray' : 'badge-amber';
  }
}
