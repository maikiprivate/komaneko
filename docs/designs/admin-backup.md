# 管理画面バックアップ機能 設計書

## 概要

管理画面にデータベースのインポート/エクスポート機能を追加する。

### 用途
1. **環境間データ移行**: ローカルで作成したレッスン・詰将棋データを本番DBにインポート
2. **災害復旧**: バックアップ・リストア機能

### 対象データ
| 対象 | テーブル |
|------|---------|
| **エクスポート対象** | Tsumeshogi, Course, Section, Lesson, LessonProblem |
| **対象外** | User, Session, Hearts, LearningRecord, 各種Record |

### バックアップファイル保存先
- **保存場所**: サーバーのファイルシステム（`packages/api/backups/`）
- **将来拡張**: S3、GCS等のクラウドストレージ対応可能

---

## API設計

### エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/admin/backup/files` | バックアップファイル一覧取得 |
| DELETE | `/api/admin/backup/files/:filename` | バックアップファイル削除 |
| POST | `/api/admin/backup/tsumeshogi/export` | 詰将棋エクスポート（ファイル作成） |
| POST | `/api/admin/backup/tsumeshogi/import` | 詰将棋インポート |
| POST | `/api/admin/backup/lesson/export` | レッスンエクスポート（ファイル作成） |
| POST | `/api/admin/backup/lesson/import` | レッスンインポート |
| GET | `/api/admin/backup/files/:filename/download` | バックアップファイルダウンロード |

### エクスポート形式

```json
{
  "meta": {
    "version": "1.0",
    "exportedAt": "2026-01-10T10:00:00.000Z",
    "type": "tsumeshogi",
    "count": 30
  },
  "items": [
    {
      "sfen": "lns+R4l/...",
      "moveCount": 3,
      "problemNumber": 1,
      "status": "published"
    }
  ]
}
```

### ファイル命名規則
- 詰将棋: `tsumeshogi-YYYY-MM-DD-HHmmss.json`
- レッスン: `lesson-YYYY-MM-DD-HHmmss.json`

### インポートオプション

| オプション | 詰将棋 | レッスン | 説明 |
|-----------|--------|---------|------|
| `skip` | ✓ | ✓ | 重複をスキップ（デフォルト、安全） |
| `overwrite` | ✓ | ✓ | 重複を上書き |

**識別子:**
- 詰将棋: `sfen` (ユニーク)
- レッスン: `Course.order` (ユニーク)

### インポート方法
1. **サーバー上のファイルから**: `{ "filename": "tsumeshogi-2026-01-10.json" }`
2. **アップロードファイルから**: multipart/form-data でファイル送信

---

## ファイル構成

### バックエンド

```
packages/api/
├── backups/                      # バックアップファイル保存先（.gitignore）
│   ├── tsumeshogi-2026-01-10-120000.json
│   └── lesson-2026-01-10-120000.json
└── src/modules/admin/backup/
    ├── backup.router.ts          # エンドポイント
    ├── backup.service.ts         # ビジネスロジック
    ├── backup.service.test.ts    # テスト
    ├── backup.repository.ts      # DB操作
    ├── backup.schema.ts          # Zodスキーマ
    └── backup.storage.ts         # ファイルストレージ操作
```

### フロントエンド

```
packages/admin/src/
├── api/
│   └── backup.ts             # APIクライアント
└── pages/
    └── Backup.tsx            # バックアップ管理ページ
```

---

## 実装ステップ

### Step 1: 詰将棋エクスポート（バックエンド）
**対象ファイル:**
- `packages/api/src/modules/admin/backup/backup.schema.ts` (新規)
- `packages/api/src/modules/admin/backup/backup.storage.ts` (新規)
- `packages/api/src/modules/admin/backup/backup.repository.ts` (新規)
- `packages/api/src/modules/admin/backup/backup.service.ts` (新規)
- `packages/api/src/modules/admin/backup/backup.router.ts` (新規)
- `packages/api/src/app.ts` (ルーター登録)
- `packages/api/.gitignore` (backups/ 追加)

**実装内容:**
1. Zodスキーマ定義（エクスポート形式）
2. Storage: `saveFile()`, `listFiles()`, `deleteFile()`, `readFile()`
3. Repository: `findAllTsumeshogi()`
4. Service: `exportTsumeshogi()`
5. Router: `POST /tsumeshogi/export`, `GET /files`

### Step 2: 詰将棋インポート（バックエンド）
**対象ファイル:**
- `packages/api/src/modules/admin/backup/backup.schema.ts`
- `packages/api/src/modules/admin/backup/backup.repository.ts`
- `packages/api/src/modules/admin/backup/backup.service.ts`
- `packages/api/src/modules/admin/backup/backup.router.ts`

**実装内容:**
1. インポートスキーマ定義
2. Repository: `findTsumeshogiBySfen()`, `upsertTsumeshogi()`
3. Service: `importTsumeshogi(data, options)`
4. Router: `POST /tsumeshogi/import`

### Step 3: 詰将棋バックアップUI（フロントエンド）
**対象ファイル:**
- `packages/admin/src/api/backup.ts` (新規)
- `packages/admin/src/pages/Backup.tsx` (新規 or 既存プレースホルダー更新)
- `packages/admin/src/router.tsx`

**実装内容:**
1. APIクライアント関数
2. バックアップファイル一覧表示
3. エクスポートボタン → サーバーにファイル作成
4. インポート: ファイル選択（サーバー上 or アップロード）→ プレビュー → 実行
5. ファイルダウンロード・削除機能

### Step 4: レッスンエクスポート（バックエンド）
**対象ファイル:**
- `packages/api/src/modules/admin/backup/backup.schema.ts`
- `packages/api/src/modules/admin/backup/backup.repository.ts`
- `packages/api/src/modules/admin/backup/backup.service.ts`
- `packages/api/src/modules/admin/backup/backup.router.ts`

**実装内容:**
1. レッスン用スキーマ（階層構造: Course→Section→Lesson→Problem）
2. Repository: `findAllCoursesWithNested()`
3. Service: `exportLesson()`
4. Router: `POST /lesson/export`

### Step 5: レッスンインポート（バックエンド）
**対象ファイル:**
- `packages/api/src/modules/admin/backup/backup.repository.ts`
- `packages/api/src/modules/admin/backup/backup.service.ts`
- `packages/api/src/modules/admin/backup/backup.router.ts`

**実装内容:**
1. Repository: `createCourseWithNested()`, `deleteCourseById()`, `findCourseByOrder()`
2. Service: `importLesson(data, options)`
3. Router: `POST /lesson/import`
4. 重複処理: skip（スキップ）, overwrite（削除→再作成）

### Step 6: レッスンバックアップUI（フロントエンド）
**対象ファイル:**
- `packages/admin/src/api/backup.ts`
- `packages/admin/src/pages/Backup.tsx`

**実装内容:**
1. レッスンエクスポート/インポート機能
2. 階層構造のプレビュー表示
3. 重複時オプション選択UI

---

## UI設計

```
+----------------------------------------------------------+
| バックアップ管理                                          |
+----------------------------------------------------------+
|                                                           |
| [バックアップファイル]                                     |
| +-------------------------------------------------------+ |
| | ファイル名                    | 日時       | 操作     | |
| |-------------------------------|------------|----------| |
| | tsumeshogi-2026-01-10.json   | 01/10 12:00| [DL] [削]| |
| | lesson-2026-01-09.json       | 01/09 15:30| [DL] [削]| |
| +-------------------------------------------------------+ |
|                                                           |
| [詰将棋]                                                  |
| +-------------------------------------------------------+ |
| | エクスポート                    [エクスポート]         | |
| | 現在30問のデータをバックアップ                         | |
| +-------------------------------------------------------+ |
| | インポート                                            | |
| | ○ サーバー上のファイル: [選択 v]                      | |
| | ○ ファイルをアップロード: [ファイルを選択]            | |
| |                                                       | |
| | プレビュー:                                           | |
| | - 3手詰め: 10問                                       | |
| | - 5手詰め: 10問                                       | |
| |                                                       | |
| | 重複時: [スキップ v]  [インポート実行]                 | |
| +-------------------------------------------------------+ |
|                                                           |
| [レッスン]                                                |
| +-------------------------------------------------------+ |
| | (同様の構成)                                          | |
| +-------------------------------------------------------+ |
+----------------------------------------------------------+
```

---

## 参照ファイル

| ファイル | 参照目的 |
|---------|---------|
| `packages/api/src/modules/admin/lesson/lesson.router.ts` | 管理者APIパターン |
| `packages/api/src/modules/admin/lesson/lesson.repository.ts` | リポジトリパターン |
| `packages/api/prisma/seed.ts` | upsertパターン（SFEN重複判定） |
| `packages/admin/src/api/client.ts` | APIクライアント基盤 |
| `packages/admin/src/router.tsx` | ルーティング（/backup既存） |

---

## 注意事項

- 全エンドポイントで管理者認証必須
- Zodによる厳密な入力バリデーション
- インポート時はトランザクションで実行（部分失敗を防ぐ）
- `id`, `createdAt`, `updatedAt` はエクスポートから除外（インポート時に再生成）
- `backups/` ディレクトリは `.gitignore` に追加
- 将来のクラウドストレージ対応を考慮し、Storage層を抽象化
