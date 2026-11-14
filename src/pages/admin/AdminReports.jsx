import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppStore.jsx'
import { Icon } from '../../components/Icons.jsx'
import {
  Badge, Banner, Button, Card, EmptyState, Field, InlineError, Select, StatusBadge,
} from '../../components/ui.jsx'
import { fmtDate, fmtTime } from '../../lib/time.js'

const TYPES = [
  { id: 'daily', title: 'Daily operations', body: 'Today’s bookings, check-ins, queues and open faults.', icon: 'calendar' },
  { id: 'weekly', title: 'Weekly summary', body: 'Bookings, utilisation and peak demand for the week.', icon: 'bar-chart' },
  { id: 'monthly', title: 'Monthly performance', body: 'The full month: usage, reliability and repair times.', icon: 'chart' },
  { id: 'faults', title: 'Faults & downtime', body: 'Confirmed faults, downtime hours and repair history.', icon: 'wrench' },
  { id: 'penalties', title: 'No-shows & penalties', body: 'Missed check-ins, expired claims and suspensions.', icon: 'shield' },
]

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)
const hourLabel = (h) => (h > 12 ? `${h - 12}:00 PM` : h === 12 ? '12:00 PM' : `${h}:00 AM`)

function monthValue(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(v) {
  if (!v) return ''
  const [y, m] = v.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}
function monthIndex(v) {
  const [y, m] = v.split('-').map(Number)
  return y * 12 + (m - 1)
}

export function AdminReports() {
  const { state, toast } = useApp()
  const now = new Date()
  const currentMonth = monthValue(now)
  const [type, setType] = useState('monthly')
  const [buildingId, setBuildingId] = useState(state.buildings[0]?.id || '')
  const [month, setMonth] = useState(currentMonth)
  const [format, setFormat] = useState('csv')
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')

  const building = state.buildings.find((b) => b.id === buildingId)
  const stats = buildingId === 'all' ? null : state.stats[buildingId]

  const noDataReason = useMemo(() => {
    if (!month) return 'Choose a month.'
    if (monthIndex(month) > monthIndex(currentMonth)) return 'Choose a month up to the current month.'
    if (monthIndex(month) < monthIndex(currentMonth) - 2) return `No activity is recorded for ${monthLabel(month)}. Choose a recent month.`
    if (buildingId === 'all') {
      const any = state.buildings.some((b) => state.stats[b.id])
      if (!any) return 'No building has activity in this period.'
      return ''
    }
    if (!stats) return `${building?.name} has no recorded activity for ${monthLabel(month)}.`
    return ''
  }, [month, currentMonth, buildingId, stats, building, state.buildings])

  const scope = useMemo(() => {
    if (buildingId !== 'all') return stats
    const list = state.buildings.map((b) => state.stats[b.id]).filter(Boolean)
    if (!list.length) return null
    const totalBookings = list.reduce((n, s) => n + s.bookings, 0)
    return {
      bookings: totalBookings,
      utilization: Math.round(list.reduce((n, s) => n + s.utilization * s.bookings, 0) / totalBookings),
      downtime: list.reduce((n, s) => n + s.downtime, 0),
      noShowRate: Number((list.reduce((n, s) => n + s.noShowRate * s.bookings, 0) / totalBookings).toFixed(1)),
      claimMissRate: Number((list.reduce((n, s) => n + s.claimMissRate * s.bookings, 0) / totalBookings).toFixed(1)),
      flags: list.reduce((n, s) => n + s.flags, 0),
      peak: HOURS.map((_, i) => Math.round(list.reduce((n, s) => n + s.peak[i] * s.bookings, 0) / totalBookings)),
      machineUtil: Object.assign({}, ...list.map((s) => s.machineUtil)),
      faults: list.flatMap((s) => s.faults),
      monthly: {
        bookings: list.reduce((n, s) => n + s.monthly.bookings, 0),
        utilization: Math.round(list.reduce((n, s) => n + s.monthly.utilization * s.monthly.bookings, 0) / totalBookings),
        reports: list.reduce((n, s) => n + s.monthly.reports, 0),
        confirmed: list.reduce((n, s) => n + s.monthly.confirmed, 0),
        triageMedian: list[0].monthly.triageMedian,
        repairMedian: list[0].monthly.repairMedian,
        noShowRate: Number((list.reduce((n, s) => n + s.monthly.noShowRate * s.monthly.bookings, 0) / totalBookings).toFixed(1)),
      },
    }
  }, [buildingId, stats, state.buildings])

  const typeMeta = TYPES.find((t) => t.id === type)

  const generate = () => {
    setError('')
    if (noDataReason) {
      setPreview(null)
      if (noDataReason.startsWith('Choose')) setError(noDataReason)
      return
    }
    setPreview({
      type,
      buildingId,
      buildingName: buildingId === 'all' ? 'All buildings' : building?.name,
      month,
      monthName: monthLabel(month),
      format,
      generatedAt: new Date().toISOString(),
    })
    toast(`${typeMeta.title} report generated.`, 'info')
  }

  const activeBookings = state.bookings.filter(
    (b) => (buildingId === 'all' || b.buildingId === buildingId) && (b.status === 'upcoming' || b.status === 'checked-in'),
  )
  const openReports = state.reports.filter(
    (r) => (buildingId === 'all' || r.buildingId === buildingId) && ['open', 'confirmed', 'in-repair'].includes(r.status),
  )
  const inBuilding = (id) => buildingId === 'all' || buildingId === id
  const suspended = state.users.filter((u) => u.role === 'student' && inBuilding(u.buildingId) && u.suspendedUntil && new Date(u.suspendedUntil) > now)
  const noShowBookings = state.bookings.filter(
    (b) => inBuilding(b.buildingId) && b.status === 'no-show' && monthValue(new Date(b.start)) === month,
  )

  const buildCsv = () => {
    const p = preview
    if (!p) return
    const rows = [
      ['WashQ report', typeMeta.title],
      ['Scope', p.buildingName],
      ['Period', p.monthName],
      ['Generated', new Date(p.generatedAt).toLocaleString('en-GB')],
      [],
      ['Metric', 'Value'],
      ['Bookings', scope.bookings],
      ['Utilisation %', scope.utilization],
      ['Downtime hours', scope.downtime],
      ['No-show rate %', scope.noShowRate],
      ['Claim-miss rate %', scope.claimMissRate],
      ['Unattended flags', scope.flags],
      [],
      ['Hour', 'Load %'],
      ...HOURS.map((h, i) => [hourLabel(h), scope.peak[i]]),
    ]
    if (p.type === 'faults') {
      rows.push([], ['Machine', 'Faults', 'Downtime hours'], ...scope.faults.map((f) => [f.machine, f.faults, f.downtime]))
    }
    if (p.type === 'penalties') {
      rows.push([], ['Suspended student', 'Strikes', 'Until'], ...suspended.map((u) => [u.name, u.strikes, fmtDate(u.suspendedUntil, true)]))
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `washq-${p.type}-${p.month}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast('Report exported as CSV.')
  }

  const topHours = scope
    ? HOURS.map((h, i) => ({ hour: h, value: scope.peak[i] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 4)
    : []

  const isMonthly = preview?.type === 'monthly'
  const kpiBookings = isMonthly
    ? scope?.monthly.bookings ?? 0
    : preview?.type === 'weekly'
      ? Math.round((scope?.bookings ?? 0) / 30 * 7)
      : scope?.bookings ?? 0
  const kpiUtilization = isMonthly ? scope?.monthly.utilization ?? 0 : scope?.utilization ?? 0
  const kpiNoShow = isMonthly ? scope?.monthly.noShowRate ?? 0 : scope?.noShowRate ?? 0

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-sub">Generate an operational report for a building and export it for the housing office.</p>
        </div>
      </header>

      <div className="report-builder">
        <div className="stack">
          <Card title="1. Report type" subtitle="Choose what the report should cover.">
            <div className="report-types" role="radiogroup" aria-label="Report type">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={type === t.id}
                  className={`report-type${type === t.id ? ' on' : ''}`}
                  onClick={() => setType(t.id)}
                >
                  <span className="report-type-icon"><Icon name={t.icon} size={19} /></span>
                  <span>
                    <strong>{t.title}</strong>
                    <span>{t.body}</span>
                  </span>
                  <span className="radio-dot" />
                </button>
              ))}
            </div>
          </Card>

          <Card title="2. Options" subtitle="Scope, period and file format.">
            <div className="form-grid">
              <Field label="Buildings" required>
                <Select value={buildingId} onChange={(e) => { setBuildingId(e.target.value); setPreview(null) }}>
                  <option value="all">All buildings</option>
                  {state.buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <Field label="Month" required>
                <input className="input" type="month" value={month} max={currentMonth} onChange={(e) => { setMonth(e.target.value); setPreview(null) }} />
              </Field>
            </div>
            <div className="format-row">
              <span className="field-label">Format</span>
              <div className="seg" role="group" aria-label="Export format">
                {['csv', 'pdf'].map((f) => (
                  <button key={f} type="button" className={`seg-btn${format === f ? ' on' : ''}`} onClick={() => setFormat(f)} aria-pressed={format === f}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
              <span className="small muted">CSV downloads directly; PDF opens the print dialog.</span>
            </div>
            <InlineError>{error}</InlineError>
            <div className="form-actions">
              <Button icon="file" onClick={generate}>Generate report</Button>
              {preview && <Button variant="ghost" onClick={() => setPreview(null)}>Clear preview</Button>}
            </div>
            <p className="form-note">Reports are generated from the last 30 days of activity. Use the Statistics page for custom date ranges.</p>
          </Card>
        </div>

        <div className="report-preview-col">
          {noDataReason && !noDataReason.startsWith('Choose') ? (
            <Card>
              <EmptyState icon="file" title="No activity for this period" action={<Button variant="secondary" onClick={() => { setMonth(currentMonth); setBuildingId(state.buildings[0]?.id || '') }}>Reset to this month</Button>}>
                {noDataReason} Choose a building and month with recorded bookings.
              </EmptyState>
            </Card>
          ) : !preview ? (
            <Card>
              <EmptyState icon="file" title="No report generated yet">
                Pick a report type, building and month, then press Generate report to see a preview here.
              </EmptyState>
            </Card>
          ) : (
            <div className="report-sheet" id="report-sheet">
              <div className="report-sheet-head">
                <div className="report-brand">
                  <span className="report-logo">WQ</span>
                  <div>
                    <strong>WashQ</strong>
                    <span>KFUPM Dormitory Laundry</span>
                  </div>
                </div>
                <div className="report-meta">
                  <Badge tone="teal">{preview.format.toUpperCase()}</Badge>
                  <span>{new Date(preview.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
              </div>

              <div className="report-title">
                <span className="small muted">OPERATIONS REPORT</span>
                <h2>{typeMeta.title}</h2>
                <p>{preview.buildingName} · {preview.monthName}</p>
              </div>

              <p className="report-summary">
                {preview.type === 'daily' && `At ${fmtTime(preview.generatedAt)}, ${activeBookings.length} bookings are active or upcoming in ${preview.buildingName.toLowerCase() === 'all buildings' ? 'all buildings' : preview.buildingName}, with ${openReports.length} open fault reports.`}
                {preview.type === 'weekly' && `${preview.buildingName} recorded ${Math.round(scope.bookings / 30 * 7)} bookings in a typical week in ${preview.monthName}, at ${scope.utilization}% average utilisation.`}
                {preview.type === 'monthly' && `During ${preview.monthName}, ${preview.buildingName} recorded ${scope.monthly.bookings.toLocaleString()} bookings and ${scope.monthly.reports} fault reports. ${scope.monthly.confirmed} reports were confirmed as real faults.`}
                {preview.type === 'faults' && `Faults removed ${scope.downtime} hours of machine availability in ${preview.monthName}. ${scope.faults.length} machines had at least one fault; ${openReports.length} reports remain open.`}
                {preview.type === 'penalties' && `The no-show rate was ${scope.noShowRate}% and ${scope.claimMissRate}% of queue claims expired. ${suspended.length} student${suspended.length === 1 ? '' : 's'} are currently suspended.`}
              </p>

              <div className="report-kpis">
                <div><span>Bookings</span><strong>{kpiBookings.toLocaleString()}</strong></div>
                <div><span>Utilisation</span><strong>{kpiUtilization}%</strong></div>
                <div><span>Downtime</span><strong>{scope.downtime} h</strong></div>
                <div><span>No-show rate</span><strong>{kpiNoShow}%</strong></div>
              </div>

              {preview.type === 'daily' && (
                <>
                  <h3 className="report-section-title">Today at a glance</h3>
                  <div className="report-two-col">
                    <div className="report-stat-list">
                      <div><span>Active or upcoming bookings</span><strong>{activeBookings.length}</strong></div>
                      <div><span>Checked in right now</span><strong>{activeBookings.filter((b) => b.status === 'checked-in').length}</strong></div>
                      <div><span>Students waiting in queues</span><strong>{['washer', 'dryer'].reduce((n, t) => n + (state.queues[`${buildingId === 'all' ? '812' : buildingId}-${t}`] || []).length, 0)}</strong></div>
                      <div><span>Open fault reports</span><strong>{openReports.length}</strong></div>
                    </div>
                    <div className="report-table">
                      <div className="report-table-head"><span>Machine</span><span>Status</span></div>
                      {state.machines.filter((m) => buildingId === 'all' || m.buildingId === buildingId).slice(0, 7).map((m) => (
                        <div className="report-table-row" key={m.id}><span>{m.label}</span><StatusBadge status={m.status} /></div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {preview.type === 'weekly' && (
                <>
                  <h3 className="report-section-title">Busiest hours</h3>
                  <div className="report-table">
                    <div className="report-table-head"><span>Hour</span><span>Load</span></div>
                    {topHours.map((h) => (
                      <div className="report-table-row" key={h.hour}><span>{hourLabel(h.hour)}</span><span>{h.value}% busy</span></div>
                    ))}
                  </div>
                </>
              )}

              {preview.type === 'monthly' && (
                <>
                  <h3 className="report-section-title">Monthly performance</h3>
                  <div className="report-two-col">
                    <div className="report-stat-list">
                      <div><span>Bookings</span><strong>{scope.monthly.bookings.toLocaleString()}</strong></div>
                      <div><span>Utilisation</span><strong>{scope.monthly.utilization}%</strong></div>
                      <div><span>Reports submitted</span><strong>{scope.monthly.reports}</strong></div>
                      <div><span>Confirmed faults</span><strong>{scope.monthly.confirmed}</strong></div>
                      <div><span>Median triage</span><strong>{scope.monthly.triageMedian}</strong></div>
                      <div><span>Median repair</span><strong>{scope.monthly.repairMedian}</strong></div>
                    </div>
                    <div className="report-table">
                      <div className="report-table-head"><span>Machine</span><span>Utilisation</span></div>
                      {Object.entries(scope.machineUtil).slice(0, 7).map(([m, v]) => (
                        <div className="report-table-row" key={m}><span>{m}</span><span>{v}%</span></div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {preview.type === 'faults' && (
                <>
                  <h3 className="report-section-title">Faults and downtime</h3>
                  <div className="report-table">
                    <div className="report-table-head"><span>Machine</span><span>Faults</span><span>Downtime</span></div>
                    {scope.faults.map((f) => (
                      <div className="report-table-row" key={f.machine}><span>{f.machine}</span><span>{f.faults}</span><span>{f.downtime} h</span></div>
                    ))}
                  </div>
                </>
              )}

              {preview.type === 'penalties' && (
                <>
                  <h3 className="report-section-title">No-shows and current suspensions</h3>
                  <div className="report-two-col">
                    <div className="report-stat-list">
                      <div><span>No-show rate</span><strong>{scope.noShowRate}%</strong></div>
                      <div><span>Claim-miss rate</span><strong>{scope.claimMissRate}%</strong></div>
                      <div><span>No-shows this month</span><strong>{noShowBookings.length}</strong></div>
                      <div><span>Currently suspended</span><strong>{suspended.length}</strong></div>
                    </div>
                    <div className="report-table">
                      <div className="report-table-head"><span>Student</span><span>Until</span></div>
                      {suspended.length === 0 ? (
                        <div className="report-table-row"><span>No suspended students</span><span>—</span></div>
                      ) : (
                        suspended.slice(0, 6).map((u) => (
                          <div className="report-table-row" key={u.id}><span>{u.name}</span><span>{fmtDate(u.suspendedUntil, true)}</span></div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="report-footer">
                <span>Generated by WashQ · SWE 363-01 Team 18</span>
                <span>Page 1 of 1</span>
              </div>

              <div className="report-actions">
                <Button icon="download" onClick={buildCsv} disabled={preview.format === 'pdf'}>
                  Export CSV
                </Button>
                <Button variant="secondary" icon="file" onClick={() => window.print()}>
                  Print / Save PDF
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
