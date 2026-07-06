// レベル進行の共有ユーティリティ(window.KidsProgress)
// study 系アプリ共通のしくみ: 選んだレベルを localStorage に保存して次回も復元し、
// 連続クリア(⭐ストリーク)が規定数たまったら1つ上のレベルへ自動で進める。
// 手動でレベルを変えたときやまちがえたときはストリークを 0 に戻す。
(function () {
  // opts: { key, maxLevel, streakToLevelUp?=5, onChange?(level, streak) }
  // onChange はレベル・ストリークが変わるたびに呼ばれる(表示の更新用)
  function create(opts) {
    const key = opts.key;
    const maxLevel = opts.maxLevel;
    const need = opts.streakToLevelUp || 5;
    const onChange = opts.onChange || function () {};

    let level = 1;
    let streak = 0;
    try {
      const s = parseInt(localStorage.getItem(key), 10);
      if (s >= 1 && s <= maxLevel) level = s;
    } catch (e) {}

    function save() {
      try { localStorage.setItem(key, level); } catch (e) {}
    }

    return {
      get level() { return level; },
      get streak() { return streak; },
      // 手動切替: 保存してストリークをリセット
      setLevel(n) {
        level = Math.min(maxLevel, Math.max(1, n));
        save(); streak = 0; onChange(level, streak);
      },
      addStar() { streak += 1; onChange(level, streak); },
      resetStreak() { streak = 0; onChange(level, streak); },
      canLevelUp() { return streak >= need && level < maxLevel; },
      levelUp() {
        if (level < maxLevel) level += 1;
        save(); streak = 0; onChange(level, streak);
      },
    };
  }

  window.KidsProgress = { create };
})();
