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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import Colors from '@/constants/Colors'
import { mockLogin } from '@/lib/auth/authStorage'
import {
  validateEmail as validateEmailFormat,
  validatePassword as validatePasswordFormat,
} from '@/lib/auth/validation'

const { palette } = Colors

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
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
      const success = await mockLogin(email)
      if (success) {
        router.replace('/(tabs)')
      } else {
        setLoginError('ログインに失敗しました')
      }
    } catch {
      setLoginError('エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  const handleSignup = () => {
    router.push('/(auth)/signup')
  }

  const hasValidationError = emailError !== null || passwordError !== null
  const isButtonDisabled = isLoading || !email.trim() || !password.trim() || hasValidationError

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="戻る"
          >
            <FontAwesome name="chevron-left" size={20} color={palette.black} />
          </TouchableOpacity>

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
                placeholder="example@email.com"
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

            <View style={styles.signupLinkContainer}>
              <Text style={styles.signupLinkText}>アカウントをお持ちでない方は</Text>
              <TouchableOpacity onPress={handleSignup} accessibilityRole="link">
                <Text style={styles.signupLink}>新規登録</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.gameBackground,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignSelf: 'flex-start',
  },
  characterContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  character: {
    width: 200,
    height: 200,
  },
  greeting: {
    marginTop: 16,
    fontSize: 30,
    fontWeight: '700',
    color: palette.gray800,
  },
  formContainer: {
    gap: 20,
  },
  inputWrapper: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.gray800,
  },
  input: {
    backgroundColor: palette.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: palette.gray800,
  },
  inputError: {
    borderWidth: 1,
    borderColor: palette.red,
  },
  fieldError: {
    color: palette.red,
    fontSize: 12,
  },
  errorText: {
    color: palette.red,
    fontSize: 14,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: palette.orange,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: palette.white,
    fontSize: 17,
    fontWeight: '700',
  },
  signupLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  signupLinkText: {
    fontSize: 14,
    color: palette.gray600,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.orange,
  },
})
