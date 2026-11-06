import { NextRequest, NextResponse } from "next/server"

// Allow self-signed certs for the backend API (remove once proper SSL is in place)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://3.129.106.237:5228"

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params)
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params)
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params)
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params)
}

async function proxyRequest(req: NextRequest, params: { path: string[] }) {
  const path = "/" + params.path.join("/")
  const search = req.nextUrl.search || ""
  const targetUrl = `${API_URL}${path}${search}`

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  // Forward Authorization header
  const auth = req.headers.get("authorization")
  if (auth) headers["Authorization"] = auth

  // Forward API key header
  const apiKey = req.headers.get("x-api-key")
  if (apiKey) headers["X-Api-Key"] = apiKey

  let body: string | undefined
  if (req.method !== "GET" && req.method !== "DELETE") {
    try {
      body = await req.text()
    } catch {
      body = undefined
    }
  }

  try {
    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      // @ts-expect-error — node fetch options
      agent: undefined,
    })

    const text = await res.text()

    // 204 No Content — must return no body (Next.js/fetch spec enforces this)
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
      },
    })
  } catch (err) {
    console.error("Proxy error:", err)
    return NextResponse.json({ error: "Proxy request failed" }, { status: 502 })
  }
}
