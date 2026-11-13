import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../../store/AppStore.jsx'
import { Icon } from '../../components/Icons.jsx'
import {
  Banner, Button, Card, Countdown, EmptyState, IconButton, InlineError,
  Modal, ProgressRing, Segmented, Select, StatusBadge,
} from '../../components/ui.jsx'
import { BookingModal } from '../../components/BookingModal.jsx'
import { getSlots } from '../../lib/slots.js'
import { useNow } from '../../hooks/useNow.js'
import {
  dayLabel, fmtDate, fmtRange, fmtTime, minsUntil, sameDay, startOfDay, timeAgo, tomorrowStart,
} from '../../lib/time.js'

const STATUS_FILTERS = [
  { value: 'all', label: 'Any status' },
  { value: 'available', label: 'Available' },
  { value: 'in-use', label: 'In use' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'finished', label: 'Finished' },
  { value: 'out-of-order', label: 'Out of order' },
]

export function MachineBoard() {
  const { state, user, joinQueue, leaveQueue, claimTurn, skipTurn, toast, flagUnattended } = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const now = useNow(15000)
  const [lastUpdated, setLastUpdated] = useState(Date.now())
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [dismissed, setDismissed] = useState([])
  const [bookingMachine, setBookingMachine] = useState(null)
  const [detailsMachine, setDetailsMachine] = useState(null)
  const [flagMachine, setFlagMachine] = useState(null)
  const [flagAck, setFlagAck] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setLastUpdated(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const machineId = params.get('machine')
    if (machineId) {
      const m = state.machines.find((x) => x.id === machineId)
      if (m) setDetailsMachine(m)
    }
  }, [params, state.machines])

  const building = state.buildings.find((b) => b.id === user.buildingId)
  const machines = state.machines.filter((m) => m.buildingId === user.buildingId)
  const filtered = machines.filter(
    (m) => (type === 'all' || m.type === type) && (status === 'all' || m.status === status),
  )

  const announcements = state.announcements.filter(
    (a) =>
      a.buildingIds.includes(user.buildingId) &&
      a.status !== 'expired' &&
      !dismissed.includes(a.id) &&
      new Date(a.start) <= now &&
      new Date(a.end) >= now,
  )

  const myBookings = state.bookings
    .filter((b) => b.userId === user.id && (b.status === 'upcoming' || b.status === 'checked-in'))
    .sort((a, b) => new Date(a.start) - new Date(b.start))
  const nextBooking = myBookings.find((b) => b.status === 'upcoming')
  const nextMachine = nextBooking ? state.machines.find((m) => m.id === nextBooking.machineId) : null
  const checkInOpen = nextBooking && new Date(nextBooking.start).getTime() - Date.now() <= 2 * 60 * 1000

  const myClaim = state.claim?.userId === user.id ? state.claim : null
  const claimMachine = myClaim ? state.machines.find((m) => m.id === myClaim.machineId) : null
  const myQueue = ['washer', 'dryer']
    .map((t) => {
      const key = `${user.buildingId}-${t}`
      const list = state.queues[key] || []
      const index = list.findIndex((q) => q.userId === user.id)
      return index >= 0 ? { type: t, position: index + 1, size: list.length } : null
    })
    .filter(Boolean)
  const freeWashers = machines.filter((m) => m.type === 'washer' && m.status === 'available').length
  const freeDryers = machines.filter((m) => m.type === 'dryer' && m.status === 'available').length
  const suspended = user.status === 'suspended' || (user.suspendedUntil && new Date(user.suspendedUntil) > new Date())

  const quiet = '6–9 AM'

  const startQueue = (queueType) => {
    const res = joinQueue(queueType)
    if (!res.ok) {
      if (res.error === 'already') toast('You are already in that queue.', 'info')
      else if (res.error === 'suspended') toast('Suspended accounts cannot join queues.', 'error')
      else toast('Could not join the queue.', 'error')
      return
    }
    toast(`Joined the ${queueType} queue at position ${res.position}.`)
    navigate('/app/queue')
  }

  const doFlag = (machine) => {
    setFlagMachine(machine)
    setFlagAck(false)
  }

  const submitFlag = () => {
    const res = flagUnattended(flagMachine.id)
    if (!res.ok) {
      if (res.error === 'already') toast('This load has already been flagged. Staff have been notified.', 'info')
      else if (res.error === 'running') toast('This machine is still running. You can flag it when the cycle ends.', 'error')
      else toast('Could not flag this machine.', 'error')
    } else {
      toast(`Flagged ${flagMachine.label}. The owner and building staff have been notified.`)
    }
    setFlagMachine(null)
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="page-kicker">
            <span className="live-dot" />
            <span>Live · updated {fmtTime(lastUpdated)}</span>
            {building && <span className="muted">· Room open {building.opens === '00:00' ? '24 h' : `${building.opens}–${building.closes}`}</span>}
          </div>
          <h1 className="page-title">{building?.name || 'Building'} · Laundry Room</h1>
          <p className="page-sub">
            {machines.length} machines · {freeWashers + freeDryers} free right now
          </p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" icon="qr" onClick={() => navigate('/app/checkin')}>Scan machine QR</Button>
          <Button variant="ghost" icon="refresh" onClick={() => { setLastUpdated(Date.now()); toast('Machine status refreshed.', 'info') }}>
            Refresh
          </Button>
        </div>
      </header>

      {suspended && (
        <Banner tone="danger" title="Your account is suspended" icon="shield">
          Bookings and queues are blocked until {fmtDate(user.suspendedUntil, true)}. Strikes: {user.strikes} of {building?.penalties?.strikes ?? 3}.
          {' '}You can still view the machine board and read announcements.
        </Banner>
      )}

      {announcements.map((a) => (
        <Banner
          key={a.id}
          tone={a.blockBookings ? 'warn' : 'info'}
          title={a.title}
          icon="speaker"
          onClose={() => setDismissed((d) => [...d, a.id])}
          action={<span className="small muted">Until {fmtTime(a.end)}</span>}
        >
          {a.message}
        </Banner>
      ))}

      {freeWashers === 0 && !suspended && (
        <Banner
          tone="warn"
          title="All washers are busy"
          icon="washer"
          action={
            myQueue ? null : <Button size="sm" variant="secondary" onClick={() => startQueue('washer')}>Join washer queue</Button>
          }
        >
          You can still book a later slot or join the queue. Dryers: {freeDryers} free.
        </Banner>
      )}

      <div className="board-layout">
        <section className="board-main">
          <div className="toolbar">
            <Segmented
              ariaLabel="Filter by machine type"
              value={type}
              onChange={setType}
              options={[
                { value: 'all', label: 'All' },
                { value: 'washer', label: 'Washers' },
                { value: 'dryer', label: 'Dryers' },
              ]}
            />
            <div className="toolbar-right">
              <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
                {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
              <span className="muted small">{filtered.length} of {machines.length}</span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState icon="filter" title="No machines match these filters">
                Try a different machine type or status.
              </EmptyState>
            </Card>
          ) : (
            <div className="machine-grid">
              {filtered.map((m) => (
                <MachineCard
                  key={m.id}
                  machine={m}
                  now={now}
                  onDetails={() => setDetailsMachine(m)}
                  onBook={() => setBookingMachine(m)}
                  onQueue={() => startQueue(m.type)}
                  onFlag={() => doFlag(m)}
                  onReport={() => navigate(`/app/report?machine=${m.id}`)}
                  disabled={suspended}
                />
              ))}
            </div>
          )}

          <p className="board-note">
            <Icon name="info" size={14} /> Status refreshes automatically (at most 30 seconds old). A card always shows its status as text, never colour alone.
          </p>
        </section>

        <aside className="side-panel">
          <Card title="My next booking" action={<Link to="/app/bookings" className="link-inline">All bookings</Link>}>
            {nextBooking ? (
              <div className="next-booking">
                <div className="next-booking-machine">
                  <span className={`machine-chip ${nextMachine?.type}`}><Icon name={nextMachine?.type === 'washer' ? 'washer' : 'dryer'} size={18} /></span>
                  <div>
                    <strong>{nextMachine?.label} · {nextMachine?.type === 'washer' ? 'Washer' : 'Dryer'}</strong>
                    <span>{dayLabel(nextBooking.start)} · {fmtRange(nextBooking.start, nextBooking.end)}</span>
                  </div>
                </div>
                <div className="next-booking-foot">
                  {checkInOpen || nextBooking.status === 'checked-in' ? (
                    <Button size="sm" icon="qr" onClick={() => navigate(`/app/checkin?booking=${nextBooking.id}`)}>
                      Check in
                    </Button>
                  ) : (
                    <span className="muted small">Check-in opens at {fmtTime(nextBooking.start)}</span>
                  )}
                  <span className="muted small">{nextBooking.id}</span>
                </div>
              </div>
            ) : (
              <EmptyState compact icon="calendar" title="No upcoming booking" action={<Button size="sm" onClick={() => setBookingMachine(machines.find((m) => m.status === 'available') || machines[0])}>Book a machine</Button>}>
                Book a slot or join a queue.
              </EmptyState>
            )}
          </Card>

          <Card title="Queue">
            {myClaim ? (
              <div className="claim-box">
                <div className="claim-head">
                  <span className="claim-pulse" />
                  <strong>It's your turn</strong>
                </div>
                <p className="small">
                  {claimMachine?.label} is free. Claim it within 10 minutes, then check in at the machine.
                </p>
                <div className="claim-count"><Countdown to={myClaim.endsAt} prefix="Expires in" /></div>
                <div className="claim-actions">
                  <Button size="sm" onClick={() => { const r = claimTurn(); if (r.ok) { toast('Machine claimed. Scan the QR to check in.'); navigate(`/app/checkin?booking=${r.booking.id}`) } }}>
                    Claim now
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { skipTurn(); toast('Turn passed to the next student.', 'info') }}>Skip</Button>
                </div>
              </div>
            ) : myQueue.length ? (
              <div className="stack-sm">
                {myQueue.map((q) => (
                  <div className="queue-mini" key={q.type}>
                    <div>
                      <strong>{q.type === 'washer' ? 'Washers' : 'Dryers'}</strong>
                      <span className="muted small">Position {q.position} of {q.size}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { leaveQueue(q.type); toast(`Left the ${q.type} queue.`, 'info') }}>Leave</Button>
                  </div>
                ))}
                <Link to="/app/queue" className="link-inline">Open queue status</Link>
              </div>
            ) : (
              <div className="stack-sm">
                <p className="muted small">Not in a queue. Join when every machine of a type is busy.</p>
                <div className="queue-mini-actions">
                  <Button size="sm" variant="secondary" icon="washer" onClick={() => startQueue('washer')} disabled={suspended}>Washer queue</Button>
                  <Button size="sm" variant="secondary" icon="dryer" onClick={() => startQueue('dryer')} disabled={suspended}>Dryer queue</Button>
                </div>
              </div>
            )}
          </Card>

          <Card title="Quiet times">
            <p className="quiet-time"><Icon name="clock" size={17} /> Usually free: <strong>{quiet}</strong></p>
            <p className="muted small">Based on the last 30 days of bookings.</p>
            <Link to="/app/history?tab=busy" className="link-inline">See busy times</Link>
          </Card>

          <div className="scan-card">
            <span className="scan-icon"><Icon name="qr" size={24} /></span>
            <div>
              <strong>At the machine?</strong>
              <p className="small muted">Scan the QR code to check in to your booking.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => navigate('/app/checkin')}>Open scanner</Button>
          </div>
        </aside>
      </div>

      {bookingMachine && (
        <BookingModal
          machine={bookingMachine}
          onClose={() => setBookingMachine(null)}
          suspended={suspended}
          suspensionUntil={user.suspendedUntil}
        />
      )}

      {detailsMachine && (
        <MachineDetailsModal
          machine={detailsMachine}
          onClose={() => setDetailsMachine(null)}
          onBook={() => { setDetailsMachine(null); setBookingMachine(detailsMachine) }}
          onReport={() => navigate(`/app/report?machine=${detailsMachine.id}`)}
          onFlag={() => { setDetailsMachine(null); doFlag(detailsMachine) }}
          suspended={suspended}
        />
      )}

      <Modal
        open={!!flagMachine}
        onClose={() => setFlagMachine(null)}
        title={`Flag unattended laundry · ${flagMachine?.label || ''}`}
        subtitle="Use this only when a cycle has finished and the load has been left inside."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFlagMachine(null)}>Cancel</Button>
            <Button variant="danger" icon="flag" onClick={submitFlag} disabled={!flagAck}>Flag unattended</Button>
          </>
        }
      >
        {flagMachine && (
          <div className="stack">
            <div className="machine-summary">
              <span className={`machine-chip ${flagMachine.type}`}><Icon name={flagMachine.type === 'washer' ? 'washer' : 'dryer'} size={20} /></span>
              <div>
                <strong>{flagMachine.label} · {flagMachine.type === 'washer' ? 'Washer' : 'Dryer'}</strong>
                <span className="muted small">Cycle ended {flagMachine.endedAt ? timeAgo(flagMachine.endedAt) : 'recently'} · load not collected</span>
              </div>
            </div>
            <ul className="rule-list">
              <li>The machine owner is notified immediately to collect their load.</li>
              <li>If the load is still there after 15 minutes, building staff are alerted and move it to the holding shelf.</li>
              <li>Repeated flags are reviewed; false flags may be dismissed.</li>
            </ul>
            <label className="check">
              <input type="checkbox" checked={flagAck} onChange={(e) => setFlagAck(e.target.checked)} />
              <span>The cycle has finished and the load is still inside.</span>
            </label>
            <InlineError>{!flagAck ? 'Confirm the statement above to continue.' : ''}</InlineError>
          </div>
        )}
      </Modal>
    </div>
  )
}

function MachineCard({ machine, now, onDetails, onBook, onQueue, onFlag, onReport, disabled }) {
  const remaining = machine.endsAt ? minsUntil(machine.endsAt, now) : 0
  const showRemaining = machine.status === 'in-use' && remaining > 0
  const total = machine.cycle
  const pct = showRemaining ? Math.max(4, Math.min(100, (remaining / total) * 100)) : 0

  let detail = null
  if (machine.status === 'available') {
    detail = <>Free now · {machine.cycle} min cycle</>
  } else if (machine.status === 'in-use') {
    detail = <>Ends {fmtTime(machine.endsAt)}{machine.endsAt ? ` · ${remaining} min left` : ''}</>
  } else if (machine.status === 'reserved') {
    detail = <>Booked for {fmtTime(machine.reservedFor)}</>
  } else if (machine.status === 'finished') {
    detail = <>Cycle ended {machine.endedAt ? timeAgo(machine.endedAt) : 'recently'}, load not collected</>
  } else if (machine.status === 'out-of-order') {
    detail = <>{machine.faultNote || 'Out of order.'}</>
  } else if (machine.status === 'maintenance') {
    detail = <>Under maintenance. Not bookable.</>
  }

  return (
    <article className={`machine-card status-${machine.status}`}>
      <div className="machine-card-top">
        <button type="button" className="machine-identity" onClick={onDetails} aria-label={`Open details for ${machine.label}`}>
          <span className={`machine-icon ${machine.type}`}>
            <Icon name={machine.type === 'washer' ? 'washer' : 'dryer'} size={22} />
          </span>
          <span className="machine-name">
            <strong>{machine.label}</strong>
            <span>{machine.type === 'washer' ? 'Washer' : 'Dryer'} · {machine.model}</span>
          </span>
        </button>
        <StatusBadge status={machine.status} />
      </div>

      <div className="machine-card-body">
        {showRemaining && (
          <ProgressRing value={pct} size={44} stroke={4} tone={machine.status === 'in-use' ? 'blue' : 'teal'}>
            {remaining}m
          </ProgressRing>
        )}
        <p className="machine-detail">{detail}</p>
      </div>

      <div className="machine-card-foot">
        {machine.status === 'available' && (
          <Button size="sm" icon="calendar" onClick={onBook} disabled={disabled}>Book</Button>
        )}
        {machine.status === 'in-use' && (
          <Button size="sm" variant="secondary" icon="queue" onClick={onQueue} disabled={disabled}>Join queue</Button>
        )}
        {machine.status === 'reserved' && (
          <Button size="sm" variant="secondary" icon="calendar" onClick={onBook} disabled={disabled}>See slots</Button>
        )}
        {machine.status === 'finished' && (
          <Button size="sm" variant="danger" icon="flag" onClick={onFlag} disabled={disabled}>Flag unattended</Button>
        )}
        {(machine.status === 'out-of-order' || machine.status === 'maintenance') && (
          <Button size="sm" variant="secondary" icon="calendar" disabled>Book</Button>
        )}
        <div className="machine-secondary">
          <IconButton icon="flag" label={`Report a problem with ${machine.label}`} onClick={onReport} disabled={disabled} />
          <IconButton icon="info" label={`Details for ${machine.label}`} onClick={onDetails} />
        </div>
      </div>
    </article>
  )
}

function MachineDetailsModal({ machine, onClose, onBook, onReport, onFlag, suspended }) {
  const { state } = useApp()
  const now = useNow(15000)
  const today = startOfDay()
  const tomorrow = tomorrowStart()
  const slotsToday = getSlots(machine, today, state).filter((s) => !s.taken).slice(0, 3)
  const slotsTomorrow = getSlots(machine, tomorrow, state).filter((s) => !s.taken).slice(0, 3)
  const nextSlots = slotsToday.length ? slotsToday : slotsTomorrow

  return (
    <Modal
      open
      onClose={onClose}
      title={`${machine.type === 'washer' ? 'Washer' : 'Dryer'} ${machine.label}`}
      subtitle={`Building ${machine.buildingId} · ${machine.model}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="secondary" icon="flag" onClick={onReport}>Report a problem</Button>
          {machine.status === 'finished' && <Button variant="danger" icon="flag" onClick={onFlag}>Flag unattended</Button>}
          <Button icon="calendar" onClick={onBook} disabled={suspended || ['out-of-order', 'maintenance'].includes(machine.status)}>
            Book this machine
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="machine-summary">
          <span className={`machine-chip ${machine.type}`}><Icon name={machine.type === 'washer' ? 'washer' : 'dryer'} size={24} /></span>
          <div>
            <StatusBadge status={machine.status} />
            <p className="small muted" style={{ marginTop: 6 }}>
              {machine.status === 'available' && `Free now · ${machine.cycle} min cycle`}
              {machine.status === 'in-use' && `In use · ends ${fmtTime(machine.endsAt)} · ${minsUntil(machine.endsAt, now)} min left`}
              {machine.status === 'reserved' && `Reserved · booked for ${fmtTime(machine.reservedFor)}`}
              {machine.status === 'finished' && `Cycle finished ${machine.endedAt ? timeAgo(machine.endedAt) : ''} · load not collected`}
              {machine.status === 'out-of-order' && (machine.faultNote || 'Out of order')}
              {machine.status === 'maintenance' && 'Under maintenance · not bookable'}
            </p>
          </div>
        </div>

        <div className="detail-grid">
          <div><span>Machine ID</span><strong>{machine.label}</strong></div>
          <div><span>Type</span><strong>{machine.type === 'washer' ? 'Washer' : 'Dryer'}</strong></div>
          <div><span>Cycle length</span><strong>{machine.cycle} minutes</strong></div>
          <div><span>Last serviced</span><strong>{fmtDate(machine.lastServiced, true)}</strong></div>
          <div><span>QR / serial</span><strong className="mono">{machine.qr}</strong></div>
          <div><span>Location</span><strong>Building {machine.buildingId}</strong></div>
        </div>

        <div>
          <h3 className="mini-title">Next free slots</h3>
          {nextSlots.length ? (
            <div className="slot-chip-row">
              {nextSlots.map((s) => (
                <span className="slot-chip" key={s.start}>{dayLabel(s.start)} · {s.label}</span>
              ))}
            </div>
          ) : (
            <p className="muted small">No free slots in the next two days.</p>
          )}
        </div>

        {machine.status === 'out-of-order' && (
          <Banner tone="warn" title="Out of order">
            Staff are aware. Booking is disabled until the machine is returned to service.
          </Banner>
        )}
      </div>
    </Modal>
  )
}
