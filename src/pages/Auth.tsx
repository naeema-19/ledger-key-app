import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Field, inputCls } from '../components/ui'

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 mb-6">
      <div className="w-7 h-7 rounded-full bg-ink relative flex-shrink-0" />
      <span className="font-display text-xl font-semibold">Ledger &amp; Key</span>
    </div>
  )
}

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function submit() {
    setError(''); setNotice(''); setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error
        setNotice('Account created. If email confirmation is enabled on your Supabase project, check your inbox before signing in.')
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-card border border-line rounded-2xl shadow-sm p-9 max-w-[420px] w-full">
        <BrandMark />
        <h1 className="text-2xl font-semibold mb-1.5">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="text-inksoft text-sm mb-6 leading-relaxed">
          {mode === 'signin'
            ? 'Sign in to view your portfolio or your tenancy.'
            : 'The very first account created becomes the portal Owner. Tenants should sign up using the email their landlord added them with.'}
        </p>

        {mode === 'signup' && (
          <Field label="Full name">
            <input className={inputCls} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
          </Field>
        )}
        <Field label="Email">
          <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <input className={inputCls} type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="At least 6 characters" onKeyDown={e => { if (e.key === 'Enter') submit() }} />
        </Field>

        {error && <div className="text-due text-[12.5px] mb-3">{error}</div>}
        {notice && <div className="text-paid text-[12.5px] mb-3">{notice}</div>}

        <Button onClick={submit} disabled={busy} className="w-full">
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </Button>

        <p className="text-center text-sm text-inksoft mt-5">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button className="text-brassdark underline" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice('') }}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
