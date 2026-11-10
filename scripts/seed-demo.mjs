// Seeds a demo institution into the Firebase project in src/environments/environment.ts.
//   node scripts/seed-demo.mjs          create (safe to re-run: fixed ids, so it overwrites)
//   node scripts/seed-demo.mjs --clean  remove everything this script created
//
// It uses the same client SDK and the same document shapes as the app's services, so it needs no
// admin key. Accounts are real Firebase Auth users with the demo password below; remove them with --clean.
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser, signOut
} from 'firebase/auth';
import {
  getFirestore, doc, collection, getDocs, writeBatch, setDoc, query, where, serverTimestamp, Timestamp
} from 'firebase/firestore';

const src = readFileSync(new URL('../src/environments/environment.ts', import.meta.url), 'utf8');
const cfg = new Function('return ' + /firebase:\s*(\{[\s\S]*?\})/.exec(src)[1])();
const app = initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);

const PASSWORD = 'Invigil@2026';
const OFFICE = 'office@invigil.test';
const COLLEGE = { name: 'Demo Institute of Technology', code: 'DIT' };

const teachers = [
  { id: 't-ece',   name: 'Dr. R. Meenakshi',  department: 'ECE',   email: 'meenakshi@invigil.test' },
  { id: 't-mech',  name: 'Prof. K. Venkatesh', department: 'MECH',  email: 'venkatesh@invigil.test' },
  { id: 't-math',  name: 'Dr. S. Anand',       department: 'MATH',  email: 'anand@invigil.test' },
  { id: 't-phy',   name: 'Dr. P. Lakshmi',     department: 'PHY',   email: 'lakshmi@invigil.test' },
  { id: 't-eng',   name: 'Prof. A. Fernandes', department: 'ENG',   email: 'fernandes@invigil.test' },
  { id: 't-civil', name: 'Prof. M. Rahman',    department: 'CIVIL', email: 'rahman@invigil.test' },
  { id: 't-cse',   name: 'Dr. T. Srinivas',    department: 'CSE',   email: 'srinivas@invigil.test' },
  { id: 't-eee',   name: 'Prof. N. Kavya',     department: 'EEE',   email: 'kavya@invigil.test' }
].map((t, i) => ({ ...t, phone: `98400000${String(10 + i)}`, isActive: true }));

// Irregular halls: bench count per column, front to back.
const rooms = [
  { id: 'r-101', name: 'Hall 101', floor: '1', columnLayout: [8, 6, 8, 6, 7, 5], seatsPerBench: 2 },
  { id: 'r-102', name: 'Hall 102', floor: '1', columnLayout: [9, 6, 10, 5, 8, 11, 6, 9, 5, 8, 7], seatsPerBench: 2 },
  { id: 'r-201', name: 'Hall 201', floor: '2', columnLayout: [7, 7, 6, 6, 8], seatsPerBench: 2 },
  { id: 'r-202', name: 'Hall 202', floor: '2', columnLayout: [10, 8, 8, 6], seatsPerBench: 2 }
];

const first = ['Aarav', 'Diya', 'Rohan', 'Ananya', 'Karthik', 'Sneha', 'Vikram', 'Priya', 'Arjun', 'Meera', 'Rahul', 'Kavya',
  'Siddharth', 'Nisha', 'Varun', 'Pooja', 'Aditya', 'Ishita', 'Manoj', 'Divya'];
const last = ['Reddy', 'Sharma', 'Nair', 'Iyer', 'Patel', 'Rao', 'Kumar', 'Gupta', 'Menon', 'Das', 'Singh', 'Naidu'];
const branches = [
  { code: '05', dept: 'CSE', n: 60 }, { code: '04', dept: 'ECE', n: 50 },
  { code: '02', dept: 'EEE', n: 35 }, { code: '03', dept: 'MECH', n: 35 }
];
function roster(limit) {
  const out = [];
  let k = 0;
  for (const b of branches) {
    for (let i = 1; i <= b.n; i++, k++) {
      out.push({
        hallTicketNo: `24DT1A${b.code}${String(i).padStart(2, '0')}`,
        name: `${first[k % first.length]} ${last[(k * 7 + 3) % last.length]}`,
        department: b.dept, section: i <= b.n / 2 ? 'A' : 'B'
      });
    }
  }
  return out.slice(0, limit);
}

/** Same column-major fill as SeatingService.assignSeats, sequential mode. */
function assignSeats(students, usedRooms) {
  let idx = 0;
  const seated = [];
  outer: for (const room of usedRooms) {
    let bench = 0;
    for (const len of room.columnLayout) {
      for (let r = 0; r < len; r++) {
        bench++;
        for (let seat = 1; seat <= room.seatsPerBench; seat++) {
          if (idx >= students.length) break outer;
          seated.push({ ...students[idx++], assignedRoom: room.id, assignedBench: bench, assignedSeat: seat, isSeated: true, absent: false });
        }
      }
    }
  }
  return seated;
}

const day = (y, m, d) => new Date(y, m - 1, d);
const exams = [
  {
    id: 'demo-exam-ds', name: 'Semester 3 · Data Structures', subjectCode: 'CS301', department: 'CSE',
    date: day(2026, 11, 9), startTime: '10:00', endTime: '13:00', status: 'draft', shuffleMode: 'sequential',
    spacing: false, selectedRooms: ['r-101', 'r-201', 'r-202'], teachersPerRoom: 2, publish: true,
    // Not the CSE or EEE teachers: those two stay free for the draft exam
    invigilators: { 'r-101': ['t-ece', 't-mech'], 'r-201': ['t-math', 't-phy'], 'r-202': ['t-eng', 't-civil'] }
  },
  {
    id: 'demo-exam-maths', name: 'Semester 3 · Engineering Mathematics III', subjectCode: 'MA301', department: 'MATH',
    date: day(2026, 11, 10), startTime: '10:00', endTime: '13:00', status: 'draft', shuffleMode: 'department',
    spacing: true, selectedRooms: ['r-101', 'r-102'], teachersPerRoom: 2, publish: false, invigilators: {}, rosterSize: 90
  }
];

async function batches(items, fn) {
  for (let i = 0; i < items.length; i += 400) {
    const b = writeBatch(db);
    items.slice(i, i + 400).forEach(it => fn(b, it));
    await b.commit();
  }
}

async function ensureUser(email) {
  try { return (await createUserWithEmailAndPassword(auth, email, PASSWORD)).user; }
  catch (e) {
    if (e.code !== 'auth/email-already-in-use') throw e;
    return (await signInWithEmailAndPassword(auth, email, PASSWORD)).user;
  }
}

async function seed() {
  for (const t of teachers) { await ensureUser(t.email); }
  const admin = await ensureUser(OFFICE);
  const uid = admin.uid;
  const base = `colleges/${uid}`;

  await setDoc(doc(db, 'colleges', uid), { ...COLLEGE, createdAt: serverTimestamp() });
  await batches(rooms, (b, r) => {
    const benchCount = r.columnLayout.reduce((a, c) => a + c, 0);
    b.set(doc(db, `${base}/rooms`, r.id), {
      name: r.name, floor: r.floor, columnLayout: r.columnLayout, benchCount, seatsPerBench: r.seatsPerBench,
      totalCapacity: benchCount * r.seatsPerBench, isActive: true, rowLayout: null, rowsCount: null, benchesPerRow: null,
      createdAt: serverTimestamp()
    });
  });
  await batches(teachers, (b, t) => {
    const { id, ...rest } = t;
    b.set(doc(db, `${base}/teachers`, id), { ...rest, createdAt: serverTimestamp() });
  });

  for (const e of exams) {
    const { publish, rosterSize, ...fields } = e;
    const used = e.selectedRooms.map(id => rooms.find(r => r.id === id));
    let students = roster(rosterSize ?? 180).map(s => ({ ...s, isSeated: false, absent: false }));
    if (publish) students = assignSeats(students, used);

    await setDoc(doc(db, `${base}/exams`, e.id), {
      ...fields, date: Timestamp.fromDate(e.date), status: publish ? 'published' : 'draft', createdAt: serverTimestamp()
    });
    await batches(students, (b, s) => b.set(doc(db, `${base}/exams/${e.id}/students`, s.hallTicketNo), {
      name: s.name, department: s.department, section: s.section,
      assignedRoom: s.isSeated ? s.assignedRoom : '', assignedBench: s.isSeated ? s.assignedBench : 0,
      assignedSeat: s.isSeated ? s.assignedSeat : 0, isSeated: s.isSeated, absent: false
    }));
    if (!publish) continue;

    // publishExam(): public record + one seat doc per candidate
    await setDoc(doc(db, 'publicExams', e.id), {
      ownerUid: uid, collegeName: COLLEGE.name, collegeCode: COLLEGE.code, examName: e.name, subjectCode: e.subjectCode,
      date: Timestamp.fromDate(e.date), startTime: e.startTime, endTime: e.endTime, status: 'published'
    });
    await batches(students.filter(s => s.isSeated), (b, s) => {
      const r = rooms.find(x => x.id === s.assignedRoom);
      b.set(doc(db, `publicExams/${e.id}/seats`, s.hallTicketNo), {
        name: s.name, hallTicketNo: s.hallTicketNo, roomId: r.id, roomName: r.name,
        benchNumber: s.assignedBench, seatNumber: s.assignedSeat, seatsPerBench: r.seatsPerBench, floor: r.floor
      });
    });

    // publishDuties(): one duty per invigilator per hall
    const duties = Object.entries(e.invigilators).flatMap(([roomId, ids]) => ids.map(tid => ({ roomId, t: teachers.find(x => x.id === tid) })));
    await batches(duties, (b, { roomId, t }) => b.set(doc(db, 'duties', `${e.id}__${roomId}__${t.id}`), {
      ownerUid: uid, examId: e.id, examName: e.name, roomId, roomName: rooms.find(r => r.id === roomId).name,
      teacherId: t.id, teacherEmail: t.email, teacherName: t.name, collegeName: COLLEGE.name,
      date: Timestamp.fromDate(e.date), startTime: e.startTime, endTime: e.endTime,
      absentHallTickets: [], submitted: false, createdAt: serverTimestamp()
    }));
    const perRoom = {};
    students.filter(s => s.isSeated).forEach(s => { perRoom[s.assignedRoom] = (perRoom[s.assignedRoom] ?? 0) + 1; });
    console.log(`${e.name}: ${students.length} candidates seated`, perRoom, `${duties.length} duties`);
  }
  console.log('Seeded.');
}

async function wipe(path) {
  const snap = await getDocs(collection(db, path));
  await batches(snap.docs, (b, d) => b.delete(d.ref));
}

async function clean() {
  const admin = await signInWithEmailAndPassword(auth, OFFICE, PASSWORD).then(c => c.user);
  const uid = admin.uid;
  const base = `colleges/${uid}`;
  for (const e of exams) {
    await wipe(`publicExams/${e.id}/seats`);
    await wipe(`${base}/exams/${e.id}/students`);
  }
  const duties = (await getDocs(query(collection(db, 'duties'), where('ownerUid', '==', uid)))).docs;
  await batches(duties, (b, d) => b.delete(d.ref));
  const del = async (col) => { const s = await getDocs(collection(db, col)); await batches(s.docs, (b, d) => b.delete(d.ref)); };
  await del(`${base}/exams`); await del(`${base}/rooms`); await del(`${base}/teachers`);
  const pub = writeBatch(db);
  for (const e of exams) pub.delete(doc(db, 'publicExams', e.id));
  pub.delete(doc(db, 'colleges', uid));
  await pub.commit();
  await deleteUser(admin);
  for (const t of teachers) {
    try { await deleteUser((await signInWithEmailAndPassword(auth, t.email, PASSWORD)).user); } catch { /* already gone */ }
  }
  await signOut(auth).catch(() => {});
  console.log('Cleaned.');
}

try { await (process.argv.includes('--clean') ? clean() : seed()); process.exit(0); }
catch (e) { console.error(e.code ?? '', e.message); process.exit(1); }
