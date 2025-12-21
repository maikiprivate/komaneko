# 管理画面（Admin Panel）設計書

## 概要

詰将棋・レッスンのコンテンツを管理するWebアプリケーション。

### 技術スタック

| 項目 | 選択 |
|------|------|
| フレームワーク | React + Vite |
| ルーティング | React Router |
| スタイリング | TailwindCSS |
| 言語 | TypeScript |

### 認証方式

既存のJWT認証を利用し、User.roleで管理者権限をチェック。

---

## DBスキーマ

### User.role 追加

```prisma
model User {
  // 既存フィールド...
  role String @default("user")  // "user" | "admin"
}
```

### レッスン関連テーブル

```prisma
model Course {
  id          String   @id @default(uuid())
  title       String
  description String
  status      String   @default("draft")  // draft, published, archived
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  sections    Section[]
  @@index([status, sortOrder])
  @@map("courses")
}

model Section {
  id        String   @id @default(uuid())
  courseId  String   @map("course_id")
  title     String
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  course    Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessons   Lesson[]
  @@index([courseId, sortOrder])
  @@map("sections")
}

model Lesson {
  id        String   @id @default(uuid())
  sectionId String   @map("section_id")
  title     String
  status    String   @default("draft")  // draft, published, archived
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  section   Section  @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  problems  Problem[]
  @@index([sectionId, sortOrder])
  @@map("lessons")
}

model Problem {
  id          String   @id @default(uuid())
  lessonId    String   @map("lesson_id")
  sfen        String                         // 初期局面
  instruction String                         // 指示文
  answerMoves String   @map("answer_moves")  // 正解手順（JSON配列）
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  lesson      Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  @@index([lessonId, sortOrder])
  @@map("problems")
}
```

### Problem.answerMoves の形式

JSON配列で正解手順を管理。複数の正解手順がある場合は配列内に複数の手順を格納。

```json
// 1手だけ、正解が1つ
[["7g7f"]]

// 1手だけ、複数の正解（どれでもOK）
[["7g7f"], ["2g2f"], ["3g3f"]]

// 3手1組（正解手→応手→正解手）
[["7g7f", "3c3d", "2h3h"]]

// 3手1組、複数の正解手順
[
  ["7g7f", "3c3d", "2h3h"],
  ["2g2f", "3c3d", "2h2f"]
]

// 成る手は末尾に+
[["7c7b+"]]
```

**ルール:**
- 外側の配列: 正解手順のリスト（どれでも正解）
- 内側の配列: 1つの手順（奇数番目=正解手、偶数番目=CPU応手）
- 手の表記: SFEN形式（例: "7g7f", "2h3h+")

---

## API設計

### 管理者認証

既存の `/api/auth/login` を使用し、レスポンスの `user.role` で管理者判定。

### 詰将棋管理API

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | /api/admin/tsumeshogi | 一覧（全ステータス） | 管理者 |
| GET | /api/admin/tsumeshogi/:id | 詳細取得 | 管理者 |
| POST | /api/admin/tsumeshogi | 新規作成 | 管理者 |
| PATCH | /api/admin/tsumeshogi/:id | 更新 | 管理者 |
| DELETE | /api/admin/tsumeshogi/:id | 削除 | 管理者 |

### レッスン管理API

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | /api/admin/courses | コース一覧 | 管理者 |
| POST | /api/admin/courses | コース作成 | 管理者 |
| PATCH | /api/admin/courses/:id | コース更新 | 管理者 |
| DELETE | /api/admin/courses/:id | コース削除 | 管理者 |
| GET | /api/admin/courses/:courseId/sections | セクション一覧 | 管理者 |
| POST | /api/admin/courses/:courseId/sections | セクション作成 | 管理者 |
| PATCH | /api/admin/sections/:id | セクション更新 | 管理者 |
| DELETE | /api/admin/sections/:id | セクション削除 | 管理者 |
| GET | /api/admin/sections/:sectionId/lessons | レッスン一覧 | 管理者 |
| POST | /api/admin/sections/:sectionId/lessons | レッスン作成 | 管理者 |
| GET | /api/admin/lessons/:id | レッスン詳細（問題含む） | 管理者 |
| PATCH | /api/admin/lessons/:id | レッスン更新 | 管理者 |
| DELETE | /api/admin/lessons/:id | レッスン削除 | 管理者 |
| POST | /api/admin/lessons/:lessonId/problems | 問題作成 | 管理者 |
| PATCH | /api/admin/problems/:id | 問題更新 | 管理者 |
| DELETE | /api/admin/problems/:id | 問題削除 | 管理者 |

### バックアップAPI

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | /api/admin/backup/export | 全データをJSONでエクスポート | 管理者 |
| POST | /api/admin/backup/import | JSONからデータをインポート | 管理者 |

**バックアップ用途:**
- 開発環境で作成したデータを本番環境に移行
- データ消失時の復旧用バックアップ

**エクスポート形式:**
```json
{
  "version": "1.0",
  "exportedAt": "2025-01-01T00:00:00Z",
  "tsumeshogi": [...],
  "courses": [...],
  "sections": [...],
  "lessons": [...],
  "problems": [...]
}
```

---

## 画面構成

### ディレクトリ構造

```
packages/admin/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── router.tsx
    ├── api/
    │   ├── client.ts
    │   ├── auth.ts
    │   ├── tsumeshogi.ts
    │   ├── lesson.ts
    │   └── backup.ts
    ├── components/
    │   ├── Layout.tsx
    │   └── ShogiBoard.tsx
    ├── pages/
    │   ├── Login.tsx
    │   ├── Dashboard.tsx
    │   ├── Backup.tsx
    │   ├── tsumeshogi/
    │   │   ├── List.tsx
    │   │   ├── Create.tsx
    │   │   └── Edit.tsx
    │   └── lesson/
    │       ├── CourseList.tsx
    │       ├── CourseEdit.tsx
    │       ├── SectionEdit.tsx
    │       ├── LessonEdit.tsx
    │       └── ProblemEdit.tsx
    └── hooks/
        └── useAuth.ts
```

### 画面一覧

| 画面 | パス | 説明 |
|------|------|------|
| ログイン | /login | 管理者ログイン |
| ダッシュボード | / | 概要表示 |
| 詰将棋一覧 | /tsumeshogi | 一覧 + ステータスフィルタ |
| 詰将棋作成 | /tsumeshogi/new | 新規作成フォーム |
| 詰将棋編集 | /tsumeshogi/:id | 編集フォーム |
| コース一覧 | /lesson | コース一覧 |
| コース編集 | /lesson/:courseId | セクション管理 |
| セクション編集 | /lesson/:courseId/sections/:sectionId | レッスン管理 |
| レッスン編集 | /lesson/:courseId/lessons/:lessonId | 問題管理 |
| バックアップ | /backup | エクスポート/インポート |

---

## 認証フロー

### 管理者ミドルウェア

```typescript
// packages/api/src/shared/middleware/admin.middleware.ts
export function createAdminMiddleware(repository: AdminMiddlewareRepository) {
  return {
    async authorize(userId: string): Promise<void> {
      const user = await repository.findUserById(userId)
      if (!user || user.role !== 'admin') {
        throw new AppError('FORBIDDEN')
      }
    }
  }
}
```

### エラーコード追加

```typescript
FORBIDDEN: {
  statusCode: 403,
  message: '管理者権限が必要です'
}
```

---

## 実装ステップ

### Step 1: User.role 追加
- Prismaスキーマにrole追加
- マイグレーション実行
- シードで初期管理者作成

### Step 2: 管理画面プロジェクト初期化
- Vite + React + TypeScript セットアップ
- TailwindCSS 設定
- React Router 設定
- ログイン画面・ダッシュボード実装

### Step 3: 管理者認証ミドルウェア
- admin.middleware.ts 作成
- FORBIDDENエラーコード追加
- /api/admin プレフィックスの preHandler 設定

### Step 4: 詰将棋管理API
- POST, PATCH, DELETE エンドポイント追加
- Zodスキーマ作成

### Step 5: 詰将棋管理UI
- 一覧画面（ステータスフィルタ）
- 作成・編集フォーム
- SFENプレビュー機能

### Step 6: レッスンDBスキーマ
- Course, Section, Lesson, Problem テーブル追加
- マイグレーション実行

### Step 7: レッスンシードデータ
- モックデータをDBに投入
- LessonRecordとの整合性確認

### Step 8: レッスン管理API
- Course, Section, Lesson, Problem の CRUD API

### Step 9: レッスン管理UI
- コース一覧・編集画面
- セクション・レッスン・問題の管理画面

### Step 10: バックアップ機能
- エクスポートAPI（全データをJSON出力）
- インポートAPI（JSONからデータ復元）
- バックアップ管理画面

### Step 11: アプリ側API切り替え
- モックデータ → API取得に変更
- 既存の学習記録機能との整合性確認

---

## MVPスコープ

**含める:**
- User.role 追加
- 管理画面基盤（ログイン、レイアウト、ダッシュボード）
- 詰将棋 CRUD（API + UI）
- レッスン DB スキーマ + シード
- レッスン CRUD（API + UI）
- バックアップ機能（エクスポート/インポート）

**後回し:**
- 画像アップロード
- 一括操作
- 高度なバリデーション
