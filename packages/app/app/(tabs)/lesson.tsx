import { router } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme } from '@/components/useTheme'

export default function LessonScreen() {
  const { colors, palette } = useTheme()

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={[]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text.primary }]}>駒塾</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          将棋の基本を学ぼう
        </Text>

        {/* コース一覧（仮） */}
        <View style={styles.courseList}>
          <TouchableOpacity
            style={[styles.courseCard, { backgroundColor: colors.background.secondary, borderColor: colors.border }]}
            onPress={() => router.push('/lesson/piece-movement/fu-basics')}
          >
            <Text style={[styles.courseTitle, { color: colors.text.primary }]}>
              駒の動かし方
            </Text>
            <Text style={[styles.courseDescription, { color: colors.text.secondary }]}>
              基本の駒の動きを学ぼう
            </Text>
            <View style={[styles.progressBar, { backgroundColor: colors.background.primary }]}>
              <View style={[styles.progressFill, { width: '0%', backgroundColor: palette.orange }]} />
            </View>
          </TouchableOpacity>

          <View
            style={[styles.courseCard, styles.lockedCard, { backgroundColor: colors.background.secondary, borderColor: colors.border }]}
          >
            <Text style={[styles.courseTitle, { color: colors.text.secondary }]}>
              基本手筋
            </Text>
            <Text style={[styles.courseDescription, { color: colors.text.secondary }]}>
              準備中
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  courseList: {
    gap: 16,
  },
  courseCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  lockedCard: {
    opacity: 0.5,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  courseDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
})
