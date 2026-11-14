import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppStore.jsx'
import { Icon } from '../../components/Icons.jsx'
import {Badge, Banner, Button, Card, Countdown, EmptyState, ProgressBar,} from '../../components/ui.jsx'
import { useNow } from '../../hooks/useNow.js'
import { fmtTime, timeAgo, waitingLabel } from '../../lib/time.js'

export function QueuePage() {
    const { state, user, joinQueue, leaveQueue, claimTurn, skipTurn, toast } = useApp()
    const navigate = useNavigate()
    const now = useNow(1000)
    const [lastAction, setLastAction] = useState('')

    const building = state.buildings.find((b) => b.id === user.buildingId)
    const suspended = user.status === 'suspended' || (user.suspendedUntil && new Date(user.suspendedUntil) > new Date())
    const claim = state.claim
    const claimForMe = claim?.userId === user.id
    const claimMachine = claim ? state.machines.find((m) => m.id === claim.machineId) : null
    const claimType = claim?.queueKey?.split('-')[1]

    const expiryNotice = useMemo(
        () =>
        state.notifications
            .filter((n) => n.userId === user.id && n.title === 'Claim window expired' && Date.now() - new Date(n.at).getTime() < 20 * 60 * 1000)
            .sort((a, b) => new Date(b.at) - new Date(a.at))[0],
        [state.notifications, user.id],
    )

    const queues = ['washer', 'dryer'].map((type) => {
        const key = `${user.buildingId}-${type}`
        const list = state.queues[key] || []
        const myIndex = list.findIndex((q) => q.userId === user.id)
        const machines = state.machines.filter((m) => m.buildingId === user.buildingId && m.type === type)
        const available = machines.filter((m) => m.status === 'available').length
        const cycle = machines[0]?.cycle || 45
        const activeClaim = claim?.queueKey === key ? claim : null
        return { type, key, list, myIndex, machines, available, cycle, activeClaim }
    })

    const myTurn = claimForMe

    const doJoin = (type) => {
        const res = joinQueue(type)
        if (!res.ok) {
        if (res.error === 'suspended') toast('Suspended accounts cannot join queues.', 'error')
        else if (res.error === 'already') toast('You are already in this queue.', 'info')
        else toast('Could not join the queue.', 'error')
        return
        }
        setLastAction(`joined-${type}`)
        toast(`Joined the ${type} queue at position ${res.position}. We will notify you when it is your turn.`)
    }

    const doLeave = (type) => {
        leaveQueue(type)
        setLastAction(`left-${type}`)
        toast(`You left the ${type} queue.`, 'info')
    }

    const doClaim = () => {
        const res = claimTurn()
        if (res.ok) {
        toast('Machine claimed. Scan its QR to start the cycle.')
        navigate(`/app/checkin?booking=${res.booking.id}`)
        } else if (res.error === 'limit') {
        toast(`You already have ${res.max} upcoming bookings. Cancel one before claiming another.`, 'error')
        } else {
        toast('That claim window is no longer open.', 'error')
        }
    }

    return (
        <div className="page">
        <header className="page-head">
            <div>
            <h1 className="page-title">Queue</h1>
            <p className="page-sub">{building?.name} · fair, first-come-first-served waiting lists for washers and dryers.</p>
            </div>
            <div className="page-actions">
            <Button variant="secondary" icon="grid" onClick={() => navigate('/app/board')}>Machine board</Button>
            </div>
        </header>

        {suspended && (
            <Banner tone="danger" title="Your account is suspended" icon="shield">
            You cannot join a queue until {new Date(user.suspendedUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.
            </Banner>
        )}

        {expiryNotice && !claimForMe && (
            <Banner tone="danger" title="Your claim window expired" icon="alert-triangle">
            {expiryNotice.body} Join a queue again when you are ready — the next window may open soon.
            </Banner>
        )}

        {myTurn && (
            <section className="claim-hero">
            <div className="claim-hero-head">
                <span className="claim-pulse" />
                <div>
                <p className="claim-kicker">It's your turn</p>
                <h2>{claimMachine?.label} is free</h2>
                <p>
                    Claim the machine within ten minutes and check in with its QR code. If the window expires,
                    you lose your place and one no-show strike is recorded.
                </p>
                </div>
                <div className="claim-hero-timer">
                <Countdown to={claim.endsAt} />
                <span>left to claim</span>
                </div>
            </div>
            <div className="claim-hero-foot">
                <Button icon="check" onClick={doClaim}>Claim now</Button>
                <Button variant="ghost" onClick={() => { const r = skipTurn(); if (r.ok) { toast('Turn passed to the next student.', 'info'); setLastAction('skip') } }}>
                Skip my turn
                </Button>
                <span className="small muted">Claiming opens QR check-in. Your cycle starts after you scan.</span>
            </div>
            </section>
        )}

        {claim && !claimForMe && (
            <Banner tone="info" title={`Claim window in progress · ${claimMachine?.label}`} icon="clock">
            Another student has until {fmtTime(claim.endsAt)} to claim this machine. If they do not, the next person in the queue gets a turn.
            {' '}You are not in this claim window.
            </Banner>
        )}

        {!myTurn && (
        <div className="queue-layout">
            {queues.map((q) => {
            const myPos = q.myIndex + 1
            const inQueue = q.myIndex >= 0
            const wait = Math.max(1, Math.round((Math.max(1, myPos) - 1) * (q.cycle / 2)))
            return (
                <Card
                key={q.type}
                className={`queue-card${inQueue ? ' is-mine' : ''}`}
                title={
                    <span className="queue-card-title">
                    <span className={`machine-chip ${q.type}`}><Icon name={q.type === 'washer' ? 'washer' : 'dryer'} size={18} /></span>
                    {q.type === 'washer' ? 'Washers' : 'Dryers'}
                    </span>
                }
                subtitle={`${q.list.length} waiting · ${q.available} of ${q.machines.length} free now`}
                action={<Badge tone={q.list.length ? 'amber' : 'green'} dot>{q.list.length ? `${q.list.length} waiting` : 'No queue'}</Badge>}
                >
                {q.activeClaim && !myTurn && (
                    <div className="queue-claim-row">
                    <Icon name="clock" size={16} />
                    <span>Claim window ends {fmtTime(q.activeClaim.endsAt)}</span>
                    <Countdown to={q.activeClaim.endsAt} />
                    </div>
                )}

                {inQueue && (
                    <div className="my-queue-box">
                    <div className="my-queue-top">
                        <span className="you-badge">You</span>
                        <strong>Position {myPos} of {q.list.length}</strong>
                        <span className="muted small">joined {timeAgo(q.list[q.myIndex].joinedAt)}</span>
                    </div>
                    <ProgressBar value={Math.max(6, 100 - ((myPos - 1) / Math.max(q.list.length, 1)) * 100)} label="Queue progress" />
                    <div className="my-queue-foot">
                        <span className="small muted">Estimated wait ~{wait} min</span>
                        <Button size="sm" variant="ghost" onClick={() => doLeave(q.type)}>Leave queue</Button>
                    </div>
                    </div>
                )}

                {!inQueue && q.list.length === 0 && (
                    <EmptyState compact icon="check-circle" title={`No one is waiting for ${q.type === 'washer' ? 'washers' : 'dryers'}`}>
                    {q.available > 0 ? 'A machine is free — book it directly from the board.' : 'Join the queue if every machine is busy.'}
                    </EmptyState>
                )}

                {q.list.length > 0 && (
                    <ol className="queue-list">
                    {q.list.map((entry, idx) => {
                        const isMe = entry.userId === user.id
                        const student = state.users.find((u) => u.id === entry.userId)
                        return (
                        <li key={entry.userId} className={`queue-item${isMe ? ' me' : ''}${idx === 0 ? ' head' : ''}`}>
                            <span className={`queue-pos${idx === 0 ? ' head' : ''}`}>{idx + 1}</span>
                            <span className="queue-person">
                            <strong>{isMe ? 'You' : student?.name || `Student ${entry.userId}`}</strong>
                            <span className="small muted">joined {waitingLabel(entry.joinedAt)} ago</span>
                            </span>
                            {idx === 0 && <Badge tone="teal" dot>Next up</Badge>}
                            {isMe && idx !== 0 && <Badge tone="gray">Your place</Badge>}
                        </li>
                        )
                    })}
                    </ol>
                )}

                <div className="queue-card-foot">
                    {!inQueue ? (
                    <Button
                        size="sm"
                        variant={q.available > 0 ? 'secondary' : 'primary'}
                        icon="queue"
                        disabled={suspended || (claim && claimForMe)}
                        onClick={() => doJoin(q.type)}
                    >
                        Join {q.type} queue
                    </Button>
                    ) : (
                    <span className="small muted">We will notify you when a machine frees up.</span>
                    )}
                    <span className="small muted">{q.cycle}-minute cycles</span>
                </div>
                {!inQueue && q.available > 0 && (
                    <p className="small muted queue-free-note">
                    A machine is free right now.{' '}
                    <button type="button" className="link-btn" onClick={() => navigate('/app/board')}>Book it instead</button>
                    </p>
                )}
                </Card>
            )
            })}
        </div>
        )}

        <Card title="How the queue works" className="soft-card">
            <div className="steps four">
            <div className="step"><span className="step-num">1</span><div><strong>Join a queue</strong><p>If the machines you want are all busy, join the waiting list. You may wait in one queue at a time.</p></div></div>
            <div className="step"><span className="step-num">2</span><div><strong>Watch your position</strong><p>We push a notification when a machine frees up and it is your turn.</p></div></div>
            <div className="step"><span className="step-num">3</span><div><strong>Claim within 10 minutes</strong><p>The claim window is ten minutes by default; admins can tune it per building.</p></div></div>
            <div className="step"><span className="step-num">4</span><div><strong>Check in with the QR</strong><p>Claiming opens the check-in screen. Scan the machine to start your cycle.</p></div></div>
            </div>
            {lastAction && <p className="small muted queue-last">Last action: {lastAction.replace('-', ' ')}.</p>}
        </Card>
        </div>
    )
}
