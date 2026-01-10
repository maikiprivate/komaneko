/**
 * バックアップ機能のリポジトリ
 *
 * データベースからのエクスポート用データ取得と、
 * インポート時のupsert操作を担当。
 */

import type { Prisma, PrismaClient } from '@prisma/client'

import type { TsumeshogiExportItem } from './backup.schema.js'

export interface BackupRepository {
  // 詰将棋
  findAllTsumeshogi(): Promise<TsumeshogiExportItem[]>
  findTsumeshogiBySfen(sfen: string): Promise<{ id: string } | null>
  upsertTsumeshogi(
    data: TsumeshogiExportItem,
    existingId: string | null
  ): Promise<{ id: string }>

  // レッスン（後で追加）
  findAllCoursesWithNested(): Promise<CourseWithNested[]>
  findCourseByOrder(order: number): Promise<{ id: string } | null>
  deleteCourseById(id: string): Promise<void>
  createCourseWithNested(data: CourseCreateInput): Promise<{ id: string }>
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

    async upsertTsumeshogi(
      data: TsumeshogiExportItem,
      existingId: string | null
    ): Promise<{ id: string }> {
      if (existingId) {
        // 既存レコードを更新
        return prisma.tsumeshogi.update({
          where: { id: existingId },
          data: {
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
  }
}
