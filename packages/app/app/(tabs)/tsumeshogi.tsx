import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme } from '@/components/useTheme'
import {
  getTsumeshogiList,
  type TsumeshogiProblem,
  type TsumeshogiStatus,
} from '@/lib/api/tsumeshogi'

/** 手数のオプション */
const MOVES_OPTIONS = [3, 5, 7] as const
type MovesOption = (typeof MOVES_OPTIONS)[number]

/** 手数の表示名 */
const MOVES_LABELS: Record<MovesOption, string> = {
  3: '3手詰め',
  5: '5手詰め',
  7: '7手詰め',
}

type StatusFilter = TsumeshogiStatus | 'all'

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

/** 手数ごとのキャッシュ構造（将来のページネーション対応） */
interface ProblemsCache {
  problems: TsumeshogiProblem[]
  hasMore: boolean // まだ読み込めるデータがあるか
  // 将来追加: nextCursor?: string
}

export default function TsumeshogiScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const [selectedMoves, setSelectedMoves] = useState<MovesOption>(3)
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all')

  // 手数ごとのキャッシュ
  const [cache, setCache] = useState<Partial<Record<MovesOption, ProblemsCache>>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 選択中の手数のデータ
  const currentCache = cache[selectedMoves]
  const problems = currentCache?.problems ?? []

  useEffect(() => {
    // キャッシュがあれば再取得しない
    if (cache[selectedMoves]) return

    let cancelled = false
    setIsLoading(true)
    setError(null)

    getTsumeshogiList(selectedMoves)
      .then((data) => {
        if (cancelled) return
        setCache((prev) => ({
          ...prev,
          [selectedMoves]: {
            problems: data,
            hasMore: false, // TODO: APIがページネーション対応したらtrue
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cacheはuseEffect内で更新するため依存配列から除外
  }, [selectedMoves])

  // TODO: 将来のページネーション用
  // const loadMore = useCallback(() => {
  //   if (!currentCache?.hasMore || isLoading) return
  //   // 追加読み込み処理
  // }, [currentCache, isLoading])

  // エラー時のリトライ
  const handleRetry = useCallback(() => {
    setError(null)
    // キャッシュをクリアして再取得
    setCache((prev) => {
      const newCache = { ...prev }
      delete newCache[selectedMoves]
      return newCache
    })
  }, [selectedMoves])

  // ステータスフィルタ（元のインデックスを保持）
  const problemsWithIndex = problems.map((p, i) => ({ ...p, originalIndex: i + 1 }))
  const filteredProblems =
    selectedStatus === 'all'
      ? problemsWithIndex
      : problemsWithIndex.filter((p) => p.status === selectedStatus)

  const handleProblemPress = (problem: TsumeshogiProblem) => {
    // 同手数の問題データを取得（次の問題遷移用）
    const problemsData = currentCache?.problems ?? []
    router.push({
      pathname: `/tsumeshogi/${problem.id}`,
      params: {
        sfen: problem.sfen,
        moveCount: String(problem.moveCount),
        // ID配列とSFEN配列を渡す（次の問題遷移で再利用）
        problemIds: JSON.stringify(problemsData.map((p) => p.id)),
        problemSfens: JSON.stringify(problemsData.map((p) => p.sfen)),
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
      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {isLoading && !currentCache ? (
          <ActivityIndicator style={styles.loader} color={colors.button.primary} />
        ) : error && !currentCache ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.text.secondary }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.button.primary }]}
              onPress={handleRetry}
            >
              <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>再試行</Text>
            </TouchableOpacity>
          </View>
        ) : filteredProblems.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
            該当する問題がありません
          </Text>
        ) : (
          filteredProblems.map((problem) => (
            <TouchableOpacity
              key={problem.id}
              style={[styles.card, { backgroundColor: colors.card.background }]}
              onPress={() => handleProblemPress(problem)}
              activeOpacity={0.7}
            >
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                問題 {problem.originalIndex}
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
          ))
        )}
      </ScrollView>
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
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  loader: {
    marginTop: 24,
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: 24,
    gap: 16,
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
