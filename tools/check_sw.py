#!/usr/bin/env python3
"""sw.js の ASSETS とリポジトリの実体が一致しているか確認する(標準ライブラリのみ)。

チェック内容:
  - games/*/ と study/*/ の全アプリに dir/ と dir/index.html の両エントリがあるか
  - shared/*.js・icons/*・ルートの index.html / manifest.webmanifest が漏れていないか
  - ASSETS の各エントリが実ファイルとして存在するか(消し忘れ・タイポ検出)

使い方: python3 tools/check_sw.py   (CI ではデプロイ前に実行される)
※ ASSETS を変えたら CACHE_NAME (kids-vN) を上げること。これは静的に判定できない
   ので、このスクリプトではチェックしない。
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    assets = set(re.findall(r"'(\./[^']*)'", sw))
    problems = []

    # アプリ: 両方の URL 形式が必要
    for cat in ("games", "study"):
        for app in sorted((ROOT / cat).iterdir()):
            if not (app / "index.html").is_file():
                continue
            for entry in (f"./{cat}/{app.name}/", f"./{cat}/{app.name}/index.html"):
                if entry not in assets:
                    problems.append(f"ASSETS に {entry} がありません(アプリ追加漏れ)")

    # 共有 JS・アイコン・ルートのファイル
    expected = [f"./shared/{p.name}" for p in sorted((ROOT / "shared").glob("*.js"))]
    expected += [f"./icons/{p.name}" for p in sorted((ROOT / "icons").iterdir())]
    expected += ["./index.html", "./manifest.webmanifest"]
    for entry in expected:
        if entry not in assets:
            problems.append(f"ASSETS に {entry} がありません")

    # 実体のないエントリ(消し忘れ・タイポ)
    for entry in sorted(assets):
        path = ROOT / entry[2:] if entry != "./" else ROOT
        if entry.endswith("/"):
            path = path / "index.html"
        if not path.is_file():
            problems.append(f"ASSETS の {entry} に対応するファイルがありません")

    if problems:
        print("sw.js の ASSETS に問題があります:")
        for p in problems:
            print(f"  - {p}")
        sys.exit(1)
    print(f"OK: ASSETS {len(assets)} 件はすべて整合しています")


if __name__ == "__main__":
    main()
