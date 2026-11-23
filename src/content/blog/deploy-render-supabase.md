---
title: "Spring Boot + React アプリを Render + Supabase で無料デプロイした記録"
description: "個人開発の音楽クイズアプリを、Spring Boot は Render の Web Service、React は Static Site、DB は Supabase で、すべて無料でデプロイしました。IPv6 や Vite の base path など、ハマったポイントをまとめます。"
pubDate: 2026-03-29
tags: ["Render", "Supabase", "Spring Boot", "React", "PostgreSQL"]
---

個人開発の音楽クイズアプリ「おんぷクイズ」を Render + Supabase にデプロイした際の手順と、ハマったポイントをまとめます。

## 構成

```
┌─────────────────────────────────────────────────────┐
│                    Render                            │
│                                                      │
│  ┌───────────────┐       ┌────────────────────┐     │
│  │ Static Site    │       │ Web Service (Docker)│     │
│  │ React SPA      │──────>│ Spring Boot API     │     │
│  │                │ HTTPS │ Port: 8080          │     │
│  └───────────────┘       └────────┬─────────────┘     │
│                                   │                   │
└───────────────────────────────────│───────────────────┘
                                    │ JDBC (Session Pooler)
                          ┌─────────▼──────────┐
                          │  Supabase           │
                          │  PostgreSQL 16      │
                          │  (ap-northeast-1)   │
                          └────────────────────┘
```

### 技術スタック

| コンポーネント | 技術 | デプロイ先 |
|-------------|------|-----------|
| フロントエンド | React 19 + TypeScript + Vite | Render Static Site |
| バックエンド | Spring Boot 3.4.4 (Java 17) + jOOQ | Render Web Service (Docker) |
| データベース | PostgreSQL 16 | Supabase (Free tier) |

## 前提：MySQL から PostgreSQL への移行

元々ローカルでは MySQL を使っていたので、まず PostgreSQL に移行しました。

### Flyway マイグレーションの書き換え

MySQL 用のマイグレーションを PostgreSQL 用に統合・書き換え。

**Before (MySQL):**
```sql
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    -- ...
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**After (PostgreSQL):**
```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    login_id VARCHAR(50) NOT NULL UNIQUE,
    -- ...
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

主な変更点：
- `AUTO_INCREMENT` → `BIGSERIAL`
- `DATETIME` → `TIMESTAMP`
- `ON UPDATE CURRENT_TIMESTAMP` は PostgreSQL にないので削除
- `INDEX` の構文変更

### build.gradle.kts の依存関係変更

```diff
- implementation("org.flywaydb:flyway-mysql")
- runtimeOnly("com.mysql:mysql-connector-j")
+ implementation("org.flywaydb:flyway-database-postgresql")
+ runtimeOnly("org.postgresql:postgresql")
```

jOOQ の codegen 設定も変更：

```diff
- name = "org.jooq.meta.mysql.MySQLDatabase"
- inputSchema = "onpu"
+ name = "org.jooq.meta.postgres.PostgresDatabase"
+ inputSchema = "public"
```

### ⚠️ ハマりポイント：BOOLEAN 型の違い

MySQL の `BOOLEAN` は内部的に `TINYINT(1)` なので、jOOQ が `Byte` 型を生成します。PostgreSQL は ネイティブ `BOOLEAN` なので `Boolean` 型になります。

**修正が必要だった箇所：**

```java
// Before (MySQL)
.set(ANSWER_LOGS.IS_CORRECT, (byte) (request.isCorrect() ? 1 : 0))
r.getIsCorrect() != 0
DSL.sum(ANSWER_LOGS.IS_CORRECT)

// After (PostgreSQL)
.set(ANSWER_LOGS.IS_CORRECT, request.isCorrect())
r.getIsCorrect()
DSL.sum(ANSWER_LOGS.IS_CORRECT.cast(Integer.class))  // PostgreSQL は SUM(boolean) 不可
```

`SUM(boolean)` が PostgreSQL ではできないので、`.cast(Integer.class)` が必要です。これに気づかず最初ビルドエラーになりました。

## Supabase のセットアップ

### プロジェクト作成

1. https://supabase.com/dashboard で New Project
2. リージョンは **Northeast Asia (Tokyo)**
3. **Data API** と **Automatic RLS** はオフ（JDBC で直接接続するため不要）

### 接続情報の取得

ダッシュボードの **Connect** → **Direct** タブで接続文字列が確認できます。

```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

## Render のセットアップ

### バックエンド (Web Service)

1. **New → Web Service** → GitHub リポジトリを接続
2. **Runtime**: Docker
3. **Region**: Singapore（東京の Supabase に一番近い）
4. **Instance Type**: Free

**環境変数：**

| 変数 | 値 |
|------|-----|
| `DATABASE_URL` | `jdbc:postgresql://aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres` |
| `DATABASE_USERNAME` | `postgres.xxxxxxxxxxxx` |
| `DATABASE_PASSWORD` | Supabase のパスワード |
| `JWT_SECRET` | 安全なランダム文字列（256bit以上） |
| `CORS_ALLOWED_ORIGINS` | フロントの Render URL |

### ⚠️ ハマりポイント：Network is unreachable

最初、Direct connection の URL を使ったら以下のエラーで起動に失敗しました。

```
Caused by: java.net.SocketException: Network is unreachable
```

**原因：** Supabase の Direct connection は **IPv6 にしか対応していません**が、Render からは IPv6 で外部に接続できません。

**解決策：** Supabase の **Session Pooler** を使う。

Connect → **Session pooler** を選ぶと、IPv4 対応の pooler URL が取得できます。

```
# Direct (IPv6 のみ → NG)
postgresql://postgres:xxx@db.xxxxxxxxxxxx.supabase.co:5432/postgres

# Session Pooler (IPv4 対応 → OK)
postgresql://postgres.xxxxxxxxxxxx:xxx@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

注意：Session Pooler ではユーザー名が `postgres` ではなく `postgres.プロジェクトID` になります。

### ⚠️ ハマりポイント：gradle-wrapper.jar がない

Dockerfile 内で `./gradlew bootJar` を実行しますが、`.gitignore` に `*.jar` を書いていたため `gradle-wrapper.jar` がリポジトリに含まれていませんでした。

```
Error: Could not find or load main class org.gradle.wrapper.GradleWrapperMain
```

**解決策：** `.gitignore` に例外を追加。

```gitignore
*.jar
!gradle/wrapper/gradle-wrapper.jar
```

### フロントエンド (Static Site)

1. **New → Static Site** → GitHub リポジトリを接続
2. **Build Command**: `npm run build`
3. **Publish Directory**: `dist`

**環境変数：**

| 変数 | 値 |
|------|-----|
| `VITE_API_BASE_URL` | `https://onpu-api.onrender.com` |

### ⚠️ ハマりポイント：Vite の base path と Render のファイル構造

Vite で `base: '/onpu/'` を設定していると、ビルド後の HTML が `/onpu/assets/...` を参照します。しかし Render Static Site はファイルをそのまま配信するので、`/onpu/assets/...` が 404 になります。

**解決策：** Vite の出力先を `dist/onpu/` に変更。

```typescript
// vite.config.ts
export default defineConfig({
  base: '/onpu/',
  build: {
    outDir: 'dist/onpu',  // ← これを追加
  },
  // ...
})
```

Render の Publish Directory は `dist` のまま。これで URL とファイル構造が一致します。

### ⚠️ ハマりポイント：SPA ルーティング

Static Site では `index.html` 以外の URL にアクセスすると 404 になります。

**解決策：** Render の **Redirects/Rewrites** に以下を設定。

| Source | Destination | Action |
|--------|-------------|--------|
| `/onpu/*` | `/onpu/index.html` | Rewrite |

## API Base URL の環境変数化

フロントから API を呼ぶ際、ローカル開発では Vite のプロキシ、本番では直接 API の URL を叩く必要があります。

```typescript
// apiClient.ts
const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
const res = await fetch(`${apiBase}${path}`, { ...options, headers });
```

- **ローカル**: `VITE_API_BASE_URL` 未設定 → 空文字 → Vite プロキシ経由 (`/api/*` → `localhost:8080`)
- **本番**: `VITE_API_BASE_URL=https://onpu-api.onrender.com` → 直接 API を呼ぶ

## CORS の環境変数化

バックエンドの CORS 設定もハードコードではなく環境変数で制御。

```yaml
# application.yml
app:
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173}
```

```java
// SecurityConfig.java
@Value("${app.cors.allowed-origins}")
private String allowedOrigins;

config.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
```

## GitHub Pages からのリダイレクト

元々 GitHub Pages でホスティングしていたので、旧 URL からのアクセスを Render にリダイレクトします。

```yaml
# .github/workflows/deploy.yml
- name: Create redirect page
  run: |
    mkdir -p site
    cat > site/index.html <<'HTML'
    <!DOCTYPE html>
    <html>
    <head>
      <meta http-equiv="refresh" content="0; url=https://onpu.onrender.com/onpu/">
    </head>
    </html>
    HTML
```

## Free tier の注意点

| 制約 | 影響 |
|------|------|
| 15分放置でスリープ | 久しぶりのアクセスで30秒〜1分の起動待ち |
| デプロイ中ダウンタイム | 有料プランなら Zero Downtime Deploy |
| 月750時間の稼働制限 | 1サービスなら24時間稼働可能 |

## まとめ

ハマりポイントを整理すると：

1. **Supabase の Direct connection は IPv6 のみ、Render は IPv6 で外に出られない** → Session Pooler（IPv4 対応）を使う
2. **gradle-wrapper.jar が .gitignore で除外** → 例外ルールを追加
3. **Vite の base path** → `build.outDir` で出力先を合わせる
4. **SPA ルーティング** → Rewrite Rule を設定
5. **BOOLEAN 型の違い** → jOOQ 再生成後に Java コード修正が必要

全て無料で構築できるので、個人開発のデプロイ先として Render + Supabase はかなりおすすめです。
