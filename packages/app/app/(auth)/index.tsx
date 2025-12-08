/**
 * ウェルカム画面
 * - 未認証ユーザーに表示される最初の画面
 * - 新規登録とログインへの導線を提供
 */

import { router } from 'expo-router'
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets()

  const handleSignup = () => {
    router.push('/(auth)/signup')
  }

  const handleLogin = () => {
    router.push('/(auth)/login')
  }

  return (
    <ImageBackground
      source={require('../../assets/images/splash.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSignup}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="新規登録"
        >
          <Text style={styles.primaryButtonText}>新規登録</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleLogin}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="ログイン"
        >
          <Text style={styles.secondaryButtonText}>ログイン</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#F5E6D3',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#FF8C42',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF8C42',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FF8C42',
    fontSize: 17,
    fontWeight: '700',
  },
})
