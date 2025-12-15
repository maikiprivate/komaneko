/**
 * ハートAPI関数
 */

import { apiRequest } from './client'

/** ハート状態レスポンス */
export interface HeartsResponse {
  count: number
  maxCount: number
  recoveryStartedAt: string // ISO8601
}

/** ハート消費レスポンス */
export interface ConsumeHeartsResponse {
  consumed: number
  remaining: number
  recoveryStartedAt: string // ISO8601
}

/**
 * ハート状態を取得
 *
 * 呼び出しタイミング: アプリ起動時（ログイン確認後）のみ
 * ホーム画面表示時やタブ切り替え時はAPIを叩かない（クライアント側で回復計算）
 */
export async function getHearts(): Promise<HeartsResponse> {
  return apiRequest<HeartsResponse>('/api/hearts')
}

/**
 * ハートを消費
 *
 * @param amount 消費するハート数（通常は1）
 */
export async function consumeHearts(amount: number = 1): Promise<ConsumeHeartsResponse> {
  return apiRequest<ConsumeHeartsResponse>('/api/hearts/consume', {
    method: 'POST',
    body: { amount },
  })
}
