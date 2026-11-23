export const SITE = {
  name: "bswitchQrb",
  role: "Product Engineer",
  location: "Tokyo, Japan",
  hometown: "Osaka, Japan",
  company: "Project Management SaaS Company",
  interests: ["Web Development", "Cloud / AWS", "AI / Claude", "Docker"],
  hobbies: ["Ramen", "Onsen", "Sauna"],
  github: "https://github.com/bswitchQrb",
  zenn: "https://zenn.dev/b2",
  avatarUrl: "https://avatars.githubusercontent.com/u/77537912?v=4",
} as const;

export const EXPERIENCE = [
  {
    period: "2024.04 — Present",
    company: "Project Management SaaS Company",
    roles: ["Product Engineer", "Group Leader"],
    summary:
      "自社プロダクトのプロジェクト管理SaaSを開発しています。最初は不具合修正や機能追加の実装から始めて、今はグループリーダーとして要件定義やレビューも担当しています。",
    phases: ["要件定義", "仕様設計", "DB設計", "実装", "コードレビュー", "テスト・QA", "リリース", "運用保守"],
    highlights: [
      { title: "ビルドツールの移行", desc: "webpack から Rsbuild に移行。コードを直してから画面に反映されるまでがかなり速くなりました" },
      { title: "E2E テストの導入", desc: "Playwright を入れて、手動で確認していたテストの一部を自動化" },
      { title: "グループリーダー", desc: "3年目からリーダーに。進捗・工数の管理、コードレビュー、新人のオンボーディングを担当" },
      { title: "Claude Code の活用", desc: "チームの開発フローに AI ツールを取り入れています" },
    ],
    stack: ["Java", "Spring Boot", "TypeScript", "React", "MySQL", "AWS", "Docker", "Terraform", "Playwright", "Rsbuild", "Claude Code"],
  },
] as const;

export const CERTIFICATIONS = [
  { date: "2026.09", name: "AWS Certified AI Practitioner" },
] as const;

/** 個人開発の小さめの作品（Projects の下段に並べる） */
export const SIDE_PROJECTS = [
  {
    name: "SwitchBot Panel",
    tagline: "SwitchBot の家電を PC のブラウザから操作する、セルフホストの操作パネル",
    tech: ["JavaScript", "Node.js", "SwitchBot API", "Tailscale"],
    links: [{ label: "GitHub", href: "https://github.com/bswitchQrb/switchbot-panel" }],
    // デモモード（ダミーデータ）で撮影した画面（public/ からのパス）。自宅のデバイスは写さない
    screenshot: { src: "/images/projects/switchbot-panel.png", alt: "照明・エアコン・扇風機のタイルと、室温・湿度・施錠状態を並べた操作パネル" },
  },
  {
    name: "Tokyo Photo Map",
    tagline: "写真を選ぶだけで、行った区や市にスタンプが押される東京のぬりつぶしマップ",
    tech: ["TypeScript", "React", "d3-geo", "IndexedDB", "Vitest", "GitHub Pages"],
    links: [
      { label: "Live Demo", href: "https://bswitchqrb.github.io/tokyo-photo-map/" },
      { label: "GitHub", href: "https://github.com/bswitchQrb/tokyo-photo-map" },
    ],
    // サンプルデータで撮影した画面（public/ からのパス）
    screenshot: { src: "/images/projects/tokyo-photo-map.png", alt: "塗られた東京の地図と、23区・多摩の市のスタンプ帳" },
  },
  {
    name: "Onpu Quiz Bot",
    tagline: "毎朝 1 問、五線譜の音符を当てる Discord bot",
    tech: ["TypeScript", "Cloudflare Workers", "D1", "Discord API", "VexFlow"],
    links: [{ label: "GitHub", href: "https://github.com/bswitchQrb/onpu-quiz-bot" }],
    // Discord での実際の画面（public/ からのパス）。招待リンクは公開しない方針
    screenshot: { src: "/images/projects/onpu-quiz-bot.png", alt: "Discord に投稿された五線譜の問題と、ド〜シの回答ボタン、回答結果" },
  },
  {
    name: "dev-alert-bot",
    tagline: "個人開発の運用アラートを Discord に届ける bot",
    tech: ["TypeScript", "Cloudflare Workers", "KV", "Cron Triggers"],
    links: [{ label: "GitHub", href: "https://github.com/bswitchQrb/dev-alert-bot" }],
  },
] as const;
