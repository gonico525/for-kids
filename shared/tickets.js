// 🎈チケット(1日にあそべる回数)の共有ストア
// 「あそび」カテゴリのゲーム全体で合算して数える。「べんきょう」は無制限なので使わない。
// 読み書きは毎回 localStorage に対して行う(ページをまたいでも状態がズレないように)。
(function () {
  const KEY = 'kids-tickets';
  const OLD_KEY = 'pyoko-tickets'; // 旧バージョン(ぴょこ単体時代)からの引き継ぎ用

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function clampLimit(n) {
    n = parseInt(n, 10);
    if (!n) n = 3;
    return Math.min(5, Math.max(1, n));
  }

  function read() {
    const state = { date: todayStr(), used: 0, limit: 3 };
    try {
      let raw = localStorage.getItem(KEY);
      if (!raw) {
        // 旧キーからの移行(初回のみ)
        raw = localStorage.getItem(OLD_KEY);
        if (raw) {
          localStorage.setItem(KEY, raw);
          localStorage.removeItem(OLD_KEY);
        }
      }
      if (raw) {
        const t = JSON.parse(raw);
        state.limit = clampLimit(t.limit);
        if (t.date === todayStr()) state.used = t.used || 0; // 日付が変わっていたら used は 0 に戻る
      }
    } catch (e) {}
    return state;
  }
  function write(state) {
    state.date = todayStr();
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  window.KidsTickets = {
    remaining() {
      const t = read();
      return Math.max(0, t.limit - t.used);
    },
    limit() { return read().limit; },
    // 1枚つかう。残りがなければ false を返して消費しない
    useOne() {
      const t = read();
      if (t.limit - t.used <= 0) return false;
      t.used++;
      write(t);
      return true;
    },
    setLimit(n) {
      const t = read();
      t.limit = clampLimit(n);
      write(t);
      return t.limit;
    },
    resetToday() {
      const t = read();
      t.used = 0;
      write(t);
    },
  };
})();
