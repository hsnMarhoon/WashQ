import { MIN, atTime, sameDay, startOfDay, fmtTime } from './time.js'

const active = (b) => b.status === 'upcoming' || b.status === 'checked-in'

function dayRange(building, day) {
  const [oh, om] = building.opens.split(':').map(Number)
  const [ch, cm] = building.closes.split(':').map(Number)
  const start = atTime(day, `${String(oh).padStart(2, '0')}:${String(om).padStart(2, '0')}`)
  const end = atTime(day, `${String(ch % 24).padStart(2, '0')}:${String(cm).padStart(2, '0')}`)
  if (ch === 24) end.setDate(end.getDate() + 1)
  if (ch <= oh) end.setDate(end.getDate() + 1)
  return { start, end }
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd
}

/** All bookable slots for a machine on a given day, with taken/past flags. */
export function getSlots(machine, day, state, now = Date.now()) {
  if (!machine) return []
  const building = state.buildings.find((b) => b.id === machine.buildingId)
  if (!building) return []
  const { start, end } = dayRange(building, day)
  const cycle = machine.cycle
  const cycleMs = cycle * MIN

  const machineBookings = state.bookings.filter(
    (b) => b.machineId === machine.id && active(b),
  )
  const blocks = [
    ...state.maintenance.filter((m) => m.machineId === machine.id),
    ...state.announcements.filter(
      (a) => a.blockBookings && a.buildingIds.includes(machine.buildingId) && a.status !== 'expired',
    ),
  ]

  const out = []
  let cursor = new Date(start)
  const lastStart = new Date(end.getTime() - cycleMs)
  while (cursor <= lastStart) {
    const s = new Date(cursor)
    const e = new Date(cursor.getTime() + cycleMs)
    let taken = false
    let reason = ''

    if (machine.status === 'out-of-order' || machine.status === 'maintenance' || machine.status === 'finished') {
      taken = true
      reason = machine.status === 'out-of-order' ? 'Out of order' : machine.status === 'maintenance' ? 'Under maintenance' : 'Awaiting collection'
    }
    if (machine.status === 'in-use' && machine.endsAt && s < new Date(machine.endsAt) && e > new Date(machine.startedAt || now)) {
      taken = true
      reason = 'In use'
    }
    if (!taken) {
      for (const b of machineBookings) {
        if (overlaps(s.getTime(), e.getTime(), new Date(b.start).getTime(), new Date(b.end).getTime())) {
          taken = true
          reason = 'Booked'
          break
        }
      }
    }
    if (!taken) {
      for (const bl of blocks) {
        const bs = new Date(bl.start || bl.date)
        const be = bl.duration ? new Date(bs.getTime() + bl.duration * MIN) : new Date(bl.end)
        if (overlaps(s.getTime(), e.getTime(), bs.getTime(), be.getTime())) {
          taken = true
          reason = bl.title ? 'Room closed' : 'Maintenance'
          break
        }
      }
    }
    // Slots that already started on the current day can no longer be booked.
    if (s.getTime() < now + MIN) {
      taken = true
      reason = 'Past'
    }

    out.push({
      start: s.toISOString(),
      end: e.toISOString(),
      label: fmtTime(s),
      taken,
      reason,
    })
    cursor = new Date(cursor.getTime() + cycleMs)
  }
  return out
}

export function isSlotFree(machine, startISO, state) {
  const slots = getSlots(machine, new Date(startISO), state, 0)
  const slot = slots.find((s) => s.start === startISO)
  return slot ? !slot.taken : false
}
