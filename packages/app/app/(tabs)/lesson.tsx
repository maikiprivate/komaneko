/**
 * コース一覧画面（駒塾タブ）
 */

import FontAwesome from '@expo/vector-icons/FontAwesome'
import { router } from 'expo-router'
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme } from '@/components/useTheme'
import { MOCK_COURSES, type Course } from '@/mocks/lessonData'

const textbookIcon = require('@/assets/images/icons/textbook.png')

export default function LessonScreen() {
  const { colors, palette } = useTheme()

  const handleCoursePress = (course: Course) => {
    if (course.status === 'locked') return
    router.push(`/lesson/${course.id}`)
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.secondary }]}
      edges={[]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {MOCK_COURSES.map((course) => (
          <TouchableOpacity
            key={course.id}
            style={[
              styles.courseCard,
              { backgroundColor: colors.card.background },
              course.status === 'locked' && styles.lockedCard,
            ]}
            onPress={() => handleCoursePress(course)}
            activeOpacity={course.status === 'locked' ? 1 : 0.7}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: course.status === 'locked'
                      ? colors.border
                      : palette.orange,
                  },
                ]}
              >
                <Image
                  source={textbookIcon}
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.cardTitleContainer}>
                <Text
                  style={[
                    styles.courseTitle,
                    { color: course.status === 'locked' ? colors.text.secondary : colors.text.primary },
                  ]}
                >
                  {course.title}
                </Text>
                <Text style={[styles.courseDescription, { color: colors.text.secondary }]}>
                  {course.description}
                </Text>
                <Text style={[styles.sectionCount, { color: colors.text.secondary }]}>
                  {course.sections.length > 0 ? `${course.sections.length}セクション` : '準備中'}
                </Text>
              </View>
              {course.status === 'locked' && (
                <FontAwesome name="lock" size={20} color={colors.text.secondary} />
              )}
            </View>

            {course.status !== 'locked' && (
              <View style={styles.progressSection}>
                <View style={[styles.progressBar, { backgroundColor: colors.background.secondary }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${course.progress}%`,
                        backgroundColor: course.progress === 100 ? palette.green : palette.orange,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.text.secondary }]}>
                  {course.progress}%
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  courseCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  lockedCard: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconImage: {
    width: 24,
    height: 24,
  },
  cardTitleContainer: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  courseDescription: {
    fontSize: 13,
  },
  sectionCount: {
    fontSize: 12,
    marginTop: 4,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },
})
