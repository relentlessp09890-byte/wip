export async function startCheckout(tier: 'pro' | 'prop') {
  const origin = window.location.origin
  const successUrl = new URL('/billing/success', origin)
  successUrl.searchParams.set('tier', tier)

  const res = await fetch('/api/proxy/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tier,
      success_url: successUrl.toString(),
      cancel_url: `${origin}/`,
    }),
  })
  if (!res.ok) return
  const { url } = await res.json()
  if (url) window.location.href = url
}
