/* Creator Hub – client. Vanilla JS, no build step. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const app = $("#app");
  const dlg = $("#dlg");

  // Lucide 1.x paths (stroke 2)
  const ICON = {
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    settings: '<path d="M9.67 4.14a2 2 0 0 1 4.66 0 2 2 0 0 0 2.62 1.51 2 2 0 0 1 2.33 4.04 2 2 0 0 0 0 3.02 2 2 0 0 1-2.33 4.04 2 2 0 0 0-2.62 1.51 2 2 0 0 1-4.66 0 2 2 0 0 0-2.62-1.51 2 2 0 0 1-2.33-4.04 2 2 0 0 0 0-3.02 2 2 0 0 1 2.33-4.04 2 2 0 0 0 2.62-1.51"/><circle cx="12" cy="12" r="3"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    send: '<path d="M14.54 21.69a.5.5 0 0 0 .94-.03l6.5-19a.5.5 0 0 0-.64-.64l-19 6.5a.5.5 0 0 0-.03.94l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/>',
    download: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    pencil: '<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/>',
    sparkles: '<path d="M11.02 2.81a1 1 0 0 1 1.96 0l1.05 5.58a2 2 0 0 0 1.6 1.6l5.58 1.05a1 1 0 0 1 0 1.96l-5.58 1.05a2 2 0 0 0-1.6 1.6l-1.05 5.58a1 1 0 0 1-1.96 0l-1.05-5.58a2 2 0 0 0-1.6-1.6l-5.58-1.05a1 1 0 0 1 0-1.96l5.58-1.05a2 2 0 0 0 1.6-1.6z"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

  // per-viewer conveniences only
  const ls = {
    get(k, d) { try { const v = localStorage.getItem("hub." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("hub." + k, JSON.stringify(v)); } catch {} },
  };

  let toastTimer;
  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.append(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2200);
  }

  async function api(path, method = "GET", data) {
    const res = await fetch("/api" + path, {
      method, credentials: "same-origin",
      headers: data ? { "content-type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
    });
    let out = {};
    try { out = await res.json(); } catch {}
    if (res.status === 401 && path !== "/login") { renderLogin(); throw new Error("401"); }
    if (!res.ok) throw new Error(out.error || `Lỗi ${res.status}`);
    return out;
  }

  const S = {
    tab: "write",
    projects: [], currentId: ls.get("project", null), messages: [], busy: false,
    frameworks: [], settings: {},
  };
  const current = () => S.projects.find((p) => p.id === S.currentId);

  // ---------------- login ----------------
  function renderLogin() {
    app.innerHTML = `
      <div class="login"><form class="tile" id="loginForm">
        <img src="/icon.svg" alt="">
        <h1 class="t-page">Creator Kit</h1>
        <p class="t-secondary" style="margin:0">Soạn bài theo giọng văn của bạn và chèn logo vào ảnh.</p>
        <input class="input" type="password" name="pw" placeholder="Mật khẩu" autocomplete="current-password" required>
        <label class="remember t-secondary"><input type="checkbox" name="remember"> Nhớ máy này</label>
        <p class="t-note err" id="loginErr" hidden></p>
        <button class="btn btn-primary" type="submit">Vào hub</button>
      </form></div>`;
    $("#loginForm").onsubmit = async (e) => {
      e.preventDefault();
      try { await api("/login", "POST", { password: e.target.pw.value, remember: e.target.remember.checked }); boot(); }
      catch (err) { const el = $("#loginErr"); el.textContent = err.message; el.hidden = false; }
    };
  }

  // ---------------- shell ----------------
  const TABS = [["write", "Soạn bài"], ["image", "Ảnh"]];
  const SUB = [["", "Soạn"], ["projects", "Dự án"], ["frameworks", "Framework"], ["voice", "Giọng văn"]];
  function renderShell() {
    app.innerHTML = `
      <div class="frame">
        <nav class="nav">
          <a class="brand" href="#write" id="brandHome"><img src="/icon.svg" alt=""><span>Creator Kit</span></a>
          <div class="tabs" role="tablist">${TABS.map(([k, l]) => `<button class="tab" role="tab" data-tab="${k}">${l}</button>`).join("")}</div>
        </nav>
        <div id="subnav"></div>
        <main id="view"></main>
      </div>`;
    $("#brandHome").onclick = (e) => { e.preventDefault(); if (location.hash === "#write") route(); else location.hash = "write"; };
    $$(".tab").forEach((b) => (b.onclick = () => { if (location.hash.slice(1) === b.dataset.tab) route(); else location.hash = b.dataset.tab; }));
  }
  // Inside Soạn bài the sub-menu IS the page title (one row, no second bar).
  function pageTitle(t) {
    if (S.tab !== "write") return `<h1 class="t-page">${t}</h1>`;
    return `<nav class="subtabs" aria-label="Soạn bài">${SUB.map(([k, l]) => `<a href="#${k ? `write/${k}` : "write"}" ${k === S.sub ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</nav>`;
  }
  function route() {
    const [top, sub = ""] = location.hash.slice(1).split("/");
    S.tab = TABS.some(([k]) => k === top) ? top : "write";
    $$(".tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === S.tab));
    const sn = $("#subnav");
    if (S.tab === "write") {
      const cur = SUB.some(([k]) => k === sub) ? sub : "";
      sn.innerHTML = ""; S.sub = cur;
      ({ "": viewWrite, projects: viewProjects, frameworks: viewFrameworks, voice: viewVoice })[cur]();
    } else {
      sn.innerHTML = "";
      viewImage();
    }
  }

  async function loadBasics() {
    const [{ projects }, { frameworks }] = await Promise.all([api("/projects"), api("/frameworks")]);
    S.projects = projects; S.frameworks = frameworks;
  }

  // ---------------- SOẠN BÀI: dự án → framework → số từ → chất liệu/brief → bài ----------------
  const RANGES = ["50-100", "100-200", "200-300"];
  const fmtRange = (r) => r.replace("-", "–") + " từ";
  let W = null; // current wizard state

  async function viewWrite() {
    await loadBasics();
    W = { projectId: S.preselect ?? null, action: undefined, scanHours: 3, frameworkId: undefined, words: null, kind: "material", lang: ls.get("lang", "vi"), result: null, busy: false, openPost: null };
    S.preselect = null;
    S.posts = [];
    renderWizard();
    try { S.posts = (await api("/posts")).posts; } catch (ex) { toast(ex.message); }
    if (W) renderPosts();
  }

  // ---- "Bài đã soạn": one line per post under the form (DS list tile) ----
  const firstLine = (s) => (String(s).split("\n").find((l) => l.trim()) || "").trim();
  // Seeded sample posts have created_at 1/2 (not a real date) → show nothing.
  const shortDate = (t) => (t > 1e12 ? new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "");
  function postsHTML() {
    const list = S.posts || [];
    return `<section class="tile posts" id="posts">
      <div class="tile-head"><h2 class="t-header">Bài đã soạn</h2><span class="chip t-data">${list.length}</span></div>
      ${list.length ? list.map((p) => {
        const open = W.openPost === p.id;
        return `<div class="post-item${open ? " open" : ""}">
          <button class="post-row" data-pid="${p.id}" aria-expanded="${open}">
            <span class="post-line t-content">${esc(firstLine(p.content))}</span>
            <span class="chip">${esc(p.project)}</span>
            <span class="t-note t-data">${shortDate(p.created_at)}</span>
          </button>
          ${open ? `<div class="post-body">
            <div class="post t-content">${esc(p.content)}</div>
            ${notesHTML(p.meta)}
            <div class="msg-foot"><span class="t-note">${p.meta?.framework ? `${esc(p.meta.framework)} · ` : ""}${p.meta?.words ?? countWords(p.content)} từ</span><span class="spacer"></span>
              <button class="btn btn-small" data-revise="${p.id}">${icon("pencil")}Sửa tiếp</button>
              <button class="btn btn-small btn-dark" data-copyp="${p.id}">${icon("copy")}Copy</button></div>
          </div>` : ""}
        </div>`;
      }).join("") : `<p class="t-note">Chưa có bài nào.</p>`}
    </section>`;
  }
  function renderPosts() {
    const old = $("#posts"); if (!old) return;
    old.outerHTML = postsHTML();
    bindPosts();
  }
  function bindPosts() {
    const box = $("#posts"); if (!box) return;
    const find = (id) => S.posts.find((x) => x.id === Number(id));
    $$(".post-row", box).forEach((b) => (b.onclick = () => { const id = Number(b.dataset.pid); W.openPost = W.openPost === id ? null : id; renderPosts(); }));
    $$("[data-copyp]", box).forEach((b) => (b.onclick = () => navigator.clipboard.writeText(find(b.dataset.copyp).content).then(() => toast("Đã copy"))));
    $$("[data-revise]", box).forEach((b) => (b.onclick = () => {
      const p = find(b.dataset.revise);
      const fw = S.frameworks.find((f) => f.name === p.meta?.framework);
      Object.assign(W, { projectId: p.project_id, frameworkId: fw ? fw.id : 0, action: "write", openPost: null,
        result: { id: p.id, content: p.content, meta: p.meta }, scrollToResult: true });
      renderWizard();
    }));
  }
  // Keep the list in sync after a new post or revision (no refetch).
  function addPost(out) {
    if (!out?.id) return;
    const proj = S.projects.find((x) => x.id === W.projectId);
    S.posts = [{ id: out.id, project_id: W.projectId, project: proj?.name || "", content: out.content, meta: out.meta, created_at: Date.now() }, ...(S.posts || [])].slice(0, 60);
  }

  // Step order: framework → project (old / new) → word range → material.
  const STEP_ORDER = ["fw", "proj", "act", "words"];
  function resetFrom(key) {
    const i = STEP_ORDER.indexOf(key);
    if (i <= 0) W.frameworkId = undefined;
    if (i <= 1) W.projectId = null;
    if (i <= 2) W.action = undefined;
    if (i <= 3) W.words = null;
  }

  function stepHTML(n, key, q, short, done, summary, body) {
    return `<section class="step ${done ? "done" : ""}">
      <div class="step-head"><span class="step-n">${n}</span><h2 class="t-header">${done ? short : q}</h2>
        ${done ? `<span class="chip chip-dark">${esc(summary)}</span><button class="btn btn-small" data-redo="${key}">Đổi</button>` : ""}</div>
      ${done ? "" : `<div class="step-body">${body}</div>`}
    </section>`;
  }

  function renderWizard() {
    const v = $("#view");
    const proj = S.projects.find((p) => p.id === W.projectId);
    const fw = W.frameworkId ? S.frameworks.find((f) => f.id === W.frameworkId) : null;
    if (proj) W.action = "write";
    const dFw = W.frameworkId !== undefined, dProj = dFw && !!proj, dAct = dProj && !!W.action, dWords = dAct && W.action === "write" && !!W.words;
    let n = 0;
    let html = `<div class="page-head">${pageTitle("Soạn bài")}
      ${W.result ? `<div class="controls"><button class="btn btn-float" id="again">${icon("plus")}Bài khác</button></div>` : ""}</div>
      <div class="tile wizard">`;
    html += stepHTML(++n, "fw", "Viết kiểu bài gì?", "Framework", dFw, fw ? fw.name : "Tự do", `
      <div class="choices">${S.frameworks.map((f) => `<button class="choice" data-fw="${f.id}" title="${esc(f.description)}">${esc(f.name)}</button>`).join("")}
        <button class="choice" data-fw="0">Tự do</button></div>`);
    if (dFw) html += stepHTML(++n, "proj", "Cho dự án nào?", "Dự án", dProj, proj?.name, `
      ${S.projects.length ? `<p class="t-label group-label">Dự án cũ</p>
      <div class="choices">${S.projects.map((p) => `<button class="choice" data-proj="${p.id}">${esc(p.name)}</button>`).join("")}</div>` : ""}
      <p class="t-label group-label" style="margin-top:6px">Dự án mới</p>
      <div class="new-proj"><input class="input" id="newProjName" maxlength="80" placeholder="Tên dự án mới"><button class="btn btn-primary" id="newProjGo">${icon("plus")}Tạo</button></div>
      <p class="t-note">Dự án mới chưa có brief – AI chỉ dựa vào chất liệu. Thêm brief sau ở mục Dự án.</p>`);
    if (dAct) html += stepHTML(++n, "words", "Khoảng bao nhiêu từ?", "Số từ", dWords, W.words && fmtRange(W.words), `
      <div class="choices">${RANGES.map((r) => `<button class="choice" data-words="${r}">${fmtRange(r)}</button>`).join("")}</div>`);
    if (dWords) html += `<section class="step">
      <div class="step-head"><span class="step-n">${++n}</span><h2 class="t-header">Dán chất liệu hoặc brief</h2></div>
      <div class="step-body">
        <div class="opts">
          <div class="seg" id="segKind">
            <button type="button" data-v="material" aria-pressed="${W.kind === "material"}">Chất liệu của mình</button>
            <button type="button" data-v="brief" aria-pressed="${W.kind === "brief"}">Brief bên book</button>
          </div>
          <div class="seg" id="segLang">
            <button type="button" data-v="vi" aria-pressed="${W.lang === "vi"}">VI</button>
            <button type="button" data-v="en" aria-pressed="${W.lang === "en"}">EN</button>
          </div>
        </div>
        <textarea class="textarea" id="material" rows="8" placeholder="${W.kind === "brief" ? "Dán nguyên brief bên đặt bài: yêu cầu, tag, hashtag, link, thông điệp, điều cấm..." : "Dán chất liệu: link, ghi chú, số liệu, ý chính..."}">${esc(W.draftMaterial || "")}</textarea>
        <p class="t-note">${W.kind === "brief" ? "AI giữ đủ yêu cầu bắt buộc của brief nhưng viết lại bằng giọng của bạn, dựng trên góc nhìn cá nhân." : "AI chỉ dùng fact trong chất liệu + brief cố định của dự án."}</p>
        <p class="t-note err" id="wErr" hidden></p>
        <div class="step-actions"><button class="btn btn-primary" id="go" ${W.busy ? "disabled" : ""}>${W.busy ? '<span class="loading"><i></i><i></i><i></i></span>Đang soạn' : `${icon("sparkles")}Soạn bài`}</button></div>
      </div></section>`;
    html += `</div>`;
    if (W.result) html += resultHTML(W.result);
    html += postsHTML();
    v.innerHTML = html;
    bindWizard();
    bindPosts();
    if (W.result && W.scrollToResult) { $("#result")?.scrollIntoView({ behavior: "smooth", block: "start" }); W.scrollToResult = false; }
  }

  function resultHTML(r) {
    return `<section class="tile result" id="result">
      <div class="tile-head"><h2 class="t-header">Bài viết</h2>
        <div class="row-actions"><span class="chip">${r.meta?.words ?? countWords(r.content)} từ</span>
        ${r.meta?.usage ? `<span class="t-note t-data">$${r.meta.usage.usd.toFixed(4)}</span>` : ""}</div></div>
      ${r.meta?.truncated ? `<p class="t-note err">Bài bị cắt do quá dài – bấm Sửa: "viết tiếp".</p>` : ""}
      <div class="post t-content" id="post">${esc(r.content)}</div>
      ${notesHTML(r.meta)}
      <div class="msg-foot"><span class="spacer"></span>
        <button class="btn btn-small" id="editPost">${icon("pencil")}Sửa tay</button>
        <button class="btn btn-small btn-dark" id="copyPost">${icon("copy")}Copy</button></div>
      <div class="revise">
        <textarea class="textarea" id="revise" rows="2" placeholder="Muốn sửa gì? Vd: hook mạnh hơn, bỏ đoạn 2, thêm số liệu..."></textarea>
        <button class="btn btn-primary btn-icon" id="reviseGo" title="Sửa bài" ${W.busy ? "disabled" : ""}>${icon("send")}</button>
      </div>
    </section>`;
  }
  const countWords = (s) => s.split(/\s+/).filter(Boolean).length;
  function notesHTML(meta) {
    let h = "";
    if (meta?.notes) h += `<div class="notes"><p class="t-label">Cần kiểm lại</p><p class="t-secondary pre">${esc(meta.notes)}</p></div>`;
    return h;
  }

  function bindWizard() {
    $$("[data-redo]").forEach((b) => (b.onclick = () => {
      W.draftMaterial = $("#material")?.value ?? W.draftMaterial;
      resetFrom(b.dataset.redo);
      renderWizard();
    }));
    $$("[data-proj]").forEach((b) => (b.onclick = () => { W.projectId = Number(b.dataset.proj); W.action = undefined; renderWizard(); }));
    $$("[data-fw]").forEach((b) => (b.onclick = () => { W.frameworkId = Number(b.dataset.fw) || 0; renderWizard(); }));
    $$("[data-words]").forEach((b) => (b.onclick = () => { W.words = b.dataset.words; renderWizard(); $("#material")?.focus(); }));
    const npGo = $("#newProjGo");
    if (npGo) {
      const create = async () => {
        const name = $("#newProjName").value.trim();
        if (!name) { $("#newProjName").focus(); return; }
        const dup = S.projects.find((p) => p.name.toLowerCase() === name.toLowerCase());
        if (dup) { W.projectId = dup.id; W.action = undefined; renderWizard(); return; }
        npGo.disabled = true;
        try {
          const { project } = await api("/projects", "POST", { name });
          project.posts = 0; S.projects.unshift(project);
          W.projectId = project.id; W.action = undefined; renderWizard();
        } catch (ex) { npGo.disabled = false; toast(ex.message); }
      };
      npGo.onclick = create;
      $("#newProjName").onkeydown = (e) => { if (e.key === "Enter") create(); };
    }
    const seg = (id, key, after) => $$(`#${id} button`).forEach((b) => (b.onclick = () => {
      W[key] = b.dataset.v; $$(`#${id} button`).forEach((x) => x.setAttribute("aria-pressed", x === b)); after && after();
    }));
    seg("segKind", "kind", () => { W.draftMaterial = $("#material").value; renderWizard(); });
    seg("segLang", "lang", () => ls.set("lang", W.lang));
    const go = $("#go"); if (go) go.onclick = () => generate("new");
    const again = $("#again"); if (again) again.onclick = () => { resetFrom("fw"); W.result = null; W.draftMaterial = ""; renderWizard(); window.scrollTo(0, 0); };
    if (W.result) {
      const post = $("#post");
      $("#copyPost").onclick = () => navigator.clipboard.writeText(post.innerText).then(() => toast("Đã copy"));
      $("#editPost").onclick = (e) => {
        const on = post.getAttribute("contenteditable") === "true";
        post.setAttribute("contenteditable", on ? "false" : "true");
        e.currentTarget.innerHTML = on ? `${icon("pencil")}Sửa tay` : `${icon("save")}Xong`;
        if (!on) post.focus();
      };
      $("#reviseGo").onclick = () => generate("revise");
      $("#revise").onkeydown = (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) generate("revise"); };
    }
  }

  async function generate(mode) {
    const src = mode === "revise" ? $("#revise") : $("#material");
    const text = src.value.trim();
    const errEl = mode === "revise" ? null : $("#wErr");
    if (!text) { if (errEl) { errEl.textContent = W.kind === "brief" ? "Dán brief vào đã." : "Dán chất liệu vào đã."; errEl.hidden = false; } src.focus(); return; }
    W.busy = true; W.draftMaterial = mode === "new" ? text : W.draftMaterial;
    renderWizard();
    try {
      const out = await api(`/projects/${W.projectId}/generate`, "POST", {
        material: text, mode, words: W.words, kind: W.kind, lang: W.lang, frameworkId: mode === "new" ? W.frameworkId || null : null,
        draftId: mode === "revise" ? W.result?.id || null : null,
      });
      W.result = { id: out.id, content: out.content, meta: out.meta }; W.scrollToResult = true; addPost(out);
      const p = S.projects.find((x) => x.id === W.projectId); if (p) p.posts = (p.posts || 0) + 1;
    } catch (ex) {
      toast(ex.message);
      if (mode === "revise") { W.busy = false; renderWizard(); $("#revise").value = text; return; }
    }
    W.busy = false; renderWizard();
  }

  // ---------------- DỰ ÁN ----------------
  async function viewProjects() {
    await loadBasics();
    if (!S.projects.some((p) => p.id === S.currentId)) S.currentId = S.projects[0]?.id ?? null;
    const p = S.projects.find((x) => x.id === S.currentId);
    $("#view").innerHTML = `
      <div class="page-head">${pageTitle("Dự án")}
        <div class="controls"><button class="btn btn-float" id="newProj">${icon("plus")}Dự án mới</button></div></div>
      ${!S.projects.length ? `<div class="tile empty"><p class="t-header">Chưa có dự án nào</p><p class="t-secondary">Mỗi dự án có brief cố định riêng và lịch sử bài đã soạn.</p></div>` : `
      <div class="write">
        <aside class="tile projects-list">
          ${S.projects.map((x) => `<button class="row project-row" data-id="${x.id}" aria-current="${x.id === S.currentId}"><span class="name">${esc(x.name)}</span><span class="t-note t-data">${x.posts || 0} bài</span></button>`).join("")}
        </aside>
        <section class="stack">
          <div class="tile">
            <div class="tile-head"><h2 class="t-header">${esc(p.name)}</h2>
              <div class="row-actions"><button class="btn btn-small" id="editProj">${icon("settings")}Sửa</button></div></div>
            ${p.brief ? `<details class="brief"><summary class="t-label">Brief cố định · ${p.brief.length.toLocaleString("vi-VN")} ký tự</summary><p class="t-content pre" style="margin-top:8px">${esc(p.brief)}</p></details>` : '<p class="t-note">Chưa có brief – bấm Sửa để thêm luật riêng, kiến thức, điều cần tránh.</p>'}
          </div>
          <div class="tile"><div class="tile-head"><h2 class="t-header">Bài đã soạn</h2>
            <button class="btn btn-small" id="writeHere">${icon("sparkles")}Soạn bài cho dự án này</button></div>
            <div id="history"><span class="loading"><i></i><i></i><i></i></span></div></div>
        </section>
      </div>`}`;
    $("#newProj").onclick = () => projectDialog(null, (np) => { S.currentId = np.id; ls.set("project", np.id); viewProjects(); });
    if (!p) return;
    $$(".project-row").forEach((b) => (b.onclick = () => { S.currentId = Number(b.dataset.id); ls.set("project", S.currentId); viewProjects(); }));
    $("#editProj").onclick = () => projectDialog(p, () => viewProjects());
    $("#writeHere").onclick = () => { S.preselect = p.id; location.hash = "write"; };
    const { messages } = await api(`/projects/${p.id}/messages`);
    const posts = messages.filter((m) => m.role === "assistant").reverse();
    const h = $("#history"); if (!h) return;
    h.innerHTML = posts.length ? posts.map((m) => `
      <div class="msg msg-ai">
        <div class="post t-content">${esc(m.content)}</div>
        ${notesHTML(m.meta)}
        <div class="msg-foot"><span class="t-note">${new Date(m.created_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}${m.meta?.framework ? ` · ${esc(m.meta.framework)}` : ""} · ${m.meta?.words ?? countWords(m.content)} từ</span>
          <span class="spacer"></span><button class="btn btn-small btn-dark" data-copy>${icon("copy")}Copy</button></div>
      </div>`).join("") : `<p class="t-note">Chưa có bài nào.</p>`;
    $$("[data-copy]", h).forEach((b) => (b.onclick = () => navigator.clipboard.writeText(b.closest(".msg").querySelector(".post").innerText).then(() => toast("Đã copy"))));
  }

  function projectDialog(p, after) {
    const isEdit = p && p.id;
    dlg.innerHTML = `
      <form class="tile" id="pForm">
        <h2 class="t-header">${isEdit ? "Sửa dự án" : "Dự án mới"}</h2>
        <label class="field"><span class="t-label">Tên dự án</span><input class="input" name="name" maxlength="80" required value="${esc(isEdit ? p.name : "")}" placeholder="Tên dự án / thương hiệu bạn hay viết"></label>
        <label class="field"><span class="t-label">Brief cố định (luật riêng + kiến thức của dự án, gửi kèm mỗi bài)</span>
          <textarea class="textarea" name="brief" maxlength="12000" rows="10" placeholder="Dự án là gì, @handle, link chính, số liệu cố định, điều cần tránh...">${esc(isEdit ? p.brief : "")}</textarea>
          <span class="t-note" id="briefCount"></span></label>
        <div class="actions">
          ${isEdit ? `<button type="button" class="btn btn-danger left" id="pDel">${icon("trash")}Xoá dự án</button><button type="button" class="btn" id="pClear">Xoá lịch sử</button>` : ""}
          <button type="button" class="btn" id="pCancel">Đóng</button>
          <button class="btn btn-primary" type="submit">${isEdit ? "Lưu" : "Tạo"}</button>
        </div>
      </form>`;
    dlg.showModal();
    const f = $("#pForm");
    const cnt = () => ($("#briefCount").textContent = `${f.brief.value.length}/12000 ký tự`);
    f.brief.oninput = cnt; cnt();
    $("#pCancel").onclick = () => dlg.close();
    f.onsubmit = async (e) => {
      e.preventDefault();
      const data = { name: f.name.value.trim(), brief: f.brief.value };
      let res = p;
      if (isEdit) { await api(`/projects/${p.id}`, "PATCH", data); Object.assign(p, data); }
      else { const { project } = await api("/projects", "POST", data); project.posts = 0; S.projects.unshift(project); res = project; }
      dlg.close(); after && after(res);
    };
    if (isEdit) {
      $("#pDel").onclick = async () => {
        if (!confirmInline($("#pDel"), "Bấm lần nữa để xoá")) return;
        await api(`/projects/${p.id}`, "DELETE"); S.currentId = null; dlg.close(); viewProjects();
      };
      $("#pClear").onclick = async () => {
        if (!confirmInline($("#pClear"), "Bấm lần nữa để xoá")) return;
        await api(`/projects/${p.id}/messages`, "DELETE"); dlg.close(); toast("Đã xoá lịch sử"); viewProjects();
      };
    }
  }

  // two-tap confirm, no browser dialogs
  function confirmInline(btn, label) {
    if (btn.dataset.armed) return true;
    btn.dataset.armed = "1"; const old = btn.innerHTML; btn.textContent = label;
    setTimeout(() => { delete btn.dataset.armed; btn.innerHTML = old; }, 3000);
    return false;
  }

  // ---------------- IMAGE ----------------
  // Palette = your brand colour (picked once, saved in the preset) + black + white.
  const PRESET_V = 2;
  const COLOR_KEYS = ["padColor", "strokeColor", "textBg", "textColor"];
  const palette = (P) => [P.brand, "#000000", "#FFFFFF"];
  const DEFAULT_PRESET = {
    v: PRESET_V, brand: "#F5B301", crop: "orig", height: 540, pad: 10, padColor: "#F5B301", radius: 0,
    strokeColor: "#F5B301", shapeWidth: 10,
    text: "", textPos: "bottom", textSize: 30, textColor: "#000000", textBg: "#F5B301",
    logo: true, logoCorner: "br", logoSize: 48, showHandle: true, format: "png",
  };
  function loadPreset(json) {
    let saved = {};
    try { saved = JSON.parse(json || "{}"); } catch {}
    const P = { ...DEFAULT_PRESET, ...saved, v: PRESET_V };
    if (!/^#[0-9A-F]{6}$/i.test(P.brand)) P.brand = DEFAULT_PRESET.brand;
    P.brand = P.brand.toUpperCase();
    P.logoCorner = (String(P.logoCorner)[0] === "t" ? "t" : "b") + "r";
    for (const k of COLOR_KEYS) if (!palette(P).includes(String(P[k]).toUpperCase())) P[k] = P.brand;
    return P;
  }
  let IMG = { files: [], preset: null, logoImg: null, tool: "none" };

  async function viewImage() {
    if (!S.settings.loaded) { S.settings = { ...(await api("/settings")), loaded: true }; }
    if (!IMG.preset) IMG.preset = loadPreset(S.settings.imagePreset);
    if (!IMG.logoImg && S.settings.logo) IMG.logoImg = await HubImage.loadImage(S.settings.logo).catch(() => null);
    const P = IMG.preset;
    const sw = (name) => `<div class="swatches" data-sw="${name}">${palette(P).map((c) => `<button type="button" class="swatch" style="background:${c}" data-c="${c}" aria-pressed="${P[name].toUpperCase() === c}" title="${c}"></button>`).join("")}</div>`;
    const range = (k, min, max, step = 1) => `<span class="rng"><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${P[k]}"><output class="t-data">${P[k]}</output></span>`;
    const row = (label, html) => `<div class="opt"><span class="t-secondary">${label}</span><div class="opt-c">${html}</div></div>`;
    const segp = (k, opts) => `<div class="seg" data-seg="${k}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${String(P[k]) === String(v)}">${l}</button>`).join("")}</div>`;
    $("#view").innerHTML = `
      <div class="page-head">
        <h1 class="t-page">Ảnh</h1>
        <div class="controls">
          <label class="btn btn-float" id="addImg">${icon("plus")}Thêm ảnh<input type="file" accept="image/*" multiple hidden id="fileIn"></label>
          <button class="btn btn-float" id="savePreset">${icon("save")}Lưu preset</button>
          <button class="btn btn-float" id="dlAll" ${IMG.files.length ? "" : "disabled"}>${icon("download")}Tải tất cả</button>
        </div>
      </div>
      <div class="img-layout">
        <section id="imgMain">
          <label class="tile drop" id="drop" for="fileIn">
            <p class="t-header">Thả ảnh vào đây</p>
            <p class="t-secondary" style="margin:4px 0 0">Bấm để chọn, hoặc dán (Ctrl+V). Nhiều ảnh cùng lúc được.</p>
          </label>
          <div class="gallery" id="gallery"></div>
        </section>
        <aside class="tile img-opts">
          ${row("Màu chính", `<input type="color" class="brand-in" id="brandIn" value="${P.brand}" title="Màu thương hiệu"><span class="t-note">+ đen, trắng</span>`)}
          <hr>
          ${row("Tỉ lệ", segp("crop", [["orig", "Gốc"], ["16:9", "16:9"], ["1:1", "1:1"], ["4:5", "4:5"], ["3:1", "3:1"]]))}
          ${row("Cao", `<input class="input input-s" type="number" data-k="height" min="200" max="2000" value="${P.height}"><span class="t-note">px</span>`)}
          <hr>
          ${row("Lề", range("pad", 0, 80) + sw("padColor"))}
          ${row("Bo góc", range("radius", 0, 40))}
          <hr>
          ${row("Vẽ", `<div class="seg" id="drawTool">${[["none", "Tắt"], ["arrow", "Mũi tên"], ["rect", "Ô"]].map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${IMG.tool === v}">${l}</button>`).join("")}</div>`)}
          ${row("Nét", range("shapeWidth", 2, 24) + sw("strokeColor"))}
          <hr>
          ${row("Chữ", `<input class="input input-s" data-k="text" value="${esc(P.text)}" placeholder="Tiêu đề trên ảnh">`)}
          ${row("", segp("textPos", [["top", "Trên"], ["bottom", "Dưới"]]) + range("textSize", 16, 64))}
          ${row("Nền / chữ", sw("textBg") + `<span class="opt-gap"></span>` + sw("textColor"))}
          <hr>
          ${row("Logo", segp("logo", [["true", "Bật"], ["false", "Tắt"]]) + segp("logoCorner", [["tr", "↗"], ["br", "↘"]]) + `<label class="btn btn-small" title="${IMG.logoImg ? "Đổi logo" : "Tải logo lên"}">${icon("image")}${IMG.logoImg ? "" : "Tải lên"}<input type="file" accept="image/*" id="logoIn" hidden></label>`)}
          ${row("Cỡ logo", range("logoSize", 24, 120))}
          ${row("Tên", segp("showHandle", [["true", "Có"], ["false", "Không"]]) + `<input class="input input-s" id="handleIn" value="${esc(S.settings.handle || "")}" placeholder="@handle">`)}
          <hr>
          ${row("Xuất", segp("format", [["png", "PNG"], ["jpg", "JPG"]]))}
        </aside>
      </div>`;
    bindImage(); renderGallery();
  }

  function bindImage() {
    const P = IMG.preset;
    const rerender = HubImage.debounce(renderGallery, 60);
    $$("[data-k]").forEach((el) => (el.oninput = () => {
      P[el.dataset.k] = el.type === "range" || el.type === "number" ? Number(el.value) : el.value;
      if (el.type === "range") { const o = el.parentElement.querySelector("output"); if (o) o.textContent = el.value; }
      rerender();
    }));
    $$("[data-seg]").forEach((g) => $$("button", g).forEach((b) => (b.onclick = () => {
      const v = b.dataset.v; P[g.dataset.seg] = v === "true" ? true : v === "false" ? false : v;
      $$("button", g).forEach((x) => x.setAttribute("aria-pressed", x === b)); rerender();
    })));
    $$("[data-sw]").forEach((g) => {
      const k = g.dataset.sw;
      const set = (c) => { P[k] = c; $$(".swatch", g).forEach((x) => x.setAttribute("aria-pressed", x.dataset.c === c)); rerender(); };
      $$(".swatch", g).forEach((b) => (b.onclick = () => set(b.dataset.c)));
    });
    $$("#drawTool button").forEach((b) => (b.onclick = () => {
      IMG.tool = b.dataset.v;
      $$("#drawTool button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      renderGallery(); // updates cursor + hint under each image
    }));
    $("#handleIn").oninput = (e) => { S.settings.handle = e.target.value; rerender(); };
    $("#brandIn").onchange = (e) => {
      const old = P.brand, c = e.target.value.toUpperCase();
      P.brand = c; for (const k of COLOR_KEYS) if (P[k] === old) P[k] = c;
      viewImage(); // repaint swatches with the new brand colour
    };
    $("#logoIn").onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const url = await HubImage.shrinkToDataURL(file, 256);
      IMG.logoImg = await HubImage.loadImage(url); S.settings.logo = url;
      await api("/settings", "PUT", { logo: url }); toast("Đã lưu logo"); viewImage();
    };
    const fileIn = $("#fileIn"), drop = $("#drop"), main = $("#imgMain");
    fileIn.onchange = () => { addFiles(fileIn.files); fileIn.value = ""; };
    // drop anywhere on the image column, not only on the empty box
    main.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); };
    main.ondragleave = (e) => { if (!main.contains(e.relatedTarget)) drop.classList.remove("over"); };
    main.ondrop = (e) => { e.preventDefault(); drop.classList.remove("over"); addFiles(e.dataTransfer.files); };
    window.onresize = () => { if (S.tab === "image") $$(".shot canvas").forEach(fitCanvas); };
    document.onpaste = (e) => { if (S.tab !== "image") return; const fs = [...(e.clipboardData?.files || [])]; if (fs.length) addFiles(fs); };
    $("#savePreset").onclick = async () => {
      await api("/settings", "PUT", { imagePreset: JSON.stringify(P), handle: S.settings.handle || "" });
      S.settings.imagePreset = JSON.stringify(P); toast("Đã lưu preset");
    };
    $("#dlAll").onclick = async () => { for (const [i, f] of IMG.files.entries()) { downloadShot(f, i); await new Promise((r) => setTimeout(r, 250)); } };
  }

  async function addFiles(list) {
    for (const file of [...list].filter((f) => f.type.startsWith("image/"))) {
      const url = URL.createObjectURL(file);
      IMG.files.push({ name: file.name.replace(/\.[^.]+$/, ""), img: await HubImage.loadImage(url), shapes: [], pan: { x: 0.5, y: 0.5 } });
    }
    $("#dlAll").disabled = !IMG.files.length;
    renderGallery();
  }

  // Show each preview as big as the column allows, but never taller than the screen (1 image = no scroll).
  function fitCanvas(c) {
    const wrap = c.parentElement; if (!wrap) return;
    const maxW = wrap.clientWidth;
    const maxH = Math.max(240, window.innerHeight - wrap.getBoundingClientRect().top - 72);
    const w = Math.min(maxW, (maxH * c.width) / c.height);
    c.style.width = `${Math.floor(w)}px`; c.style.height = "auto";
  }

  function renderGallery() {
    const g = $("#gallery"); if (!g) return;
    const drop = $("#drop"); if (drop) drop.hidden = IMG.files.length > 0;
    g.innerHTML = "";
    IMG.files.forEach((f, i) => {
      const P = { ...IMG.preset, handle: S.settings.handle || "" };
      const canvas = HubImage.render(f.img, P, IMG.logoImg, f.shapes || [], f.pan);
      f.canvas = canvas;
      const card = document.createElement("div"); card.className = "tile shot";
      const canPan = IMG.tool === "none" && P.crop !== "orig" && (canvas._geom.spareW || canvas._geom.spareH);
      card.innerHTML = `<div class="canvas-wrap"></div><div class="foot"><span class="t-data">${canvas.width}×${canvas.height}</span>
        ${canPan ? `<span class="t-note">Kéo ảnh để chỉnh phần nằm trong khung</span>` : IMG.tool !== "none" ? `<span class="t-note">Kéo trên ảnh để vẽ</span>` : ""}<span class="spacer"></span>
        ${f.shapes?.length ? `<button class="btn btn-small" data-undo>Hoàn tác</button>` : ""}
        <button class="btn btn-small" data-rm>${icon("x")}</button><button class="btn btn-small btn-dark" data-dl>${icon("download")}Tải</button></div>`;
      $(".canvas-wrap", card).append(canvas);
      canvas.classList.toggle("drawing", IMG.tool !== "none");
      canvas.classList.toggle("pannable", IMG.tool === "none" && P.crop !== "orig");
      bindDraw(canvas, f, P);
      const u = $("[data-undo]", card); if (u) u.onclick = () => { f.shapes.pop(); renderGallery(); };
      $("[data-dl]", card).onclick = () => downloadShot(f, i);
      $("[data-rm]", card).onclick = () => { IMG.files.splice(i, 1); $("#dlAll").disabled = !IMG.files.length; renderGallery(); };
      g.append(card);
      fitCanvas(canvas);
    });
  }

  // Drag on a preview to add an arrow / rectangle. Coords are stored relative to the inner image area (0..1).
  function bindDraw(canvas, f, P) {
    let start = null, snap = null;
    const pt = (e) => {
      const r = canvas.getBoundingClientRect(), g = canvas._geom;
      const x = ((e.clientX - r.left) * canvas.width) / r.width, y = ((e.clientY - r.top) * canvas.height) / r.height;
      return { x: Math.min(1, Math.max(0, (x - g.pad) / g.innerW)), y: Math.min(1, Math.max(0, (y - g.pad) / g.innerH)) };
    };
    // Pan: with a crop ratio and no draw tool, dragging moves the photo inside the frame.
    let pan = null, raf = 0;
    const scale = () => canvas.width / canvas.getBoundingClientRect().width; // canvas px per screen px
    canvas.onpointerdown = (e) => {
      if (IMG.tool === "none") {
        const g = canvas._geom;
        if (P.crop === "orig" || (!g.spareW && !g.spareH)) return;
        e.preventDefault(); canvas.setPointerCapture(e.pointerId);
        pan = { cx: e.clientX, cy: e.clientY, x0: f.pan.x, y0: f.pan.y, s: scale() };
        return;
      }
      e.preventDefault(); canvas.setPointerCapture(e.pointerId);
      start = pt(e); snap = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
    };
    canvas.onpointermove = (e) => {
      if (pan) {
        const g = canvas._geom;
        // drag right = see more of the left side → pan decreases
        const dx = (e.clientX - pan.cx) * pan.s * g.k, dy = (e.clientY - pan.cy) * pan.s * g.k;
        f.pan = { x: g.spareW ? Math.min(1, Math.max(0, pan.x0 - dx / g.spareW)) : 0.5, y: g.spareH ? Math.min(1, Math.max(0, pan.y0 - dy / g.spareH)) : 0.5 };
        if (!raf) raf = requestAnimationFrame(() => {
          raf = 0;
          const c = HubImage.render(f.img, P, IMG.logoImg, f.shapes || [], f.pan);
          const ctx = canvas.getContext("2d"); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(c, 0, 0);
        });
        return;
      }
      if (!start) return;
      const p = pt(e), ctx = canvas.getContext("2d");
      ctx.putImageData(snap, 0, 0);
      HubImage.drawShape(ctx, { type: IMG.tool, x1: start.x, y1: start.y, x2: p.x, y2: p.y }, canvas._geom, P);
    };
    canvas.onpointerup = (e) => {
      if (pan) { pan = null; renderGallery(); return; }
      if (!start) return;
      const p = pt(e), s0 = start; start = null; snap = null;
      if (Math.hypot((p.x - s0.x) * canvas._geom.innerW, (p.y - s0.y) * canvas._geom.innerH) < 6) { renderGallery(); return; }
      (f.shapes ||= []).push({ type: IMG.tool, x1: s0.x, y1: s0.y, x2: p.x, y2: p.y });
      renderGallery();
    };
    canvas.onpointercancel = () => { start = null; snap = null; pan = null; renderGallery(); };
  }

  function downloadShot(f, i) {
    const jpg = IMG.preset.format === "jpg";
    const a = document.createElement("a");
    a.href = f.canvas.toDataURL(jpg ? "image/jpeg" : "image/png", 0.92);
    a.download = `${f.name || "image-" + (i + 1)}-${f.canvas.height}.${jpg ? "jpg" : "png"}`;
    a.click();
  }

  // ---------------- FRAMEWORKS ----------------
  async function viewFrameworks() {
    const { frameworks } = await api("/frameworks"); S.frameworks = frameworks;
    $("#view").innerHTML = `
      <div class="page-head">
        ${pageTitle("Framework")}
        <div class="controls">
          <button class="btn btn-float" id="fwExtract">${icon("sparkles")}Rút từ bài mẫu</button>
          <button class="btn btn-float" id="fwNew">${icon("plus")}Thêm</button>
        </div>
      </div>
      <div class="grid2">${frameworks.map((f) => `
        <article class="tile fw">
          <div class="tile-head"><h2 class="t-header">${esc(f.name)}</h2>
            <button class="btn btn-small" data-edit="${f.id}">${icon("pencil")}Sửa</button></div>
          <p class="t-secondary" style="margin:0 0 12px">${esc(f.description)}</p>
          <details><summary class="t-label">Cấu trúc</summary><pre class="t-content" style="margin-top:8px">${esc(f.structure)}</pre></details>
          ${f.example ? `<details><summary class="t-label">Bài mẫu</summary><pre class="t-secondary" style="margin-top:8px">${esc(f.example)}</pre></details>` : ""}
        </article>`).join("")}
      </div>`;
    $("#fwNew").onclick = () => fwDialog({});
    $("#fwExtract").onclick = extractDialog;
    $$("[data-edit]").forEach((b) => (b.onclick = () => fwDialog(frameworks.find((f) => f.id === Number(b.dataset.edit)))));
  }

  function fwDialog(f) {
    dlg.innerHTML = `
      <form class="tile" id="fwForm">
        <h2 class="t-header">${f.id ? "Sửa framework" : "Framework mới"}</h2>
        <label class="field"><span class="t-label">Tên</span><input class="input" name="name" required maxlength="80" value="${esc(f.name || "")}"></label>
        <label class="field"><span class="t-label">Dùng khi nào</span><input class="input" name="description" maxlength="500" value="${esc(f.description || "")}"></label>
        <label class="field"><span class="t-label">Cấu trúc</span><textarea class="textarea" name="structure" rows="9" maxlength="4000">${esc(f.structure || "")}</textarea></label>
        <label class="field"><span class="t-label">Bài mẫu (AI chỉ học cấu trúc)</span><textarea class="textarea" name="example" rows="6" maxlength="6000">${esc(f.example || "")}</textarea></label>
        <div class="actions">
          ${f.id ? `<button type="button" class="btn btn-danger left" id="fwDel">${icon("trash")}Xoá</button>` : ""}
          <button type="button" class="btn" id="fwCancel">Đóng</button>
          <button class="btn btn-primary" type="submit">Lưu</button>
        </div>
      </form>`;
    dlg.showModal();
    const form = $("#fwForm");
    $("#fwCancel").onclick = () => dlg.close();
    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      if (f.id) await api(`/frameworks/${f.id}`, "PATCH", data); else await api("/frameworks", "POST", data);
      dlg.close(); toast("Đã lưu"); viewFrameworks();
    };
    if (f.id) $("#fwDel").onclick = async () => {
      if (!confirmInline($("#fwDel"), "Bấm lần nữa để xoá")) return;
      await api(`/frameworks/${f.id}`, "DELETE"); dlg.close(); viewFrameworks();
    };
  }

  function extractDialog() {
    dlg.innerHTML = `
      <form class="tile" id="exForm">
        <h2 class="t-header">Rút framework từ bài mẫu</h2>
        <p class="t-secondary" style="margin:0">Dán 1–5 bài cùng kiểu. AI rút ra cấu trúc chung, bạn xem lại rồi lưu.</p>
        <textarea class="textarea" name="posts" rows="12" required placeholder="Dán bài ở đây, mỗi bài cách nhau một dòng trống"></textarea>
        <p class="t-note err" id="exErr" hidden></p>
        <div class="actions"><button type="button" class="btn" id="exCancel">Đóng</button><button class="btn btn-primary" type="submit">${icon("sparkles")}Rút framework</button></div>
      </form>`;
    dlg.showModal();
    $("#exCancel").onclick = () => dlg.close();
    $("#exForm").onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('button[type="submit"]', e.target); btn.disabled = true; btn.innerHTML = '<span class="loading"><i></i><i></i><i></i></span>';
      try {
        const { framework, usage } = await api("/frameworks/extract", "POST", { posts: e.target.posts.value });
        toast(`Xong · $${usage.usd.toFixed(4)}`); fwDialog(framework);
      } catch (ex) { const er = $("#exErr"); er.textContent = ex.message; er.hidden = false; btn.disabled = false; btn.innerHTML = `${icon("sparkles")}Rút framework`; }
    };
  }

  // ---------------- VOICE ----------------
  async function viewVoice() {
    S.settings = { ...(await api("/settings")), loaded: true };
    const voice = S.settings.voice || "";
    $("#view").innerHTML = `
      <div class="page-head">
        ${pageTitle("Giọng văn")}
        <div class="controls"><button class="btn btn-float" id="vSave">${icon("save")}Lưu</button></div>
      </div>
      <div class="stack">
        <section class="tile" id="xBox">${archiveHTML()}</section>
        <section class="tile">
          <div class="tile-head"><h2 class="t-header">Hồ sơ giọng văn</h2><span class="t-note t-data" id="vCount"></span></div>
          <label class="field"><span class="t-label">Tên bạn (AI viết thay ai)</span>
            <input class="input" id="authorIn" maxlength="80" value="${esc(S.settings.author || "")}" placeholder="Vd: Minh Anh"></label>
          <p class="t-secondary" style="margin:0 0 12px">Gửi kèm mọi lần viết (được cache nên rẻ). Sửa trực tiếp ở đây rồi bấm Lưu.</p>
          <textarea class="textarea" id="voiceTxt" rows="22" maxlength="40000" placeholder="Chưa có hồ sơ – tạo từ data X ở trên, hoặc tự viết.">${esc(voice)}</textarea>
        </section>
        <section class="tile">
          <div class="tile-head"><h2 class="t-header">Đối chiếu bài mới</h2></div>
          <p class="t-secondary" style="margin:0 0 12px">Dán vài bài mới viết. AI chỉ ra điểm hồ sơ còn thiếu hoặc mô tả sai, bạn chọn thêm vào.</p>
          <textarea class="textarea" id="vPosts" rows="8" placeholder="Dán bài ở đây"></textarea>
          <div class="msg-foot"><span class="spacer"></span><button class="btn btn-primary" id="vCheck">${icon("sparkles")}Đối chiếu</button></div>
          <div id="vOut"></div>
        </section>
      </div>`;
    const ta = $("#voiceTxt");
    const cnt = () => ($("#vCount").textContent = `${ta.value.length.toLocaleString("vi-VN")} ký tự`);
    ta.oninput = cnt; cnt();
    $("#vSave").onclick = async () => {
      await api("/settings", "PUT", { voice: ta.value, author: $("#authorIn").value.trim() });
      S.settings.voice = ta.value; S.settings.author = $("#authorIn").value.trim(); toast("Đã lưu giọng văn");
    };
    $("#vCheck").onclick = async (e) => {
      const btn = e.currentTarget; const posts = $("#vPosts").value.trim(); if (!posts) return;
      btn.disabled = true; btn.innerHTML = '<span class="loading"><i></i><i></i><i></i></span>';
      try {
        const { voice: sug, usage } = await api("/voice/extract", "POST", { posts });
        $("#vOut").innerHTML = `<div class="row" style="display:block"><pre class="t-content pre">${esc(sug)}</pre>
          <div class="msg-foot"><span class="t-note t-data">$${usage.usd.toFixed(4)}</span><span class="spacer"></span><button class="btn btn-dark" id="vAppend">${icon("plus")}Thêm vào cuối hồ sơ</button></div></div>`;
        $("#vAppend").onclick = () => { ta.value = ta.value.trimEnd() + `\n\n<bo_sung ngay="${new Date().toISOString().slice(0, 10)}">\n${sug}\n</bo_sung>\n`; cnt(); toast("Đã thêm – nhớ bấm Lưu"); };
      } catch (ex) { $("#vOut").innerHTML = `<p class="t-note err">${esc(ex.message)}</p>`; }
      btn.disabled = false; btn.innerHTML = `${icon("sparkles")}Đối chiếu`;
    };
    bindArchive();
  }

  // ---- "Tạo từ data X": the archive is parsed here in the browser; only the selected posts go to the server ----
  const X = { data: null, busy: "" };
  const DEFAULT_PREFS = `Ưu tiên bài NGẮN, đi thẳng vào ý chính, bỏ câu kể lể.
Icon mở bài chỉ dùng bộ: 📌 hướng dẫn / kèo dài · ⚡️ kèo nhanh · 🚨 tin nóng · 🔧 build · 💻 AI · 🎁 thưởng, giveaway · 💙 tin vui · 💔 tin buồn · 💡 góc nhìn cá nhân.
Icon trong bài gọn và nhất quán: • ý không thứ tự, 1️⃣ 2️⃣ bước, → nhân quả, 👉 kết luận, 👇 trỏ link, ✅ checklist. Tối đa 1 emoji cảm xúc mỗi bài, đặt ở câu kết.
Không dùng em dash (—).`;

  function archiveHTML() {
    const d = X.data;
    return `<div class="tile-head"><h2 class="t-header">Tạo từ data X</h2>${d ? `<span class="chip t-data">${d.posts.length.toLocaleString("vi-VN")} bài</span>` : ""}</div>
      ${d ? `
        <pre class="t-secondary pre x-stats">${esc(d.stats)}</pre>
        <label class="field"><span class="t-label">Phong cách bạn muốn BÂY GIỜ (bài cũ lệch chỗ nào thì AI theo phần này)</span>
          <textarea class="textarea" id="xPrefs" rows="6">${esc(ls.get("prefs", DEFAULT_PREFS))}</textarea></label>
        <p class="t-note">Gửi ${d.top.count} bài tương tác cao + ${d.recent.count} bài gần đây (~${Math.round((d.top.text.length + d.recent.text.length) / 1000)}K ký tự). Chi phí đo thật: Tạo giọng văn ~$0,3 (~2 phút), Tạo framework ~$0,2 (~1 phút).</p>
        <p class="t-note err" id="xErr" hidden></p>
        <div class="msg-foot"><button class="btn" id="xReset">Chọn lại file</button><span class="spacer"></span>
          <button class="btn" id="xFw" ${X.busy ? "disabled" : ""}>${X.busy === "fw" ? '<span class="loading"><i></i><i></i><i></i></span>Đang tạo (~2 phút)' : `${icon("sparkles")}Tạo framework`}</button>
          <button class="btn btn-primary" id="xVoice" ${X.busy ? "disabled" : ""}>${X.busy === "voice" ? '<span class="loading"><i></i><i></i><i></i></span>Đang tạo (~3 phút)' : `${icon("sparkles")}Tạo giọng văn`}</button></div>
        <div id="xOut"></div>` : `
        <p class="t-secondary" style="margin:0 0 12px">Trên X: Settings → Your account → Download an archive of your data. Giải nén file X gửi về, mở thư mục <b>data</b>, chọn cùng lúc các file:
          <span class="t-data">account.js</span>, <span class="t-data">tweets.js</span> (và <span class="t-data">tweets-part1.js</span>… nếu có), <span class="t-data">note-tweet.js</span>. Nên làm trên máy tính.</p>
        <p class="t-note">File được đọc ngay trong trình duyệt. Chỉ khoảng 150 bài đã chọn được gửi cho AI, không gửi cả archive.</p>
        <label class="tile drop drop-s" for="xIn"><p class="t-header">Chọn file archive</p><p class="t-secondary" style="margin:4px 0 0">${X.busy === "read" ? "Đang đọc…" : "Chọn nhiều file cùng lúc"}</p></label>
        <input type="file" id="xIn" accept=".js" multiple hidden>
        <p class="t-note err" id="xErr" hidden></p>`}`;
  }
  function paintArchive() { const b = $("#xBox"); if (b) { b.innerHTML = archiveHTML(); bindArchive(); } }
  function xError(msg) { const e = $("#xErr"); if (e) { e.textContent = msg; e.hidden = false; } else toast(msg); }

  function bindArchive() {
    const inp = $("#xIn");
    if (inp) inp.onchange = async () => {
      X.busy = "read"; paintArchive();
      try { X.data = XArchive.parse(await XArchive.readFiles(inp.files)); }
      catch (ex) { X.busy = ""; paintArchive(); xError(ex.message); return; }
      X.busy = ""; paintArchive();
    };
    if (!X.data) return;
    $("#xReset").onclick = () => { X.data = null; paintArchive(); };
    const prefs = () => { const v = $("#xPrefs").value.trim(); ls.set("prefs", v); return v; };
    const payload = () => ({ top: X.data.top.text, recent: X.data.recent.text, stats: X.data.stats, prefs: prefs(), author: $("#authorIn")?.value.trim() || "" });
    $("#xVoice").onclick = async () => {
      const p = payload(); X.busy = "voice"; paintArchive();
      try {
        const out = await api("/voice/build", "POST", p);
        X.busy = ""; paintArchive();
        $("#xOut").innerHTML = `<div class="notes"><p class="t-label">Hồ sơ mới · $${out.usage.usd.toFixed(3)}${out.truncated ? " · bị cắt, bấm lại" : ""}</p>
          <p class="t-secondary">Đã đưa vào ô Hồ sơ giọng văn bên dưới. Đọc, sửa chỗ chưa đúng rồi bấm Lưu.</p></div>`;
        $("#voiceTxt").value = out.voice; $("#voiceTxt").dispatchEvent(new Event("input"));
        $("#voiceTxt").scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (ex) { X.busy = ""; paintArchive(); xError(ex.message); }
    };
    $("#xFw").onclick = async () => {
      const p = payload(); X.busy = "fw"; paintArchive();
      try {
        const { frameworks, usage } = await api("/frameworks/build", "POST", p);
        X.busy = ""; paintArchive();
        X.fws = frameworks.map((f) => ({ ...f, keep: true }));
        $("#xOut").innerHTML = `<div class="notes"><p class="t-label">${frameworks.length} framework · $${usage.usd.toFixed(3)} – bỏ chọn cái không cần rồi lưu</p>
          ${X.fws.map((f, i) => `<label class="remember t-secondary"><input type="checkbox" data-fwk="${i}" checked> <b>${esc(f.name)}</b> – ${esc(f.description)}</label>`).join("")}
          <div class="msg-foot"><span class="spacer"></span><button class="btn btn-primary" id="xFwSave">${icon("save")}Lưu vào Framework</button></div></div>`;
        $$("[data-fwk]").forEach((c) => (c.onchange = () => (X.fws[c.dataset.fwk].keep = c.checked)));
        $("#xFwSave").onclick = async () => {
          const keep = X.fws.filter((f) => f.keep);
          if (!keep.length) return;
          await api("/frameworks", "POST", { frameworks: keep });
          toast(`Đã lưu ${keep.length} framework`); location.hash = "write/frameworks";
        };
      } catch (ex) { X.busy = ""; paintArchive(); xError(ex.message); }
    };
  }

  // ---------------- boot ----------------
  async function boot() {
    try { await api("/me"); } catch { return; }
    renderShell(); route();
  }
  window.addEventListener("hashchange", () => { if ($(".nav")) route(); });
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  boot();
})();
