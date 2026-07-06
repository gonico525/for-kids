# リファクタリング計画

対象: こどもひろば全体(2026-07 時点、6アプリ・約4,000行)。
背景: アプリが6個に増え、コピペ由来のドリフト(headメタの不揃い等)と、
アプリ追加手順の手作業ミス(sw.js の ASSETS 追加漏れ等)がコストになりつつある。

## ゴールと非ゴール

**ゴール**

- 7個目以降のアプリ追加を「スクリプト1回+ゲームロジック実装」だけにする
- コピペ元の「正」を1つに定め、既存アプリのドリフトを解消する
- 手作業で壊れやすい箇所(sw.js の ASSETS / CACHE_NAME)を仕組みで守る
- CLAUDE.md は肥大化させず、詳細はリファレンス/スキルに逃がして参照だけ置く

**非ゴール(やらないこと)**

- ビルドシステム・パッケージマネージャ・フレームワークの導入
- ゲームロジックの共通化(pyoko のデッキ、pitatto のタイミング判定などは各アプリ固有のまま)
- CSS テーマの共通化(色・世界観はアプリごとに意図的に変えている。共有はリセット相当まで)

## 進め方の原則

- 1コミット = 1フェーズ(またはそれ以下)。テストがないため、壊れたとき目視で戻せる粒度を保つ
- 各フェーズ完了時に確認: 4レイアウト(縦持ち / タブレット / 横2カラム / 低い横画面)+
  オフライン動作(SW 更新後にリロード)
- `shared/` にファイルを増やしたら必ず sw.js の `ASSETS` に追加し `CACHE_NAME` を上げる
  (フェーズ3のチェックスクリプト導入までは特に注意)

---

## フェーズ1: 共通ブートモジュール `shared/app-boot.js`

全6アプリに同じ形で重複しているコードを1モジュールに集約する。

- **SW 登録**: `navigator.serviceWorker.register('../../sw.js').catch(() => {})`
- **🔊/🔇 サウンドボタン**: `KidsSound.setEnabled()` の呼び出しと表示更新、
  `pageshow` での再描画まで含めて全アプリ同一の振る舞い

インターフェース案:

```js
// <script src="../../shared/sound.js"></script> の後に読み込む
// <script src="../../shared/app-boot.js"></script>
KidsApp.init({ soundButton: document.getElementById('btnSound') });
// - SW を登録する
// - soundButton が渡されたらクリック配線+pageshow 再描画を行う
// - study アプリ等でボタン位置が特殊な場合も要素を渡すだけでよい
```

やること:

1. `shared/app-boot.js` を新規作成(依存: `shared/sound.js`)
2. 6アプリ+ハブの該当コードを `KidsApp.init()` 呼び出しに置換
3. sw.js: `ASSETS` に追加、`CACHE_NAME` を上げる

## フェーズ2: 雛形テンプレート+スキャフォールドスクリプト

### 雛形 `templates/app.html`

「新アプリの正」となる自己完結 HTML。フェーズ1の `app-boot.js` を前提に、
最新の pitatto 相当の head(manifest リンク、`apple-mobile-web-app-*`、
`viewport-fit=cover`、apple-touch-icon)+ 共通 CSS リセット + 画面切替の骨組み
(`<section class="screen">` + `show(name)`)+ 🏠リンク + 4レイアウトのメディアクエリ +
`prefers-reduced-motion` フォールバックを含む。

プレースホルダ(`{{...}}` 形式):

| 変数 | 例 | 用途 |
|---|---|---|
| `{{APP_ID}}` | `pitatto` | ディレクトリ名・localStorage キー接頭辞 |
| `{{CATEGORY}}` | `games` / `study` | チケット制御の有無を分岐 |
| `{{TITLE}}` | `ぴたっとストップ` | `<title>`・apple-mobile-web-app-title |
| `{{EMOJI}}` | `🐸` | ハブのタイル絵文字・アプリ内アイコン |
| `{{DESC}}` | `はっぱのうえで タッチして とめよう` | タイルの説明文 |
| `{{THEME_COLOR}}` | `#BDE8FF` | `theme-color`・`--bg` 系変数の初期値 |

`{{CATEGORY}}` が `games` の場合のみ、`../../shared/tickets.js` の読み込みと
`KidsTickets.useOne()` ゲート+おやすみ画面を含める(テンプレート内にブロックで用意し、
スクリプトが study のときは除去する)。

### スクリプト `tools/new_app.py`(python3 標準ライブラリのみ)

ローカル開発で既に前提にしている python3 だけで動かす。依存追加なし。

```bash
python3 tools/new_app.py \
  --type games --id hoge --name "ほげキャッチ" \
  --emoji 🐙 --desc "おちてくる ほげを キャッチ!" --color "#FFE9D6"
```

このフェーズで、ハブ `index.html` の各カテゴリ `</section>` 直前に
`<!-- @new-app:games -->` / `<!-- @new-app:study -->`、sw.js の `ASSETS` 末尾に
`// @new-app:assets` のマーカーコメントを設置しておく(挙動に影響しない変更)。

スクリプトが一発でやること:

1. `games/hoge/index.html`(または `study/`)をテンプレートから生成、変数を置換
2. **ハブ `index.html` にタイルを挿入** — 上記マーカーの位置に挿入する
   (HTML パースはせずマーカー置換で堅くする)
3. **sw.js を更新** — `ASSETS` 内のマーカーの位置に
   `'./games/hoge/'` と `'./games/hoge/index.html'` を挿入し、
   `CACHE_NAME` の `kids-v(\d+)` を自動インクリメント
4. 最後に残作業チェックリストを表示(ゲームロジック実装、4レイアウト確認、
   localStorage キーを台帳に追記、など)

既存ディレクトリ・既存タイルがある場合は何もせずエラー終了(冪等性より安全側)。

### スキル `.claude/skills/new-app/SKILL.md`

「新しいアプリを追加して」と言われたときに読み込まれるスキル。内容:

- `tools/new_app.py` の実行方法と変数の決め方(絵文字・テーマ色・説明文の書き方の規約)
- games / study の判断基準(チケット消費するか)
- 生成後のチェックリスト(CLAUDE.md の「Adding a new app」の詳細版をここへ移す)

## フェーズ3: sw.js 整合性チェック `tools/check_sw.py` + CI

python3 標準ライブラリのみの小さなスクリプト:

- `games/*/`・`study/*/` の全ディレクトリについて、`ASSETS` に `dir/` と
  `dir/index.html` の両形式があるか
- `shared/*.js`・`icons/*`・ルートの `index.html` / `manifest.webmanifest` が
  `ASSETS` に含まれているか
- `ASSETS` の各エントリが実ファイルとして存在するか(消し忘れ検出)

`.github/workflows/deploy-pages.yml` のデプロイ前ステップとして実行し、
不整合ならデプロイを止める。ローカルでも `python3 tools/check_sw.py` で随時実行可。

なお「ASSETS 変更時に CACHE_NAME を上げたか」は静的には判定しづらいので
CI では扱わず、スキル/リファレンスの手順に明記するに留める(無理ない範囲)。

## フェーズ4: 既存アプリのドリフト解消

テンプレート(フェーズ2)を「正」として、既存6アプリ+ハブを寄せる:

- head メタの統一(yajirushi 等に不足している manifest リンク・
  `apple-mobile-web-app-*`・apple-touch-icon・`viewport-fit=cover` を追加)

見た目・挙動を変えないメタのみの変更に限定する。CSS 整形の統一などは
「触るついでに寄せる」方針とし、このフェーズでは一括変更しない。

## フェーズ5: レベル永続化+昇格の共通化 `shared/progress.js`

tsuginani と yajirushi で重複している「選択レベルの `localStorage` 永続化+
5⭐ストリークで自動レベルアップ」を切り出す。

```js
const prog = KidsProgress.create({ key: 'tsuginani-level', maxLevel: 4, streakToLevelUp: 5 });
prog.level        // 現在レベル(保存済みを復元)
prog.set(n)       // 手動変更(ストリークをリセット)
prog.record(star) // ⭐数を記録し、昇格したら true を返す
```

2アプリを置換して挙動が変わらないことを確認。以後の study アプリはこれを使う。
(⭐評価の**表示**は演出がアプリごとに違うため共通化しない。)

## フェーズ6: リファレンス整備と CLAUDE.md のスリム化

CLAUDE.md には「何があるか+どこを読むか」だけ残し、詳細を移す:

- `docs/reference/storage-keys.md` — localStorage キーの台帳。
  既存6キー(`kids-tickets` / `kids-sound` / `pyoko-bests` / `pitatto-bests` /
  `tsuginani-level` / `yajirushi-level`)と命名規則
  (共有は `kids-*`、アプリ固有は `<app-id>-<用途>`)、レガシーキーの移行履歴
- `docs/reference/shared-modules.md` — `shared/` 各モジュールの API と使い方
  (tickets / sound / app-boot / progress)
- 新アプリ追加手順 → `.claude/skills/new-app/SKILL.md`(フェーズ2)へ

CLAUDE.md 側は「Adding a new app」セクションを数行に縮め、スキルとスクリプトへの
参照に置き換える。各アプリのゲーム仕様の説明は現状維持(これは肥大化ではなく本体)。

## フェーズ7(任意): スモークテスト

Playwright で「ハブ+全6アプリを開いて JS エラー(pageerror)が出ないこと」だけを
確認する1ファイルのスクリプト `tools/smoke.mjs`。ビルド不要のまま置けて、
共通化リファクタ時の安全網になる。CI に組み込むかは運用してから判断。

---

## 実施順序と依存関係

| 順 | フェーズ | 依存 | リスク |
|---|---|---|---|
| 1 | 共通ブート `app-boot.js` | なし | 低(置換のみ、全アプリ要確認) |
| 2 | 雛形+スクリプト+スキル+マーカー設置 | 1 | 低(マーカー以外は既存コードに触らない) |
| 3 | sw.js チェック+CI | なし | 低 |
| 4 | ドリフト解消 | 2 | 低(メタのみ) |
| 5 | `progress.js` | 1 | 中(tsuginani/yajirushi の挙動確認必須) |
| 6 | リファレンス+CLAUDE.md | 2 | なし |
| 7 | スモークテスト(任意) | なし | なし |
