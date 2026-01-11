/**
 * 強制アップデートモーダル
 *
 * アプリが最小バージョン未満の場合に表示され、
 * ストアへの遷移を促す。閉じることはできない。
 */

import { useEffect, useState } from 'react'
import { Alert, Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { isUpdateRequired, subscribeToUpdateStatus } from '../lib/version/updateStore'
import { getAppVersion } from '../lib/version/versionUtils'

// ストアURL（リリース時に実際のURLに変更）
const APP_STORE_URL = 'https://apps.apple.com/app/id000000000' // TODO: 実際のApp Store URLに変更
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.komaneko.app'

export function ForceUpdateModal() {
  const [visible, setVisible] = useState(isUpdateRequired())

  useEffect(() => {
    const unsubscribe = subscribeToUpdateStatus((required) => {
      setVisible(required)
    })
    return unsubscribe
  }, [])

  const handleUpdate = async () => {
    const storeUrl = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL
    try {
      const supported = await Linking.canOpenURL(storeUrl)
      if (supported) {
        await Linking.openURL(storeUrl)
      } else {
        Alert.alert('エラー', 'ストアを開けませんでした。手動でアプリストアを確認してください。')
      }
    } catch {
      Alert.alert('エラー', 'ストアを開けませんでした。手動でアプリストアを確認してください。')
    }
  }

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        // Androidのバックボタンで閉じさせない
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>アップデートが必要です</Text>
          <Text style={styles.message}>
            新しいバージョンが利用可能です。{'\n'}
            アプリを更新してください。
          </Text>
          <Text style={styles.version}>現在のバージョン: {getAppVersion()}</Text>
          <TouchableOpacity style={styles.button} onPress={handleUpdate} activeOpacity={0.8}>
            <Text style={styles.buttonText}>ストアを開く</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  version: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#F97316',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
})
