/**
 * 詰将棋データインポートスクリプト
 *
 * 外部SFENファイルから詰将棋をDBにインポートする。
 *
 * 使用方法:
 *   pnpm import:tsumeshogi --count 100 --replace  # 初回: 既存削除して100問ずつ
 *   pnpm import:tsumeshogi --count 100            # 追加: 自動オフセットで追加
 */

import { createReadStream, existsSync } from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { parseArgs } from 'node:util'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ソースファイルのパス（環境変数で上書き可能）
const SOURCE_DIR =
  process.env.TSUMESHOGI_SOURCE_DIR ??
  '/Users/maikishinbo/Documents/ソースコード/mate3_5_7_9_11'

// 対象ファイル（9手、11手は現在未対応）
const FILES: { file: string; moveCount: number }[] = [
  { file: 'mate3.sfen', moveCount: 3 },
  { file: 'mate5.sfen', moveCount: 5 },
  { file: 'mate7.sfen', moveCount: 7 },
]

/**
 * SFENをパース（末尾の手数を除去）
 *
 * SFEN形式: "BOARD SIDE HANDS MOVE_COUNT"
 * 例: "ln1gkg1nl/... w R2Pbgp 42" → "ln1gkg1nl/... w R2Pbgp"
 */
function parseSfen(line: string): string {
  const parts = line.trim().split(' ')
  // SFEN最小構成: board(1) + side(1) + hands(1) + moveCount(1) = 4パーツ
  // 最後の要素が数字（手数）なら除去
  if (parts.length >= 4 && /^\d+$/.test(parts[parts.length - 1]!)) {
    return parts.slice(0, -1).join(' ')
  }
  return line.trim()
}

/**
 * ファイルから指定範囲の行を読み込む
 */
async function readLines(
  filePath: string,
  offset: number,
  count: number
): Promise<string[]> {
  const lines: string[] = []
  let lineNumber = 0

  const stream = createReadStream(filePath)
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Number.POSITIVE_INFINITY,
  })

  for await (const line of rl) {
    if (lineNumber >= offset && lineNumber < offset + count) {
      lines.push(parseSfen(line))
    }
    lineNumber++
    if (lineNumber >= offset + count) {
      break
    }
  }

  stream.destroy()
  return lines
}

/**
 * 各手数の現在件数を取得
 */
async function getCurrentCounts(): Promise<Map<number, number>> {
  const counts = await prisma.tsumeshogi.groupBy({
    by: ['moveCount'],
    _count: { id: true },
  })

  const map = new Map<number, number>()
  for (const item of counts) {
    map.set(item.moveCount, item._count.id)
  }
  return map
}

/**
 * メイン処理
 */
async function main() {
  // コマンドライン引数をパース
  const { values } = parseArgs({
    options: {
      count: { type: 'string', short: 'c', default: '100' },
      replace: { type: 'boolean', short: 'r', default: false },
    },
  })

  const count = Number.parseInt(values.count!, 10)
  const replace = values.replace!

  if (Number.isNaN(count) || count <= 0) {
    console.error('Error: --count must be a positive number')
    process.exit(1)
  }

  console.log('=== 詰将棋インポート ===')
  console.log(`インポート数: 各手数 ${count} 問`)
  console.log(`モード: ${replace ? '置換（既存削除）' : '追加'}`)
  console.log(`ソース: ${SOURCE_DIR}`)
  console.log('')

  // ファイル存在チェック
  for (const { file } of FILES) {
    const filePath = path.join(SOURCE_DIR, file)
    if (!existsSync(filePath)) {
      console.error(`Error: ファイルが見つかりません: ${filePath}`)
      process.exit(1)
    }
  }

  // 置換モードの場合は既存データを削除
  if (replace) {
    const deleted = await prisma.tsumeshogi.deleteMany({})
    console.log(`既存データ削除: ${deleted.count} 件`)
  }

  // 現在の件数を取得（オフセット計算用）
  const currentCounts = await getCurrentCounts()

  let totalImported = 0

  for (const { file, moveCount } of FILES) {
    const filePath = path.join(SOURCE_DIR, file)
    const offset = replace ? 0 : (currentCounts.get(moveCount) ?? 0)

    console.log(`\n[${moveCount}手詰め] ${file}`)
    console.log(`  オフセット: ${offset}`)

    // ファイルから読み込み
    const sfens = await readLines(filePath, offset, count)

    if (sfens.length === 0) {
      console.log(`  スキップ: 読み込むデータがありません`)
      continue
    }

    // DBに挿入
    const result = await prisma.tsumeshogi.createMany({
      data: sfens.map((sfen) => ({
        sfen,
        moveCount,
        status: 'published',
      })),
    })

    console.log(`  インポート: ${result.count} 件`)
    totalImported += result.count
  }

  // 最終結果
  const finalCounts = await getCurrentCounts()
  console.log('\n=== 結果 ===')
  for (const { moveCount } of FILES) {
    const before = currentCounts.get(moveCount) ?? 0
    const after = finalCounts.get(moveCount) ?? 0
    console.log(`${moveCount}手詰め: ${before} → ${after} 件`)
  }
  console.log(`合計インポート: ${totalImported} 件`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
