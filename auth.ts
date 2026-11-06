import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { login } from "@/lib/api"

// Must be set before any HTTPS fetch — self-signed cert on backend
// Remove once a proper CA-signed cert is installed
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

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
          return {
            id: "user",
            email: credentials.email as string,
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
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
})
