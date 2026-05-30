# Exam Hall Seating Arrangement System

A digital platform where colleges can manage exam seating arrangements and students/teachers can look up their assigned seats — no login required for viewing.

## 💡 My Suggestions & Enhancements

Before diving into the plan, here are some ideas to make this even better:

1. **QR Code per Student** — After generating the arrangement, produce a QR code for each hall ticket number. Students scan it → instantly see their room, bench & seat.
2. **PDF Export** — Let admins download a printable seating chart per room (useful for posting on room doors).
3. **Shuffle Algorithm Options** — Offer "Alphabetical", "Random", and "Department-wise separation" modes so students from the same class don't sit together (anti-cheating).
4. **Real-time Seat Status** — Mark seats as "present/absent" during the exam (future enhancement).
5. **Exam History** — Archive past exams so admins can reference old arrangements.
6. **Bulk CSV/Excel Upload** — For hall ticket numbers + names (you mentioned this, just confirming).
7. **Dashboard Analytics** — Show room utilization %, empty seats, etc.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | **Angular 20** (standalone components, CSS — not SCSS) |
| Database | **Firebase Firestore** |
| Auth | **Firebase Authentication** (Email/Password) |
| Hosting | **Firebase Hosting** (optional) |
| File Parsing | **xlsx** npm package (for Excel upload) or **Papa Parse** (for CSV) |

---

## User Roles & Access

| Role | Auth Required? | What They Can Do |
|---|---|---|
| **College Admin** | ✅ Yes (Email/Password) | Register rooms, manage benches, create exams, upload students, generate seating |
| **Student / Teacher** | ❌ No | Search by hall ticket number → see room, bench, seat position |

---

## Firestore Database Schema

```
colleges/
  └── {collegeId}/                    ← same as auth UID
        ├── name: string
        ├── code: string              ← short code like "JNTU-HYD"
        ├── createdAt: timestamp
        │
        ├── rooms/
        │     └── {roomId}/
        │           ├── name: string           ← "Room 101"
        │           ├── floor: string          ← "Ground Floor"
        │           ├── benchCount: number     ← 30
        │           ├── seatsPerBench: number  ← 2 (or 1 for small benches)
        │           ├── totalCapacity: number  ← auto-calculated
        │           └── isActive: boolean
        │
        ├── exams/
        │     └── {examId}/
        │           ├── name: string           ← "Data Structures - Mid 1"
        │           ├── subjectCode: string
        │           ├── date: timestamp
        │           ├── startTime: string
        │           ├── endTime: string
        │           ├── status: string         ← "draft" | "published" | "archived"
        │           ├── shuffleMode: string    ← "sequential" | "random"
        │           ├── createdAt: timestamp
        │           │
        │           ├── students/
        │           │     └── {hallTicketNo}/
        │           │           ├── name: string
        │           │           ├── department: string (optional)
        │           │           ├── section: string (optional)
        │           │           ├── assignedRoom: string (roomId ref)
        │           │           ├── assignedBench: number
        │           │           ├── assignedSeat: number
        │           │           └── isSeated: boolean
        │           │
        │           └── roomAssignments/
        │                 └── {roomId}/
        │                       ├── roomName: string
        │                       ├── assignedCount: number
        │                       └── totalCapacity: number

── publicExams/                         ← Denormalized for public lookup (no auth)
     └── {examId}/
           ├── collegeName: string
           ├── collegeCode: string
           ├── examName: string
           ├── subjectCode: string
           ├── date: timestamp
           ├── status: string
           │
           └── seats/
                 └── {hallTicketNo}/
                       ├── name: string
                       ├── roomName: string
                       ├── benchNumber: number
                       ├── seatNumber: number
                       └── floor: string
```

> [!IMPORTANT]
> The `publicExams` collection is a **denormalized read-only copy** for students. This avoids complex Firestore security rules and keeps the public query fast. When an admin "publishes" an exam, the data is copied here.

---

## Firestore Security Rules (High Level)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public exams — anyone can read
    match /publicExams/{examId} {
      allow read: if true;
      match /seats/{seatId} {
        allow read: if true;
      }
    }
    
    // College data — only authenticated owner
    match /colleges/{collegeId} {
      allow read, write: if request.auth != null && request.auth.uid == collegeId;
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == collegeId;
      }
    }
  }
}
```

---

## Application Architecture

### Route Structure

| Route | Component | Auth Guard? | Description |
|---|---|---|---|
| `/` | LandingPage | ❌ | Hero + search bar for students |
| `/search` | SearchResults | ❌ | Shows seat details after search |
| `/exam/:examId` | ExamPublicView | ❌ | Full seating chart for an exam |
| `/admin/login` | AdminLogin | ❌ | Login page |
| `/admin/register` | AdminRegister | ❌ | College registration |
| `/admin/dashboard` | AdminDashboard | ✅ | Overview with stats |
| `/admin/rooms` | RoomManagement | ✅ | CRUD rooms & benches |
| `/admin/exams` | ExamList | ✅ | List all exams |
| `/admin/exams/new` | ExamCreate | ✅ | Create exam + upload students |
| `/admin/exams/:id` | ExamDetail | ✅ | View/edit exam, generate seating |
| `/admin/exams/:id/seating` | SeatingArrangement | ✅ | Visual seating map |

### Folder Structure

```
src/
├── app/
│   ├── app.component.ts / .html / .css
│   ├── app.config.ts
│   ├── app.routes.ts
│   │
│   ├── components/
│   │   ├── public/
│   │   │   ├── landing/          (landing.component.ts / .html / .css)
│   │   │   ├── search-results/   (search-results.component.ts / .html / .css)
│   │   │   ├── exam-public-view/ (exam-public-view.component.ts / .html / .css)
│   │   │   └── navbar/           (navbar.component.ts / .html / .css)
│   │   │
│   │   └── admin/
│   │       ├── login/            (login.component.ts / .html / .css)
│   │       ├── register/         (register.component.ts / .html / .css)
│   │       ├── dashboard/        (dashboard.component.ts / .html / .css)
│   │       ├── room-management/  (room-management.component.ts / .html / .css)
│   │       ├── exam-list/        (exam-list.component.ts / .html / .css)
│   │       ├── exam-create/      (exam-create.component.ts / .html / .css)
│   │       ├── exam-detail/      (exam-detail.component.ts / .html / .css)
│   │       ├── seating-arrangement/ (seating-arrangement.component.ts / .html / .css)
│   │       └── admin-sidebar/    (admin-sidebar.component.ts / .html / .css)
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── college.service.ts
│   │   ├── room.service.ts
│   │   ├── exam.service.ts
│   │   ├── seating.service.ts      ← core algorithm lives here
│   │   └── file-upload.service.ts  ← CSV/Excel parsing
│   │
│   ├── guards/
│   │   └── auth.guard.ts
│   │
│   ├── models/
│   │   ├── college.model.ts
│   │   ├── room.model.ts
│   │   ├── exam.model.ts
│   │   └── student.model.ts
│   │
│   └── shared/
│       ├── loader/               (loader.component.ts / .html / .css)
│       ├── toast/                (toast.component.ts / .html / .css)
│       └── confirm-dialog/       (confirm-dialog.component.ts / .html / .css)
│
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
│
├── index.html
└── styles.css                    ← Global styles & design system
```

---

## Seating Algorithm

```
Input:  students[], rooms[] (sorted by preference/floor)
Config: shuffleMode ("sequential" | "random")

1. If shuffleMode === "random" → shuffle(students)
2. seatIndex = 0
3. For each room in rooms:
     For bench = 1 to room.benchCount:
       For seat = 1 to room.seatsPerBench:
         if seatIndex < students.length:
           students[seatIndex].assignedRoom = room.id
           students[seatIndex].assignedBench = bench
           students[seatIndex].assignedSeat = seat
           seatIndex++
4. If seatIndex < students.length → ERROR: Not enough capacity
5. Return assigned students[]
```

> [!TIP]
> For **elective exams** with fewer students, the algorithm will naturally only fill the rooms needed. Admins can also **select specific rooms** to use for an exam instead of using all rooms.

---

## Proposed Changes

### Phase 1: Project Scaffolding & Core Setup

#### [NEW] Angular Project Initialization
- `ng new exam-seating --style css --routing --defaults` in the workspace directory
- Install dependencies: `@angular/fire`, `firebase`, `xlsx` (for Excel parsing)
- Configure Firebase in `environment.ts`

#### [NEW] [app.config.ts](file:///c:/Users/santh/Desktop/Projects/exam-hall-seating-arangement/src/app/app.config.ts)
- Firebase providers (App, Firestore, Auth)

#### [NEW] [app.routes.ts](file:///c:/Users/santh/Desktop/Projects/exam-hall-seating-arangement/src/app/app.routes.ts)
- All routes with lazy loading and auth guard

#### [NEW] [styles.css](file:///c:/Users/santh/Desktop/Projects/exam-hall-seating-arangement/src/styles.css)
- Global design system: CSS variables, dark theme support, typography (Google Fonts — Inter/Outfit), animations, glassmorphism cards

---

### Phase 2: Models & Services

#### [NEW] Models (`src/app/models/`)
- `college.model.ts` — College interface
- `room.model.ts` — Room & Bench interfaces
- `exam.model.ts` — Exam, ExamStatus enums
- `student.model.ts` — Student with seat assignment

#### [NEW] Services (`src/app/services/`)
- `auth.service.ts` — Login, register, logout, auth state
- `college.service.ts` — College CRUD
- `room.service.ts` — Room CRUD under college
- `exam.service.ts` — Exam CRUD, publish/archive
- `seating.service.ts` — The seat assignment algorithm + write to Firestore
- `file-upload.service.ts` — Parse CSV/Excel to student array

#### [NEW] Guards (`src/app/guards/`)
- `auth.guard.ts` — Redirect to login if not authenticated

---

### Phase 3: Public Components (No Auth)

#### [NEW] Landing Page (`src/app/components/public/landing/`)
- Hero section with animated gradient background
- Large search bar: "Enter your Hall Ticket Number"
- College code dropdown/input for multi-college support
- Recent/active exams carousel
- Premium glassmorphism design

#### [NEW] Search Results (`src/app/components/public/search-results/`)
- Displays: Student name, exam name, room name, floor, bench #, seat #
- Visual bench diagram showing exact position
- Option to view full room layout

#### [NEW] Exam Public View (`src/app/components/public/exam-public-view/`)
- Room-by-room seating grid
- Filter by hall ticket number highlight
- Responsive table/grid layout

#### [NEW] Navbar (`src/app/components/public/navbar/`)
- Logo, search shortcut, "Admin Login" link
- Sticky top with glass effect

---

### Phase 4: Admin Components (Auth Required)

#### [NEW] Login & Register (`src/app/components/admin/login/` & `register/`)
- Clean form with email/password
- College name & code on registration
- Error handling with toast notifications

#### [NEW] Dashboard (`src/app/components/admin/dashboard/`)
- Stats cards: Total Rooms, Total Capacity, Active Exams, Students Seated
- Recent exams quick-access list
- Utilization chart (room fill rates)

#### [NEW] Room Management (`src/app/components/admin/room-management/`)
- Add/Edit/Delete rooms
- Form: Room name, floor, bench count, seats per bench
- Visual preview of bench layout
- Bulk room creation option

#### [NEW] Exam Create (`src/app/components/admin/exam-create/`)
- Exam name, subject code, date, time
- **File upload area** — drag & drop CSV/Excel
- File format: `HallTicketNo, Name, Department (optional), Section (optional)`
- Preview uploaded students in a table
- Manual entry option as fallback
- Select which rooms to use for this exam
- Choose shuffle mode (sequential / random)

#### [NEW] Exam Detail (`src/app/components/admin/exam-detail/`)
- View exam info + student list
- "Generate Seating" button → runs the algorithm
- "Publish" button → copies to `publicExams` collection
- Status management (draft → published → archived)

#### [NEW] Seating Arrangement (`src/app/components/admin/seating-arrangement/`)
- Visual room-by-room grid showing benches and assigned students
- Color-coded by department (if available)
- Print/PDF export button
- Re-generate option

#### [NEW] Admin Sidebar (`src/app/components/admin/admin-sidebar/`)
- Navigation: Dashboard, Rooms, Exams, Logout
- Collapsible on mobile
- Active route highlighting

---

### Phase 5: Shared Components

#### [NEW] Loader (`src/app/shared/loader/`)
- Pulsating animation loader for async operations

#### [NEW] Toast (`src/app/shared/toast/`)
- Success/Error/Info notification toasts

#### [NEW] Confirm Dialog (`src/app/shared/confirm-dialog/`)
- Modal for destructive actions (delete room, archive exam)

---

## UI Design Direction

- **Color Palette**: Deep navy (`#0f172a`) background, electric blue (`#3b82f6`) accents, emerald green (`#10b981`) success states, warm amber (`#f59e0b`) warnings
- **Typography**: Google Fonts — **Outfit** for headings, **Inter** for body text
- **Cards**: Glassmorphism with `backdrop-filter: blur()`, subtle borders, and soft shadows
- **Animations**: Fade-in on route change, hover lift on cards, smooth drawer transitions
- **Admin Layout**: Sidebar + content area (responsive — sidebar collapses to hamburger on mobile)
- **Public Layout**: Full-width centered content with hero sections

---

## Open Questions

> [!IMPORTANT]
> **Firebase Project**: Do you already have a Firebase project created? If yes, please share the Firebase config (apiKey, authDomain, projectId, etc.). If not, I can guide you through creating one.

> [!IMPORTANT]
> **College Code for Students**: When students search for their seat, should they need to enter a college code + hall ticket number, or just the hall ticket number? (If hall ticket numbers are unique across colleges, just the number is enough)

> [!NOTE]
> **Excel/CSV Format**: I'll support both CSV and Excel (.xlsx) uploads. The expected format will be: `Hall Ticket Number, Student Name, Department (optional), Section (optional)`. Does this work for you?

> [!NOTE]
> **Deployment**: Would you like me to set up Firebase Hosting for deployment as well, or will you handle that separately?

---

## Verification Plan

### Automated Tests
- `ng build` — ensure zero compilation errors
- `ng serve` — verify dev server runs correctly
- Test each route loads without errors

### Manual Verification (Browser)
- **Admin flow**: Register → Login → Add Rooms → Create Exam → Upload CSV → Generate Seating → Publish
- **Student flow**: Go to landing page → Enter hall ticket → View seat assignment
- **Responsive**: Test on mobile viewport (375px) and desktop (1440px)
- **Auth guard**: Verify `/admin/*` routes redirect to login when not authenticated
