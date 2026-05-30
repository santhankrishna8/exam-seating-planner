import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { RoomService } from '../../../services/room.service';
import { ToastService } from '../../../services/toast.service';
import { Room } from '../../../models/room.model';

const FLOOR_OPTIONS = [
  'Ground Floor', '1st Floor', '2nd Floor', '3rd Floor',
  '4th Floor', '5th Floor', '6th Floor', '7th Floor'
];

function formatFloor(floor: string): string {
  if (!floor) return '—';
  if (floor.toLowerCase().includes('floor') || floor.toLowerCase().includes('ground')) return floor;
  const n = parseInt(floor);
  if (isNaN(n)) return floor;
  if (n === 0) return 'Ground Floor';
  const s = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${s} Floor`;
}

@Component({
  selector: 'app-room-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent, ToastComponent, ConfirmDialogComponent, IconComponent],
  template: `
    <app-toast />
    <app-confirm-dialog
      [visible]="deleteTarget() !== null"
      title="Delete Room"
      message="Are you sure you want to delete this room? This cannot be undone."
      (confirm)="confirmDelete()"
      (cancel)="deleteTarget.set(null)"
    />

    <div class="admin-layout">
      <app-admin-sidebar />
      <main class="admin-main">
        <div class="page-content fade-in">
          <div class="section-header">
            <h1>Room Management</h1>
            <button class="btn btn-primary" (click)="openForm()"><app-icon name="plus" [size]="16" /> Add Room</button>
          </div>

          @if (showForm()) {
            <div class="glass-card room-form mb-24">
              <h3 class="mb-16">{{ editingId() ? 'Edit Room' : 'Add New Room' }}</h3>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Room Name *</label>
                  <input class="form-control" [(ngModel)]="form.name" placeholder="Room 101" />
                </div>
                <div class="form-group">
                  <label class="form-label">Floor</label>
                  <select class="form-control" [(ngModel)]="form.floor">
                    <option value="">Select floor...</option>
                    @for (f of floorOptions; track f) {
                      <option [value]="f">{{ f }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-row three-col">
                <div class="form-group">
                  <label class="form-label">Number of Rows *</label>
                  <input class="form-control" type="number" [(ngModel)]="form.rowsCount" min="1" max="20" />
                  <span class="form-hint">Rows in the room</span>
                </div>
                <div class="form-group">
                  <label class="form-label">Benches per Row *</label>
                  <input class="form-control" type="number" [(ngModel)]="form.benchesPerRow" min="1" max="20" />
                  <span class="form-hint">Columns of benches</span>
                </div>
                <div class="form-group">
                  <label class="form-label">Seats per Bench *</label>
                  <input class="form-control" type="number" [(ngModel)]="form.seatsPerBench" min="1" max="4" />
                  <span class="form-hint">Students per bench</span>
                </div>
              </div>

              <div class="capacity-preview">
                <span>Layout: <strong>{{ form.rowsCount }} rows × {{ form.benchesPerRow }} benches × {{ form.seatsPerBench }} seats</strong></span>
                <span class="cap-total">Total Capacity: <strong>{{ form.rowsCount * form.benchesPerRow * form.seatsPerBench }}</strong> students</span>
              </div>

              <div class="form-actions mt-16">
                <button class="btn btn-outline" (click)="cancelForm()">Cancel</button>
                <button class="btn btn-primary" (click)="saveRoom()" [disabled]="saving()">
                  {{ saving() ? 'Saving...' : editingId() ? 'Update Room' : 'Add Room' }}
                </button>
              </div>
            </div>
          }

          @if (rooms().length === 0) {
            <div class="glass-card empty-state">
              <div class="empty-state-icon"><app-icon name="building" [size]="30" /></div>
              <h3>No rooms yet</h3>
              <p>Add your first exam hall to get started.</p>
            </div>
          } @else {
            <div class="rooms-grid">
              @for (room of rooms(); track room.id) {
                <div class="room-card glass-card">
                  <div class="room-card-header">
                    <div>
                      <h3 class="room-name">{{ room.name }}</h3>
                      @if (room.floor) {
                        <p class="room-floor text-muted"><app-icon name="pin" [size]="14" /> {{ formatFloor(room.floor) }}</p>
                      }
                    </div>
                    <div class="room-actions">
                      <button class="btn btn-ghost btn-icon" title="Edit room" aria-label="Edit room" (click)="editRoom(room)"><app-icon name="pencil" [size]="17" /></button>
                      <button class="btn btn-ghost btn-icon" title="Delete room" aria-label="Delete room" (click)="deleteTarget.set(room.id)"><app-icon name="trash" [size]="17" /></button>
                    </div>
                  </div>

                  <div class="room-stats">
                    <div class="room-stat">
                      <span class="rs-label">Rows</span>
                      <span class="rs-val">{{ room.rowsCount }}</span>
                    </div>
                    <div class="room-stat">
                      <span class="rs-label">Per Row</span>
                      <span class="rs-val">{{ room.benchesPerRow }}</span>
                    </div>
                    <div class="room-stat">
                      <span class="rs-label">Per Bench</span>
                      <span class="rs-val">{{ room.seatsPerBench }}</span>
                    </div>
                    <div class="room-stat highlight">
                      <span class="rs-label">Capacity</span>
                      <span class="rs-val">{{ room.totalCapacity }}</span>
                    </div>
                  </div>

                  <!-- Vertical bench grid preview -->
                  <div class="bench-grid-preview">
                    @for (row of getPreviewRows(room); track $index; let ri = $index) {
                      <div class="preview-row">
                        @for (bench of row; track bench) {
                          <div class="bench-chip" [class.more]="bench < 0">
                            {{ bench > 0 ? 'B' + bench : '+' + (-bench) }}
                          </div>
                        }
                      </div>
                    }
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

    .room-form { padding: 24px; }
    .three-col { grid-template-columns: 1fr 1fr 1fr !important; }
    @media (max-width: 700px) { .three-col { grid-template-columns: 1fr !important; } }

    .capacity-preview {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;
      font-size: 0.875rem; color: var(--text-secondary);
      padding: 10px 14px; background: oklch(0.42 0.13 274 / 0.07);
      border-radius: 8px; border: 1px solid oklch(0.42 0.13 274 / 0.2);
    }
    .cap-total { font-weight: 600; color: var(--accent-green); }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; }

    .rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .room-card { padding: 20px; }
    .room-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .room-name { font-size: 1.05rem; font-weight: 600; }
    .room-floor { font-size: 0.82rem; margin-top: 4px; display: inline-flex; align-items: center; gap: 6px; }
    .room-actions { display: flex; gap: 4px; }

    .room-stats { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px; }
    .room-stat { padding: 8px 6px; background: var(--bg-secondary); border-radius: 6px; text-align: center; border: 1px solid var(--border-color); }
    .room-stat.highlight { border-color: oklch(0.42 0.13 274 / 0.35); background: oklch(0.42 0.13 274 / 0.08); }
    .rs-label { display: block; font-family: var(--font-mono); font-size: 0.64rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
    .rs-val { font-family: var(--font-mono); font-weight: 600; font-size: 1.05rem; color: var(--text-primary); }

    .bench-grid-preview { display: flex; flex-direction: column; gap: 4px; }
    .preview-row { display: flex; gap: 4px; flex-wrap: wrap; }
    .bench-chip {
      padding: 3px 8px; border-radius: 4px;
      background: var(--bg-secondary); font-family: var(--font-mono); font-size: 0.7rem;
      color: var(--text-muted); border: 1px solid var(--border-color);
    }
    .bench-chip.more { color: var(--accent-blue); background: oklch(0.42 0.13 274 / 0.08); border-color: oklch(0.42 0.13 274 / 0.2); }
  `]
})
export class RoomManagementComponent implements OnInit {
  private roomService = inject(RoomService);
  private toastService = inject(ToastService);

  rooms = signal<Room[]>([]);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  deleteTarget = signal<string | null>(null);
  saving = signal(false);
  floorOptions = FLOOR_OPTIONS;
  formatFloor = formatFloor;

  form = { name: '', floor: 'Ground Floor', rowsCount: 5, benchesPerRow: 6, seatsPerBench: 2, isActive: true };

  ngOnInit() { this.loadRooms(); }

  loadRooms() {
    this.roomService.getRooms().subscribe(r => this.rooms.set(r));
  }

  openForm() { this.resetForm(); this.showForm.set(true); }
  cancelForm() { this.showForm.set(false); this.editingId.set(null); }

  editRoom(room: Room) {
    this.editingId.set(room.id);
    this.form = {
      name: room.name,
      floor: room.floor || 'Ground Floor',
      rowsCount: room.rowsCount,
      benchesPerRow: room.benchesPerRow,
      seatsPerBench: room.seatsPerBench,
      isActive: room.isActive
    };
    this.showForm.set(true);
  }

  async saveRoom() {
    if (!this.form.name || !this.form.rowsCount || !this.form.benchesPerRow || !this.form.seatsPerBench) {
      this.toastService.error('Please fill in all required fields.'); return;
    }
    this.saving.set(true);
    try {
      const benchCount = this.form.rowsCount * this.form.benchesPerRow;
      const payload = { ...this.form, benchCount };
      if (this.editingId()) {
        await this.roomService.updateRoom(this.editingId()!, payload);
        this.toastService.success('Room updated.');
      } else {
        await this.roomService.addRoom(payload);
        this.toastService.success('Room added.');
      }
      this.cancelForm();
      this.loadRooms();
    } catch (e: any) { this.toastService.error(e?.message ?? 'Failed to save room.'); }
    finally { this.saving.set(false); }
  }

  async confirmDelete() {
    const id = this.deleteTarget();
    if (!id) return;
    try {
      await this.roomService.deleteRoom(id);
      this.toastService.success('Room deleted.');
      this.loadRooms();
    } catch { this.toastService.error('Failed to delete room.'); }
    this.deleteTarget.set(null);
  }

  resetForm() {
    this.form = { name: '', floor: 'Ground Floor', rowsCount: 5, benchesPerRow: 6, seatsPerBench: 2, isActive: true };
  }

  // Returns rows of bench numbers for preview. Negative = "+N more" chip.
  getPreviewRows(room: Room): number[][] {
    const maxRows = 3;
    const maxBpr = 5;
    const rows: number[][] = [];
    let b = 1;
    for (let r = 0; r < Math.min(room.rowsCount, maxRows); r++) {
      const row: number[] = [];
      const bprVisible = Math.min(room.benchesPerRow, maxBpr);
      for (let c = 0; c < bprVisible; c++) {
        row.push(b++);
      }
      if (room.benchesPerRow > maxBpr) {
        row.push(-(room.benchesPerRow - maxBpr));
        b += room.benchesPerRow - maxBpr;
      }
      rows.push(row);
    }
    if (room.rowsCount > maxRows) {
      const remaining = (room.rowsCount - maxRows) * room.benchesPerRow;
      rows.push([-remaining]);
    }
    return rows;
  }
}
