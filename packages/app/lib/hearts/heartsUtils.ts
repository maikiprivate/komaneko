/**
 * ハート回復計算ユーティリティ
 *
 * サーバーと同じロジックでクライアント側で回復を計算する。
 * APIコールを減らしパフォーマンスを向上させる。
 */

import type { HeartsResponse } from '../api/hearts'

/** 1ハート回復に必要な時間（ミリ秒）- サーバー側と同じ値を維持すること */
const RECOVERY_INTERVAL_MS = 60 * 60 * 1000 // 1時間

/** 計算結果の型 */
export interface HeartsCalculation {
  /** 現在のハート数（回復計算後） */
  current: number
  /** 最大ハート数 */
  max: number
  /** 次の回復までの分数（MAXなら0） */
  nextRecoveryMinutes: number
  /** MAXかどうか */
  isFull: boolean
}

/**
 * APIレスポンスから現在のハート状態を計算する
 *
 * @param data APIレスポンス
 * @param now 現在時刻（テスト用にオプショナル）
 * @returns 計算結果
 */
export function calculateHearts(data: HeartsResponse, now: Date = new Date()): HeartsCalculation {
  const lastRefillTime = new Date(data.lastRefill).getTime()

  // 無効な日付の場合は回復なしとして扱う
  if (Number.isNaN(lastRefillTime)) {
    return {
      current: Math.min(data.count, data.maxCount),
      max: data.maxCount,
      nextRecoveryMinutes: 0,
      isFull: data.count >= data.maxCount,
    }
  }

  const currentTime = now.getTime()
  const msSinceRefill = currentTime - lastRefillTime

  // 回復したハート数を計算
  const recovered = Math.floor(msSinceRefill / RECOVERY_INTERVAL_MS)
  const current = Math.min(data.count + recovered, data.maxCount)
  const isFull = current >= data.maxCount

  // 次の回復までの時間を計算
  let nextRecoveryMinutes = 0
  if (!isFull) {
    const msUntilNextRecovery = RECOVERY_INTERVAL_MS - (msSinceRefill % RECOVERY_INTERVAL_MS)
    nextRecoveryMinutes = Math.ceil(msUntilNextRecovery / (60 * 1000))
  }

  return {
    current,
    max: data.maxCount,
    nextRecoveryMinutes,
    isFull,
  }
}

/**
 * 分を「◯時間◯分」形式に変換
 */
export function formatRecoveryTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`
}
