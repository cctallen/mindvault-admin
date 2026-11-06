import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { login } from "@/lib/api"

// Bypass self-signed cert on backend — remove once proper CA cert is installed
// Suppress the Node.js warning since this is intentional
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
process.removeAllListeners("warning")

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
          // Decode the JWT to extract the user's UUID from the nameidentifier claim
          const [, payloadB64] = tokens.accessToken.split(".")
          const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString())
          const userId: string =
            payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ?? ""
          return {
            id: userId,
            email: credentials.email as string,
            userId,
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
      if (user) {
        token.accessToken = (user as Record<string, unknown>).accessToken as string
        token.refreshToken = (user as Record<string, unknown>).refreshToken as string
        token.userId = (user as Record<string, unknown>).userId as string
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.userId = token.userId as string
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
})
