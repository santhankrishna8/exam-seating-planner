import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../navbar/navbar.component';
import { LoaderComponent } from '../../../shared/loader/loader.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ExamService, PublicExamMeta } from '../../../services/exam.service';
import { PublicSeat } from '../../../models/student.model';

@Component({
  selector: 'app-exam-public-view',
  standalone: true,
  imports: [CommonModule, NavbarComponent, LoaderComponent, FormsModule, RouterLink, IconComponent],
  template: `
    <app-navbar />

    <main class="public-view">
      @if (loading()) {
        <app-loader message="Loading seating arrangement..." />
      } @else {
        <div class="pv-inner fade-in">
          <div class="pv-header card">
            <a routerLink="/" class="back-link">← Back to lookup</a>
            <div class="pv-title-row">
              <div>
                @if (meta()?.collegeName) { <div class="pv-college">{{ meta()!.collegeName }}</div> }
                <h2 class="pv-title">{{ meta()?.examName || 'Seating arrangement' }}</h2>
                <div class="pv-meta">
                  @if (meta()?.subjectCode) { <span class="badge badge-gray">{{ meta()!.subjectCode }}</span> }
                  @if (meta()?.date) { <span><app-icon name="calendar" [size]="14" /> {{ meta()!.date | date:'EEE, dd MMM yyyy' }}</span> }
                  @if (meta()?.startTime) { <span><app-icon name="clock" [size]="14" /> {{ meta()!.startTime }}@if (meta()?.endTime) { – {{ meta()!.endTime }} }</span> }
                  <span><app-icon name="users" [size]="14" /> {{ seats().length }} students</span>
                </div>
              </div>
              <div class="pv-search">
                <input class="form-control" type="text" placeholder="Search hall ticket or name..."
                  [(ngModel)]="filterQuery" />
              </div>
            </div>
          </div>

          @for (room of roomGroups(); track room.key) {
            <div class="room-section card">
              <div class="room-header">
                <h3>{{ room.roomName }}</h3>
                @if (room.floor) { <span class="badge badge-gray">{{ room.floor }}</span> }
                <span class="badge badge-blue">{{ room.seats.length }} candidates</span>
              </div>
              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Hall Ticket</th>
                      <th>Name</th>
                      <th>Bench</th>
                      <th>Seat</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (s of room.seats; track s.hallTicketNo) {
                      <tr [class.highlighted]="isHighlighted(s)">
                        <td><code>{{ s.hallTicketNo }}</code></td>
                        <td>{{ s.name }}</td>
                        <td>{{ s.benchNumber }}</td>
                        <td>{{ s.seatNumber }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          @if (roomGroups().length === 0) {
            <div class="card empty-state">
              <div class="empty-state-icon"><app-icon name="clipboard" [size]="30" /></div>
              <h3>No results</h3>
              <p>No seats match your search query.</p>
            </div>
          }
        </div>
      }
    </main>
  `,
  styles: [`
    .public-view { position: relative; z-index: 1; padding: 30px 24px 64px; max-width: 1000px; margin: 0 auto; }
    .pv-inner { display: flex; flex-direction: column; gap: 20px; }
    .pv-header { padding: 20px 24px; }
    .back-link { color: var(--text-muted); font-size: 0.875rem; text-decoration: none; display: inline-block; margin-bottom: 12px; }
    .back-link:hover { color: var(--text-primary); }
    .pv-title-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .pv-college { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; }
    .pv-title { font-size: 1.3rem; }
    .pv-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin-top: 8px; font-size: 0.82rem; color: var(--text-secondary); }
    .pv-meta span { display: inline-flex; align-items: center; gap: 6px; }
    .pv-meta app-icon { color: var(--text-muted); }
    .pv-search { min-width: 240px; }
    .room-section { padding: 20px 0; }
    .room-header { display: flex; align-items: center; gap: 12px; padding: 0 20px 16px; border-bottom: 1px solid var(--border-color); margin-bottom: 4px; }
    .room-header h3 { font-size: 1rem; }
    tr.highlighted td { background: color-mix(in oklch, var(--accent-blue) 10%, transparent) !important; }
    code { font-family: var(--font-mono); font-size: 0.875rem; color: var(--accent-blue); }
  `]
})
export class ExamPublicViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private examService = inject(ExamService);

  loading = signal(true);
  seats = signal<PublicSeat[]>([]);
  meta = signal<PublicExamMeta | null>(null);
  filterQuery = '';

  async ngOnInit() {
    const examId = this.route.snapshot.paramMap.get('examId')!;
    try {
      const [data, meta] = await Promise.all([
        this.examService.getPublicExamSeats(examId),
        this.examService.getPublicExamMeta(examId)
      ]);
      this.seats.set(data);
      this.meta.set(meta);
    } finally {
      this.loading.set(false);
    }
  }

  get filteredSeats(): PublicSeat[] {
    const q = this.filterQuery.toLowerCase().trim();
    if (!q) return this.seats();
    return this.seats().filter(s =>
      s.hallTicketNo.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }

  /** Grouped by hall id where available — two halls may share a name. */
  roomGroups(): { key: string; roomName: string; floor: string; seats: PublicSeat[] }[] {
    const map = new Map<string, PublicSeat[]>();
    for (const s of this.filteredSeats) {
      const key = s.roomId || s.roomName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries())
      .map(([key, seats]) => ({
        key,
        roomName: seats[0].roomName || 'Unnamed hall',
        floor: seats[0].floor ?? '',
        seats: seats.sort((a, b) => a.benchNumber - b.benchNumber || a.seatNumber - b.seatNumber)
      }))
      .sort((a, b) => a.roomName.localeCompare(b.roomName, undefined, { numeric: true }));
  }

  isHighlighted(s: PublicSeat): boolean {
    const q = this.filterQuery.toLowerCase().trim();
    if (!q) return false;
    return s.hallTicketNo.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
  }
}
