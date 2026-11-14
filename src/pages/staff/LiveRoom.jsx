import { useState } from 'react'
import { useApp } from '../../store/AppStore.jsx'
import { studentTag, useStaffBuilding } from '../../hooks/useStaffBuilding.js'
import {
  Banner,
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  Modal,
  Select,
  StatusBadge,
  Textarea,
} from '../../components/ui.jsx'
import { fmtDate, fmtRange, timeAgo } from '../../lib/time.js'

export function LiveRoom() {
  const { state, releaseBooking, extendCheckIn, resolveFlag, removeStrike, toast } = useApp()
  const { buildings, buildingId, setBuildingId } = useStaffBuilding()
  const [pendingAction, setPendingAction] = useState(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [formError, setFormError] = useState('')
  const currentBookings = state.bookings.filter(
    (booking) =>
      booking.buildingId === buildingId &&
      (booking.status === 'checked-in' || booking.status === 'upcoming') &&
      new Date(booking.start).getTime() < Date.now() + 2 * 3600000
  )
  const escalatedFlags = state.flags.filter(
    (flag) => flag.buildingId === buildingId && flag.status === 'open' && flag.escalated
  )
  const noShowBookings = state.bookings.filter(
    (booking) =>
      booking.buildingId === buildingId &&
      booking.status === 'no-show' &&
      (state.users.find((user) => user.id === booking.userId)?.strikes || 0) > 0
  )
  const getMachineLabel = (id) => state.machines.find((machine) => machine.id === id)?.label || id
  const getStudentTag = (id) => studentTag(state.users.find((user) => user.id === id))

  function handleConfirmOverride() {
    if (!overrideReason.trim()) {
      return setFormError('A reason is required.')
    }
    const reason = overrideReason.trim()
    const target = pendingAction.row
    let result

    switch (pendingAction.kind) {
      case 'Release':
        result = releaseBooking(target.id, reason)
        break
      case 'Extend check-in':
        result = extendCheckIn(target.id, reason)
        break
      case 'Resolve flag':
        result = resolveFlag(target.id, reason)
        break
      default:
        result = removeStrike(target.userId, reason)
    }

    if (!result.ok) {
      return setFormError('This action could not be applied.')
    }
    toast(`${pendingAction.kind} completed.`)
    setPendingAction(null)
    setOverrideReason('')
    setFormError('')
  }
  const columns = [
    {
      key: 'machineId',
      label: 'Machine',
      render: (b) => getMachineLabel(b.machineId),
    },
    {
      key: 'userId',
      label: 'Student',
      render: (b) => getStudentTag(b.userId),
    },
    {
      key: 'start',
      label: 'Slot',
      render: (b) => fmtRange(b.start, b.end),
    },
    {
      key: 'status',
      label: 'Status',
      render: (b) => <StatusBadge status={b.status} />,
    },
    {
      key: 'action',
      label: '',
      render: (b) => (
        <div className="row-actions">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setPendingAction({
                kind: 'Release',
                row: b,
              })
            }
          >
            Release
          </Button>
          {b.status === 'upcoming' && !b.staffExtended && new Date(b.start) <= new Date() && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setPendingAction({
                  kind: 'Extend check-in',
                  row: b,
                })
              }
            >
              Extend +10 min
            </Button>
          )}
        </div>
      ),
    },
  ]
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Live room</h1>
          <p className="page-sub">Every override requires a reason and is recorded.</p>
        </div>
        <Select
          aria-label="Building"
          value={buildingId || ''}
          onChange={(event) => setBuildingId(event.target.value)}
        >
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </Select>
      </header>
      {!buildings.length ? (
        <EmptyState title="No assigned buildings" />
      ) : (
        <>
          <Card title="Current bookings" bodyClass="no-pad">
            <DataTable
              rows={currentBookings}
              columns={columns}
              empty={<EmptyState compact title="No current bookings" />}
            />
          </Card>
          <div className="form-grid">
            <Card title="Queues">
              {['washer', 'dryer'].map((machineType) => (
                <p key={machineType}>
                  <strong>{machineType === 'washer' ? 'Washers' : 'Dryers'}</strong> ·{' '}
                  {(state.queues[`${buildingId}-${machineType}`] || []).length} waiting
                  {state.claim?.queueKey === `${buildingId}-${machineType}` &&
                    ` · claim ends ${new Date(state.claim.endsAt).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}`}
                </p>
              ))}
            </Card>
            <Card title="Unattended-laundry flags">
              {escalatedFlags.length ? (
                escalatedFlags.map((flag) => (
                  <div className="toolbar" key={flag.id}>
                    <span>
                      {getMachineLabel(flag.machineId)} · {timeAgo(flag.at)}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setPendingAction({
                          kind: 'Resolve flag',
                          row: flag,
                        })
                      }
                    >
                      Resolve
                    </Button>
                  </div>
                ))
              ) : (
                <p className="muted">No escalated flags.</p>
              )}
            </Card>
            <Card title="Recent no-show strikes">
              {noShowBookings.length ? (
                noShowBookings.map((booking) => (
                  <div className="toolbar" key={booking.id}>
                    <span>
                      {getStudentTag(booking.userId)} · {getMachineLabel(booking.machineId)} ·{' '}
                      {fmtDate(booking.start)}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setPendingAction({
                          kind: 'Remove strike',
                          row: booking,
                        })
                      }
                    >
                      Remove strike
                    </Button>
                  </div>
                ))
              ) : (
                <p className="muted">No recorded strikes.</p>
              )}
            </Card>
          </div>
        </>
      )}
      {pendingAction && (
        <Modal
          open
          onClose={() => {
            setPendingAction(null)
            setFormError('')
          }}
          title={pendingAction.kind}
          subtitle="This action is recorded in the staff action log."
          footer={
            <>
              <Button variant="ghost" onClick={() => setPendingAction(null)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmOverride}>Confirm</Button>
            </>
          }
        >
          <div className="stack">
            <p>
              {pendingAction.row.machineId && `${getMachineLabel(pendingAction.row.machineId)} · `}
              {pendingAction.row.userId && getStudentTag(pendingAction.row.userId)}
            </p>
            {pendingAction.kind === 'Resolve flag' && (
              <Banner tone="info">Confirm the load has been moved to the holding shelf.</Banner>
            )}
            <Field label="Reason" required>
              <Textarea
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                maxLength={300}
              />
            </Field>
            {formError && <Banner tone="danger">{formError}</Banner>}
          </div>
        </Modal>
      )}
    </div>
  )
}
