import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icons.jsx'
import { useNow } from '../hooks/useNow.js'
import { mmss } from '../lib/time.js'

const STATUS_LABELS = {
    'in-use': 'In use',
    'out-of-order': 'Out of order',
    'checked-in': 'Checked in',
    'no-show': 'No-show',
    'in-repair': 'In repair',
}

const STATUS_TONES = {
    available: 'green',
    'in-use': 'blue',
    reserved: 'amber',
    'out-of-order': 'red',
    maintenance: 'amber',
    finished: 'purple',
    upcoming: 'amber',
    'checked-in': 'blue',
    completed: 'green',
    cancelled: 'gray',
    'no-show': 'red',
    open: 'amber',
    confirmed: 'blue',
    'in-repair': 'purple',
    resolved: 'green',
    dismissed: 'gray',
    live: 'green',
    scheduled: 'amber',
    expired: 'gray',
    active: 'green',
    suspended: 'red',
    disabled: 'gray',
    invited: 'amber',
    pending: 'amber',
}

const TONES = {
    green: 'green', teal: 'teal', blue: 'blue', amber: 'amber', red: 'red',
    purple: 'purple', gray: 'gray', dark: 'dark',
}

export function Banner({ tone = 'info', title, icon, children, action, onClose, className = '' }) {
    return (
        <div className={`banner banner-${tone} ${className}`} role="status">
        <span className="banner-icon"><Icon name={icon || (tone === 'danger' ? 'alert-triangle' : tone === 'warn' ? 'alert-circle' : tone === 'success' ? 'check-circle' : 'info')} size={18} /></span>
        <div className="banner-body">
            {title && <strong className="banner-title">{title}</strong>}
            {children && <div className="banner-text">{children}</div>}
        </div>
        {action && <div className="banner-action">{action}</div>}
        {onClose && <IconButton icon="x" label="Dismiss" size={15} onClick={onClose} />}
        </div>
    )
}

export function Button({
    variant = 'primary',
    size = 'md',
    icon,
    iconRight,
    as: Tag = 'button',
    className = '',
    block = false,
    children,
    ...rest
    }) {
    return (
        <Tag
        className={`btn btn-${variant} btn-${size}${block ? ' btn-block' : ''}${className ? ' ' + className : ''}`}
        {...rest}
        >
        {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
        {children != null && <span>{children}</span>}
        {iconRight && <Icon name={iconRight} size={size === 'sm' ? 15 : 17} />}
        </Tag>
    )
}

export function Card({ title, subtitle, action, children, className = '', bodyClass = '', as: Tag = 'section' }) {
    return (
        <Tag className={`card ${className}`}>
        {(title || action) && (
            <div className="card-head">
            <div>
                {title && <h2 className="card-title">{title}</h2>}
                {subtitle && <p className="card-sub">{subtitle}</p>}
            </div>
            {action && <div className="card-action">{action}</div>}
            </div>
        )}
        <div className={`card-body ${bodyClass}`}>{children}</div>
        </Tag>
    )
}

export function Countdown({ to, prefix, expired = '00:00', className = '' }) {
    const now = useNow(1000)
    const ms = new Date(to).getTime() - now
    if (!to) return null
    return (
        <span className={`countdown${ms <= 0 ? ' is-expired' : ''} ${className}`}>
        {prefix ? `${prefix} ` : ''}{ms > 0 ? mmss(ms) : expired}
        </span>
    )
}

export function EmptyState({ icon = 'inbox', title = 'Nothing here yet', children, action, compact = false }) {
    return (
        <div className={`empty${compact ? ' empty-compact' : ''}`}>
        <span className="empty-icon"><Icon name={icon} size={compact ? 20 : 28} /></span>
        <h3>{title}</h3>
        {children && <p>{children}</p>}
        {action && <div className="empty-action">{action}</div>}
        </div>
    )
}

export function IconButton({ icon, label, size = 18, className = '', ...rest }) {
    return (
        <button type="button" className={`icon-btn ${className}`} aria-label={label} title={label} {...rest}>
        <Icon name={icon} size={size} />
        </button>
    )
}

export function InlineError({ children }) {
    if (!children) return null
    return <p className="inline-error" role="alert"><Icon name="alert-circle" size={15} /> {children}</p>
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', hideClose = false }) {
    useEffect(() => {
        if (!open) return undefined
        const onKey = (e) => {
        if (e.key === 'Escape') onClose?.()
        }
        document.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
        document.removeEventListener('keydown', onKey)
        document.body.style.overflow = prev
        }
    }, [open, onClose])

    if (!open) return null
    return createPortal(
        <div
        className="modal-overlay"
        onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.()
        }}
        >
        <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <div className="modal-head">
            <div>
                <h2 id="dialog-title">{title}</h2>
                {subtitle && <p className="modal-sub">{subtitle}</p>}
            </div>
            {!hideClose && <IconButton icon="x" label="Close dialog" onClick={onClose} />}
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-foot">{footer}</div>}
        </div>
        </div>,
        document.body,
    )
}

export function ProgressRing({ value, size = 40, stroke = 4, tone = 'teal', children }) {
    const r = (size - stroke) / 2
    const c = 2 * Math.PI * r
    const pct = Math.max(0, Math.min(100, value))
    return (
        <span className={`ring ring-${tone}`} style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth={stroke} />
            <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (pct / 100) * c}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
        </svg>
        {children && <span className="ring-label">{children}</span>}
        </span>
    )
}

export function ProgressBar({ value, tone = 'teal', label }) {
    return (
        <div className="progress" aria-label={label} role="img" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <span className={`progress-fill progress-${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
        </div>
    )
}

export function Segmented({ options, value, onChange, ariaLabel = 'Filter' }) {
    return (
        <div className="seg" role="group" aria-label={ariaLabel}>
        {options.map((o) => (
            <button
            key={o.value}
            type="button"
            className={`seg-btn${value === o.value ? ' on' : ''}`}
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            >
            {o.label}
            </button>
        ))}
        </div>
    )
}

export function Select({ className = '', children, ...rest }) {
    return (
        <div className={`select-wrap ${className}`}>
        <select className="input select" {...rest}>{children}</select>
        <Icon name="chevron-down" size={16} className="select-chev" />
        </div>
    )
}

export function Badge({ tone = 'gray', dot = false, children, className = '' }) {
    return (
        <span className={`badge badge-${TONES[tone] || 'gray'}${className ? ' ' + className : ''}`}>
        {dot && <span className="badge-dot" />}
        {children}
        </span>
    )
}

export function StatusBadge({ status, dot = true }) {
    const label = STATUS_LABELS[status] || status?.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
    return <Badge tone={STATUS_TONES[status] || 'gray'} dot={dot}>{label}</Badge>
}

export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'primary', children, confirmDisabled }) {
    return (
        <Modal
        open={open}
        onClose={onClose}
        title={title}
        size="sm"
        footer={
            <>
            <Button variant="ghost" onClick={onClose}>{cancelLabel}</Button>
            <Button variant={tone} onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</Button>
            </>
        }
        >
        {body && <p className="modal-copy">{body}</p>}
        {children}
        </Modal>
    )
}

export function DataTable({ columns, rows, rowKey = 'id', empty, onRowClick, className = '' }) {
    if (!rows.length) {
        return empty || <EmptyState compact title="Nothing to show" />
    }
    return (
        <div className={`table-wrap ${className}`}>
        <table className="table">
            <thead>
            <tr>
                {columns.map((c) => (
                <th key={c.key} className={c.align ? `ta-${c.align}` : ''} style={c.width ? { width: c.width } : undefined}>
                    {c.label}
                </th>
                ))}
            </tr>
            </thead>
            <tbody>
            {rows.map((row) => (
                <tr
                key={row[rowKey]}
                className={onRowClick ? 'is-clickable' : ''}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                {columns.map((c) => (
                    <td key={c.key} className={c.align ? `ta-${c.align}` : ''}>
                    {c.render ? c.render(row) : row[c.key]}
                    </td>
                ))}
                </tr>
            ))}
            </tbody>
        </table>
        </div>
    )
}

export function Input({ className = '', ...rest }) {
    return <input className={`input ${className}`} {...rest} />
}

export function Textarea({ className = '', ...rest }) {
    return <textarea className={`input textarea ${className}`} {...rest} />
}

export function Checkbox({ checked, onChange, label, hint, disabled }) {
    const id = useId()
    return (
        <div className={`check${disabled ? ' is-disabled' : ''}`}>
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange?.(e.target.checked)} disabled={disabled} />
        <label htmlFor={id}>
            <span>{label}</span>
            {hint && <span className="check-hint">{hint}</span>}
        </label>
        </div>
    )
}

export function Toggle({ checked, onChange, label, disabled }) {
    const id = useId()
    return (
        <div className={`toggle-row${disabled ? ' is-disabled' : ''}`}>
        <span className="toggle-label" id={`${id}-label`}>{label}</span>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-labelledby={`${id}-label`}
            className={`toggle${checked ? ' on' : ''}`}
            onClick={() => !disabled && onChange?.(!checked)}
            disabled={disabled}
        >
            <span className="toggle-thumb" />
        </button>
        </div>
    )
}

export function Field({ label, required, hint, error, children, className = '', id }) {
    return (
        <div className={`field ${className}`}>
        {label && (
            <label className="field-label" htmlFor={id}>
            {label}
            {required && <span className="req" aria-hidden="true"> *</span>}
            </label>
        )}
        {children}
        {error ? <p className="field-error" role="alert">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
        </div>
    )
}

export function Avatar({ name = '?', size = 34 }) {
    const initials = name
        .split(' ')
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    return <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</span>
}

export function Tabs({ tabs, value, onChange, className = '' }) {
    return (
        <div className={`tabs ${className}`} role="tablist">
        {tabs.map((t) => (
            <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={value === t.value}
            className={`tab${value === t.value ? ' on' : ''}`}
            onClick={() => onChange(t.value)}
            >
            {t.label}
            {t.count != null && <span className="tab-count">{t.count}</span>}
            </button>
        ))}
        </div>
    )
}

export function Kpi({ icon, label, value, hint, tone = 'teal', onClick }) {
    const Tag = onClick ? 'button' : 'div'
    return (
        <Tag type={onClick ? 'button' : undefined} className={`kpi kpi-${tone}${onClick ? ' kpi-click' : ''}`} onClick={onClick}>
        <span className="kpi-icon"><Icon name={icon} size={20} /></span>
        <span className="kpi-body">
            <span className="kpi-label">{label}</span>
            <span className="kpi-value">{value}</span>
            {hint && <span className="kpi-hint">{hint}</span>}
        </span>
        {onClick && <Icon name="chevron-right" size={16} className="kpi-chev" />}
        </Tag>
    )
}