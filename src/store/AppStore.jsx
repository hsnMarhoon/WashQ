import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createSeed } from '../data/seed.js'
import { MIN, DAY } from '../lib/time.js'
import { getSlots } from '../lib/slots.js'

const STORAGE_KEY = 'washq-phase4-v1'
const AppContext = createContext(null)

let uidSeq = 0
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${(uidSeq++).toString(36)}`

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.seededAt && Array.isArray(parsed.users) && Array.isArray(parsed.machines)) {
        return parsed
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return createSeed()
}

const currentUser = (s) => (s.session ? s.users.find((u) => u.id === s.session.userId) : null)

const isSuspended = (u, now = Date.now()) =>
  !!u && (u.status === 'suspended' || (u.suspendedUntil && new Date(u.suspendedUntil).getTime() > now))

function notify(s, userId, title, body, link = null, kind = 'info') {
  if (!userId) return
  s.notifications = [
    {
      id: uid('n'),
      userId,
      title,
      body,
      link,
      kind,
      at: new Date().toISOString(),
      read: false,
    },
    ...s.notifications,
  ]
}

function logAction(s, by, text) {
  s.actions = [{ id: uid('act'), at: new Date().toISOString(), by, text }, ...s.actions]
}

function next(formatted, key) {
  const n = (key === 'report' ? 1046 : 2501) + (Date.now() % 900)
  return formatted.replace('{}', n)
}

function overlaps(aS, aE, bS, bE) {
  return new Date(aS) < new Date(bE) && new Date(bS) < new Date(aE)
}

/** Called periodically: advances machines, queues, no-shows and escalations. */
function advance(prev, nowMs) {
  const nowIso = new Date(nowMs).toISOString()
  let s = { ...prev }
  let changed = false
  s.notifications = [...s.notifications]

  /* 1. cycles that have finished */
  const finished = []
  s.machines = s.machines.map((m) => {
    if (m.status === 'in-use' && m.endsAt && new Date(m.endsAt).getTime() <= nowMs) {
      changed = true
      finished.push(m)
      return { ...m, status: 'finished', endedAt: m.endsAt }
    }
    return m
  })

  for (const m of finished) {
    const booking = s.bookings.find((b) => b.machineId === m.id && b.status === 'checked-in')
    if (booking) {
      s.bookings = s.bookings.map((b) => (b.id === booking.id ? { ...b, status: 'completed' } : b))
      notify(
        s, booking.userId, `Cycle finished · ${m.label}`,
        `Your ${m.type} cycle on ${m.label} has finished. Collect your laundry.`,
        '/app/bookings', 'cycle',
      )
    }
    const key = `${m.buildingId}-${m.type}`
    const queue = s.queues[key] || []
    if (queue.length && !s.claim) {
      const b = s.buildings.find((x) => x.id === m.buildingId)
      const claimMins = b?.rules?.claim ?? 10
      s.claim = {
        queueKey: key, machineId: m.id, userId: queue[0].userId,
        endsAt: new Date(nowMs + claimMins * MIN).toISOString(),
      }
      s.queues = { ...s.queues, [key]: queue.slice(1) }
      notify(s, queue[0].userId, "It's your turn",
        `${m.label} is free. Claim it within ${claimMins} minutes.`,
        '/app/queue', 'queue')
    }
  }

  /* 2. bookings that were never checked in */
  s.bookings = s.bookings.map((b) => {
    if (b.status !== 'upcoming') return b
    const bld = s.buildings.find((x) => x.id === b.buildingId)
    const grace = b.graceUntil
      ? new Date(b.graceUntil)
      : new Date(new Date(b.start).getTime() + (bld?.rules?.grace ?? 10) * MIN)
    if (nowMs <= grace.getTime()) return b

    changed = true
    const machine = s.machines.find((x) => x.id === b.machineId)
    const strikes = (s.users.find((u) => u.id === b.userId)?.strikes || 0) + 1
    const limit = bld?.penalties?.strikes ?? 3
    const suspendDays = bld?.penalties?.days ?? 7
    s.users = s.users.map((u) => {
      if (u.id !== b.userId) return u
      return {
        ...u,
        strikes,
        status: strikes >= limit ? 'suspended' : u.status,
        suspendedUntil: strikes >= limit ? new Date(nowMs + suspendDays * DAY).toISOString() : u.suspendedUntil,
      }
    })
    if (machine && machine.reservedBookingId === b.id) {
      s.machines = s.machines.map((x) =>
        x.id === machine.id
          ? { ...x, status: 'available', reservedFor: null, reservedBookingId: null }
          : x,
      )
    }
    notify(s, b.userId, 'Booking released · no check-in',
      `Your booking on ${machine?.label || 'the machine'} was released because you did not check in within ${bld?.rules?.grace ?? 10} minutes. This counts as strike ${strikes} of ${limit}.`,
      '/app/bookings', 'strike')
    return { ...b, status: 'no-show' }
  })

  /* 3. expired claim windows */
  if (s.claim && new Date(s.claim.endsAt).getTime() <= nowMs) {
    changed = true
    const claim = s.claim
    const machine = s.machines.find((m) => m.id === claim.machineId)
    const bld = s.buildings.find((b) => b.id === machine?.buildingId)
    const strikes = (s.users.find((u) => u.id === claim.userId)?.strikes || 0) + 1
    const limit = bld?.penalties?.strikes ?? 3
    s.users = s.users.map((u) =>
      u.id === claim.userId
        ? {
            ...u,
            strikes,
            status: strikes >= limit ? 'suspended' : u.status,
            suspendedUntil:
              strikes >= limit
                ? new Date(nowMs + (bld?.penalties?.days ?? 7) * DAY).toISOString()
                : u.suspendedUntil,
          }
        : u,
    )
    s.machines = s.machines.map((m) =>
      m.id === claim.machineId ? { ...m, status: 'available', endedAt: null } : m,
    )
    notify(s, claim.userId, 'Claim window expired',
      `Your claim window for ${machine?.label || 'the machine'} expired. You were removed from the queue and 1 no-show strike was recorded.`,
      '/app/queue', 'strike')
    const queue = s.queues[claim.queueKey] || []
    s.claim = null
    if (queue.length) {
      const claimMins = bld?.rules?.claim ?? 10
      s.claim = {
        queueKey: claim.queueKey, machineId: claim.machineId, userId: queue[0].userId,
        endsAt: new Date(nowMs + claimMins * MIN).toISOString(),
      }
      s.queues = { ...s.queues, [claim.queueKey]: queue.slice(1) }
      notify(s, queue[0].userId, "It's your turn", 'A machine is free — claim it now.', '/app/queue', 'queue')
    }
  }

  /* 4. escalate unattended-laundry flags */
  s.flags = s.flags.map((f) => {
    if (f.status === 'open' && !f.escalated && new Date(f.escalatedAt).getTime() <= nowMs) {
      changed = true
      const bld = s.buildings.find((b) => b.id === f.buildingId)
      for (const staffId of bld?.staffIds || []) {
        notify(s, staffId, 'Unattended laundry escalated',
          `A flagged load is still uncollected after 15 minutes. Please move it to the holding shelf.`,
          '/staff/live', 'flag')
      }
      return { ...f, escalated: true, escalatedFor: nowIso }
    }
    return f
  })

  /* 5. announcement statuses */
  s.announcements = s.announcements.map((a) => {
    if (a.status === 'expired') return a
    const start = new Date(a.start).getTime()
    const end = new Date(a.end).getTime()
    const status = nowMs >= start && nowMs <= end ? 'live' : nowMs > end ? 'expired' : 'scheduled'
    if (status !== a.status) {
      changed = true
      return { ...a, status }
    }
    return a
  })

  return changed ? s : prev
}

export function AppProvider({ children }) {
  const [state, setState] = useState(loadState)
  const [toasts, setToasts] = useState([])
  const stateRef = useRef(state)
  const toastTimers = useRef(new Map())

  const commit = useCallback((next) => {
    stateRef.current = next
    setState(next)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage may be full or blocked */
    }
  }, [state])

  useEffect(() => {
    const iv = setInterval(() => {
      const next = advance(stateRef.current, Date.now())
      if (next !== stateRef.current) commit(next)
    }, 5000)
    return () => clearInterval(iv)
  }, [commit])

  const toast = useCallback((message, tone = 'success') => {
    const id = uid('toast')
    setToasts((t) => [...t, { id, message, tone }])
    const timer = setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
      toastTimers.current.delete(id)
    }, 3400)
    toastTimers.current.set(id, timer)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
    const timer = toastTimers.current.get(id)
    if (timer) clearTimeout(timer)
    toastTimers.current.delete(id)
  }, [])

  const user = useMemo(() => currentUser(state), [state])

  /* ------------------------------------------------------------------ auth */
  const signIn = useCallback((emailRaw, password) => {
    const s = stateRef.current
    const email = emailRaw.trim().toLowerCase()
    const attempts = s.authAttempts[email] || { count: 0, lockedUntil: 0 }
    if (attempts.lockedUntil && attempts.lockedUntil > Date.now()) {
      return { ok: false, error: 'locked', minutes: Math.ceil((attempts.lockedUntil - Date.now()) / MIN) }
    }
    const found = s.users.find((u) => u.email.toLowerCase() === email)
    if (!found || found.password !== password) {
      const count = (attempts.count || 0) + 1
      const locked = count >= 5
      commit({
        ...s,
        authAttempts: {
          ...s.authAttempts,
          [email]: { count: locked ? 0 : count, lockedUntil: locked ? Date.now() + 15 * MIN : 0 },
        },
      })
      return locked
        ? { ok: false, error: 'locked', minutes: 15 }
        : { ok: false, error: 'bad', remaining: 5 - count }
    }
    if (found.status === 'pending' || found.status === 'invited') {
      return { ok: false, error: 'pending' }
    }
    if (found.status === 'disabled') {
      return { ok: false, error: 'disabled' }
    }
    commit({
      ...s,
      session: { userId: found.id },
      authAttempts: { ...s.authAttempts, [email]: { count: 0, lockedUntil: 0 } },
    })
    return { ok: true, role: found.role, user: found }
  }, [commit])

  const signOut = useCallback(() => {
    const s = stateRef.current
    commit({ ...s, session: null })
  }, [commit])

  const register = useCallback((payload) => {
    const s = stateRef.current
    const errors = {}
    const name = (payload.fullName || '').trim()
    const email = (payload.email || '').trim().toLowerCase()
    const studentId = (payload.studentId || '').trim()
    const password = payload.password || ''

    if (name.length < 2) errors.fullName = 'Enter your full name.'
    if (!/^\d{9}$/.test(studentId)) errors.studentId = 'Student ID must be exactly 9 digits.'
    else if (s.users.some((u) => u.studentId === studentId)) errors.studentId = 'This student ID is already registered.'
    if (!/^[^\s@]+@kfupm\.edu\.sa$/.test(email)) errors.email = 'Use your @kfupm.edu.sa email.'
    else if (s.users.some((u) => u.email.toLowerCase() === email)) errors.email = 'This email is already registered.'
    if (!payload.buildingId) errors.buildingId = 'Choose your dormitory building.'
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      errors.password = 'At least 8 characters with a letter and a digit.'
    }
    if (password !== payload.confirmPassword) errors.confirmPassword = 'Passwords do not match.'
    if (Object.keys(errors).length) return { ok: false, errors }

    const id = uid('u')
    const newUser = {
      id,
      name: name.split(' ')[0] + ' ' + (name.split(' ')[1]?.[0] ? name.split(' ')[1][0] + '.' : ''),
      fullName: name,
      email,
      password,
      role: 'student',
      studentId,
      buildingId: payload.buildingId,
      room: (payload.room || '').trim(),
      status: 'pending',
      strikes: 0,
      suspendedUntil: null,
      createdAt: new Date().toISOString(),
      channels: {
        queueTurn: { email: true, inapp: true },
        bookingReminder: { email: true, inapp: true },
        cycleFinished: { email: true, inapp: true },
        unattended: { email: true, inapp: true },
        reportUpdates: { email: true, inapp: false },
      },
      reminderLead: 15,
    }
    commit({ ...s, users: [...s.users, newUser] })
    return { ok: true, userId: id }
  }, [commit])

  const activateAccount = useCallback((userId) => {
    const s = stateRef.current
    commit({
      ...s,
      users: s.users.map((u) => (u.id === userId ? { ...u, status: 'active' } : u)),
    })
    return { ok: true }
  }, [commit])

  const requestPasswordReset = useCallback(() => ({ ok: true }), [])

  const setNewPassword = useCallback((emailRaw, password, confirm) => {
    const s = stateRef.current
    const email = emailRaw.trim().toLowerCase()
    const errors = {}
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      errors.password = 'At least 8 characters with a letter and a digit.'
    }
    if (password !== confirm) errors.confirmPassword = 'Passwords do not match.'
    if (Object.keys(errors).length) return { ok: false, errors }
    commit({
      ...s,
      users: s.users.map((u) => (u.email.toLowerCase() === email ? { ...u, password } : u)),
    })
    return { ok: true }
  }, [commit])

  /* --------------------------------------------------------------- bookings */
  const bookSlot = useCallback((machineId, startISO) => {
    const s = stateRef.current
    const me = currentUser(s)
    if (!me) return { ok: false, error: 'auth' }
    const machine = s.machines.find((m) => m.id === machineId)
    const bld = s.buildings.find((b) => b.id === machine?.buildingId)
    if (!machine) return { ok: false, error: 'missing' }
    if (isSuspended(me)) return { ok: false, error: 'suspended' }
    if (machine.status === 'out-of-order' || machine.status === 'maintenance') {
      return { ok: false, error: 'unavailable' }
    }
    if (new Date(startISO).getTime() < Date.now() - MIN) return { ok: false, error: 'past' }

    const start = new Date(startISO)
    const end = new Date(start.getTime() + machine.cycle * MIN)

    const clash = s.bookings.some(
      (b) =>
        b.machineId === machineId &&
        (b.status === 'upcoming' || b.status === 'checked-in') &&
        overlaps(start, end, b.start, b.end),
    )
    if (clash || s.demo?.forceSlotConflict) {
      if (s.demo?.forceSlotConflict) commit({ ...s, demo: { ...s.demo, forceSlotConflict: false } })
      return { ok: false, error: 'taken' }
    }
    const maintenanceClash = s.maintenance.some((m) => {
      if (m.machineId !== machineId) return false
      const mEnd = new Date(new Date(m.start).getTime() + m.duration * MIN)
      return overlaps(start, end, m.start, mEnd)
    })
    if (maintenanceClash) return { ok: false, error: 'maintenance' }

    const maxActive = bld?.rules?.maxActive ?? 1
    const activeCount = s.bookings.filter(
      (b) => b.userId === me.id && b.status === 'upcoming' && new Date(b.end) > new Date(),
    ).length
    if (activeCount >= maxActive) return { ok: false, error: 'limit', max: maxActive }

    const id = `b-${(s.counters?.booking || 2500) + 1}`
    const booking = {
      id, userId: me.id, machineId, buildingId: machine.buildingId,
      start: start.toISOString(), end: end.toISOString(),
      status: 'upcoming', createdAt: new Date().toISOString(), source: 'booking',
    }
    let machines = s.machines
    if (start.getTime() - Date.now() <= 2 * 60 * MIN && machine.status === 'available') {
      machines = s.machines.map((m) =>
        m.id === machineId ? { ...m, status: 'reserved', reservedFor: start.toISOString(), reservedBookingId: id } : m,
      )
    }
    commit({
      ...s,
      bookings: [...s.bookings, booking],
      machines,
      counters: { ...s.counters, booking: (s.counters?.booking || 2500) + 1 },
    })
    return { ok: true, booking }
  }, [commit])

  const rescheduleBooking = useCallback((bookingId, startISO) => {
    const s = stateRef.current
    const me = currentUser(s)
    if (!me) return { ok: false, error: 'auth' }
    const booking = s.bookings.find((b) => b.id === bookingId)
    if (!booking || booking.userId !== me.id) return { ok: false, error: 'missing' }
    if (booking.status !== 'upcoming') return { ok: false, error: 'state' }
    const machine = s.machines.find((m) => m.id === booking.machineId)
    if (!machine) return { ok: false, error: 'missing' }
    if (isSuspended(me)) return { ok: false, error: 'suspended' }
    const start = new Date(startISO)
    if (start.getTime() < Date.now() - MIN) return { ok: false, error: 'past' }
    const end = new Date(start.getTime() + machine.cycle * MIN)
    const clash = s.bookings.some(
      (b) =>
        b.id !== bookingId &&
        b.machineId === machine.id &&
        (b.status === 'upcoming' || b.status === 'checked-in') &&
        overlaps(start, end, b.start, b.end),
    )
    if (clash) return { ok: false, error: 'taken' }
    const maintenanceClash = s.maintenance.some((m) => {
      if (m.machineId !== machine.id) return false
      const mEnd = new Date(new Date(m.start).getTime() + m.duration * MIN)
      return overlaps(start, end, m.start, mEnd)
    })
    if (maintenanceClash) return { ok: false, error: 'maintenance' }
    const near = start.getTime() - Date.now() <= 2 * 60 * MIN
    const machines = s.machines.map((m) => {
      if (m.id !== machine.id) return m
      if (near) return { ...m, status: 'reserved', reservedFor: start.toISOString(), reservedBookingId: bookingId }
      if (m.reservedBookingId === bookingId) return { ...m, status: 'available', reservedFor: null, reservedBookingId: null }
      return m
    })
    const bookings = s.bookings.map((b) =>
      b.id === bookingId ? { ...b, start: start.toISOString(), end: end.toISOString() } : b,
    )
    commit({ ...s, bookings, machines })
    return { ok: true }
  }, [commit])

  const cancelBooking = useCallback((bookingId) => {
    const s = stateRef.current
    const me = currentUser(s)
    const booking = s.bookings.find((b) => b.id === bookingId)
    if (!booking) return { ok: false, error: 'missing' }
    if (booking.status !== 'upcoming') return { ok: false, error: 'state' }
    const machines = s.machines.map((m) =>
      m.reservedBookingId === bookingId ? { ...m, status: 'available', reservedFor: null, reservedBookingId: null } : m,
    )
    const bookings = s.bookings.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    const nextState = { ...s, bookings, machines }
    if (me && me.id !== booking.userId) {
      notify(nextState, booking.userId, 'Booking cancelled',
        'A staff member cancelled your booking. The slot has been released.', '/app/bookings', 'booking')
    }
    commit(nextState)
    return { ok: true }
  }, [commit])

  const checkIn = useCallback((bookingId, code) => {
    const s = stateRef.current
    const me = currentUser(s)
    const booking = s.bookings.find((b) => b.id === bookingId)
    if (!booking || booking.userId !== me?.id) return { ok: false, error: 'missing' }
    if (booking.status !== 'upcoming') return { ok: false, error: 'state' }
    const machine = s.machines.find((m) => m.id === booking.machineId)
    const cleaned = (code || '').trim().toUpperCase()
    if (!cleaned) return { ok: false, error: 'empty' }
    if (machine.qr !== cleaned) return { ok: false, error: 'wrong', scanned: cleaned }
    if (machine.status === 'out-of-order' || machine.status === 'maintenance') {
      return { ok: false, error: 'unavailable' }
    }
    const now = Date.now()
    const bld = s.buildings.find((b) => b.id === booking.buildingId)
    const graceMins = bld?.rules?.grace ?? 10
    const startMs = new Date(booking.start).getTime()
    if (now < startMs) return { ok: false, error: 'early', opensAt: booking.start }
    if (now > startMs + graceMins * MIN) return { ok: false, error: 'late' }
    const bookings = s.bookings.map((b) =>
      b.id === bookingId ? { ...b, status: 'checked-in', checkedInAt: new Date(now).toISOString(), graceUntil: null } : b,
    )
    const machines = s.machines.map((m) =>
      m.id === machine.id
        ? { ...m, status: 'in-use', startedAt: new Date(now).toISOString(), endsAt: booking.end, reservedFor: null, reservedBookingId: null }
        : m,
    )
    const nextState = { ...s, bookings, machines }
    notify(nextState, me.id, `Checked in · ${machine.label}`,
      `Your cycle ends at about ${new Date(booking.end).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}. We will notify you when it is done.`,
      '/app/bookings', 'booking')
    commit(nextState)
    return { ok: true, machine, booking }
  }, [commit])

  /* ----------------------------------------------------------------- queues */
  const joinQueue = useCallback((type) => {
    const s = stateRef.current
    const me = currentUser(s)
    if (!me) return { ok: false, error: 'auth' }
    if (isSuspended(me)) return { ok: false, error: 'suspended' }
    if (s.claim?.userId === me.id) return { ok: false, error: 'claiming' }
    const key = `${me.buildingId}-${type}`
    if ((s.queues[key] || []).some((q) => q.userId === me.id)) return { ok: false, error: 'already' }
    const list = [...(s.queues[key] || []), { userId: me.id, joinedAt: new Date().toISOString() }]
    commit({ ...s, queues: { ...s.queues, [key]: list } })
    return { ok: true, position: list.length }
  }, [commit])

  const leaveQueue = useCallback((type) => {
    const s = stateRef.current
    const me = currentUser(s)
    if (!me) return { ok: false }
    const key = `${me.buildingId}-${type}`
    const list = (s.queues[key] || []).filter((q) => q.userId !== me.id)
    commit({ ...s, queues: { ...s.queues, [key]: list } })
    return { ok: true }
  }, [commit])

  const claimTurn = useCallback(() => {
    const s = stateRef.current
    const me = currentUser(s)
    if (!s.claim || s.claim.userId !== me?.id) return { ok: false, error: 'no-claim' }
    const machine = s.machines.find((m) => m.id === s.claim.machineId)
    const bld = s.buildings.find((b) => b.id === machine?.buildingId)
    const limit = bld?.rules?.maxActive ?? 1
    const activeCount = s.bookings.filter(
      (b) => b.userId === me.id && b.status === 'upcoming' && new Date(b.end) > new Date(),
    ).length
    if (activeCount >= limit) return { ok: false, error: 'limit', max: limit }
    const id = `b-${(s.counters?.booking || 2500) + 1}`
    const start = Date.now()
    const booking = {
      id, userId: me.id, machineId: machine.id, buildingId: machine.buildingId,
      start: new Date(start).toISOString(),
      end: new Date(start + machine.cycle * MIN).toISOString(),
      status: 'upcoming', createdAt: new Date().toISOString(), source: 'queue',
    }
    commit({
      ...s,
      bookings: [...s.bookings, booking],
      machines: s.machines.map((m) =>
        m.id === machine.id
          ? { ...m, status: 'reserved', reservedFor: booking.start, reservedBookingId: id, endedAt: null }
          : m,
      ),
      claim: null,
      counters: { ...s.counters, booking: (s.counters?.booking || 2500) + 1 },
    })
    return { ok: true, booking }
  }, [commit])

  const skipTurn = useCallback(() => {
    const s = stateRef.current
    const me = currentUser(s)
    if (!s.claim || s.claim.userId !== me?.id) return { ok: false }
    const claim = s.claim
    const queue = s.queues[claim.queueKey] || []
    let nextClaim = null
    let queues = s.queues
    if (queue.length) {
      const bld = s.buildings.find((b) => b.id === claim.queueKey.split('-')[0])
      nextClaim = {
        queueKey: claim.queueKey, machineId: claim.machineId, userId: queue[0].userId,
        endsAt: new Date(Date.now() + (bld?.rules?.claim ?? 10) * MIN).toISOString(),
      }
      queues = { ...s.queues, [claim.queueKey]: queue.slice(1) }
    }
    const nextState = { ...s, claim: nextClaim, queues }
    if (nextClaim) notify(nextState, nextClaim.userId, "It's your turn", 'A machine is free — claim it now.', '/app/queue', 'queue')
    commit(nextState)
    return { ok: true }
  }, [commit])

  /* ---------------------------------------------------------------- reports */
  const reportFault = useCallback((payload) => {
    const s = stateRef.current
    const me = currentUser(s)
    const machine = s.machines.find((m) => m.id === payload.machineId)
    const errors = {}
    if (!machine) errors.machineId = 'Choose a machine.'
    if (!payload.category) errors.category = 'Choose a category.'
    const desc = (payload.description || '').trim()
    if (desc.length < 10) errors.description = 'Description must be at least 10 characters.'
    if (desc.length > 500) errors.description = 'Description must be 500 characters or fewer.'
    if (Object.keys(errors).length) return { ok: false, errors }

    const number = (s.counters?.report || 1045) + 1
    const report = {
      id: `R-${number}`, reportNo: `R-${number}`,
      machineId: machine.id, buildingId: machine.buildingId, userId: me.id,
      category: payload.category, description: desc,
      photoName: payload.photoName || '', status: 'open', priority: null,
      createdAt: new Date().toISOString(), staffNote: '', dismissReason: '',
    }
    const nextState = { ...s, reports: [report, ...s.reports] }
    nextState.machines = s.machines.map((m) =>
      m.id === machine.id
        ? { ...m, status: 'out-of-order', faultNote: `Reported: ${payload.category.toLowerCase()}. Awaiting triage.`, outSince: new Date().toISOString() }
        : m,
    )
    const bld = s.buildings.find((b) => b.id === machine.buildingId)
    for (const staffId of bld?.staffIds || []) {
      notify(nextState, staffId, `New fault report · ${machine.label}`,
        `A student reported “${payload.category}” in Building ${machine.buildingId}.`,
        '/staff/reports', 'report')
    }
    nextState.counters = { ...s.counters, report: number }
    commit(nextState)
    return { ok: true, report }
  }, [commit])

  const flagUnattended = useCallback((machineId) => {
    const s = stateRef.current
    const me = currentUser(s)
    const machine = s.machines.find((m) => m.id === machineId)
    if (!machine) return { ok: false, error: 'missing' }
    if (machine.status !== 'finished') return { ok: false, error: 'running', machine }
    const existing = s.flags.find((f) => f.machineId === machineId && f.status === 'open')
    if (existing) return { ok: false, error: 'already', flag: existing, machine }
    const lastBooking = [...s.bookings]
      .filter((b) => b.machineId === machineId && (b.status === 'completed' || b.status === 'checked-in'))
      .sort((a, b) => new Date(b.start) - new Date(a.start))[0]
    const id = `f-${(s.counters?.flag || 1) + 1}`
    const flag = {
      id, machineId, buildingId: machine.buildingId, flaggedBy: me.id,
      at: new Date().toISOString(),
      escalatedAt: new Date(Date.now() + 15 * MIN).toISOString(),
      status: 'open', ownerId: lastBooking?.userId || null, escalated: false,
    }
    const nextState = { ...s, flags: [flag, ...s.flags], counters: { ...s.counters, flag: (s.counters?.flag || 1) + 1 } }
    if (lastBooking?.userId) {
      notify(nextState, lastBooking.userId, `Please collect your laundry · ${machine.label}`,
        `Your cycle ended and the load is still in ${machine.label}. Please collect it now.`,
        '/app/bookings', 'flag')
    }
    commit(nextState)
    return { ok: true, flag }
  }, [commit])

  /* ---------------------------------------------------------------- student settings */
  const saveSettings = useCallback((payload) => {
    const s = stateRef.current
    const me = currentUser(s)
    if (!me) return { ok: false }
    const required = ['queueTurn', 'cycleFinished']
    for (const key of required) {
      const ch = payload.channels[key]
      if (!ch.email && !ch.inapp) {
        return { ok: false, error: 'required', field: key }
      }
    }
    const users = s.users.map((u) =>
      u.id === me.id ? { ...u, channels: payload.channels, reminderLead: payload.reminderLead } : u,
    )
    commit({ ...s, users })
    return { ok: true }
  }, [commit])

  /* ------------------------------------------------------------------- staff */
  const confirmReport = useCallback((reportId, priority, note) => {
    const s = stateRef.current
    const me = currentUser(s)
    const report = s.reports.find((r) => r.id === reportId)
    if (!report || report.status !== 'open') return { ok: false }
    const machine = s.machines.find((m) => m.id === report.machineId)
    const future = s.bookings.filter(
      (b) => b.machineId === report.machineId && b.status === 'upcoming' && new Date(b.start) > new Date(),
    )
    const bookings = s.bookings.map((b) =>
      future.some((f) => f.id === b.id) ? { ...b, status: 'cancelled' } : b,
    )
    const nextState = { ...s, bookings }
    nextState.reports = s.reports.map((r) =>
      r.id === reportId ? { ...r, status: 'confirmed', priority, staffNote: note } : r,
    )
    nextState.machines = s.machines.map((m) =>
      m.id === report.machineId
        ? { ...m, status: 'out-of-order', faultNote: `Reported: ${report.category.toLowerCase()}. Under repair.`, outSince: m.outSince || new Date().toISOString() }
        : m,
    )
    for (const b of future) {
      notify(nextState, b.userId, 'Booking cancelled · machine out of order',
        `Your booking on ${machine.label} was cancelled because the machine needs repair. Please book another slot.`,
        '/app/bookings', 'booking')
    }
    notify(nextState, report.userId, 'Report confirmed',
      `Your report on ${machine.label} was confirmed. The machine is now out of order.`,
      '/app/reports', 'report')
    logAction(nextState, me?.name || 'Staff', `Confirmed ${report.reportNo} on ${machine.label} (${priority}).`)
    commit(nextState)
    return { ok: true, cancelled: future.length, machine }
  }, [commit])

  const dismissReport = useCallback((reportId, reason, note = '') => {
    const s = stateRef.current
    const me = currentUser(s)
    if (!reason) return { ok: false, error: 'reason' }
    const report = s.reports.find((r) => r.id === reportId)
    if (!report) return { ok: false }
    const machine = s.machines.find((m) => m.id === report.machineId)
    const reports = s.reports.map((r) =>
      r.id === reportId ? { ...r, status: 'dismissed', dismissReason: reason, staffNote: note } : r,
    )
    const stillOpen = reports.some((r) => r.machineId === report.machineId && r.status === 'open')
    const nextState = { ...s, reports }
    if (machine && !stillOpen && machine.status === 'out-of-order') {
      nextState.machines = s.machines.map((m) =>
        m.id === machine.id ? { ...m, status: 'available', faultNote: null, outSince: null } : m,
      )
    }
    notify(nextState, report.userId, 'Report dismissed',
      `Your report on ${machine.label} was reviewed and dismissed: ${reason}.`,
      '/app/reports', 'report')
    logAction(nextState, me?.name || 'Staff', `Dismissed ${report.reportNo} on ${machine.label} (${reason}).`)
    commit(nextState)
    return { ok: true }
  }, [commit])

  const logRepair = useCallback((machineId, payload) => {
    const s = stateRef.current
    const me = currentUser(s)
    const machine = s.machines.find((m) => m.id === machineId)
    if (!machine) return { ok: false }
    const errors = {}
    if ((payload.work || '').trim().length < 10) errors.work = 'Describe the work performed (at least 10 characters).'
    if (!(Number(payload.hours) > 0)) errors.hours = 'Must be more than 0.'
    if (payload.returnToService && Object.keys(errors).length) return { ok: false, errors }

    const parts = (payload.parts || []).filter((p) => p.qty > 0)
    let inventory = s.inventory
    let deducted = []
    for (const p of parts) {
      const part = inventory.find((x) => x.id === p.id)
      if (part && part.qty >= p.qty) {
        inventory = inventory.map((x) => (x.id === p.id ? { ...x, qty: x.qty - p.qty } : x))
        deducted.push(`${part.name} ×${p.qty}`)
      }
    }

    const h = {
      id: uid('h'), machineId, buildingId: machine.buildingId, date: new Date().toISOString(),
      type: 'Repair', details: payload.work.trim(), parts: deducted.join(', ') || '—',
      by: me?.name || 'Staff', downtime: machine.outSince ? `${Math.max(1, Math.round((Date.now() - new Date(machine.outSince)) / 3600000))} h` : '',
    }
    const nextState = { ...s, inventory, history: [h, ...s.history] }
    nextState.reports = s.reports.map((r) =>
      r.machineId === machineId && ['open', 'confirmed', 'in-repair'].includes(r.status)
        ? { ...r, status: 'resolved', staffNote: r.staffNote || payload.work.trim() }
        : r,
    )
    if (payload.returnToService) {
      nextState.machines = s.machines.map((m) =>
        m.id === machineId ? { ...m, status: 'available', faultNote: null, outSince: null } : m,
      )
    } else {
      nextState.machines = s.machines.map((m) =>
        m.id === machineId ? { ...m, status: 'maintenance' } : m,
      )
    }
    const reporterIds = [...new Set(s.reports.filter((r) => r.machineId === machineId && ['open', 'confirmed', 'in-repair'].includes(r.status)).map((r) => r.userId))]
    for (const userId of reporterIds) {
      notify(nextState, userId, payload.returnToService ? 'Machine repaired' : 'Repair update',
        payload.returnToService
          ? `Your reported fault on ${machine.label} has been repaired and the machine is back in service.`
          : `Your reported fault on ${machine.label} is being repaired.`,
        '/app/reports', 'report')
    }
    logAction(nextState, me?.name || 'Staff', `${payload.returnToService ? 'Returned' : 'Logged repair for'} ${machine.label}.`)
    commit(nextState)
    return { ok: true, machine, deducted, closedReports: reporterIds.length }
  }, [commit])

  const scheduleMaintenance = useCallback((payload) => {
    const s = stateRef.current
    const machine = s.machines.find((m) => m.id === payload.machineId)
    if (!machine) return { ok: false }
    const duration = Number(payload.duration)
    if (!(duration >= 15 && duration <= 480)) return { ok: false, error: 'duration' }
    const start = new Date(payload.start)
    const end = new Date(start.getTime() + duration * MIN)
    const clash = s.maintenance.some((m) => {
      if (m.machineId !== payload.machineId) return false
      const mEnd = new Date(new Date(m.start).getTime() + m.duration * MIN)
      return overlaps(start, end, m.start, mEnd)
    })
    if (clash) return { ok: false, error: 'overlap' }

    const affected = s.bookings.filter(
      (b) => b.machineId === payload.machineId && b.status === 'upcoming' && overlaps(start, end, b.start, b.end),
    )
    let bookings = s.bookings
    let moved = 0
    let cancelled = 0
    for (const b of affected) {
      const alt = s.machines.find(
        (m) =>
          m.id !== machine.id && m.buildingId === machine.buildingId && m.type === machine.type &&
          !['out-of-order', 'maintenance'].includes(m.status) &&
          !s.bookings.some(
            (x) => x.machineId === m.id && (x.status === 'upcoming' || x.status === 'checked-in') && overlaps(start, end, x.start, x.end),
          ),
      )
      if (alt) {
        bookings = bookings.map((x) => (x.id === b.id ? { ...x, machineId: alt.id } : x))
        moved += 1
      } else {
        bookings = bookings.map((x) => (x.id === b.id ? { ...x, status: 'cancelled' } : x))
        cancelled += 1
      }
    }
    const id = `m-${(s.counters?.maintenance || 2) + 1}`
    const nextState = {
      ...s,
      bookings,
      maintenance: [
        ...s.maintenance,
        {
          id, machineId: machine.id, buildingId: machine.buildingId,
          start: start.toISOString(), duration, note: payload.note || 'Maintenance',
          createdAt: new Date().toISOString(),
        },
      ],
      counters: { ...s.counters, maintenance: (s.counters?.maintenance || 2) + 1 },
    }
    for (const b of affected) {
      notify(nextState, b.userId, 'Maintenance window',
        `Your booking on ${machine.label} was affected by scheduled maintenance. ${moved ? 'It was moved to another machine.' : 'It had to be cancelled.'}`,
        '/app/bookings', 'booking')
    }
    commit(nextState)
    return { ok: true, moved, cancelled }
  }, [commit])

  const releaseBooking = useCallback((bookingId, reason) => {
    const s = stateRef.current
    const me = currentUser(s)
    if (!reason) return { ok: false, error: 'reason' }
    const booking = s.bookings.find((b) => b.id === bookingId)
    if (!booking) return { ok: false }
    const nextState = {
      ...s,
      bookings: s.bookings.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b)),
      machines: s.machines.map((m) =>
        m.reservedBookingId === bookingId ? { ...m, status: 'available', reservedFor: null, reservedBookingId: null } : m,
      ),
    }
    notify(nextState, booking.userId, 'Booking released by staff',
      `Your booking was released: ${reason}.`, '/app/bookings', 'booking')
    logAction(nextState, me?.name || 'Staff', `Released booking ${bookingId} (${reason}).`)
    commit(nextState)
    return { ok: true }
  }, [commit])

  const extendCheckIn = useCallback((bookingId) => {
    const s = stateRef.current
    const me = currentUser(s)
    const booking = s.bookings.find((b) => b.id === bookingId)
    if (!booking) return { ok: false }
    const bld = s.buildings.find((b) => b.id === booking.buildingId)
    const base = booking.graceUntil
      ? new Date(booking.graceUntil)
      : new Date(new Date(booking.start).getTime() + (bld?.rules?.grace ?? 10) * MIN)
    const graceUntil = new Date(base.getTime() + 10 * MIN).toISOString()
    const nextState = {
      ...s,
      bookings: s.bookings.map((b) => (b.id === bookingId ? { ...b, graceUntil } : b)),
    }
    notify(nextState, booking.userId, 'Check-in extended',
      'Staff extended your check-in window by 10 minutes.', '/app/bookings', 'booking')
    logAction(nextState, me?.name || 'Staff', `Extended check-in for booking ${bookingId} by 10 minutes.`)
    commit(nextState)
    return { ok: true }
  }, [commit])

  const resolveFlag = useCallback((flagId, reason = '') => {
    const s = stateRef.current
    const me = currentUser(s)
    const flag = s.flags.find((f) => f.id === flagId)
    if (!flag) return { ok: false }
    const machine = s.machines.find((m) => m.id === flag.machineId)
    const nextState = {
      ...s,
      flags: s.flags.map((f) => (f.id === flagId ? { ...f, status: 'resolved' } : f)),
      machines: s.machines.map((m) =>
        m.id === flag.machineId ? { ...m, status: 'available', endedAt: null } : m,
      ),
    }
    if (flag.ownerId) {
      notify(nextState, flag.ownerId, 'Laundry moved to holding shelf',
        `Your load from ${machine?.label || 'the machine'} was moved to the holding shelf.`, '/app/bookings', 'flag')
    }
    logAction(nextState, me?.name || 'Staff', `Resolved unattended-laundry flag on ${machine?.label}${reason ? ` (${reason})` : ''}.`)
    commit(nextState)
    return { ok: true }
  }, [commit])

  const removeStrike = useCallback((userId, reason) => {
    const s = stateRef.current
    const me = currentUser(s)
    if (!reason) return { ok: false, error: 'reason' }
    const target = s.users.find((u) => u.id === userId)
    const nextState = {
      ...s,
      users: s.users.map((u) => (u.id === userId ? { ...u, strikes: Math.max(0, (u.strikes || 0) - 1) } : u)),
    }
    notify(nextState, userId, 'Strike removed',
      'A staff member removed one no-show strike from your account.', '/app/history', 'strike')
    logAction(nextState, me?.name || 'Staff', `Removed a strike from ${target?.name} (${reason}).`)
    commit(nextState)
    return { ok: true }
  }, [commit])

  const publishAnnouncement = useCallback((payload) => {
    const s = stateRef.current
    const me = currentUser(s)
    const errors = {}
    const title = (payload.title || '').trim()
    const message = (payload.message || '').trim()
    if (!title) errors.title = 'Title is required.'
    if (title.length > 80) errors.title = 'Title must be 80 characters or fewer.'
    if (!message) errors.message = 'Message is required.'
    if (message.length > 500) errors.message = 'Message must be 500 characters or fewer.'
    if (!payload.buildingIds?.length) errors.buildings = 'Choose at least one building.'
    if (!payload.start || !payload.end) errors.time = 'Start and end are required.'
    else if (new Date(payload.end) <= new Date(payload.start)) errors.end = 'End must be after start.'
    if (Object.keys(errors).length) return { ok: false, errors }

    const now = Date.now()
    const start = new Date(payload.start)
    const end = new Date(payload.end)
    const status = now >= start.getTime() && now <= end.getTime() ? 'live' : now > end.getTime() ? 'expired' : 'scheduled'
    const id = `a-${(s.counters?.announcement || 3) + 1}`
    let bookings = s.bookings
    let moved = 0
    let cancelled = 0
    if (payload.blockBookings) {
      const affected = s.bookings.filter(
        (b) => payload.buildingIds.includes(b.buildingId) && b.status === 'upcoming' && overlaps(start, end, b.start, b.end),
      )
      for (const b of affected) {
        bookings = bookings.map((x) => (x.id === b.id ? { ...x, status: 'cancelled' } : x))
        cancelled += 1
      }
    }
    const nextState = {
      ...s,
      bookings,
      announcements: [
        {
          id, title, message, buildingIds: payload.buildingIds,
          start: start.toISOString(), end: end.toISOString(),
          blockBookings: !!payload.blockBookings, status,
          authorId: me?.id, createdAt: new Date().toISOString(),
        },
        ...s.announcements,
      ],
      counters: { ...s.counters, announcement: (s.counters?.announcement || 3) + 1 },
    }
    commit(nextState)
    return { ok: true, moved, cancelled }
  }, [commit])

  const endAnnouncement = useCallback((id) => {
    const s = stateRef.current
    commit({
      ...s,
      announcements: s.announcements.map((a) => (a.id === id ? { ...a, status: 'expired' } : a)),
    })
    return { ok: true }
  }, [commit])

  const addPart = useCallback((payload) => {
    const s = stateRef.current
    const errors = {}
    const name = (payload.name || '').trim()
    if (!name) errors.name = 'Part name is required.'
    else if (s.inventory.some((p) => p.name.toLowerCase() === name.toLowerCase())) errors.name = 'A part with this name already exists.'
    const qty = Number(payload.qty)
    if (!Number.isInteger(qty) || qty < 0) errors.qty = 'Quantity must be a whole number ≥ 0.'
    const reorder = Number(payload.reorder)
    if (!Number.isInteger(reorder) || reorder < 0) errors.reorder = 'Reorder level is required.'
    if (Object.keys(errors).length) return { ok: false, errors }
    const part = { id: uid('p'), name, models: payload.models || [], qty, reorder }
    commit({ ...s, inventory: [...s.inventory, part] })
    return { ok: true, part }
  }, [commit])

  const recordStock = useCallback((id, qty) => {
    const s = stateRef.current
    const add = Number(qty)
    if (!Number.isInteger(add) || add <= 0) return { ok: false }
    commit({
      ...s,
      inventory: s.inventory.map((p) => (p.id === id ? { ...p, qty: p.qty + add } : p)),
    })
    return { ok: true }
  }, [commit])

  /* ------------------------------------------------------------------- admin */
  const addBuilding = useCallback((payload) => {
    const s = stateRef.current
    const errors = {}
    const id = (payload.id || '').trim()
    if (!/^\d{3,4}$/.test(id)) errors.id = 'Building number must be 3–4 digits.'
    else if (s.buildings.some((b) => b.id === id)) errors.id = `Building ${id} already exists.`
    if (!(payload.name || '').trim()) errors.name = 'Display name is required.'
    if (!payload.opens || !payload.closes) errors.hours = 'Opening and closing times are required.'
    else if (payload.opens >= payload.closes && payload.closes !== '24:00') {
      errors.closes = 'Opening time must be before closing time.'
    }
    if (Object.keys(errors).length) return { ok: false, errors }
    const building = {
      id, name: payload.name.trim(), location: (payload.location || '').trim(),
      opens: payload.opens, closes: payload.closes, staffIds: [],
      rules: { grace: 10, claim: 10, maxActive: 1, horizon: 2 },
      penalties: { strikes: 3, days: 7, reset: 'semester' },
    }
    commit({ ...s, buildings: [...s.buildings, building] })
    return { ok: true, building }
  }, [commit])

  const updateBuilding = useCallback((id, patch) => {
    const s = stateRef.current
    commit({
      ...s,
      buildings: s.buildings.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })
    return { ok: true }
  }, [commit])

  const removeBuilding = useCallback((id) => {
    const s = stateRef.current
    const machines = s.machines.filter((m) => m.buildingId === id)
    const bookings = s.bookings.filter(
      (b) => b.buildingId === id && b.status === 'upcoming' && new Date(b.start) > new Date(),
    )
    if (machines.length || bookings.length) {
      return { ok: false, error: 'blocked', machines: machines.length, bookings: bookings.length }
    }
    commit({ ...s, buildings: s.buildings.filter((b) => b.id !== id) })
    return { ok: true }
  }, [commit])

  const addMachine = useCallback((payload) => {
    const s = stateRef.current
    const errors = {}
    const label = (payload.label || '').trim().toUpperCase()
    const machineId = `${payload.buildingId}-${label}`
    if (!label) errors.label = 'Label is required.'
    else if (s.machines.some((m) => m.buildingId === payload.buildingId && m.label === label)) {
      errors.label = `${label} already exists in Building ${payload.buildingId}.`
    }
    const cycle = Number(payload.cycle)
    if (!(cycle >= 15 && cycle <= 120)) errors.cycle = 'Must be 15–120.'
    if (Object.keys(errors).length) return { ok: false, errors }
    const machine = {
      id: machineId, buildingId: payload.buildingId, label,
      type: payload.type, model: payload.model || (payload.type === 'washer' ? 'LG WM3400' : 'Samsung DV45'),
      cycle, status: payload.status || 'available',
      qr: `${payload.buildingId}-${label}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      lastServiced: new Date().toISOString(), endsAt: null, startedAt: null,
      reservedFor: null, reservedBookingId: null, endedAt: null, faultNote: null, outSince: null,
    }
    commit({ ...s, machines: [...s.machines, machine] })
    return { ok: true, machine }
  }, [commit])

  const updateMachine = useCallback((machineId, patch) => {
    const s = stateRef.current
    commit({
      ...s,
      machines: s.machines.map((m) => (m.id === machineId ? { ...m, ...patch } : m)),
    })
    return { ok: true }
  }, [commit])

  const retireMachine = useCallback((machineId) => {
    const s = stateRef.current
    const machine = s.machines.find((m) => m.id === machineId)
    if (!machine) return { ok: false }
    const future = s.bookings.filter((b) => b.machineId === machineId && b.status === 'upcoming')
    const nextState = {
      ...s,
      machines: s.machines.filter((m) => m.id !== machineId),
      bookings: s.bookings.map((b) => (future.some((f) => f.id === b.id) ? { ...b, status: 'cancelled' } : b)),
    }
    for (const b of future) {
      notify(nextState, b.userId, 'Machine retired',
        `Your booking on ${machine.label} was cancelled because the machine was retired.`, '/app/bookings', 'booking')
    }
    commit(nextState)
    return { ok: true, cancelled: future.length }
  }, [commit])

  const createUser = useCallback((payload) => {
    const s = stateRef.current
    const errors = {}
    const name = (payload.name || '').trim()
    const email = (payload.email || '').trim().toLowerCase()
    if (!name) errors.name = 'Full name is required.'
    if (!/^[^\s@]+@kfupm\.edu\.sa$/.test(email)) errors.email = 'Must be a @kfupm.edu.sa email.'
    else if (s.users.some((u) => u.email.toLowerCase() === email)) errors.email = 'This email is already registered.'
    if (!['staff', 'admin'].includes(payload.role)) errors.role = 'Choose a role.'
    if (Object.keys(errors).length) return { ok: false, errors }
    const user = {
      id: uid('u'), name, fullName: name, email, password: 'washq1234',
      role: payload.role, status: 'invited', buildingIds: [], createdAt: new Date().toISOString(),
    }
    commit({ ...s, users: [...s.users, user] })
    return { ok: true, user }
  }, [commit])

  const assignBuildings = useCallback((userId, buildingIds, force = false) => {
    const s = stateRef.current
    const target = s.users.find((u) => u.id === userId)
    if (!target) return { ok: false }
    const buildings = s.buildings.map((b) => {
      const has = b.staffIds.includes(userId)
      const should = buildingIds.includes(b.id)
      if (has && !should) return { ...b, staffIds: b.staffIds.filter((id) => id !== userId) }
      if (!has && should) return { ...b, staffIds: [...b.staffIds, userId] }
      return b
    })
    const uncovered = buildings.filter(
      (b) => b.staffIds.length === 0 && !force,
    )
    if (uncovered.length) {
      return { ok: false, error: 'coverage', uncovered: uncovered.map((b) => b.id) }
    }
    commit({
      ...s,
      buildings,
      users: s.users.map((u) => (u.id === userId ? { ...u, buildingIds } : u)),
    })
    return { ok: true }
  }, [commit])

  const disableUser = useCallback((userId) => {
    const s = stateRef.current
    const me = currentUser(s)
    if (me?.id === userId) return { ok: false, error: 'self' }
    const activeAdmins = s.users.filter((u) => u.role === 'admin' && u.status === 'active' && u.id !== userId)
    const target = s.users.find((u) => u.id === userId)
    if (target?.role === 'admin' && activeAdmins.length === 0) return { ok: false, error: 'last-admin' }
    commit({
      ...s,
      users: s.users.map((u) => (u.id === userId ? { ...u, status: 'disabled' } : u)),
    })
    return { ok: true }
  }, [commit])

  const resetUserPassword = useCallback(() => ({ ok: true }), [])

  const saveRules = useCallback((buildingId, rules) => {
    const s = stateRef.current
    const errors = {}
    if (!(rules.grace >= 5 && rules.grace <= 30)) errors.grace = 'Must be between 5 and 30.'
    if (!(rules.claim >= 5 && rules.claim <= 30)) errors.claim = 'Must be between 5 and 30.'
    if (!(rules.maxActive >= 1 && rules.maxActive <= 3)) errors.maxActive = 'Must be between 1 and 3.'
    if (!(rules.horizon >= 1 && rules.horizon <= 7)) errors.horizon = 'Must be between 1 and 7.'
    if (!rules.opens || !rules.closes) errors.hours = 'Opening and closing times are required.'
    else if (rules.opens >= rules.closes && rules.closes !== '24:00') errors.closes = 'Opening time must be before closing time.'
    if (Object.keys(errors).length) return { ok: false, errors }
    commit({
      ...s,
      buildings: s.buildings.map((b) =>
        b.id === buildingId ? { ...b, rules: { ...b.rules, ...rules } } : b,
      ),
    })
    return { ok: true }
  }, [commit])

  const savePenalties = useCallback((buildingId, penalties) => {
    const s = stateRef.current
    const errors = {}
    if (!(penalties.strikes >= 2 && penalties.strikes <= 10)) errors.strikes = 'Must be between 2 and 10.'
    if (!(penalties.days >= 1 && penalties.days <= 30)) errors.days = 'Must be between 1 and 30.'
    if (Object.keys(errors).length) return { ok: false, errors }
    commit({
      ...s,
      buildings: s.buildings.map((b) =>
        b.id === buildingId ? { ...b, penalties: { ...b.penalties, ...penalties } } : b,
      ),
    })
    return { ok: true }
  }, [commit])

  const liftSuspension = useCallback((userId, reason) => {
    const s = stateRef.current
    const me = currentUser(s)
    if (!reason) return { ok: false, error: 'reason' }
    const target = s.users.find((u) => u.id === userId)
    const nextState = {
      ...s,
      users: s.users.map((u) =>
        u.id === userId ? { ...u, suspendedUntil: null, status: 'active', strikes: 0 } : u,
      ),
    }
    notify(nextState, userId, 'Suspension lifted',
      'An administrator lifted your booking suspension early.', '/app/board', 'strike')
    logAction(nextState, me?.name || 'Admin', `Lifted suspension for ${target?.name} (${reason}).`)
    commit(nextState)
    return { ok: true }
  }, [commit])

  /* -------------------------------------------------------------- notifications */
  const markAllRead = useCallback(() => {
    const s = stateRef.current
    commit({
      ...s,
      notifications: s.notifications.map((n) =>
        n.userId === s.session?.userId ? { ...n, read: true } : n,
      ),
    })
  }, [commit])

  const markRead = useCallback((id) => {
    const s = stateRef.current
    commit({
      ...s,
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })
  }, [commit])

  /* ---------------------------------------------------------------- demo controls */
  const demoFinishMachine = useCallback((machineId) => {
    const s = stateRef.current
    commit({
      ...s,
      machines: s.machines.map((m) =>
        m.id === machineId ? { ...m, endsAt: new Date(Date.now() - 1000).toISOString() } : m,
      ),
    })
  }, [commit])

  const demoAdvanceQueue = useCallback(() => {
    const s = stateRef.current
    const me = currentUser(s)
    if (!me) return
    const key = `${me.buildingId}-washer`
    const machine = s.machines.find((m) => m.buildingId === me.buildingId && m.type === 'washer' && m.status === 'available')
      || s.machines.find((m) => m.buildingId === me.buildingId && m.type === 'washer' && m.status !== 'out-of-order')
    if (!machine) return
    const claim = {
      queueKey: key, machineId: machine.id, userId: me.id,
      endsAt: new Date(Date.now() + 10 * MIN).toISOString(),
    }
    // The real flow removes the winning student from the waiting list, so the
    // demo state should do the same instead of leaving them showing as waiting.
    const list = (s.queues[key] || []).filter((q) => q.userId !== me.id)
    commit({ ...s, claim, queues: { ...s.queues, [key]: list } })
  }, [commit])

  const demoExpireClaim = useCallback(() => {
    const s = stateRef.current
    if (!s.claim) return
    commit({ ...s, claim: { ...s.claim, endsAt: new Date(Date.now() - 1000).toISOString() } })
  }, [commit])

  const demoExpireCheckIn = useCallback(() => {
    const s = stateRef.current
    const me = currentUser(s)
    if (!me) return
    const upcoming = s.bookings.find((b) => b.userId === me.id && b.status === 'upcoming')
    if (!upcoming) return
    commit({
      ...s,
      bookings: s.bookings.map((b) =>
        b.id === upcoming.id ? { ...b, start: new Date(Date.now() - 11 * MIN).toISOString(), graceUntil: null } : b,
      ),
    })
  }, [commit])

  const demoSuspendMe = useCallback(() => {
    const s = stateRef.current
    const me = currentUser(s)
    if (!me) return
    const bld = s.buildings.find((b) => b.id === me.buildingId)
    commit({
      ...s,
      users: s.users.map((u) =>
        u.id === me.id
          ? {
              ...u, strikes: bld?.penalties?.strikes ?? 3, status: 'suspended',
              suspendedUntil: new Date(Date.now() + (bld?.penalties?.days ?? 7) * DAY).toISOString(),
            }
          : u,
      ),
    })
  }, [commit])

  const demoForceSlotConflict = useCallback(() => {
    const s = stateRef.current
    commit({ ...s, demo: { ...s.demo, forceSlotConflict: true } })
  }, [commit])

  const demoReset = useCallback(() => {
    const fresh = createSeed()
    commit(fresh)
  }, [commit])

  const value = useMemo(
    () => ({
      state,
      user,
      toasts,
      toast,
      dismissToast,
      signIn,
      signOut,
      register,
      activateAccount,
      requestPasswordReset,
      setNewPassword,
      bookSlot,
      rescheduleBooking,
      cancelBooking,
      checkIn,
      joinQueue,
      leaveQueue,
      claimTurn,
      skipTurn,
      reportFault,
      flagUnattended,
      saveSettings,
      confirmReport,
      dismissReport,
      logRepair,
      scheduleMaintenance,
      releaseBooking,
      extendCheckIn,
      resolveFlag,
      removeStrike,
      publishAnnouncement,
      endAnnouncement,
      addPart,
      recordStock,
      addBuilding,
      updateBuilding,
      removeBuilding,
      addMachine,
      updateMachine,
      retireMachine,
      createUser,
      assignBuildings,
      disableUser,
      resetUserPassword,
      saveRules,
      savePenalties,
      liftSuspension,
      markAllRead,
      markRead,
      demoFinishMachine,
      demoAdvanceQueue,
      demoExpireClaim,
      demoExpireCheckIn,
      demoSuspendMe,
      demoForceSlotConflict,
      demoReset,
    }),
    [
      state, user, toasts, toast, dismissToast, signIn, signOut, register, activateAccount,
      requestPasswordReset, setNewPassword, bookSlot, rescheduleBooking, cancelBooking, checkIn, joinQueue, leaveQueue,
      claimTurn, skipTurn, reportFault, flagUnattended, saveSettings, confirmReport, dismissReport,
      logRepair, scheduleMaintenance, releaseBooking, extendCheckIn, resolveFlag, removeStrike,
      publishAnnouncement, endAnnouncement, addPart, recordStock, addBuilding, updateBuilding,
      removeBuilding, addMachine, updateMachine, retireMachine, createUser, assignBuildings,
      disableUser, resetUserPassword, saveRules, savePenalties, liftSuspension, markAllRead, markRead,
      demoFinishMachine, demoAdvanceQueue, demoExpireClaim, demoExpireCheckIn, demoSuspendMe,
      demoForceSlotConflict, demoReset,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
