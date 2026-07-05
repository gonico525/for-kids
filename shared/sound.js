// 🔊 効果音の共有ユーティリティ(WebAudioで合成、音声素材は使わない)
// ON/OFF は localStorage で全アプリ共通。iOS対策として再生のたびに resume を試みる。
// AudioContext の生成・復帰はユーザー操作(タップなど)の中で呼ばれる前提。
(function () {
  const KEY = 'kids-sound'; // '0' = OFF、それ以外は ON

  let ac = null;

  function enabled() {
    try { return localStorage.getItem(KEY) !== '0'; } catch (e) { return true; }
  }
  function setEnabled(on) {
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
    return enabled();
  }
  // AudioContext を用意し、suspended なら復帰させる
  function ensure() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }
  // 単音を鳴らす: when 秒後から dur 秒間、音量 vol、波形 type(省略時 sine)
  function tone(freq, dur, vol, type, when) {
    if (!enabled() || !ensure()) return;
    try {
      const t = ac.currentTime + (when || 0);
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }

  window.KidsSound = { enabled, setEnabled, ensure, tone };
})();
