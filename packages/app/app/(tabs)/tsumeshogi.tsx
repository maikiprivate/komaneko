import { useState } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme } from '@/components/useTheme'
import {
  MOCK_TSUMESHOGI_PROBLEMS,
  MOVES_OPTIONS,
  MOVES_LABELS,
  filterByMoves,
  type MovesOption,
  type TsumeshogiProblem,
  type ProblemStatus,
} from '@/mocks/tsumeshogiData'

/** ステータスの表示名 */
const STATUS_LABELS: Record<ProblemStatus, string> = {
  unsolved: '未解答',
  in_progress: '挑戦中',
  solved: '解答済み',
}

type StatusFilter = ProblemStatus | 'all'

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'unsolved', label: '未解答' },
  { value: 'in_progress', label: '挑戦中' },
  { value: 'solved', label: '解答済み' },
  { value: 'all', label: 'すべて' },
]

/** ステータスに応じた背景色を取得 */
function getStatusBackgroundColor(status: ProblemStatus, colors: ReturnType<typeof useTheme>['colors']) {
  switch (status) {
    case 'solved':
      return colors.gamification.success
    case 'in_progress':
      return colors.gamification.streak
    default:
      return colors.border // グレー
  }
}

export default function TsumeshogiScreen() {
  const { colors } = useTheme()
  const [selectedMoves, setSelectedMoves] = useState<MovesOption>(3)
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('unsolved')

  // フィルタ
  const filteredByMoves = filterByMoves(MOCK_TSUMESHOGI_PROBLEMS, selectedMoves)
  const filteredProblems = selectedStatus === 'all'
    ? filteredByMoves
    : filteredByMoves.filter((p) => p.status === selectedStatus)

  const handleProblemPress = (problem: TsumeshogiProblem) => {
    // TODO: 問題画面へ遷移
    console.log('Selected problem:', problem.id)
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]} edges={[]}>
      {/* 手数タブ */}
      <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
        {MOVES_OPTIONS.map((moves) => (
          <TouchableOpacity
            key={moves}
            style={[
              styles.tab,
              selectedMoves === moves && [styles.tabSelected, { borderBottomColor: colors.button.primary }],
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
        {filteredProblems.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
            該当する問題がありません
          </Text>
        ) : (
          filteredProblems.map((problem, index) => (
            <TouchableOpacity
              key={problem.id}
              style={[styles.card, { backgroundColor: colors.card.background }]}
              onPress={() => handleProblemPress(problem)}
            >
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                問題 {index + 1}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusBackgroundColor(problem.status, colors) }]}>
                <Text style={[styles.statusBadgeText, { color: colors.text.inverse }]}>{STATUS_LABELS[problem.status]}</Text>
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
