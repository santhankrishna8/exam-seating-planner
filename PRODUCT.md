# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Examination office staff and coordinators (university professors acting as exam controllers).** Primary. They sit at a desk, usually at a laptop or desktop, building hall layouts, creating exams, uploading candidate lists, running the allotment and publishing it. They work with long rosters and tables of figures, and they are accountable for the result.
- **Invigilating professors.** Sign in to a personal portal to see their duty (exam, hall, time), view the candidates in their room and submit absentees. Often on a phone or a laptop at the hall.
- **Students.** No login. Open the public page, type a hall ticket number, get hall, floor, bench and seat, and print a slip. Frequently on a phone, in a hurry, on exam morning.

## Product Purpose

Invigil allots examination halls, benches and seats, assigns invigilators, publishes the register, and lets any student find their seat from a hall ticket number. Success is a defensible, conflict-free allotment produced in minutes, and a student who never has to hunt a notice board.

## Positioning

Halls are modelled as columns of benches of unequal depth (as real halls are), and the allotment walks them column by column, front to back. A generic table-based seating tool cannot truthfully show or number an irregular hall.

## Operating Context

Exam season. Rosters of hundreds to thousands of candidates. Printed seating maps, attendance sheets and hall-ticket slips are real deliverables. Dates, times, room names, bench numbers and ticket numbers are read and compared constantly, so figures must line up.

## Capabilities and Constraints

- Angular 21 standalone components, Firebase (Auth, Firestore), xlsx import. Routes: public landing, search, public exam view; admin login/register/dashboard/rooms/teachers/exams/exam detail/seating map; teacher login and portal.
- Hall editor with per-column bench counts and a live plan; column-major allotment; department-spread and spacing options; double-booking block; invigilator auto-allotment and duty roster; attendance marking; print and CSV outputs.
- Print output must remain a clean official document.
- Light and dark themes both exist; the theme is saved per browser.

## Brand Commitments

- Name: **Invigil**, descriptor "Examination Control System". Single source of truth is `src/app/brand.ts`.
- A squared examination seal mark (three columns of benches, one struck in red) is the logo idea to keep.
- No emoji anywhere in product UI; iconography goes through the shared SVG icon component.
- Confirmed 2026-10-29: new visual world is wanted, same product. Self-hosted fonts are allowed (no third-party font requests). The user rejected the claret + serif look: sans-serif only, no claret, no paper-grey ground, and a bolder landing page.

## Evidence on Hand

No testimonials, customers, prices or benchmarks exist and none may be invented. FEATURES.md describes the real capabilities.

## Product Principles

1. Legibility of figures and names beats expression: rosters, benches and times must scan instantly.
2. The result must look authoritative and trustworthy, like an institution's own document.
3. Every state is designed: empty, sparse, dense, error, printed.
4. The irregular hall is the signature; show it truthfully.

## Accessibility & Inclusion

WCAG AA contrast, visible focus rings, full keyboard operation, `prefers-reduced-motion` honoured, 375px mobile layouts for the student lookup and the invigilator portal.

## What would make the result feel wrong

Confirmed by the user 2026-10-29: a generic SaaS dashboard (purple gradients, glass cards, pill chips), ornate or decorative treatment, a dark and techy feel, and a cold corporate look with no academic character.
