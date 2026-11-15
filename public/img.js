/* HubImage – canvas pipeline: crop → resize to fixed height → frame → shapes → headline → logo. */
window.HubImage = (() => {
  const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';

  function loadImage(src) {
    return new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i); i.onerror = rej; i.src = src;
    });
  }

  function debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // High-quality downscale: halve repeatedly, then final draw.
  function scaled(img, sx, sy, sw, sh, tw, th) {
    let c = document.createElement("canvas"), w = sw, h = sh;
    c.width = sw; c.height = sh;
    let ctx = c.getContext("2d");
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    while (w / 2 >= tw && h / 2 >= th) {
      const n = document.createElement("canvas");
      n.width = Math.round(w / 2); n.height = Math.round(h / 2);
      const nctx = n.getContext("2d");
      nctx.imageSmoothingQuality = "high";
      nctx.drawImage(c, 0, 0, w, h, 0, 0, n.width, n.height);
      c = n; w = n.width; h = n.height;
    }
    return c;
  }

  function wrap(ctx, text, maxW) {
    const words = text.split(/\s+/); const lines = []; let line = "";
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }

  // pan = {x, y} in 0..1 of the spare width/height after cropping (0.5 = centered). User drags to move it.
  function render(img, P, logo, shapes = [], pan = { x: 0.5, y: 0.5 }) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    // 1. crop
    let ratio = iw / ih;
    if (P.crop && P.crop !== "orig") { const [a, b] = P.crop.split(":").map(Number); ratio = a / b; }
    let sw = iw, sh = ih;
    if (iw / ih > ratio) sw = Math.round(ih * ratio); else sh = Math.round(iw / ratio);
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const sx = Math.round((iw - sw) * clamp(pan.x)), sy = Math.round((ih - sh) * clamp(pan.y));

    // 2. size: final height fixed, width follows ratio
    const H = Math.max(100, Math.round(P.height || 540));
    const pad = Math.max(0, Math.min(P.pad || 0, H / 4));
    const innerH = H - pad * 2;
    const innerW = Math.round(innerH * ratio);
    const W = innerW + pad * 2;

    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";

    // 3. frame
    if (pad > 0 || P.format === "jpg") { ctx.fillStyle = P.padColor; ctx.fillRect(0, 0, W, H); }
    ctx.save();
    rr(ctx, pad, pad, innerW, innerH, P.radius || 0); ctx.clip();
    ctx.drawImage(scaled(img, sx, sy, sw, sh, innerW, innerH), pad, pad, innerW, innerH);
    ctx.restore();

    // 3b. drawn shapes (arrow / rectangle): width = shapeWidth, color = strokeColor
    // spareW/H: source pixels per inner pixel, used to convert a drag into a pan change
    const geom = { pad, innerW, innerH, spareW: iw - sw, spareH: ih - sh, k: sw / innerW };
    for (const sh of shapes) drawShape(ctx, sh, geom, P);

    const m = 16; // inner margin from image edge (no inner border: the margin is the frame)
    const x0 = pad + m, y0 = pad + m, x1 = pad + innerW - m, y1 = pad + innerH - m;

    // logo pill size (needed first so the headline can make room)
    const L = P.logoSize || 48;
    const name = P.showHandle ? (P.handle || "").trim() : "";
    const nfs = Math.round(L * 0.42);
    ctx.font = `600 ${nfs}px ${FONT}`;
    const pw = name ? L + 8 + Math.round(nfs * 0.6) + ctx.measureText(name).width + Math.round(nfs * 0.9) : L;
    const ph = name ? L + 8 : L;
    const logoOn = !!(P.logo && logo);
    const logoBottom = (P.logoCorner || "br").startsWith("b");

    // 5. headline
    const text = (P.text || "").trim();
    if (text) {
      const fs = P.textSize || 30;
      ctx.font = `700 ${fs}px ${FONT}`;
      const padX = Math.round(fs * 0.5), padY = Math.round(fs * 0.3), lh = Math.round(fs * 1.2);
      const sameEdge = logoOn && logoBottom === (P.textPos !== "top");
      const avail = x1 - x0 - (sameEdge ? pw + 12 : 0);
      const lines = wrap(ctx, text, Math.max(80, avail - padX * 2));
      const bw = Math.min(Math.max(80, avail), Math.max(...lines.map((l) => ctx.measureText(l).width)) + padX * 2);
      const bh = lines.length * lh + padY * 2;
      const by = P.textPos === "top" ? y0 : y1 - bh;
      const bx = x0; // text always left; logo always right
      ctx.fillStyle = P.textBg; rr(ctx, bx, by, bw, bh, 10); ctx.fill();
      ctx.fillStyle = P.textColor; ctx.textBaseline = "middle";
      lines.forEach((l, i) => ctx.fillText(l, bx + padX, by + padY + lh * i + lh / 2));
    }

    // 6. logo (+ name) – white pill like the hub navbar
    if (logoOn) {
      ctx.font = `600 ${nfs}px ${FONT}`;
      const inner = 4;
      const px = x1 - pw;
      const py = logoBottom ? y1 - ph : y0;
      if (name) {
        ctx.fillStyle = "#FFFFFF"; rr(ctx, px, py, pw, ph, ph / 2); ctx.fill();
      }
      const lx = name ? px + inner : px, ly = name ? py + inner : py;
      ctx.save(); rr(ctx, lx, ly, L, L, name ? L / 2 : Math.round(L * 0.22)); ctx.clip();
      ctx.drawImage(logo, lx, ly, L, L); ctx.restore();
      if (name) {
        ctx.fillStyle = "#000000"; ctx.textBaseline = "middle";
        ctx.fillText(name, lx + L + Math.round(nfs * 0.6), py + ph / 2);
      }
    }
    canvas._geom = geom;
    return canvas;
  }

  // Shapes are stored in 0..1 coords of the inner image area, so they survive crop/size/frame changes.
  // Width is its own setting (default 10, same as the margin), not the inner border.
  const shapeWidth = (P) => Math.max(1, P.shapeWidth || 10);
  function drawShape(ctx, sh, g, P) {
    const X = (v) => g.pad + v * g.innerW, Y = (v) => g.pad + v * g.innerH;
    const x1 = X(sh.x1), y1 = Y(sh.y1), x2 = X(sh.x2), y2 = Y(sh.y2);
    const w = shapeWidth(P);
    ctx.save();
    ctx.strokeStyle = P.strokeColor; ctx.fillStyle = P.strokeColor; ctx.lineWidth = w;
    if (sh.type === "rect") {
      ctx.lineJoin = "miter";
      ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    } else {
      // One solid arrow shape (like →): flat-start shaft + head, filled as a single polygon.
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 2) { ctx.restore(); return; }
      const ux = (x2 - x1) / len, uy = (y2 - y1) / len, nx = -uy, ny = ux; // along / across
      const headL = Math.min(len * 0.6, w * 3), headW = w * 3; // head length + full width
      const bx = x2 - ux * headL, by = y2 - uy * headL;      // head base on the axis
      const s = w / 2, h = headW / 2;
      ctx.beginPath();
      ctx.moveTo(x1 + nx * s, y1 + ny * s);
      ctx.lineTo(bx + nx * s, by + ny * s);
      ctx.lineTo(bx + nx * h, by + ny * h);
      ctx.lineTo(x2, y2);
      ctx.lineTo(bx - nx * h, by - ny * h);
      ctx.lineTo(bx - nx * s, by - ny * s);
      ctx.lineTo(x1 - nx * s, y1 - ny * s);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  async function shrinkToDataURL(file, max) {
    const img = await loadImage(URL.createObjectURL(file));
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/png");
  }

  return { render, drawShape, loadImage, debounce, shrinkToDataURL };
})();
