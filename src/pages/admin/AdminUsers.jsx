import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppStore.jsx'
import { Icon } from '../../components/Icons.jsx'
import {
  Badge, Banner, Button, Card, Checkbox, ConfirmDialog, DataTable, EmptyState, Field,
  InlineError, Input, Modal, Select, Tabs, Textarea,
} from '../../components/ui.jsx'
import { useNow } from '../../hooks/useNow.js'
import { fmtDate, timeAgo } from '../../lib/time.js'

export function AdminUsers() {
  const { state, createUser, assignBuildings, disableUser, resetUserPassword, liftSuspension, toast } = useApp()
  const now = useNow(30000)
  const [tab, setTab] = useState('staff')
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [assigning, setAssigning] = useState(null)
  const [disabling, setDisabling] = useState(null)
  const [lifting, setLifting] = useState(null)

  const staff = state.users.filter((u) => u.role === 'staff' || u.role === 'admin')
  const students = state.users.filter((u) => u.role === 'student')
  const filtered = (tab === 'staff' ? staff : students).filter((u) => {
    const q = query.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.studentId || '').includes(q)
  })

  const isSuspended = (u) => u.status === 'suspended' || (u.suspendedUntil && new Date(u.suspendedUntil) > new Date(now))

  const staffColumns = [
    {
      key: 'user',
      label: 'User',
      render: (u) => (
        <div className="user-cell">
          <span className="avatar">{u.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</span>
          <div>
            <strong>{u.name}</strong>
            <span className="small muted">{u.email}</span>
          </div>
        </div>
      ),
    },
    { key: 'role', label: 'Role', render: (u) => <Badge tone={u.role === 'admin' ? 'purple' : 'blue'}>{u.role === 'admin' ? 'Administrator' : 'Staff'}</Badge> },
    {
      key: 'buildings',
      label: 'Buildings',
      render: (u) =>
        u.role === 'admin' ? (
          <span className="muted">All buildings</span>
        ) : (u.buildingIds || []).length ? (
          (u.buildingIds || []).map((id) => <span className="bldg-pill" key={id}>{id}</span>)
        ) : (
          <Badge tone="red">Unassigned</Badge>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (u) =>
        u.status === 'invited' ? <Badge tone="amber" dot>Invite pending</Badge> : u.status === 'disabled' ? <Badge tone="gray" dot>Disabled</Badge> : <Badge tone="green" dot>Active</Badge>,
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (u) => (
        <div className="row-actions">
          {u.role === 'staff' && (
            <Button size="sm" variant="secondary" onClick={() => setAssigning(u)}>Assign</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => { resetUserPassword(); toast(`Password reset email sent to ${u.email}.`, 'info') }}>Reset password</Button>
          {u.status !== 'disabled' && (
            <Button size="sm" variant="ghost" onClick={() => setDisabling(u)}>Disable</Button>
          )}
        </div>
      ),
    },
  ]

  const studentColumns = [
    {
      key: 'user',
      label: 'Student',
      render: (u) => (
        <div className="user-cell">
          <span className="avatar">{u.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</span>
          <div>
            <strong>{u.name}</strong>
            <span className="small muted">{u.email}</span>
          </div>
        </div>
      ),
    },
    { key: 'id', label: 'Student ID', render: (u) => <span className="mono">{u.studentId || '—'}</span> },
    { key: 'building', label: 'Building', render: (u) => (u.buildingId ? `Building ${u.buildingId}` : '—') },
    {
      key: 'reliability',
      label: 'Strikes',
      render: (u) => <Badge tone={u.strikes >= 3 ? 'red' : u.strikes > 0 ? 'amber' : 'green'}>{u.strikes || 0} of {state.buildings.find((b) => b.id === u.buildingId)?.penalties?.strikes ?? 3}</Badge>,
    },
    {
      key: 'status',
      label: 'Account',
      render: (u) =>
        isSuspended(u) ? <Badge tone="red" dot>Suspended until {fmtDate(u.suspendedUntil, true)}</Badge> : <Badge tone="green" dot>Active</Badge>,
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (u) =>
        isSuspended(u) ? <Button size="sm" variant="secondary" onClick={() => setLifting(u)}>Lift suspension</Button> : <span className="muted small">—</span>,
    },
  ]

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-sub">Create staff and administrator accounts, assign buildings and manage access.</p>
        </div>
        <div className="page-actions">
          <Button icon="plus" onClick={() => setCreateOpen(true)}>Create account</Button>
        </div>
      </header>

      <div className="kpi-grid">
        <div className="kpi kpi-teal"><span className="kpi-icon"><Icon name="users" size={20} /></span><span className="kpi-body"><span className="kpi-label">Students</span><span className="kpi-value">{students.length}</span><span className="kpi-hint">{students.filter(isSuspended).length} suspended</span></span></div>
        <div className="kpi kpi-blue"><span className="kpi-icon"><Icon name="user" size={20} /></span><span className="kpi-body"><span className="kpi-label">Staff</span><span className="kpi-value">{staff.filter((u) => u.role === 'staff').length}</span><span className="kpi-hint">Across all buildings</span></span></div>
        <div className="kpi kpi-purple"><span className="kpi-icon"><Icon name="shield" size={20} /></span><span className="kpi-body"><span className="kpi-label">Administrators</span><span className="kpi-value">{staff.filter((u) => u.role === 'admin').length}</span><span className="kpi-hint">Full access</span></span></div>
        <div className="kpi kpi-amber"><span className="kpi-icon"><Icon name="mail" size={20} /></span><span className="kpi-body"><span className="kpi-label">Invites pending</span><span className="kpi-value">{staff.filter((u) => u.status === 'invited').length}</span><span className="kpi-hint">Awaiting activation</span></span></div>
      </div>

      <div className="tabs-row filter-row">
        <Tabs
          tabs={[
            { value: 'staff', label: 'Staff & admins', count: staff.length },
            { value: 'students', label: 'Students', count: students.length },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="search-box">
          <Icon name="search" size={16} />
          <input className="search-input" placeholder="Search name, email or ID…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search users" />
        </div>
      </div>

      {tab === 'staff' && (
        <Banner tone="warn" title="Every building needs at least one staff member" icon="alert-triangle">
          Removing the last staff member from a building is blocked unless you explicitly save anyway.
        </Banner>
      )}

      <Card bodyClass="no-pad">
        <DataTable
          columns={tab === 'staff' ? staffColumns : studentColumns}
          rows={filtered}
          empty={<EmptyState icon="users" title="No users match">Try another search or switch tabs.</EmptyState>}
        />
      </Card>

      <div className="inline-cards">
        <Card title="Account lifecycle" subtitle="How access works in WashQ">
          <ul className="help-list">
            <li>New staff receive a set-password email and cannot sign in until it is used.</li>
            <li>Disabling an account blocks sign-in immediately but keeps its history.</li>
            <li>Reset password sends a one-time link that expires in 30 minutes.</li>
            <li>Students self-register with their KFUPM email and activate their account.</li>
          </ul>
        </Card>
        <Card title="Building coverage" subtitle="Staff assignments">
          <ul className="coverage-list">
            {state.buildings.map((b) => {
              const assigned = state.users.filter((u) => u.role === 'staff' && (u.buildingIds || []).includes(b.id))
              return (
                <li key={b.id}>
                  <span>{b.name}</span>
                  {assigned.length ? <span className="muted small">{assigned.map((s) => s.name).join(', ')}</span> : <Badge tone="red">No staff</Badge>}
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        buildings={state.buildings}
        onSave={(payload) => {
          const res = createUser(payload)
          if (!res.ok) return res
          if (payload.role === 'staff' && payload.buildingIds.length) {
            assignBuildings(res.user.id, payload.buildingIds)
          }
          toast(`Account created. A set-password email was sent to ${payload.email}.`)
          setCreateOpen(false)
          return res
        }}
      />

      {assigning && (
        <AssignBuildingsModal
          user={assigning}
          buildings={state.buildings}
          onClose={() => setAssigning(null)}
          onSave={(ids, force) => {
            const res = assignBuildings(assigning.id, ids, force)
            if (res.ok) {
              toast(`Buildings updated for ${assigning.name}.`)
              setAssigning(null)
            }
            return res
          }}
        />
      )}

      <ConfirmDialog
        open={!!disabling}
        onClose={() => setDisabling(null)}
        title={`Disable ${disabling?.name}?`}
        confirmLabel="Disable account"
        tone="danger"
        body={disabling ? `${disabling.name} will be signed out and will not be able to sign in again until re-enabled.` : ''}
        onConfirm={() => {
          const res = disableUser(disabling.id)
          if (!res.ok) {
            toast(res.error === 'self' ? 'You cannot disable your own account.' : 'There must be at least one active administrator.', 'error')
          } else {
            toast(`${disabling.name}'s account was disabled.`)
          }
          setDisabling(null)
        }}
      />

      {lifting && (
        <LiftSuspensionModal
          user={lifting}
          onClose={() => setLifting(null)}
          onSave={(reason) => {
            const res = liftSuspension(lifting.id, reason)
            if (res.ok) {
              toast(`Suspension lifted for ${lifting.name}. Strikes reset to zero.`)
              setLifting(null)
            }
            return res
          }}
        />
      )}
    </div>
  )
}

function CreateUserModal({ open, onClose, buildings, onSave }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [buildingIds, setBuildingIds] = useState([])
  const [errors, setErrors] = useState({})

  const submit = () => {
    const res = onSave({ name, email, role, buildingIds })
    if (!res.ok) setErrors(res.errors || {})
    else {
      setErrors({})
      setName('')
      setEmail('')
      setRole('staff')
      setBuildingIds([])
    }
  }

  const toggle = (id) => setBuildingIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create an account"
      subtitle="For staff and administrators. Students register themselves."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon="mail" onClick={submit}>Create & send invite</Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Full name" required error={errors.name}>
          <Input value={name} onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: '' })) }} placeholder="Khalid Almutairi" autoComplete="name" />
        </Field>
        <Field label="KFUPM email" required error={errors.email} hint="The set-password link is sent here.">
          <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: '' })) }} placeholder="khalid.a@kfupm.edu.sa" autoComplete="email" />
        </Field>
        <Field label="Role" required error={errors.role}>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="staff">Staff — manages assigned buildings</option>
            <option value="admin">Administrator — full access</option>
          </Select>
        </Field>
        {role === 'staff' && (
          <Field label="Buildings" hint="You can assign more later; every building must keep one staff member.">
            <div className="building-checks">
              {buildings.map((b) => (
                <Checkbox key={b.id} checked={buildingIds.includes(b.id)} onChange={() => toggle(b.id)} label={b.name} />
              ))}
            </div>
          </Field>
        )}
        <Banner tone="info" icon="mail">
          The account starts as invite pending. A set-password email is sent; the account activates when the recipient sets a password.
        </Banner>
        <InlineError>{errors.form}</InlineError>
      </div>
    </Modal>
  )
}

function AssignBuildingsModal({ user, buildings, onClose, onSave }) {
  const [ids, setIds] = useState(user.buildingIds || [])
  const [uncovered, setUncovered] = useState([])
  const [error, setError] = useState('')

  const toggle = (id) => {
    setIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
    setUncovered([])
    setError('')
  }

  const save = (force = false) => {
    const res = onSave(ids, force)
    if (!res.ok) {
      if (res.error === 'coverage') {
        setUncovered(res.uncovered)
        setError('Saving would leave these buildings with no staff member:')
      } else {
        setError('Could not update assignments.')
      }
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Assign buildings · ${user.name}`}
      subtitle="Staff can only see and manage the buildings assigned to them."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {uncovered.length > 0 ? (
            <Button variant="danger" onClick={() => save(true)}>Save anyway</Button>
          ) : (
            <Button icon="check" onClick={() => save(false)}>Save assignments</Button>
          )}
        </>
      }
    >
      <div className="stack">
        <div className="building-checks">
          {buildings.map((b) => (
            <Checkbox key={b.id} checked={ids.includes(b.id)} onChange={() => toggle(b.id)} label={`${b.name} · ${b.location || 'no location'}`} />
          ))}
        </div>
        {uncovered.length > 0 && (
          <Banner tone="danger" title="Staff coverage warning" icon="alert-triangle">
            {uncovered.map((id) => `Building ${id}`).join(', ')} would have no staff member. Students would still be able to book, but no one could triage faults. Save anyway only if cover is arranged separately.
          </Banner>
        )}
        <InlineError>{error && uncovered.length === 0 ? error : ''}</InlineError>
        <p className="form-note">Administrators always have access to every building, regardless of staff assignments.</p>
      </div>
    </Modal>
  )
}

function LiftSuspensionModal({ user, onClose, onSave }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  return (
    <Modal
      open
      onClose={onClose}
      title={`Lift suspension · ${user.name}`}
      subtitle="Use this only after reviewing the missed check-ins. Strikes reset to zero."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => {
              if (reason.trim().length < 3) { setError('A reason is required.'); return }
              onSave(reason.trim())
            }}
          >
            Lift suspension
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Reason" required error={error} hint="Logged and visible to other administrators.">
          <Textarea rows={3} value={reason} onChange={(e) => { setReason(e.target.value); setError('') }} placeholder="Machine W3 was out of order during the missed slot." maxLength={300} />
        </Field>
        <Banner tone="info" icon="shield">Lifting removes the suspension immediately and resets {user.name}'s strike count.</Banner>
      </div>
    </Modal>
  )
}
