import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { LoaderComponent } from '../../../shared/loader/loader.component';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { IconComponent, IconName } from '../../../shared/icon/icon.component';
import { RoomService } from '../../../services/room.service';
import { ExamService } from '../../../services/exam.service';
import { CollegeService } from '../../../services/college.service';
import { TeacherService } from '../../../services/teacher.service';
import { Room } from '../../../models/room.model';
import { Exam } from '../../../models/exam.model';
import { Teacher } from '../../../models/teacher.model';
import { firstValueFrom } from 'rxjs';

interface Check { label: string; detail: string; done: boolean; route: string; cta: string; }

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
          <app-loader message="Opening the register…" />
        } @else {
          <div class="page-content fade-in">

            <header class="page-head">
              <div>
                <span class="eyebrow">{{ collegeName() || 'Examination office' }}</span>
                <h1 class="page-title">Overview</h1>
                <p class="page-sub">{{ today | date:'EEEE, dd MMMM yyyy' }}</p>
              </div>
              <a routerLink="/admin/exams/new" class="btn btn-primary">
                <app-icon name="plus" [size]="15" /> New examination
              </a>
            </header>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon"><app-icon name="building" [size]="17" /></div>
                <div class="stat-label">Halls</div>
                <div class="stat-value">{{ rooms().length }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon"><app-icon name="seat" [size]="17" /></div>
                <div class="stat-label">Seats available</div>
                <div class="stat-value">{{ totalCapacity() }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon"><app-icon name="badge" [size]="17" /></div>
                <div class="stat-label">Invigilators</div>
                <div class="stat-value">{{ activeTeachers() }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon"><app-icon name="document" [size]="17" /></div>
                <div class="stat-label">Drafts</div>
                <div class="stat-value">{{ draftCount() }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon"><app-icon name="check-circle" [size]="17" /></div>
                <div class="stat-label">Published</div>
                <div class="stat-value">{{ publishedCount() }}</div>
              </div>
            </div>

            <div class="dash-grid">
              <!-- Schedule -->
              <section class="card panel">
                <header class="panel-head">
                  <h2 class="panel-title">Schedule</h2>
                  <a routerLink="/admin/exams" class="panel-link">All examinations <app-icon name="arrow-right" [size]="13" /></a>
                </header>

                @if (scheduled().length === 0) {
                  <div class="empty-state">
                    <div class="empty-state-icon"><app-icon name="calendar" [size]="24" /></div>
                    <h2>Nothing scheduled</h2>
                    <p>Create an examination to allot halls and publish seating.</p>
                    <a routerLink="/admin/exams/new" class="btn btn-primary mt-16">Create examination</a>
                  </div>
                } @else {
                  <ol class="schedule">
                    @for (row of scheduled(); track row.exam.id) {
                      <li class="sched-row">
                        <div class="sched-date" [class.past]="row.daysAway < 0">
                          <span class="sd-day">{{ row.exam.date | date:'dd' }}</span>
                          <span class="sd-mon">{{ row.exam.date | date:'MMM' }}</span>
                        </div>
                        <div class="sched-body">
                          <a [routerLink]="['/admin/exams', row.exam.id]" class="sched-name">{{ row.exam.name }}</a>
                          <div class="sched-meta">
                            @if (row.exam.subjectCode) { <span class="mono">{{ row.exam.subjectCode }}</span> }
                            <span>{{ row.exam.startTime }} – {{ row.exam.endTime }}</span>
                            <span>{{ row.roomCount }} {{ row.roomCount === 1 ? 'hall' : 'halls' }}</span>
                          </div>
                        </div>
                        <div class="sched-right">
                          <span [class]="'badge ' + statusBadge(row.exam.status)">{{ row.exam.status }}</span>
                          <span class="sched-when">{{ row.when }}</span>
                        </div>
                      </li>
                    }
                  </ol>
                }
              </section>

              <!-- Readiness -->
              <section class="card panel">
                <header class="panel-head">
                  <h2 class="panel-title">Readiness</h2>
                  <span class="panel-count mono">{{ doneChecks() }} / {{ checks().length }}</span>
                </header>
                <ul class="checks">
                  @for (c of checks(); track c.label) {
                    <li class="check" [class.done]="c.done">
                      <span class="check-mark">
                        <app-icon [name]="c.done ? 'check-circle' : 'alert'" [size]="15" />
                      </span>
                      <span class="check-body">
                        <span class="check-label">{{ c.label }}</span>
                        <span class="check-detail">{{ c.detail }}</span>
                      </span>
                      @if (!c.done) {
                        <a [routerLink]="c.route" class="btn btn-outline btn-sm">{{ c.cta }}</a>
                      }
                    </li>
                  }
                </ul>
              </section>
            </div>

            <section class="shortcuts">
              @for (s of shortcuts; track s.route) {
                <a [routerLink]="s.route" class="card shortcut">
                  <span class="shortcut-icon"><app-icon [name]="s.icon" [size]="18" /></span>
                  <span class="shortcut-body">
                    <span class="shortcut-title">{{ s.title }}</span>
                    <span class="shortcut-sub">{{ s.sub }}</span>
                  </span>
                  <app-icon name="arrow-right" [size]="15" class="shortcut-go" />
                </a>
              }
            </section>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }

    .dash-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 16px; margin-bottom: 16px; }
    @media (max-width: 1020px) { .dash-grid { grid-template-columns: 1fr; } }

    .panel { overflow: hidden; display: flex; flex-direction: column; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 18px; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary); }
    .panel-title { font-size: 1.05rem; }
    .panel-link { display: inline-flex; align-items: center; gap: 5px; font-size: 0.78rem; color: var(--text-secondary); }
    .panel-link:hover { color: var(--accent-blue); }
    .panel-count { font-size: 0.75rem; color: var(--text-muted); }

    /* Schedule */
    .schedule { list-style: none; margin: 0; padding: 0; }
    .sched-row { display: flex; align-items: center; gap: 14px; padding: 13px 18px; border-bottom: 1px solid var(--border-color); }
    .sched-row:last-child { border-bottom: 0; }
    .sched-date {
      flex: 0 0 auto; width: 46px; text-align: center; padding: 5px 0;
      border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-secondary);
    }
    .sched-date.past { opacity: 0.5; }
    .sd-day { display: block; font-family: var(--font-head); font-size: 1.2rem; font-weight: 600; line-height: 1; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
    .sd-mon { display: block; font-family: var(--font-mono); font-size: 0.55rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); margin-top: 2px; }
    .sched-body { flex: 1; min-width: 0; }
    .sched-name { display: block; font-size: 0.95rem; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sched-name:hover { color: var(--accent-blue); }
    .sched-meta { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 3px; font-size: 0.75rem; color: var(--text-muted); }
    .sched-right { flex: 0 0 auto; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
    .sched-when { font-family: var(--font-mono); font-size: 0.66rem; color: var(--text-muted); }

    /* Readiness */
    .checks { list-style: none; margin: 0; padding: 0; }
    .check { display: flex; align-items: center; gap: 11px; padding: 13px 18px; border-bottom: 1px solid var(--border-color); }
    .check:last-child { border-bottom: 0; }
    .check-mark { flex: 0 0 auto; display: inline-flex; color: var(--accent-amber); }
    .check.done .check-mark { color: var(--accent-green); }
    .check-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .check-label { font-size: 0.875rem; font-weight: 500; }
    .check.done .check-label { color: var(--text-secondary); font-weight: 400; }
    .check-detail { font-size: 0.75rem; color: var(--text-muted); }

    /* Shortcuts */
    .shortcuts { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .shortcut { display: flex; align-items: center; gap: 12px; padding: 15px 16px; color: var(--text-primary); transition: border-color var(--transition), box-shadow var(--transition); }
    .shortcut:hover { border-color: var(--border-strong); box-shadow: var(--shadow-md); color: var(--text-primary); }
    .shortcut-icon { flex: 0 0 auto; width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); color: var(--text-secondary); background: var(--bg-secondary); border: 1px solid var(--border-color); }
    .shortcut-body { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .shortcut-title { font-size: 0.9rem; font-weight: 500; }
    .shortcut-sub { font-size: 0.75rem; color: var(--text-muted); }
    .shortcut-go { color: var(--text-muted); opacity: 0; transform: translateX(-4px); transition: opacity var(--transition), transform var(--transition); }
    .shortcut:hover .shortcut-go { opacity: 1; transform: none; }
  `]
})
export class DashboardComponent implements OnInit {
  private roomService = inject(RoomService);
  private examService = inject(ExamService);
  private collegeService = inject(CollegeService);
  private teacherService = inject(TeacherService);

  loading = signal(true);
  rooms = signal<Room[]>([]);
  exams = signal<Exam[]>([]);
  teachers = signal<Teacher[]>([]);
  collegeName = signal('');
  today = new Date();

  shortcuts: { route: string; icon: IconName; title: string; sub: string }[] = [
    { route: '/admin/rooms', icon: 'building', title: 'Halls', sub: 'Column layouts and capacity' },
    { route: '/admin/teachers', icon: 'badge', title: 'Invigilators', sub: 'Staff available for duty' },
    { route: '/admin/exams', icon: 'clipboard', title: 'Examinations', sub: 'Seat students and publish' }
  ];

  totalCapacity = () => this.rooms().reduce((s, r) => s + r.totalCapacity, 0);
  activeTeachers = () => this.teachers().filter(t => t.isActive).length;
  publishedCount = () => this.exams().filter(e => e.status === 'published').length;
  draftCount = () => this.exams().filter(e => e.status === 'draft').length;

  /** Upcoming first; if nothing is upcoming, show the most recent instead. */
  scheduled = () => {
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const live = this.exams();
    const upcoming = live.filter(e => e.date >= midnight).sort((a, b) => +a.date - +b.date);
    const past = live.filter(e => e.date < midnight).sort((a, b) => +b.date - +a.date);
    return [...upcoming, ...past].slice(0, 6).map(exam => {
      const days = Math.round((+new Date(exam.date.getFullYear(), exam.date.getMonth(), exam.date.getDate()) - +midnight) / 86400000);
      return {
        exam,
        daysAway: days,
        roomCount: exam.selectedRooms.length || this.rooms().length,
        when: days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days > 1 ? `in ${days} days` : `${Math.abs(days)}d ago`
      };
    });
  };

  checks = (): Check[] => {
    const rooms = this.rooms();
    const drafts = this.exams().filter(e => e.status === 'draft');
    return [
      {
        label: 'Halls on the register',
        detail: rooms.length
          ? `${rooms.length} halls · ${this.totalCapacity()} seats`
          : 'No halls added yet',
        done: rooms.length > 0,
        route: '/admin/rooms', cta: 'Add hall'
      },
      {
        label: 'Invigilators on roll',
        detail: this.activeTeachers()
          ? `${this.activeTeachers()} available for duty`
          : 'No staff available for duty',
        done: this.activeTeachers() > 0,
        route: '/admin/teachers', cta: 'Add staff'
      },
      {
        label: 'Examinations created',
        detail: this.exams().length ? `${this.exams().length} on record` : 'None created yet',
        done: this.exams().length > 0,
        route: '/admin/exams/new', cta: 'Create'
      },
      {
        label: 'Drafts awaiting publication',
        detail: drafts.length ? `${drafts.length} not yet published` : 'Everything is published',
        done: drafts.length === 0,
        route: '/admin/exams', cta: 'Review'
      }
    ];
  };

  doneChecks = () => this.checks().filter(c => c.done).length;

  async ngOnInit() {
    try {
      const [college, rooms, exams, teachers] = await Promise.all([
        this.collegeService.getMyCollege().catch(() => null),
        firstValueFrom(this.roomService.getRooms()),
        firstValueFrom(this.examService.getExams()),
        firstValueFrom(this.teacherService.getTeachers())
      ]);
      this.collegeName.set(college?.name ?? '');
      this.rooms.set(rooms ?? []);
      this.exams.set(exams ?? []);
      this.teachers.set(teachers ?? []);
    } finally {
      this.loading.set(false);
    }
  }

  statusBadge(s: string): string {
    return s === 'published' ? 'badge-green' : 'badge-amber';
  }
}
