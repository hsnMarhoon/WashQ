/** Time + formatting helpers shared across WashQ. */

export const MIN = 60_000
export const HOUR = 3_600_000
export const DAY = 86_400_000

export const toDate = (v) => (v instanceof Date ? v : new Date(v))

export function fmtTime(value) {
  const d = toDate(value)
  let h = d.getHours()
  const m = d.getMinutes()
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ap}`
}

export function fmtClock(value) {
  const d = toDate(value)
  let h = d.getHours()
  const m = d.getMinutes()
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ap}`
}

export function fmtDate(value, withWeekday = false) {
  const d = toDate(value)
  const opts = { day: 'numeric', month: 'short' }
  if (withWeekday) opts.weekday = 'short'
  return d.toLocaleDateString('en-GB', opts)
}

export function fmtLongDate(value) {
  return toDate(value).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function dayLabel(value) {
  const d = toDate(value)
  const now = new Date()
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOf(d) - startOf(now)) / DAY)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return fmtDate(d, true)
}

export function fmtRange(start, end) {
  const s = toDate(start)
  const e = toDate(end)
  const sa = s.getHours() >= 12 ? 'PM' : 'AM'
  const ea = e.getHours() >= 12 ? 'PM' : 'AM'
  const part = (d, withAp) => {
    let h = d.getHours() % 12 || 12
    return `${h}:${String(d.getMinutes()).padStart(2, '0')}${withAp ? ' ' + (d.getHours() >= 12 ? 'PM' : 'AM') : ''}`
  }
  if (sa === ea) return `${part(s)}–${part(e)} ${ea}`
  return `${part(s, true)}–${part(e, true)}`
}

export function clockOffset(value, minutes) {
  return new Date(toDate(value).getTime() + minutes * MIN).toISOString()
}

export function startOfDay(value = new Date()) {
  const d = toDate(value)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function tomorrowStart(value = new Date()) {
  const d = startOfDay(value)
  d.setDate(d.getDate() + 1)
  return d
}

export function atTime(day, hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = startOfDay(day)
  d.setHours(h, m, 0, 0)
  return d
}

export function minsBetween(a, b) {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / MIN)
}

export function minsUntil(value, now = Date.now()) {
  return Math.max(0, Math.ceil((toDate(value).getTime() - now) / MIN))
}

/** mm:ss countdown from milliseconds remaining. */
export function mmss(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function timeAgo(value, now = Date.now()) {
  const m = Math.round((now - toDate(value).getTime()) / MIN)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return `${d} d ago`
}

export function waitingLabel(value, now = Date.now()) {
  const m = Math.max(0, Math.round((now - toDate(value).getTime()) / MIN))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h} h ${rest} min` : `${h} h`
}

export function weekdayShort(value) {
  return toDate(value).toLocaleDateString('en-GB', { weekday: 'short' })
}

export function monthLabel(value) {
  return toDate(value).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function sameDay(a, b) {
  const x = toDate(a)
  const y = toDate(b)
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
}
