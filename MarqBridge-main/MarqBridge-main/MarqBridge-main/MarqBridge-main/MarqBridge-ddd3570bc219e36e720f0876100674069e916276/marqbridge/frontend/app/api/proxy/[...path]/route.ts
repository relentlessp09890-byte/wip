import { NextRequest, NextResponse } from 'next/server'

// TODO production: add rate limiting middleware here
// Recommended: upstash/ratelimit or nginx upstream limit

function getBackendUrl(req: NextRequest): string {
  const host = req.headers.get('host') || 'localhost:3000'
  
  // In Codespaces, replace the port in hostname
  if (host.includes('.app.github.dev')) {
    const backendHost = host.replace(/-(\d+)\.app\.github\.dev/, '-8000.app.github.dev')
    const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
    return `${protocol}://${backendHost}`
  }
  
  // Local development
  return process.env.BACKEND_URL || 'http://localhost:8000'
}

export async function GET(req: NextRequest, context: any) {
  const params = await context.params
  const backendUrl = getBackendUrl(req)
  const path = params.path.join('/')
  const url = `${backendUrl}/${path}${req.nextUrl.search}`
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })

    // Handle file downloads (CSV exports)
    const contentType = res.headers.get('content-type')
    if (contentType?.includes('text/csv') || res.headers.get('content-disposition')) {
      const buffer = await res.arrayBuffer()
      return new NextResponse(buffer, {
        status: res.status,
        headers: {
          'Content-Type': contentType || 'text/csv',
          'Content-Disposition': res.headers.get('content-disposition') || '',
        },
      })
    }

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }
}

export async function POST(req: NextRequest, context: any) {
  const params = await context.params
  const backendUrl = getBackendUrl(req)
  const path = params.path.join('/')
  const url = `${backendUrl}/${path}`
  try {
    let body: any = {}
    const contentType = req.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      try {
        body = await req.json()
      } catch {
        // Empty or invalid JSON body
        body = {}
      }
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }
}

export async function PATCH(req: NextRequest, context: any) {
  const params = await context.params
  const backendUrl = getBackendUrl(req)
  const path = params.path.join('/')
  const url = `${backendUrl}/${path}`
  try {
    const body = await req.json()
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }
}
