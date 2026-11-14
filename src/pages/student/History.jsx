import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../../store/AppStore.jsx'
import { Icon } from '../../components/Icons.jsx'
import {Badge, Card, DataTable, EmptyState, Kpi, StatusBadge, Tabs,} from '../../components/ui.jsx'
import { fmtDate, fmtRange } from '../../lib/time.js'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 6 AM – 11 PM
const DAY_FACTOR = [0.82, 0.78, 0.85, 0.9, 0.65, 0.8, 0.95]

function levelFor(value) {
    if (value >= 38) return 4
    if (value >= 26) return 3
    if (value >= 16) return 2
    if (value >= 9) return 1
    return 0
}

export function History() {
    const { state, user } = useApp()
    const navigate = useNavigate()
    const [params, setParams] = useSearchParams()
    const tab = params.get('tab') === 'busy' ? 'busy' : 'history'
    const [previewEmpty, setPreviewEmpty] = useState(false)

    const building = state.buildings.find((b) => b.id === user.buildingId)
    const stats = state.stats[user.buildingId]
    const myBookings = state.bookings.filter((b) => b.userId === user.id)
    const past = myBookings
        .filter((b) => !['upcoming', 'checked-in'].includes(b.status))
        .sort((a, b) => new Date(b.start) - new Date(a.start))
    const completed = past.filter((b) => b.status === 'completed').length
    const noShows = past.filter((b) => b.status === 'no-show').length
    const queueClaims = past.filter((b) => b.source === 'queue' && b.status === 'completed').length

    const heat = useMemo(() => {
        if (!stats) return []
        return DAYS.map((day, d) => ({
        day,
        values: HOURS.map((h, i) => Math.round((stats.peak[i] || 0) * DAY_FACTOR[d])),
        }))
    }, [stats])

    const busiest = useMemo(() => {
        if (!heat.length) return null
        let best = { day: '', hour: 0, value: -1 }
        heat.forEach((row) => row.values.forEach((v, i) => {
        if (v > best.value) best = { day: row.day, hour: HOURS[i], value: v }
        }))
        return best
    }, [heat])

    const columns = [
        { key: 'date', label: 'Date', render: (b) => fmtDate(b.start, true) },
        {
        key: 'machine',
        label: 'Machine',
        render: (b) => {
            const m = state.machines.find((x) => x.id === b.machineId)
            return (
            <span className="table-machine">
                <span className={`machine-chip ${m?.type}`}><Icon name={m?.type === 'washer' ? 'washer' : 'dryer'} size={15} /></span>
                <strong>{m?.label || b.machineId}</strong>
            </span>
            )
        },
        },
        { key: 'slot', label: 'Slot', render: (b) => fmtRange(b.start, b.end) },
        { key: 'source', label: 'How', render: (b) => (b.source === 'queue' ? <Badge tone="teal">Queue claim</Badge> : <span className="muted">Booking</span>) },
        { key: 'status', label: 'Outcome', render: (b) => <StatusBadge status={b.status} /> },
    ]

    return (
        <div className="page">
        <header className="page-head">
            <div>
            <h1 className="page-title">History</h1>
            <p className="page-sub">Your laundry activity and the quietest times to book in {building?.name}.</p>
            </div>
        </header>

        <div className="kpi-grid">
            <Kpi icon="check-circle" label="Cycles completed" value={completed} hint="All time" tone="teal" />
            <Kpi icon="queue" label="Queue claims" value={queueClaims} hint="Claimed from a waiting list" tone="blue" />
            <Kpi icon="alert-triangle" label="No-show strikes" value={`${user.strikes} of ${building?.penalties?.strikes ?? 3}`} hint={user.suspendedUntil ? 'Suspended' : 'Resets each semester'} tone={user.strikes ? 'amber' : 'green'} />
            <Kpi icon="flag" label="Reports submitted" value={state.reports.filter((r) => r.userId === user.id).length} hint="Faults you reported" tone="purple" />
        </div>

        <div className="tabs-row">
            <Tabs
            tabs={[{ value: 'history', label: 'My history' }, { value: 'busy', label: 'Busy times' }]}
            value={tab}
            onChange={(v) => setParams(v === 'busy' ? { tab: 'busy' } : {})}
            />
        </div>

        {tab === 'history' ? (
            <div className="two-col">
            <Card title="My bookings" subtitle="Completed, cancelled and no-show slots." bodyClass="no-pad">
                <DataTable
                columns={columns}
                rows={past}
                empty={<EmptyState icon="history" title="No history yet">Your completed and cancelled bookings will appear here.</EmptyState>}
                />
            </Card>

            <div className="stack">
                <Card title="Strikes and reliability">
                <div className="strike-meter">
                    {Array.from({ length: building?.penalties?.strikes ?? 3 }).map((_, i) => (
                    <span key={i} className={`strike-pip${i < user.strikes ? ' filled' : ''}`} />
                    ))}
                    <strong>{user.strikes} of {building?.penalties?.strikes ?? 3}</strong>
                </div>
                {noShows > 0 ? (
                    <ul className="strike-list">
                    {past.filter((b) => b.status === 'no-show').map((b) => (
                        <li key={b.id}>
                        <Icon name="alert-triangle" size={15} />
                        <span>{fmtDate(b.start, true)} · {state.machines.find((m) => m.id === b.machineId)?.label} · no check-in</span>
                        </li>
                    ))}
                    </ul>
                ) : (
                    <p className="muted small">No strikes. Check in within {building?.rules?.grace ?? 10} minutes to keep it that way.</p>
                )}
                <p className="small muted">
                    {building?.penalties?.strikes ?? 3} strikes in a semester suspend booking for {building?.penalties?.days ?? 7} days. Strikes reset each semester.
                </p>
                </Card>

                <Card title="Quick actions">
                <div className="stack-sm">
                    <button type="button" className="quick-link" onClick={() => navigate('/app/board')}>
                    <Icon name="grid" size={18} /><span>Find a free machine</span><Icon name="chevron-right" size={15} />
                    </button>
                    <button type="button" className="quick-link" onClick={() => navigate('/app/report')}>
                    <Icon name="flag" size={18} /><span>Report a problem</span><Icon name="chevron-right" size={15} />
                    </button>
                    <button type="button" className="quick-link" onClick={() => setParams({ tab: 'busy' })}>
                    <Icon name="clock" size={18} /><span>See quiet times</span><Icon name="chevron-right" size={15} />
                    </button>
                </div>
                </Card>
            </div>
            </div>
        ) : (
            <div className="stack">
            {!stats || previewEmpty ? (
                <Card>
                <EmptyState
                    icon="bar-chart"
                    title="Not enough data yet"
                    action={<button type="button" className="link-btn" onClick={() => setPreviewEmpty(false)}>Return to {building?.name}</button>}
                >
                    We need at least one full week of bookings in this building before busy times can be shown. Check back after the next weekend.
                </EmptyState>
                </Card>
            ) : (
                <>
                <Card
                    title="Busy times"
                    subtitle={`${building?.name} · last 30 days · ${stats.bookings.toLocaleString()} bookings`}
                    action={<button type="button" className="link-btn" onClick={() => setPreviewEmpty(true)}>Preview empty state</button>}
                >
                    <div className="heatmap-wrap">
                    <div className="heatmap">
                        <div className="heatmap-corner" />
                        {HOURS.map((h) => (
                        <div key={h} className="heatmap-hour">
                            {h === 6 || h % 3 === 0 ? (h > 12 ? `${h - 12}p` : h === 12 ? '12p' : `${h}a`) : ''}
                        </div>
                        ))}
                        {heat.map((row) => (
                        <div className="heatmap-row" key={row.day}>
                            <span className="heatmap-day">{row.day}</span>
                            {row.values.map((v, i) => (
                            <span
                                key={`${row.day}-${HOURS[i]}`}
                                className={`heat-cell heat-${levelFor(v)}`}
                                title={`${row.day} ${HOURS[i] > 12 ? HOURS[i] - 12 : HOURS[i]}${HOURS[i] >= 12 ? ' PM' : ' AM'} · ${v}% busy`}
                            />
                            ))}
                        </div>
                        ))}
                    </div>
                    </div>
                    <div className="heatmap-legend">
                    <span className="small muted">Quieter</span>
                    {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`heat-cell heat-${l}`} />)}
                    <span className="small muted">Busier</span>
                    <span className="legend-sep" />
                    <span className="small muted">Peak: <strong>{busiest?.day} {busiest ? (busiest.hour > 12 ? busiest.hour - 12 : busiest.hour) : ''}{busiest && busiest.hour >= 12 ? ' PM' : ' AM'}</strong></span>
                    </div>
                </Card>

                <div className="two-col">
                    <Card title="Usually free">
                    <p className="quiet-time"><Icon name="clock" size={18} /> <strong>6–9 AM</strong> every day</p>
                    <p className="muted small">Weekday mornings are the quietest window. Friday afternoons are busy from 2 PM.</p>
                    <button type="button" className="link-btn" onClick={() => navigate('/app/board')}>Book a morning slot</button>
                    </Card>
                    <Card title="What this is based on">
                    <ul className="help-list">
                        <li>{stats.bookings.toLocaleString()} bookings in {building?.name} over the last 30 days.</li>
                        <li>Heat is the share of machines in use in each time block.</li>
                        <li>Your own history is never shown to other students.</li>
                    </ul>
                    </Card>
                </div>
                </>
            )}
            </div>
        )}
        </div>
    )
}
