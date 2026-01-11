/**
 * バージョン比較ユーティリティ
 *
 * セマンティックバージョニング形式（major.minor.patch）の
 * バージョン文字列を比較するための純粋関数群
 */

/**
 * バージョン文字列が有効な形式かチェック
 * 有効: "1.0.0", "1.0", "1", "10.20.30"
 * 無効: "", "abc", "1.a.0", null, undefined
 */
export function isValidVersion(version: string | null | undefined): boolean {
  if (!version || typeof version !== 'string') return false
  if (version.trim() === '') return false

  const parts = version.split('.')
  return parts.every((part) => {
    const num = parseInt(part, 10)
    return !isNaN(num) && num >= 0 && String(num) === part
  })
}

/**
 * バージョン文字列を数値配列に変換
 * "1.2.3" -> [1, 2, 3]
 *
 * 注意: この関数を呼ぶ前に isValidVersion() でチェックすること
 */
export function parseVersion(version: string): number[] {
  return version.split('.').map((n) => parseInt(n, 10))
}

/**
 * バージョンを比較
 * @returns -1: a < b, 0: a == b, 1: a > b
 *
 * 注意: この関数を呼ぶ前に isValidVersion() でチェックすること
 */
export function compareVersions(a: string, b: string): number {
  const partsA = parseVersion(a)
  const partsB = parseVersion(b)
  const maxLength = Math.max(partsA.length, partsB.length)

  for (let i = 0; i < maxLength; i++) {
    const numA = partsA[i] || 0
    const numB = partsB[i] || 0

    if (numA < numB) return -1
    if (numA > numB) return 1
  }

  return 0
}
