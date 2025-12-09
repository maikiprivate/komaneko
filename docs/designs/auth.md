# 認証画面設計（Phase 7）

## 概要

アプリ起動時のウェルカム画面と、ログイン/新規登録のモック画面を実装。
現段階ではバックエンド連携なし、UI先行で実装。

## 画面フロー

```
アプリ起動
    ↓
[認証状態チェック（AsyncStorage）]
    ↓
未認証 → ウェルカム画面
    ↓
「新規登録」→ 新規登録画面 → (モック登録) → ホーム画面
「ログイン」→ ログイン画面 → (モック認証) → ホーム画面

認証済み → ホーム画面（タブ）
```

## ファイル構成

```
packages/app/
├── app/
│   ├── _layout.tsx              # 修正: 認証状態で初期ルート分岐
│   ├── (auth)/                  # 新規: 認証グループ
│   │   ├── _layout.tsx          # 認証画面用レイアウト（ヘッダーなし）
│   │   ├── welcome.tsx          # ウェルカム画面
│   │   ├── login.tsx            # ログイン画面
│   │   └── signup.tsx           # 新規登録画面
│   └── (tabs)/                  # 既存: 認証後のメイン画面
├── lib/
│   └── auth/
│       └── authStorage.ts       # 新規: 認証状態の保存/読込
```

## 画面設計

### ウェルカム画面

```
+----------------------------------+
|                                  |
|         (splash.png)             |
|         駒猫キャラクター          |
|         「駒 猫」ロゴ            |
|                                  |
|                                  |
|                                  |
|  ┌────────────────────────────┐  |
|  │       新規登録              │  |  ← プライマリボタン（オレンジ）
|  └────────────────────────────┘  |
|                                  |
|  ┌────────────────────────────┐  |
|  │       ログイン              │  |  ← セカンダリボタン（白枠）
|  └────────────────────────────┘  |
|                                  |
+----------------------------------+
```

- `ImageBackground`でsplash.pngを全画面表示
- ボタンは画面下部に固定配置（`position: absolute`）

### ログイン画面

```
+----------------------------------+
|  ←                               |  ← 戻るボタン
|                                  |
|         🐱 キャラクター           |
|       「おかえりにゃ！」          |
|                                  |
|      ┌──────────────────────┐    |
|      │ メールアドレス         │    |
|      └──────────────────────┘    |
|                                  |
|      ┌──────────────────────┐    |
|      │ パスワード            │    |
|      └──────────────────────┘    |
|                                  |
|  ┌────────────────────────────┐  |
|  │       ログイン              │  |
|  └────────────────────────────┘  |
|                                  |
+----------------------------------+
```

### 新規登録画面

```
+----------------------------------+
|  ←                               |  ← 戻るボタン
|                                  |
|         🐱 キャラクター           |
|    「一緒に将棋を学ぶにゃ！」      |
|                                  |
|      ┌──────────────────────┐    |
|      │ メールアドレス         │    |
|      └──────────────────────┘    |
|                                  |
|      ┌──────────────────────┐    |
|      │ パスワード            │    |
|      └──────────────────────┘    |
|                                  |
|  ┌────────────────────────────┐  |
|  │       新規登録              │  |
|  └────────────────────────────┘  |
|                                  |
+----------------------------------+
```

## 認証状態管理

### データ構造

```typescript
interface AuthState {
  isAuthenticated: boolean
  userId?: string
  email?: string
}
```

### AsyncStorage API

```typescript
// lib/auth/authStorage.ts

const AUTH_KEY = '@komaneko/auth'

// 取得
export async function getAuthState(): Promise<AuthState>

// 保存
export async function setAuthState(state: AuthState): Promise<void>

// クリア（ログアウト用）
export async function clearAuthState(): Promise<void>
```

## UIスタイル

### カラー

| 要素 | 色 |
|------|-----|
| 背景 | splash.png（#F5E6D3ベース） |
| プライマリボタン | #FF8C42（オレンジ） |
| プライマリボタン文字 | #FFFFFF（白） |
| セカンダリボタン | 白背景 + オレンジ枠 |
| セカンダリボタン文字 | #FF8C42（オレンジ） |
| テキスト | #333333 |
| 入力欄背景 | #FFFFFF |
| 入力欄枠 | #E0E0E0 |
| プレースホルダー | #999999 |

### ボタンスタイル

```typescript
// プライマリ（新規登録）
primaryButton: {
  backgroundColor: '#FF8C42',
  borderRadius: 12,
  paddingVertical: 16,
  marginHorizontal: 24,
}

// セカンダリ（ログイン）
secondaryButton: {
  backgroundColor: '#FFFFFF',
  borderWidth: 2,
  borderColor: '#FF8C42',
  borderRadius: 12,
  paddingVertical: 16,
  marginHorizontal: 24,
}
```

### 入力フィールドスタイル

```typescript
input: {
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E0E0E0',
  borderRadius: 8,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,
  marginHorizontal: 24,
}
```

## ルーティング

### 初期ルート設定

```typescript
// app/_layout.tsx
export const unstable_settings = {
  initialRouteName: '(auth)',  // 初期は認証グループ
}
```

### 認証後の遷移

```typescript
// ログイン成功時
router.replace('/(tabs)')

// ログアウト時（将来）
router.replace('/(auth)/welcome')
```

## モック動作

### ログイン
- 入力値に関係なく認証成功
- AsyncStorageにフラグを保存
- ホーム画面へ遷移

### 新規登録
- 入力値に関係なく登録成功
- AsyncStorageにメールアドレスとフラグを保存
- ホーム画面へ遷移

## 将来の拡張

- バックエンドAPI連携（実際の認証）
- ソーシャルログイン（Google, Apple）
- パスワードリセット機能
- ログアウト機能（設定画面に追加）
- 入力バリデーション
- エラーメッセージ表示
