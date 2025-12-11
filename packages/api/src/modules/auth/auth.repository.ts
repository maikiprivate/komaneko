/**
 * 認証リポジトリ（DB操作）
 */

import type { PrismaClient, Session, User } from '@prisma/client'

export interface AuthRepository {
  findUserByEmail(email: string): Promise<User | null>
  findUserByUsername(username: string): Promise<User | null>
  createUser(data: {
    email: string
    username: string
    passwordHash: string
  }): Promise<User>
  deleteUser(userId: string): Promise<void>
  createSession(data: {
    userId: string
    token: string
    expiresAt: Date
  }): Promise<Session>
  deleteSessionsByUserId(userId: string): Promise<void>
}

export function createAuthRepository(prisma: PrismaClient): AuthRepository {
  return {
    async findUserByEmail(email: string): Promise<User | null> {
      return prisma.user.findUnique({ where: { email } })
    },

    async findUserByUsername(username: string): Promise<User | null> {
      return prisma.user.findUnique({ where: { username } })
    },

    async createUser(data: {
      email: string
      username: string
      passwordHash: string
    }): Promise<User> {
      return prisma.user.create({
        data: {
          email: data.email,
          username: data.username,
          passwordHash: data.passwordHash,
          isAnonymous: false,
        },
      })
    },

    async deleteUser(userId: string): Promise<void> {
      await prisma.user.delete({ where: { id: userId } })
    },

    async createSession(data: {
      userId: string
      token: string
      expiresAt: Date
    }): Promise<Session> {
      return prisma.session.create({
        data: {
          userId: data.userId,
          token: data.token,
          expiresAt: data.expiresAt,
        },
      })
    },

    async deleteSessionsByUserId(userId: string): Promise<void> {
      await prisma.session.deleteMany({ where: { userId } })
    },
  }
}
