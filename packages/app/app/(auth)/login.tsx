/**
 * ログイン画面
 * - メールアドレスとパスワードでログイン
 * - モック認証を使用（本番APIができるまでの暫定）
 */

import FontAwesome from '@expo/vector-icons/FontAwesome'
import { router } from 'expo-router'
import { useState } from 'react'
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import Colors from '@/constants/Colors'
import { useAuth } from '@/lib/auth/AuthContext'
import { authFormStyles as styles } from '@/lib/auth/authFormStyles'
import {
  validateEmail as validateEmailFormat,
  validatePassword as validatePasswordFormat,
} from '@/lib/auth/validation'

const { palette } = Colors

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const validateEmail = (): boolean => {
    const error = validateEmailFormat(email)
    setEmailError(error)
    return error === null
  }

  const validatePassword = (): boolean => {
    const error = validatePasswordFormat(password)
    setPasswordError(error)
    return error === null
  }

  const handleLogin = async () => {
    if (isLoading) return

    const isEmailValid = validateEmail()
    const isPasswordValid = validatePassword()
    if (!isEmailValid || !isPasswordValid) {
      return
    }

    setLoginError(null)
    setIsLoading(true)
    try {
      const success = await login(email, password)
      if (!success) {
        setLoginError('ログインに失敗しました')
      }
      // 成功時は AuthContext の状態更新により自動的にホーム画面に切り替わる
    } catch {
      setLoginError('エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.replace('/(auth)')
  }

  const handleSignup = () => {
    router.push('/(auth)/signup')
  }

  const hasValidationError = emailError !== null || passwordError !== null
  const isButtonDisabled = isLoading || !email.trim() || !password.trim() || hasValidationError

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 44 }]}
        keyboardShouldPersistTaps="handled"
      >
          <View style={styles.characterContainer}>
            <Image
              source={require('../../assets/images/character/sitting.png')}
              style={styles.character}
              resizeMode="contain"
            />
            <Text style={styles.greeting}>おかえりにゃ！</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>メールアドレス</Text>
              <TextInput
                style={[styles.input, emailError && styles.inputError]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text)
                  if (emailError) setEmailError(null)
                }}
                onBlur={validateEmail}
                placeholder="例）komaneko@shogi.com"
                placeholderTextColor={palette.gray400}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="メールアドレス入力"
              />
              {emailError && <Text style={styles.fieldError}>{emailError}</Text>}
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>パスワード</Text>
              <TextInput
                style={[styles.input, passwordError && styles.inputError]}
                value={password}
                onChangeText={(text) => {
                  setPassword(text)
                  if (passwordError) setPasswordError(null)
                }}
                onBlur={validatePassword}
                placeholder="パスワードを入力"
                placeholderTextColor={palette.gray400}
                textContentType="password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="パスワード入力"
              />
              {passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}
            </View>

            {loginError && <Text style={styles.errorText}>{loginError}</Text>}

            <TouchableOpacity
              style={[styles.submitButton, isButtonDisabled && styles.submitButtonDisabled]}
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={isButtonDisabled}
              accessibilityRole="button"
              accessibilityLabel="ログイン"
              accessibilityState={{ disabled: isButtonDisabled }}
            >
              <Text style={styles.submitButtonText}>{isLoading ? 'ログイン中...' : 'ログイン'}</Text>
            </TouchableOpacity>

            <View style={styles.linkContainer}>
              <Text style={styles.linkText}>アカウントをお持ちでない方は</Text>
              <TouchableOpacity onPress={handleSignup} accessibilityRole="link">
                <Text style={styles.link}>新規登録</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={handleBack}
        accessibilityRole="button"
        accessibilityLabel="戻る"
      >
        <FontAwesome name="chevron-left" size={20} color={palette.black} />
      </TouchableOpacity>
    </View>
  )
}
