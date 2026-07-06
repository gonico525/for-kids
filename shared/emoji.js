// 絵文字フォールバック(window.KidsEmoji)
// Fire HD 10 など絵文字フォントが古い端末では、新しい Unicode 世代の絵文字が
// 豆腐(□や×)になる。canvas に描いた結果を「絶対に存在しない文字(非文字)の
// 描画結果=豆腐」と比べることで対応可否を判定し、非対応なら古い世代の絵文字に
// 差し替える。判定は端末依存なのでビルド時ではなく実行時に行う。
// 制限: Firefox は豆腐の中にコードポイントを描くため比較が一致せず「対応あり」に
// 倒れるが、その場合も現状表示のままで悪化はしない(Fire HD の Silk は Chromium 系)。
(function () {
  const SIZE = 24;
  const cache = new Map();
  let ctx;   // 遅延生成(undefined=未生成 / null=canvas が使えない環境)
  let tofu;  // 非文字 U+10FFFE の描画結果。未対応グリフの見本として使う

  function getCtx() {
    if (ctx === undefined) {
      try {
        const c = document.createElement('canvas');
        c.width = c.height = SIZE;
        ctx = c.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = (SIZE - 4) + 'px sans-serif';
        }
      } catch (e) { ctx = null; }
    }
    return ctx;
  }

  function draw(ch) {
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillText(ch, SIZE / 2, SIZE / 2);
    return ctx.getImageData(0, 0, SIZE, SIZE).data;
  }

  // その絵文字をこの端末で表示できるか。判定できない環境では true(現状のまま表示)
  function supported(ch) {
    if (cache.has(ch)) return cache.get(ch);
    let ok = true;
    try {
      if (getCtx()) {
        if (!tofu) tofu = draw('\u{10FFFE}');
        const px = draw(ch);
        let blank = true, sameAsTofu = true;
        for (let i = 0; i < px.length && (blank || sameAsTofu); i++) {
          if (px[i] !== 0) blank = false;
          if (px[i] !== tofu[i]) sameAsTofu = false;
        }
        ok = !blank && !sameAsTofu;
      }
    } catch (e) { /* 判定不能なら現状のまま */ }
    cache.set(ch, ok);
    return ok;
  }

  // map = { '🪷': '🍀', ... }(値には古い端末でも出る Unicode 6 世代の絵文字を指定)。
  // 非対応だったキーは body 内の静的テキストを置換した上で、
  // 「実際に使う絵文字」の対応表を返す。JS から動的に挿す絵文字は戻り値の方を使うこと。
  function fix(map) {
    const out = {};
    const bad = [];
    for (const key in map) {
      out[key] = supported(key) ? key : map[key];
      if (out[key] !== key) bad.push(key);
    }
    if (bad.length && document.body) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        for (const key of bad) {
          if (node.data.includes(key)) node.data = node.data.split(key).join(map[key]);
        }
      }
    }
    return out;
  }

  window.KidsEmoji = { supported, fix };
})();
