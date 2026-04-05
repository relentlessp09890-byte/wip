export function setFlag(key: string, value = '1') {
  if (typeof window === 'undefined') return
  // Set localStorage (for client-side reads)
  localStorage.setItem(key, value)
  // Set cookie (for middleware reads)
  // 365 days, SameSite=Lax
  const expires = new Date()
  expires.setFullYear(expires.getFullYear() + 1)
  document.cookie = `${key}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}

export function getFlag(key: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(key)
}

export function clearFlag(key: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(key)
  document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}