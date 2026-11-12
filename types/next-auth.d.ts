import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    accessToken: string
    userId: string
    role?: string
    error?: string
  }
  interface User {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    role?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    userId?: string
    role?: string
    error?: string
  }
}
