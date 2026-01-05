import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme } from '@/components/useTheme'
import {
  type StatusFilter,
  type TsumeshogiProblem,
  type TsumeshogiStatus,
  getTsumeshogiList,
} from '@/lib/api/tsumeshogi'
import { consumeStatusUpdates } from '@/lib/tsumeshogi/statusCache'

/** 手数のオプション */
const MOVES_OPTIONS = [3, 5, 7] as const
type MovesOption = (typeof MOVES_OPTIONS)[number]

/** 手数の表示名 */
const MOVES_LABELS: Record<MovesOption, string> = {
  3: '3手詰め',
  5: '5手詰め',
  7: '7手詰め',
}

/** ステータスの表示名 */
const STATUS_LABELS: Record<TsumeshogiStatus, string> = {
  unsolved: '未解答',
  in_progress: '挑戦中',
  solved: '解答済み',
}

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'unsolved', label: STATUS_LABELS.unsolved },
  { value: 'in_progress', label: STATUS_LABELS.in_progress },
  { value: 'solved', label: STATUS_LABELS.solved },
  { value: 'all', label: 'すべて' },
]

/** ステータスに応じた背景色を取得 */
function getStatusBackgroundColor(
  status: TsumeshogiStatus,
  colors: ReturnType<typeof useTheme>['colors'],
) {
  switch (status) {
    case 'solved':
      return colors.gamification.success
    case 'in_progress':
      return colors.gamification.streak
    default:
      return colors.border // グレー
  }
}

/** キャッシュ構造（カーソルベースページネーション対応） */
interface ProblemsCache {
  problems: TsumeshogiProblem[]
  hasMore: boolean // まだ読み込めるデータがあるか
  /** 読み込んだ最後の問題番号。次回読み込み時のカーソル */
  lastProblemNumber: number
}

/** キャッシュキー: {moveCount}-{statusFilter} */
type CacheKey = `${MovesOption}-${StatusFilter}`
const getCacheKey = (moves: MovesOption, status: StatusFilter): CacheKey => `${moves}-${status}`

/** 無限スクロールの追加読み込みのデバウンス間隔（ミリ秒） */
const LOAD_MORE_DEBOUNCE_MS = 500

export default function TsumeshogiScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const [selectedMoves, setSelectedMoves] = useState<MovesOption>(3)
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all')

  // {moveCount}-{status}ごとのキャッシュ
  const [cache, setCache] = useState<Partial<Record<CacheKey, ProblemsCache>>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastLoadMoreTimeRef = useRef<number>(0)

  // 選択中のキャッシュキー
  const cacheKey = getCacheKey(selectedMoves, selectedStatus)
  const currentCache = cache[cacheKey]
  const problems = currentCache?.problems ?? []

  useEffect(() => {
    // キャッシュがあれば再取得しない
    if (currentCache) return

    let cancelled = false
    setIsLoading(true)
    setError(null)

    getTsumeshogiList({ moveCount: selectedMoves, statusFilter: selectedStatus })
      .then((response) => {
        if (cancelled) return
        const lastNum = response.problems.length > 0
          ? response.problems[response.problems.length - 1].problemNumber
          : 0
        setCache((prev) => ({
          ...prev,
          [cacheKey]: {
            problems: response.problems,
            hasMore: response.pagination.hasMore,
            lastProblemNumber: lastNum,
          },
        }))
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'データの取得に失敗しました')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [cacheKey, currentCache, selectedMoves, selectedStatus])

  // 画面フォーカス時にステータス更新をキャッシュに反映
  useFocusEffect(
    useCallback(() => {
      const applyStatusUpdates = async () => {
        const updates = await consumeStatusUpdates()
        if (updates.length === 0) return

        // ステータス更新をキャッシュ内の問題に直接反映
        // （キャッシュをクリアせず、スクロール位置を維持する）
        setCache((prev) => {
          const newCache = { ...prev }

          // まず「すべて」キャッシュから更新対象の問題データを収集
          // （新しいフィルタキャッシュに追加するため）
          const problemDataMap = new Map<string, TsumeshogiProblem>()
          for (const entry of Object.values(newCache)) {
            if (!entry) continue
            for (const problem of entry.problems) {
              if (!problemDataMap.has(problem.id)) {
                problemDataMap.set(problem.id, problem)
              }
            }
          }

          // 各キャッシュエントリを更新
          for (const [key, entry] of Object.entries(newCache)) {
            if (!entry) continue

            // キャッシュキーからmoveCountとステータスフィルタを抽出
            const [moveCountStr, statusFilter] = key.split('-') as [string, StatusFilter]
            const moveCount = Number(moveCountStr)

            let hasChanges = false

            // 既存問題のステータス更新とフィルタ除外
            let updatedProblems = entry.problems
              .map((problem) => {
                const update = updates.find((u) => u.id === problem.id)
                if (update && problem.status !== update.status) {
                  hasChanges = true
                  return { ...problem, status: update.status }
                }
                return problem
              })
              .filter((problem) => {
                // 「すべて」フィルタの場合は除外しない
                if (statusFilter === 'all') return true
                // フィルタ条件に合わなくなった問題を除外
                const matches = problem.status === statusFilter
                if (!matches) hasChanges = true
                return matches
              })

            // 新しくフィルタ条件に合う問題を追加
            // （読み込み済み範囲内の問題のみ）
            if (statusFilter !== 'all') {
              for (const update of updates) {
                // このフィルタに合うステータスかチェック
                if (update.status !== statusFilter) continue

                // 問題データを取得
                const problemData = problemDataMap.get(update.id)
                if (!problemData) continue

                // 手数が一致するかチェック
                if (problemData.moveCount !== moveCount) continue

                // 既にリストに含まれているかチェック
                if (updatedProblems.some((p) => p.id === update.id)) continue

                // 読み込み済み範囲内かチェック（lastProblemNumber以下）
                if (problemData.problemNumber > entry.lastProblemNumber) continue

                // 追加
                hasChanges = true
                updatedProblems.push({ ...problemData, status: update.status })
              }

              // 問題番号でソート
              if (hasChanges) {
                updatedProblems = updatedProblems.sort((a, b) => a.problemNumber - b.problemNumber)
              }
            }

            if (hasChanges) {
              newCache[key as CacheKey] = {
                ...entry,
                problems: updatedProblems,
              }
            }
          }

          return newCache
        })
      }
      applyStatusUpdates()
    }, []),
  )

  // 追加読み込み（無限スクロール）
  const loadMore = useCallback(() => {
    // 読み込み中、データなし、追加データなしの場合はスキップ
    if (!currentCache?.hasMore || isLoading || isLoadingMore) return

    // デバウンス: 連続呼び出しを防ぐ
    const now = Date.now()
    if (now - lastLoadMoreTimeRef.current < LOAD_MORE_DEBOUNCE_MS) return
    lastLoadMoreTimeRef.current = now

    // 開始時のキャッシュキーを保持（クロージャ問題対策）
    const targetCacheKey = cacheKey
    const targetMoves = selectedMoves
    const targetStatus = selectedStatus
    const targetAfterNumber = currentCache.lastProblemNumber

    setIsLoadingMore(true)
    setLoadMoreError(false)

    getTsumeshogiList({
      moveCount: targetMoves,
      statusFilter: targetStatus,
      afterNumber: targetAfterNumber,
    })
      .then((response) => {
        setCache((prev) => {
          const existing = prev[targetCacheKey]
          if (!existing) return prev
          const newLastNum = response.problems.length > 0
            ? response.problems[response.problems.length - 1].problemNumber
            : existing.lastProblemNumber
          return {
            ...prev,
            [targetCacheKey]: {
              problems: [...existing.problems, ...response.problems],
              hasMore: response.pagination.hasMore,
              lastProblemNumber: newLastNum,
            },
          }
        })
      })
      .catch((err) => {
        console.error('[loadMore] Failed:', err.message)
        setLoadMoreError(true)
      })
      .finally(() => {
        setIsLoadingMore(false)
      })
  }, [cacheKey, currentCache, isLoading, isLoadingMore, selectedMoves, selectedStatus])

  // エラー時のリトライ
  const handleRetry = useCallback(() => {
    setError(null)
    // キャッシュをクリアして再取得
    setCache((prev) => {
      const newCache = { ...prev }
      delete newCache[cacheKey]
      return newCache
    })
  }, [cacheKey])

  const handleProblemPress = (problem: TsumeshogiProblem) => {
    // 同手数の問題データを取得（次の問題遷移用）
    const problemsData = currentCache?.problems ?? []
    router.push({
      pathname: '/tsumeshogi/[id]',
      params: {
        id: problem.id,
        sfen: problem.sfen,
        moveCount: String(problem.moveCount),
        problemNumber: String(problem.problemNumber),
        status: problem.status,
        // ID配列とSFEN配列とステータス配列と問題番号を渡す（次の問題遷移で再利用）
        problemIds: JSON.stringify(problemsData.map((p) => p.id)),
        problemSfens: JSON.stringify(problemsData.map((p) => p.sfen)),
        problemStatuses: JSON.stringify(problemsData.map((p) => p.status)),
        problemNumbers: JSON.stringify(problemsData.map((p) => p.problemNumber)),
      },
    })
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.secondary }]}
      edges={[]}
    >
      {/* 手数タブ */}
      <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
        {MOVES_OPTIONS.map((moves) => (
          <TouchableOpacity
            key={moves}
            style={[
              styles.tab,
              selectedMoves === moves && [
                styles.tabSelected,
                { borderBottomColor: colors.button.primary },
              ],
            ]}
            onPress={() => setSelectedMoves(moves)}
          >
            <Text
              style={[
                styles.tabText,
                { color: selectedMoves === moves ? colors.button.primary : colors.text.secondary },
              ]}
            >
              {MOVES_LABELS[moves]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ステータスフィルタボタン */}
      <View style={styles.statusFilterContainer}>
        {STATUS_FILTER_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.statusButton,
              selectedStatus === option.value
                ? { backgroundColor: colors.button.primary, borderColor: colors.button.primary }
                : { backgroundColor: colors.card.background, borderColor: colors.border },
            ]}
            onPress={() => setSelectedStatus(option.value)}
          >
            <Text
              style={[
                styles.statusButtonText,
                { color: selectedStatus === option.value ? '#FFFFFF' : colors.text.secondary },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 問題リスト */}
      {isLoading && !currentCache ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.button.primary} />
        </View>
      ) : error && !currentCache ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: colors.text.secondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.button.primary }]}
            onPress={handleRetry}
          >
            <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>再試行</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          key={cacheKey}
          data={problems}
          keyExtractor={(item) => item.id}
          renderItem={({ item: problem }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card.background }]}
              onPress={() => handleProblemPress(problem)}
              activeOpacity={0.7}
            >
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                問題 {problem.problemNumber}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusBackgroundColor(problem.status, colors) },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: colors.text.inverse }]}>
                  {STATUS_LABELS[problem.status]}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              該当する問題がありません
            </Text>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator
                style={styles.loadingMore}
                size="small"
                color={colors.button.primary}
              />
            ) : loadMoreError ? (
              <TouchableOpacity style={styles.loadMoreRetry} onPress={loadMore}>
                <Text style={[styles.loadMoreRetryText, { color: colors.text.secondary }]}>
                  読み込みに失敗しました。タップして再試行
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabSelected: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingMore: {
    paddingVertical: 16,
  },
  loadMoreRetry: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreRetryText: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
})
