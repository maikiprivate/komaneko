# 認証設計（Phase 7 + Phase 9）

## 概要

アプリ起動時のウェルカム画面と、ログイン/新規登録画面を実装。
Phase 7でアプリUI（モック認証）、Phase 9でバックエンドAPIを実装済み。

### 実装状況

| Phase | 内容 | 状態 |
|-------|------|------|
| Phase 7 | アプリUI（モック認証） | 完了 |
| Phase 9 | バックエンドAPI | 完了 |
| Phase 12 | アプリ-API連携 | 未着手 |

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

### アプリ側（packages/app/）

```
packages/app/
├── app/
│   ├── _layout.tsx              # 認証状態でRedirect
│   ├── (auth)/
│   │   ├── _layout.tsx          # 認証画面用レイアウト（ヘッダーなし）
│   │   ├── index.tsx            # ウェルカム画面
│   │   ├── login.tsx            # ログイン画面
│   │   └── signup.tsx           # 新規登録画面
│   └── (tabs)/                  # 認証後のメイン画面
├── lib/
│   └── auth/
│       ├── AuthContext.tsx      # 認証状態のContext
│       ├── authStorage.ts       # AsyncStorage操作
│       ├── authFormStyles.ts    # 共通スタイル
│       └── validation.ts        # 入力バリデーション
```

### API側（packages/api/）

```
packages/api/src/
├── modules/auth/
│   ├── auth.router.ts           # エンドポイント + preHandlerフック
│   ├── auth.router.test.ts      # ルーターテスト
│   ├── auth.service.ts          # ビジネスロジック
│   ├── auth.service.test.ts     # サービステスト
│   ├── auth.repository.ts       # DBアクセス
│   └── auth.schema.ts           # Zodスキーマ
├── shared/
│   ├── middleware/
│   │   ├── auth.middleware.ts   # 認証ミドルウェア
│   │   └── auth.middleware.test.ts
│   └── utils/
│       ├── jwt.ts               # JWT生成・検証
│       ├── jwt.test.ts
│       ├── password.ts          # bcryptハッシュ
│       └── password.test.ts
└── types/
    └── fastify.d.ts             # FastifyRequest型拡張
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

---

## バックエンドAPI設計（Phase 9）

### エンドポイント

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| POST | /api/auth/register | 新規登録 | 不要 |
| POST | /api/auth/login | ログイン | 不要 |
| POST | /api/auth/logout | ログアウト | 必須 |
| GET | /api/auth/me | ユーザー情報取得 | 必須 |
| DELETE | /api/auth/me | アカウント削除 | 必須 |

### 認証フロー

```
リクエスト → preHandler（認証チェック）→ ルートハンドラ

/register → preHandler（PUBLIC_ROUTESなのでスキップ）→ 登録処理
/login    → preHandler（PUBLIC_ROUTESなのでスキップ）→ ログイン処理
/logout   → preHandler（認証実行）→ request.user設定 → ログアウト処理
/me       → preHandler（認証実行）→ request.user設定 → ユーザー情報返却
```

### 認証ミドルウェアの動作

1. Authorizationヘッダーから `Bearer <token>` を取得
2. JWTを検証（署名、有効期限）
3. DBセッションの存在確認（ログアウト後のJWT無効化用）
4. `request.user = { userId }` を設定

### セキュリティ対策

| 対策 | 実装 |
|------|------|
| パスワード | bcryptでハッシュ化（コスト12） |
| JWT | HS256署名、30日有効期限 |
| レースコンディション | Prisma P2002エラーハンドリング |
| デフォルト認証 | PUBLIC_ROUTES以外は自動認証 |

---

## 将来の拡張

### 実装済み（Phase 9）
- [x] バックエンドAPI連携（実際の認証）
- [x] 入力バリデーション
- [x] エラーメッセージ表示

### 未実装
- [ ] アプリ-API連携（Phase 12）
- [ ] ソーシャルログイン（Google, Apple）
- [ ] パスワードリセット機能
- [ ] ログアウト機能（設定画面に追加）
- [ ] 匿名ユーザー → 登録ユーザーへの移行
- [ ] トークンリフレッシュ
