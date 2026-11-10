# Invigil — exam hall seating

Colleges seat students in exam halls in a few clicks; students find their seat by hall ticket number, no login.

## Flow

1. **Halls** — add rooms (columns of benches, seats per bench).
2. **New examination** — name, date, time.
3. On the exam page: **upload students** → **pick halls & rules, run seating** → **publish**.
4. *(Optional)* **Invigilators** — auto-allot or add by hand. After publishing, copy each hall's link to its invigilator; they mark absentees on their phone (no account).
5. Students search their hall ticket on the home page.

Unpublish any time to edit; the draft is kept.

## Develop

```bash
npm install --legacy-peer-deps
npm start        # dev server
npm test         # unit tests
npm run build
```

## Deploy

```bash
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

Deploying the rules **and indexes** is required: hall-ticket search uses a collection-group query on `seats.hallTicketNo`, and invigilator links use the `attendance` rules. Exams published before this version must be re-published (unpublish → publish) once so their seats carry `hallTicketNo`.
