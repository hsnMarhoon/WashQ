import { useState } from 'react'
import { useApp } from '../../store/AppStore.jsx'
import { Badge, Banner, Button, Card, Field, InlineError, Select, Toggle } from '../../components/ui.jsx'
import { Icon } from '../../components/Icons.jsx'

const ALERTS = [
    { key: 'queueTurn', title: 'Queue turn', body: 'A machine is free and it is your turn to claim it.', required: true },
    { key: 'bookingReminder', title: 'Booking reminder', body: 'Your booked slot is starting soon.', required: false },
    { key: 'cycleFinished', title: 'Cycle finished', body: 'Your washer or dryer has finished its cycle.', required: true },
    { key: 'unattended', title: 'Unattended laundry', body: 'Your finished load is still in a machine and someone flagged it.', required: false },
    { key: 'reportUpdates', title: 'Report updates', body: 'The fault report you submitted changed status.', required: false },
]

const DEFAULTS = {
    queueTurn: { email: true, inapp: true },
    bookingReminder: { email: true, inapp: true },
    cycleFinished: { email: true, inapp: true },
    unattended: { email: true, inapp: true },
    reportUpdates: { email: true, inapp: false },
}

export function NotificationSettings() {
    const { user, saveSettings, toast } = useApp()
    const [channels, setChannels] = useState(() => JSON.parse(JSON.stringify(user.channels || DEFAULTS)))
    const [reminderLead, setReminderLead] = useState(user.reminderLead || 15)
    const [error, setError] = useState('')
    const [saved, setSaved] = useState(false)

    const setChannel = (key, field, value) => {
        setChannels((c) => ({ ...c, [key]: { ...c[key], [field]: value } }))
        setError('')
        setSaved(false)
    }

    const save = (e) => {
        e.preventDefault()
        const res = saveSettings({ channels, reminderLead })
        if (!res.ok) {
        if (res.error === 'required') {
            const label = ALERTS.find((a) => a.key === res.field)?.title || 'This alert'
            setError(`${label} is required. Keep email or in-app turned on for this alert.`)
        } else {
            setError('Could not save your settings. Try again.')
        }
        return
        }
        setError('')
        setSaved(true)
        toast('Notification settings saved.')
    }

    const reset = () => {
        setChannels(JSON.parse(JSON.stringify(DEFAULTS)))
        setReminderLead(15)
        setError('')
        setSaved(false)
    }

    return (
        <div className="page page-medium">
        <header className="page-head">
            <div>
            <h1 className="page-title">Notification settings</h1>
            <p className="page-sub">Choose how WashQ reaches you. Two alerts are always on because they protect your booking.</p>
            </div>
        </header>

        <form onSubmit={save} className="stack">
            {saved && (
            <Banner tone="success" title="Settings saved" icon="check-circle" onClose={() => setSaved(false)}>
                Your notification preferences were updated. Changes apply immediately.
            </Banner>
            )}
            {error && <Banner tone="danger" title="Check your channels" icon="alert-triangle">{error}</Banner>}

            <Card title="Alerts" subtitle="Email and in-app notifications can be set separately." bodyClass="no-pad">
            <div className="notif-table" role="table" aria-label="Notification preferences">
                <div className="notif-table-head" role="row">
                <span role="columnheader">Alert</span>
                <span role="columnheader">Email</span>
                <span role="columnheader">In-app</span>
                </div>
                {ALERTS.map((a) => {
                const ch = channels[a.key] || { email: false, inapp: false }
                const bad = a.required && !ch.email && !ch.inapp
                return (
                    <div className={`notif-table-row${bad ? ' has-error' : ''}`} role="row" key={a.key}>
                    <div className="notif-alert" role="cell">
                        <div className="notif-alert-title">
                        <strong>{a.title}</strong>
                        {a.required && <Badge tone="amber">Required</Badge>}
                        </div>
                        <p className="small muted">{a.body}</p>
                    </div>
                    <div role="cell" className="notif-toggle-cell">
                        <Toggle checked={ch.email} onChange={(v) => setChannel(a.key, 'email', v)} label={`${a.title} by email`} />
                    </div>
                    <div role="cell" className="notif-toggle-cell">
                        <Toggle checked={ch.inapp} onChange={(v) => setChannel(a.key, 'inapp', v)} label={`${a.title} in-app`} />
                    </div>
                    </div>
                )
                })}
            </div>
            </Card>

            <div className="two-col">
            <Card title="Reminder timing">
                <Field label="Send my booking reminder" hint="The reminder is delivered by email and in-app before your slot starts.">
                <Select value={reminderLead} onChange={(e) => { setReminderLead(Number(e.target.value)); setSaved(false) }}>
                    <option value={10}>10 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                </Select>
                </Field>
            </Card>

            <Card title="Where notifications go">
                <div className="channel-info">
                <Icon name="mail" size={18} />
                <div>
                    <strong>{user.email}</strong>
                    <p className="small muted">Email alerts are sent to your KFUPM address.</p>
                </div>
                </div>
                <div className="channel-info">
                <Icon name="bell" size={18} />
                <div>
                    <strong>In-app bell</strong>
                    <p className="small muted">Shown in the top bar. In-app alerts always include a link to the next action.</p>
                </div>
                </div>
            </Card>
            </div>

            <InlineError>{error}</InlineError>
            <div className="form-actions sticky-actions">
            <Button type="submit" icon="check">Save settings</Button>
            <Button type="button" variant="ghost" onClick={reset}>Reset to defaults</Button>
            <span className="small muted">Required alerts cannot be turned off in both channels.</span>
            </div>
        </form>
        </div>
    )
}
