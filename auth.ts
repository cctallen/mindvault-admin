import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { login } from "@/lib/api"

// Bypass self-signed cert on backend — remove once proper CA cert is installed
// Suppress the Node.js warning since this is intentional
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
process.removeAllListeners("warning")

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://3.129.106.237:5228"

async function refreshAccessToken(token: Record<string, unknown>) {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    })
    if (!res.ok) throw new Error(`Refresh failed: ${res.status}`)
    const data = await res.json()
    // Decode new access token to get expiry
    const [, payloadB64] = (data.accessToken as string).split(".")
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString())
    return {
      ...token,
      accessToken: data.accessToken as string,
      refreshToken: data.refreshToken as string,
      accessTokenExpires: (payload.exp as number) * 1000,
      error: undefined,
    }
  } catch (err) {
    console.error("[auth] token refresh failed:", err)
    return { ...token, error: "RefreshAccessTokenError" }
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        try {
          const tokens = await login(
            credentials.email as string,
            credentials.password as string
          )
          // Decode the JWT to extract the user's UUID and expiry
          const [, payloadB64] = tokens.accessToken.split(".")
          const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString())
          const userId: string =
            payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ?? ""
          const roleRaw = payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]
          const role: string = Array.isArray(roleRaw) ? roleRaw[0] : (roleRaw ?? "User")
          return {
            id: userId,
            email: credentials.email as string,
            userId,
            role,
            accessTokenExpires: (payload.exp as number) * 1000,
            ...tokens,
          }
        } catch (err) {
          console.error("[auth] authorize failed:", err)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in — populate token from user object
      if (user) {
        token.accessToken = (user as Record<string, unknown>).accessToken as string
        token.refreshToken = (user as Record<string, unknown>).refreshToken as string
        token.accessTokenExpires = (user as Record<string, unknown>).accessTokenExpires as number
        token.userId = (user as Record<string, unknown>).userId as string
        token.role = (user as Record<string, unknown>).role as string
        return token
      }

      // Token still valid — return as-is (with 60s buffer before expiry)
      if (Date.now() < (token.accessTokenExpires as number) - 60_000) {
        return token
      }

      // Access token expired — try to refresh
      console.log("[auth] access token expired, refreshing...")
      return refreshAccessToken(token as Record<string, unknown>)
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.userId = token.userId as string
      session.role = token.role as string | undefined
      session.error = token.error as string | undefined
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
})
