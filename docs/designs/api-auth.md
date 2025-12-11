# 認証API設計書（Phase 9）

## 概要

モバイルアプリ向けの認証システムをFastify + Prismaで実装する。
JWTベースの認証で、匿名ユーザーにも対応。

## 現状分析

### 既存資産
- **Prismaスキーマ**: `User`, `Session`モデル定義済み
- **Fastify基盤**: CORS, レート制限, エラーハンドリング設定済み
- **アプリ側**: モック認証実装済み（AsyncStorage）

### 参照実装（manabi-shogi）
- JWT認証（bcryptjs + jsonwebtoken）
- 匿名セッション対応
- パスワードバリデーション

---

## 認証方式

### JWT認証（シンプル版）

```
┌─────────────────────────────────────────────────────────────┐
│                    認証フロー                                │
├─────────────────────────────────────────────────────────────┤
│  1. ログイン/登録 → アクセストークン発行                     │
│  2. API呼び出し → Authorization: Bearer {accessToken}        │
│  3. トークン期限切れ → 再ログイン                            │
│  4. ログアウト → トークン無効化（DB側でセッション削除）       │
└─────────────────────────────────────────────────────────────┘

アクセストークン: 30日（長め、API呼び出し頻度を抑える）
セッション: DB保存（ログアウト時に無効化可能）
```

### なぜリフレッシュトークンを使わないか

- API呼び出し頻度が増える
- 実装が複雑になる
- 30日で再ログインは許容範囲（UX的に問題なし）

将来的にセキュリティ要件が高まれば、リフレッシュトークン方式に移行可能。

### なぜCookieではなくJWTか

| 方式 | Web | モバイルアプリ |
|------|-----|---------------|
| Cookie | ✓ 最適 | △ 扱いにくい |
| JWT | ○ 可能 | ✓ 最適 |

モバイルアプリがメインプラットフォームのため、JWTを採用。

---

## APIエンドポイント

### 認証API

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| POST | `/api/auth/register` | 新規登録 | 不要 |
| POST | `/api/auth/login` | ログイン | 不要 |
| POST | `/api/auth/logout` | ログアウト | 必要 |
| GET | `/api/auth/me` | 現在のユーザー情報 | 必要 |
| DELETE | `/api/auth/me` | 退会（アカウント削除） | 必要 |

### 匿名ユーザー（将来実装）

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/auth/anonymous` | 匿名ユーザー作成 |
| POST | `/api/auth/upgrade` | 匿名→正規ユーザー変換 |

---

## データモデル

### 既存スキーマ（変更なし）

```prisma
model User {
  id          String    @id @default(uuid())
  email       String?   @unique
  name        String?
  isAnonymous Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  sessions    Session[]
  // ... hearts, streak
}

model Session {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique  // セッショントークン（ログアウト時に無効化用）
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(...)
}
```

### 追加が必要なフィールド

```prisma
model User {
  // 追加
  passwordHash String?  @map("password_hash")  // ハッシュ化されたパスワード
  username     String?  @unique                // ユーザー名（表示用）
}
```

---

## 実装ファイル構成

```
packages/api/src/
├── modules/
│   └── auth/
│       ├── auth.router.ts      # エンドポイント定義
│       ├── auth.service.ts     # ビジネスロジック
│       ├── auth.repository.ts  # DB操作
│       ├── auth.schema.ts      # Zodスキーマ（入出力）
│       ├── auth.types.ts       # 内部型定義
│       └── auth.test.ts        # テスト
│
├── shared/
│   ├── middleware/
│   │   └── authenticate.ts     # 認証ミドルウェア
│   └── utils/
│       ├── password.ts         # パスワードハッシュ
│       └── jwt.ts              # JWT生成・検証
│
└── app.ts                      # authRouterを登録
```

---

## 詳細設計

### 1. 新規登録 (POST /api/auth/register)

#### リクエスト
```typescript
interface RegisterRequest {
  email: string       // 必須、メール形式
  password: string    // 必須、8文字以上
  username: string    // 必須、2-20文字
}
```

#### レスポンス
```typescript
interface RegisterResponse {
  data: {
    user: {
      id: string
      email: string
      username: string
    }
    accessToken: string
  }
}
```

#### 処理フロー
1. 入力バリデーション（Zod）
2. メール重複チェック
3. ユーザー名重複チェック
4. パスワードハッシュ化（bcrypt, rounds=12）
5. ユーザー作成（isAnonymous=false）
6. 初期データ作成（Hearts, Streak）
7. セッション作成（トークンをDB保存、ログアウト時に無効化用）
8. JWT生成（アクセストークン、30日有効）
9. レスポンス返却

#### バリデーション（二層構造）

**API層（Zod）**: ユーザーに分かりやすいエラーメッセージを返す
```typescript
const registerSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .regex(/[a-z]/, '小文字を含めてください')
    .regex(/[A-Z]/, '大文字を含めてください')
    .regex(/[0-9]/, '数字を含めてください'),
  username: z.string()
    .min(2, 'ユーザー名は2文字以上で入力してください')
    .max(20, 'ユーザー名は20文字以内で入力してください')
    .regex(/^[a-zA-Z0-9_]+$/, '英数字とアンダースコアのみ使用できます'),
})
```

**DB層（Prisma制約）**: 最終防御として一意性を保証
```prisma
email    String? @unique  // 重複防止
username String? @unique  // 重複防止
```

API層で弾いた後でも、並行リクエスト等でDB層の制約が発動する場合がある。
その場合は適切なエラーコード（EMAIL_ALREADY_EXISTS等）に変換して返す。

### 2. ログイン (POST /api/auth/login)

#### リクエスト
```typescript
interface LoginRequest {
  email: string
  password: string
}
```

#### レスポンス
```typescript
interface LoginResponse {
  data: {
    user: {
      id: string
      email: string
      username: string
    }
    accessToken: string
  }
}
```

#### 処理フロー
1. 入力バリデーション
2. ユーザー検索（email）
3. パスワード検証
4. 既存セッション削除（オプション：単一セッション制限）
5. 新規セッション作成
6. JWT生成
7. レスポンス返却

### 3. ログアウト (POST /api/auth/logout)

#### ヘッダー
```
Authorization: Bearer {accessToken}
```

#### 処理フロー
1. トークンからユーザーID取得
2. セッション削除
3. 204 No Content返却

### 4. 現在のユーザー (GET /api/auth/me)

#### ヘッダー
```
Authorization: Bearer {accessToken}
```

#### レスポンス
```typescript
interface MeResponse {
  data: {
    user: {
      id: string
      email: string
      username: string
      createdAt: string
    }
  }
}
```

### 5. 退会 (DELETE /api/auth/me)

#### ヘッダー
```
Authorization: Bearer {accessToken}
```

#### 処理フロー
1. ユーザーIDを取得
2. 関連データ削除（Cascade設定済み）
3. ユーザー削除
4. 204 No Content返却

---

## 認証ミドルウェア

```typescript
// shared/middleware/authenticate.ts

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('AUTH_REQUIRED', '認証が必要です')
  }

  const token = authHeader.slice(7)

  try {
    const payload = verifyAccessToken(token)
    request.user = {
      id: payload.userId,
      email: payload.email,
      username: payload.username,
    }
  } catch (error) {
    throw new UnauthorizedError('INVALID_TOKEN', 'トークンが無効です')
  }
}
```

---

## エラーコード

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| AUTH_REQUIRED | 401 | 認証が必要 |
| INVALID_TOKEN | 401 | トークンが無効 |
| TOKEN_EXPIRED | 401 | トークン期限切れ |
| INVALID_CREDENTIALS | 401 | メールまたはパスワードが違う |
| EMAIL_ALREADY_EXISTS | 409 | メールアドレスが既に使用されている |
| USERNAME_ALREADY_EXISTS | 409 | ユーザー名が既に使用されている |
| VALIDATION_ERROR | 400 | 入力値が不正 |

---

## セキュリティ考慮事項

### 1. パスワード
- bcrypt（rounds=12）でハッシュ化
- 平文パスワードは保存しない
- ログに出力しない

### 2. JWT
- 秘密鍵は環境変数（JWT_SECRET）
- アクセストークンは30日有効
- セッションはDB管理（ログアウト時に削除で無効化）

### 3. レート制限
- 認証エンドポイント: 5 req/min（ブルートフォース対策）
- 一般API: 100 req/min

### 4. 入力検証
- すべての入力をZodでバリデーション
- SQLインジェクション: Prisma使用で防止

---

## 環境変数

```env
# JWT設定
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=30d

# パスワード設定
BCRYPT_ROUNDS=12
```

---

## 実装順序

### Step 1: 基盤整備
1. [ ] Prismaスキーマ更新（passwordHash, username追加）
2. [ ] マイグレーション実行
3. [ ] 環境変数設定

### Step 2: ユーティリティ
4. [ ] shared/utils/password.ts（ハッシュ化・検証）
5. [ ] shared/utils/jwt.ts（生成・検証）
6. [ ] ユニットテスト

### Step 3: 認証モジュール
7. [ ] auth.types.ts（型定義）
8. [ ] auth.schema.ts（Zodスキーマ）
9. [ ] auth.repository.ts（DB操作）
10. [ ] auth.service.ts（ビジネスロジック）- TDD
11. [ ] auth.router.ts（エンドポイント）
12. [ ] 統合テスト

### Step 4: ミドルウェア
13. [ ] shared/middleware/authenticate.ts
14. [ ] app.tsへの登録

### Step 5: アプリ連携準備
15. [ ] APIクライアント設計（アプリ側）
16. [ ] エラーハンドリング統一

---

## テスト方針

### TDD対象（必須）

| 対象 | テスト内容 |
|------|-----------|
| `password.ts` | ハッシュ化、検証、ラウンド数 |
| `jwt.ts` | 生成、検証、期限切れ、不正トークン |
| `auth.service.ts` | 登録、ログイン、ログアウト、退会 |

### Service層テストケース

**登録（register）**
- 正常系: 新規ユーザー作成成功
- 異常系: メール重複、ユーザー名重複

**ログイン（login）**
- 正常系: 正しい認証情報でトークン発行
- 異常系: 存在しないユーザー、パスワード不一致

**ログアウト（logout）**
- 正常系: セッション削除

**退会（deleteAccount）**
- 正常系: ユーザーと関連データ削除

### 後回し（実装安定後）

- Router層テスト（エンドポイント）
- 統合テスト（DB含めた全体フロー）
- 認証ミドルウェアのテスト

---

## アプリ側の変更（Phase 12で実施）

### 変更対象
- `lib/auth/AuthContext.tsx` - API呼び出しに変更
- `lib/auth/authStorage.ts` - トークン保存に変更

### 追加
- `lib/api/client.ts` - APIクライアント
- `lib/api/auth.ts` - 認証API呼び出し

---

## 将来の拡張

### 匿名ユーザー対応
- アプリ初回起動時に匿名ユーザー自動作成
- 正規ユーザーへの変換機能

### ソーシャルログイン
- Apple Sign In
- Google Sign In

### セキュリティ強化
- 2要素認証
- デバイス管理
- ログイン履歴
