import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../../store/AppStore.jsx'
import { Icon } from '../../components/Icons.jsx'
import {Badge, Banner, Button, Card, EmptyState, Field, InlineError, Modal, Select, StatusBadge, Textarea,} from '../../components/ui.jsx'
import { fmtDate, timeAgo } from '../../lib/time.js'

const CATEGORIES = ['Does not start', 'Leaking', 'Not draining', 'Not heating', 'Door stuck', 'Other']

const TIMELINE = ['open', 'confirmed', 'in-repair', 'resolved']

export function ReportProblem() {
    const { state, user, reportFault, toast } = useApp()
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const machines = state.machines.filter((m) => m.buildingId === user.buildingId)
    const [machineId, setMachineId] = useState(params.get('machine') || '')
    const [category, setCategory] = useState('')
    const [description, setDescription] = useState('')
    const [photo, setPhoto] = useState(null)
    const [photoError, setPhotoError] = useState('')
    const [errors, setErrors] = useState({})
    const [submitted, setSubmitted] = useState(null)
    const [selected, setSelected] = useState(null)

    const myReports = useMemo(
        () =>
        state.reports
            .filter((r) => r.userId === user.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        [state.reports, user.id],
    )

    const machine = machines.find((m) => m.id === machineId)

    const onPhoto = (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        setPhotoError('')
        const okType = file.type === 'image/jpeg' || file.type === 'image/png' || /\.(jpe?g|png)$/i.test(file.name)
        if (!okType) {
        setPhoto(null)
        setPhotoError('Photo must be JPG or PNG, 5 MB or less.')
        return
        }
        if (file.size > 5 * 1024 * 1024) {
        setPhoto(null)
        setPhotoError('Photo must be JPG or PNG, 5 MB or less.')
        return
        }
        setPhoto({ name: file.name, size: file.size })
    }

    const submit = (e) => {
        e.preventDefault()
        const next = {}
        if (!machineId) next.machineId = 'Choose a machine.'
        if (!category) next.category = 'Choose a category.'
        const desc = description.trim()
        if (desc.length < 10) next.description = 'Description must be at least 10 characters.'
        if (photoError) next.photo = photoError
        if (Object.keys(next).length) {
        setErrors(next)
        return
        }
        const res = reportFault({ machineId, category, description: desc, photoName: photo?.name || '' })
        if (!res.ok) {
        setErrors(res.errors || {})
        return
        }
        setErrors({})
        setSubmitted(res.report)
        setDescription('')
        setCategory('')
        setPhoto(null)
        setPhotoError('')
        toast(`Report ${res.report.reportNo} submitted. ${machine?.label} is now marked as reported.`)
    }

    const simulateBadPhoto = () => {
        setPhoto(null)
        setPhotoError('Photo must be JPG or PNG, 5 MB or less. IMG_2231.HEIC · 8.4 MB')
    }

    return (
        <div className="page">
        <header className="page-head">
            <div>
            <h1 className="page-title">Report a problem</h1>
            <p className="page-sub">Tell building staff what is wrong. A report flags the machine so nobody else books it.</p>
            </div>
            <div className="page-actions">
            <Button variant="secondary" icon="grid" onClick={() => navigate('/app/board')}>Machine board</Button>
            </div>
        </header>

        {submitted && (
            <Banner
            tone="success"
            title={`Report ${submitted.reportNo} submitted`}
            icon="check-circle"
            onClose={() => setSubmitted(null)}
            action={<Button size="sm" variant="secondary" onClick={() => setSelected(submitted)}>View report</Button>}
            >
            {machineId && state.machines.find((m) => m.id === submitted.machineId)?.label} is now marked as reported and cannot be booked.
            {' '}Building staff have been notified and will triage it. You can follow the status in My Reports.
            </Banner>
        )}

        <div className="report-layout">
            <Card title="New report" subtitle="Machine, category and a short description are required.">
            <form className="stack" onSubmit={submit} noValidate>
                <Field label="Machine" required error={errors.machineId} hint="Pre-filled when you open the report from a machine card.">
                <Select value={machineId} onChange={(e) => setMachineId(e.target.value)}>
                    <option value="">Choose a machine</option>
                    {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                        {m.label} · {m.type === 'washer' ? 'Washer' : 'Dryer'} · Building {m.buildingId}
                        {m.status === 'out-of-order' ? ' (out of order)' : ''}
                    </option>
                    ))}
                </Select>
                </Field>

                <Field label="What's wrong?" required error={errors.category}>
                <div className="chip-grid" role="radiogroup" aria-label="Issue category">
                    {CATEGORIES.map((c) => (
                    <button
                        type="button"
                        role="radio"
                        aria-checked={category === c}
                        key={c}
                        className={`choice-chip${category === c ? ' on' : ''}`}
                        onClick={() => { setCategory(c); setErrors((x) => ({ ...x, category: '' })) }}
                    >
                        {c}
                    </button>
                    ))}
                </div>
                </Field>

                <Field label="Description" required error={errors.description} hint="What did you see or hear? Include how long it has been happening.">
                <Textarea
                    rows={5}
                    value={description}
                    maxLength={500}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Water stays in the drum after the cycle ends. Tried twice."
                />
                <div className="field-meta">
                    <span className={description.trim().length < 10 ? 'muted' : 'ok-text'}>{description.trim().length < 10 ? 'At least 10 characters' : 'Looks good'}</span>
                    <span className="muted">{description.length} / 500</span>
                </div>
                </Field>

                <Field label="Photo (optional)" error={errors.photo || photoError} hint="JPG or PNG, up to 5 MB. A photo helps staff bring the right part.">
                {photo ? (
                    <div className="upload-file">
                    <span className="upload-file-icon"><Icon name="file" size={18} /></span>
                    <div>
                        <strong>{photo.name}</strong>
                        <span className="muted small">{(photo.size / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                    <button type="button" className="link-btn" onClick={() => setPhoto(null)}>Remove</button>
                    </div>
                ) : (
                    <div className="upload-box">
                    <label className="upload-label">
                        <Icon name="plus" size={18} /> Add a photo
                        <input type="file" accept="image/jpeg,image/png" onChange={onPhoto} hidden />
                    </label>
                    <span className="muted small">JPG or PNG · max 5 MB</span>
                    </div>
                )}
                <button type="button" className="link-btn tiny-link" onClick={simulateBadPhoto}>Preview the invalid-photo error</button>
                </Field>

                <InlineError>{errors.form}</InlineError>
                <div className="form-actions">
                <Button type="submit" icon="flag">Submit report</Button>
                <Button type="button" variant="ghost" onClick={() => { setMachineId(''); setCategory(''); setDescription(''); setPhoto(null); setErrors({}); setPhotoError('') }}>
                    Cancel
                </Button>
                </div>
                <p className="form-note">
                Reporting a machine marks it reported immediately. Staff confirm the fault, then set the machine out of order while it is repaired.
                </p>
            </form>
            </Card>

            <Card
            title="My reports"
            subtitle={`${myReports.length} report${myReports.length === 1 ? '' : 's'}`}
            action={<Badge tone="gray">{myReports.filter((r) => !['resolved', 'dismissed'].includes(r.status)).length} open</Badge>}
            >
            {myReports.length === 0 ? (
                <EmptyState compact icon="flag" title="No reports yet">Reports you submit will appear here with their current status.</EmptyState>
            ) : (
                <ul className="report-list">
                {myReports.map((r) => {
                    const m = state.machines.find((x) => x.id === r.machineId)
                    return (
                    <li key={r.id}>
                        <button type="button" className="report-row" onClick={() => setSelected(r)}>
                        <span className={`machine-chip ${m?.type}`}><Icon name={m?.type === 'washer' ? 'washer' : 'dryer'} size={15} /></span>
                        <span className="report-row-main">
                            <span className="report-row-top">
                            <strong>{m?.label || r.machineId}</strong>
                            <StatusBadge status={r.status} />
                            </span>
                            <span className="small muted">{r.category} · {timeAgo(r.createdAt)}</span>
                        </span>
                        <Icon name="chevron-right" size={16} />
                        </button>
                    </li>
                    )
                })}
                </ul>
            )}
            <div className="report-legend">
                <span className="small muted">Status flow</span>
                <span className="legend-flow">Open → Confirmed → In repair → Resolved</span>
                <span className="small muted">or Dismissed with a reason.</span>
            </div>
            </Card>
        </div>

        <ReportModal report={selected} onClose={() => setSelected(null)} />
        </div>
    )
    }

    function ReportModal({ report, onClose }) {
    const { state } = useApp()
    if (!report) return null
    const machine = state.machines.find((m) => m.id === report.machineId)
    const stage = TIMELINE.indexOf(report.status)
    return (
        <Modal
        open
        onClose={onClose}
        title={`${report.reportNo} · ${machine?.label || report.machineId}`}
        subtitle={`${machine?.type === 'washer' ? 'Washer' : 'Dryer'} · Building ${report.buildingId} · submitted ${fmtDate(report.createdAt, true)}`}
        size="md"
        footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
        >
        <div className="stack">
            <div className="spread">
            <StatusBadge status={report.status} />
            <span className="small muted">{timeAgo(report.createdAt)}</span>
            </div>
            <div className="report-detail">
            <div><span>Category</span><strong>{report.category}</strong></div>
            <div><span>Description</span><p>{report.description}</p></div>
            {report.photoName && <div><span>Photo</span><strong>{report.photoName}</strong></div>}
            </div>

            {report.status !== 'dismissed' ? (
            <div className="timeline">
                {['Open', 'Confirmed', 'In repair', 'Resolved'].map((label, i) => {
                const done = stage >= 0 ? i <= stage : false
                return (
                    <div key={label} className={`timeline-step${done ? ' done' : ''}${i === stage ? ' current' : ''}`}>
                    <span className="timeline-dot">{done ? <Icon name="check" size={11} /> : null}</span>
                    <span>{label}</span>
                    </div>
                )
                })}
            </div>
            ) : (
            <Banner tone="gray" title="Dismissed by staff">
                {report.dismissReason || 'No reason was recorded.'}
            </Banner>
            )}

            {report.staffNote && (
            <div className="staff-note">
                <span className="small muted">Staff note</span>
                <p>{report.staffNote}</p>
            </div>
            )}
            <p className="form-note">Reports are visible to building staff. You will be notified when the status changes.</p>
        </div>
        </Modal>
    )
}
