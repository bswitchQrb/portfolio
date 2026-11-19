export const SITE = {
  name: "bswitchQrb",
  role: "Product Engineer",
  location: "Tokyo, Japan",
  hometown: "Osaka, Japan",
  company: "Project Management SaaS since 2024",
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
      { title: "MySQL のバージョンアップ", desc: "開発基盤のバージョンアップ作業を担当" },
      { title: "グループリーダー", desc: "3年目からリーダーに。進捗・工数の管理、コードレビュー、新人のオンボーディングを担当" },
      { title: "新機能の開発", desc: "要件定義からリリースまで、新機能の開発を継続して担当" },
      { title: "Claude Code の活用", desc: "チームの開発フローに AI ツールを取り入れています" },
    ],
    stack: ["Java", "Spring Boot", "TypeScript", "React", "MySQL", "AWS", "Docker", "Terraform", "Playwright", "Rsbuild", "Claude Code"],
  },
] as const;

export const CERTIFICATIONS = [
  { date: "2026.09", name: "AWS Certified AI Practitioner" },
] as const;
