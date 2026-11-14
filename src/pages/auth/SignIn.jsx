import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppStore.jsx'
import { AuthLayout } from './AuthLayout.jsx'
import { Banner, Button, Checkbox, Field, Input, InlineError } from '../../components/ui.jsx'
import { Icon } from '../../components/Icons.jsx'
import { ROLE_HOME } from '../../components/Layout.jsx'

const DEMO = [
    { role: 'Student', email: 's202312345@kfupm.edu.sa', password: 'student123', tone: 'teal', hint: 'Faisal · Building 812' },
    { role: 'Staff', email: 'ahmed.k@kfupm.edu.sa', password: 'staff123', tone: 'blue', hint: 'Ahmed · Buildings 812 & 815' },
    { role: 'Admin', email: 'admin@kfupm.edu.sa', password: 'admin123', tone: 'purple', hint: 'Buildings, users & rules' },
]

export function SignIn() {
    const { signIn } = useApp()
    const navigate = useNavigate()
    const location = useLocation()
    const [email, setEmail] = useState(location.state?.email || '')
    const [password, setPassword] = useState('')
    const [show, setShow] = useState(false)
    const [remember, setRemember] = useState(true)
    const [errors, setErrors] = useState({})
    const [authError, setAuthError] = useState('')
    const [lockedMinutes, setLockedMinutes] = useState(0)

    const submit = (e) => {
        e.preventDefault()
        setAuthError('')
        setLockedMinutes(0)
        const next = {}
        if (!email.trim()) next.email = 'KFUPM email is required.'
        else if (!/^[^\s@]+@kfupm\.edu\.sa$/.test(email.trim())) next.email = 'Use your @kfupm.edu.sa email.'
        if (!password) next.password = 'Password is required.'
        setErrors(next)
        if (Object.keys(next).length) return

        const res = signIn(email, password)
        if (!res.ok) {
        if (res.error === 'locked') {
            setLockedMinutes(res.minutes || 15)
        } else if (res.error === 'pending') {
            setAuthError('Your account is not activated yet. Open the activation link we emailed you.')
        } else if (res.error === 'disabled') {
            setAuthError('This account has been disabled. Contact the laundry administrator.')
        } else {
            const left = res.remaining
            setAuthError(
            left ? `Email or password is incorrect. ${left} attempt${left === 1 ? '' : 's'} left before the account is locked.` : 'Email or password is incorrect.',
            )
        }
        return
        }
        const dest = location.state?.from || ROLE_HOME[res.role]
        navigate(dest, { replace: true })
    }

    return (
        <AuthLayout
        eyebrow="Account"
        title="Sign in"
        subtitle="Use your KFUPM email."
        footer={
            <span>
            New resident? <Link to="/signup">Create an account</Link>
            </span>
        }
        >
        <form className="auth-form" onSubmit={submit} noValidate>
            {authError && <Banner tone="danger" title="Sign in failed">{authError}</Banner>}
            {lockedMinutes > 0 && (
            <Banner tone="warn" title="Too many attempts">
                This account is locked for {lockedMinutes} minutes. Use a demo account below or try again later.
            </Banner>
            )}

            <Field label="KFUPM email" required error={errors.email}>
            <div className="input-icon-wrap">
                <Icon name="mail" size={17} className="input-icon" />
                <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@kfupm.edu.sa"
                autoComplete="email"
                className="has-icon"
                />
            </div>
            </Field>

            <Field label="Password" required error={errors.password}>
            <div className="input-icon-wrap">
                <Icon name="lock" size={17} className="input-icon" />
                <Input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                className="has-icon has-trailing"
                />
                <button
                type="button"
                className="input-trailing"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Hide password' : 'Show password'}
                >
                <Icon name={show ? 'eye-off' : 'eye'} size={17} />
                </button>
            </div>
            </Field>

            <div className="auth-row">
            <Checkbox checked={remember} onChange={setRemember} label="Keep me signed in" />
            <Link to="/reset" className="link-inline">Forgot password?</Link>
            </div>

            <Button type="submit" block size="lg" iconRight="arrow-right">Sign in</Button>

            <div className="auth-divider"><span>Demo accounts</span></div>
            <div className="demo-accounts">
            {DEMO.map((d) => (
                <button
                type="button"
                key={d.role}
                className={`demo-account tone-${d.tone}`}
                onClick={() => {
                    setEmail(d.email)
                    setPassword(d.password)
                    setAuthError('')
                    setErrors({})
                    setLockedMinutes(0)
                }}
                >
                <span className="demo-account-role">{d.role}</span>
                <span className="demo-account-mail">{d.email}</span>
                <span className="demo-account-hint">{d.hint}</span>
                </button>
            ))}
            </div>
            <InlineError>{errors.form}</InlineError>
            <p className="form-note">
            Click a demo account to fill the form, then press <strong>Sign in</strong>.
            </p>
        </form>
        </AuthLayout>
    )
}
