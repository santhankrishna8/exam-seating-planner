import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { ToastComponent } from '../../../shared/toast/toast.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { LoaderComponent } from '../../../shared/loader/loader.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ExamService } from '../../../services/exam.service';
import { RoomService } from '../../../services/room.service';
import { ToastService } from '../../../services/toast.service';
import { Room, benchGrid, benchCountOf, layoutSummary, formatFloor } from '../../../models/room.model';

const FLOOR_OPTIONS = [
  'Ground Floor', '1st Floor', '2nd Floor', '3rd Floor',
  '4th Floor', '5th Floor', '6th Floor', '7th Floor'
];

const MAX_COLUMNS = 12;
const MAX_BENCHES_PER_COLUMN = 30;

@Component({
  selector: 'app-room-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent, ToastComponent, ConfirmDialogComponent, LoaderComponent, IconComponent],
  template: `
    <app-toast />
    <app-confirm-dialog
      [visible]="deleteTarget() !== null"
      title="Delete hall"
      [message]="deleteMessage()"
      confirmLabel="Delete hall"
      (confirm)="confirmDelete()"
      (cancel)="deleteTarget.set(null)"
    />

    <div class="admin-layout">
      <app-admin-sidebar />
      <main class="admin-main">
        <div class="page-content fade-in">
          <header class="page-head">
            <div>
              <span class="eyebrow">Estate</span>
              <h1 class="page-title">Examination halls</h1>
              <p class="page-sub">
                {{ rooms().length }} {{ rooms().length === 1 ? 'hall' : 'halls' }} ·
                {{ estateCapacity() }} seats on the register
              </p>
            </div>
            @if (!showForm()) {
              <button class="btn btn-primary" (click)="openForm()">
                <app-icon name="plus" [size]="15" /> Add hall
              </button>
            }
          </header>

          @if (showForm()) {
            <section class="card editor mb-24">
              <div class="editor-head">
                <h2 class="editor-title">{{ editingId() ? 'Edit hall' : 'New hall' }}</h2>
                <button class="btn btn-ghost btn-icon" (click)="cancelForm()" aria-label="Close editor">
                  <app-icon name="x-circle" [size]="18" />
                </button>
              </div>

              <div class="editor-body">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="rm-name">Hall name</label>
                    <input id="rm-name" class="form-control" [(ngModel)]="form.name" placeholder="Block A · 101" />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="rm-floor">Floor</label>
                    <select id="rm-floor" class="form-control" [(ngModel)]="form.floor">
                      @for (f of floorOptions; track f) { <option [value]="f">{{ f }}</option> }
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="rm-spb">Seats per bench</label>
                    <input id="rm-spb" class="form-control" type="number" min="1" max="4"
                      [(ngModel)]="form.seatsPerBench" (ngModelChange)="normaliseSeats()" />
                    <span class="form-hint">Students sitting side by side on one bench.</span>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Quick shape</label>
                    <div class="quick-shape">
                      <input class="form-control" type="number" min="1" [max]="maxColumns"
                        [(ngModel)]="quick.columns" aria-label="Columns" />
                      <span class="quick-x">×</span>
                      <input class="form-control" type="number" min="1" [max]="maxBenches"
                        [(ngModel)]="quick.benches" aria-label="Benches per column" />
                      <button type="button" class="btn btn-outline" (click)="applyQuickShape()">Apply</button>
                    </div>
                    <span class="form-hint">Fills every column evenly — adjust individual columns below.</span>
                  </div>
                </div>

                <div class="layout-block">
                  <div class="layout-head">
                    <div>
                      <span class="form-label">Hall plan</span>
                      <p class="form-hint">
                        Each column runs from the front of the hall to the back. Columns may hold
                        different numbers of benches — set each one to match the real room.
                      </p>
                    </div>
                    <button type="button" class="btn btn-outline btn-sm" (click)="addColumn()"
                      [disabled]="form.columns.length >= maxColumns">
                      <app-icon name="plus" [size]="14" /> Add column
                    </button>
                  </div>

                  <div class="plan">
                    <div class="plan-front"><span>Front of hall · board</span></div>

                    @if (form.columns.length === 0) {
                      <p class="plan-none text-muted">No columns yet — add one to start the plan.</p>
                    } @else {
                      <div class="plan-columns">
                        @for (count of form.columns; track $index; let ci = $index) {
                          <div class="plan-col">
                            <div class="col-head">
                              <span class="col-name">Col {{ ci + 1 }}</span>
                              <button type="button" class="col-remove" (click)="removeColumn(ci)"
                                [attr.aria-label]="'Remove column ' + (ci + 1)" title="Remove column">
                                <app-icon name="x-circle" [size]="14" />
                              </button>
                            </div>

                            <div class="col-benches">
                              @for (bench of grid()[ci]; track bench) {
                                <div class="bench">
                                  <span class="bench-no">{{ bench }}</span>
                                  <div class="bench-seats">
                                    @for (s of seatSlots(); track s) { <i class="seat"></i> }
                                  </div>
                                </div>
                              }
                            </div>

                            <div class="col-stepper">
                              <button type="button" (click)="stepColumn(ci, -1)" [disabled]="count <= 1" aria-label="Fewer benches">&minus;</button>
                              <input type="number" class="col-count" min="1" [max]="maxBenches"
                                [ngModel]="count" (ngModelChange)="setColumn(ci, $event)"
                                [attr.aria-label]="'Benches in column ' + (ci + 1)" />
                              <button type="button" (click)="stepColumn(ci, 1)" [disabled]="count >= maxBenches" aria-label="More benches">+</button>
                            </div>
                          </div>
                        }
                      </div>
                    }

                    <div class="plan-back"><span>Back of hall</span></div>
                  </div>

                  <div class="layout-summary">
                    <div class="ls-item">
                      <span class="ls-label">Columns</span>
                      <span class="ls-value">{{ form.columns.length }}</span>
                    </div>
                    <div class="ls-item">
                      <span class="ls-label">Benches</span>
                      <span class="ls-value">{{ benchTotal() }}</span>
                    </div>
                    <div class="ls-item">
                      <span class="ls-label">Seats / bench</span>
                      <span class="ls-value">{{ form.seatsPerBench }}</span>
                    </div>
                    <div class="ls-item ls-total">
                      <span class="ls-label">Capacity</span>
                      <span class="ls-value">{{ capacity() }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="editor-foot">
                <span class="text-muted mono foot-note">{{ summary() }}</span>
                <div class="foot-actions">
                  <button class="btn btn-ghost" (click)="cancelForm()">Cancel</button>
                  <button class="btn btn-primary" (click)="saveRoom()" [disabled]="saving()">
                    {{ saving() ? 'Saving…' : editingId() ? 'Save changes' : 'Add hall' }}
                  </button>
                </div>
              </div>
            </section>
          }

          @if (loading()) {
            <app-loader message="Loading halls…" />
          } @else if (rooms().length === 0) {
            <div class="card empty-state">
              <div class="empty-state-icon"><app-icon name="building" [size]="26" /></div>
              <h3>No halls on the register</h3>
              <p>Add your first examination hall and describe its column layout.</p>
              @if (!showForm()) {
                <button class="btn btn-primary mt-16" (click)="openForm()">Add the first hall</button>
              }
            </div>
          } @else {
            <div class="rooms-grid">
              @for (room of rooms(); track room.id) {
                <article class="card room-card">
                  <div class="room-head">
                    <div class="room-id">
                      <h3 class="room-name">{{ room.name }}</h3>
                      <span class="room-floor">{{ formatFloor(room.floor) }}</span>
                    </div>
                    <div class="room-actions">
                      <button class="btn btn-ghost btn-icon" title="Edit hall" aria-label="Edit hall" (click)="editRoom(room)">
                        <app-icon name="pencil" [size]="16" />
                      </button>
                      <button class="btn btn-ghost btn-icon danger" title="Delete hall" aria-label="Delete hall" (click)="deleteTarget.set(room)">
                        <app-icon name="trash" [size]="16" />
                      </button>
                    </div>
                  </div>

                  <div class="room-plan" [attr.aria-label]="'Plan of ' + room.name">
                    @for (col of room.columnLayout; track $index) {
                      <div class="rp-col">
                        @for (b of counter(col); track b) { <i class="rp-bench"></i> }
                      </div>
                    }
                  </div>

                  <dl class="room-figures">
                    <div><dt>Columns</dt><dd>{{ room.columnLayout.length }}</dd></div>
                    <div><dt>Benches</dt><dd>{{ room.benchCount }}</dd></div>
                    <div><dt>Per bench</dt><dd>{{ room.seatsPerBench }}</dd></div>
                    <div class="fig-total"><dt>Capacity</dt><dd>{{ room.totalCapacity }}</dd></div>
                  </dl>

                  @if (isIrregular(room)) {
                    <p class="room-note mono">Uneven columns · {{ room.columnLayout.join(' · ') }}</p>
                  }
                </article>
              }
            </div>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`

    .page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 26px; }

    /* ── Editor ── */
    .editor { overflow: hidden; }
    .editor-head { display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary); }
    .editor-title { font-size: 1.1rem; }
    .editor-body { padding: 22px 20px; }
    .editor-foot { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding: 14px 20px; border-top: 1px solid var(--border-color); background: var(--bg-secondary); }
    .foot-note { font-size: 0.74rem; letter-spacing: 0.02em; }
    .foot-actions { display: flex; gap: 8px; }

    .quick-shape { display: flex; align-items: center; gap: 8px; }
    .quick-shape .form-control { width: 5.2rem; }
    .quick-x { color: var(--text-muted); font-family: var(--font-mono); }

    .layout-block { margin-top: 6px; }
    .layout-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
    .layout-head .form-hint { max-width: 48ch; margin-top: 4px; }

    /* ── Hall plan editor ── */
    .plan {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-secondary);
      padding: 0 0 12px;
      overflow: hidden;
    }
    .plan-front, .plan-back {
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-mono); font-size: 0.63rem; letter-spacing: 0.16em; text-transform: uppercase;
      color: var(--text-muted);
    }
    .plan-front { padding: 9px; border-bottom: 1px solid var(--border-color); background: var(--bg-sunken); }
    .plan-front span { position: relative; }
    .plan-front span::before, .plan-front span::after {
      content: ''; position: absolute; top: 50%; width: 26px; height: 1px; background: var(--border-strong);
    }
    .plan-front span::before { right: calc(100% + 10px); }
    .plan-front span::after { left: calc(100% + 10px); }
    .plan-back { padding: 8px 9px 0; }
    .plan-none { padding: 28px; text-align: center; font-size: 0.86rem; }

    .plan-columns { display: flex; gap: 14px; padding: 16px; overflow-x: auto; align-items: flex-start; }
    .plan-col { flex: 0 0 auto; display: flex; flex-direction: column; gap: 8px; min-width: 88px; }
    .col-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .col-name { font-family: var(--font-mono); font-size: 0.64rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }
    .col-remove { display: inline-flex; background: none; border: 0; color: var(--text-muted); padding: 2px; border-radius: 3px; }
    .col-remove:hover { color: var(--accent-red); }

    .col-benches { display: flex; flex-direction: column; gap: 5px; }
    .bench {
      display: flex; align-items: center; gap: 6px;
      padding: 5px 7px;
      border: 1px solid var(--border-strong);
      border-radius: 3px;
      background: var(--bg-elevated);
    }
    .bench-no { font-family: var(--font-mono); font-size: 0.62rem; color: var(--text-muted); min-width: 1.4em; }
    .bench-seats { display: flex; gap: 3px; flex: 1; }
    .seat { flex: 1; height: 11px; border-radius: 1.5px; background: color-mix(in oklch, var(--accent-blue) 24%, transparent); }

    .col-stepper { display: flex; align-items: stretch; border: 1px solid var(--border-color); border-radius: var(--radius-sm); overflow: hidden; background: var(--bg-elevated); }
    .col-stepper button {
      width: 26px; border: 0; background: transparent; color: var(--text-secondary);
      font-size: 0.95rem; line-height: 1; transition: background var(--transition), color var(--transition);
    }
    .col-stepper button:hover:not(:disabled) { background: var(--bg-sunken); color: var(--text-primary); }
    .col-stepper button:disabled { opacity: 0.3; cursor: not-allowed; }
    .col-count {
      flex: 1; min-width: 0; width: 100%;
      border: 0; border-left: 1px solid var(--border-color); border-right: 1px solid var(--border-color);
      background: transparent; color: var(--text-primary);
      text-align: center; font-family: var(--font-mono); font-size: 0.8rem; padding: 5px 0; outline: none;
      -moz-appearance: textfield;
    }
    .col-count::-webkit-outer-spin-button, .col-count::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

    .layout-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; margin-top: 14px; background: var(--border-color); border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; }
    .ls-item { background: var(--bg-card); padding: 11px 14px; display: flex; flex-direction: column; gap: 3px; }
    .ls-label { font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }
    .ls-value { font-family: var(--font-head); font-size: 1.4rem; font-weight: 600; line-height: 1; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
    .ls-total { background: color-mix(in oklch, var(--accent-blue) 8%, var(--bg-card)); }
    .ls-total .ls-value { color: var(--accent-blue); }
    @media (max-width: 620px) { .layout-summary { grid-template-columns: repeat(2, 1fr); } }

    /* ── Hall cards ── */
    .rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(268px, 1fr)); gap: 14px; }
    .room-card { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 14px; transition: border-color var(--transition), box-shadow var(--transition); }
    .room-card:hover { border-color: var(--border-strong); box-shadow: var(--shadow-md); }
    .room-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .room-name { font-size: 1.12rem; letter-spacing: -0.01em; }
    .room-floor { font-family: var(--font-mono); font-size: 0.66rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }
    .room-actions { display: flex; gap: 2px; }
    .room-actions .danger:hover { color: var(--accent-red); }

    .room-plan {
      display: flex; gap: 6px; align-items: flex-start; justify-content: center;
      padding: 14px 10px; border-radius: var(--radius-sm);
      background: var(--bg-secondary); border: 1px solid var(--border-color);
      min-height: 78px; overflow: hidden;
    }
    .rp-col { display: flex; flex-direction: column; gap: 3px; }
    .rp-bench { width: 16px; height: 5px; border-radius: 1px; background: var(--border-strong); }

    .room-figures { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 0; }
    .room-figures > div { display: flex; flex-direction: column; gap: 2px; }
    .room-figures dt { font-family: var(--font-mono); font-size: 0.58rem; letter-spacing: 0.09em; text-transform: uppercase; color: var(--text-muted); }
    .room-figures dd { font-family: var(--font-mono); font-size: 1.02rem; font-weight: 500; font-variant-numeric: tabular-nums; }
    .fig-total dd { color: var(--accent-blue); }
    .room-note { font-size: 0.68rem; color: var(--text-muted); letter-spacing: 0.04em; }
  `]
})
export class RoomManagementComponent implements OnInit {
  private roomService = inject(RoomService);
  private examService = inject(ExamService);
  private toastService = inject(ToastService);

  rooms = signal<Room[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  deleteTarget = signal<Room | null>(null);
  saving = signal(false);

  floorOptions = FLOOR_OPTIONS;
  maxColumns = MAX_COLUMNS;
  maxBenches = MAX_BENCHES_PER_COLUMN;
  formatFloor = formatFloor;

  form = this.blankForm();
  quick = { columns: 4, benches: 6 };

  /** Signal mirror of the plain form object so the plan preview stays reactive. */
  private layout = signal<number[]>([6, 6, 6, 6]);
  grid = computed(() => benchGrid(this.layout()));

  ngOnInit() { this.loadRooms(); }

  private blankForm() {
    return { name: '', floor: 'Ground Floor', seatsPerBench: 2, isActive: true, columns: [6, 6, 6, 6] };
  }

  private syncLayout() { this.layout.set(this.form.columns.slice()); }

  counter = (n: number) => Array.from({ length: Math.min(n, 40) }, (_, i) => i);
  seatSlots = () => Array.from({ length: Math.max(1, Math.min(this.form.seatsPerBench, 4)) }, (_, i) => i);

  benchTotal = () => benchCountOf(this.layout());
  capacity = () => this.benchTotal() * Math.max(1, this.form.seatsPerBench || 0);
  summary = () => layoutSummary(this.layout(), this.form.seatsPerBench);
  estateCapacity = () => this.rooms().reduce((n, r) => n + r.totalCapacity, 0);
  isIrregular = (r: Room) => r.columnLayout.length > 1 && new Set(r.columnLayout).size > 1;

  deleteMessage = () =>
    `Delete "${this.deleteTarget()?.name ?? ''}"? Exams already published keep their seating, but this hall can no longer be allotted.`;

  normaliseSeats() {
    this.form.seatsPerBench = Math.min(4, Math.max(1, Math.trunc(Number(this.form.seatsPerBench) || 1)));
  }

  addColumn() {
    if (this.form.columns.length >= MAX_COLUMNS) return;
    const last = this.form.columns[this.form.columns.length - 1] ?? 6;
    this.form.columns = [...this.form.columns, last];
    this.syncLayout();
  }

  removeColumn(index: number) {
    this.form.columns = this.form.columns.filter((_, i) => i !== index);
    this.syncLayout();
  }

  setColumn(index: number, value: unknown) {
    const n = Math.min(MAX_BENCHES_PER_COLUMN, Math.max(1, Math.trunc(Number(value) || 1)));
    this.form.columns = this.form.columns.map((c, i) => (i === index ? n : c));
    this.syncLayout();
  }

  stepColumn(index: number, delta: number) {
    this.setColumn(index, (this.form.columns[index] ?? 1) + delta);
  }

  applyQuickShape() {
    const cols = Math.min(MAX_COLUMNS, Math.max(1, Math.trunc(Number(this.quick.columns) || 1)));
    const benches = Math.min(MAX_BENCHES_PER_COLUMN, Math.max(1, Math.trunc(Number(this.quick.benches) || 1)));
    this.quick = { columns: cols, benches };
    this.form.columns = Array.from({ length: cols }, () => benches);
    this.syncLayout();
  }

  loadRooms() {
    this.loading.set(true);
    this.roomService.getRooms().subscribe({
      next: r => { this.rooms.set(r); this.loading.set(false); },
      error: () => { this.toastService.error('Could not load halls.'); this.loading.set(false); }
    });
  }

  openForm() {
    this.editingId.set(null);
    this.form = this.blankForm();
    this.quick = { columns: 4, benches: 6 };
    this.syncLayout();
    this.showForm.set(true);
  }

  cancelForm() { this.showForm.set(false); this.editingId.set(null); }

  editRoom(room: Room) {
    this.editingId.set(room.id);
    this.form = {
      name: room.name,
      floor: room.floor || 'Ground Floor',
      seatsPerBench: room.seatsPerBench,
      isActive: room.isActive,
      columns: room.columnLayout.length ? [...room.columnLayout] : [6, 6, 6, 6]
    };
    this.quick = { columns: this.form.columns.length, benches: this.form.columns[0] ?? 6 };
    this.syncLayout();
    this.showForm.set(true);
    queueMicrotask(() => document.getElementById('rm-name')?.focus());
  }

  async saveRoom() {
    this.normaliseSeats();
    const name = this.form.name.trim();
    if (!name) { this.toastService.error('Give the hall a name.'); return; }
    if (this.form.columns.length === 0) { this.toastService.error('Add at least one column of benches.'); return; }
    if (this.capacity() === 0) { this.toastService.error('This layout seats nobody — check the bench counts.'); return; }
    if (this.rooms().some(r => r.id !== this.editingId() && r.name.trim().toLowerCase() === name.toLowerCase())) {
      this.toastService.error(`A hall named "${name}" already exists.`); return;
    }

    this.saving.set(true);
    try {
      const draft = {
        name,
        floor: this.form.floor,
        seatsPerBench: this.form.seatsPerBench,
        isActive: this.form.isActive,
        columnLayout: [...this.form.columns]
      };
      if (this.editingId()) {
        await this.roomService.updateRoom(this.editingId()!, draft);
        this.toastService.success(`${name} updated · ${this.capacity()} seats.`);
      } else {
        await this.roomService.addRoom(draft);
        this.toastService.success(`${name} added · ${this.capacity()} seats.`);
      }
      this.cancelForm();
      this.loadRooms();
    } catch (e: any) {
      this.toastService.error(e?.message ?? 'Could not save the hall.');
    } finally {
      this.saving.set(false);
    }
  }

  async confirmDelete() {
    const room = this.deleteTarget();
    if (!room) return;
    try {
      const using = await this.examService.examsUsingRoom(room.id);
      if (using.length) {
        this.toastService.error(`${room.name} is used by "${using[0].name}"${using.length > 1 ? ` and ${using.length - 1} more` : ''}. Remove it there first.`);
        this.deleteTarget.set(null);
        return;
      }
      await this.roomService.deleteRoom(room.id);
      this.toastService.success(`${room.name} deleted.`);
      this.loadRooms();
    } catch {
      this.toastService.error('Could not delete the hall.');
    }
    this.deleteTarget.set(null);
  }
}
