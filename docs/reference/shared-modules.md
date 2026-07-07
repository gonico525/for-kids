# shared/ モジュールリファレンス

各アプリから `<script src="../../shared/〜.js">` で読み込む共有モジュールの API。
**`shared/` にファイルを増やしたら sw.js の ASSETS に追加して CACHE_NAME を上げること**
(`python3 tools/check_sw.py` で追加漏れは検出できるが、CACHE_NAME は手動)。

## tickets.js — `window.KidsTickets`(🎈チケット)

1日にあそべる回数の共有ストア。games カテゴリ全体で合算。study では使わない。
読み書きは毎回 localStorage(`kids-tickets`)に対して行うのでページ間で状態がズレない。

| API | 説明 |
|---|---|
| `remaining()` | 今日の残り回数(0 以上) |
| `limit()` | 1日の上限(1–5、既定 3) |
| `useOne()` | 1枚消費。残りがなければ `false` を返して消費しない。**ゲームは毎ラウンド開始時にこれでゲートし、`false` ならおやすみ画面を出す** |
| `setLimit(n)` | 上限を変更(ハブの保護者ゲートから使う) |
| `resetToday()` | 今日の使用数をリセット(保護者ゲートから使う) |

## sound.js — `window.KidsSound`(効果音)

WebAudio 合成の効果音。音声素材は使わない。ON/OFF は `kids-sound` で全アプリ共通。

| API | 説明 |
|---|---|
| `tone(freq, dur, vol, type?, when?)` | 単音を鳴らす。`when` 秒後から `dur` 秒、波形 `type`(既定 sine)。組み合わせてメロディにする |
| `enabled()` / `setEnabled(on)` | ミュート設定の取得・変更 |
| `ensure()` | AudioContext を用意し suspended なら resume |

**注意**: AudioContext の生成・復帰はユーザー操作(タップ等)の中で呼ばれる必要がある。
`tone()`/`ensure()` が resume を試みるので、最初の再生をタップハンドラ内から行えばよい。

## app-boot.js — `window.KidsApp`(共通起動処理)

```js
KidsApp.init({ soundButton: $('btn-sound'), onSoundOn: sGood });
```

- Service Worker を登録する(sw.js の URL はスクリプト自身の位置から解決するので、
  ハブでもアプリでも同じ呼び出しでよい)。引数なし `KidsApp.init()` は SW 登録のみ
- `soundButton` を渡すと 🔊/🔇 のクリック配線と表示更新(bfcache 復帰の
  `pageshow` 含む)を行う。`onSoundOn` は OFF→ON にしたとき鳴らす確認音

## emoji.js — `window.KidsEmoji`(絵文字フォールバック)

Fire HD 10 など絵文字フォントが古い端末では、新しい Unicode 世代の絵文字が豆腐(□/×)になる。
canvas 描画を非文字(絶対に存在しない文字)の描画結果と比較して対応可否を実行時に判定し、
非対応なら古い世代の絵文字に差し替える。

```js
// キー = 使いたい絵文字、値 = 出なかったときの代役(Unicode 6 世代から選ぶこと)
const EMOJI = KidsEmoji.fix({ '🪷': '🍀' });
pad.textContent = EMOJI['🪷'];   // 対応端末では 🪷、非対応端末では 🍀
```

| API | 説明 |
|---|---|
| `fix(map)` | 各キーの対応可否を判定。非対応キーは **body 内の静的テキストを置換**した上で、実際に使う絵文字の対応表(`{元: 使う絵文字}`)を返す。JS から動的に挿す絵文字は必ず戻り値を経由すること |
| `supported(ch)` | その絵文字を表示できるなら `true`。判定できない環境では `true` に倒す |

**注意**: `fix()` の DOM 置換は呼んだ時点の body が対象なので、ページ末尾の
インラインスクリプトの先頭(DOM 構築後)で呼ぶ。現在使っている絵文字の世代の目安:
🟡🟢🧍(Emoji 12)・🪨(Emoji 13)・🪷(Emoji 14)は Fire OS 7(2019年世代 Fire HD)で出ない。
🦶🧮🧸(Emoji 11)はさらに古い端末で出ない。

## progress.js — `window.KidsProgress`(レベル進行)

レベル選択の永続化+⭐ストリークによる自動レベルアップ。レベル制の study アプリで使う。

```js
const progress = KidsProgress.create({
  key: 'tsuginani-level',   // localStorage キー(<app-id>-level)
  maxLevel: 4,
  streakToLevelUp: 5,       // 省略時 5
  onChange: (lv, streak) => { /* ⭐表示とレベルUIの更新 */ },
});
```

| API | 説明 |
|---|---|
| `level` / `streak` | 現在レベル(保存値を復元)/ 現在ストリーク |
| `setLevel(n)` | 手動切替。1〜maxLevel にクランプして保存し、ストリークを 0 に |
| `addStar()` | クリアを1回記録 |
| `resetStreak()` | ミス時に呼ぶ |
| `canLevelUp()` | ストリークが規定数に達していて、かつ最大レベル未満なら `true` |
| `levelUp()` | 1つ上のレベルへ(保存+ストリーク 0)。昇格演出のあとに呼ぶ |

典型的な流れ: クリア時に `addStar()` → `canLevelUp()` なら 🌟演出して `levelUp()`。
ミス時は `resetStreak()`。UI 更新はすべて `onChange` に書く。
