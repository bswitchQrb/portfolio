---
title: "ポートフォリオを GitHub Pages から Render ＋ 独自ドメインに引っ越した"
description: "Astro のポートフォリオと React のアプリを、bee2.dev のもとで 1 つのドメインにまとめました。Render のリライトでハマったところと、引っ越しのついでに整えた CI・Dependabot・自動マージについてまとめます。"
pubDate: 2026-11-22
tags: ["Render", "Astro", "Cloudflare", "GitHub Actions"]
draft: true
---

ポートフォリオ（Astro）は GitHub Pages、個人開発の「おんぷクイズ」（React + Vite）は Render と、置き場所がバラバラでした。独自ドメイン `bee2.dev` を取ったのをきっかけに、1 つのドメインにまとめました。

## やりたかったこと

| URL | 中身 |
|---|---|
| `https://bee2.dev/` | `/portfolio/` へリダイレクト |
| `https://bee2.dev/portfolio/` | ポートフォリオ（Astro） |
| `https://bee2.dev/blog/` | ブログ（Astro） |
| `https://bee2.dev/onpu/` | おんぷクイズ（React SPA） |

おんぷクイズはすでに Render の Static Site として動いていて、`onpu.bee2.dev` も設定済みでした。なので、**ポートフォリオ用の Render サービスを 1 つ作って、`/onpu/` 以下は既存の onpu サービスへリライトする**構成にしました。

```
bee2.dev ──▶ Render: portfolio (Static Site)
               ├─ /             → 301 /portfolio/
               ├─ /portfolio/*  → 自分のファイル
               ├─ /blog/*       → 自分のファイル
               └─ /onpu/*       → rewrite ──▶ Render: onpu (Static Site)
```

## Astro の設定

最初は `base: '/portfolio'` と `outDir: './dist/portfolio'` で `/portfolio/` の下にだけビルドしていましたが、あとでブログを `/blog/` に足すときに、ルートからビルドする形に変えました。

設定は `site` だけです。

```js
// astro.config.mjs
export default defineConfig({
  site: 'https://bee2.dev',
});
```

ページを `src/pages/portfolio/` と `src/pages/blog/` に置くと、ビルド後は `dist/portfolio/` と `dist/blog/` になります。Render の Publish Directory を `dist` にしておけば、ファイルの配置と URL がそのまま一致します。

```
src/pages/
├─ portfolio/index.astro  → /portfolio/
└─ blog/                  → /blog/
```

`site` を正しく設定しておけば、canonical や OGP の URL は `Astro.site` から組み立てられるので、ドメインを変えても追従してくれます。

## Render のリライトでハマったこと

### `/onpu` → `/onpu/` のリダイレクトが保存できない

末尾スラッシュなしで来たときのために `/onpu` → `/onpu/` のリダイレクトを入れようとしたら、こう怒られました。

```
rule 1: route is invalid: ... source and destination must be different
```

Render はルールを比較するときに末尾のスラッシュを正規化するようで、この 2 つは「同じパス」とみなされます。代わりに `/onpu` も直接 onpu サービスへリライトすることで解決しました。

| Source | Destination | Action |
|---|---|---|
| `/` | `/portfolio/` | Redirect |
| `/onpu` | `https://onpu.onrender.com/onpu/` | Rewrite |
| `/onpu/*` | `https://onpu.onrender.com/onpu/*` | Rewrite |

### Redirect と Rewrite を間違えた

最初、`/onpu` のルールを Redirect で保存してしまい、`/onpu/` にアクセスしても中身が表示されず、301 が返るようになってしまいました。外部のサービスに中継したいときは **Rewrite** です。

### セキュリティヘッダーは中継先で付ける

portfolio サービスに `X-Frame-Options` などのヘッダーを設定しても、リライトした `/onpu/` 以下には付きませんでした。外部リライトでは中継先（onpu サービス）のレスポンスヘッダーがそのまま返るので、onpu サービス側にも同じヘッダーを設定しています。

### SPA のフォールバックは `/onpu/index.html` に向ける

onpu サービスの SPA 用リライトが `/onpu/* → /index.html` になっていて、古いビルドの `index.html` が返ってくる問題がありました。Vite の `base: '/onpu/'` に合わせて `/onpu/* → /onpu/index.html` に直しています。

## DNS（Cloudflare）

- apex（`bee2.dev`）は CNAME フラットニングで Render を向ける
- プロキシは OFF（DNS only）。Render 側で証明書を発行するため
- `www` は Render 側で apex へリダイレクト

ドメインを追加した直後は Render の画面で「Verification Error」と出ましたが、DNS の反映を待ってから再検証したら通りました。また、`portfolio-xxxx.onrender.com` のサブドメインは無効化して、アクセスを独自ドメインに一本化しています。

## 古い URL の後始末

GitHub Pages の `bswitchqrb.github.io/onpu/` には、新しい URL へ飛ばすリダイレクト用のページを置きました。README やプロフィールのリンクも、すべて `bee2.dev` に差し替えています。

## ついでに整えたこと

引っ越しのついでに、リポジトリの運用まわりも整えました。

- **CI 必須化**：GitHub の Rulesets で、main へのマージにはビルドの成功を必須にした
- **Dependabot**：毎週月曜の朝に、minor / patch をまとめた PR が来るように設定
- **自動マージ**：PR を作ったら手で auto-merge を予約しておき、CI が通ったら自動でマージ。メジャー更新だけは手で確認する

## まとめ

- Astro はルートからビルドして、`/portfolio/` と `/blog/` をページのパスで分けると、Render の Static Site にそのまま載せられる
- Render の外部リライトを使うと、別サービスを同じドメインのパスにぶら下げられる
- ただし、末尾スラッシュの正規化と、ヘッダーが中継先のものになる点には注意

<!-- TODO: 実際にハマった時間や感想を自分の言葉で足す -->
