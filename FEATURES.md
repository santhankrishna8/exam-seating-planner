# Invigil — features

**Admin (examination office)**
- Halls: column-by-column bench layouts, floors, seats per bench.
- Exam: name, date, time. Everything else lives on one page — students, halls & rules, publish, invigilators.
- Students: CSV/Excel upload (hall tickets normalised, duplicates dropped).
- Seating: sequential, random or department-mixed; optional gap seat; capacity and hall-clash checks; seats fill down each column.
- Publish / unpublish (two states: draft, published). Hall plans print one hall per page.
- Invigilators (optional): fair auto-allot (workload, department, no double-booking) plus manual add/remove.
- Attendance: each hall gets a private link; invigilator taps absentees on a phone and submits. Admin sees status on the exam page; printable attendance sheets and CSV.

**Students** — enter hall ticket, see hall, floor, bench, seat; print slip; view full hall list.

**Safety** — per-college private data; public reads limited to published seats; attendance links are long random tokens that can only change attendance fields.
