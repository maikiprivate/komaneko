import { StyleSheet, View, Text, Image, ImageBackground } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import FontAwesome from '@expo/vector-icons/FontAwesome'

import { useTheme } from '@/components/useTheme'
import { mockHomeData } from '@/mocks/homeData'

const characterSitting = require('@/assets/images/character/sitting.png')
const homeBackground = require('@/assets/images/background/home.jpg')

// 分を「◯時間◯分」形式に変換
function formatRecoveryTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`
}

const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']

export default function HomeScreen() {
  const { colors } = useTheme()
  const { hearts, streak } = mockHomeData
  const heartsPercent = (hearts.current / hearts.max) * 100

  return (
    <ImageBackground
      source={homeBackground}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container} edges={[]}>
      {/* ストリーク（カレンダー式） */}
      <View style={[styles.streakCard, { backgroundColor: colors.card.background }]}>
        {/* ヘッダー */}
        <View style={styles.streakHeader}>
          <FontAwesome name="fire" size={16} color={colors.gamification.streak} />
          <Text style={[styles.streakDays, { color: colors.gamification.streak }]}>
            {streak.current}日連続
          </Text>
        </View>

        {/* 週カレンダー */}
        <View style={styles.weekCalendar}>
          {DAY_LABELS.map((day, index) => {
            const dayData = streak.weeklyProgress[index]
            const nextDayData = streak.weeklyProgress[index + 1]
            const isToday = index === streak.todayIndex
            const isFuture = index > streak.todayIndex
            const showConnector = dayData.completed && nextDayData?.completed
            return (
              <View key={day} style={styles.dayColumnWrapper}>
                <View style={styles.dayColumn}>
                  <Text style={[styles.dayLabel, { color: colors.text.secondary }]}>
                    {day}
                  </Text>
                  <View
                    style={[
                      styles.dayCircle,
                      dayData.completed
                        ? { backgroundColor: colors.gamification.streak }
                        : isFuture
                          ? { backgroundColor: colors.border }
                          : { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 2 },
                      isToday && { borderColor: colors.gamification.streak, borderWidth: 3 },
                    ]}
                  >
                    {dayData.completed ? (
                      <FontAwesome name="check" size={14} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.dateText,
                          { color: isToday ? colors.gamification.streak : colors.text.secondary },
                        ]}
                      >
                        {dayData.date}
                      </Text>
                    )}
                  </View>
                </View>
                {index < DAY_LABELS.length - 1 && (
                  <View
                    style={[
                      styles.streakConnector,
                      { backgroundColor: showConnector ? colors.gamification.streak : 'transparent' },
                    ]}
                  />
                )}
              </View>
            )
          })}
        </View>
      </View>

      {/* 体力ゲージ */}
      <View style={[styles.heartsCard, { backgroundColor: colors.card.background }]}>
        <View style={styles.heartsLabelRow}>
          <FontAwesome name="heart" size={14} color={colors.gamification.heart} />
          {hearts.current < hearts.max && (
            <Text style={[styles.recoveryText, { color: colors.text.secondary }]}>
              回復まであと {formatRecoveryTime(hearts.recovery.nextRecoveryMinutes)}
            </Text>
          )}
        </View>
        <View style={[styles.gaugeBackground, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.gaugeFill,
              { backgroundColor: colors.gamification.heart, width: `${heartsPercent}%` },
            ]}
          />
          {Array.from({ length: hearts.max - 1 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.gaugeTick,
                { left: `${((i + 1) / hearts.max) * 100}%`, backgroundColor: colors.card.background },
              ]}
            />
          ))}
        </View>
      </View>

      {/* キャラクター表示 */}
      <View style={styles.characterArea}>
        <Image source={characterSitting} style={styles.characterImage} resizeMode="contain" />
        {/* ゲーム風セリフボックス */}
        <View style={styles.dialogBox}>
          <Text style={styles.dialogText}>
            一日お疲れ様にゃ！{'\n'}今日の締めくくりに詰将棋はいかがかにゃ？
          </Text>
        </View>
      </View>

      </SafeAreaView>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // 体力ゲージカード
  heartsCard: {
    marginTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  heartsLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gaugeBackground: {
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    position: 'relative',
  },
  gaugeFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 7,
  },
  gaugeTick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
  },
  recoveryText: {
    fontSize: 11,
  },
  // ストリークカード（カレンダー式）
  streakCard: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  streakDays: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  weekCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dayColumnWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
  },
  streakConnector: {
    flex: 1,
    height: 6,
    marginBottom: 13,
    marginHorizontal: -4,
    borderRadius: 3,
  },
  dayLabel: {
    fontSize: 11,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // キャラクター
  characterArea: {
    alignItems: 'center',
    marginTop: 24,
  },
  dialogBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: -40,
    marginHorizontal: 16,
    borderWidth: 2,
    borderColor: '#FF8C42',
  },
  dialogText: {
    color: '#2D3436',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  characterImage: {
    width: 320,
    height: 320,
  },
})
