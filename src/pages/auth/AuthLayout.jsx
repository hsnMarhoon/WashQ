import { Link } from 'react-router-dom'
import { Logo } from '../../components/Icons.jsx'

const PREVIEW = [
    { label: 'W1', state: 'Available', tone: 'green' },
    { label: 'W2', state: '24 min left', tone: 'blue' },
    { label: 'W3', state: '10:00 PM', tone: 'amber' },
    { label: 'D3', state: 'Finished', tone: 'purple' },
]

export function AuthLayout({ title, subtitle, children, footer, eyebrow }) {
    return (
        <div className="auth-shell">
        <aside className="auth-aside">
            <Link to="/" className="auth-brand" aria-label="WashQ">
            <Logo size={42} />
            <span>
                <strong>WashQ</strong>
                <small>KFUPM Dormitory Laundry</small>
            </span>
            </Link>

            <div className="auth-pitch">
            <p className="auth-eyebrow">Laundry, without the guessing</p>
            <h1>See every washer and dryer in your building before you carry the basket down.</h1>
            <p>
                Live machine status, fair queues and a ten-minute claim window. No more walking
                down four floors to find every machine taken.
            </p>
            </div>

            <div className="auth-preview" aria-hidden="true">
            <div className="auth-preview-head">
                <span className="live-dot" />
                <span>Building 812 · Laundry room</span>
                <span className="auth-preview-time">Live</span>
            </div>
            <div className="auth-preview-grid">
                {PREVIEW.map((p) => (
                <div className="auth-machine" key={p.label}>
                    <span className={`auth-machine-dot tone-${p.tone}`} />
                    <strong>{p.label}</strong>
                    <span>{p.state}</span>
                </div>
                ))}
            </div>
            </div>

            <ul className="auth-points">
            <li>Live machine status, at most 30 seconds old</li>
            <li>Queues with a fair, timed claim window</li>
            <li>Report a fault in under a minute</li>
            </ul>

            <p className="auth-footnote">SWE 363-01 · Team 18 · Front-end prototype</p>
        </aside>

        <main className="auth-main">
            <div className="auth-card">
            <div className="auth-card-head">
                {eyebrow && <span className="auth-eyebrow">{eyebrow}</span>}
                <h2>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
            </div>
            {children}
            {footer && <div className="auth-footer">{footer}</div>}
            </div>
            <div className="auth-legal">
            <span>WashQ prototype</span>
            <span>Data is stored locally in your browser</span>
            </div>
        </main>
        </div>
    )
}
