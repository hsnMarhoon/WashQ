# WashQ — Phase 4 Front-End Prototype

A fully interactive React prototype of **WashQ**, the KFUPM dormitory laundry management
system, built for SWE 363-01 (Term 261) · Team 18.

The prototype implements all **26 hosted wireframe screens** for the three roles —
**student**, **laundry staff**, and **administrator** — with working booking, queue,
check-in, fault-report, repair, announcement, inventory, rules, statistics and report flows.
It is a front-end prototype: data is mocked and persisted in the browser, and no backend is
required.

---

## Quick start

Requirements: **Node.js 18+** and npm.

```bash
cd "Phase 4"
npm install
npm run dev
```

Open the URL printed by Vite (usually <http://localhost:5173>).

Production build:

```bash
npm run build
npm run preview
```

`npm run build` outputs the static bundle to `dist/`.

---

## Demo accounts

Use the one-click demo cards on the sign-in screen, or enter:

| Role   | Email                        | Password     |
|--------|------------------------------|--------------|
| Student | `s202312345@kfupm.edu.sa`   | `student123` |
| Staff   | `ahmed.k@kfupm.edu.sa`      | `staff123`   |
| Admin   | `admin@kfupm.edu.sa`        | `admin123`   |

The demo student is **Faisal A.** in **Building 812**. Staff member **Ahmed K.** manages
Buildings **812** and **815**. The administrator manages every building.

> Data is stored locally in `localStorage` under the key `washq-phase4-v1`. Demo
> timestamps are seeded relative to the first load so countdowns and live cycles look
> realistic. Use **Demo → Reset demo data** to restore the original seed and sign out.

---

## Design reference

The implementation follows the **WashQ hosted wireframe set (W01–W26)** and its
annotations:

- **Hosted wireframes:** <https://mjbukannan.github.io/washq-wireframes/>
- **Local wireframe source:** [`../Project 3/wireframes`](../Project%203/wireframes)
- **Wireframe annotations and Figma import steps:** [`../Project 3/wireframes/README.md`](../Project%203/wireframes/README.md)

The wireframes are the authoritative design reference for this phase. The same source can
be imported into Figma with the **html.to.design** plugin (instructions are in the wireframe
README). If the team publishes a Figma prototype URL, add it here:

```text
Figma prototype: <paste published Figma link here>
```

Visual polish (colour, type scale, spacing, responsive behaviour) is an intentional
high-fidelity layer on top of the wireframe layouts, labels and flows. Every wireframe
screen, state and required interaction is preserved.

---

## Screen map

### Student

| Wireframe | Screen | Route / trigger | Highlights |
|-----------|--------|-----------------|------------|
| W01 | Sign in | `/signin` | Validation, demo accounts, suspended-account error |
| W02 | Sign up | `/signup` | KFUPM email checks, password strength meter, building selection |
| W03 | Reset password | `/reset` | Email confirmation, expired-link state, new-password flow |
| W04 | Machine board | `/app/board` | Live statuses, filters, announcement banner, queue side panel, quiet times |
| W05 | Machine details | Machine card → details icon | Details, next free slots, report/booking shortcuts |
| W06 | Book a slot | **Book** / **See slots** / **Reschedule** | Day switch, taken slots struck through, validation, conflict state |
| W07 | My Bookings | `/app/bookings` | Upcoming/past tabs, check-in countdown, cancel confirmation, reschedule |
| W08 | Queue status and claim | `/app/queue` | Join/leave queue, live position, claim countdown, expired claim |
| W09 | QR check-in | `/app/checkin` | Camera idle/streaming/blocked states, manual code, success state |
| W10 | Report a problem | `/app/report` | Machine/category chips, validation, photo states, report status timeline |
| W11 | Flag unattended laundry | Board → **Flag unattended** on a finished machine | Confirmation and staff escalation message |
| W12 | Notification settings | `/app/settings` | Email/in-app matrix, required alerts, reminder timing, save/reset |
| W13 | My History and Busy Times | `/app/history` | Completed/cancelled/no-show table, strike meter, weekly busy heatmap |

### Laundry staff

| Wireframe | Screen | Route / trigger | Highlights |
|-----------|--------|-----------------|------------|
| W14 | Room overview | `/staff/overview` | Out-of-service KPI, open reports, unattended flags, low stock, maintenance |
| W15 | Fault reports and triage | `/staff/reports` | Status tabs, search, report detail, confirm/dismiss with reasons |
| W16 | Machine page | `/staff/machines` → **Open** | Status editor, repair form, parts used, repair log, QR/serial |
| W17 | Schedule maintenance | **Schedule maintenance** | Time window, maintenance block, confirmation |
| W18 | Live room | `/staff/live` | Active bookings, release/extend, queues, unattended flags, strikes, activity log |
| W19 | Building announcements | `/staff/announcements` | Compose, target buildings, live window, block-bookings option, preview |
| W20 | Spare-parts inventory | `/staff/inventory` | Low-stock alert, search, record stock, reorder levels |

### Administrator

| Wireframe | Screen | Route / trigger | Highlights |
|-----------|--------|-----------------|------------|
| W21 | Buildings and laundry rooms | `/admin/buildings` | Add/edit/remove buildings, room hours, staff coverage |
| W22 | Machines | `/admin/machines` | Register/edit/retire machines, building filter, QR codes |
| W23 | Users and staff assignment | `/admin/users` | Create staff/admin accounts, assign buildings, reset password, disable |
| W24 | Booking rules and penalties | `/admin/rules` | Grace/claim/max-active/horizon/hours, penalty thresholds, suspended list |
| W25 | Usage statistics | `/admin/stats` | Date range, KPIs, peak-demand chart, utilisation, faults, reliability |
| W26 | Generate and export reports | `/admin/reports` | Report type, building/month, CSV export, print/PDF report sheet |

Alternate states (suspended account, expired claim/check-in, slot conflict, empty queues,
no reports, no data, validation errors) are implemented and reachable from the UI.

---

## Prototype controls

Open **Demo** in the top bar to trigger states that would otherwise require waiting:

- Finish a machine cycle (next 5-second tick)
- Put me first in the queue (opens a 10-minute claim window)
- Expire my claim window
- Expire my check-in window
- Make my next booking fail with a “slot just taken” conflict
- Suspend my account
- Reset demo data

Staff and admin accounts receive role-appropriate demo actions.

---

## Implementation notes

- **Stack:** React 18.3, Vite 5, React Router 6.
- **State:** one localStorage-backed store (`src/store/AppStore.jsx`) with seeded data
  (`src/data/seed.js`). A 5-second tick advances cycles, no-shows, expired claims and
  announcements.
- **Responsive:** desktop-first layout with breakpoints for tablets and phones
  (collapsible navigation, single-column cards, touch-sized controls, stacked tables).
- **Print:** the admin report sheet has dedicated `@media print` styles so
  **Print / Save PDF** produces a clean operations report.
- **Accessibility:** semantic landmarks, labelled form fields, visible focus states,
  text-plus-colour status badges, reduced-motion support, and ARIA live toasts.
- **No external UI libraries** — every component and icon is in this repository.

### Project structure

```text
Phase 4/
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── src/
    ├── main.jsx
    ├── App.jsx                 # routes and role guards
    ├── styles.css              # design system, pages, responsive, print
    ├── components/             # Icons, UI primitives, layout, modals
    ├── data/seed.js            # demo users, machines, bookings, reports, stats
    ├── hooks/                  # live clock and staff-building selection
    ├── lib/                    # slot generation and time formatting
    ├── pages/auth/             # W01–W03
    ├── pages/student/          # W04–W13
    ├── pages/staff/            # W14–W20
    ├── pages/admin/            # W21–W26
    └── store/AppStore.jsx      # mock state and actions
```

---

## Pushing to GitHub

The folder is not a git repository yet. To publish it:

```bash
cd "Phase 4"
git init
git add .
git commit -m "WashQ Phase 4 interactive front-end prototype"
git branch -M main
git remote add origin <your-repository-url>
git push -u origin main
```

To publish the built site with GitHub Pages, run `npm run build` and deploy the `dist/`
folder from your hosting workflow (for example, a GitHub Actions Pages workflow). Because the
app uses `BrowserRouter`, configure the host to rewrite unknown paths to `index.html`.

---

## Notes and limitations

- This is a **front-end prototype**. Email, camera scanning, authentication and persistence
  are simulated; camera access is represented by streaming/blocked demo states.
- The prototype deliberately includes built-in shortcuts for time-based states so every
  wireframe state can be evaluated without waiting.
- The reference wireframes cover desktop; the React implementation adds a responsive mobile
  layout without changing the screen flows.
