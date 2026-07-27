# Invigil — Exam Hall Seating, Made Effortless

**Invigil** is a web application that helps colleges plan exam-hall seating in minutes and lets students find their exact seat in seconds — no app install, no login.

> *Enter a hall ticket number → see the room, floor, bench and seat. Print it. Done.*

---

## 1. The Problem Invigil Solves

Every exam season, colleges manually prepare seating charts in spreadsheets, tape printed lists on notice boards, and field a crowd of students hunting for their name. It is slow, error-prone, and stressful on exam morning.

Invigil replaces all of that with:

- A simple admin dashboard to set up rooms and exams.
- An automatic, fair seating generator (with anti-malpractice options).
- A public search page where any student instantly finds their seat.

---

## 2. Who Uses Invigil

| Role | What they do | Login needed? |
| --- | --- | --- |
| **College Admin** | Set up rooms, create exams, upload students, generate & publish seating | Yes — secure email/password |
| **Student** | Look up their seat by hall ticket number, print a seat slip | **No login** |

Each college's data is fully private and isolated — one college can never see or change another's rooms, exams, or students.

---

## 3. Admin Features

### 3.1 Secure Accounts
- Register a college with a name, code, admin email and password.
- Secure sign-in / sign-out.
- All admin pages are protected — only signed-in admins can reach them.

### 3.2 Dashboard
- At-a-glance counters: total rooms, total seating capacity, total exams, published exams.
- Recent exams list with status (Draft / Published / Archived).
- Quick-action shortcuts to the most common tasks.

### 3.3 Room Management
- Add exam halls with **Name**, **Floor**, **Rows**, **Benches per row**, and **Seats per bench**.
- Live capacity preview and a visual bench-grid layout while you type.
- Edit or delete rooms anytime.
- Capacity is calculated automatically (rows × benches × seats).

### 3.4 Exam Creation & Editing
- Create an exam with **name, subject code, date, start time, end time**.
- Times are validated (end must be after start).
- **Select the rooms** to be used (at least one is required).
- **Live capacity check** while selecting rooms — shows selected seats vs. number of students and warns immediately if there aren't enough seats.
- Fully **editable** later; exams can also be **deleted** (which cleans up everything, including any published copy).

### 3.5 Student Upload
- Upload the student list from **CSV or Excel** (`.csv`, `.xlsx`, `.xls`).
- Expected columns: **Hall Ticket No, Name, Department (optional), Section (optional)**.
- Drag-and-drop or click to browse.
- Automatic clean-up: hall ticket numbers are standardised (uppercased, spaces removed) and duplicates are ignored, so lookups never fail on a typo.
- Preview of loaded students before saving.

### 3.6 Automatic Seating Generation
Invigil assigns every student a room, bench and seat with one click. Admins choose **how**:

**Allotment modes**
- **Sequential** — keep the uploaded order.
- **Random** — shuffle everyone.
- **Department spread** — place different departments next to each other so no two bench-mates share a subject (deters copying).

**Seating options**
- **Gap seat** — leave alternate seats empty for extra spacing between students.

**Fill order**
- Seats fill **column by column**: down the entire left column of benches (front row to back), then the next column — a natural, predictable flow for invigilators.

**Built-in safeguards**
- If the chosen rooms can't hold all students, Invigil stops and says exactly how many seats are short.
- **Double-booking protection:** a room already used by another exam at an overlapping date and time **cannot be allotted again** — Invigil blocks it and names the clashing exam.

### 3.7 Publish & Lifecycle
- **Publish** an exam to make its seating visible to students (with a confirmation step, and a re-check that no room is double-booked).
- **Archive** an exam to instantly hide it from students.
- **Draft → Published → Archived** status is clear at every step, with helpful banners guiding the admin through "upload → generate → publish".

### 3.8 Seating Map (Admin View)
- Visual hall layout showing every bench and seat with the student's hall ticket, name and department.
- "Front of room / Back of room" orientation labels.
- Shows exam name, date and timing.
- **Print-ready**: a clean, ink-friendly chart with one room per page — ready to post on the hall door.

---

## 4. Student Features (No Login)

### 4.1 Instant Seat Search
- On the home page, a student enters their **hall ticket number** and hits **Find Seat**.
- Invigil searches every published exam and shows their seat details.
- Hall tickets are **not case-sensitive** — "21wh1a0501" finds the same seat as "21WH1A0501".

### 4.2 Seat Result Card
For each exam found, the student sees:
- College name, exam name, **date and timing**.
- **Room, floor, bench number and seat number.**
- A small visual of their bench showing exactly which seat is theirs ("You").

### 4.3 Printable Seat Slip
- One click prints a clean slip with the student's seat details — handy to carry to the exam.

### 4.4 Full Room View
- Students can open the complete seating list for an exam, grouped by room and ordered by bench and seat.
- A search box highlights any hall ticket or name within the list.

---

## 5. Experience & Quality

- **Premium, modern interface** — custom iconography and a refined, professional look (no clip-art or emoji).
- **Light & Dark themes** — including a true-black dark mode with a tasteful frosted-glass style; the choice is remembered per device.
- **Fast & lightweight** — pages load on demand; the heavy spreadsheet reader only loads when a file is actually uploaded.
- **Works on phones, tablets and desktops** — fully responsive.
- **Accessible** — keyboard-friendly with clear focus states and screen-reader labels.
- **Print-optimised** — both the admin seating map and the student slip print cleanly in black-and-white.

---

## 6. Security & Privacy

- Admin access is protected by secure email/password authentication.
- **Per-college isolation:** database rules ensure each college can only read and write its own rooms, exams and students.
- **Students need no account** and submit no personal data to search — they only type a hall ticket number.
- Published seating is publicly readable (so students can look it up) but can only be created or changed by the owning college.
- Archived or deleted exams immediately stop appearing in student searches.

---

## 7. A Typical Workflow

1. **Admin registers** the college and signs in.
2. **Adds rooms** (halls) with their bench layout.
3. **Creates an exam** — date, time, and the rooms to use.
4. **Uploads the student list** (CSV/Excel).
5. **Generates seating** — picks a mode (e.g. Department spread) and optional gap seats; Invigil checks capacity and room clashes.
6. **Reviews the seating map**, prints it for the hall door.
7. **Publishes** the exam.
8. **Students search** their hall ticket number from any phone and find — or print — their seat.

---

## 8. Why Clients Love It

- **Saves hours** of manual chart-making every exam season.
- **Fewer mistakes** — automatic capacity checks and double-booking prevention.
- **Fairer exams** — department-spread seating and optional spacing.
- **Less crowding** on exam morning — students self-serve from their phones.
- **Professional, branded** seating charts and slips.
- **Zero friction for students** — no app, no login, just a hall ticket number.

---

*Invigil — find your exam seat in one search.*
