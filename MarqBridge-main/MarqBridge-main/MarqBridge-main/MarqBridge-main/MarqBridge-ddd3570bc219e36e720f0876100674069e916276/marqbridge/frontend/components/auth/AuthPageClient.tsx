'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/ui/Logo'

type AuthMode = 'signin' | 'signup' | 'forgot'

export default function AuthPageClient() {
  const router  = useRouter()
  const params  = useSearchParams()
  const redirect = params.get('redirect') || '/'

  const [mode,     setMode]     = useState<AuthMode>('signin')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(redirect)
    })
  }, [redirect, router])

  async function handleSubmit() {
    if (!supabase) {
      localStorage.setItem('marq_auth_email', email)
      localStorage.setItem('marq_onboarded', '1')
      router.push(redirect)
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, tier: 'free' } },
        })
        if (error) throw error
        setSuccess('Check your email to confirm your account.')
      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        localStorage.setItem('marq_onboarded', '1')
        router.push(redirect)
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        setSuccess('Password reset link sent to your email.')
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong.')
    }

    setLoading(false)
  }

  async function handleGoogle() {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + redirect },
    })
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', marginBottom: 12 }}>
            <Logo size="md" />
          </div>
          <p style={{ fontSize: 12, color: '#444', margin: 0 }}>
            Risk-first trading OS
          </p>
        </div>

        <div style={{
          background: '#0f0f0f',
          border: '0.5px solid #1e1e1e',
          borderRadius: 16, padding: '32px 28px',
        }}>

          {mode !== 'forgot' && (
            <div style={{
              display: 'flex', background: '#141414',
              borderRadius: 9, padding: 3, marginBottom: 28,
            }}>
              {(['signin', 'signup'] as AuthMode[]).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(null) }} style={{
                  flex: 1, padding: '8px 0', borderRadius: 7, cursor: 'pointer',
                  border: 'none',
                  background: mode === m ? '#0f0f0f' : 'transparent',
                  color: mode === m ? '#e8e8e8' : '#444',
                  fontSize: 13, fontWeight: mode === m ? 500 : 400,
                  transition: 'all .15s',
                }}>
                  {m === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          )}

          {mode === 'forgot' && (
            <div style={{ marginBottom: 24 }}>
              <button onClick={() => setMode('signin')} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#555', fontSize: 12, padding: 0,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                ← Back to sign in
              </button>
              <h2 style={{ fontSize: 18, fontWeight: 500, color: '#fff', margin: '12px 0 4px' }}>
                Reset password
              </h2>
              <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
                Enter your email and we'll send a reset link.
              </p>
            </div>
          )}

          {mode !== 'forgot' && (
            <>
              <button onClick={handleGoogle} style={{
                width: '100%', padding: '11px 0', borderRadius: 9, cursor: 'pointer',
                border: '0.5px solid #2a2a2a', background: '#141414',
                color: '#e8e8e8', fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: 20, transition: 'border-color .15s',
              }}
              onMouseOver={e => (e.currentTarget.style.borderColor = '#3a3a3a')}
              onMouseOut={e  => (e.currentTarget.style.borderColor = '#2a2a2a')}>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ flex: 1, height: '0.5px', background: '#1e1e1e' }} />
                <span style={{ fontSize: 11, color: '#333' }}>or continue with email</span>
                <div style={{ flex: 1, height: '0.5px', background: '#1e1e1e' }} />
              </div>
            </>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ fontSize: 11, color: '#444', letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  Full name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 9,
                    background: '#141414', border: '0.5px solid #2a2a2a',
                    color: '#e8e8e8', fontSize: 13, outline: 'none',
                    transition: 'border-color .15s', boxSizing: 'border-box',
                  }}
                  onFocus={e  => (e.target.style.borderColor = 'rgba(224,184,74,0.4)')}
                  onBlur={e   => (e.target.style.borderColor = '#2a2a2a')}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, color: '#444', letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 9,
                  background: '#141414', border: '0.5px solid #2a2a2a',
                  color: '#e8e8e8', fontSize: 13, outline: 'none',
                  transition: 'border-color .15s', boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(224,184,74,0.4)')}
                onBlur={e  => (e.target.style.borderColor = '#2a2a2a')}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 11, color: '#444', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button onClick={() => setMode('forgot')} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 11, color: '#444',
                      transition: 'color .15s',
                    }}
                    onMouseOver={e => (e.currentTarget.style.color = '#888')}
                    onMouseOut={e  => (e.currentTarget.style.color = '#444')}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Create a strong password' : 'Enter your password'}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 9,
                    background: '#141414', border: '0.5px solid #2a2a2a',
                    color: '#e8e8e8', fontSize: 13, outline: 'none',
                    transition: 'border-color .15s', boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(224,184,74,0.4)')}
                  onBlur={e  => (e.target.style.borderColor = '#2a2a2a')}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>
            )}

            {error && (
              <div style={{
                background: 'rgba(248,113,113,0.08)', border: '0.5px solid rgba(248,113,113,0.2)',
                borderRadius: 8, padding: '10px 12px',
                fontSize: 12, color: '#f87171', lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                background: 'rgba(74,222,128,0.08)', border: '0.5px solid rgba(74,222,128,0.2)',
                borderRadius: 8, padding: '10px 12px',
                fontSize: 12, color: '#4ade80', lineHeight: 1.5,
              }}>
                {success}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !email || (mode !== 'forgot' && !password)}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 9, cursor: 'pointer',
                border: '0.5px solid rgba(224,184,74,0.4)',
                background: 'rgba(224,184,74,0.1)',
                color: '#e0b84a', fontSize: 13, fontWeight: 500,
                marginTop: 4, transition: 'background .15s',
                opacity: (loading || !email) ? 0.4 : 1,
              }}
              onMouseOver={e => { if (!loading) e.currentTarget.style.background = 'rgba(224,184,74,0.18)' }}
              onMouseOut={e  => { e.currentTarget.style.background = 'rgba(224,184,74,0.1)' }}>
              {loading ? 'Loading...' :
               mode === 'signin' ? 'Sign in to MarqBridge' :
               mode === 'signup' ? 'Create account' :
               'Send reset link'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#2a2a2a', marginTop: 20 }}>
          {mode === 'signup'
            ? 'By creating an account you agree to our terms of service.'
            : 'Sign in is optional. Try the demo without an account.'}
        </p>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button onClick={() => {
            localStorage.setItem('marq_saw_landing', '1')
            localStorage.setItem('marq_onboarded', '1')
            router.push('/')
          }} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: '#333', textDecoration: 'underline',
            textDecorationColor: '#2a2a2a',
          }}>
            Skip — try demo without signing in
          </button>
        </div>
      </div>
    </div>
  )
}
