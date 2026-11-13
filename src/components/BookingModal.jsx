import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppStore.jsx'
import { Badge, Banner, Button, EmptyState, InlineError, Modal, Tabs } from './ui.jsx'
import { getSlots } from '../lib/slots.js'
import { dayLabel, fmtDate, fmtRange, fmtTime, sameDay, startOfDay, tomorrowStart } from '../lib/time.js'

/**
 * Shared booking / reschedule dialog (W06).
 * Pass `booking` to reschedule an existing reservation on the same machine.
 */
export function BookingModal({ machine, booking = null, onClose, suspended = false, suspensionUntil = null }) {
  const { state, bookSlot, rescheduleBooking, toast } = useApp()
  const navigate = useNavigate()
  const initialDay = booking && !sameDay(booking.start, new Date()) ? 1 : 0
  const [dayOffset, setDayOffset] = useState(initialDay)
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')
  const day = dayOffset === 0 ? startOfDay() : tomorrowStart()
  const dayKey = day.getTime()
  const slots = useMemo(() => getSlots(machine, new Date(dayKey), state), [machine, dayKey, state])
  const freeCount = slots.filter((s) => !s.taken).length
  const chosen = slots.find((s) => s.start === selected)
  const building = state.buildings.find((b) => b.id === machine.buildingId)

  useEffect(() => {
    setSelected('')
    setError('')
  }, [dayOffset, machine.id])

  const confirm = () => {
    if (!chosen) {
      setError('Choose a start time to continue.')
      return
    }
    const res = booking
      ? rescheduleBooking(booking.id, chosen.start)
      : bookSlot(machine.id, chosen.start)
    if (!res.ok) {
      if (res.error === 'taken') setError('That slot was just taken. Please choose another time.')
      else if (res.error === 'limit') setError(`You already have ${res.max} active bookings. Cancel one before booking another.`)
      else if (res.error === 'suspended') setError('Your account is suspended, so you cannot book right now.')
      else if (res.error === 'maintenance') setError('That time is blocked for maintenance. Choose another slot.')
      else setError('This machine cannot be booked right now.')
      return
    }
    toast(
      booking
        ? `Rescheduled ${machine.label} to ${dayLabel(chosen.start)} ${fmtRange(chosen.start, chosen.end)}.`
        : `Booked ${machine.label} · ${dayLabel(chosen.start)} ${fmtRange(chosen.start, chosen.end)}. Check-in opens at ${fmtTime(chosen.start)}.`,
    )
    onClose()
    navigate('/app/bookings')
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${booking ? 'Reschedule' : 'Book'} ${machine.type === 'washer' ? 'Washer' : 'Dryer'} ${machine.label}`}
      subtitle={`${machine.cycle}-minute slots · Building ${machine.buildingId}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon="calendar" onClick={confirm} disabled={suspended || !freeCount}>
            {booking ? 'Save new time' : 'Confirm booking'}
          </Button>
        </>
      }
    >
      <div className="stack">
        {suspended && (
          <Banner tone="danger" title="Booking blocked">
            Your account is suspended until {fmtDate(suspensionUntil, true)}. You cannot make a booking right now.
          </Banner>
        )}
        {machine.status === 'finished' && (
          <Banner tone="warn" title="Awaiting collection">
            The last cycle finished but the load has not been collected. Choose a later slot or flag the machine.
          </Banner>
        )}

        <Tabs
          tabs={[{ value: 0, label: 'Today' }, { value: 1, label: 'Tomorrow' }]}
          value={dayOffset}
          onChange={setDayOffset}
        />

        <div className="slot-head">
          <span className="small muted">{fmtDate(day, true)} · {freeCount} free slot{freeCount === 1 ? '' : 's'}</span>
          <span className="small muted">{machine.cycle}-minute cycle</span>
        </div>

        {slots.length === 0 ? (
          <EmptyState compact icon="calendar" title="No slots left for this day">Try tomorrow or another machine.</EmptyState>
        ) : (
          <div className="slot-grid">
            {slots.map((s) => (
              <button
                key={s.start}
                type="button"
                className={`slot${s.taken ? ' is-taken' : ''}${selected === s.start ? ' is-selected' : ''}`}
                disabled={s.taken}
                onClick={() => { setSelected(s.start); setError('') }}
                title={s.taken ? s.reason : 'Select this slot'}
              >
                <span>{s.label}</span>
                <small>{s.taken ? s.reason : 'Free'}</small>
              </button>
            ))}
          </div>
        )}

        {chosen && (
          <div className="booking-summary">
            <div>
              <strong>{machine.type === 'washer' ? 'Washer' : 'Dryer'} {machine.label} · {dayLabel(chosen.start)} {fmtRange(chosen.start, chosen.end)}</strong>
              <p className="small muted">
                Check in with the machine QR within {building?.rules?.grace ?? 10} minutes, or the slot is released and a strike is recorded.
              </p>
            </div>
            <Badge tone="teal">Selected</Badge>
          </div>
        )}

        <InlineError>{error}</InlineError>
        <p className="form-note">
          Slots already in use or reserved are shown with their reason. The building rule allows {building?.rules?.maxActive ?? 1} active booking{(building?.rules?.maxActive ?? 1) === 1 ? '' : 's'} at a time.
        </p>
      </div>
    </Modal>
  )
}
