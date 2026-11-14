import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../../store/AppStore.jsx'
import { useNow } from '../../hooks/useNow.js'
import { Icon } from '../../components/Icons.jsx'
import {Badge, Banner, Button, Card, Countdown, EmptyState, Field, Input, InlineError, StatusBadge,} from '../../components/ui.jsx'
import { dayLabel, fmtRange, fmtTime } from '../../lib/time.js'

export function CheckIn() {
    const { state, user, checkIn, toast } = useApp()
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const now = useNow(1000)
    const [selectedId, setSelectedId] = useState(params.get('booking') || '')
    const [camera, setCamera] = useState('idle') // idle | streaming | denied
    const [code, setCode] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(null)
    const [showDemo, setShowDemo] = useState(false)

    const upcoming = useMemo(
        () =>
        state.bookings
            .filter((b) => b.userId === user.id && b.status === 'upcoming')
            .sort((a, b) => new Date(a.start) - new Date(b.start)),
        [state.bookings, user.id],
    )
    const booking = upcoming.find((b) => b.id === selectedId) || upcoming[0] || null
    const machine = booking ? state.machines.find((m) => m.id === booking.machineId) : null
    const building = state.buildings.find((b) => b.id === user.buildingId)
    const grace = building?.rules?.grace ?? 10
    const deadline = booking ? booking.graceUntil || new Date(new Date(booking.start).getTime() + grace * 60_000) : null
    const opensAt = booking ? new Date(booking.start) : null
    const notOpenYet = !!opensAt && now < opensAt.getTime()
    const windowClosed = !!deadline && now > new Date(deadline).getTime()

    useEffect(() => {
        if (!selectedId && booking) setSelectedId(booking.id)
    }, [booking, selectedId])

    const submit = (value) => {
        if (!booking) return
        setError('')
        const res = checkIn(booking.id, value)
        if (!res.ok) {
        if (res.error === 'wrong') {
            setError(`That code belongs to ${res.scanned?.split('-')[1] || 'another machine'}, not ${machine?.label}. Scan the QR on the machine you booked.`)
        } else if (res.error === 'empty') {
            setError('Enter the code printed under the QR, or scan it with the camera.')
        } else if (res.error === 'unavailable') {
            setError('This machine is out of order. Contact building staff for a replacement slot.')
        } else if (res.error === 'early') {
            setError(`Check-in opens at ${fmtTime(res.opensAt)}. Wait for your slot start, then scan again.`)
        } else if (res.error === 'late') {
            setError('The check-in window for this booking has closed. Open My Bookings to see its status.')
        } else {
            setError('This booking can no longer be checked in. Open My Bookings to see its status.')
        }
        return
        }
        setSuccess(res)
        toast(`Checked in to ${machine?.label}. Your cycle ends at ${fmtTime(booking.end)}.`)
    }

    const simulateScan = () => {
        if (!machine) return
        setCode(machine.qr)
        submit(machine.qr)
    }

    if (success) {
        const done = success.booking
        const doneMachine = success.machine
        return (
        <div className="page page-narrow">
            <Card className="success-card">
            <div className="success-inner">
                <span className="success-icon"><Icon name="check-circle" size={40} /></span>
                <h1>You're checked in</h1>
                <p className="page-sub">
                {doneMachine?.label} is now marked <strong>In use</strong> for everyone. Your cycle ends at {fmtTime(done.end)}.
                </p>
                <div className="success-detail">
                <div><span>Machine</span><strong>{doneMachine?.label} · {doneMachine?.type === 'washer' ? 'Washer' : 'Dryer'}</strong></div>
                <div><span>Slot</span><strong>{dayLabel(done.start)} {fmtRange(done.start, done.end)}</strong></div>
                <div><span>Cycle</span><strong>{doneMachine?.cycle} minutes</strong></div>
                </div>
                <Banner tone="info" icon="bell">
                We will notify you when the cycle finishes. Please collect your load promptly — leaving it blocks the machine for everyone.
                </Banner>
                <div className="success-actions">
                <Button onClick={() => navigate('/app/bookings')}>View my bookings</Button>
                <Button variant="secondary" onClick={() => navigate('/app/board')}>Back to machine board</Button>
                </div>
            </div>
            </Card>
        </div>
        )
    }

    return (
        <div className="page">
        <header className="page-head">
            <div>
            <h1 className="page-title">Check in</h1>
            <p className="page-sub">Scan the QR code on your booked machine within {grace} minutes of your slot start.</p>
            </div>
            <div className="page-actions">
            <Button variant="secondary" icon="calendar" onClick={() => navigate('/app/bookings')}>My bookings</Button>
            </div>
        </header>

        {booking && notOpenYet && (
            <Banner tone="warn" title="Check-in has not opened yet" icon="clock">
            Your {machine?.label} slot starts at {fmtTime(booking.start)}. The machine will accept your check-in from then until {grace} minutes after the start.
            </Banner>
        )}

        {booking && windowClosed && (
            <Banner tone="danger" title="Check-in window closed" icon="alert-triangle">
            This booking can no longer be checked in. If you missed it, the slot will be released and a no-show strike recorded.
            </Banner>
        )}

        {upcoming.length === 0 ? (
            <Card>
            <EmptyState
                icon="qr"
                title="No booking to check in"
                action={<Button onClick={() => navigate('/app/board')}>Book a machine</Button>}
            >
                Check-in is only available for a booking that has started. Book a slot on the machine board first.
            </EmptyState>
            </Card>
        ) : (
            <div className="checkin-layout">
            <Card className="scanner-card" title="Scan the machine QR" subtitle="Point your camera at the code on the machine door.">
                <div className={`scanner ${camera}`}>
                {camera === 'streaming' ? (
                    <>
                    <div className="scanner-view">
                        <span className="scanner-frame" />
                        <span className="scanner-line" />
                        <span className="scanner-hint">Scanning…</span>
                    </div>
                    <div className="scanner-actions">
                        <Button size="sm" onClick={simulateScan} icon="scan">Simulate a scan</Button>
                        <Button size="sm" variant="ghost" onClick={() => setCamera('idle')}>Stop camera</Button>
                    </div>
                    </>
                ) : camera === 'denied' ? (
                    <div className="scanner-denied">
                    <span className="scanner-denied-icon"><Icon name="eye-off" size={30} /></span>
                    <h3>Camera access is blocked</h3>
                    <p className="small muted">Allow camera access in your browser settings, or use the code printed under the QR.</p>
                    <div className="scanner-actions">
                        <Button size="sm" variant="secondary" onClick={() => setCamera('streaming')}>Try again</Button>
                        <Button size="sm" variant="ghost" onClick={() => setCamera('idle')}>Use manual code</Button>
                    </div>
                    </div>
                ) : (
                    <div className="scanner-idle">
                    <span className="scanner-icon"><Icon name="qr" size={44} /></span>
                    <p className="small muted">The camera opens in this panel. Nothing is uploaded or stored.</p>
                    <div className="scanner-actions">
                        <Button onClick={() => setCamera('streaming')} icon="scan">Start camera</Button>
                        <Button variant="ghost" size="sm" onClick={() => setCamera('denied')}>Simulate camera blocked</Button>
                    </div>
                    </div>
                )}
                </div>

                <div className="manual-code">
                <Field label="Or enter the machine code" hint="The code is printed under the QR on the machine.">
                    <div className="inline-form">
                    <Input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder={machine ? 'e.g. 812-W3-9Z2R' : 'Machine code'}
                        autoComplete="off"
                        onKeyDown={(e) => { if (e.key === 'Enter') submit(code) }}
                    />
                    <Button variant="secondary" onClick={() => submit(code)} disabled={!booking}>Check in</Button>
                    </div>
                </Field>
                <InlineError>{error}</InlineError>
                <button type="button" className="link-btn demo-code-toggle" onClick={() => setShowDemo((v) => !v)}>
                    {showDemo ? 'Hide demo code' : 'Show demo code'}
                </button>
                {showDemo && machine && <p className="demo-code">Demo code for {machine.label}: <code>{machine.qr}</code></p>}
                </div>
            </Card>

            <div className="checkin-side">
                <Card title="Your booking">
                {!booking ? (
                    <p className="muted small">Choose a booking below.</p>
                ) : (
                    <div className="stack">
                    <div className="checkin-booking">
                        <span className={`machine-chip lg ${machine?.type}`}><Icon name={machine?.type === 'washer' ? 'washer' : 'dryer'} size={22} /></span>
                        <div>
                        <strong>{machine?.label} · {machine?.type === 'washer' ? 'Washer' : 'Dryer'}</strong>
                        <span className="small muted">{dayLabel(booking.start)} · {fmtRange(booking.start, booking.end)}</span>
                        <StatusBadge status={booking.status} />
                        </div>
                    </div>
                    <div className="checkin-deadline">
                        <Icon name="clock" size={16} />
                        {notOpenYet ? (
                        <span>Check-in opens in <Countdown to={booking.start} /></span>
                        ) : windowClosed ? (
                        <span>Check-in window closed</span>
                        ) : (
                        <span>Check-in closes in <Countdown to={deadline?.toISOString()} /></span>
                        )}
                    </div>
                    <p className="small muted">Booking {booking.id} · Building {booking.buildingId} · {machine?.cycle}-minute cycle</p>
                    {upcoming.length > 1 && (
                        <Field label="Booking to check in">
                        <select className="input select" value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setError(''); setCamera('idle'); setCode('') }}>
                            {upcoming.map((b) => {
                            const m = state.machines.find((x) => x.id === b.machineId)
                            return <option key={b.id} value={b.id}>{m?.label} · {dayLabel(b.start)} {fmtRange(b.start, b.end)}</option>
                            })}
                        </select>
                        </Field>
                    )}
                    </div>
                )}
                </Card>

                <Card title="Can't scan?">
                <ol className="help-list">
                    <li>Every machine has a printed code under its QR sticker.</li>
                    <li>Type the full code, including the building number and machine label.</li>
                    <li>If the code does not work, ask building staff to check you in from the Live Room.</li>
                </ol>
                <Link to="/app/bookings" className="link-inline">Back to my bookings</Link>
                </Card>
            </div>
            </div>
        )}
        </div>
    )
}
