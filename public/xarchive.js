/* XArchive – reads an X (Twitter) data archive in the browser and picks the posts to send for voice analysis.
   Same rules as scripts/x-archive.py: keep only your own posts (drop RTs and replies to other people),
   use note-tweet.js for the full text of long posts. Nothing here leaves the browser. */
window.XArchive = (() => {
  const TOP_N = 60, TOP_CHARS = 70000, RECENT_CHARS = 85000, POST_MAX = 2500;
  const LINK = /https?:\/\/\S+/g;

  const readFiles = (list) => Promise.all([...list].map((f) => f.text().then((t) => [f.name, t]))).then(Object.fromEntries);

  // window.YTD.tweets.part0 = [ ... ]
  const load = (text) => (text ? JSON.parse(text.slice(text.indexOf("["))) : []);
  const unescape = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const words = (t) => t.replace(LINK, "").split(/\s+/).filter(Boolean).length;
  const ymd = (d) => d.toISOString().slice(0, 10);

  function parse(files) {
    const names = Object.keys(files);
    const tweetFiles = names.filter((n) => /^(tweets(-part\d+)?|community-tweet)\.js$/.test(n));
    if (!tweetFiles.length) throw new Error("Chưa chọn tweets.js (trong thư mục data của archive).");
    const acc = files["account.js"] ? load(files["account.js"])[0]?.account : null;
    const me = acc?.accountId || "";
    const notes = new Map();
    for (const n of load(files["note-tweet.js"])) notes.set(n.noteTweet.createdAt.slice(0, 19), n.noteTweet.core.text);

    const posts = [];
    for (const f of tweetFiles) {
      for (const row of load(files[f])) {
        const t = row.tweet || row;
        if (t.full_text.startsWith("RT @")) continue;
        const selfThread = !!t.in_reply_to_status_id_str;
        if (selfThread && (!me || t.in_reply_to_user_id_str !== me)) continue;
        const d = new Date(t.created_at);
        const text = unescape(notes.get(d.toISOString().slice(0, 19)) || t.full_text).replace(/\s*https:\/\/t\.co\/\S+$/, "").trim();
        posts.push({ date: ymd(d), fav: Number(t.favorite_count) || 0, selfThread, text });
      }
    }
    files = null; // let the big strings go
    if (!posts.length) throw new Error("Không thấy bài nào của bạn trong file đã chọn.");
    posts.sort((a, b) => (a.date < b.date ? -1 : 1));
    const main = posts.filter((p) => !p.selfThread && words(p.text) >= 5);

    const fmt = (p) => `### ${p.date} · ${p.fav} like · ${words(p.text)} từ\n${p.text.replace(LINK, "[link]").slice(0, POST_MAX)}\n`;
    const take = (list, max, n = Infinity) => {
      let text = "", count = 0;
      for (const p of list) { const s = fmt(p); if (count >= n || text.length + s.length > max) break; text += s + "\n"; count++; }
      return { text, count };
    };
    const since = (days) => ymd(new Date(Date.now() - days * 864e5));
    const recentSet = main.filter((p) => p.date >= since(183) && words(p.text) >= 12).reverse(); // newest first
    const top = take([...main.filter((p) => p.date >= since(548))].sort((a, b) => b.fav - a.fav), TOP_CHARS, TOP_N);
    const recent = take(recentSet, RECENT_CHARS);

    // stats per half-year
    const EMO = /^(\p{Extended_Pictographic}|[←-⇿])[️‍]*/u;
    const SYM = /\p{Extended_Pictographic}|[←-⇿•▪➤]/gu;
    const half = (p) => p.date.slice(0, 4) + (p.date.slice(5, 7) <= "06" ? "H1" : "H2");
    const groups = new Map();
    for (const p of main) (groups.get(half(p)) || groups.set(half(p), []).get(half(p))).push(p);
    const topK = (m, k) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([s, c]) => `${s}${c}`).join(" ");
    const lines = [`${posts.length} bài của bạn (đã bỏ RT, reply người khác), ${main.length} bài chính · ${posts[0].date} → ${posts[posts.length - 1].date}${acc ? ` · @${acc.username}` : ""}`];
    for (const [h, ps] of [...groups.entries()].slice(-6)) {
      const ws = ps.map((p) => words(p.text)).sort((a, b) => a - b);
      const op = new Map(), sy = new Map();
      for (const p of ps) {
        const o = (p.text.match(EMO)?.[1]) || "-"; op.set(o, (op.get(o) || 0) + 1);
        for (const c of p.text.match(SYM) || []) sy.set(c, (sy.get(c) || 0) + 1);
      }
      lines.push(`${h}: ${ps.length} bài · trung vị ${ws[ws.length >> 1]} từ · p75 ${ws[(ws.length * 3) >> 2]} từ · em dash ${Math.round((ps.filter((p) => p.text.includes("—")).length / ps.length) * 100)}% bài`,
        `   icon mở bài: ${topK(op, 10)}`, `   icon trong bài: ${topK(sy, 14)}`);
    }
    return { posts: main, stats: lines.join("\n"), top, recent };
  }

  return { readFiles, parse };
})();
