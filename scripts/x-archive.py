"""Step 1 of the voice pipeline: X archive → clean list of your own posts + style stats.

Usage:  python -X utf8 scripts/x-archive.py <archive>/data <out_dir> [--since 2025-04-01]
Reads tweets*.js + note-tweet.js (full text of long posts) + account.js, keeps only your own posts
(drops RTs and replies to other people, keeps self-threads), writes:
  posts.json   all kept posts {id, date, fav, rt, self_thread, text}
  top.md       60 most-liked posts since --since  (feed these to Claude to write the voice profile)
  recent.md    every post of the last 6 months     (the style you have now)
  stats.txt    words median/p75, opener icons, in-post symbols, em-dash share, per period
"""
import html, json, re, sys
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path

if len(sys.argv) < 3:
    sys.exit(__doc__)
D, OUT = Path(sys.argv[1]), Path(sys.argv[2])
SINCE = sys.argv[sys.argv.index("--since") + 1] if "--since" in sys.argv else "2000-01-01"
OUT.mkdir(parents=True, exist_ok=True)


def load(name):
    p = D / name
    if not p.exists():
        return []
    t = p.read_text(encoding="utf-8")
    return json.loads(t[t.index("["):])


me = load("account.js")[0]["account"]["accountId"]
notes = {n["noteTweet"]["createdAt"][:19]: n["noteTweet"]["core"]["text"] for n in load("note-tweet.js")}
LINK = re.compile(r"https?://\S+")

posts = []
for f in sorted(D.glob("tweets*.js")) + [D / "community-tweet.js"]:
    for t in load(f.name):
        t = t.get("tweet", t)
        if t["full_text"].startswith("RT @"):
            continue
        reply_to = t.get("in_reply_to_user_id_str")
        if t.get("in_reply_to_status_id_str") and reply_to != me:
            continue
        dt = datetime.strptime(t["created_at"], "%a %b %d %H:%M:%S %z %Y")
        text = html.unescape(notes.get(dt.strftime("%Y-%m-%dT%H:%M:%S"), t["full_text"]))
        posts.append({"id": t["id_str"], "date": dt.strftime("%Y-%m-%d"), "fav": int(t.get("favorite_count", 0)),
                      "rt": int(t.get("retweet_count", 0)), "self_thread": bool(t.get("in_reply_to_status_id_str")),
                      "text": re.sub(r"\s*https://t\.co/\S+$", "", text).strip()})
posts.sort(key=lambda p: p["date"])
(OUT / "posts.json").write_text(json.dumps(posts, ensure_ascii=False, indent=0), encoding="utf-8")

main = [p for p in posts if not p["self_thread"] and p["date"] >= SINCE]
words = lambda t: len(LINK.sub("", t).split())
fmt = lambda p: "### %s fav%d w%d\n%s\n" % (p["date"], p["fav"], words(p["text"]), LINK.sub("[link]", p["text"]))

top = sorted(main, key=lambda p: -p["fav"])[:60]
(OUT / "top.md").write_text("\n".join(map(fmt, top)), encoding="utf-8")
cut = (datetime.now() - timedelta(days=183)).strftime("%Y-%m-%d")
(OUT / "recent.md").write_text("\n".join(fmt(p) for p in main if p["date"] >= cut and words(p["text"]) >= 12), encoding="utf-8")

EMO = re.compile(r"^([\U0001F000-\U0001FFFF☀-➿‼⁉⭐⭕][️‍]*)")
SYM = re.compile(r"[\U0001F000-\U0001FFFF☀-➿←-⇿•▪➤]")
lines = [f"{len(posts)} posts kept (RT + replies to others dropped), {len(main)} main posts since {SINCE}"]
for half in sorted({p["date"][:4] + ("H1" if p["date"][5:7] <= "06" else "H2") for p in main}):
    ps = [p for p in main if p["date"][:4] + ("H1" if p["date"][5:7] <= "06" else "H2") == half]
    ws = sorted(words(p["text"]) for p in ps)
    openers = Counter((EMO.match(p["text"]) or [None, "-"])[1].replace("️", "") for p in ps)
    syms = Counter(c for p in ps for c in SYM.findall(p["text"]))
    lines += [f"\n{half}: {len(ps)} posts, words median {ws[len(ws) // 2]}, p75 {ws[3 * len(ws) // 4]}, "
              f"em dash in {sum('—' in p['text'] for p in ps) / len(ps):.1%} of posts",
              "  openers: " + " ".join(f"{k}{v}" for k, v in openers.most_common(12)),
              "  symbols: " + " ".join(f"{k}{v}" for k, v in syms.most_common(20))]
(OUT / "stats.txt").write_text("\n".join(lines), encoding="utf-8")
print("\n".join(lines[:1]), "→", OUT)
