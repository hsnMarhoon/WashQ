import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../../store/AppStore.jsx'
import { AuthLayout } from './AuthLayout.jsx'
import { Banner, Button, Field, Input } from '../../components/ui.jsx'
import { Icon } from '../../components/Icons.jsx'

export function ResetPassword() {
  const { setNewPassword, toast } = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [step, setStep] = useState(params.get('expired') ? 'expired' : 'request')
  const [email, setEmail] = useState(params.get('email') || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  const checks = useMemo(
    () => [
      { label: '8 characters or more', ok: password.length >= 8 },
      { label: 'Contains a letter', ok: /[A-Za-z]/.test(password) },
      { label: 'Contains a digit', ok: /\d/.test(password) },
      { label: 'Passwords match', ok: !!password && password === confirm },
    ],
    [password, confirm],
  )

  const request = (e) => {
    e.preventDefault()
    const next = {}
    if (!email.trim()) next.email = 'KFUPM email is required.'
    else if (!/^[^\s@]+@kfupm\.edu\.sa$/.test(email.trim())) next.email = 'Use your @kfupm.edu.sa email.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSent(true)
    setStep('sent')
  }

  const save = (e) => {
    e.preventDefault()
    const res = setNewPassword(email, password, confirm)
    if (!res.ok) {
      setErrors(res.errors)
      return
    }
    toast('Password updated. Sign in with your new password.')
    navigate('/signin', { state: { email } })
  }

  if (step === 'expired') {
    return (
      <AuthLayout
        eyebrow="Password reset"
        title="This link has expired"
        subtitle="Reset links are valid for 30 minutes."
        footer={<span>Remembered it? <Link to="/signin">Back to sign in</Link></span>}
      >
        <div className="auth-state">
          <span className="auth-state-icon danger"><Icon name="clock" size={30} /></span>
          <p className="auth-state-copy">For your security, this reset link can no longer be used. Request a new one below.</p>
          <Button block onClick={() => { setStep('request'); setSent(false) }} icon="refresh">Send a new link</Button>
        </div>
      </AuthLayout>
    )
  }

  if (step === 'sent') {
    return (
      <AuthLayout
        eyebrow="Password reset"
        title="Check your email"
        subtitle={sent ? `If an account exists for ${email}, a reset link is on its way.` : 'A reset link is on its way.'}
        footer={<span><Link to="/signin">Back to sign in</Link></span>}
      >
        <div className="auth-state">
          <span className="auth-state-icon"><Icon name="mail" size={30} /></span>
          <p className="auth-state-copy">Open the link in the email to choose a new password. The link expires in 30 minutes.</p>
          <div className="auth-state-actions">
            <Button block onClick={() => setStep('reset')} iconRight="arrow-right">Open reset link (prototype)</Button>
            <button type="button" className="link-btn" onClick={() => setStep('request')}>Use a different email</button>
            <button type="button" className="link-btn" onClick={() => setStep('expired')}>Preview the expired state</button>
          </div>
        </div>
      </AuthLayout>
    )
  }

  if (step === 'reset') {
    return (
      <AuthLayout
        eyebrow="Password reset"
        title="Choose a new password"
        subtitle={`Resetting the password for ${email || 'your account'}.`}
        footer={<span><Link to="/signin">Back to sign in</Link></span>}
      >
        <form className="auth-form" onSubmit={save} noValidate>
          <Field label="New password" required error={errors.password}>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
          </Field>
          <ul className="pw-checks standalone">
            {checks.map((c) => (
              <li key={c.label} className={c.ok ? 'ok' : ''}>
                <Icon name={c.ok ? 'check-circle' : 'alert-circle'} size={14} /> {c.label}
              </li>
            ))}
          </ul>
          <Field label="Confirm new password" required error={errors.confirmPassword}>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat the new password" autoComplete="new-password" />
          </Field>
          <Banner tone="info">Changing your password signs you out of other devices.</Banner>
          <Button type="submit" block size="lg">Update password</Button>
        </form>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      eyebrow="Password reset"
      title="Reset your password"
      subtitle="Enter your KFUPM email and we will send you a reset link."
      footer={<span>Remembered it? <Link to="/signin">Back to sign in</Link></span>}
    >
      <form className="auth-form" onSubmit={request} noValidate>
        <Field label="KFUPM email" required error={errors.email}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@kfupm.edu.sa" autoComplete="email" />
        </Field>
        <Button type="submit" block size="lg" icon="mail">Send reset link</Button>
        <p className="form-note">
          For privacy we show the same confirmation whether or not the email is registered.
        </p>
        <div className="auth-divider"><span>Prototype shortcuts</span></div>
        <div className="reset-shortcuts">
          <button type="button" className="link-btn" onClick={() => setStep('sent')}>Preview the email-sent state</button>
          <button type="button" className="link-btn" onClick={() => setStep('expired')}>Preview an expired link</button>
        </div>
      </form>
    </AuthLayout>
  )
}
