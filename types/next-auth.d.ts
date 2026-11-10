import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    accessToken: string
    userId: string
    error?: string
  }
  interface User {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    userId?: string
    error?: string
  }
}
