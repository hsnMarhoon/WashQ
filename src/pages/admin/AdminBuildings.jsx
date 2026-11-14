import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppStore.jsx'
import { Icon } from '../../components/Icons.jsx'
import {
  Badge, Banner, Button, Card, ConfirmDialog, DataTable, EmptyState, Field, Input, InlineError, Modal, Select,
} from '../../components/ui.jsx'

export function AdminBuildings() {
  const { state, addBuilding, updateBuilding, removeBuilding, toast } = useApp()
  const navigate = useNavigate()
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [removeError, setRemoveError] = useState(null)

  const buildings = [...state.buildings].sort((a, b) => a.id.localeCompare(b.id))

  const machinesFor = (id) => state.machines.filter((m) => m.buildingId === id)
  const staffFor = (b) => state.users.filter((u) => u.role === 'staff' && (u.buildingIds || []).includes(b.id))
  const studentsFor = (id) => state.users.filter((u) => u.role === 'student' && u.buildingId === id)

  const columns = [
    {
      key: 'building',
      label: 'Building',
      render: (b) => (
        <div className="building-cell">
          <span className="building-icon"><Icon name="building" size={20} /></span>
          <div>
            <strong>{b.name}</strong>
            <span className="small muted">No. {b.id} · {b.location || 'No location set'}</span>
          </div>
        </div>
      ),
    },
    { key: 'machines', label: 'Machines', render: (b) => `${machinesFor(b.id).length} (${machinesFor(b.id).filter((m) => m.status === 'out-of-order' || m.status === 'maintenance').length} out)` },
    { key: 'staff', label: 'Staff', render: (b) => (staffFor(b).length ? staffFor(b).map((s) => s.name).join(', ') : <Badge tone="red">Uncovered</Badge>) },
    { key: 'students', label: 'Residents', render: (b) => studentsFor(b.id).length },
    { key: 'hours', label: 'Hours', render: (b) => `${b.opens}–${b.closes}` },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (b) => (
        <div className="row-actions">
          <Button size="sm" variant="secondary" onClick={() => setEditing(b)}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => { setRemoving(b); setRemoveError(null) }}>Remove</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Buildings</h1>
          <p className="page-sub">Dormitory laundry rooms, their opening hours and the staff assigned to them.</p>
        </div>
        <div className="page-actions">
          <Button icon="plus" onClick={() => setAddOpen(true)}>Add building</Button>
        </div>
      </header>

      <div className="kpi-grid">
        <div className="kpi kpi-teal"><span className="kpi-icon"><Icon name="building" size={20} /></span><span className="kpi-body"><span className="kpi-label">Buildings</span><span className="kpi-value">{state.buildings.length}</span><span className="kpi-hint">Laundry rooms</span></span></div>
        <div className="kpi kpi-blue"><span className="kpi-icon"><Icon name="washer" size={20} /></span><span className="kpi-body"><span className="kpi-label">Machines</span><span className="kpi-value">{state.machines.length}</span><span className="kpi-hint">{state.machines.filter((m) => m.status === 'out-of-order').length} out of order</span></span></div>
        <div className="kpi kpi-purple"><span className="kpi-icon"><Icon name="users" size={20} /></span><span className="kpi-body"><span className="kpi-label">Residents</span><span className="kpi-value">{state.users.filter((u) => u.role === 'student').length}</span><span className="kpi-hint">Across all buildings</span></span></div>
        <div className="kpi kpi-amber"><span className="kpi-icon"><Icon name="user" size={20} /></span><span className="kpi-body"><span className="kpi-label">Staff</span><span className="kpi-value">{state.users.filter((u) => u.role === 'staff').length}</span><span className="kpi-hint">Assigned to buildings</span></span></div>
      </div>

      <Card title="All buildings" subtitle="Removing a building is blocked while it still has machines or upcoming bookings." bodyClass="no-pad">
        <DataTable
          columns={columns}
          rows={buildings}
          empty={<EmptyState icon="building" title="No buildings">Add the first laundry room.</EmptyState>}
        />
      </Card>

      <div className="inline-cards">
        <Card title="Room hours" subtitle="Students can only book slots inside these hours.">
          <div className="mini-table">
            {buildings.map((b) => (
              <div key={b.id} className="mini-row"><strong>{b.name}</strong><span>{b.opens}–{b.closes}</span></div>
            ))}
          </div>
        </Card>
        <Card title="Staff coverage" subtitle="Every building must keep at least one staff member.">
          <ul className="coverage-list">
            {buildings.map((b) => {
              const staff = staffFor(b)
              return (
                <li key={b.id}>
                  <span>{b.name}</span>
                  {staff.length ? <span className="muted small">{staff.map((s) => s.name).join(', ')}</span> : <Badge tone="red">No staff</Badge>}
                </li>
              )
            })}
          </ul>
          <Button size="sm" variant="secondary" onClick={() => navigate('/admin/users')}>Assign staff</Button>
        </Card>
      </div>

      <BuildingFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(payload) => {
          const res = addBuilding(payload)
          if (res.ok) {
            toast(`${res.building.name} added.`)
            setAddOpen(false)
          }
          return res
        }}
        title="Add building"
        submitLabel="Add building"
      />

      {editing && (
        <BuildingFormModal
          open
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(payload) => {
            if (!payload.name.trim()) return { ok: false, errors: { name: 'Display name is required.' } }
            if (payload.opens >= payload.closes && payload.closes !== '24:00') {
              return { ok: false, errors: { closes: 'Opening time must be before closing time.' } }
            }
            updateBuilding(editing.id, {
              name: payload.name.trim(),
              location: payload.location.trim(),
              opens: payload.opens,
              closes: payload.closes,
            })
            toast(`${payload.name} updated.`)
            setEditing(null)
            return { ok: true }
          }}
          title={`Edit Building ${editing.id}`}
          submitLabel="Save changes"
          lockNumber
        />
      )}

      <ConfirmDialog
        open={!!removing}
        onClose={() => { setRemoving(null); setRemoveError(null) }}
        title={`Remove Building ${removing?.id}?`}
        confirmLabel="Remove building"
        tone="danger"
        body={removing ? `${removing.name} will be removed permanently. This cannot be undone.` : ''}
        onConfirm={() => {
          const res = removeBuilding(removing.id)
          if (!res.ok) {
            setRemoveError(`This building still has ${res.machines} machine${res.machines === 1 ? '' : 's'} and ${res.bookings} upcoming booking${res.bookings === 1 ? '' : 's'}. Move or retire them first.`)
            return
          }
          toast(`${removing.name} removed.`)
          setRemoving(null)
        }}
      >
        {removeError && <InlineError>{removeError}</InlineError>}
      </ConfirmDialog>
    </div>
  )
}

function BuildingFormModal({ open, onClose, onSave, initial = null, title, submitLabel, lockNumber = false }) {
  const [id, setId] = useState(initial?.id || '')
  const [name, setName] = useState(initial?.name || '')
  const [location, setLocation] = useState(initial?.location || '')
  const [opens, setOpens] = useState(initial?.opens || '06:00')
  const [closes, setCloses] = useState(initial?.closes || '24:00')
  const [errors, setErrors] = useState({})

  const submit = () => {
    const next = {}
    if (!/^\d{3,4}$/.test(id.trim())) next.id = 'Building number must be 3–4 digits.'
    if (!name.trim()) next.name = 'Display name is required.'
    if (opens >= closes && closes !== '24:00') next.closes = 'Opening time must be before closing time.'
    if (Object.keys(next).length) { setErrors(next); return }
    const res = onSave({ id: id.trim(), name, location, opens, closes })
    if (!res.ok) setErrors(res.errors || {})
    else setErrors({})
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Students see this name and these opening hours when they book."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon="check" onClick={submit}>{submitLabel}</Button>
        </>
      }
    >
      <div className="stack">
        <div className="form-grid">
          <Field label="Building number" required error={errors.id} hint="3–4 digits, unique.">
            <Input value={id} onChange={(e) => { setId(e.target.value); setErrors((x) => ({ ...x, id: '' })) }} placeholder="812" disabled={lockNumber} inputMode="numeric" maxLength={4} />
          </Field>
          <Field label="Display name" required error={errors.name}>
            <Input value={name} onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: '' })) }} placeholder="Building 812" maxLength={50} />
          </Field>
        </div>
        <Field label="Location" hint="Where the laundry room is inside the building.">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ground floor, east wing" maxLength={80} />
        </Field>
        <div className="form-grid">
          <Field label="Room opens" required>
            <Input type="time" value={opens === '24:00' ? '00:00' : opens} onChange={(e) => setOpens(e.target.value)} />
          </Field>
          <Field label="Room closes" required error={errors.closes}>
            <Select value={closes} onChange={(e) => { setCloses(e.target.value); setErrors((x) => ({ ...x, closes: '' })) }}>
              {Array.from({ length: 24 }).map((_, i) => {
                const v = `${String(i + 1).padStart(2, '0')}:00`
                return <option key={v} value={v}>{v}</option>
              })}
              <option value="24:00">24:00 (midnight)</option>
            </Select>
          </Field>
        </div>
        <Banner tone="info" icon="info">
          Opening hours apply to new bookings. Existing bookings keep the rules they were made under.
        </Banner>
        <InlineError>{errors.form}</InlineError>
      </div>
    </Modal>
  )
}
