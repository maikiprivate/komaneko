import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Alert, Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme } from '@/components/useTheme'
import { WeeklyStreakProgress } from '@/components/WeeklyStreakProgress'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  calculateWeeklyProgress,
  clearDemoToday,
  getDemoToday,
  getStreakData,
  resetStreakData,
  setDemoStreakData,
  type WeeklyStreakInfo,
} from '@/lib/streak/streakStorage'
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

export default function HomeScreen() {
  const { colors, palette } = useTheme()
  const { logout } = useAuth()
  const { hearts } = mockHomeData
  const heartsPercent = (hearts.current / hearts.max) * 100

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

  // 開発用: ストリークリセット
  const handleResetStreak = async () => {
    await resetStreakData()
    await clearDemoToday() // デモ用の仮の今日もクリア
    // リセット後に再読み込み
    const data = await getStreakData()
    const info = calculateWeeklyProgress(data)
    setStreakInfo(info)
    Alert.alert('リセット完了', 'ストリークデータをリセットしました')
  }

  // 開発用: デモデータ設定
  const handleSetDemoData = async () => {
    await setDemoStreakData()
    // 設定後に再読み込み（デモ用の仮の今日を使用）
    const data = await getStreakData()
    const demoToday = await getDemoToday()
    const info = calculateWeeklyProgress(data, demoToday)
    setStreakInfo(info)
    Alert.alert('デモデータ設定完了', '仮の今日を金曜日に設定し、月曜と木曜に学習したデータを設定しました')
  }

  // 開発用: ログアウト（認証リセット）
  const handleLogout = async () => {
    await logout()
    // AuthContext の状態更新により自動的にウェルカム画面に切り替わる
  }

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
                  {
                    left: `${((i + 1) / hearts.max) * 100}%`,
                    backgroundColor: colors.card.background,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* 開発用: テストボタン */}
        {__DEV__ && (
          <View style={styles.testButtonContainer}>
            <View style={styles.testButtonRow}>
              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: palette.red }]}
                onPress={handleResetStreak}
              >
                <FontAwesome name="refresh" size={14} color={palette.white} />
                <Text style={[styles.testButtonText, { color: palette.white }]}>
                  リセット
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: palette.orange }]}
                onPress={handleSetDemoData}
              >
                <FontAwesome name="database" size={14} color={palette.white} />
                <Text style={[styles.testButtonText, { color: palette.white }]}>
                  デモデータ
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: palette.gray600 }]}
              onPress={handleLogout}
            >
              <FontAwesome name="sign-out" size={14} color={palette.white} />
              <Text style={[styles.testButtonText, { color: palette.white }]}>
                ログアウト
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
  // 開発用スタイル
  testButtonContainer: {
    gap: 8,
    marginTop: 12,
  },
  testButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
})
