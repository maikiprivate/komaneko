/**
 * 設定画面モーダル
 * - 下からスライドインで全画面表示
 * - ログアウト、退会機能を提供
 */

import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useEffect, useState } from 'react'
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import Colors from '@/constants/Colors'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  clearDemoToday,
  resetStreakData,
  setDemoStreakData,
} from '@/lib/streak/streakStorage'

const { palette } = Colors

interface SettingsModalProps {
  visible: boolean
  onClose: () => void
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const insets = useSafeAreaInsets()
  const { user, logout } = useAuth()
  // ログアウト/退会時はアニメーションを無効にして白い画面が見えるのを防ぐ
  const [disableAnimation, setDisableAnimation] = useState(false)

  // モーダルが閉じられたときにアニメーション状態をリセット
  useEffect(() => {
    if (!visible) {
      setDisableAnimation(false)
    }
  }, [visible])

  const handleLogout = async () => {
    // アニメーションを無効にしてからログアウト
    setDisableAnimation(true)
    try {
      await logout()
    } catch (error) {
      console.error('[SettingsModal] Logout failed:', error)
      setDisableAnimation(false)
      Alert.alert('エラー', 'ログアウトに失敗しました。もう一度お試しください。')
    }
  }

  const handleDeleteAccount = () => {
    // 退会機能は未実装のため準備中メッセージを表示
    Alert.alert('準備中', '退会機能は現在準備中です。')
  }

  // 開発用: ストリークリセット
  const handleResetStreak = async () => {
    try {
      await resetStreakData()
      await clearDemoToday()
      Alert.alert('リセット完了', 'ストリークデータをリセットしました')
    } catch (error) {
      console.error('[SettingsModal] Reset streak failed:', error)
      Alert.alert('エラー', 'ストリークのリセットに失敗しました')
    }
  }

  // 開発用: デモデータ設定
  const handleSetDemoData = async () => {
    try {
      await setDemoStreakData()
      Alert.alert('デモデータ設定完了', '仮の今日を金曜日に設定し、月曜と木曜に学習したデータを設定しました')
    } catch (error) {
      console.error('[SettingsModal] Set demo data failed:', error)
      Alert.alert('エラー', 'デモデータの設定に失敗しました')
    }
  }

  return (
    <Modal
      visible={visible}
      animationType={disableAnimation ? 'none' : 'slide'}
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* ステータスバーエリア（オレンジ） */}
        <View style={[styles.statusBarArea, { height: insets.top }]} />

        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="閉じる"
          >
            <FontAwesome name="times" size={22} color={palette.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>設定</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* 会員情報セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>会員情報</Text>
            {user?.username && (
              <View style={styles.listItem}>
                <Text style={styles.listItemLabel}>ユーザー名</Text>
                <Text style={styles.listItemValue}>{user.username}</Text>
              </View>
            )}
            {user?.email && (
              <View style={styles.listItem}>
                <Text style={styles.listItemLabel}>メールアドレス</Text>
                <Text style={styles.listItemValue}>{user.email}</Text>
              </View>
            )}
          </View>

          {/* セクション区切り */}
          <View style={styles.sectionSpacer} />

          {/* アカウントセクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>アカウント</Text>
            <TouchableOpacity
              style={styles.listItem}
              onPress={handleLogout}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="ログアウト"
            >
              <Text style={styles.listItemText}>ログアウト</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.listItem}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="退会"
            >
              <Text style={styles.linkText}>退会</Text>
            </TouchableOpacity>
          </View>

          {/* 開発用セクション（DEVモードのみ） */}
          {__DEV__ && (
            <>
              <View style={styles.sectionSpacer} />
              <View style={styles.sectionLast}>
                <Text style={styles.sectionTitle}>開発用</Text>
                <TouchableOpacity
                  style={styles.listItem}
                  onPress={handleResetStreak}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="ストリークリセット"
                >
                  <Text style={styles.listItemText}>ストリークリセット</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.listItem}
                  onPress={handleSetDemoData}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="デモデータ設定"
                >
                  <Text style={styles.listItemText}>デモデータ設定</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* 開発用セクションがない場合、アカウントセクションを最後まで伸ばす */}
          {!__DEV__ && <View style={styles.sectionLastSpacer} />}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.white,
  },
  statusBarArea: {
    backgroundColor: palette.orange,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: palette.orange,
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.white,
  },
  headerRight: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  section: {
    backgroundColor: palette.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionLast: {
    backgroundColor: palette.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: palette.gray600,
    marginBottom: 8,
  },
  sectionSpacer: {
    height: 8,
    backgroundColor: palette.gray100,
  },
  sectionLastSpacer: {
    flex: 1,
    backgroundColor: palette.white,
  },
  listItem: {
    paddingVertical: 14,
  },
  listItemLabel: {
    fontSize: 13,
    color: palette.gray600,
    marginBottom: 4,
  },
  listItemValue: {
    fontSize: 18,
    color: palette.gray800,
  },
  listItemText: {
    fontSize: 18,
    color: palette.gray800,
  },
  linkText: {
    fontSize: 15,
    color: palette.gray600,
    textDecorationLine: 'underline',
  },
})
