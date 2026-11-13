/**
 * WashQ demo data.
 * All timestamps are generated relative to the moment the demo is first seeded,
 * so the prototype always opens in a believable "Tuesday 9:40 PM" state.
 */
import { MIN, DAY, clockOffset } from '../lib/time.js'

const iso = (d) => new Date(d).toISOString()
const isoT = (base, minutes) => clockOffset(base, minutes)

function qr(building, label) {
  const suffix = { W1: '7Q4K', W2: '3M8P', W3: '9Z2R', W4: '5T6B', D1: '2H7N', D2: '8C4L', D3: '6V1S', D4: '4J9D', D5: '1B5F' }[label] || '0A0A'
  return `${building}-${label}-${suffix}`
}

export function createSeed(nowMs = Date.now()) {
  const now = new Date(nowMs)
  const t = (minutes) => isoT(now, minutes)
  const dayAt = (offset, h, m = 0) => {
    const d = new Date(now)
    d.setDate(d.getDate() + offset)
    d.setHours(h, m, 0, 0)
    return iso(d)
  }

  /* ------------------------------------------------------------------ users */
  const users = [
    {
      id: 'u-faisal',
      name: 'Faisal A.',
      fullName: 'Faisal Alharbi',
      email: 's202312345@kfupm.edu.sa',
      password: 'student123',
      role: 'student',
      studentId: '202312345',
      buildingId: '812',
      room: '214',
      status: 'active',
      strikes: 1,
      suspendedUntil: null,
      createdAt: dayAt(-90, 10),
      channels: {
        queueTurn: { email: true, inapp: true },
        bookingReminder: { email: true, inapp: true },
        cycleFinished: { email: true, inapp: true },
        unattended: { email: true, inapp: true },
        reportUpdates: { email: true, inapp: false },
      },
      reminderLead: 15,
    },
    {
      id: 'u-staff-ahmed',
      name: 'Ahmed K.',
      fullName: 'Ahmed Khalid',
      email: 'ahmed.k@kfupm.edu.sa',
      password: 'staff123',
      role: 'staff',
      buildingIds: ['812', '815'],
      status: 'active',
      createdAt: dayAt(-240, 9),
    },
    {
      id: 'u-staff-omar',
      name: 'Omar S.',
      fullName: 'Omar Saleh',
      email: 'omar.s@kfupm.edu.sa',
      password: 'staff123',
      role: 'staff',
      buildingIds: ['818'],
      status: 'active',
      createdAt: dayAt(-200, 9),
    },
    {
      id: 'u-admin',
      name: 'You',
      fullName: 'System Administrator',
      email: 'admin@kfupm.edu.sa',
      password: 'admin123',
      role: 'admin',
      status: 'active',
      createdAt: dayAt(-300, 9),
    },
    {
      id: 'u-3310',
      name: 'Student #3310',
      fullName: 'Yousef M.',
      email: 's202303310@kfupm.edu.sa',
      password: 'student123',
      role: 'student',
      studentId: '202303310',
      buildingId: '812',
      room: '108',
      status: 'active',
      strikes: 1,
      suspendedUntil: null,
      createdAt: dayAt(-80, 10),
    },
    {
      id: 'u-2981',
      name: 'Student #2981',
      fullName: 'Khalid R.',
      email: 's202302981@kfupm.edu.sa',
      password: 'student123',
      role: 'student',
      studentId: '202302981',
      buildingId: '812',
      room: '301',
      status: 'active',
      strikes: 0,
      suspendedUntil: null,
      createdAt: dayAt(-70, 10),
    },
    {
      id: 'u-3402',
      name: 'Student #3402',
      fullName: 'Saad J.',
      email: 's202303402@kfupm.edu.sa',
      password: 'student123',
      role: 'student',
      studentId: '202303402',
      buildingId: '812',
      room: '422',
      status: 'active',
      strikes: 0,
      suspendedUntil: null,
      createdAt: dayAt(-60, 10),
    },
    {
      id: 'u-4471',
      name: 'Student #4471',
      fullName: 'Nawaf A.',
      email: 's202304471@kfupm.edu.sa',
      password: 'student123',
      role: 'student',
      studentId: '202304471',
      buildingId: '812',
      room: '233',
      status: 'suspended',
      strikes: 3,
      suspendedUntil: t(7 * 24 * 60),
      createdAt: dayAt(-120, 10),
    },
    {
      id: 'u-3902',
      name: 'Student #3902',
      fullName: 'Badr H.',
      email: 's202303902@kfupm.edu.sa',
      password: 'student123',
      role: 'student',
      studentId: '202303902',
      buildingId: '815',
      room: '117',
      status: 'suspended',
      strikes: 3,
      suspendedUntil: t(5 * 24 * 60),
      createdAt: dayAt(-110, 10),
    },
  ]

  /* -------------------------------------------------------------- buildings */
  const buildings = [
    {
      id: '812', name: 'Building 812', location: 'Ground floor, east wing',
      opens: '06:00', closes: '24:00', staffIds: ['u-staff-ahmed'],
      rules: { grace: 10, claim: 10, maxActive: 3, horizon: 2 },
      penalties: { strikes: 3, days: 7, reset: 'semester' },
    },
    {
      id: '815', name: 'Building 815', location: 'Basement',
      opens: '00:00', closes: '24:00', staffIds: ['u-staff-ahmed'],
      rules: { grace: 10, claim: 10, maxActive: 1, horizon: 2 },
      penalties: { strikes: 3, days: 7, reset: 'semester' },
    },
    {
      id: '818', name: 'Building 818', location: 'Ground floor',
      opens: '06:00', closes: '24:00', staffIds: ['u-staff-omar'],
      rules: { grace: 10, claim: 10, maxActive: 1, horizon: 2 },
      penalties: { strikes: 3, days: 7, reset: 'semester' },
    },
  ]

  /* --------------------------------------------------------------- machines */
  const mk = (buildingId, label, type, cycle, status, extra = {}) => ({
    id: `${buildingId}-${label}`,
    buildingId,
    label,
    type,
    model: type === 'washer' ? 'LG WM3400' : 'Samsung DV45',
    cycle,
    status,
    qr: qr(buildingId, label),
    lastServiced: dayAt(-30, 11),
    endsAt: null,
    startedAt: null,
    reservedFor: null,
    reservedBookingId: null,
    endedAt: null,
    faultNote: null,
    outSince: null,
    ...extra,
  })

  const machines = [
    mk('812', 'W1', 'washer', 45, 'available'),
    mk('812', 'W2', 'washer', 45, 'in-use', { startedAt: t(-21), endsAt: t(24) }),
    mk('812', 'W3', 'washer', 45, 'reserved', { reservedFor: t(20), reservedBookingId: 'b-1' }),
    mk('812', 'W4', 'washer', 45, 'out-of-order', {
      faultNote: 'Reported: does not drain. Under repair.', outSince: t(-26 * 60),
    }),
    mk('812', 'D1', 'dryer', 50, 'in-use', { startedAt: t(-38), endsAt: t(12) }),
    mk('812', 'D2', 'dryer', 50, 'in-use', { startedAt: t(-2), endsAt: t(48) }),
    mk('812', 'D3', 'dryer', 50, 'finished', { endedAt: t(-18), startedAt: t(-68) }),
    mk('812', 'D4', 'dryer', 50, 'available'),
    mk('812', 'D5', 'dryer', 50, 'out-of-order', {
      faultNote: 'Reported: not heating. Under repair.', outSince: t(-5 * 60),
    }),
    mk('815', 'W1', 'washer', 45, 'available'),
    mk('815', 'W2', 'washer', 45, 'in-use', { startedAt: t(-30), endsAt: t(15) }),
    mk('815', 'D1', 'dryer', 50, 'available'),
    mk('815', 'D2', 'dryer', 50, 'available'),
    mk('815', 'D3', 'dryer', 50, 'available'),
    mk('815', 'D4', 'dryer', 50, 'available'),
  ]

  /* --------------------------------------------------------------- bookings */
  const bookings = [
    {
      id: 'b-1', userId: 'u-faisal', machineId: '812-W3', buildingId: '812',
      start: t(20), end: t(65), status: 'upcoming', createdAt: t(-120), source: 'booking',
    },
    {
      id: 'b-2', userId: 'u-faisal', machineId: '812-D2', buildingId: '812',
      start: t(-2), end: t(48), status: 'checked-in', checkedInAt: t(-2), createdAt: t(-180), source: 'booking',
    },
    {
      id: 'b-3', userId: 'u-faisal', machineId: '812-W1', buildingId: '812',
      start: dayAt(1, 8), end: dayAt(1, 8, 45), status: 'upcoming', createdAt: t(-60), source: 'booking',
    },
    {
      id: 'b-4', userId: 'u-faisal', machineId: '812-W3', buildingId: '812',
      start: dayAt(-7, 22), end: dayAt(-7, 22, 45), status: 'no-show', createdAt: dayAt(-8, 12), source: 'booking',
    },
    {
      id: 'b-5', userId: 'u-faisal', machineId: '812-D2', buildingId: '812',
      start: dayAt(-9, 21, 12), end: dayAt(-9, 22, 2), status: 'completed', createdAt: dayAt(-9, 20), source: 'queue',
    },
    {
      id: 'b-6', userId: 'u-faisal', machineId: '812-W1', buildingId: '812',
      start: dayAt(-9, 20, 15), end: dayAt(-9, 21), status: 'completed', createdAt: dayAt(-9, 19), source: 'booking',
    },
    {
      id: 'b-7', userId: 'u-faisal', machineId: '812-W2', buildingId: '812',
      start: dayAt(-12, 7), end: dayAt(-12, 7, 45), status: 'cancelled', createdAt: dayAt(-12, 6), source: 'booking',
    },
    {
      id: 'b-8', userId: 'u-3310', machineId: '812-W4', buildingId: '812',
      start: t(90), end: t(135), status: 'upcoming', createdAt: t(-240), source: 'booking',
    },
    {
      id: 'b-9', userId: 'u-2981', machineId: '812-W4', buildingId: '812',
      start: t(150), end: t(195), status: 'upcoming', createdAt: t(-200), source: 'booking',
    },
    {
      id: 'b-10', userId: 'u-3402', machineId: '812-D1', buildingId: '812',
      start: t(100), end: t(150), status: 'upcoming', createdAt: t(-300), source: 'booking',
    },
    {
      id: 'b-11', userId: 'u-2981', machineId: '812-D1', buildingId: '812',
      start: t(160), end: t(210), status: 'upcoming', createdAt: t(-280), source: 'booking',
    },
    {
      id: 'b-12', userId: 'u-3310', machineId: '812-D1', buildingId: '812',
      start: t(220), end: t(270), status: 'upcoming', createdAt: t(-260), source: 'booking',
    },
    {
      id: 'b-13', userId: 'u-3310', machineId: '812-W2', buildingId: '812',
      start: t(-21), end: t(24), status: 'checked-in', checkedInAt: t(-18), createdAt: t(-90), source: 'booking',
    },
    {
      id: 'b-14', userId: 'u-2981', machineId: '812-D1', buildingId: '812',
      start: t(-38), end: t(12), status: 'checked-in', checkedInAt: t(-36), createdAt: t(-120), source: 'booking',
    },
  ]

  /* ----------------------------------------------------------------- queues */
  const queues = {
    '812-washer': [{ userId: 'u-3310', joinedAt: t(-45) }],
    '812-dryer': [
      { userId: 'u-2981', joinedAt: t(-25) },
      { userId: 'u-3402', joinedAt: t(-12) },
    ],
    '815-washer': [],
    '815-dryer': [],
    '818-washer': [],
    '818-dryer': [],
  }

  /* ---------------------------------------------------------------- reports */
  const reports = [
    {
      id: 'R-1042', reportNo: 'R-1042', machineId: '812-W4', buildingId: '812',
      userId: 'u-3310', category: 'Not draining',
      description: 'Water stays in the drum after the cycle ends. Tried twice.',
      photoName: 'drum.jpg', status: 'open', priority: null, createdAt: t(-26 * 60),
      staffNote: '', dismissReason: '',
    },
    {
      id: 'R-1043', reportNo: 'R-1043', machineId: '812-D5', buildingId: '812',
      userId: 'u-2981', category: 'Not heating',
      description: 'Clothes come out cold after a full cycle. The drum turns but there is no heat.',
      photoName: '', status: 'open', priority: null, createdAt: t(-5 * 60),
      staffNote: '', dismissReason: '',
    },
    {
      id: 'R-1044', reportNo: 'R-1044', machineId: '812-W2', buildingId: '812',
      userId: 'u-3402', category: 'Leaking',
      description: 'A small puddle forms under the front-left corner during the rinse cycle.',
      photoName: 'leak.jpg', status: 'open', priority: null, createdAt: t(-40),
      staffNote: '', dismissReason: '',
    },
    {
      id: 'R-1045', reportNo: 'R-1045', machineId: '815-W1', buildingId: '815',
      userId: 'u-3902', category: 'Door stuck',
      description: 'The door will not open after the cycle finishes. Clothes are stuck inside.',
      photoName: '', status: 'open', priority: null, createdAt: t(-2 * 60),
      staffNote: '', dismissReason: '',
    },
    {
      id: 'R-1030', reportNo: 'R-1030', machineId: '812-D2', buildingId: '812',
      userId: 'u-faisal', category: 'Does not start',
      description: 'Pressing start did nothing; no light, no sound.',
      photoName: 'dryer.jpg', status: 'resolved', priority: 'High', createdAt: dayAt(-4, 19),
      staffNote: 'Door interlock replaced. Tested three cycles.', dismissReason: '',
    },
    {
      id: 'R-1031', reportNo: 'R-1031', machineId: '812-W1', buildingId: '812',
      userId: 'u-faisal', category: 'Door stuck',
      description: 'The door latch feels loose and sometimes will not click shut.',
      photoName: '', status: 'in-repair', priority: 'Medium', createdAt: dayAt(-2, 18),
      staffNote: 'Latch ordered; temporary fix applied.', dismissReason: '',
    },
    {
      id: 'R-1032', reportNo: 'R-1032', machineId: '812-D3', buildingId: '812',
      userId: 'u-faisal', category: 'Not heating',
      description: 'Clothes still damp after a 50 minute cycle.',
      photoName: '', status: 'dismissed', priority: 'Low', createdAt: dayAt(-5, 17),
      staffNote: '', dismissReason: 'Cannot reproduce — machine reached 62°C in test.',
    },
  ]

  /* ------------------------------------------------------------ maintenance */
  const maintenance = [
    {
      id: 'm-1', machineId: '812-D1', buildingId: '812',
      start: t(90), duration: 60, note: 'Filter cleaning', createdAt: t(-300),
    },
    {
      id: 'm-2', machineId: '815-W2', buildingId: '815',
      start: t(30), duration: 30, note: 'Inspection', createdAt: t(-240),
    },
  ]

  /* ----------------------------------------------------------- announcements */
  const announcements = [
    {
      id: 'a-1', title: 'Water cut, use Building 815', message: 'The water supply to Building 812 is off until 11 PM. Please use the Building 815 laundry room.',
      buildingIds: ['812'], start: t(-30), end: t(120), blockBookings: false,
      status: 'live', authorId: 'u-staff-ahmed', createdAt: t(-60),
    },
    {
      id: 'a-2', title: 'New dryers installed', message: 'Four new dryers are now available on the basement floor.',
      buildingIds: ['815'], start: dayAt(-6, 8), end: dayAt(-4, 20), blockBookings: false,
      status: 'expired', authorId: 'u-staff-ahmed', createdAt: dayAt(-7, 8),
    },
    {
      id: 'a-3', title: 'Room closed for cleaning', message: 'The laundry room will be closed 2:00–4:00 PM for deep cleaning.',
      buildingIds: ['812'], start: t(150), end: t(270), blockBookings: true,
      status: 'scheduled', authorId: 'u-staff-ahmed', createdAt: t(-30),
    },
  ]

  /* -------------------------------------------------------------- inventory */
  const inventory = [
    { id: 'p-1', name: 'Drain pump', models: ['LG WM3400', 'Samsung DV45'], qty: 1, reorder: 2 },
    { id: 'p-2', name: 'Drain hose', models: ['LG WM3400'], qty: 6, reorder: 2 },
    { id: 'p-3', name: 'Door gasket', models: ['LG WM3400', 'Samsung DV45'], qty: 4, reorder: 2 },
    { id: 'p-4', name: 'Heating element', models: ['Samsung DV45'], qty: 3, reorder: 1 },
    { id: 'p-5', name: 'Lint filter', models: ['Samsung DV45'], qty: 12, reorder: 4 },
  ]

  /* ------------------------------------------------------------------ flags */
  const flags = [
    {
      id: 'f-1', machineId: '812-D3', buildingId: '812', flaggedBy: 'u-3310',
      at: t(-12), escalatedAt: t(3), status: 'open', ownerId: 'u-2981',
      note: 'D3 cycle ended 18 minutes ago and the load has not been collected.',
    },
  ]

  /* ---------------------------------------------------------- notifications */
  const notifications = [
    {
      id: 'n-1', userId: 'u-faisal', title: 'Booking reminder · W3',
      body: 'Your washer slot starts soon. Check in with the machine QR within 10 minutes.',
      at: t(-5), read: false, link: '/app/bookings', kind: 'booking',
    },
    {
      id: 'n-2', userId: 'u-faisal', title: 'Queue update · Washers',
      body: 'A washer may free up soon. Keep an eye on your queue position.',
      at: t(-15), read: false, link: '/app/queue', kind: 'queue',
    },
    {
      id: 'n-3', userId: 'u-faisal', title: 'Cycle finished · D1',
      body: 'Your dryer cycle finished 12 minutes ago.',
      at: t(-12), read: true, link: '/app/bookings', kind: 'cycle',
    },
    {
      id: 'n-4', userId: 'u-staff-ahmed', title: 'New fault report · W2',
      body: 'A student reported leaking in Building 812.',
      at: t(-40), read: false, link: '/staff/reports', kind: 'report',
    },
    {
      id: 'n-5', userId: 'u-staff-ahmed', title: 'Low stock · Drain pump',
      body: 'Drain pump is at 1 (reorder at 2).',
      at: t(-120), read: false, link: '/staff/inventory', kind: 'inventory',
    },
    {
      id: 'n-6', userId: 'u-admin', title: 'Low stock alert',
      body: 'Building 812 reports Drain pump below its reorder level.',
      at: t(-120), read: false, link: '/admin/stats', kind: 'inventory',
    },
  ]

  /* ------------------------------------------------------------- statistics */
  const history = [
    {
      id: 'h-1', machineId: '812-W4', buildingId: '812', date: dayAt(-1, 16),
      type: 'Repair', details: 'Drain blocked, cleared hose', parts: '—', by: 'Ahmed K.', downtime: '26 h',
    },
    {
      id: 'h-2', machineId: '812-W4', buildingId: '812', date: dayAt(-2, 19),
      type: 'Report', details: 'Not draining (confirmed, High)', parts: '—', by: 'Student', downtime: '',
    },
    {
      id: 'h-3', machineId: '812-W4', buildingId: '812', date: dayAt(-17, 13),
      type: 'Repair', details: 'Drain pump replaced', parts: 'Drain pump ×1', by: 'Ahmed K.', downtime: '9 h',
    },
    {
      id: 'h-4', machineId: '812-W4', buildingId: '812', date: dayAt(-25, 10),
      type: 'Maintenance', details: 'Filter cleaning', parts: '—', by: 'Ahmed K.', downtime: '1 h',
    },
    {
      id: 'h-5', machineId: '812-D2', buildingId: '812', date: dayAt(-4, 20),
      type: 'Repair', details: 'Door interlock replaced, tested 3 cycles', parts: 'Door gasket ×1', by: 'Ahmed K.', downtime: '4 h',
    },
  ]

  const stats = {
    '812': {
      bookings: 1284,
      utilization: 61,
      downtime: 58,
      noShowRate: 7.4,
      claimMissRate: 11.2,
      flags: 23,
      peak: [8, 5, 6, 9, 14, 12, 10, 16, 22, 28, 35, 42, 48, 40, 32, 24, 16, 10],
      machineUtil: { W1: 72, W2: 68, W3: 64, W4: 21, D1: 75, D2: 61, D5: 38 },
      faults: [
        { machine: 'W4', faults: 5, downtime: 41 },
        { machine: 'D5', faults: 2, downtime: 12 },
        { machine: 'W2', faults: 1, downtime: 5 },
      ],
      monthly: {
        bookings: 1012, utilization: 59, reports: 9, confirmed: 7,
        triageMedian: '3 h 10 min', repairMedian: '19 h', noShowRate: 6.9,
      },
    },
    '815': {
      bookings: 642,
      utilization: 43,
      downtime: 19,
      noShowRate: 5.1,
      claimMissRate: 8.4,
      flags: 9,
      peak: [4, 3, 5, 7, 9, 8, 6, 10, 13, 16, 21, 26, 28, 24, 20, 15, 11, 7],
      machineUtil: { W1: 61, W2: 54, D1: 48, D2: 44, D3: 39, D4: 33 },
      faults: [{ machine: 'W1', faults: 2, downtime: 16 }],
      monthly: {
        bookings: 508, utilization: 41, reports: 4, confirmed: 3,
        triageMedian: '4 h 05 min', repairMedian: '22 h', noShowRate: 4.8,
      },
    },
    '818': null,
  }

  const rulesLog = []

  return {
    seededAt: iso(now),
    session: null,
    authAttempts: {},
    users,
    buildings,
    machines,
    bookings,
    queues,
    claim: null,
    reports,
    maintenance,
    history,
    announcements,
    inventory,
    flags,
    notifications,
    stats,
    rulesLog,
    actions: [
      { id: 'act-1', at: t(-26 * 60), by: 'u-staff-ahmed', text: 'Marked W4 out of order (report R-1042).' },
      { id: 'act-2', at: t(-5 * 60), by: 'u-staff-ahmed', text: 'Marked D5 out of order (report R-1043).' },
    ],
    counters: {
      booking: 2500,
      report: 1045,
      flag: 2,
      maintenance: 3,
      announcement: 4,
      action: 3,
      invoice: 1,
    },
    demo: { forceSlotConflict: false },
    toasts: [],
  }
}
