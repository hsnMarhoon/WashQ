import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppStore.jsx'
import { Icon, Logo } from './Icons.jsx'
import { Avatar, Badge, Button, IconButton, Modal } from './ui.jsx'
import { timeAgo } from '../lib/time.js'

export const ROLE_HOME = {
    student: '/app/board',
    staff: '/staff/overview',
    admin: '/admin/buildings',
    }

    const NAV = {
    student: [
        { to: '/app/board', label: 'Machine Board', icon: 'grid' },
        { to: '/app/bookings', label: 'My Bookings', icon: 'calendar' },
        { to: '/app/queue', label: 'Queue', icon: 'queue' },
        { to: '/app/report', label: 'Report a Problem', icon: 'flag' },
        { to: '/app/history', label: 'History', icon: 'history' },
    ],
    staff: [
        { to: '/staff/overview', label: 'Overview', icon: 'grid' },
        { to: '/staff/reports', label: 'Fault Reports', icon: 'flag' },
        { to: '/staff/machines', label: 'Machines', icon: 'washer' },
        { to: '/staff/live', label: 'Live Room', icon: 'queue' },
        { to: '/staff/announcements', label: 'Announcements', icon: 'speaker' },
        { to: '/staff/inventory', label: 'Inventory', icon: 'box' },
    ],
    admin: [
        { to: '/admin/buildings', label: 'Buildings', icon: 'building' },
        { to: '/admin/machines', label: 'Machines', icon: 'washer' },
        { to: '/admin/users', label: 'Users', icon: 'users' },
        { to: '/admin/rules', label: 'Rules & Penalties', icon: 'sliders' },
        { to: '/admin/stats', label: 'Statistics', icon: 'chart' },
        { to: '/admin/reports', label: 'Reports', icon: 'file' },
    ],
}

function useOutside(ref, onOutside) {
    useEffect(() => {
        const handler = (e) => {
        if (ref.current && !ref.current.contains(e.target)) onOutside()
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [ref, onOutside])
}

function NotificationsMenu({ user, onNavigate }) {
    const { state, markAllRead, markRead } = useApp()
    const [open, setOpen] = useState(false)
    const ref = useRef(null)
    useOutside(ref, () => setOpen(false))

    const items = useMemo(
        () =>
        state.notifications
            .filter((n) => n.userId === user?.id)
            .sort((a, b) => new Date(b.at) - new Date(a.at)),
        [state.notifications, user],
    )
    const unread = items.filter((n) => !n.read).length

    return (
        <div className="popover-wrap" ref={ref}>
        <button
            type="button"
            className={`bell${unread ? ' has-unread' : ''}`}
            aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
        >
            <Icon name="bell" size={20} />
            {unread > 0 && <span className="bell-count">{unread > 9 ? '9+' : unread}</span>}
        </button>
        {open && (
            <div className="popover notif-popover">
            <div className="popover-head">
                <strong>Notifications</strong>
                {unread > 0 && (
                <button type="button" className="link-btn" onClick={markAllRead}>Mark all read</button>
                )}
            </div>
            <div className="notif-list">
                {items.length === 0 && <p className="notif-empty">You are all caught up.</p>}
                {items.slice(0, 7).map((n) => (
                <button
                    type="button"
                    key={n.id}
                    className={`notif${n.read ? '' : ' unread'}`}
                    onClick={() => {
                    markRead(n.id)
                    setOpen(false)
                    onNavigate(n.link)
                    }}
                >
                    <span className={`notif-dot notif-${n.kind || 'info'}`} />
                    <span className="notif-body">
                    <span className="notif-title">{n.title}</span>
                    <span className="notif-text">{n.body}</span>
                    <span className="notif-time">{timeAgo(n.at)}</span>
                    </span>
                </button>
                ))}
            </div>
            </div>
        )}
        </div>
    )
}

function UserMenu({ user, onOpenDemo }) {
    const { signOut } = useApp()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const ref = useRef(null)
    useOutside(ref, () => setOpen(false))

    const roleLabel = user.role === 'student' ? 'Student' : user.role === 'staff' ? 'Staff' : 'Administrator'
    return (
        <div className="popover-wrap" ref={ref}>
        <button
            type="button"
            className="user-btn"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
        >
            <Avatar name={user.name} size={32} />
            <span className="user-name">{user.name}</span>
            <Icon name="chevron-down" size={15} />
        </button>
        {open && (
            <div className="popover user-popover">
            <div className="user-pop-head">
                <Avatar name={user.name} size={40} />
                <div>
                <strong>{user.fullName || user.name}</strong>
                <span className="muted small">{roleLabel}</span>
                {user.role === 'student' && (
                    <span className="muted small">Building {user.buildingId} · Room {user.room}</span>
                )}
                </div>
            </div>
            <div className="popover-links">
                {user.role === 'student' && (
                <>
                    <Link to="/app/settings" onClick={() => setOpen(false)}>
                    <Icon name="settings" size={17} /> Notification settings
                    </Link>
                    <Link to="/app/checkin" onClick={() => setOpen(false)}>
                    <Icon name="qr" size={17} /> Scan a machine QR
                    </Link>
                </>
                )}
                <button type="button" onClick={() => { setOpen(false); onOpenDemo() }}>
                <Icon name="sparkle" size={17} /> Prototype controls
                </button>
                <button
                type="button"
                onClick={() => {
                    setOpen(false)
                    signOut()
                    navigate('/signin')
                }}
                >
                <Icon name="logout" size={17} /> Sign out
                </button>
            </div>
            </div>
        )}
        </div>
    )
}

function DemoControls({ open, onClose, user }) {
    const {
        demoFinishMachine, demoAdvanceQueue, demoExpireClaim, demoExpireCheckIn,
        demoSuspendMe, demoForceSlotConflict, demoReset, toast,
    } = useApp()
    const navigate = useNavigate()

    const run = (fn, message, go) => {
        fn()
        onClose()
        if (go) navigate(go)
        toast(message, 'info')
    }

    const actions = []
    if (user?.role === 'student') {
        actions.push(
        {
            label: 'Finish a washer cycle',
            hint: 'Marks W2 as finished within 5 seconds. Opens a queue claim if anyone is waiting.',
            icon: 'washer',
            run: () => run(() => demoFinishMachine('812-W2'), 'Demo: W2 will finish on the next tick (≤ 5 s).'),
        },
        {
            label: 'Put me first in the queue',
            hint: 'Opens a 10-minute claim window for the demo student.',
            icon: 'queue',
            run: () => run(demoAdvanceQueue, 'Demo: your claim window is open.', '/app/queue'),
        },
        {
            label: 'Expire my claim window',
            hint: 'Triggers the expired-claim state and a strike.',
            icon: 'clock',
            run: () => run(demoExpireClaim, 'Demo: your claim window will expire on the next tick.'),
        },
        {
            label: 'Expire my check-in window',
            hint: 'Turns your next booking into a no-show and records a strike.',
            icon: 'alert-triangle',
            run: () => run(demoExpireCheckIn, 'Demo: check-in window will expire on the next tick.', '/app/bookings'),
        },
        {
            label: 'Make my next booking fail',
            hint: 'The next slot confirmation shows “slot just taken”.',
            icon: 'alert-circle',
            run: () => run(demoForceSlotConflict, 'Demo: the next booking confirmation will fail as “slot taken”.'),
        },
        {
            label: 'Suspend my account',
            hint: 'Shows the suspended booking state.',
            icon: 'shield',
            run: () => run(demoSuspendMe, 'Demo: your account is suspended.', '/app/board'),
        },
        )
    } else {
        actions.push(
        {
            label: 'Finish a machine cycle',
            hint: 'Marks Building 812 / W2 as finished on the next tick.',
            icon: 'washer',
            run: () => run(() => demoFinishMachine('812-W2'), 'Demo: W2 will finish on the next tick (≤ 5 s).'),
        },
        )
    }

    return (
        <Modal
        open={open}
        onClose={onClose}
        title="Prototype controls"
        subtitle="This is a front-end prototype. Use these shortcuts to reach time-based states without waiting."
        size="sm"
        footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
        >
        <div className="demo-list">
            {actions.map((a) => (
            <button type="button" className="demo-item" key={a.label} onClick={a.run}>
                <span className="demo-icon"><Icon name={a.icon} size={18} /></span>
                <span className="demo-text">
                <strong>{a.label}</strong>
                <span>{a.hint}</span>
                </span>
                <Icon name="chevron-right" size={16} />
            </button>
            ))}
            <div className="demo-reset">
            <div>
                <strong>Reset demo data</strong>
                <p>Restores the original seed, clears local changes and signs you out.</p>
            </div>
            <Button
                variant="danger"
                size="sm"
                onClick={() => {
                if (window.confirm('Reset all demo data and sign out?')) {
                    demoReset()
                    onClose()
                    navigate('/signin')
                    toast('Demo data reset.', 'info')
                }
                }}
            >
                Reset
            </Button>
            </div>
        </div>
        </Modal>
    )
}

export function AppLayout() {
    const { user, toasts, dismissToast, signOut } = useApp()
    const navigate = useNavigate()
    const location = useLocation()
    const [demoOpen, setDemoOpen] = useState(false)
    const [drawerOpen, setDrawerOpen] = useState(false)

    useEffect(() => {
        setDrawerOpen(false)
    }, [location.pathname])

    if (!user) return <Navigate to="/signin" replace />

    const items = NAV[user.role] || []
    const home = ROLE_HOME[user.role]

    return (
        <div className="shell">
        <header className="topbar">
            <div className="topbar-inner">
            <Link to={home} className="brand" aria-label="WashQ home">
                <Logo size={34} />
                <span className="brand-text">
                <strong>WashQ</strong>
                <span>KFUPM Laundry</span>
                </span>
            </Link>

            <nav className="main-nav" aria-label="Main navigation">
                {items.map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
                >
                    <Icon name={item.icon} size={17} />
                    <span>{item.label}</span>
                </NavLink>
                ))}
            </nav>

            <div className="topbar-tools">
                <Button variant="ghost" size="sm" icon="sparkle" className="demo-btn" onClick={() => setDemoOpen(true)}>
                Demo
                </Button>
                <NotificationsMenu user={user} onNavigate={(link) => navigate(link || home)} />
                <UserMenu user={user} onOpenDemo={() => setDemoOpen(true)} />
                <button
                type="button"
                className="icon-btn menu-btn"
                aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen((v) => !v)}
                >
                <Icon name={drawerOpen ? 'x' : 'menu'} size={22} />
                </button>
            </div>
            </div>

            {drawerOpen && (
            <div className="mobile-drawer">
                <nav aria-label="Mobile navigation">
                {items.map((item) => (
                    <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `drawer-link${isActive ? ' is-active' : ''}`}
                    >
                    <Icon name={item.icon} size={19} />
                    {item.label}
                    </NavLink>
                ))}
                {user.role === 'student' && (
                    <NavLink to="/app/settings" className="drawer-link">
                    <Icon name="settings" size={19} /> Notification settings
                    </NavLink>
                )}
                <button
                    type="button"
                    className="drawer-link"
                    onClick={() => {
                    setDrawerOpen(false)
                    setDemoOpen(true)
                    }}
                >
                    <Icon name="sparkle" size={19} /> Prototype controls
                </button>
                <button
                    type="button"
                    className="drawer-link"
                    onClick={() => {
                    setDrawerOpen(false)
                    signOut()
                    navigate('/signin')
                    }}
                >
                    <Icon name="logout" size={19} /> Sign out
                </button>
                </nav>
                <div className="drawer-role">
                <Badge tone="teal">{user.role}</Badge>
                <span className="muted small">{user.email}</span>
                </div>
            </div>
            )}
        </header>

        <main className="main">
            <Outlet />
        </main>

        <footer className="site-footer">
            <div className="footer-inner">
            <span>WashQ · SWE 363-01 Team 18 · Front-end prototype</span>
            <button type="button" className="link-btn" onClick={() => setDemoOpen(true)}>Prototype controls</button>
            <span className="muted small">Data is stored locally in this browser.</span>
            </div>
        </footer>

        <DemoControls open={demoOpen} onClose={() => setDemoOpen(false)} user={user} />

        <div className="toast-wrap" aria-live="polite" aria-atomic="true">
            {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.tone}`}>
                <Icon name={t.tone === 'error' ? 'alert-circle' : t.tone === 'info' ? 'info' : 'check-circle'} size={18} />
                <span>{t.message}</span>
                <button type="button" className="toast-x" aria-label="Dismiss notification" onClick={() => dismissToast(t.id)}>
                <Icon name="x" size={14} />
                </button>
            </div>
            ))}
        </div>
        </div>
    )
}

export function RequireRole({ role, children }) {
    const { user } = useApp()
    if (!user) return <Navigate to="/signin" replace />
    if (role && user.role !== role) return <Navigate to={ROLE_HOME[user.role]} replace />
    return children || <Outlet />
}

export function RoleRedirect() {
    const { user } = useApp()
    return <Navigate to={user ? ROLE_HOME[user.role] : '/signin'} replace />
}
