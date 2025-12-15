import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Image, ImageBackground, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme } from '@/components/useTheme'
import { WeeklyStreakProgress } from '@/components/WeeklyStreakProgress'
import Colors from '@/constants/Colors'
import { formatRecoveryTime } from '@/lib/hearts/heartsUtils'
import { useHearts } from '@/lib/hearts/useHearts'
import {
  calculateWeeklyProgress,
  getDemoToday,
  getStreakData,
  type WeeklyStreakInfo,
} from '@/lib/streak/streakStorage'

const characterSitting = require('@/assets/images/character/sitting.png')
const homeBackground = require('@/assets/images/background/home.jpg')

export default function HomeScreen() {
  const { colors } = useTheme()

  // ハートデータ（useHeartsフックで管理）
  const { hearts, isLoading: heartsLoading, error: heartsError } = useHearts()

  // ストリークデータ（AsyncStorageから読み込み）
  const [streakInfo, setStreakInfo] = useState<WeeklyStreakInfo>({
    weeklyProgress: [],
    todayIndex: 0,
    currentStreak: 0,
  })

  // 画面フォーカス時にストリークデータを再読み込み
  useFocusEffect(
    useCallback(() => {
      const loadStreak = async () => {
        const data = await getStreakData()
        const demoToday = await getDemoToday()
        const info = calculateWeeklyProgress(data, demoToday)
        setStreakInfo(info)
      }
      loadStreak()
    }, [])
  )

  return (
    <ImageBackground source={homeBackground} style={styles.backgroundImage} resizeMode="cover">
      <SafeAreaView style={styles.container} edges={[]}>
        {/* ストリーク（カレンダー式） */}
        <View style={[styles.streakCard, { backgroundColor: colors.card.background }]}>
          {/* ヘッダー */}
          <View style={styles.streakHeader}>
            <FontAwesome name="fire" size={16} color={colors.gamification.streak} />
            <Text style={[styles.streakDays, { color: colors.gamification.streak }]}>
              {streakInfo.currentStreak}日連続
            </Text>
          </View>

          {/* 週カレンダー */}
          <WeeklyStreakProgress
            weeklyProgress={streakInfo.weeklyProgress}
            todayIndex={streakInfo.todayIndex}
            compact={true}
          />
        </View>

        {/* 体力ゲージ */}
        <View style={[styles.heartsCard, { backgroundColor: colors.card.background }]}>
          <View style={styles.heartsLabelRow}>
            <FontAwesome name="heart" size={14} color={colors.gamification.heart} />
            {!heartsLoading && !heartsError && hearts && (
              hearts.isFull ? (
                <Text style={[styles.recoveryText, { color: colors.gamification.heart }]}>
                  体力MAX
                </Text>
              ) : (
                <Text style={[styles.recoveryText, { color: colors.text.secondary }]}>
                  次の回復まで {formatRecoveryTime(hearts.nextRecoveryMinutes)}
                </Text>
              )
            )}
          </View>
          {heartsLoading ? (
            <ActivityIndicator size="small" color={colors.gamification.heart} />
          ) : heartsError ? (
            <Text style={[styles.recoveryText, { color: colors.text.secondary }]}>
              {heartsError}
            </Text>
          ) : hearts && (
            <View style={[styles.gaugeBackground, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.gaugeFill,
                  {
                    backgroundColor: colors.gamification.heart,
                    width: `${(hearts.current / hearts.max) * 100}%`,
                  },
                ]}
              />
              {Array.from({ length: hearts.max - 1 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.gaugeTick,
                    {
                      left: `${((i + 1) / hearts.max) * 100}%`,
                      backgroundColor: colors.card.background,
                    },
                  ]}
                />
              ))}
            </View>
          )}
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
  // ストリークカード
  streakCard: {
    marginTop: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  streakDays: {
    fontSize: 14,
    fontWeight: 'bold',
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
    borderColor: Colors.palette.orange,
  },
  dialogText: {
    color: Colors.palette.gray800,
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
