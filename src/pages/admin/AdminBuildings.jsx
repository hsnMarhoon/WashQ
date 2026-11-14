import { useState } from 'react'
import { useApp } from '../../store/AppStore.jsx'
import { Icon } from '../../components/Icons.jsx'
import { Banner, Button, Card, DataTable, Field, Input, Modal, Select } from '../../components/ui.jsx'
import { CLOSE_HOURS, OPEN_HOURS, hourLabel, hoursLabel } from './helpers.js'

const EMPTY_FORM = { id: '', name: '', location: '', opens: '06:00', closes: '24:00' }

export function AdminBuildings() {
  const { state, addBuilding, updateBuilding, removeBuilding, toast } = useApp()
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null) // null = adding a new building
  const [errors, setErrors] = useState({})
  const [blocked, setBlocked] = useState(null) // details for the "can't remove" dialog

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setErrors({})
  }

  const startEdit = (building) => {
    setEditingId(building.id)
    setForm({
      id: building.id,
      name: building.name,
      location: building.location,
      opens: building.opens,
      closes: building.closes,
    })
    setErrors({})
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (editingId) {
      // updateBuilding does not validate, so the same checks are done here.
      const found = {}
      if (!form.name.trim()) found.name = 'Display name is required.'
      if (form.opens >= form.closes) found.closes = 'Opening time must be before closing time.'
      if (Object.keys(found).length) {
        setErrors(found)
        return
      }
      updateBuilding(editingId, {
        name: form.name.trim(),
        location: form.location.trim(),
        opens: form.opens,
        closes: form.closes,
      })
      toast(`Building ${editingId} updated.`)
      resetForm()
      return
    }

    const res = addBuilding(form)
    if (!res.ok) {
      setErrors(res.errors)
      return
    }
    toast(`${res.building.name} added. It now appears in the sign-up list.`)
    resetForm()
  }

  const handleRemove = (building) => {
    const res = removeBuilding(building.id)
    if (!res.ok) {
      setBlocked({ building, machines: res.machines, bookings: res.bookings })
      return
    }
    if (editingId === building.id) resetForm()
    toast(`${building.name} removed.`, 'info')
  }

  const columns = [
    {
      key: 'name',
      label: 'Building',
      render: (b) => (
        <span className="building-cell">
          <span className="building-icon"><Icon name="building" size={18} /></span>
          <div>
            <strong>{b.name}</strong>
            <span className="muted small">No. {b.id}</span>
          </div>
        </span>
      ),
    },
    { key: 'location', label: 'Laundry room', render: (b) => b.location || <span className="muted">—</span> },
    { key: 'hours', label: 'Hours', render: (b) => hoursLabel(b) },
    {
      key: 'machines',
      label: 'Machines',
      align: 'center',
      render: (b) => state.machines.filter((m) => m.buildingId === b.id).length,
    },
    { key: 'staff', label: 'Staff', align: 'center', render: (b) => b.staffIds.length },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (b) => (
        <span className="row-actions">
          <Button variant="ghost" size="sm" icon="edit" onClick={() => startEdit(b)}>Edit</Button>
          <Button variant="ghost" size="sm" icon="trash" onClick={() => handleRemove(b)}>Remove</Button>
        </span>
      ),
    },
  ]

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Buildings</h1>
          <p className="page-sub">Every dormitory building with a laundry room, its opening hours and how many machines and staff it has.</p>
        </div>
      </header>

      <div className="two-col">
        <Card title="All buildings" subtitle={`${state.buildings.length} buildings`} bodyClass="no-pad">
          <DataTable columns={columns} rows={state.buildings} />
          <p className="table-note">
            <Icon name="info" size={14} /> New buildings appear in the student sign-up list immediately.
          </p>
        </Card>

        <Card
          title={editingId ? `Edit Building ${editingId}` : 'Add building'}
          subtitle={editingId ? 'The building number cannot be changed.' : 'Register a new building and its laundry room.'}
        >
          <form className="stack" onSubmit={handleSubmit} noValidate>
            <Field label="Building number" required error={errors.id} id="b-id">
              <Input
                id="b-id"
                value={form.id}
                onChange={(e) => setField('id', e.target.value)}
                placeholder="e.g. 820"
                inputMode="numeric"
                disabled={!!editingId}
              />
            </Field>
            <Field label="Display name" required error={errors.name} id="b-name">
              <Input
                id="b-name"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="e.g. Building 820"
              />
            </Field>
            <Field label="Laundry room location" id="b-location">
              <Input
                id="b-location"
                value={form.location}
                onChange={(e) => setField('location', e.target.value)}
                placeholder="e.g. Ground floor, west wing"
              />
            </Field>
            <div className="form-grid">
              <Field label="Opens" error={errors.hours} id="b-opens">
                <Select id="b-opens" value={form.opens} onChange={(e) => setField('opens', e.target.value)}>
                  {OPEN_HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                </Select>
              </Field>
              <Field label="Closes" error={errors.closes} id="b-closes">
                <Select id="b-closes" value={form.closes} onChange={(e) => setField('closes', e.target.value)}>
                  {CLOSE_HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                </Select>
              </Field>
            </div>
            <div className="form-actions">
              <Button type="submit" icon={editingId ? 'check' : 'plus'}>
                {editingId ? 'Save changes' : 'Save building'}
              </Button>
              {editingId && <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>}
            </div>
          </form>
        </Card>
      </div>

      <Modal
        open={!!blocked}
        onClose={() => setBlocked(null)}
        title={`Can't remove ${blocked?.building.name}`}
        size="sm"
        footer={<Button onClick={() => setBlocked(null)}>OK</Button>}
      >
        {blocked && (
          <Banner tone="warn" title={`This building still has ${blocked.machines} machines and ${blocked.bookings} upcoming bookings.`}>
            Retire its machines first on the Machines page. Buildings with machines or active bookings cannot be removed.
          </Banner>
        )}
      </Modal>
    </div>
  )
}
