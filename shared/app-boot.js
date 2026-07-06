// 各ページ共通の起動処理(window.KidsApp)
// - Service Worker の登録: このスクリプト自身の URL からルートの sw.js を解決するので、
//   ハブ(shared/app-boot.js)でもアプリ(../../shared/app-boot.js)でも同じ呼び出しでよい
// - 🔊/🔇 ボタンの配線: クリックで KidsSound をトグルし、bfcache 復帰(pageshow)でも表示を最新化
(function () {
  // document.currentScript は読み込み時にしか使えないため、ここで解決しておく
  const swUrl = (function () {
    try { return new URL('../sw.js', document.currentScript.src).href; } catch (e) { return null; }
  })();

  // opts.soundButton: 🔊/🔇 ボタン要素(省略可)
  // opts.onSoundOn:   OFF→ON に切り替えたとき鳴らす確認音(省略可)。ONにしたのが音で分かるように
  function init(opts) {
    opts = opts || {};

    if (swUrl && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register(swUrl).catch(() => {});
      });
    }

    const btn = opts.soundButton;
    if (btn && window.KidsSound) {
      const render = () => { btn.textContent = KidsSound.enabled() ? '🔊' : '🔇'; };
      btn.addEventListener('click', () => {
        KidsSound.setEnabled(!KidsSound.enabled());
        render();
        if (KidsSound.enabled() && opts.onSoundOn) opts.onSoundOn();
      });
      render();
      window.addEventListener('pageshow', render);
    }
  }

  window.KidsApp = { init };
})();
