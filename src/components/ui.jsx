import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icons.jsx'
import { useNow } from '../hooks/useNow.js'
import { mmss } from '../lib/time.js'

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