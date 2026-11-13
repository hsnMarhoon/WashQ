import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppStore.jsx'
import { BookingModal } from '../../components/BookingModal.jsx'
import {
  Badge, Banner, Button, Card, ConfirmDialog, Countdown, DataTable, EmptyState, StatusBadge,
} from '../../components/ui.jsx'
import { Icon } from '../../components/Icons.jsx'
import { useNow } from '../../hooks/useNow.js'
import { dayLabel, fmtDate, fmtRange, fmtTime, minsBetween, minsUntil, timeAgo } from '../../lib/time.js'

export function MyBookings() {
  const { state, user, cancelBooking, joinQueue, toast } = useApp()
  const navigate = useNavigate()
  const now = useNow(1000)
  const [tab, setTab] = useState('upcoming')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [reschedule, setReschedule] = useState(null)
  const [cancelled, setCancelled] = useState(null)

  const building = state.buildings.find((b) => b.id === user.buildingId)
  const grace = building?.rules?.grace ?? 10
  const suspended = user.status === 'suspended' || (user.suspendedUntil && new Date(user.suspendedUntil) > new Date())

  const mine = state.bookings.filter((b) => b.userId === user.id)
  const upcoming = mine
    .filter((b) => b.status === 'upcoming' || b.status === 'checked-in')
    .sort((a, b) => new Date(a.start) - new Date(b.start))
  const past = mine
    .filter((b) => !['upcoming', 'checked-in'].includes(b.status))
    .sort((a, b) => new Date(b.start) - new Date(a.start))

  const recentNoShow = useMemo(
    () =>
      mine
        .filter((b) => b.status === 'no-show')
        .sort((a, b) => new Date(b.start) - new Date(a.start))[0],
    [mine],
  )
  const noShowRecent = recentNoShow && Date.now() - new Date(recentNoShow.start).getTime() < 48 * 3600 * 1000

  const machineOf = (b) => state.machines.find((m) => m.id === b.machineId)

  const confirmCancel = () => {
    const res = cancelBooking(cancelTarget.id)
    if (res.ok) {
      const m = machineOf(cancelTarget)
      setCancelled({ booking: cancelTarget, machine: m })
      toast(`Booking on ${m?.label || 'the machine'} cancelled. The slot is free again.`)
      setCancelTarget(null)
    } else {
      toast('This booking can no longer be cancelled.', 'error')
      setCancelTarget(null)
    }
  }

  const joinFromCancel = (type) => {
    const res = joinQueue(type)
    if (res.ok) {
      toast(`Joined the ${type} queue at position ${res.position}.`)
      navigate('/app/queue')
    } else {
      toast(res.error === 'suspended' ? 'Suspended accounts cannot join queues.' : 'You are already in this queue.', 'error')
    }
  }

  const columns = [
    {
      key: 'machine',
      label: 'Machine',
      render: (b) => {
        const m = machineOf(b)
        return (
          <span className="table-machine">
            <span className={`machine-chip ${m?.type}`}><Icon name={m?.type === 'washer' ? 'washer' : 'dryer'} size={15} /></span>
            <strong>{m?.label || b.machineId}</strong>
          </span>
        )
      },
    },
    { key: 'date', label: 'Date', render: (b) => fmtDate(b.start, true) },
    { key: 'slot', label: 'Slot', render: (b) => fmtRange(b.start, b.end) },
    { key: 'status', label: 'Outcome', render: (b) => <StatusBadge status={b.status} /> },
    {
      key: 'note',
      label: '',
      render: (b) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate('/app/board')}
        >
          Book again
        </Button>
      ),
    },
  ]

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">My Bookings</h1>
          <p className="page-sub">Upcoming reservations, check-in windows and past cycles.</p>
        </div>
        <div className="page-actions">
          <Button icon="plus" onClick={() => navigate('/app/board')}>Book a machine</Button>
        </div>
      </header>

      {suspended && (
        <Banner tone="danger" title="Your account is suspended" icon="shield">
          You cannot book or join queues until {fmtDate(user.suspendedUntil, true)}. Strikes: {user.strikes} of {building?.penalties?.strikes ?? 3}.
        </Banner>
      )}

      {recentNoShow && noShowRecent && (
        <Banner tone="danger" title="A booking was released" icon="alert-triangle">
          You did not check in for {machineOf(recentNoShow)?.label || 'your booking'} on {fmtDate(recentNoShow.start, true)} within {grace} minutes, so the slot was released.
          {' '}This counts as strike {Math.min(user.strikes, building?.penalties?.strikes ?? 3)} of {building?.penalties?.strikes ?? 3}. The slot is now available to other students.
        </Banner>
      )}

      {cancelled && (
        <Banner
          tone="info"
          title="Booking cancelled"
          icon="check-circle"
          onClose={() => setCancelled(null)}
          action={
            <div className="banner-buttons">
              <Button size="sm" variant="secondary" onClick={() => joinFromCancel(cancelled.machine?.type || 'washer')}>Join queue</Button>
              <Button size="sm" variant="ghost" onClick={() => navigate('/app/board')}>Book another slot</Button>
            </div>
          }
        >
          Your {cancelled.machine?.label || ''} slot on {dayLabel(cancelled.booking.start)} {fmtRange(cancelled.booking.start, cancelled.booking.end)} is free again. The cancellation does not count as a strike.
        </Banner>
      )}

      <div className="strike-strip">
        <div className="strike-strip-item">
          <Icon name="shield" size={17} />
          <span>No-show strikes</span>
          <strong>{user.strikes} of {building?.penalties?.strikes ?? 3}</strong>
        </div>
        <div className="strike-strip-item">
          <Icon name="clock" size={17} />
          <span>Check-in grace</span>
          <strong>{grace} minutes</strong>
        </div>
        <div className="strike-strip-item">
          <Icon name="alert-triangle" size={17} />
          <span>Suspension</span>
          <strong>{building?.penalties?.days ?? 7} days at {building?.penalties?.strikes ?? 3} strikes</strong>
        </div>
        <Link to="/app/history" className="link-inline">View history</Link>
      </div>

      <div className="tabs-row">
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'upcoming'} className={`tab${tab === 'upcoming' ? ' on' : ''}`} onClick={() => setTab('upcoming')}>
            Upcoming <span className="tab-count">{upcoming.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === 'past'} className={`tab${tab === 'past' ? ' on' : ''}`} onClick={() => setTab('past')}>
            Past <span className="tab-count">{past.length}</span>
          </button>
        </div>
      </div>

      {tab === 'upcoming' ? (
        upcoming.length === 0 ? (
          <Card>
            <EmptyState icon="calendar" title="No upcoming bookings" action={<Button onClick={() => navigate('/app/board')}>Find a free machine</Button>}>
              Book a slot from the machine board, or join a queue when everything is busy.
            </EmptyState>
          </Card>
        ) : (
          <div className="booking-list">
            {upcoming.map((b) => {
              const m = machineOf(b)
              const startMs = new Date(b.start).getTime()
              const deadline = b.graceUntil ? new Date(b.graceUntil) : new Date(startMs + grace * 60_000)
              const checkedIn = b.status === 'checked-in'
              const checkInOpen = !checkedIn && now >= startMs - 60_000 && now <= deadline.getTime()
              const cycleLeft = checkedIn ? Math.max(0, minsUntil(b.end, now)) : null
              return (
                <Card key={b.id} className={`booking-card${checkedIn ? ' is-active' : ''}`}>
                  <div className="booking-card-main">
                    <div className="booking-machine">
                      <span className={`machine-chip lg ${m?.type}`}><Icon name={m?.type === 'washer' ? 'washer' : 'dryer'} size={22} /></span>
                      <div>
                        <div className="booking-title">
                          <strong>{m?.label} · {m?.type === 'washer' ? 'Washer' : 'Dryer'}</strong>
                          <StatusBadge status={b.status} />
                        </div>
                        <p className="booking-when">{dayLabel(b.start)} · {fmtRange(b.start, b.end)}</p>
                        <p className="muted small">Booking {b.id} · Building {b.buildingId} {b.source === 'queue' ? '· claimed from queue' : ''}</p>
                      </div>
                    </div>

                    <div className="booking-status">
                      {checkedIn ? (
                        <>
                          <Badge tone="blue" dot>Cycle in progress</Badge>
                          <span className="small muted">Ends at {fmtTime(b.end)} · {cycleLeft} min left</span>
                        </>
                      ) : checkInOpen ? (
                        <>
                          <Badge tone="amber" dot>Check-in open</Badge>
                          <span className="small muted">
                            Closes in <Countdown to={deadline.toISOString()} />
                          </span>
                        </>
                      ) : now > deadline.getTime() ? (
                        <>
                          <Badge tone="red" dot>Check-in closed</Badge>
                          <span className="small muted">This booking will be released on the next update.</span>
                        </>
                      ) : (
                        <>
                          <Badge tone="gray" dot>Upcoming</Badge>
                          <span className="small muted">Check-in opens at {fmtTime(b.start)}</span>
                        </>
                      )}
                    </div>

                    <div className="booking-actions">
                      {checkedIn ? (
                        <Button size="sm" variant="secondary" icon="flag" onClick={() => navigate(`/app/report?machine=${b.machineId}`)}>
                          Report a problem
                        </Button>
                      ) : checkInOpen ? (
                        <Button size="sm" icon="qr" onClick={() => navigate(`/app/checkin?booking=${b.id}`)}>Check in</Button>
                      ) : (
                        <>
                          <Button size="sm" variant="secondary" icon="calendar" onClick={() => setReschedule(b)}>Reschedule</Button>
                          <Button size="sm" variant="ghost" onClick={() => setCancelTarget(b)}>Cancel</Button>
                        </>
                      )}
                      {!checkedIn && checkInOpen && (
                        <Button size="sm" variant="ghost" onClick={() => setCancelTarget(b)}>Cancel</Button>
                      )}
                    </div>
                  </div>
                  {checkedIn && (
                    <div className="booking-progress">
                      <div className="progress"><span className="progress-fill progress-blue" style={{ width: `${Math.min(100, Math.max(0, ((minsBetween(b.start, now) / minsBetween(b.start, b.end)) * 100)))}%` }} /></div>
                      <span className="small muted">Started {timeAgo(b.checkedInAt || b.start)}</span>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )
      ) : (
        <Card bodyClass="no-pad">
          <DataTable
            columns={columns}
            rows={past}
            empty={
              <EmptyState icon="history" title="No past bookings yet">
                Completed, cancelled and no-show bookings will appear here.
              </EmptyState>
            }
          />
        </Card>
      )}

      <Card title="How check-in works" className="soft-card">
        <div className="steps">
          <div className="step">
            <span className="step-num">1</span>
            <div><strong>Book a slot</strong><p>Pick a free time on the machine board.</p></div>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <div><strong>Check in within {grace} min</strong><p>Scan the QR on the machine. A countdown shows how long is left.</p></div>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <div><strong>Collect when it ends</strong><p>We notify you when the cycle finishes. Leaving a load blocks the machine.</p></div>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        title="Cancel this booking?"
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        tone="danger"
      >
        {cancelTarget && (
          <div className="stack">
            <p className="modal-copy">
              {machineOf(cancelTarget)?.label} · {dayLabel(cancelTarget.start)} {fmtRange(cancelTarget.start, cancelTarget.end)} will be released immediately.
            </p>
            <p className="small muted">Cancelling before the slot starts does not count as a strike. You can rebook another slot or join the queue.</p>
          </div>
        )}
      </ConfirmDialog>

      {reschedule && (
        <BookingModal
          machine={machineOf(reschedule)}
          booking={reschedule}
          onClose={() => setReschedule(null)}
          suspended={suspended}
          suspensionUntil={user.suspendedUntil}
        />
      )}
    </div>
  )
}
