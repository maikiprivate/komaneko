# Komaneko 本番サーバー構築 ホスティング比較レポート

## 1. エグゼクティブサマリー

### 課題
manabi-shogiでRender.comを使用した際、APIサーバー（Oregon）とデータベースサーバー（別リージョン）が離れていたため、APIレスポンスが約1秒かかり、ユーザー体験が悪化した。

### 目標
- APIとDBを同一リージョンに配置してレイテンシを最小化
- 無料枠または低コストで運用開始
- 将来のユーザー増加に対応できる拡張性を確保

### 推奨
**Railway** をメインの選択肢として推奨。バランスの取れた構成で、開発初期から成長期まで対応可能。

---

## 2. 評価基準

| 基準 | 重要度 | 説明 |
|------|--------|------|
| レイテンシ | 最重要 | API-DB間の通信速度、日本からのアクセス速度 |
| 無料枠の実用性 | 高 | スリープ、制限、実運用での使いやすさ |
| 設定の簡単さ | 中 | 初期セットアップの学習コスト |
| 拡張性 | 高 | ユーザー増加時のスケーリング対応 |
| 運用コスト | 中 | 成長期の月額費用 |

---

## 3. ホスティング選択肢の詳細分析

---

### 3.1 Railway

#### 概要
Railway は開発者向けのモダンなPaaS（Platform as a Service）。Herokuの後継として人気が高まっている。

#### 料金体系

| プラン | 月額 | 内容 |
|--------|------|------|
| Trial | $0 | $5クレジット（使い切ったら終了） |
| Hobby | $5 | 月$5クレジット + 超過分は従量課金 |
| Pro | $20 | 月$20クレジット + 優先サポート |

**従量課金の目安（Hobbyプラン）**:
- vCPU: $0.000463/分（約$20/月 for 1vCPU常時）
- メモリ: $0.000231/GB/分（約$10/月 for 1GB常時）
- PostgreSQL: 約$5-10/月（小規模）

#### リージョン

| リージョン | 日本からのレイテンシ |
|------------|----------------------|
| US-West (Oregon) | 約120-150ms |
| US-East (Virginia) | 約180-220ms |
| EU-West (Netherlands) | 約250-300ms |
| **Asia-Southeast (Singapore)** | **約80-120ms** |

#### レイテンシ分析

```
日本 → Singapore API → Singapore DB
       ├─ ネットワーク: 80-120ms
       └─ API-DB間: 1-5ms（同一リージョン内）

合計: 約100-150ms（許容範囲）
```

**manabi-shogiとの比較**:
```
manabi-shogi: 日本 → Oregon API → 別リージョンDB = 約1000ms
komaneko予測: 日本 → Singapore API → Singapore DB = 約100-150ms

改善率: 約85-90%削減
```

#### スケーリング能力

| ユーザー規模 | 推奨構成 | 推定月額 |
|--------------|----------|----------|
| 0-1,000 DAU | 0.5vCPU, 512MB, 基本DB | $5-10 |
| 1,000-10,000 DAU | 1vCPU, 1GB, 拡張DB | $20-40 |
| 10,000-50,000 DAU | 2vCPU, 2GB, 専用DB | $50-100 |
| 50,000+ DAU | 複数インスタンス + ロードバランサー | $100+ |

**水平スケーリング**:
- ワンクリックでインスタンス追加
- 自動ロードバランシング対応
- Redis追加でセッション共有可能

#### 運用機能

| 機能 | 対応状況 |
|------|----------|
| 自動デプロイ（GitHub連携） | ○ |
| 環境変数管理 | ○ |
| ログ閲覧 | ○ |
| メトリクス監視 | ○ |
| カスタムドメイン | ○ |
| SSL証明書 | 自動発行 |
| プライベートネットワーキング | ○ |
| マイグレーション自動実行 | ○ |

#### メリット・デメリット

**メリット**:
1. APIとDBが同一プロジェクト内で自動的に同一リージョン配置
2. 無料枠でもスリープなし（コールドスタート問題なし）
3. モダンなUI、直感的な操作
4. Prismaマイグレーションの自動実行対応
5. 拡張が容易（Redis、その他サービス追加可能）

**デメリット**:
1. 東京リージョンがない（シンガポールが最寄り）
2. Trial終了後は最低$5/月
3. 日本語ドキュメントが少ない
4. 比較的新しいサービスのため実績がやや少ない

---

### 3.2 Fly.io + Supabase

#### 概要
Fly.io（アプリケーションホスティング）とSupabase（PostgreSQL + BaaS）の組み合わせ。両方とも東京リージョンがあり、日本ユーザー向けには最速。

#### 料金体系

**Fly.io**:
| プラン | 月額 | 内容 |
|--------|------|------|
| Free | $0 | 3GB共有VM、160GB転送 |
| 従量課金 | - | $0.0000022/秒（shared-cpu-1x） |

**Supabase**:
| プラン | 月額 | 内容 |
|--------|------|------|
| Free | $0 | 500MB DB、2プロジェクト、1週間非アクティブで停止 |
| Pro | $25 | 8GB DB、バックアップ、スリープなし |

#### リージョン

| サービス | 東京リージョン | 日本からのレイテンシ |
|----------|----------------|----------------------|
| Fly.io | ○ (nrt) | 約10-30ms |
| Supabase | ○ (Northeast Asia) | 約10-30ms |

#### レイテンシ分析

```
日本 → Tokyo Fly.io → Tokyo Supabase
       ├─ ネットワーク: 10-30ms
       └─ API-DB間: 1-5ms（同一リージョン内）

合計: 約20-50ms（最速）
```

#### スケーリング能力

| ユーザー規模 | 推奨構成 | 推定月額 |
|--------------|----------|----------|
| 0-1,000 DAU | Fly無料枠 + Supabase無料枠 | $0 |
| 1,000-10,000 DAU | Fly $10 + Supabase Pro $25 | $35 |
| 10,000-50,000 DAU | Fly $30 + Supabase Pro $25 | $55 |
| 50,000+ DAU | 複数リージョン展開 | $100+ |

**グローバル展開**:
- Fly.ioはエッジデプロイ対応
- 複数リージョンにレプリカ配置可能
- 将来的に海外ユーザー対応が容易

#### 運用機能

| 機能 | Fly.io | Supabase |
|------|--------|----------|
| 自動デプロイ | GitHub Actions | - |
| 環境変数管理 | ○ | ○ |
| ログ閲覧 | ○ | ○ |
| メトリクス監視 | ○ | ○ |
| カスタムドメイン | ○ | - |
| 管理UI | シンプル | 充実 |
| Auth機能 | - | ○（オプション）|
| Storage機能 | - | ○（オプション）|

#### メリット・デメリット

**メリット**:
1. 両方とも東京リージョン選択可能（日本ユーザーに最速）
2. Supabaseの管理UIが充実
3. Fly.ioのエッジ展開でグローバル対応可能
4. Supabaseの追加機能（Auth、Storage、Realtime）が将来使える

**デメリット**:
1. 2つのサービスを別々に管理する手間
2. Fly.ioはDockerfileとfly.toml設定が必須
3. 無料枠はスリープ問題あり（Supabase: 1週間、Fly: 自動停止）
4. 連携が複雑になる可能性（トラブルシュート時に2箇所確認）
5. Supabase無料枠は2プロジェクトまで

---

### 3.3 Render.com（改善版）

#### 概要
manabi-shogiで使用したRender.com。外部DBではなく内蔵PostgreSQLを使用すれば同一リージョン配置可能。

#### 料金体系

| プラン | 月額 | 内容 |
|--------|------|------|
| Free | $0 | 750時間/月、15分でスリープ |
| Starter | $7 | 常時稼働 |
| Standard | $25 | より高性能 |

**PostgreSQL**:
| プラン | 月額 | 内容 |
|--------|------|------|
| Free | $0 | 256MB、90日でデータ削除 |
| Starter | $7 | 1GB |

#### リージョン

| リージョン | 無料枠 | 日本からのレイテンシ |
|------------|--------|----------------------|
| Oregon (US-West) | ○ | 約120-150ms |
| Frankfurt (EU) | ○ | 約250-300ms |
| Singapore | 有料のみ | 約80-120ms |
| Tokyo | 有料のみ | 約10-30ms |

#### レイテンシ分析（無料枠）

```
日本 → Oregon API → Oregon DB
       ├─ ネットワーク: 120-150ms
       └─ API-DB間: 1-5ms（同一リージョン内）

合計: 約150-200ms

※ただしスリープ後のコールドスタート: +30秒
```

**manabi-shogiとの比較**:
```
manabi-shogi: API(Oregon) → DB(別リージョン) = 約1000ms
改善版: API(Oregon) → DB(Oregon) = 約150-200ms

改善率: 約80%削減（ただしコールドスタート問題あり）
```

#### スケーリング能力

| ユーザー規模 | 推奨構成 | 推定月額 |
|--------------|----------|----------|
| 0-1,000 DAU | 無料枠（スリープあり） | $0 |
| 1,000-10,000 DAU | Starter $7 + DB $7 | $14 |
| 10,000-50,000 DAU | Standard $25 + DB $25 | $50 |
| 50,000+ DAU | 複数インスタンス | $100+ |

#### メリット・デメリット

**メリット**:
1. 既知の環境（manabi-shogiでの経験が活かせる）
2. render.yamlでインフラをコード化可能
3. 設定がシンプル
4. ドキュメントが充実

**デメリット**:
1. 無料枠のスリープが厳しい（15分で停止、起動に30秒）
2. 無料枠では東京リージョン使用不可
3. 無料DB枠は90日でデータ削除
4. コールドスタートがUXを著しく悪化させる

---

## 4. 総合比較

### 4.1 スコアカード

| 評価項目 | Railway | Fly.io + Supabase | Render.com |
|----------|---------|-------------------|------------|
| レイテンシ（API-DB間） | ◎ 同一リージョン | ◎ 同一リージョン | ◎ 同一リージョン |
| レイテンシ（日本から） | ○ 100-150ms | ◎ 20-50ms | △ 150-200ms |
| 無料枠でのスリープ | ◎ なし | △ あり | × 厳しい |
| 設定の簡単さ | ◎ 最も簡単 | △ やや複雑 | ○ 普通 |
| 管理の手間 | ◎ 1サービス | △ 2サービス | ○ 1サービス |
| 拡張性（垂直） | ◎ ワンクリック | ○ 可能 | ○ 可能 |
| 拡張性（水平） | ◎ 対応 | ◎ エッジ対応 | ○ 対応 |
| グローバル展開 | ○ 可能 | ◎ 最適 | ○ 可能 |
| 学習コスト | ○ 低〜中 | △ 中〜高 | ◎ 低（経験あり）|

### 4.2 ユースケース別推奨

| ユースケース | 推奨 | 理由 |
|--------------|------|------|
| 開発初期〜MVP | Railway | 無料枠が実用的、設定簡単 |
| 日本ユーザー重視 | Fly.io + Supabase | 東京リージョンで最速 |
| 既存知識活用 | Render.com | 学習コストゼロ |
| グローバル展開予定 | Fly.io + Supabase | エッジデプロイ対応 |
| シンプル運用 | Railway | 1サービスで完結 |

---

## 5. 成長フェーズ別のスケーリング戦略

### 5.1 Railway でのスケーリングパス

```
Phase 1: 開発・テスト期（0-100 DAU）
├─ Trial Plan ($5クレジット)
├─ 0.5 vCPU, 256MB
├─ PostgreSQL (Starter)
└─ 推定コスト: $0-5/月

    ↓ ユーザー増加

Phase 2: 初期成長期（100-1,000 DAU）
├─ Hobby Plan ($5/月)
├─ 1 vCPU, 512MB
├─ PostgreSQL (Starter)
└─ 推定コスト: $10-20/月

    ↓ ユーザー増加

Phase 3: 成長期（1,000-10,000 DAU）
├─ Pro Plan ($20/月)
├─ 2 vCPU, 1GB
├─ PostgreSQL (Pro)
├─ Redis追加（セッション管理）
└─ 推定コスト: $40-60/月

    ↓ ユーザー増加

Phase 4: 拡大期（10,000-50,000 DAU）
├─ Pro Plan + 複数インスタンス
├─ 4 vCPU, 2GB × 2インスタンス
├─ PostgreSQL (Pro) + リードレプリカ
├─ Redis (Cluster)
└─ 推定コスト: $100-200/月

    ↓ グローバル展開

Phase 5: グローバル期（50,000+ DAU）
├─ マルチリージョン展開
├─ CDN導入
├─ データベースレプリケーション
└─ 推定コスト: $300+/月
```

### 5.2 Fly.io + Supabase でのスケーリングパス

```
Phase 1: 開発・テスト期（0-100 DAU）
├─ Fly.io Free + Supabase Free
├─ shared-cpu-1x, 256MB
├─ PostgreSQL (500MB)
└─ 推定コスト: $0/月（スリープあり）

    ↓ ユーザー増加

Phase 2: 初期成長期（100-1,000 DAU）
├─ Fly.io $10 + Supabase Pro $25
├─ dedicated-cpu-1x, 512MB
├─ PostgreSQL (8GB)
└─ 推定コスト: $35/月

    ↓ ユーザー増加

Phase 3: 成長期（1,000-10,000 DAU）
├─ Fly.io $30 + Supabase Pro $25
├─ dedicated-cpu-2x, 1GB × 2インスタンス
├─ PostgreSQL (8GB) + Connection Pooling
└─ 推定コスト: $55/月

    ↓ グローバル展開

Phase 4: グローバル期（10,000+ DAU）
├─ Fly.io マルチリージョン（東京、シンガポール、US）
├─ Supabase リードレプリカ
├─ Edge関数活用
└─ 推定コスト: $100+/月
```

---

## 6. 最終決定

### 6.1 採用: Railway

**選定理由**:

1. **レイテンシ問題の解決**
   - APIとDBが自動的に同一リージョン配置
   - manabi-shogiの1秒→約150msに改善（85%削減）

2. **無料枠の実用性**
   - スリープなしで常時稼働
   - コールドスタート問題がない

3. **運用のシンプルさ**
   - 1つのダッシュボードで完結
   - GitHub連携で自動デプロイ
   - Prismaマイグレーション自動実行

4. **拡張性**
   - 垂直スケール: ワンクリック
   - 水平スケール: 複数インスタンス対応
   - Redis等の追加サービス: 同一プロジェクト内

5. **コストパフォーマンス**
   - 開発期: $0-5/月
   - 成長期: $20-60/月
   - 予測可能な料金体系

### 6.2 移行プラン

レイテンシが問題になった場合、Fly.io + Supabaseへの移行が可能：
- Dockerfileは共通で使用可能
- 移行作業: 約1-2時間
- データ移行: pg_dump/pg_restore

---

## 7. 実装計画

### 7.1 作成するファイル

| ファイル | 内容 |
|----------|------|
| `packages/api/Dockerfile` | マルチステージビルドでNode.js 22 Alpine |
| `packages/api/.dockerignore` | node_modules, .env, テストファイル除外 |

### 7.2 Dockerfile設計

```dockerfile
# ビルドステージ
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api
WORKDIR /app/packages/api
RUN pnpm build && pnpm prisma generate

# 実行ステージ
FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
WORKDIR /app/packages/api
EXPOSE 3000
CMD ["pnpm", "start"]
```

### 7.3 環境変数

| 変数名 | 説明 | 設定方法 |
|--------|------|----------|
| DATABASE_URL | PostgreSQL接続URL | Railway自動注入 |
| JWT_SECRET | JWT署名用秘密鍵 | 手動設定（ランダム生成） |
| ALLOWED_ORIGINS | CORS許可オリジン | 手動設定 |
| NODE_ENV | 実行環境 | production |
| PORT | リッスンポート | Railway自動注入（通常3000） |

### 7.4 実装タスク

1. **Dockerfile作成**
   - マルチステージビルドで軽量化
   - pnpm workspaceに対応
   - Prisma Client生成を含む

2. **.dockerignore作成**
   - 不要ファイルを除外

3. **Railway設定（GUI操作）**
   - アカウント作成
   - プロジェクト作成（Asia-Southeast）
   - PostgreSQL追加
   - GitHub連携
   - 環境変数設定
   - デプロイ確認

4. **アプリ側設定**
   - `EXPO_PUBLIC_API_URL`を本番URLに更新
   - 動作確認
