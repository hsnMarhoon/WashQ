import { useState } from 'react'
import { useApp } from '../store/AppStore.jsx'
import { Banner, Button, Field, Input, Modal, Select, Textarea } from './ui.jsx'

export function MaintenanceModal({ machine, onClose }) {
  const { state, scheduleMaintenance, toast } = useApp()
  const [start, setStart] = useState('')
  const [duration, setDuration] = useState('60')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')
  const startMs = new Date(start).getTime()
  const endMs = startMs + Number(duration) * 60000
  const affectedBookingCount = state.bookings.filter(
    (booking) =>
      booking.machineId === machine.id &&
      booking.status === 'upcoming' &&
      new Date(booking.start).getTime() < endMs &&
      new Date(booking.end).getTime() > startMs
  ).length

  function handleScheduleMaintenance() {
    if (!Number.isFinite(startMs) || startMs <= Date.now()) {
      return setFormError('Choose a future start time.')
    }
    const result = scheduleMaintenance({
      machineId: machine.id,
      start: new Date(startMs).toISOString(),
      duration: Number(duration),
      note: note.trim(),
    })
    if (!result.ok) {
      return setFormError(
        result.error === 'overlap'
          ? 'This window overlaps another maintenance block.'
          : 'Choose a duration between 15 minutes and 8 hours.'
      )
    }
    toast(`Maintenance scheduled. ${result.moved} booking(s) moved; ${result.cancelled} cancelled.`)
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={`Schedule maintenance · ${machine.label}`}
      subtitle={`Building ${machine.buildingId}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleScheduleMaintenance}>Schedule</Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Start date and time" required>
          <Input
            type="datetime-local"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </Field>
        <Field label="Duration" required>
          <Select value={duration} onChange={(event) => setDuration(event.target.value)}>
            {[15, 30, 45, 60, 90, 120, 180, 240, 360, 480].map((n) => (
              <option key={n} value={n}>
                {n < 60 ? `${n} minutes` : `${n / 60} hour(s)`}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Note">
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={200}
            placeholder="e.g. Filter cleaning"
          />
        </Field>
        <Banner tone="info">
          {affectedBookingCount} upcoming booking(s) overlap this window. They will be moved where
          possible or cancelled, and students notified.
        </Banner>
        {formError && <Banner tone="danger">{formError}</Banner>}
      </div>
    </Modal>
  )
}
