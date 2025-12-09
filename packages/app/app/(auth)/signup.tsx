/**
 * 新規登録画面
 * - メールアドレスとパスワードで新規登録
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
  MAX_USERNAME_LENGTH,
  validateEmail as validateEmailFormat,
  validatePassword as validatePasswordFormat,
  validateUsername as validateUsernameFormat,
} from '@/lib/auth/validation'

const { palette } = Colors

export default function SignupScreen() {
  const insets = useSafeAreaInsets()
  const { signup } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)

  const validateUsername = (): boolean => {
    const error = validateUsernameFormat(username)
    setUsernameError(error)
    return error === null
  }

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

  const validateConfirmPassword = (): boolean => {
    if (!confirmPassword) {
      setConfirmPasswordError('パスワードを再入力してください')
      return false
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('パスワードが一致しません')
      return false
    }
    setConfirmPasswordError(null)
    return true
  }

  const handleSignup = async () => {
    if (isLoading) return

    const isUsernameValid = validateUsername()
    const isEmailValid = validateEmail()
    const isPasswordValid = validatePassword()
    const isConfirmPasswordValid = validateConfirmPassword()
    if (!isUsernameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return
    }

    setApiError(null)
    setIsLoading(true)
    try {
      const success = await signup({ username, email, password })
      if (!success) {
        setApiError('登録に失敗しました')
      }
      // 成功時は AuthContext の状態更新により自動的にホーム画面に切り替わる
    } catch {
      setApiError('エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.replace('/(auth)')
  }

  const handleLogin = () => {
    router.push('/(auth)/login')
  }

  const hasValidationError =
    usernameError !== null ||
    emailError !== null ||
    passwordError !== null ||
    confirmPasswordError !== null
  const isButtonDisabled =
    isLoading ||
    !username.trim() ||
    !email.trim() ||
    !password.trim() ||
    !confirmPassword.trim() ||
    hasValidationError

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
            <Text style={styles.greeting}>駒猫へようこそにゃ！</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>ユーザー名</Text>
              <TextInput
                style={[styles.input, usernameError && styles.inputError]}
                value={username}
                onChangeText={(text) => {
                  setUsername(text)
                  if (usernameError) setUsernameError(null)
                }}
                onBlur={validateUsername}
                placeholder="例）将棋みけねこ"
                placeholderTextColor={palette.gray400}
                textContentType="username"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={MAX_USERNAME_LENGTH}
                accessibilityLabel="ユーザー名入力"
              />
              {usernameError && <Text style={styles.fieldError}>{usernameError}</Text>}
            </View>

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
                  if (confirmPasswordError) setConfirmPasswordError(null)
                }}
                onBlur={validatePassword}
                placeholder="パスワードを入力"
                placeholderTextColor={palette.gray400}
                textContentType="newPassword"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="パスワード入力"
              />
              {passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>パスワード（確認）</Text>
              <TextInput
                style={[styles.input, confirmPasswordError && styles.inputError]}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text)
                  if (confirmPasswordError) setConfirmPasswordError(null)
                }}
                onBlur={validateConfirmPassword}
                placeholder="パスワードを再入力"
                placeholderTextColor={palette.gray400}
                textContentType="newPassword"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="パスワード確認入力"
              />
              {confirmPasswordError && <Text style={styles.fieldError}>{confirmPasswordError}</Text>}
            </View>

            {apiError && <Text style={styles.errorText}>{apiError}</Text>}

            <TouchableOpacity
              style={[styles.submitButton, isButtonDisabled && styles.submitButtonDisabled]}
              onPress={handleSignup}
              activeOpacity={0.8}
              disabled={isButtonDisabled}
              accessibilityRole="button"
              accessibilityLabel="新規登録"
              accessibilityState={{ disabled: isButtonDisabled }}
            >
              <Text style={styles.submitButtonText}>{isLoading ? '登録中...' : '新規登録'}</Text>
            </TouchableOpacity>

            <View style={styles.linkContainer}>
              <Text style={styles.linkText}>すでにアカウントをお持ちの方は</Text>
              <TouchableOpacity onPress={handleLogin} accessibilityRole="link">
                <Text style={styles.link}>ログイン</Text>
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
