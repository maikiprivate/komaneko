/**
 * 認証フォーム共通スタイル
 * login.tsx と signup.tsx で共有
 */

import { StyleSheet } from 'react-native'

import Colors from '@/constants/Colors'

const { palette } = Colors

export const authFormStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.gameBackground,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    padding: 8,
    zIndex: 10,
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
    borderWidth: 1,
    borderColor: palette.gray200,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: palette.gray800,
  },
  inputError: {
    borderColor: palette.red,
  },
  // パスワード入力用
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  passwordContainerError: {
    borderColor: palette.red,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: palette.gray800,
  },
  passwordToggle: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  passwordToggleIcon: {
    width: 24,
    height: 24,
    tintColor: palette.gray400,
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
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: 14,
    color: palette.gray600,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.orange,
  },
})
