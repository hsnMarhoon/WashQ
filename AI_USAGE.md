# AI Usage

This file lists the AI tools used in the code phases of the project, as required by the SWE 363 AI Usage Guidelines. Full conversations and intermediate artifacts are submitted on Blackboard with each phase and are not stored in this repository.

## Phase 4 – Front-End

| ID  | Member | Tool (model) | Purpose | Files affected |
|-----|--------|--------------|---------|----------------|
| C01 | Mohamed Bukannan | Claude (Fable 5.2) | Drafting the administrator pages against the existing store and shared components; drafting the README, work division and project setup files | `src/pages/admin/*`, `index.html`, `package.json`, `package-lock.json`, `.gitignore`, `public/favicon.svg`, `README.md`, `WORK-DIVISION.md`, `AI_USAGE.md` |

<<<<<<< HEAD
| C02 | Mazen Hadi R Mdkhali | DeepSeek V4.1 Flash (OpenCode) | Designing the shared application state model and demo seed data; drafting the store provider, its actions and the periodic tick that advances machine cycles, no-shows, claims and announcements | `src/store/AppStore.jsx`, `src/data/seed.js` |
| C03 | Mazen Hadi R Mdkhali | DeepSeek V4.1 Flash (OpenCode) | Writing slot-availability logic (opening hours, cycle length, existing bookings, maintenance and announcement blocks) and the shared date, countdown and formatting helpers | `src/lib/slots.js`, `src/lib/time.js` |
| C04 | Mazen Hadi R Mdkhali | DeepSeek V4.1 Flash (OpenCode) | Implementing the booking/reschedule modal (day switch, taken slots with reasons, inline "slot just taken" error) and the cancel/reschedule flow on My Bookings | `src/components/BookingModal.jsx`, `src/pages/student/MyBookings.jsx` |
| C05 | Mazen Hadi R Mdkhali | DeepSeek V4.1 Flash (OpenCode) | Building the student machine board: type and status filters, announcement banner, queue side panel, machine-details modal and the flag-unattended confirmation | `src/pages/student/MachineBoard.jsx` |
| C06 | Mazen Hadi R Mdkhali | DeepSeek V4.1 Flash (OpenCode) | Scaffolding the router with role guards and redirects for the student, staff and admin areas; adding the live clock and staff building-scope hooks | `src/App.jsx`, `src/main.jsx`, `src/hooks/useNow.js`, `src/hooks/useStaffBuilding.js` |
| C07 | Mazen Hadi R Mdkhali | DeepSeek V4.1 Flash (OpenCode) | Debugging frozen countdowns and time-based states, and adding the Demo shortcuts used to reach cycle-finished, expired claim, expired check-in and slot-conflict states | `src/store/AppStore.jsx`, `src/hooks/useNow.js`, `src/pages/student/MyBookings.jsx` |

<!-- Hassan, Usman: add one row per AI conversation (C08, C09, ...), or add your name to the line below if you used no AI in this phase. -->
=======
| C02 | Usman Mir | OpenAI Codex (GPT-6) | Implementing the staff workspace and integration fixes against the wireframes | `src/components/MaintenanceModal.jsx`, `src/pages/staff/*`, `src/App.jsx`, `src/store/AppStore.jsx`, `AI_USAGE.md` |

<!-- Mazen, Hassan, Usman: add one row per AI conversation (C02, C03, ...), or add your name to the line below if you used no AI in this phase. -->
>>>>>>> 1653253 (Connect staff workflows to shared state)

| C08 | Hassan Almarhoon | Claude (Sonnet 5.5) | Troubleshooting a `react-router-dom` dependency error; Claude advised installing the package separately and gave troubleshooting steps | `package.json` |
| C09 | Hassan Almarhoon | Claude (Sonnet 5.5) | Generating an inline SVG icon set (`ICONS` object) for the existing `Icon` component, based on the project's list of icon names | `src/components/Icons.jsx` |
| C10 | Hassan Almarhoon | Claude (Sonnet 5.5) | Preparing the project stylesheet from a supplied reference file, matching it as closely as possible | `src/styles.css` |

No AI used: _to be completed by each member before submission._

---

## Mazen Hadi R Mdkhali — conversation summaries

Summaries of the conversations listed as C02–C07 above. Each entry records what was
asked, what the assistant produced, and how the result was checked against the wireframes
before it was committed.

### C02 — State model and seed data

**Asked:** *"I am building a React prototype of a dorm laundry system. Propose one state
shape that covers users, buildings, machines, bookings, queues, fault reports,
announcements, maintenance and notification settings, and a provider that saves it to
localStorage. Include an action for every screen so the pages never hold their own copy of
the data."*

**Produced:** the `AppProvider` / `useApp` store with a versioned `localStorage` key,
`loadState` fallback to `createSeed()`, notification and activity-log helpers, and a
5-second `setInterval` calling `advance()`. The assistant also drafted `seed.js` with
timestamps relative to the first load, so countdowns and live cycles look realistic.

**Checked:** pressing **Demo → Reset demo data**, reloading the page, and confirming the
seeded student (Building 812), staff (812 + 815) and admin accounts all restore correctly;
letting the app sit for one cycle to confirm the tick completes bookings and raises
notifications.

### C03 — Slot generation and time helpers

**Asked:** *"Write `getSlots(machine, day, state, now)` that walks a building's opening
hours in machine-cycle steps and marks a slot taken when it overlaps a booking, a
maintenance block, an announcement that blocks bookings, or when the machine is out of
order / in use. Also give me date helpers for 'Today'/'Tomorrow' tabs and mm:ss
countdowns."*

**Produced:** `src/lib/slots.js` with `dayRange`, `overlaps` and per-slot `reason` labels
(*Booked*, *In use*, *Under maintenance*, *Awaiting collection*), plus `src/lib/time.js`
with `fmtTime`, `dayLabel`, `fmtRange`, `minutesUntil`, `mmss` and `timeAgo`.

**Checked:** compared the generated slots with the wireframe's book-a-slot annotations,
tested a building that closes at 24:00 (the assistant added the `ch === 24` and
`ch <= oh` handling after I reported the last slot was missing), and confirmed taken slots
are struck through and disabled.

### C04 — Booking and reschedule modal

**Asked:** *"Build the book-a-slot modal: Today/Tomorrow tabs, a grid of slots that shows
the reason when taken, a summary of the chosen slot, and a clear error if the slot is
taken between opening the modal and pressing Confirm. Reuse the same component for
rescheduling from My Bookings."*

**Produced:** `BookingModal.jsx` with `useMemo` slot loading, a selected/free/taken slot
grid, disabled Confirm until a slot is chosen, and handling of the store's
`{ error: 'taken' }` response with an inline "That slot was just taken" message. The
assistant then wired the same modal into `MyBookings.jsx` for reschedule and added the
cancel confirmation dialog.

**Checked:** booked, cancelled and rescheduled from both screens; forced the conflict path
with **Demo → Make my next booking fail**, and verified the booking appears under the
correct tab with the check-in countdown.

### C05 — Machine board

**Asked:** *"Lay out the machine board from wireframe W04: a quiet-hours notice, an
announcement banner I can dismiss, type and status filters with an empty state, machine
cards with live status and a details action, a queue panel for washers and dryers, and a
'Flag unattended' confirmation on finished machines."*

**Produced:** `MachineBoard.jsx` with filter state (`type`, `status`), a filtered empty
state, announcement dismissal kept in component state, a queue side panel calling
`joinQueue` / `leaveQueue` / `claimTurn` / `skipTurn`, a machine-details modal and the
flag-unattended flow with its success and error toasts.

**Checked:** every filter combination, the suspended-account banner, an empty queue, and
the three flag responses (success, already flagged, still running) against the wireframe
annotations.

### C06 — Routing and role guards

**Asked:** *"Set up React Router for three roles. A signed-out visitor should only reach
sign-in, sign-up and reset; a signed-in user should be redirected to their role home if
they open another role's URL. Add a 404 page and scroll to top on navigation."*

**Produced:** the route tree in `App.jsx` with `PublicOnly`, `RequireRole` and
`ROLE_HOME`, nested `/app`, `/staff` and `/admin` layouts, `ScrollToTop`, and the
`NotFound` screen. It also produced `useNow` (re-render on an interval) and
`useStaffBuilding` (remember the staff member's selected building in localStorage).

**Checked:** opened each role's URLs while signed out and while signed in as another role,
confirmed the redirects, and refreshed deep links to make sure the guard still applies.

### C07 — Live countdowns and demo shortcuts

**Asked:** *"My check-in countdown is frozen even though the booking end time is in the
past. Why?"* followed by *"Add demo actions so I can reach the time-based states without
waiting: finish a cycle, put me first in the queue, expire my claim, expire my check-in,
and make my next booking hit a slot conflict."*

**Produced:** the explanation that derived values must be recomputed from timestamps with
`useNow` rather than stored once, the `useNow` hook applied to My Bookings and the board,
and the Demo menu actions in the store that mutate the relevant timestamps and queue
position.

**Checked:** triggered each demo action and confirmed the matching wireframe state
(cycle finished, claim window, expired claim, expired check-in, slot conflict) appears
without a page reload.
