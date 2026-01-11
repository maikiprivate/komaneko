/**
 * バックアップ機能のリポジトリ
 *
 * データベースからのエクスポート用データ取得と、
 * インポート時のupsert操作を担当。
 */

import type { Prisma, PrismaClient } from '@prisma/client'

import type { TsumeshogiExportItem } from './backup.schema.js'

/** 詰将棋の重複チェック用キー */
export interface TsumeshogiKey {
  moveCount: number
  problemNumber: number
}

export interface BackupRepository {
  // 詰将棋
  findAllTsumeshogi(): Promise<TsumeshogiExportItem[]>
  findTsumeshogiBySfen(sfen: string): Promise<{ id: string } | null>
  findTsumeshogiBySfens(sfens: string[]): Promise<Map<string, string>>
  findTsumeshogiByKeys(keys: TsumeshogiKey[]): Promise<Map<string, string>>
  upsertTsumeshogi(
    data: TsumeshogiExportItem,
    existingId: string | null
  ): Promise<{ id: string }>

  // レッスン
  findAllCoursesWithNested(): Promise<CourseWithNested[]>
  findCourseByOrder(order: number): Promise<{ id: string } | null>
  findCoursesByOrders(orders: number[]): Promise<Map<number, string>>
  deleteCourseById(id: string): Promise<void>
  createCourseWithNested(data: CourseCreateInput): Promise<{ id: string }>

  // トランザクション
  runInTransaction<T>(fn: (repo: BackupRepository) => Promise<T>): Promise<T>
}

/** コースとネスト構造の型 */
export interface CourseWithNested {
  order: number
  title: string
  description: string
  status: string
  sections: {
    order: number
    title: string
    lessons: {
      order: number
      title: string
      problems: {
        order: number
        sfen: string
        playerTurn: string
        moveTree: unknown
        instruction: string
        explanation: string
      }[]
    }[]
  }[]
}

/** コース作成入力 */
export interface CourseCreateInput {
  order: number
  title: string
  description: string
  status: string
  sections: {
    order: number
    title: string
    lessons: {
      order: number
      title: string
      problems: {
        order: number
        sfen: string
        playerTurn: string
        moveTree: Prisma.InputJsonValue
        instruction: string
        explanation: string
      }[]
    }[]
  }[]
}

export function createBackupRepository(prisma: PrismaClient): BackupRepository {
  return {
    // =========================================================================
    // 詰将棋
    // =========================================================================

    async findAllTsumeshogi(): Promise<TsumeshogiExportItem[]> {
      const items = await prisma.tsumeshogi.findMany({
        orderBy: [{ moveCount: 'asc' }, { problemNumber: 'asc' }],
        select: {
          sfen: true,
          moveCount: true,
          problemNumber: true,
          status: true,
        },
      })
      return items.map((item) => ({
        sfen: item.sfen,
        moveCount: item.moveCount,
        problemNumber: item.problemNumber,
        status: item.status as 'draft' | 'published' | 'archived',
      }))
    },

    async findTsumeshogiBySfen(sfen: string): Promise<{ id: string } | null> {
      return prisma.tsumeshogi.findUnique({
        where: { sfen },
        select: { id: true },
      })
    },

    async findTsumeshogiBySfens(sfens: string[]): Promise<Map<string, string>> {
      const items = await prisma.tsumeshogi.findMany({
        where: { sfen: { in: sfens } },
        select: { id: true, sfen: true },
      })
      return new Map(items.map((item) => [item.sfen, item.id]))
    },

    async findTsumeshogiByKeys(keys: TsumeshogiKey[]): Promise<Map<string, string>> {
      if (keys.length === 0) return new Map()

      // OR条件で一括取得
      const items = await prisma.tsumeshogi.findMany({
        where: {
          OR: keys.map((k) => ({
            moveCount: k.moveCount,
            problemNumber: k.problemNumber,
          })),
        },
        select: { id: true, moveCount: true, problemNumber: true },
      })

      // "moveCount:problemNumber" をキーとしたMapを返す
      return new Map(
        items.map((item) => [`${item.moveCount}:${item.problemNumber}`, item.id])
      )
    },

    async upsertTsumeshogi(
      data: TsumeshogiExportItem,
      existingId: string | null
    ): Promise<{ id: string }> {
      if (existingId) {
        // 既存レコードを更新（sfenも含めて全フィールド更新）
        return prisma.tsumeshogi.update({
          where: { id: existingId },
          data: {
            sfen: data.sfen,
            moveCount: data.moveCount,
            problemNumber: data.problemNumber,
            status: data.status,
          },
          select: { id: true },
        })
      } else {
        // 新規作成
        return prisma.tsumeshogi.create({
          data: {
            sfen: data.sfen,
            moveCount: data.moveCount,
            problemNumber: data.problemNumber,
            status: data.status,
          },
          select: { id: true },
        })
      }
    },

    // =========================================================================
    // レッスン
    // =========================================================================

    async findAllCoursesWithNested(): Promise<CourseWithNested[]> {
      const courses = await prisma.course.findMany({
        orderBy: { order: 'asc' },
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: {
              lessons: {
                orderBy: { order: 'asc' },
                include: {
                  problems: {
                    orderBy: { order: 'asc' },
                  },
                },
              },
            },
          },
        },
      })

      return courses.map((course) => ({
        order: course.order,
        title: course.title,
        description: course.description,
        status: course.status,
        sections: course.sections.map((section) => ({
          order: section.order,
          title: section.title,
          lessons: section.lessons.map((lesson) => ({
            order: lesson.order,
            title: lesson.title,
            problems: lesson.problems.map((problem) => ({
              order: problem.order,
              sfen: problem.sfen,
              playerTurn: problem.playerTurn,
              moveTree: problem.moveTree,
              instruction: problem.instruction,
              explanation: problem.explanation,
            })),
          })),
        })),
      }))
    },

    async findCourseByOrder(order: number): Promise<{ id: string } | null> {
      return prisma.course.findUnique({
        where: { order },
        select: { id: true },
      })
    },

    async findCoursesByOrders(orders: number[]): Promise<Map<number, string>> {
      const items = await prisma.course.findMany({
        where: { order: { in: orders } },
        select: { id: true, order: true },
      })
      return new Map(items.map((item) => [item.order, item.id]))
    },

    async deleteCourseById(id: string): Promise<void> {
      await prisma.course.delete({
        where: { id },
      })
    },

    async createCourseWithNested(data: CourseCreateInput): Promise<{ id: string }> {
      return prisma.course.create({
        data: {
          order: data.order,
          title: data.title,
          description: data.description,
          status: data.status,
          sections: {
            create: data.sections.map((section) => ({
              order: section.order,
              title: section.title,
              lessons: {
                create: section.lessons.map((lesson) => ({
                  order: lesson.order,
                  title: lesson.title,
                  problems: {
                    create: lesson.problems.map((problem) => ({
                      order: problem.order,
                      sfen: problem.sfen,
                      playerTurn: problem.playerTurn,
                      moveTree: problem.moveTree,
                      instruction: problem.instruction,
                      explanation: problem.explanation,
                    })),
                  },
                })),
              },
            })),
          },
        },
        select: { id: true },
      })
    },

    async runInTransaction<T>(fn: (repo: BackupRepository) => Promise<T>): Promise<T> {
      return prisma.$transaction(async (tx) => {
        const txRepo = createBackupRepositoryWithClient(tx as PrismaClient)
        return fn(txRepo)
      })
    },
  }
}

/**
 * 指定のPrismaクライアント（またはトランザクション）でリポジトリを作成
 * runInTransaction内部で使用
 */
function createBackupRepositoryWithClient(client: PrismaClient): BackupRepository {
  return createBackupRepository(client)
}
