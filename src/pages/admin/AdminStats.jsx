import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppStore.jsx'
import { Icon } from '../../components/Icons.jsx'
import {
  Badge, Banner, Button, Card, DataTable, EmptyState, Field, InlineError, Input, Kpi, ProgressBar, Select,
} from '../../components/ui.jsx'
import { fmtDate } from '../../lib/time.js'

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)
const hourLabel = (h) => (h > 12 ? `${h - 12}p` : h === 12 ? '12p' : `${h}a`)

function dateValue(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function AdminStats() {
  const { state, toast } = useApp()
  const now = new Date()
  const [buildingId, setBuildingId] = useState(state.buildings[0]?.id || '')
  const [start, setStart] = useState(dateValue(new Date(Date.now() - 29 * 86400000)))
  const [end, setEnd] = useState(dateValue(now))
  const [error, setError] = useState('')
  const [applied, setApplied] = useState({ start, end })

  const building = state.buildings.find((b) => b.id === buildingId)
  const stats = state.stats[buildingId]

  const days = useMemo(() => {
    const s = new Date(`${applied.start}T00:00:00`)
    const e = new Date(`${applied.end}T00:00:00`)
    return Math.round((e - s) / 86400000) + 1
  }, [applied])
  const factor = stats ? Math.max(0.03, Math.min(3, days / 30)) : 0

  const apply = () => {
    setError('')
    if (!start || !end) {
      setError('Choose both a start and end date.')
      return
    }
    const s = new Date(`${start}T00:00:00`)
    const e = new Date(`${end}T00:00:00`)
    if (e < s) {
      setError('End date must be on or after the start date.')
      return
    }
    const today = new Date(`${dateValue(now)}T00:00:00`)
    if (s > today) {
      setError('Start date cannot be in the future.')
      return
    }
    if ((e - s) / 86400000 > 120) {
      setError('Choose a range of 120 days or fewer.')
      return
    }
    setApplied({ start, end })
    toast(`Showing statistics from ${fmtDate(s, true)} to ${fmtDate(e, true)}.`, 'info')
  }

  const exportCsv = () => {
    if (!stats) return
    const rows = [
      ['WashQ statistics', building?.name || buildingId],
      ['Range', `${applied.start} to ${applied.end}`, `${days} days`],
      [],
      ['Metric', 'Value'],
      ['Bookings', Math.round(stats.bookings * factor)],
      ['Utilisation %', stats.utilization],
      ['Downtime hours', Math.round(stats.downtime * factor)],
      ['No-show rate %', stats.noShowRate],
      ['Claim-miss rate %', stats.claimMissRate],
      ['Unattended flags', Math.round(stats.flags * factor)],
      [],
      ['Hour', 'Peak load %'],
      ...HOURS.map((h, i) => [hourLabel(h), stats.peak[i]]),
      [],
      ['Machine', 'Utilisation %'],
      ...Object.entries(stats.machineUtil).map(([m, v]) => [m, v]),
      [],
      ['Machine', 'Faults', 'Downtime hours'],
      ...stats.faults.map((f) => [f.machine, f.faults, f.downtime]),
    ]
    const csv = rows.map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `washq-statistics-${buildingId}-${applied.start}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast('Statistics exported as CSV.')
  }

  const maxPeak = stats ? Math.max(...stats.peak, 1) : 1
  const faultRows = stats
    ? stats.faults.map((f) => {
        const machine = state.machines.find((m) => m.buildingId === buildingId && m.label === f.machine)
        return { ...f, id: f.machine, type: machine?.type, status: machine?.status || 'retired' }
      })
    : []

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Statistics</h1>
          <p className="page-sub">Building usage, peak demand, machine utilisation and downtime.</p>
        </div>
        <div className="page-actions">
          <Select value={buildingId} onChange={(e) => { setBuildingId(e.target.value); setError('') }} aria-label="Building">
            {state.buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </div>
      </header>

      <Card title="Date range" subtitle="Statistics are seeded for the last 30 days and scaled to the range you choose.">
        <div className="range-row">
          <Field label="From">
            <Input type="date" value={start} max={dateValue(now)} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={end} max={dateValue(now)} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <Button onClick={apply} icon="filter">Apply</Button>
          <Button variant="secondary" onClick={exportCsv} icon="download" disabled={!stats}>Export CSV</Button>
          <span className="small muted">Showing {days} day{days === 1 ? '' : 's'}</span>
        </div>
        <InlineError>{error}</InlineError>
      </Card>

      {!stats || days <= 0 ? (
        <Card>
          <EmptyState icon="bar-chart" title="No data for this range" action={<Button variant="secondary" onClick={() => { setStart('2026-10-01'); setEnd('2026-10-30') }}>Try a known range</Button>}>
            {building?.name} has no recorded booking activity for this period. Choose a different range or building.
          </EmptyState>
        </Card>
      ) : (
        <div className="stack">
          <div className="kpi-grid">
            <Kpi icon="calendar" label="Bookings" value={Math.round(stats.bookings * factor).toLocaleString()} hint={`${building.name} · ${days} days`} tone="teal" />
            <Kpi icon="bar-chart" label="Utilisation" value={`${stats.utilization}%`} hint="Share of machine time booked" tone="blue" />
            <Kpi icon="wrench" label="Downtime" value={`${Math.round(stats.downtime * factor)} h`} hint="Out of order or maintenance" tone="amber" />
            <Kpi icon="alert-triangle" label="No-show rate" value={`${stats.noShowRate}%`} hint={`${Math.round(stats.flags * factor)} unattended flags`} tone="red" />
          </div>

          <div className="stats-grid">
            <Card title="Peak demand" subtitle="Average share of machines in use by hour" className="chart-card">
              <div className="bar-chart" role="img" aria-label="Peak demand by hour of day">
                {HOURS.map((h, i) => (
                  <div className="bar-col" key={h} title={`${hourLabel(h)} · ${stats.peak[i]}% busy`}>
                    <span className="bar-value">{stats.peak[i]}%</span>
                    <span className="bar" style={{ height: `${(stats.peak[i] / maxPeak) * 100}%` }} />
                    <span className="bar-label">{i % 3 === 0 || h === 23 ? hourLabel(h) : ''}</span>
                  </div>
                ))}
              </div>
              <div className="chart-note">
                <Icon name="info" size={14} /> Peak window: 5–8 PM. Quietest: 6–9 AM.
              </div>
            </Card>

            <Card title="Machine utilisation" subtitle="Share of available time booked">
              <ul className="util-list">
                {Object.entries(stats.machineUtil).map(([label, value]) => {
                  const machine = state.machines.find((m) => m.buildingId === buildingId && m.label === label)
                  return (
                    <li key={label}>
                      <span className="util-label">
                        <span className={`machine-chip sm ${machine?.type || 'washer'}`}><Icon name={machine?.type === 'dryer' ? 'dryer' : 'washer'} size={13} /></span>
                        {label}
                      </span>
                      <ProgressBar value={value} tone={value < 30 ? 'amber' : 'teal'} label={`${label} utilisation`} />
                      <strong>{value}%</strong>
                    </li>
                  )
                })}
              </ul>
              <div className="chart-note"><Icon name="info" size={14} /> W4 is low because it spent 41 hours out of order.</div>
            </Card>
          </div>

          <div className="stats-grid">
            <Card title="Faults and downtime" subtitle="Machines that need the most attention" bodyClass="no-pad">
              <DataTable
                columns={[
                  {
                    key: 'machine',
                    label: 'Machine',
                    render: (f) => (
                      <span className="table-machine">
                        <span className={`machine-chip ${f.type}`}><Icon name={f.type === 'dryer' ? 'dryer' : 'washer'} size={14} /></span>
                        <strong>{f.machine}</strong>
                      </span>
                    ),
                  },
                  { key: 'faults', label: 'Faults' },
                  { key: 'downtime', label: 'Downtime', render: (f) => `${f.downtime} h` },
                  { key: 'status', label: 'Now', render: (f) => <Badge tone={f.status === 'available' ? 'green' : f.status === 'out-of-order' ? 'red' : 'amber'}>{f.status.replace(/-/g, ' ')}</Badge> },
                ]}
                rows={faultRows}
                empty={<EmptyState compact icon="check-circle" title="No faults recorded">No downtime in this range.</EmptyState>}
              />
            </Card>

            <Card title="Reliability" subtitle="Rates and response times">
              <div className="stat-block-grid">
                <div className="stat-block"><span className="stat-label">No-show rate</span><span className="stat-value tone-amber">{stats.noShowRate}%</span><span className="stat-hint">Missed check-ins</span></div>
                <div className="stat-block"><span className="stat-label">Claim-miss rate</span><span className="stat-value tone-purple">{stats.claimMissRate}%</span><span className="stat-hint">Expired claim windows</span></div>
                <div className="stat-block"><span className="stat-label">Triage median</span><span className="stat-value">{stats.monthly.triageMedian}</span><span className="stat-hint">Report to confirmation</span></div>
                <div className="stat-block"><span className="stat-label">Repair median</span><span className="stat-value">{stats.monthly.repairMedian}</span><span className="stat-hint">Confirmed to resolved</span></div>
              </div>
              <Banner tone="info" icon="info">
                {stats.monthly.reports} reports were submitted last month; {stats.monthly.confirmed} were confirmed as real faults.
              </Banner>
            </Card>
          </div>

          <Card title="Monthly summary" subtitle="Last completed month">
            <div className="monthly-strip">
              <div><span>Bookings</span><strong>{stats.monthly.bookings.toLocaleString()}</strong></div>
              <div><span>Utilisation</span><strong>{stats.monthly.utilization}%</strong></div>
              <div><span>Reports</span><strong>{stats.monthly.reports}</strong></div>
              <div><span>Confirmed faults</span><strong>{stats.monthly.confirmed}</strong></div>
              <div><span>No-show rate</span><strong>{stats.monthly.noShowRate}%</strong></div>
            </div>
            <p className="small muted">Range: {applied.start} to {applied.end} · {days} days · scaled from the 30-day dataset.</p>
          </Card>
        </div>
      )}
    </div>
  )
}
