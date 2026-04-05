import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  || ''
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = url && key
  ? createClient(url, key)
  : null

export type AuthUser = {
  id:    string
  email: string
  tier:  'free' | 'pro' | 'prop'
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return null
  return {
    id:    user.id,
    email: user.email ?? '',
    tier:  (user.user_metadata?.tier as any) ?? 'free',
  }
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
  localStorage.removeItem('marq_tier')
}
