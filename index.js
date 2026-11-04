// Échecs : ton appli d'origine (HTML et code inchangés), livrée en plugin.
// Ses données sont dans le dossier du plugin, que NeoDex sauvegarde (synchro cloud et sauvegardes) ; à la première ouverture elle reprend ce que tu avais dans NeoDex.
// Elle tourne dans le bac à sable de NeoDex, avec ses outils d'interface (ctx.host) et seulement les autorisations de son plugin.json.
const HTML = "<div class=\"appWrap wide\">\n      <div class=\"agHead\"><span class=\"label\">Échecs</span><span class=\"hint\" id=\"chInfo\"></span><div class=\"agNav\"><select class=\"f gSel\" id=\"chLevel\"><option value=\"0\">Débutant</option><option value=\"1\">Facile</option><option value=\"2\" selected>Moyen</option><option value=\"3\">Difficile</option><option value=\"4\">Expert</option><option value=\"5\">Maître</option><option value=\"6\">Grand maître</option></select><select class=\"f gSel\" id=\"chColor\"><option value=\"w\" selected>Je joue les blancs</option><option value=\"b\">Je joue les noirs</option><option value=\"r\">Couleur au hasard</option></select><button class=\"btn px\" id=\"chUndo\">ANNULER</button><button class=\"btn px\" id=\"chNew\">NOUVELLE PARTIE</button></div></div>\n      <div class=\"chMain\"><div class=\"chBoardWrap\"><div id=\"chBoard\" class=\"px\"></div><div id=\"chPromo\" class=\"chPromo px\"></div></div>\n        <div class=\"chSide\"><div class=\"chState\" id=\"chState\"></div><div class=\"chTaken\" id=\"chTakenAi\"></div><div class=\"sysCard px chMovesCard\"><span class=\"label\">Coups</span><div id=\"chMoves\" class=\"chMoves\"></div></div><div class=\"chTaken\" id=\"chTakenMe\"></div></div></div>\n      <img id=\"chGhost\" alt=\"\">\n      <div class=\"hint\">Clique une pièce puis sa case d'arrivée, ou fais-la glisser. Notation française : R roi, D dame, T tour, F fou, C cavalier. La partie en cours est gardée.</div>\n    </div>";
/*CSS-MOVED*/ const CSS = `.gSel{width:auto;font-size:14px;padding:6px 10px;margin-right:8px}
.chMain{display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap}
.chBoardWrap{position:relative}
#chBoard{display:grid;--sq:min(78px,calc((100vh - 260px) / 8));grid-template-columns:repeat(8,var(--sq));touch-action:none}
.chSq{width:var(--sq);height:var(--sq);position:relative;display:grid;place-items:center}
.chSq.l{background:color-mix(in srgb,var(--violet) 40%,#e8defa)}
.chSq.d{background:color-mix(in srgb,var(--violet) 55%,#1c1238)}
.chSq img{width:86%;height:86%;image-rendering:pixelated;pointer-events:none;position:relative;z-index:1}
.chSq img.lift{opacity:.3}
.chSq.last{box-shadow:inset 0 0 0 100px rgba(255,208,122,.28)}
.chSq.sel{box-shadow:inset 0 0 0 4px var(--pink),inset 0 0 0 100px rgba(var(--pkr),.25)}
.chSq.check{box-shadow:inset 0 0 0 100px rgba(255,79,109,.6)}
.chSq.dot::after{content:"";position:absolute;width:26%;height:26%;background:rgba(5,1,11,.45);z-index:2}
.chSq.cap::after{content:"";position:absolute;inset:4px;box-shadow:inset 0 0 0 4px rgba(5,1,11,.45);z-index:2}
.chSq{cursor:var(--cp,pointer)}
.chSq .rk,.chSq .fl{position:absolute;font:9px var(--title);color:rgba(5,1,11,.55);z-index:0}
.chSq .rk{left:3px;top:3px}
.chSq .fl{right:3px;bottom:3px}
#chGhost{position:fixed;pointer-events:none;z-index:60;display:none;image-rendering:pixelated}
#chGhost.on{display:block}
.chPromo{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:none;gap:8px;padding:12px;z-index:5}
.chPromo.on{display:flex}
.chPromo button{--fill:var(--btn);border:0;padding:6px;cursor:var(--cp,pointer)}
.chPromo button:hover{--fill:var(--btnh)}
.chPromo img{width:64px;height:64px;image-rendering:pixelated}
.chSide{display:flex;flex-direction:column;gap:14px;width:300px;min-width:240px}
.chState{font:12px var(--title);color:#fff;line-height:1.6}
.chState.win{color:#8ee8a0}
.chState.lose{color:var(--red)}
.chMovesCard{max-height:360px}
.chMoves{overflow-y:auto;max-height:300px}
.chMv{display:grid;grid-template-columns:40px 1fr 1fr;font-size:16px;padding:2px 0}
.chMv .n{color:var(--muted)}
.chTaken{display:flex;align-items:center;gap:2px;min-height:32px}
.chTaken img{width:28px;height:28px;image-rendering:pixelated}
.chTaken b{margin-left:8px;color:var(--lilac)}
`;  // le style de ce plugin (il utilise les variables du thème de NeoDex)
export default async function (ctx) {
  const view = ctx.view;
  if (!ctx.host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  const host = ctx.host, { el, toast, sfx, ask, newTab, pixIcon, PIX, WX } = host;
  const folder = ctx.folder, legacy = ctx.legacy || {};
  ctx.host.addStyle(CSS);
  view.innerHTML = HTML;
  const $ = id => id === "chessApp" ? view : (view.querySelector('#' + id) || document.getElementById(id));  // les identifiants de ta vue d'abord, puis ceux de la page (fenêtres, menus)
  const doc = async n => { try { return await folder.read(n); } catch { return null; } };
  const __icon = () => ctx.icon;  // l'icône de ce plugin
  const LEGACY_GAMES = {"top":["chess"],"best":"^$"};
  let games = await doc('games');
  if (games == null) {  // première ouverture : tu retrouves tes records et tes parties d'avant
    const old = legacy.api ? await legacy.api('games').catch(() => null) : null; games = { best: {} };
    if (old) { const re = new RegExp(LEGACY_GAMES.best); for (const [k, v] of Object.entries(old.best || {})) if (re.test(k)) games.best[k] = v; for (const k of LEGACY_GAMES.top) if (old[k] !== undefined) games[k] = old[k]; await folder.write('games', games); }
  }
  games = { best: {}, ...games };
  let gamesTimer = null;
  const saveGames = () => { clearTimeout(gamesTimer); gamesTimer = setTimeout(() => { gamesTimer = null; folder.write('games', games).catch(() => {}); }, 500); };
  const best = (k, v, higher = true) => { const b = games.best[k]; if (b == null || (higher ? v > b : v < b)) { games.best[k] = v; saveGames(); return true; } return false; };
  const gstore = (k, init) => (games[k] ??= init);  // la section d'un jeu
function gameLoop(st, appKey, update, draw) {
  cancelAnimationFrame(st.raf);
  const STEP = 1000 / 60; let acc = 0, last = performance.now();
  const frame = t => {
    if (!view.classList.contains('on')) { st.raf = 0; if (st.mode === 'play') st.mode = 'pause'; return; }  // leaving the tab pauses the game
    st.raf = requestAnimationFrame(frame);
    acc += Math.min(200, t - last); last = t;
    while (acc >= STEP) { if (st.mode === 'play') update(); st.tick++; acc -= STEP; }
    draw();
  };
  st.raf = requestAnimationFrame(frame);
}
function gameText(g, w, lines, y0) {  // centred pixel-font lines over a dark band
  g.fillStyle = 'rgba(11,3,28,.72)'; g.fillRect(0, y0 - 14, w, lines.length * 14 + 14);
  g.textAlign = 'center';
  lines.forEach(([text, color, size], i) => { g.fillStyle = color; g.font = (size || 8) + 'px "Press Start 2P", monospace'; g.fillText(text, w / 2, y0 + i * 14); });
  g.textAlign = 'left';
}
const px = (g, color, x, y, w = 1, h = 1) => { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), w, h); };
function sprite(g, rows, x, y, pal) { rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = pal[r[i]]; if (c) px(g, c, x + i, y + j); } }); }
  // ---- ton code d'origine ----
const pixArt = (rows, pal, scale = 4) => {
  const colors = {o: '#130a20', ...pal}, w = rows[0].length, h = rows.length;
  let shadow = '', body = '';
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '.') return;
    shadow += `<rect x="${x + 1}" y="${y + 1}" width="1" height="1"/>`;
    body += `<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[ch] || '#fff'}"/>`;
  }));
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w + 1} ${h + 1}" width="${(w + 1) * scale}" height="${(h + 1) * scale}" shape-rendering="crispEdges"><g fill="#000" opacity=".45">${shadow}</g>${body}</svg>`);
};

/* ---------- chess rules and engine: board = 64 chars from a8 to h1, uppercase = white, '.' = empty ---------- */
function chessCore() {
  const VAL = {p: 100, n: 320, b: 330, r: 500, q: 900, k: 0};
  const PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
    e: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50],
  };
  const isW = x => x >= 'A' && x <= 'Z', isB = x => x >= 'a' && x <= 'z';
  const ND = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]], BD = [[-1, -1], [-1, 1], [1, -1], [1, 1]], RD = [[-1, 0], [1, 0], [0, -1], [0, 1]], KD = BD.concat(RD);
  const start = () => ({b: [...'rnbqkbnrpppppppp' + '.'.repeat(32) + 'PPPPPPPPRNBQKBNR'], w: true, c: 'KQkq', ep: -1, h: 0});
  function attacked(b, sq, byW) {
    const r = sq >> 3, c = sq & 7, [P, N, B, R, Q, K] = byW ? 'PNBRQK' : 'pnbrqk', pr = byW ? r + 1 : r - 1;
    if (pr >= 0 && pr < 8 && ((c > 0 && b[pr * 8 + c - 1] === P) || (c < 7 && b[pr * 8 + c + 1] === P))) return true;
    for (const [dr, dc] of ND) { const y = r + dr, x = c + dc; if (y >= 0 && y < 8 && x >= 0 && x < 8 && b[y * 8 + x] === N) return true; }
    for (const [dr, dc] of KD) { const y = r + dr, x = c + dc; if (y >= 0 && y < 8 && x >= 0 && x < 8 && b[y * 8 + x] === K) return true; }
    for (const [dirs, S] of [[BD, B], [RD, R]]) for (const [dr, dc] of dirs) for (let y = r + dr, x = c + dc; y >= 0 && y < 8 && x >= 0 && x < 8; y += dr, x += dc) {
      const v = b[y * 8 + x]; if (v === '.') continue; if (v === S || v === Q) return true; break;
    }
    return false;
  }
  function gen(s, capsOnly) {  // pseudo-legal moves {f, t, cap, p (promotion), ep, dbl}
    const b = s.b, w = s.w, out = [], mine = w ? isW : isB, theirs = w ? isB : isW;
    for (let sq = 0; sq < 64; sq++) {
      const pc = b[sq]; if (!mine(pc)) continue;
      const t = pc.toLowerCase(), r = sq >> 3, c = sq & 7;
      if (t === 'p') {
        const d = w ? -1 : 1, r1 = r + d, last = r1 === (w ? 0 : 7);
        const add = (to, cap, ep) => { if (last) for (const p of 'qnrb') out.push({f: sq, t: to, cap, p: w ? p.toUpperCase() : p}); else out.push({f: sq, t: to, cap, ep}); };
        if (b[r1 * 8 + c] === '.' && (!capsOnly || last)) { add(r1 * 8 + c, '.'); if (!capsOnly && r === (w ? 6 : 1) && b[(r + 2 * d) * 8 + c] === '.') out.push({f: sq, t: (r + 2 * d) * 8 + c, cap: '.', dbl: true}); }
        for (const dc of [-1, 1]) { const x = c + dc; if (x < 0 || x > 7) continue; const to = r1 * 8 + x; if (theirs(b[to])) add(to, b[to]); else if (to === s.ep) add(to, w ? 'p' : 'P', true); }
        continue;
      }
      const dirs = t === 'n' ? ND : t === 'b' ? BD : t === 'r' ? RD : KD, slide = t === 'b' || t === 'r' || t === 'q';
      for (const [dr, dc] of dirs) for (let y = r + dr, x = c + dc; y >= 0 && y < 8 && x >= 0 && x < 8; y += dr, x += dc) {
        const to = y * 8 + x, v = b[to];
        if (mine(v)) break;
        if (v !== '.') { out.push({f: sq, t: to, cap: v}); break; }
        if (!capsOnly) out.push({f: sq, t: to, cap: '.'});
        if (!slide) break;
      }
      if (t === 'k' && !capsOnly && sq === (w ? 60 : 4)) {
        const [K, Q, R] = w ? 'KQR' : 'kqr', e = !w;
        if (s.c.includes(K) && b[sq + 1] === '.' && b[sq + 2] === '.' && b[sq + 3] === R && !attacked(b, sq, e) && !attacked(b, sq + 1, e) && !attacked(b, sq + 2, e)) out.push({f: sq, t: sq + 2, cap: '.'});
        if (s.c.includes(Q) && b[sq - 1] === '.' && b[sq - 2] === '.' && b[sq - 3] === '.' && b[sq - 4] === R && !attacked(b, sq, e) && !attacked(b, sq - 1, e) && !attacked(b, sq - 2, e)) out.push({f: sq, t: sq - 2, cap: '.'});
      }
    }
    return out;
  }
  function make(s, m) {
    const b = s.b.slice(), pc = b[m.f];
    b[m.t] = m.p || pc; b[m.f] = '.';
    if (m.ep) b[m.t + (s.w ? 8 : -8)] = '.';
    if ((pc === 'K' || pc === 'k') && Math.abs(m.t - m.f) === 2) { if (m.t > m.f) { b[m.f + 1] = b[m.f + 3]; b[m.f + 3] = '.'; } else { b[m.f - 1] = b[m.f - 4]; b[m.f - 4] = '.'; } }
    let c = s.c;
    if (c) {
      if (pc === 'K') c = c.replace(/[KQ]/g, ''); if (pc === 'k') c = c.replace(/[kq]/g, '');
      for (const q of [m.f, m.t]) c = c.replace({63: 'K', 56: 'Q', 7: 'k', 0: 'q'}[q] || '#', '');
    }
    return {b, w: !s.w, c, ep: m.dbl ? (m.f + m.t) / 2 : -1, h: pc === 'P' || pc === 'p' || m.cap !== '.' ? 0 : s.h + 1};
  }
  const kingOf = (b, w) => b.indexOf(w ? 'K' : 'k');
  const inCheck = s => attacked(s.b, kingOf(s.b, s.w), !s.w);
  const ok = (s, n) => !attacked(n.b, kingOf(n.b, s.w), !s.w);  // the side that moved is not left in check
  const legal = s => gen(s).filter(m => ok(s, make(s, m)));
  const key = s => s.b.join('') + (s.w ? 'w' : 'b') + s.c + s.ep;
  function evaluate(s) {
    let v = 0, mat = 0;
    for (const x of s.b) if (x !== '.' && x !== 'p' && x !== 'P') mat += VAL[x.toLowerCase()];
    const end = mat <= 2600;  // both sides: about a rook and a minor piece each, or less
    for (let i = 0; i < 64; i++) {
      const x = s.b[i]; if (x === '.') continue;
      const t = x.toLowerCase(), tab = t === 'k' && end ? PST.e : PST[t];
      if (isW(x)) v += VAL[t] + tab[i]; else v -= VAL[t] + tab[i ^ 56];
    }
    return s.w ? v : -v;
  }
  const MATE = 100000;
  let nodes = 0, deadline = 0, stop = false;
  const order = (s, ms) => ms.map(m => [m, (m.cap !== '.' ? 10 * VAL[m.cap.toLowerCase()] - VAL[s.b[m.f].toLowerCase()] + 1000 : 0) + (m.p ? VAL[m.p.toLowerCase()] : 0)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  function qs(s, alpha, beta, ply) {
    const stand = evaluate(s);
    if (stand >= beta || ply > 30) return stand;
    if (stand > alpha) alpha = stand;
    for (const m of order(s, gen(s, true))) {
      const n = make(s, m); if (!ok(s, n)) continue;
      const v = -qs(n, -beta, -alpha, ply + 1);
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }
  function search(s, depth, alpha, beta, ply, hist) {
    if ((++nodes & 1023) === 0 && Date.now() > deadline) stop = true;
    if (stop) return 0;
    if (s.h >= 100 || hist.includes(key(s))) return 0;  // fifty moves, or a position already seen: a draw
    if (depth <= 0) return qs(s, alpha, beta, ply);
    let any = false, bestV = -Infinity;
    hist.push(key(s));
    for (const m of order(s, gen(s))) {
      const n = make(s, m); if (!ok(s, n)) continue;
      any = true;
      const ext = ply < 8 && attacked(n.b, kingOf(n.b, n.w), s.w) ? 1 : 0;  // a check is searched one move deeper
      const v = -search(n, depth - 1 + ext, -beta, -alpha, ply + 1, hist);
      if (v > bestV) bestV = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    hist.pop();
    if (!any) return inCheck(s) ? -MATE + ply : 0;
    return bestV;
  }
  const LEVELS = [{d: 1, noise: 220, ms: 4000}, {d: 2, noise: 60, ms: 4000}, {d: 3, noise: 0, ms: 3000}, {d: 30, noise: 0, ms: 1500}, {d: 30, noise: 0, ms: 4000}, {d: 30, noise: 0, ms: 8000}, {d: 30, noise: 0, ms: 15000}];
  function think({s, hist, level}) {  // best move for the side to move
    const lv = LEVELS[level], root = order(s, legal(s));
    if (!root.length) return null;
    nodes = 0; stop = false; deadline = Date.now() + lv.ms;
    let best = root[0];
    for (let d = 1; d <= lv.d; d++) {
      let alpha = -Infinity, cur = null;
      for (const m of [best, ...root.filter(x => x !== best)]) {
        let v = -search(make(s, m), d - 1, -Infinity, lv.noise ? Infinity : -alpha, 1, hist.slice());
        if (stop) break;
        v += (Math.random() * 2 - 1) * lv.noise;
        if (v > alpha) { alpha = v; cur = m; }
      }
      if (stop) break;
      best = cur;
      if (alpha > MATE - 100) break;  // a forced mate found
    }
    return {f: best.f, t: best.t, p: best.p || ''};
  }
  return {start, legal, make, inCheck, key, think, isW};
}

/* ---------- Échecs: interface ---------- */
const CH = chessCore();
const chessWorker = new Worker(URL.createObjectURL(new Blob([`const C = (${chessCore})(); onmessage = e => postMessage({id: e.data.id, m: C.think(e.data)});`], {type: 'text/javascript'})));
const CH_ART = {
  p: ['............', '............', '.....oo.....', '....owwo....', '....owso....', '.....oo.....', '....owwo....', '....owso....', '....owso....', '...owwwso...', '..owwwwwso..', '..oooooooo..'],
  r: ['............', '..oo.oo.oo..', '..owwwwwso..', '..oooooooo..', '...owwwso...', '...owwwso...', '...owwwso...', '...owwwso...', '..oooooooo..', '..owwwwwso..', '.owwwwwwwso.', '.oooooooooo.'],
  n: ['............', '.....oo.....', '....owwoo...', '...owkwwwo..', '..owwwwwwso.', '.owwwoowwso.', '.ooo.owwwso.', '....owwwso..', '...owwwwso..', '...owwwwwso.', '.owwwwwwwso.', '.oooooooooo.'],
  b: ['.....oo.....', '....owwo....', '.....oo.....', '....owwo....', '...owwkso...', '...owkwso...', '...owwwso...', '....owso....', '...oooooo...', '...owwwso...', '.owwwwwwwso.', '.oooooooooo.'],
  q: ['..o.o..o.o..', '..owowwowo..', '..owwwwwso..', '...owwwso...', '...owkwso...', '....owso....', '...owwwso...', '...owwwso...', '..oooooooo..', '..owwwwwso..', '.owwwwwwwso.', '.oooooooooo.'],
  k: ['.....oo.....', '...oowwoo...', '.....oo.....', '...oooooo...', '..owwwwwso..', '..owkwwkso..', '...owwwso...', '...owwwso...', '..oooooooo..', '..owwwwwso..', '.owwwwwwwso.', '.oooooooooo.'],
};
const CH_PAL = {w: {o: '#1c1238', w: '#fff7ff', s: '#c9bdf0', k: '#e01ec8'}, b: {o: '#05010b', w: '#4a2d7a', s: '#2b1650', k: '#ff5ad9'}};
const CH_IMG = Object.fromEntries([...'pnbrqk'].flatMap(t => [[t, pixArt(CH_ART[t], CH_PAL.b, 6)], [t.toUpperCase(), pixArt(CH_ART[t], CH_PAL.w, 6)]]));
const CH_NAMES = {k: 'R', q: 'D', r: 'T', b: 'F', n: 'C', p: ''};  // French notation
const chSqName = i => 'abcdefgh'[i & 7] + (8 - (i >> 3));
let ch = null, chId = 0;
function chSan(s, m, all) {
  const pc = s.b[m.f], t = pc.toLowerCase(), n = CH.make(s, m);
  let san;
  if (t === 'k' && Math.abs(m.t - m.f) === 2) san = m.t > m.f ? 'O-O' : 'O-O-O';
  else {
    const others = all.filter(o => o !== m && o.t === m.t && s.b[o.f] === pc && o.f !== m.f), cap = m.cap !== '.';
    let dis = '';
    if (t !== 'p' && others.length) dis = others.some(o => (o.f & 7) === (m.f & 7)) ? (others.some(o => o.f >> 3 === m.f >> 3) ? chSqName(m.f) : chSqName(m.f)[1]) : chSqName(m.f)[0];
    san = (t === 'p' ? (cap ? chSqName(m.f)[0] : '') : CH_NAMES[t] + dis) + (cap ? 'x' : '') + chSqName(m.t) + (m.p ? '=' + CH_NAMES[m.p.toLowerCase()] : '');
  }
  if (CH.inCheck(n)) san += CH.legal(n).length ? '+' : '#';
  return san;
}
function chStatus() {  // null while the game goes on, else {result: 'w' | 'b' | 'd', why}
  const s = ch.s, moves = CH.legal(s);
  if (!moves.length) return CH.inCheck(s) ? {result: s.w ? 'b' : 'w', why: 'échec et mat'} : {result: 'd', why: 'pat'};
  if (s.h >= 100) return {result: 'd', why: 'règle des 50 coups'};
  if (ch.hist.filter(k => k === CH.key(s)).length >= 3) return {result: 'd', why: 'triple répétition'};
  const rest = s.b.filter(x => x !== '.' && x !== 'k' && x !== 'K');
  if (!rest.length || (rest.length === 1 && /[nbNB]/.test(rest[0]))) return {result: 'd', why: 'matériel insuffisant'};
  return null;
}
function chReplay(save) {
  ch = {s: CH.start(), hist: [], moves: [], level: save.level, human: save.human, sel: -1, over: null};
  ch.hist.push(CH.key(ch.s));
  for (const mv of save.moves) { const m = CH.legal(ch.s).find(x => x.f === mv.f && x.t === mv.t && (x.p || '') === (mv.p || '')); if (!m) break; chApply(m, true); }
}
function chApply(m, quiet) {
  const all = CH.legal(ch.s);
  ch.moves.push({f: m.f, t: m.t, p: m.p || '', san: chSan(ch.s, m, all), cap: m.cap});
  ch.s = CH.make(ch.s, m); ch.hist.push(CH.key(ch.s)); ch.sel = -1;
  ch.over = chStatus();
  if (quiet) return;
  sfx(m.cap !== '.' ? 'close' : 'click');
  const st = gstore('chess', {});
  st.save = ch.over ? null : {level: ch.level, human: ch.human, moves: ch.moves.map(({f, t, p}) => ({f, t, p}))};
  if (ch.over) {
    const r = (st['lvl' + ch.level] ??= {w: 0, l: 0, d: 0});
    const k = ch.over.result === 'd' ? 'd' : ch.over.result === ch.human ? 'w' : 'l'; r[k]++;
    sfx(k === 'w' ? 'launch' : k === 'l' ? 'error' : 'notify');
  }
  saveGames(); chRender();
  if (!ch.over && (ch.s.w ? 'w' : 'b') !== ch.human) chThink();
}
function chThink() {
  ch.thinking = true; chRender();
  const id = ++chId;
  setTimeout(() => chessWorker.postMessage({id, s: ch.s, hist: ch.hist.slice(0, -1), level: ch.level}), 250);  // a short pause: the computer's reply is easier to follow
}
chessWorker.onmessage = e => {
  if (e.data.id !== chId || !ch || ch.over) return;
  ch.thinking = false;
  const m = e.data.m && CH.legal(ch.s).find(x => x.f === e.data.m.f && x.t === e.data.m.t && (x.p || '') === e.data.m.p);
  if (m) chApply(m);
};
function chNew() {
  const c = $('chColor').value, human = c === 'r' ? (Math.random() < .5 ? 'w' : 'b') : c;
  chId++; chReplay({level: +$('chLevel').value, human, moves: []});
  gstore('chess', {}).save = {level: ch.level, human, moves: []}; saveGames();
  chRender();
  if (human === 'b') chThink();
}
function chOpen() {
  if (ch) return chRender();
  const save = games.chess?.save;
  if (!save) return chNew();
  chReplay(save); $('chLevel').value = save.level; chRender();
  if (!ch.over && (ch.s.w ? 'w' : 'b') !== ch.human) chThink();
}
function chTargets() { return ch.sel < 0 ? [] : CH.legal(ch.s).filter(m => m.f === ch.sel); }
function chTry(to) {  // the human plays ch.sel -> to; promotions ask which piece
  const ms = chTargets().filter(m => m.t === to);
  if (!ms.length) return false;
  if (ms.length === 1) { chApply(ms[0]); return true; }
  const box = $('chPromo'); box.replaceChildren(...ms.sort((a, b) => 'QRBNqrbn'.indexOf(a.p) - 'QRBNqrbn'.indexOf(b.p)).map(m => { const b = el('button', 'px'), i = el('img'); i.src = CH_IMG[m.p]; b.append(i); b.onclick = () => { box.classList.remove('on'); chApply(m); }; return b; }));
  box.classList.add('on'); return true;
}
function chRender() {
  const s = ch.s, flip = ch.human === 'b', targets = chTargets(), last = ch.moves.at(-1), check = CH.inCheck(s) ? s.b.indexOf(s.w ? 'K' : 'k') : -1;
  $('chBoard').replaceChildren(...Array.from({length: 64}, (_, k) => {
    const i = flip ? 63 - k : k, r = i >> 3, c = i & 7, d = el('div', 'chSq ' + ((r + c) % 2 ? 'd' : 'l'));
    d.dataset.sq = i;
    if (last && (i === last.f || i === last.t)) d.classList.add('last');
    if (i === ch.sel) d.classList.add('sel');
    if (i === check) d.classList.add('check');
    const tg = targets.find(m => m.t === i); if (tg) d.classList.add(tg.cap !== '.' ? 'cap' : 'dot');
    if (s.b[i] !== '.') { const img = el('img'); img.src = CH_IMG[s.b[i]]; img.draggable = false; d.append(img); }
    if ((flip ? c === 7 : c === 0)) d.append(el('span', 'rk', String(8 - r)));
    if ((flip ? r === 0 : r === 7)) d.append(el('span', 'fl', 'abcdefgh'[c]));
    return d;
  }));
  const you = ch.human, turn = s.w ? 'w' : 'b', o = ch.over;
  $('chState').textContent = o ? (o.result === 'd' ? 'Nulle (' + o.why + ')' : (o.result === you ? 'Tu as gagné ! ' : 'L\'ordinateur gagne : ') + o.why)
    : turn === you ? (CH.inCheck(s) ? 'Échec ! À toi de jouer' : 'À toi de jouer') : 'L\'ordinateur réfléchit…';
  $('chState').className = 'chState' + (o ? (o.result === you ? ' win' : o.result === 'd' ? '' : ' lose') : '');
  const ml = $('chMoves'); ml.replaceChildren();
  for (let i = 0; i < ch.moves.length; i += 2) { const row = el('div', 'chMv'); row.append(el('span', 'n', (i / 2 + 1) + '.'), el('span', '', ch.moves[i].san), el('span', '', ch.moves[i + 1]?.san || '')); ml.append(row); }
  ml.scrollTop = ml.scrollHeight;
  const VAL = {p: 1, n: 3, b: 3, r: 5, q: 9, k: 0};
  const taken = side => ch.moves.filter(m => m.cap !== '.' && CH.isW(m.cap) === (side === 'b')).map(m => m.cap).sort((a, b) => VAL[b.toLowerCase()] - VAL[a.toLowerCase()]);
  const diff = taken(you).reduce((a, x) => a + VAL[x.toLowerCase()], 0) - taken(you === 'w' ? 'b' : 'w').reduce((a, x) => a + VAL[x.toLowerCase()], 0);
  for (const [id, side] of [['chTakenMe', you], ['chTakenAi', you === 'w' ? 'b' : 'w']]) {
    $(id).replaceChildren(...taken(side).map(x => { const i = el('img'); i.src = CH_IMG[x]; return i; }));
    const d = side === you ? diff : -diff; if (d > 0) $(id).append(el('b', '', '+' + d));
  }
  const st = games.chess?.['lvl' + ch.level] || {w: 0, l: 0, d: 0};
  $('chInfo').textContent = 'Niveau ' + $('chLevel').options[ch.level].text + ' · ' + st.w + ' victoires, ' + st.d + ' nulles, ' + st.l + ' défaites';
  $('chUndo').disabled = ch.moves.length < (ch.human === 'w' ? 1 : 2) || ch.thinking;
}
let chDrag = null;
$('chBoard').onpointerdown = e => {
  const d = e.target.closest('.chSq'); if (!d || !ch || ch.over || ch.thinking || (ch.s.w ? 'w' : 'b') !== ch.human) return;
  const i = +d.dataset.sq, pc = ch.s.b[i];
  if (ch.sel >= 0 && chTry(i)) return;
  if (pc === '.' || CH.isW(pc) !== (ch.human === 'w')) { ch.sel = -1; return chRender(); }
  ch.sel = i; chRender();
  const g = $('chGhost'); g.src = CH_IMG[pc]; g.style.width = d.clientWidth + 'px';
  chDrag = {i, x: e.clientX, y: e.clientY, moved: false}; $('chBoard').setPointerCapture(e.pointerId);
};
$('chBoard').onpointermove = e => {
  if (!chDrag) return;
  if (!chDrag.moved && Math.hypot(e.clientX - chDrag.x, e.clientY - chDrag.y) < 6) return;
  if (!chDrag.moved) { chDrag.moved = true; $('chGhost').classList.add('on'); $('chBoard').querySelector(`[data-sq="${chDrag.i}"] img`)?.classList.add('lift'); }
  const g = $('chGhost'); g.style.left = e.clientX - g.offsetWidth / 2 + 'px'; g.style.top = e.clientY - g.offsetHeight / 2 + 'px';
};
$('chBoard').onpointerup = e => {
  if (!chDrag) return;
  const moved = chDrag.moved; chDrag = null; $('chGhost').classList.remove('on');
  if (!moved) return;
  const d = document.elementFromPoint(e.clientX, e.clientY)?.closest('.chSq');
  if (!d || !chTry(+d.dataset.sq)) chRender();
};
$('chNew').onclick = chNew;
$('chLevel').onchange = () => { if (!ch || ch.moves.length < 2 || ch.over) return chNew(); ch.level = +$('chLevel').value; games.chess.save.level = ch.level; saveGames(); chRender(); };
$('chColor').onchange = chNew;
$('chUndo').onclick = () => {  // takes back your last move and the computer's answer
  if (ch.thinking) return;
  const keep = ch.moves.slice(0, -((ch.s.w ? 'w' : 'b') === ch.human ? 2 : 1)).map(({f, t, p}) => ({f, t, p}));
  chId++; chReplay({level: ch.level, human: ch.human, moves: keep}); games.chess.save = {level: ch.level, human: ch.human, moves: keep}; saveGames(); chRender();
};  // (non indenté : les textes sur plusieurs lignes restent exactement les tiens)
  // ---- fin ----
  ctx.onOpen(() => { chOpen(); });
}
