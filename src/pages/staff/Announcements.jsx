import { useState } from 'react'
import { useApp } from '../../store/AppStore.jsx'
import { useStaffBuilding } from '../../hooks/useStaffBuilding.js'
import {
  Banner,
  Button,
  Card,
  Checkbox,
  DataTable,
  Field,
  Input,
  StatusBadge,
  Textarea,
} from '../../components/ui.jsx'
import { fmtDate, fmtTime } from '../../lib/time.js'

export function Announcements() {
  const { state, publishAnnouncement, endAnnouncement, toast } = useApp()
  const { buildings } = useStaffBuilding()
  const [selectedBuildingIds, setSelectedBuildingIds] = useState([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [blockBookings, setBlockBookings] = useState(false)
  const [errors, setErrors] = useState({})
  const assignedBuildingIds = buildings.map((booking) => booking.id)
  const announcements = state.announcements.filter((announcement) =>
    announcement.buildingIds.some((id) => assignedBuildingIds.includes(id))
  )

  function handlePublishAnnouncement(event) {
    event.preventDefault()
    const result = publishAnnouncement({
      buildingIds: selectedBuildingIds,
      title,
      message,
      start,
      end,
      blockBookings: blockBookings,
    })
    if (!result.ok) {
      return setErrors(
        result.errors || {
          form: 'Could not publish announcement.',
        }
      )
    }
    toast(
      `Announcement published${result.cancelled ? `; ${result.cancelled} booking(s) cancelled` : ''}.`
    )
    setSelectedBuildingIds([])
    setTitle('')
    setMessage('')
    setStart('')
    setEnd('')
    setBlockBookings(false)
    setErrors({})
  }
  const columns = [
    {
      key: 'title',
      label: 'Title',
      render: (a) => (
        <>
          <strong>{a.title}</strong>
          <p className="small muted">{a.message}</p>
        </>
      ),
    },
    {
      key: 'buildingIds',
      label: 'Buildings',
      render: (a) => a.buildingIds.filter((id) => assignedBuildingIds.includes(id)).join(', '),
    },
    {
      key: 'start',
      label: 'When',
      render: (a) =>
        `${fmtDate(a.start)} ${fmtTime(a.start)} – ${fmtDate(a.end)} ${fmtTime(a.end)}`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (a) => <StatusBadge status={a.status} />,
    },
    {
      key: 'action',
      label: '',
      render: (a) =>
        a.status !== 'expired' && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              endAnnouncement(a.id)
              toast('Announcement ended.')
            }}
          >
            End early
          </Button>
        ),
    },
  ]
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-sub">Keep students informed about their laundry rooms.</p>
        </div>
      </header>
      <Card title="Announcements" bodyClass="no-pad">
        <DataTable rows={announcements} columns={columns} />
      </Card>
      <Card title="New announcement" subtitle="Publish to one or more assigned buildings.">
        <form onSubmit={handlePublishAnnouncement} className="stack">
          <Field label="Buildings" required error={errors.buildings}>
            {buildings.map((building) => (
              <Checkbox
                key={building.id}
                label={building.name}
                checked={selectedBuildingIds.includes(building.id)}
                onChange={(on) =>
                  setSelectedBuildingIds(
                    on
                      ? [...selectedBuildingIds, building.id]
                      : selectedBuildingIds.filter((entry) => entry !== building.id)
                  )
                }
              />
            ))}
          </Field>
          <Field label="Title" required error={errors.title} hint={`${title.length}/80`}>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
            />
          </Field>
          <Field label="Message" required error={errors.message} hint={`${message.length}/500`}>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={500}
            />
          </Field>
          <div className="form-grid">
            <Field label="Starts" required error={errors.time}>
              <Input
                type="datetime-local"
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </Field>
            <Field label="Ends" required error={errors.end}>
              <Input
                type="datetime-local"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
              />
            </Field>
          </div>
          <Checkbox
            label="Block bookings during this time"
            hint="Overlapping upcoming bookings will be cancelled."
            checked={blockBookings}
            onChange={setBlockBookings}
          />
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <div>
            <Button type="submit">Publish announcement</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
