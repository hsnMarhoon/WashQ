/**
 * Small inline SVG icon set — no external icon dependency.
 * Every icon is a 24×24 stroke drawing so it inherits `currentColor`.
 */
const ICONS = {
    grid: (
        <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </>
    ),
    calendar: (
        <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
        </>
    ),
    queue: (
        <>
        <path d="M4 6h9M4 12h16M4 18h7" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="15" cy="18" r="2" />
        </>
    ),
    flag: (
        <>
        <path d="M5 21V4" />
        <path d="M5 4h11l-1.5 4L16 12H5" />
        </>
    ),
    clock: (
        <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
        </>
    ),
    history: (
        <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
        </>
    ),
    settings: (
        <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z" />
        </>
    ),
    bell: (
        <>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10.5 21a1.5 1.5 0 0 0 3 0" />
        </>
    ),
    search: (
        <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
        </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    x: <path d="M6 6l12 12M18 6 6 18" />,
    check: <path d="m5 12.5 4.5 4.5L19 7" />,
    'check-circle': (
        <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12.5 2.7 2.7L16.5 9" />
        </>
    ),
    'alert-triangle': (
        <>
        <path d="M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
        </>
    ),
    'alert-circle': (
        <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5M12 16.5h.01" />
        </>
    ),
    info: (
        <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 7.5h.01" />
        </>
    ),
    'chevron-down': <path d="m6 9 6 6 6-6" />,
    'chevron-left': <path d="m15 6-6 6 6 6" />,
    'chevron-right': <path d="m9 6 6 6-6 6" />,
    'arrow-right': <path d="M4 12h15m-6-6 6 6-6 6" />,
    'arrow-left': <path d="M20 12H5m6-6-6 6 6 6" />,
    'arrow-up-right': <path d="M7 17 17 7M8 7h9v9" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    logout: (
        <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5M21 12H9" />
        </>
    ),
    user: (
        <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
        </>
    ),
    users: (
        <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 21a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 5.5" />
        </>
    ),
    building: (
        <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M9 21v-4h6v4M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01" />
        </>
    ),
    washer: (
        <>
        <rect x="3" y="2.5" width="18" height="19" rx="3" />
        <circle cx="12" cy="13" r="5" />
        <path d="M7 6h.01M10 6h.01M13 6h.01" />
        <path d="M9.5 13c1.5-1.6 3.5-1.6 5 0" />
        </>
    ),
    dryer: (
        <>
        <rect x="3" y="2.5" width="18" height="19" rx="3" />
        <circle cx="12" cy="13" r="5" />
        <path d="M7 6h.01M10 6h.01M13 6h.01" />
        <path d="M9 12h6M9 14.5h6" />
        </>
    ),
    qr: (
        <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h3v3h-3zM20 14h1M14 20h1M18 20h3v1M20 17h1" />
        </>
    ),
    scan: (
        <>
        <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" />
        <path d="M4 12h16" />
        </>
    ),
    wrench: (
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.7-.5-.5-2.7 2.7-2.6Z" />
    ),
    box: (
        <>
        <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
        <path d="m3 8 9 5 9-5M12 13v8" />
        </>
    ),
    speaker: (
        <>
        <path d="M4 9v6h4l5 4V5L8 9H4Z" />
        <path d="M17 8.5a5 5 0 0 1 0 7M20 6a9 9 0 0 1 0 12" />
        </>
    ),
    chart: (
        <>
        <path d="M3 3v18h18" />
        <path d="M7 15v3M12 10v8M17 6v12" />
        </>
    ),
    'bar-chart': (
        <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </>
    ),
    file: (
        <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h5" />
        </>
    ),
    download: (
        <>
        <path d="M12 3v12m-5-5 5 5 5-5" />
        <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </>
    ),
    edit: (
        <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </>
    ),
    trash: (
        <>
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        <path d="M10 11v5M14 11v5" />
        </>
    ),
    filter: <path d="M3 5h18l-7 8v6l-4 2v-8Z" />,
    refresh: (
        <>
        <path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" />
        <path d="M21 3v5h-5" />
        </>
    ),
    play: <path d="M7 4v16l13-8Z" />,
    eye: (
        <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="2.5" />
        </>
    ),
    'eye-off': (
        <>
        <path d="M3 3l18 18" />
        <path d="M10.6 5.2A11 11 0 0 1 12 5c6.5 0 10 6 10 6a17 17 0 0 1-3 3.6M6.4 6.4A17 17 0 0 0 2 11s3.5 6 10 6a10 10 0 0 0 4.6-1.1" />
        <path d="M9.9 9.9a2.5 2.5 0 0 0 3.5 3.5" />
        </>
    ),
    lock: (
        <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
    ),
    mail: (
        <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
        </>
    ),
    phone: (
        <>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
        </>
    ),
    sliders: (
        <>
        <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0" />
        <circle cx="16" cy="6" r="2" />
        <circle cx="8" cy="12" r="2" />
        <circle cx="18" cy="18" r="2" />
        </>
    ),
    sparkle: (
        <>
        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />
        <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z" />
        </>
    ),
    shield: (
        <>
        <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
        </>
    ),
    dots: (
        <>
        <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
        </>
    ),
    thermometer: (
        <>
        <path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0Z" />
        <path d="M12 9v7" />
        </>
    ),
    droplet: <path d="M12 2.7 6.5 9a7 7 0 1 0 11 0Z" />,
    star: <path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.8l6.5-.9Z" />,
}

export function Icon({ name, size = 20, className = '', strokeWidth = 1.8 }) {
    const node = ICONS[name] || ICONS.info
    return (
        <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        focusable="false"
        >
        {node}
        </svg>
    )
}

export function Logo({ size = 34 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <rect width="40" height="40" rx="11" fill="#0f766e" />
        <circle cx="20" cy="21" r="9.5" fill="none" stroke="#ffffff" strokeWidth="2.4" />
        <circle cx="20" cy="21" r="4.2" fill="none" stroke="#99f6e4" strokeWidth="2" />
        <path d="M13 9.5c2.5 2.4 5 2.4 7 0s4.5-2.4 7 0" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
    )
}
