import { useEffect, useState } from 'react'
import { useApp } from '../../store/AppStore.jsx'
import { Icon } from '../../components/Icons.jsx'
import {
  Badge, Banner, Button, Card, EmptyState, Field, InlineError, Input, Modal, Select, Textarea,
} from '../../components/ui.jsx'
import { useNow } from '../../hooks/useNow.js'
import { fmtDate } from '../../lib/time.js'

export function AdminRules() {
  const { state, saveRules, savePenalties, liftSuspension, toast } = useApp()
  const now = useNow(30000)
  const [buildingId, setBuildingId] = useState(state.buildings[0]?.id || '')
  const building = state.buildings.find((b) => b.id === buildingId) || state.buildings[0]
  const [form, setForm] = useState(() => ({
    grace: building?.rules?.grace ?? 10,
    claim: building?.rules?.claim ?? 10,
    maxActive: building?.rules?.maxActive ?? 1,
    horizon: building?.rules?.horizon ?? 2,
    opens: building?.opens ?? '06:00',
    closes: building?.closes ?? '24:00',
  }))
  const [penalty, setPenalty] = useState(() => ({
    strikes: building?.penalties?.strikes ?? 3,
    days: building?.penalties?.days ?? 7,
    reset: building?.penalties?.reset ?? 'semester',
  }))
  const [errors, setErrors] = useState({})
  const [penaltyErrors, setPenaltyErrors] = useState({})
  const [saved, setSaved] = useState('')
  const [lifting, setLifting] = useState(null)

  useEffect(() => {
    const b = state.buildings.find((x) => x.id === buildingId)
    if (!b) return
    setForm({
      grace: b.rules.grace,
      claim: b.rules.claim,
      maxActive: b.rules.maxActive,
      horizon: b.rules.horizon,
      opens: b.opens,
      closes: b.closes,
    })
    setPenalty({ ...b.penalties })
    setErrors({})
    setPenaltyErrors({})
    setSaved('')
  }, [buildingId, state.buildings])

  const suspended = state.users.filter(
    (u) => u.role === 'student' && u.buildingId === building?.id && u.suspendedUntil && new Date(u.suspendedUntil) > new Date(now),
  )

  const setF = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((x) => ({ ...x, [key]: '' }))
    setSaved('')
  }

  const submitRules = (e) => {
    e.preventDefault()
    const res = saveRules(building.id, {
      grace: Number(form.grace),
      claim: Number(form.claim),
      maxActive: Number(form.maxActive),
      horizon: Number(form.horizon),
      opens: form.opens,
      closes: form.closes,
    })
    if (!res.ok) {
      setErrors(res.errors || {})
      return
    }
    setErrors({})
    setSaved('rules')
    toast(`Booking rules updated for ${building.name}.`)
  }

  const submitPenalties = (e) => {
    e.preventDefault()
    const res = savePenalties(building.id, {
      strikes: Number(penalty.strikes),
      days: Number(penalty.days),
      reset: penalty.reset,
    })
    if (!res.ok) {
      setPenaltyErrors(res.errors || {})
      return
    }
    setPenaltyErrors({})
    setSaved('penalties')
    toast(`Penalty rules updated for ${building.name}.`)
  }

  const nextStrike = (form.strikes || 3)

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Rules & penalties</h1>
          <p className="page-sub">Set check-in grace, claim windows and no-show consequences per building.</p>
        </div>
        <div className="page-actions">
          <Select value={buildingId} onChange={(e) => setBuildingId(e.target.value)} aria-label="Building">
            {state.buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </div>
      </header>

      {saved && (
        <Banner tone="success" title="Rules saved" icon="check-circle" onClose={() => setSaved('')}>
          The new rules apply to bookings made from now on. Existing bookings keep the values they were made under.
        </Banner>
      )}

      <div className="rules-layout">
        <div className="stack">
          <Card title="Booking rules" subtitle={`${building?.name} · students see these values while booking`}>
            <form className="stack" onSubmit={submitRules} noValidate>
              <div className="form-grid">
                <Field label="Check-in grace (minutes)" required error={errors.grace} hint="5–30. How long after the slot start a student can check in.">
                  <Input type="number" min="5" max="30" value={form.grace} onChange={setF('grace')} />
                </Field>
                <Field label="Claim window (minutes)" required error={errors.claim} hint="5–30. Time to claim a machine after a queue turn.">
                  <Input type="number" min="5" max="30" value={form.claim} onChange={setF('claim')} />
                </Field>
              </div>

              <div className="form-grid">
                <Field label="Max active bookings" required error={errors.maxActive} hint="1–3 per student at a time.">
                  <Input type="number" min="1" max="3" value={form.maxActive} onChange={setF('maxActive')} />
                </Field>
                <Field label="Booking horizon (days)" required error={errors.horizon} hint="1–7. How far ahead students can book.">
                  <Input type="number" min="1" max="7" value={form.horizon} onChange={setF('horizon')} />
                </Field>
              </div>

              <div className="form-grid">
                <Field label="Room opens" required>
                  <Input type="time" value={form.opens === '24:00' ? '00:00' : form.opens} onChange={setF('opens')} />
                </Field>
                <Field label="Room closes" required error={errors.closes}>
                  <Select value={form.closes} onChange={setF('closes')}>
                    {Array.from({ length: 24 }).map((_, i) => {
                      const v = `${String(i + 1).padStart(2, '0')}:00`
                      return <option key={v} value={v}>{v}</option>
                    })}
                    <option value="24:00">24:00 (midnight)</option>
                  </Select>
                </Field>
              </div>

              <div className="rule-preview">
                <div><span>Check-in closes</span><strong>{form.grace} min after start</strong></div>
                <div><span>Claim expires</span><strong>{form.claim} min after turn</strong></div>
                <div><span>Book ahead</span><strong>{form.horizon} day{Number(form.horizon) === 1 ? '' : 's'}</strong></div>
              </div>

              <InlineError>{errors.form || errors.hours}</InlineError>
              <div className="form-actions">
                <Button type="submit" icon="check">Save booking rules</Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const b = state.buildings.find((x) => x.id === buildingId)
                    setForm({ ...b.rules, opens: b.opens, closes: b.closes })
                    setErrors({})
                  }}
                >
                  Undo changes
                </Button>
              </div>
            </form>
          </Card>

          <Card title="How these values feel" subtitle="A quick sanity check before you save">
            <div className="rule-explain">
              <div className="rule-explain-item">
                <span className="rule-icon"><Icon name="clock" size={18} /></span>
                <div>
                  <strong>A student books at 9:00 PM</strong>
                  <p>They must scan the machine by 9:{String(form.grace).padStart(2, '0')} PM or the slot is released and a strike is recorded.</p>
                </div>
              </div>
              <div className="rule-explain-item">
                <span className="rule-icon"><Icon name="queue" size={18} /></span>
                <div>
                  <strong>A machine frees up at 9:30 PM</strong>
                  <p>The first student in the queue has until 9:{String(30 + Number(form.claim)).padStart(2, '0')} PM to claim it, then the next student gets a turn.</p>
                </div>
              </div>
              <div className="rule-explain-item">
                <span className="rule-icon"><Icon name="calendar" size={18} /></span>
                <div>
                  <strong>Booking horizon</strong>
                  <p>Students can book up to {form.horizon} day{Number(form.horizon) === 1 ? '' : 's'} ahead, with at most {form.maxActive} active booking{Number(form.maxActive) === 1 ? '' : 's'} each.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card title="Penalties" subtitle="When strikes become a suspension">
            <form className="stack" onSubmit={submitPenalties} noValidate>
              <div className="form-grid">
                <Field label="Strikes before suspension" required error={penaltyErrors.strikes} hint="2–10.">
                  <Input type="number" min="2" max="10" value={penalty.strikes} onChange={(e) => { setPenalty((p) => ({ ...p, strikes: e.target.value })); setPenaltyErrors((x) => ({ ...x, strikes: '' })) }} />
                </Field>
                <Field label="Suspension length (days)" required error={penaltyErrors.days} hint="1–30.">
                  <Input type="number" min="1" max="30" value={penalty.days} onChange={(e) => { setPenalty((p) => ({ ...p, days: e.target.value })); setPenaltyErrors((x) => ({ ...x, days: '' })) }} />
                </Field>
              </div>
              <Field label="Strikes reset" required>
                <Select value={penalty.reset} onChange={(e) => setPenalty((p) => ({ ...p, reset: e.target.value }))}>
                  <option value="semester">Each semester</option>
                  <option value="year">Each academic year</option>
                  <option value="never">Never</option>
                </Select>
              </Field>

              <div className="penalty-meter">
                {Array.from({ length: Number(penalty.strikes) }).map((_, i) => (
                  <span key={i} className="strike-pip filled" />
                ))}
                <span className="small muted">{nextStrike} strikes = {penalty.days}-day suspension</span>
              </div>

              <Banner tone="warn" title="Reducing the threshold affects current students" icon="alert-triangle">
                If a student already has more strikes than the new threshold, they are suspended the next time the rules run. Review the suspended list before saving.
              </Banner>
              <InlineError>{penaltyErrors.form}</InlineError>
              <div className="form-actions">
                <Button type="submit" icon="shield">Save penalty rules</Button>
              </div>
            </form>
          </Card>

          <Card
            title="Suspended students"
            subtitle={`${building?.name} · ${suspended.length} currently suspended`}
            bodyClass="no-pad"
          >
            {suspended.length === 0 ? (
              <EmptyState compact icon="check-circle" title="No suspended students">No one is blocked from booking right now.</EmptyState>
            ) : (
              <ul className="suspended-list">
                {suspended.map((u) => (
                  <li key={u.id}>
                    <div>
                      <strong>{u.name}</strong>
                      <span className="small muted">{u.email}</span>
                      <span className="small muted">Until {fmtDate(u.suspendedUntil, true)} · {u.strikes} strikes</span>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => setLifting(u)}>Lift</Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="suspended-note">
              <Icon name="info" size={14} />
              Lifting a suspension resets the student's strike count and is logged.
            </div>
          </Card>

          <Card title="Rule audit" subtitle="Last changes">
            <ul className="activity-list">
              {state.actions.filter((a) => a.text.toLowerCase().includes('rule') || a.text.toLowerCase().includes('penalt')).slice(0, 4).map((a) => (
                <li key={a.id}>
                  <span className="activity-dot" />
                  <div><p className="small">{a.text}</p><span className="small muted">{fmtDate(a.at, true)}</span></div>
                </li>
              ))}
              {state.actions.filter((a) => a.text.toLowerCase().includes('rule') || a.text.toLowerCase().includes('penalt')).length === 0 && (
                <li><span className="small muted">No rule changes logged yet.</span></li>
              )}
            </ul>
          </Card>
        </div>
      </div>

      {lifting && (
        <LiftModal
          user={lifting}
          onClose={() => setLifting(null)}
          onSave={(reason) => {
            const res = liftSuspension(lifting.id, reason)
            if (res.ok) {
              toast(`Suspension lifted for ${lifting.name}.`)
              setLifting(null)
            }
            return res
          }}
        />
      )}
    </div>
  )
}

function LiftModal({ user, onClose, onSave }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  return (
    <Modal
      open
      onClose={onClose}
      title={`Lift suspension · ${user.name}`}
      subtitle="Strikes reset to zero when the suspension is lifted."
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
        <Field label="Reason" required error={error}>
          <Textarea rows={3} value={reason} onChange={(e) => { setReason(e.target.value); setError('') }} placeholder="Machine was out of order during the missed slot." maxLength={300} />
        </Field>
        <Badge tone="gray">Current strikes: {user.strikes}</Badge>
      </div>
    </Modal>
  )
}
