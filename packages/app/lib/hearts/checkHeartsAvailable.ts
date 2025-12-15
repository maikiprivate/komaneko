/**
 * ハート残量チェック
 *
 * コンテンツ開始前に呼び出し、ハートが足りない場合はアラートを表示。
 */

import { Alert } from 'react-native'

import type { HeartsCalculation } from './heartsUtils'

/**
 * ハートが十分にあるかを判定する（純粋関数）
 *
 * @param hearts useHeartsから取得したハート情報
 * @param requiredAmount 必要なハート数（デフォルト: 1）
 * @returns ハートが足りる場合true
 */
export function hasEnoughHearts(
  hearts: HeartsCalculation | null,
  requiredAmount: number = 1
): boolean {
  return hearts !== null && hearts.current >= requiredAmount
}

/**
 * ハートが利用可能かチェックし、足りない場合はアラートを表示する
 *
 * @param hearts useHeartsから取得したハート情報
 * @param requiredAmount 必要なハート数（デフォルト: 1）
 * @returns ハートが足りる場合true、足りない場合false（アラート表示）
 */
export function checkHeartsAvailable(
  hearts: HeartsCalculation | null,
  requiredAmount: number = 1
): boolean {
  if (!hasEnoughHearts(hearts, requiredAmount)) {
    Alert.alert(
      'ハートが足りません',
      'ハートが回復するまでお待ちください。1時間で1ハート回復します。'
    )
    return false
  }
  return true
}
