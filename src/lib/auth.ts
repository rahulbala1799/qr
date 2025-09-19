import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const restaurant = await prisma.restaurant.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!restaurant) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          restaurant.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: restaurant.id,
          email: restaurant.email,
          name: restaurant.name,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
  }
}
