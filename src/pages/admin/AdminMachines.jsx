import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppStore.jsx'
import { Icon } from '../../components/Icons.jsx'
import {
  Badge, Banner, Button, Card, ConfirmDialog, DataTable, EmptyState, Field, Input,
  InlineError, Modal, Select, StatusBadge,
} from '../../components/ui.jsx'
import { fmtDate, timeAgo } from '../../lib/time.js'

export function AdminMachines() {
  const { state, addMachine, updateMachine, retireMachine, toast } = useApp()
  const [buildingId, setBuildingId] = useState(state.buildings[0]?.id || '')
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [retiring, setRetiring] = useState(null)
  const [qrFor, setQrFor] = useState(null)
  const [query, setQuery] = useState('')

  const machines = useMemo(
    () =>
      state.machines
        .filter((m) => m.buildingId === buildingId)
        .filter((m) => `${m.label} ${m.model} ${m.status}`.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [state.machines, buildingId, query],
  )

  const columns = [
    {
      key: 'machine',
      label: 'Machine',
      render: (m) => (
        <span className="table-machine">
          <span className={`machine-chip ${m.type}`}><Icon name={m.type === 'washer' ? 'washer' : 'dryer'} size={15} /></span>
          <span>
            <strong>{m.label}</strong>
            <span className="small muted">{m.model}</span>
          </span>
        </span>
      ),
    },
    { key: 'type', label: 'Type', render: (m) => (m.type === 'washer' ? 'Washer' : 'Dryer') },
    { key: 'cycle', label: 'Cycle', render: (m) => `${m.cycle} min` },
    { key: 'status', label: 'Status', render: (m) => <StatusBadge status={m.status} /> },
    { key: 'serviced', label: 'Last serviced', render: (m) => fmtDate(m.lastServiced, true) },
    {
      key: 'qr',
      label: 'QR',
      render: (m) => <button type="button" className="link-btn mono" onClick={() => setQrFor(m)}>{m.qr}</button>,
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (m) => (
        <div className="row-actions">
          <Button size="sm" variant="secondary" onClick={() => setEditing(m)}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => setRetiring(m)}>Retire</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Machines</h1>
          <p className="page-sub">Register machines, adjust cycle lengths and retire units at the end of their life.</p>
        </div>
        <div className="page-actions">
          <Select value={buildingId} onChange={(e) => setBuildingId(e.target.value)} aria-label="Building">
            {state.buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Button icon="plus" onClick={() => setAddOpen(true)}>Register machine</Button>
        </div>
      </header>

      <div className="kpi-grid">
        <div className="kpi kpi-teal"><span className="kpi-icon"><Icon name="washer" size={20} /></span><span className="kpi-body"><span className="kpi-label">Machines in building</span><span className="kpi-value">{state.machines.filter((m) => m.buildingId === buildingId).length}</span><span className="kpi-hint">{state.machines.filter((m) => m.buildingId === buildingId && m.type === 'washer').length} washers · {state.machines.filter((m) => m.buildingId === buildingId && m.type === 'dryer').length} dryers</span></span></div>
        <div className="kpi kpi-red"><span className="kpi-icon"><Icon name="wrench" size={20} /></span><span className="kpi-body"><span className="kpi-label">Out of order</span><span className="kpi-value">{state.machines.filter((m) => m.buildingId === buildingId && m.status === 'out-of-order').length}</span><span className="kpi-hint">Needs a repair log</span></span></div>
        <div className="kpi kpi-amber"><span className="kpi-icon"><Icon name="calendar" size={20} /></span><span className="kpi-body"><span className="kpi-label">Under maintenance</span><span className="kpi-value">{state.machines.filter((m) => m.buildingId === buildingId && m.status === 'maintenance').length}</span><span className="kpi-hint">Blocked windows</span></span></div>
        <div className="kpi kpi-blue"><span className="kpi-icon"><Icon name="check-circle" size={20} /></span><span className="kpi-body"><span className="kpi-label">Available now</span><span className="kpi-value">{state.machines.filter((m) => m.buildingId === buildingId && m.status === 'available').length}</span><span className="kpi-hint">Bookable by students</span></span></div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Icon name="search" size={16} />
          <input className="search-input" placeholder="Search machines…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search machines" />
        </div>
        <span className="muted small">{machines.length} of {state.machines.filter((m) => m.buildingId === buildingId).length}</span>
      </div>

      <Card bodyClass="no-pad">
        <DataTable
          columns={columns}
          rows={machines}
          empty={<EmptyState icon="washer" title="No machines in this building">Register the first washer or dryer.</EmptyState>}
        />
      </Card>

      <Banner tone="info" icon="info">
        Retiring a machine cancels its future bookings and notifies students. Prefer “Out of order” for temporary faults.
      </Banner>

      <RegisterMachineModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        buildings={state.buildings}
        defaultBuilding={buildingId}
        onSave={(payload) => {
          const res = addMachine(payload)
          if (res.ok) {
            toast(`${res.machine.label} registered in Building ${res.machine.buildingId}.`)
            setAddOpen(false)
          }
          return res
        }}
      />

      {editing && (
        <EditMachineModal
          machine={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            if (!(Number(patch.cycle) >= 15 && Number(patch.cycle) <= 120)) {
              return { ok: false, errors: { cycle: 'Cycle must be 15–120 minutes.' } }
            }
            if (patch.status === 'out-of-order' && !(patch.faultNote || '').trim()) {
              return { ok: false, errors: { faultNote: 'Add a short reason for students.' } }
            }
            updateMachine(editing.id, {
              model: patch.model.trim(),
              cycle: Number(patch.cycle),
              status: patch.status,
              faultNote: patch.status === 'out-of-order' ? patch.faultNote.trim() : patch.status === 'available' ? null : editing.faultNote,
              outSince: patch.status === 'out-of-order' ? editing.outSince || new Date().toISOString() : patch.status === 'available' ? null : editing.outSince,
            })
            toast(`${editing.label} updated.`)
            setEditing(null)
            return { ok: true }
          }}
        />
      )}

      <ConfirmDialog
        open={!!retiring}
        onClose={() => setRetiring(null)}
        title={`Retire ${retiring?.label}?`}
        confirmLabel="Retire machine"
        tone="danger"
        body={retiring ? `${retiring.label} will be removed from Building ${retiring.buildingId} permanently.` : ''}
        onConfirm={() => {
          const res = retireMachine(retiring.id)
          toast(`${retiring.label} retired${res.cancelled ? `; ${res.cancelled} booking${res.cancelled === 1 ? '' : 's'} cancelled` : ''}.`)
          setRetiring(null)
        }}
      >
        {retiring && (
          <div className="stack">
            <p className="small muted">
              {state.bookings.filter((b) => b.machineId === retiring.id && b.status === 'upcoming').length} upcoming booking(s) will be cancelled and students notified.
              Repair history is kept for reporting.
            </p>
            <Banner tone="warn" title="Consider downtime first">If the machine is only temporarily broken, set it out of order instead.</Banner>
          </div>
        )}
      </ConfirmDialog>

      <Modal
        open={!!qrFor}
        onClose={() => setQrFor(null)}
        title={`QR label · ${qrFor?.label || ''}`}
        subtitle="Students scan this code to check in."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setQrFor(null)}>Close</Button>
            <Button
              variant="secondary"
              icon="download"
              onClick={() => {
                navigator.clipboard?.writeText(qrFor.qr)
                toast('Machine code copied to the clipboard.', 'info')
              }}
            >
              Copy code
            </Button>
          </>
        }
      >
        {qrFor && (
          <div className="qr-modal">
            <span className="qr-pattern large" aria-hidden="true">
              {Array.from({ length: 81 }).map((_, i) => <span key={i} className={(i * 7 + 3) % 5 < 2 ? 'on' : ''} />)}
            </span>
            <strong className="mono">{qrFor.qr}</strong>
            <p className="small muted">{qrFor.label} · Building {qrFor.buildingId} · {qrFor.type === 'washer' ? 'Washer' : 'Dryer'}</p>
            <Badge tone="gray">Last serviced {timeAgo(qrFor.lastServiced)} ago</Badge>
          </div>
        )}
      </Modal>
    </div>
  )
}

function RegisterMachineModal({ open, onClose, buildings, defaultBuilding, onSave }) {
  const [buildingId, setBuildingId] = useState(defaultBuilding)
  const [label, setLabel] = useState('')
  const [type, setType] = useState('washer')
  const [model, setModel] = useState('')
  const [cycle, setCycle] = useState('45')
  const [errors, setErrors] = useState({})

  const submit = () => {
    const res = onSave({ buildingId, label, type, model, cycle: Number(cycle), status: 'available' })
    if (!res.ok) setErrors(res.errors || {})
    else {
      setErrors({})
      setLabel('')
      setModel('')
      setCycle('45')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Register a machine"
      subtitle="Machine labels are unique inside a building (for example W6 or D4)."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon="plus" onClick={submit}>Register machine</Button>
        </>
      }
    >
      <div className="stack">
        <div className="form-grid">
          <Field label="Building" required>
            <Select value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="Label" required error={errors.label} hint="For example W6 or D4.">
            <Input value={label} onChange={(e) => { setLabel(e.target.value.toUpperCase()); setErrors((x) => ({ ...x, label: '' })) }} maxLength={4} placeholder="W6" />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Type" required>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="washer">Washer</option>
              <option value="dryer">Dryer</option>
            </Select>
          </Field>
          <Field label="Cycle length (minutes)" required error={errors.cycle} hint="15–120 minutes.">
            <Input type="number" min="15" max="120" value={cycle} onChange={(e) => { setCycle(e.target.value); setErrors((x) => ({ ...x, cycle: '' })) }} />
          </Field>
        </div>
        <Field label="Model" hint="Used to match the right spare parts.">
          <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={type === 'washer' ? 'LG WM3400' : 'Samsung DV45'} maxLength={40} />
        </Field>
        <Banner tone="info" icon="info">
          Registering creates a QR code and a check-in code. The machine starts as Available.
        </Banner>
        <InlineError>{errors.form}</InlineError>
      </div>
    </Modal>
  )
}

function EditMachineModal({ machine, onClose, onSave }) {
  const [model, setModel] = useState(machine.model)
  const [cycle, setCycle] = useState(String(machine.cycle))
  const [status, setStatus] = useState(['available', 'maintenance', 'out-of-order'].includes(machine.status) ? machine.status : 'available')
  const [faultNote, setFaultNote] = useState(machine.faultNote || '')
  const [errors, setErrors] = useState({})

  const submit = () => {
    const res = onSave({ model, cycle, status, faultNote })
    if (!res.ok) setErrors(res.errors || {})
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${machine.label}`}
      subtitle={`Building ${machine.buildingId} · ${machine.qr}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon="check" onClick={submit}>Save changes</Button>
        </>
      }
    >
      <div className="stack">
        <div className="form-grid">
          <Field label="Model">
            <Input value={model} onChange={(e) => setModel(e.target.value)} maxLength={40} />
          </Field>
          <Field label="Cycle length (minutes)" required error={errors.cycle} hint="15–120 minutes.">
            <Input type="number" min="15" max="120" value={cycle} onChange={(e) => { setCycle(e.target.value); setErrors((x) => ({ ...x, cycle: '' })) }} />
          </Field>
        </div>
        <Field label="Status" required>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="available">Available</option>
            <option value="maintenance">Under maintenance</option>
            <option value="out-of-order">Out of order</option>
          </Select>
        </Field>
        {status === 'out-of-order' && (
          <Field label="Reason shown to students" required error={errors.faultNote}>
            <Input value={faultNote} onChange={(e) => { setFaultNote(e.target.value); setErrors((x) => ({ ...x, faultNote: '' })) }} maxLength={120} placeholder="Awaiting drain pump" />
          </Field>
        )}
        <InlineError>{errors.form}</InlineError>
      </div>
    </Modal>
  )
}
