import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppStore.jsx'
import { AuthLayout } from './AuthLayout.jsx'
import { Banner, Button, Field, Input, Select } from '../../components/ui.jsx'
import { Icon } from '../../components/Icons.jsx'

export function SignUp() {
    const { state, register, activateAccount, toast } = useApp()
    const navigate = useNavigate()
    const [form, setForm] = useState({
        fullName: '', studentId: '', email: '', buildingId: '', room: '', password: '', confirmPassword: '',
    })
    const [errors, setErrors] = useState({})
    const [done, setDone] = useState(null)
    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

    const checks = useMemo(
        () => [
        { label: '8 characters or more', ok: form.password.length >= 8 },
        { label: 'Contains a letter', ok: /[A-Za-z]/.test(form.password) },
        { label: 'Contains a digit', ok: /\d/.test(form.password) },
        { label: 'Passwords match', ok: !!form.password && form.password === form.confirmPassword },
        ],
        [form.password, form.confirmPassword],
    )
    const strength = checks.filter((c) => c.ok).length
    const strengthLabel = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][strength]

    const submit = (e) => {
        e.preventDefault()
        const res = register(form)
        if (!res.ok) {
        setErrors(res.errors)
        return
        }
        setErrors({})
        setDone({ userId: res.userId, email: form.email })
    }

    if (done) {
        return (
        <AuthLayout
            eyebrow="Account created"
            title="Check your email"
            subtitle={`We sent an activation link to ${done.email}.`}
            footer={<span>Already activated? <Link to="/signin" state={{ email: done.email }}>Sign in</Link></span>}
        >
            <div className="auth-state">
            <span className="auth-state-icon"><Icon name="mail" size={30} /></span>
            <p className="auth-state-copy">
                Open the link in the email to activate your WashQ account. The link expires in 24 hours.
            </p>
            <div className="auth-state-actions">
                <Button
                onClick={() => {
                    activateAccount(done.userId)
                    toast('Account activated. You can sign in now.', 'success')
                    navigate('/signin', { state: { email: done.email } })
                }}
                icon="check-circle"
                block
                >
                Open activation link (prototype)
                </Button>
                <button type="button" className="link-btn" onClick={() => setDone(null)}>
                Use a different email
                </button>
            </div>
            <p className="form-note">
                This shortcut replaces the email step for the prototype demo.
            </p>
            </div>
        </AuthLayout>
        )
    }

    return (
        <AuthLayout
        eyebrow="Student account"
        title="Create an account"
        subtitle="Use your KFUPM student details. Staff and admin accounts are created by an administrator."
        footer={<span>Already have an account? <Link to="/signin">Sign in</Link></span>}
        >
        <form className="auth-form" onSubmit={submit} noValidate>
            <div className="form-grid">
            <Field label="Full name" required error={errors.fullName}>
                <Input value={form.fullName} onChange={set('fullName')} placeholder="Faisal Alharbi" autoComplete="name" />
            </Field>
            <Field label="Student ID" required error={errors.studentId} hint="9 digits, as printed on your ID card.">
                <Input value={form.studentId} onChange={set('studentId')} placeholder="202312345" inputMode="numeric" maxLength={9} />
            </Field>
            </div>

            <Field label="KFUPM email" required error={errors.email}>
            <Input type="email" value={form.email} onChange={set('email')} placeholder="s2023xxxxx@kfupm.edu.sa" autoComplete="email" />
            </Field>

            <div className="form-grid">
            <Field label="Building" required error={errors.buildingId}>
                <Select value={form.buildingId} onChange={set('buildingId')}>
                <option value="">Choose a building</option>
                {state.buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                ))}
                </Select>
            </Field>
            <Field label="Room number" error={errors.room} hint="Optional — helps staff return misplaced loads.">
                <Input value={form.room} onChange={set('room')} placeholder="214" />
            </Field>
            </div>

            <Field label="Password" required error={errors.password}>
            <Input type="password" value={form.password} onChange={set('password')} placeholder="At least 8 characters" autoComplete="new-password" />
            </Field>

            <div className="pw-meter">
            <div className="pw-meter-head">
                <span>Password strength</span>
                <span className={`pw-meter-label pw-${strength}`}>{strengthLabel}</span>
            </div>
            <div className="pw-meter-bars">
                {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`pw-bar${i < strength ? ' on' : ''} pw-${strength}`} />
                ))}
            </div>
            <ul className="pw-checks">
                {checks.map((c) => (
                <li key={c.label} className={c.ok ? 'ok' : ''}>
                    <Icon name={c.ok ? 'check-circle' : 'alert-circle'} size={14} /> {c.label}
                </li>
                ))}
            </ul>
            </div>

            <Field label="Confirm password" required error={errors.confirmPassword}>
            <Input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat your password" autoComplete="new-password" />
            </Field>

            {errors.form && <Banner tone="danger">{errors.form}</Banner>}
            <Button type="submit" block size="lg">Create account</Button>
            <p className="form-note">
            By creating an account you agree to the dormitory laundry rules: one active booking at a
            time, check in within 10 minutes, and collect your load when the cycle ends.
            </p>
        </form>
        </AuthLayout>
    )
}
