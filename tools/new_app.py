#!/usr/bin/env python3
"""新しいアプリの枠を一発で用意するスクリプト(標準ライブラリのみ)。

やること:
  1. templates/app.html から games/<id>/index.html(または study/)を生成
  2. ハブ index.html の <!-- @new-app:games / study --> マーカー位置にタイルを挿入
  3. sw.js の // @new-app:assets マーカー位置に ASSETS を追加し CACHE_NAME を +1

使い方:
  python3 tools/new_app.py --type games --id hoge --name "ほげキャッチ" \\
      --emoji 🐙 --desc "おちてくる ほげを キャッチ!" --color "#FFE9D6"

詳しい規約・生成後のチェックリストは .claude/skills/new-app/SKILL.md を参照。
"""
import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def die(msg):
    print(f"エラー: {msg}", file=sys.stderr)
    sys.exit(1)


def render_template(text, app_type, variables):
    """@games-only / @study-only ブロックを type に応じて残し、{{VAR}} を置換する。"""
    lines = []
    skipping = False
    for line in text.splitlines(keepends=True):
        m = re.search(r"@(games|study)-only:(start|end)", line)
        if m:
            # マーカー行自体は常に出力しない
            if m.group(2) == "start":
                skipping = m.group(1) != app_type
            else:
                skipping = False
            continue
        if not skipping:
            lines.append(line)
    out = "".join(lines)
    for key, value in variables.items():
        out = out.replace("{{" + key + "}}", value)
    leftover = re.findall(r"\{\{[A-Z_]+\}\}", out)
    if leftover:
        die(f"テンプレートに未置換の変数が残っています: {', '.join(sorted(set(leftover)))}")
    return out


def insert_before_marker(text, marker, insertion, label):
    """marker を含む行の直前に insertion を挿入する。"""
    lines = text.splitlines(keepends=True)
    for i, line in enumerate(lines):
        if marker in line:
            return "".join(lines[:i] + [insertion] + lines[i:])
    die(f"{label} にマーカー {marker} が見つかりません")


def main():
    p = argparse.ArgumentParser(description="新しいアプリの枠を生成する")
    p.add_argument("--type", required=True, choices=["games", "study"],
                   help="games=🎈チケット制のあそび / study=無制限のべんきょう")
    p.add_argument("--id", required=True, help="ディレクトリ名(英小文字・数字・ハイフン)")
    p.add_argument("--name", required=True, help="アプリ名(ひらがな推奨。タイトルとタイルに使う)")
    p.add_argument("--emoji", required=True, help="タイルとアプリ内で使う絵文字1つ")
    p.add_argument("--desc", required=True, help="タイルの説明文(ひらがなで短く)")
    p.add_argument("--color", required=True, help="テーマ色(#RRGGBB)")
    args = p.parse_args()

    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", args.id):
        die("--id は英小文字・数字・ハイフンのみ(先頭は英数字)にしてください")
    if not re.fullmatch(r"#[0-9A-Fa-f]{6}", args.color):
        die("--color は #RRGGBB 形式で指定してください")

    template_path = ROOT / "templates" / "app.html"
    hub_path = ROOT / "index.html"
    sw_path = ROOT / "sw.js"
    app_dir = ROOT / args.type / args.id
    rel = f"{args.type}/{args.id}/"

    if app_dir.exists():
        die(f"{app_dir} は既に存在します")
    hub = hub_path.read_text(encoding="utf-8")
    if f'href="{rel}"' in hub:
        die(f"ハブに {rel} のタイルが既にあります")
    sw = sw_path.read_text(encoding="utf-8")
    if f"'./{rel}'" in sw:
        die(f"sw.js に {rel} のエントリが既にあります")

    # 1. アプリ本体を生成
    html = render_template(template_path.read_text(encoding="utf-8"), args.type, {
        "APP_ID": args.id,
        "CATEGORY": args.type,
        "TITLE": args.name,
        "EMOJI": args.emoji,
        "DESC": args.desc,
        "THEME_COLOR": args.color,
    })
    app_dir.mkdir(parents=True)
    (app_dir / "index.html").write_text(html, encoding="utf-8")

    # 2. ハブにタイルを挿入
    tile = (
        f'    <a class="tile" href="{rel}">\n'
        f'      <span class="tile-emoji">{args.emoji}</span>\n'
        f'      <span class="tile-body">\n'
        f'        <span class="tile-name">{args.name}</span>\n'
        f'        <span class="tile-desc">{args.desc}</span>\n'
        f'      </span>\n'
        f'      <span class="tile-go">▶</span>\n'
        f'    </a>\n'
    )
    hub = insert_before_marker(hub, f"@new-app:{args.type}", tile, "index.html")
    hub_path.write_text(hub, encoding="utf-8")

    # 3. sw.js: ASSETS 追加 + CACHE_NAME を +1
    assets = f"  './{rel}',\n  './{rel}index.html',\n"
    sw = insert_before_marker(sw, "@new-app:assets", assets, "sw.js")
    m = re.search(r"const CACHE_NAME = 'kids-v(\d+)';", sw)
    if not m:
        die("sw.js の CACHE_NAME (kids-vN) が見つかりません")
    sw = sw.replace(m.group(0), f"const CACHE_NAME = 'kids-v{int(m.group(1)) + 1}';", 1)
    sw_path.write_text(sw, encoding="utf-8")

    print(f"できました: {app_dir / 'index.html'}")
    print(f"  - ハブにタイルを追加(index.html)")
    print(f"  - sw.js: ASSETS 追加 + CACHE_NAME → kids-v{int(m.group(1)) + 1}")
    print()
    print("このあとやること:")
    print(f"  1. {rel}index.html の TODO にアプリ本体をつくる")
    print("  2. 4レイアウト(縦持ち/タブレット/横2カラム/低い横画面)と")
    print("     prefers-reduced-motion を確認する")
    print("  3. localStorage キーを増やしたら docs/reference/storage-keys.md に追記する")
    print("  4. python3 tools/check_sw.py で sw.js の整合性を確認する")


if __name__ == "__main__":
    main()
