---
title: "古い Intel MacBook を、iPad・iPhone・Windows PC から Claude Code を使う開発マシンにした記録"
description: "Homebrew が使えない古い Intel MacBook を、mise・Tailscale・herdr・Amphetamine で整えて、iPad・iPhone・Windows PC から SSH で Claude Code を使える開発マシンにしました。"
pubDate: 2026-11-19
tags: ["Mac", "Claude Code", "Tailscale", "mise", "SSH"]
---

手元にある Intel の MacBook Air を、**外出先の iPad や iPhone、家の Windows PC から Claude Code を動かすための開発マシン**として整えました。

もともと、Windows と MacBook で開発環境が分かれているのが地味にいやでした。ゲームは Windows でやるので、モニターやキーボードは Windows につないだまま。MacBook で開発しようと思うと、そのたびにモニターをつなぎ直す必要がありました。MacBook を「どこからでも SSH でつなげる開発マシン」にしてしまえば、Windows の前に座ったままでも、外出先の iPad からでも、同じ環境で作業できます。

Claude Code と相談しながら 1 日で進めたのですが、Homebrew が使えなかったり、蓋を閉じるとつながらなくなったり、iPhone で画面が崩れたりと、いろいろ詰まりました。そのぶん「これは便利！」という発見も多かったので、まとめておきます。

## 完成した構成

![iPad・iPhone・Windows PC から Tailscale 経由で Mac につなぐ全体の構成図](/images/blog/intel-mac-ipad-claude-code-setup/architecture.png)

### 使ったもの

| 役割 | ツール |
|---|---|
| ツールのバージョン管理 | mise（Java・Node・Python・gh・tmux・herdr） |
| ターミナル | Ghostty |
| SSH が切れても作業を続ける | herdr（AI エージェント向けのターミナル作業場所） |
| 外から Mac につなぐ | Tailscale（個人利用は無料） |
| iPad / iPhone の SSH クライアント | Termius |
| Windows PC の SSH クライアント | Windows Terminal + OpenSSH（Windows 標準の `ssh`。見た目は Ghostty に揃えた） |
| iPad / iPhone のブラウザ | Chrome（開発中のアプリや記事のプレビューを見る） |
| 蓋を閉じてもスリープしない | Amphetamine + Amphetamine Enhancer |
| 設定の管理 | dotfiles リポジトリ（シンボリックリンク） |

## 1. Homebrew が使えない問題 → mise に寄せる

最初の壁は Homebrew でした。この Mac は macOS 14（Sonoma）で、Homebrew では **macOS 14 はサポート対象外（Tier 3）** です。さらに、古い Xcode 13 を参照していたので「Xcode が古い」と言われて、そもそも動きませんでした。

やったことは次のとおりです。

- Command Line Tools 15.3 を入れて、`xcode-select` の参照先を古い Xcode.app から切り替える
- macOS は**メジャーアップグレードはせず**、14.2.1 → 14.8.9 のマイナーアップデートだけ
- ツールは Homebrew ではなく **mise** で入れる方針にする

mise は公式のインストーラーで `~/.local/bin/mise` に入るので、Homebrew がなくても使えます。

```bash
curl https://mise.run | sh
```

設定は dotfiles で管理しています。

<div class="code-title">mise/config.toml</div>

```toml
[tools]
java = "temurin-17"
node = "22"
python = "3.14"
gh = "latest"
tmux = "latest"
herdr = "latest"
```

`mise ls` で、入っているものがひと目でわかります。

```
gh      2.105.0            ~/.config/mise/config.toml  latest
herdr   0.9.5              ~/.config/mise/config.toml  latest
java    temurin-17.0.21+9  ~/.config/mise/config.toml  temurin-17
node    22.23.5            ~/.config/mise/config.toml  22
python  3.14.10            ~/.config/mise/config.toml  3.14
tmux    3.8                ~/.config/mise/config.toml  latest
```

`node = "22"` と書いておくと、`mise upgrade` で 22 系の新しい版にだけ上がります。23 に勝手に上がることはありません。nodebrew・pyenv・手で置いた JDK がバラバラに入っていた状態から、これ 1 つにまとめられたのがうれしかったです。

### ついでに片付けたもの

- **Anaconda（4GB）**：`.zshrc` の `conda initialize` のせいで、シェルを開くたびに base 環境が有効になっていました。ブロックを外して本体ごと削除しました
- **`/opt/homebrew` の PATH**：Apple Silicon 用のパスが残っていました。Intel Mac には存在しないパスなので消しました

<aside class="callout">

**ハマりポイント：`alias nc='npm ci'`**

dotfiles に `nc` を `npm ci` にする alias があって、netcat（`nc`）でポートの疎通を確認しようとしたら `npm ci` が走りました。標準コマンドと同じ名前の alias は危ないので、消しました。

</aside>

## 2. Ghostty と herdr

### Terminal.app から Ghostty へ

最初は Terminal.app を使っていましたが、herdr や Claude Code の色がどうも見にくい。原因は、**Terminal.app が truecolor（24bit カラー）に対応していない**ことでした。Ghostty に替えて、テーマを Catppuccin Mocha にしたら一気に見やすくなりました。

<div class="code-title">ghostty/config</div>

```ini
theme = Catppuccin Mocha
font-size = 14
```

### herdr：SSH が切れても作業を続ける

[herdr](https://herdr.dev/) は、tmux のように SSH が切れてもセッションが残るうえに、「どのエージェントが作業中で、どれが入力待ちか」がわかるターミナル作業場所です。

```bash
herdr integration install claude   # Claude Code と連携
```

これで、iPad から SSH → `herdr` → `claude` で作業して、iPad がスリープして SSH が切れても、もう一度 `herdr` を打てば続きから使えます。

面白かったのが、**作業中の Claude Code の会話を、そのまま別のターミナルに引き継げた**ことです。Claude Code の会話はディレクトリごとに保存されているので、herdr の中で同じディレクトリから `claude --resume <セッション ID>` すれば、続きから再開できます。Terminal.app で始めた会話を herdr の中に移し、さらに Ghostty に移しました。

<aside class="callout">

**ハマりポイント：herdr の中で herdr を起動してしまう**

herdr の中で動いているターミナルからさらに `herdr` を打つと、入れ子になってエラーになります。新しいターミナル（Ghostty）のウィンドウで起動し直す必要がありました。

</aside>

## 3. Tailscale で外から Mac につなぐ

Tailscale は、自分の端末どうしを `100.x.y.z` の私設ネットワークでつなぐ VPN です。

- 個人利用（Personal プラン）は無料
- Mac・iPad・iPhone・Windows PC の全部に Tailscale のアプリを入れて、同じアカウントでログインするだけ
- tailnet 宛ての通信だけが Tailscale を通ります（exit node を使わない限り）。iPhone や iPad で常時オンにしても、ふつうのネット通信には影響しません
- 管理画面で各端末の **Key expiry を無効**にしておくと、定期的な再認証で突然つながらなくなるのを防げます

<aside class="callout">

**ハマりポイント：100.64.x.x は Tailscale の IP とは限らない**

Mac の `en0` に `100.64.2.31` が付いていたので、Tailscale は動いていると思い込んでいました。実際には回線側の CGNAT のアドレスで、Tailscale は `Stopped` のままでした。CLI で状態を確認するのが確実です。

```bash
/Applications/Tailscale.app/Contents/MacOS/Tailscale status
/Applications/Tailscale.app/Contents/MacOS/Tailscale up
```

</aside>

<aside class="callout callout--alert">

**FileVault がオンだと自動ログインできない**

再起動するとログイン画面で止まり、ログイン項目の Tailscale も起動しません。つまり、**外出中に再起動すると帰るまでつながりません**。自動ログインで避けようとしましたが、FileVault がオンだと使えません。ノート PC なので、FileVault（ディスクの暗号化）を優先しました。

</aside>

## 4. SSH を鍵認証だけにする

iPad の Termius で ED25519 の鍵を作って、「Export to Host」で Mac の `~/.ssh/authorized_keys` に登録しました。これで毎回パスワードを入れなくてよくなります。

そのあと、パスワードでのログインを止めました。macOS 14 の `sshd_config` は `/etc/ssh/sshd_config.d/*` を読み込むので、そこにファイルを足すだけです。

```bash
printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\n' \
  | sudo tee /etc/ssh/sshd_config.d/200-nopassword.conf
```

macOS の sshd は接続のたびに起動するので、再起動はいりません。パスワードでつなごうとすると、ちゃんと弾かれます。

```
$ ssh -o PubkeyAuthentication=no user@100.x.y.z
user@100.x.y.z: Permission denied (publickey).
```

<aside class="callout">

**ハマりポイント：パスワードを止めると Termius の「Export to Host」が使えなくなる**

あとから iPhone の鍵を Export しようとしたら、つながりませんでした。Export to Host は**パスワードでログインして**鍵を書き込む仕組みだからです。iPhone の公開鍵をコピーして、Mac の `authorized_keys` に手で追記して解決しました。順番としては「全端末の鍵を登録してから、パスワードを止める」がおすすめです。

</aside>

### Windows PC からもつなぐ

Windows PC からは、**Windows 標準の OpenSSH を Windows Terminal で**使っています。追加で何かを入れる必要はありません。

まず、Windows の PowerShell で鍵を作ります。

```powershell
ssh-keygen -t ed25519
```

`C:\Users\<ユーザー名>\.ssh\id_ed25519.pub` に公開鍵ができます。この時点で Mac はもうパスワードでのログインを止めていたので、`ssh-copy-id` のような「パスワードでログインして鍵を書き込む」方法は使えません。iPhone のときと同じく、公開鍵の中身をコピーして、iPad からの SSH で Mac の `~/.ssh/authorized_keys` に手で追記しました。

あとは Windows Terminal からつなぐだけです。

```powershell
ssh user@100.x.y.z
```

Mac 側で `tailscale status` を見ると、Windows PC が中継サーバーを通さない **direct** でつながっていることがわかります。

```
100.x.y.z  windows-pc  user@  windows  active; direct [...]:41641, ...
```

Windows Terminal は truecolor に対応しているので、herdr や Claude Code の色もそのままきれいに出ます。モニターやキーボードは Windows につないだままで、Mac の開発環境を使えるようになりました。

#### Windows Terminal を Ghostty と同じ見た目にする

Windows でも Ghostty を使いたかったのですが、2026 年 11 月の時点で **Ghostty の公式の Windows 版はまだありません**（有志の移植版はあります）。Windows からは SSH するだけなので、ターミナルは Windows Terminal のままにして、**見た目を Mac の Ghostty に揃える**ことにしました。

Windows Terminal の「設定 → JSON ファイルを開く」で `settings.json` を開き、`schemes` に Catppuccin Mocha の配色を足します。

<div class="code-title">settings.json（schemes の中）</div>

```json
{
  "name": "Catppuccin Mocha",
  "background": "#1E1E2E",
  "foreground": "#CDD6F4",
  "cursorColor": "#F5E0DC",
  "selectionBackground": "#585B70",
  "black": "#45475A",   "brightBlack": "#585B70",
  "red": "#F38BA8",     "brightRed": "#F38BA8",
  "green": "#A6E3A1",   "brightGreen": "#A6E3A1",
  "yellow": "#F9E2AF",  "brightYellow": "#F9E2AF",
  "blue": "#89B4FA",    "brightBlue": "#89B4FA",
  "purple": "#F5C2E7",  "brightPurple": "#F5C2E7",
  "cyan": "#94E2D5",    "brightCyan": "#94E2D5",
  "white": "#BAC2DE",   "brightWhite": "#A6ADC8"
}
```

さらに、`profiles` の `list` に **Mac につなぐ専用のプロファイル**を作りました。フォントは Ghostty の標準と同じ JetBrains Mono です。

<div class="code-title">settings.json（profiles.list の中）</div>

```json
{
  "name": "MacBook",
  "commandline": "ssh user@my-macbook",
  "colorScheme": "Catppuccin Mocha",
  "font": { "face": "JetBrains Mono", "size": 12 },
  "padding": "12",
  "opacity": 92,
  "useAcrylic": true
}
```

`my-macbook` のところは、Tailscale の管理画面に出ている Mac の端末名です。Tailscale の **MagicDNS** がオンなら、IP アドレスの代わりに端末名でつなげます。

これで、タブの「∨」から「MacBook」を選ぶだけで、Mac と同じ色の画面で SSH できます。

<aside class="callout">

**ハマりポイント：「次のフォントが見つかりません: JetBrains Mono」**

JetBrains Mono は Windows に最初から入っていません。[公式サイト](https://www.jetbrains.com/lp/mono/)から zip をダウンロードして、`fonts/ttf` の中のファイルをインストールし、Windows Terminal を開き直したら直りました。入れるのが面倒なら、Windows Terminal に付いてくる `Cascadia Code` でも十分きれいです。

</aside>

<aside class="callout">

**ハマりポイント：herdr の中だと Ctrl + ホイールで文字の大きさが変わらない**

herdr はマウスの入力を自分で受け取るので、ホイールの動きが Windows Terminal ではなく herdr に渡ってしまいます。キーボードの `Ctrl` + `=` / `Ctrl` + `-` / `Ctrl` + `0` なら Windows Terminal が先に処理するので、herdr の中でも文字の大きさを変えられます。

</aside>

ちなみに、Termius の「接続したら自動で `herdr` を実行する」Startup Snippet は有料プランの機能でした。なので、接続したら手で `herdr` と打っています。

## 5. 蓋を閉じても使えるようにする

外から使うなら、Mac の蓋を閉じたままでも動いてほしいところです。

最初は `sudo pmset -a disablesleep 1` でスリープを完全に止めていました。これだと蓋を閉じても動きますが、**電源を抜いてカバンに入れてもスリープしません**。熱くなるし、バッテリーも減ります。

`disablesleep` には「電源につないでいるときだけ」という設定がないので、**Amphetamine**（App Store・無料）に切り替えました。

```bash
sudo pmset -a disablesleep 0   # 元に戻す
```

Amphetamine では、次のトリガーを作りました。

- 条件：電源アダプターにつながっているときのみ
- 「ディスプレイのスリープを許可」：オン
- 「ディスプレイを閉じたとき、システムのスリープを許可」：**オフ**

さらに [Amphetamine Enhancer](https://github.com/x74353/Amphetamine-Enhancer) の **Closed-Display Mode Fail-Safe** を入れました。閉じたまま動いているときに何かあったら、自動でスリープさせてくれる安全装置です。

これで、電源につないでいるかどうかで動きが自動で切り替わるようになりました。

![電源ありなら蓋を閉じても動き続け、バッテリーだけならふつうにスリープする](/images/blog/intel-mac-ipad-claude-code-setup/sleep.png)

蓋を閉じた状態で `ioreg` を見ると、ちゃんと「閉じてもスリープしない」状態になっています。

```bash
$ ioreg -r -k AppleClamshellState -d 4 | grep AppleClamshell
  |   "AppleClamshellCausesSleep" = No
  |   "AppleClamshellState" = Yes
```

<aside class="callout">

**ハマりポイント：蓋を閉じても画面が「点灯中」のまま**

蓋を閉じても、macOS の上では内蔵ディスプレイが点灯中の扱いでした。確実に暗くするために、「システム設定 → ロック画面 → 電源アダプタ接続時に使用していない場合はディスプレイをオフにする」を **2 分**にしました。SSH での操作は「使用中」に数えられないので、ちゃんと消えます。

</aside>

## 6. iPhone で herdr の右側が切れる

iPhone 18 Pro から herdr を開いたら、**画面の右側がはみ出して読めません**でした。

調べると、iPhone の縦向きの横幅は **74 文字ぶん**でした。herdr がスマホ向けの 1 列レイアウトに切り替わるのは、横幅が `mobile_width_threshold`（既定は **64**）以下のときだけです。74 だと PC 向けのレイアウトのままで、**サイドバーを閉じていても**右側がはみ出していました。

PC 向けのレイアウトでなぜはみ出すのかまでは、突き止められていません。このとき Mac の Ghostty からも同じセッションにつないでいたので、後で書く「最後に操作した端末の幅に合わせる」動きが関係していたのかもしれません。いずれにしても、スマホ向けのレイアウトに切り替えたら直りました。

![iPhone で herdr を開いたときの Before / After。PC 向けレイアウトでは本文が画面の外にはみ出し、スマホ向けの 1 列レイアウトでは右端まで読める](/images/blog/intel-mac-ipad-claude-code-setup/iphone-layout.png)

<div class="code-title">~/.config/herdr/config.toml</div>

```toml
[ui]
mobile_width_threshold = 80
```

```bash
herdr config check
herdr server reload-config
```

これで iPhone でも 1 列で読めるようになりました。iPad Pro 11 インチは 96〜140 文字ぶんあるので、今までどおり PC 向けのレイアウトになります。

なお、herdr は複数の端末から同時につないでいると、**最後に操作した端末の幅に合わせます**。Mac や Windows PC で何か打つと、iPhone 側がその端末の幅になってはみ出すことがあるので注意です。

## 7. 細かいけど効いたこと

- **tmux に `set -g mouse on`**：iPad でスクロールやペインの選択がタップでできる
- **macOS のファイアウォール**：オンのままでも、Tailscale と署名済みの node（開発元の署名あり）は自動で許可されるので、SSH も開発サーバーも問題なく使えた
- **Claude Code の許可リスト**：`/fewer-permission-prompts` で、よく使う読み取り専用のコマンド（`mise ls`、`defaults read` など）を許可リストに入れて、確認のポップアップを減らした
- **設定は全部 dotfiles に**：mise・Ghostty・tmux・herdr の設定を dotfiles に入れて、`install.sh` でシンボリックリンクを張るようにした

## まとめ

古い Intel Mac でも、

- Homebrew の代わりに **mise**
- 外からつなぐのは **Tailscale + SSH の鍵認証**
- 作業場所は **herdr**
- 蓋を閉じたまま動かすのは **Amphetamine**

で、iPad や iPhone、Windows PC から Claude Code を動かせる環境になりました。

いちばん面白かったのは、**この作業自体を Claude Code と一緒に進めて、途中で会話ごと Terminal.app → herdr → Ghostty → iPad と移しながら続けられた**ことです。最後は iPhone から SSH で Claude Code に話しかけて、Mac の蓋を閉じたまま設定を確認してもらっていました。

外出先からでも、ちょっとした修正やレビューなら iPhone だけでできるようになりました。家では Windows の前に座ったまま、モニターをつなぎ直さずに Mac で開発できるので、かなり快適です 📱🖥️
