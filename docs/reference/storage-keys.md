# localStorage キー台帳

全アプリが使う localStorage キーの一覧。**キーを追加・変更したら必ずここに追記する。**

## 命名規則

- 全アプリ共有のもの: `kids-<用途>`
- アプリ固有のもの: `<app-id>-<用途>`(app-id はディレクトリ名。例: `pyoko-bests`)

## 共有キー

| キー | 形式 | 用途 | 読み書きする場所 |
|---|---|---|---|
| `kids-tickets` | JSON `{date, used, limit}` | 🎈チケット(1日にあそべる回数、games 全体で合算) | `shared/tickets.js` のみ |
| `kids-sound` | `'0'`=OFF / それ以外=ON | 🔊/🔇 の設定(全アプリ共通) | `shared/sound.js` のみ |

## アプリ固有キー

| キー | 形式 | 用途 |
|---|---|---|
| `pyoko-bests` | JSON(レベル別ハイスコア) | ぴょこっとタッチのベスト記録 |
| `pitatto-bests` | JSON(レベル別ベスト) | ぴたっとストップのメダル・ベスト記録 |
| `tsuginani-level` | 数値文字列 1–4 | つぎはな〜に？の選択レベル(`shared/progress.js` 経由) |
| `yajirushi-level` | 数値文字列 1–4 | やじるしめいろの選択レベル(`shared/progress.js` 経由) |

## レガシーキーの移行履歴

| 旧キー | 移行先 | 移行処理 |
|---|---|---|
| `pyoko-tickets` | `kids-tickets` | `shared/tickets.js` が初回読み取り時に移行して旧キーを削除 |
