/* Leser: Zustand, Gesten, Blätterphysik, Buchgefühl, Werkzeuge und Bedienung. */
(function () {
  'use strict';
  const M = window.META;
  const AUS = M.ausgaben;
  const $ = (id) => document.getElementById(id);
  const body = document.body;
  const BR = window.Buch || null;
  const brueck = (f, ...a) => { try { if (BR && BR[f]) return BR[f](...a); } catch (e) {} return undefined; };
  const merke = (k, v) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) {} };
  const hole = (k, std) => { try { const v = localStorage.getItem(k); return v == null ? std : JSON.parse(v); } catch (e) { return std; } };
  // Erweiterungen (Labor) hören auf Ereignisse und zeichnen eigene Marken auf die Seite
  const horcher = {}, zusatzMarken = [];
  const sende = (ev, d) => { for (const f of horcher[ev] || []) { try { f(d); } catch (e) { console.warn(e); } } };
  const klemme = (v, a, b) => Math.max(a, Math.min(b, v));
  const glatt = (a, b, x) => { const t = klemme((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const zufall = (a, b) => a + Math.random() * (b - a);
  const jetzt = () => performance.now();
  const KAPITELNAMEN = { 'Die beseelte Welt': 'Erstes Kapitel', 'Gestalten der Geisterwelt': 'Zweites Kapitel', 'Sagenlese': 'Erzählte Überlieferung',
    'Die großen Motive der Sage': 'Drittes Kapitel', 'Über Europa hinaus': 'Viertes Kapitel', 'Landschaft, Not und Wandel': 'Fünftes Kapitel',
    'Von der Seele der Pflanzen': 'Sechstes Kapitel', 'Die Dinge des Schutzes': 'Siebtes Kapitel', 'Zeittafel der Quellen': 'Anhang', 'Glossar': 'Anhang' };

  // ---------- Einstellungen ----------
  const E = Object.assign({ nacht: 'aus', warm: 0, hell: -1, klang: true, vib: true, umgebung: 'aus', umgLaut: 0.45, tasten: false, tempo: 1.0, schlaf: '0' }, hole('handbuch-einstellungen', {}));
  const speichereE = () => merke('handbuch-einstellungen', E);

  // ---------- Klang und Gefühl ----------
  const K = new window.Klang();
  K.stumm = () => false;
  let stimmZaehler = 0;
  function stimmeFuer(b, staerke) {
    if (!K.start()) return;
    if (!b.id) b.id = ++stimmZaehler;
    K.stimme(b.id, { schwer: b.starr, gross: modus === 'buch', leise: b.riffel });
    if (staerke != null) K.abheben(b.id, staerke);
  }
  const stimmenEnde = (liste) => { for (const b of liste) if (b.id) K.stimmeEnde(b.id); };
  K.an = E.klang;
  const iosTipp = (() => {
    if (BR || navigator.vibrate || !(/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent)))) return null;
    const l = document.createElement('label'), i = document.createElement('input');
    i.type = 'checkbox'; i.setAttribute('switch', ''); i.tabIndex = -1;
    l.setAttribute('aria-hidden', 'true'); l.style.cssText = 'position:fixed;left:-200px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    l.appendChild(i); document.body.appendChild(l);
    l.addEventListener('click', (e) => e.stopPropagation());
    i.addEventListener('focus', () => i.blur());
    return () => { try { l.click(); } catch (e) {} };
  })();
  const fuehle = (art) => {
    if (!E.vib) return;
    if (BR) brueck('haptik', art);
    else if (navigator.vibrate) { try { navigator.vibrate(art === 'lande' ? 12 : 6); } catch (e) {} }
    else if (iosTipp && art !== 'riffel') iosTipp();
  };

  // ---------- Bühne ----------
  const canvas = $('buehne');
  let R = null;
  try { R = new window.Buehne(canvas); } catch (e) { R = null; }

  let modus = 'handy', A = AUS.handy, pos = 1;
  let D = null;
  const geo = { W: 1, H: 1, ursprung: [0, 0], seite: [1, 1] };
  let skala = 1, stoss = 0, stossV = 0;
  let nachtWert = 0;
  let dimm = 1;

  function waehleModus() {
    const w = innerWidth, h = innerHeight;
    return (w > h * 1.15 && w >= 560) ? 'buch' : 'handy';
  }
  // Web-Ausgabe: Statusleiste und Kamera-Aussparung frei halten (die App läuft im Vollbild ohne Leisten)
  let randFuehler = null;
  function geraeteRand() {
    if (BR) return [0, 0, 0, 0];
    if (!randFuehler) {
      randFuehler = document.createElement('div');
      randFuehler.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);';
      document.body.appendChild(randFuehler);
    }
    const c = getComputedStyle(randFuehler);
    return [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft].map((v) => parseFloat(v) || 0);
  }
  function geometrie() {
    const W = innerWidth, H = innerHeight;
    geo.W = W; geo.H = H;
    const a = A.w / A.h;
    const [ro, rr, , rl] = geraeteRand();
    if (modus === 'handy') {
      const mx = Math.max(7, W * 0.018), my = 10;
      let pw = W - 2 * mx, ph = pw / a;
      if (ph > H - ro - 2 * my) { ph = H - ro - 2 * my; pw = ph * a; }
      geo.seite = [pw, ph];
      geo.ursprung = [(W - pw) / 2, ro + (H - ro - ph) / 2];
    } else {
      const mx = Math.max(26, rl + 8, rr + 8), my = Math.max(8, H * 0.03, ro);
      let ph = H - 2 * my, pw = ph * a;
      if (2 * pw > W - 2 * mx) { pw = (W - 2 * mx) / 2; ph = pw / a; }
      geo.seite = [pw, ph];
      geo.ursprung = [W / 2, (H - ph) / 2];
    }
    if (R) R.groesse(W, H, Math.min(3, window.devicePixelRatio || 1));
    anstossen();
    ueberlagerung();
  }

  // ---------- Seitendaten ----------
  const DATEN_GELADEN = {};
  function ladeDaten(dir) {
    if (DATEN_GELADEN[dir]) return DATEN_GELADEN[dir];
    DATEN_GELADEN[dir] = new Promise((ok) => {
      if (window.DATEN && window.DATEN[dir]) { ok(window.DATEN[dir]); return; }
      if (window.SCHUTZ) { SCHUTZ.skript('daten-' + dir + '.js').then(() => ok(window.DATEN && window.DATEN[dir]), () => ok(null)); return; }
      const s = document.createElement('script');
      s.src = 'daten-' + dir + '.js';
      s.onload = () => ok(window.DATEN && window.DATEN[dir]);
      s.onerror = () => ok(null);
      document.head.appendChild(s);
    });
    return DATEN_GELADEN[dir];
  }
  const woerterCache = new Map();
  function woerter(dir, i) {
    const key = dir + ':' + i;
    if (woerterCache.has(key)) return woerterCache.get(key);
    const S = window.DATEN && window.DATEN[dir] && window.DATEN[dir][i];
    if (!S) return null;
    const t = S.t ? S.t.split(' ') : [];
    const liste = t.map((w, k) => ({ w, x0: S.r[4 * k] / 1e4, y0: S.r[4 * k + 1] / 1e4, x1: S.r[4 * k + 2] / 1e4, y1: S.r[4 * k + 3] / 1e4, a: S.a[k] }));
    woerterCache.set(key, liste);
    if (woerterCache.size > 60) woerterCache.delete(woerterCache.keys().next().value);
    return liste;
  }
  const seiteInfo = (dir, i) => { const S = window.DATEN && window.DATEN[dir] && window.DATEN[dir][i]; return S || null; };
  const istDunkel = (i) => { const S = seiteInfo(A.dir, i); return S ? !!S.d : (i === 0 || i === A.n - 1); };
  const bildFlaechen = (i) => { const S = seiteInfo(A.dir, i); return S ? S.b.map((r) => [r[0] / 1e4, r[1] / 1e4, r[2] / 1e4, r[3] / 1e4]) : null; };

  // ---------- Texturen ----------
  const tex = new Map();
  const ueberVersion = new Map();
  const ueberV = (dir, i) => ueberVersion.get(dir + ':' + i) || 0;
  function erneuereUeber(dir, i) { ueberVersion.set(dir + ':' + i, ueberV(dir, i) + 1); const e = tex.get(dir + ':' + i); if (e && e.img) belade(e); }
  const pfad = (dir, i) => dir + '/' + String(i).padStart(4, '0') + '.webp';
  // Web-Ausgabe: Seiten liegen gebündelt in Paketen, window.PAKETE[dir][i] = [paket, versatz, länge]
  const PK = window.PAKETE || null, pakete = new Map(), quellen = new Map();
  function paket(dir, nr) {
    const k = dir + ':' + nr;
    if (!pakete.has(k)) {
      const url = dir + '/' + PK.datei[dir][nr];
      const p = (async () => {
        if (window.SCHUTZ) return SCHUTZ.blob(url);
        let c = null;
        try { if (navigator.serviceWorker && navigator.serviceWorker.controller) throw 0; c = await caches.open('handbuch-seiten'); const r = await c.match(url); if (r) return await r.blob(); } catch (e) { c = null; }
        const r = await fetch(url);
        if (!r.ok) throw new Error(url);
        if (c) { try { await c.put(url, r.clone()); } catch (e) {} }
        return await r.blob();
      })();
      p.catch(() => pakete.delete(k));
      pakete.set(k, p);
    }
    return pakete.get(k);
  }
  const bildQuelle = (p) => window.SCHUTZ ? SCHUTZ.url(p) : Promise.resolve(p);
  function seitenQuelle(dir, i) {
    if (!PK || !PK[dir]) return Promise.resolve(pfad(dir, i));
    const k = dir + ':' + i;
    if (!quellen.has(k)) {
      const [nr, o, l] = PK[dir][i];
      const q = paket(dir, nr).then((b) => URL.createObjectURL(b.slice(o, o + l, 'image/webp')));
      q.catch(() => quellen.delete(k));
      quellen.set(k, q);
    }
    return quellen.get(k);
  }
  function seitenTextur(i) {
    if (i < 0 || i >= A.n) return null;
    const k = A.dir + ':' + i;
    let e = tex.get(k);
    if (!e) {
      e = { k, dir: A.dir, i, t: null, img: null, v: -1, zeit: 0 };
      tex.set(k, e);
      const img = new Image();
      img.decoding = 'async';
      seitenQuelle(A.dir, i).then((u) => { img.src = u; return img.decode ? img.decode() : new Promise((ok, f) => { img.onload = ok; img.onerror = f; }); }).then(() => {
        if (!tex.has(k)) return;
        e.img = img;
        belade(e);
      }).catch(() => {});
    }
    e.zeit = jetzt();
    e.dunkel = istDunkel(i);
    e.bilder = bildFlaechen(i);
    return e;
  }
  function belade(e) {
    if (!R || !e.img || e.dir !== A.dir) return;
    const v = ueberV(e.dir, e.i);
    const quelle = (hatUeber(e.dir, e.i)) ? komponiere(e) : e.img;
    e.t = R.textur(quelle, modus === 'buch', e.t);
    e.v = v;
    anstossen();
    if (!ersterFrame) bereitPruefen();
  }
  function aufraeumen(behalten) {
    const max = modus === 'buch' ? 12 : 9;
    if (tex.size <= max) return;
    const liste = [...tex.values()].filter((e) => !behalten.has(e.k)).sort((a, b) => a.zeit - b.zeit);
    while (tex.size > max && liste.length) { const e = liste.shift(); if (R) R.loesche(e.t); tex.delete(e.k); }
  }
  function texturenLeeren() { for (const e of tex.values()) if (R) R.loesche(e.t); tex.clear(); }
  function vorladen() {
    const s = sichtbareSeiten();
    const extra = modus === 'handy' ? [pos - 1, pos + 1, pos + 2] : [2 * pos - 3, 2 * pos - 2, 2 * pos + 1, 2 * pos + 2, 2 * pos + 3];
    const alle = new Set();
    [...s, ...extra].forEach((i) => { const e = seitenTextur(i); if (e) alle.add(e.k); });
    for (const b of blaetter) { if (b.vorn) alle.add(b.vorn.k); if (b.hinten) alle.add(b.hinten.k); }
    for (const f of flach) if (f.e) alle.add(f.e.k);
    aufraeumen(alle);
  }

  // Markierungen und Lesebändchen auf die Seite legen
  function hatUeber(dir, i) { return lesezeichenAuf(dir, i) || markierungenAuf(dir, i).length > 0; }
  function komponiere(e) {
    const img = e.img, W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const ws = woerter(e.dir, e.i);
    const rand = e.dir === 'h' ? 0.962 : 0.937;
    for (const m of markierungenAuf(e.dir, e.i)) {
      const o = m[e.dir];
      if (!ws) continue;
      g.save();
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = 'rgb(241, 211, 132)';
      for (const z of zeilenRechtecke(ws, o.a, o.b)) {
        const h = (z[3] - z[1]) * H;
        g.beginPath();
        rundRechteck(g, z[0] * W - h * 0.12, z[1] * H - h * 0.06, (z[2] - z[0]) * W + h * 0.24, h * 1.1, h * 0.18);
        g.fill();
      }
      g.restore();
      if (m.notiz) {
        const z = ws[o.a];
        if (z) { g.fillStyle = 'rgba(176, 96, 52, 0.95)'; g.beginPath(); g.arc(rand * W, (z.y0 + z.y1) / 2 * H, W * 0.0085, 0, Math.PI * 2); g.fill(); }
      }
    }
    if (lesezeichenAuf(e.dir, e.i)) zeichneBand(g, W, H, e);
    return c;
  }
  function rundRechteck(g, x, y, w, h, r) {
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  }
  function zeilenRechtecke(ws, a, b) {
    const out = [];
    for (let k = a; k <= b && k < ws.length; k++) {
      const w = ws[k];
      const l = out[out.length - 1];
      if (l && Math.abs(l[1] - w.y0) < (w.y1 - w.y0) * 0.5 && w.x0 >= l[2] - 0.002) { l[2] = w.x1; l[3] = Math.max(l[3], w.y1); }
      else out.push([w.x0, w.y0, w.x1, w.y1]);
    }
    return out;
  }
  function zeichneBand(g, W, H, e) {
    const b = W * 0.036, x = W * (e.dir === 'h' ? 0.021 : 0.045), ende = H * 0.875;
    g.save();
    g.shadowColor = 'rgba(20, 10, 5, 0.35)'; g.shadowBlur = b * 0.45; g.shadowOffsetX = b * 0.14; g.shadowOffsetY = b * 0.08;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + b, 0); g.lineTo(x + b, ende); g.lineTo(x + b / 2, ende - b * 0.6); g.lineTo(x, ende); g.closePath();
    const v = g.createLinearGradient(x, 0, x + b, 0);
    v.addColorStop(0, '#4c1410'); v.addColorStop(0.35, '#7a231d'); v.addColorStop(0.6, '#6c1e19'); v.addColorStop(1, '#4a130f');
    g.fillStyle = v; g.fill();
    g.restore();
    g.save();
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + b, 0); g.lineTo(x + b, ende); g.lineTo(x + b / 2, ende - b * 0.6); g.lineTo(x, ende); g.closePath(); g.clip();
    g.globalAlpha = 0.09; g.fillStyle = '#000';
    for (let y = 0; y < ende; y += Math.max(2, b * 0.09)) g.fillRect(x, y, b, Math.max(1, b * 0.03));
    g.globalAlpha = 0.12; g.fillStyle = '#fff';
    g.fillRect(x + b * 0.3, 0, b * 0.08, ende);
    g.restore();
  }

  // ---------- Blätter und Physik ----------
  let blaetter = [];
  let flach = [];
  let warteschlange = 0;
  function sichtbareSeiten() {
    if (modus === 'handy') return [pos];
    return [2 * pos - 1, 2 * pos].filter((i) => i >= 0 && i < A.n);
  }
  function ruheFlach() {
    const pw = geo.seite[0];
    if (modus === 'handy') return [{ i: pos, versatz: 0 }];
    return [{ i: 2 * pos - 1, versatz: -pw }, { i: 2 * pos, versatz: 0 }].filter((f) => f.i >= 0 && f.i < A.n);
  }
  const letzterAufschlag = () => Math.ceil((A.n - 1) / 2);
  const kann = (r) => modus === 'handy' ? (r > 0 ? pos < A.n - 1 : pos > 0) : (r > 0 ? pos < letzterAufschlag() : pos > 0);

  function falz(Aa, F, Rr) {
    const dx = Aa[0] - F[0], dy = Aa[1] - F[1];
    const Dd = Math.hypot(dx, dy);
    if (Dd < 0.05) return null;
    const n = [dx / Dd, dy / Dd];
    const pr = Math.PI * Rr;
    let d;
    // Die gegriffene Stelle wandert um s(d): auf der Wölbung d − R·sin(d/R), danach 2d − πR
    if (Dd >= pr) d = (Dd + pr) / 2;
    else {
      let lo = 0, hi = pr;
      for (let k = 0; k < 24; k++) { const mi = (lo + hi) / 2; if (mi - Rr * Math.sin(mi / Rr) < Dd) lo = mi; else hi = mi; }
      d = (lo + hi) / 2;
    }
    return { O: [Aa[0] - n[0] * d, Aa[1] - n[1] * d], n, R: Rr };
  }
  function begrenze(F, Aa, ph) {
    for (let k = 0; k < 2; k++) for (const C of [[0, 0], [0, ph]]) {
      const r = Math.hypot(Aa[0] - C[0], Aa[1] - C[1]);
      const dx = F[0] - C[0], dy = F[1] - C[1], d = Math.hypot(dx, dy);
      if (d > r) F = [C[0] + dx * r / d, C[1] + dy * r / d];
    }
    return F;
  }
  const fortschritt = (b) => klemme((geo.seite[0] - b.B[0]) / (2 * geo.seite[0]), 0, 1);
  function geometrieBlatt(b) {
    const [pw, ph] = geo.seite;
    if (b.starr) return { modus: 2, winkel: Math.acos(klemme(b.B[0] / pw, -1, 1)) };
    const p = fortschritt(b);
    const F = begrenze([b.B[0], b.B[1] + b.hub * Math.sin(Math.PI * p)], b.A, ph);
    const Rr = pw * (0.17 - 0.115 * glatt(0.6, 1.0, p)) * b.radius;
    const f = falz(b.A, F, Rr);
    if (!f) return { modus: 0 };
    return { modus: 1, O: f.O, n: f.n, R: Rr };
  }

  // Seiten eines Blattes und darunter liegende Seiten bestimmen
  function blattSeiten(r) {
    const pw = geo.seite[0];
    if (modus === 'handy') {
      return r > 0 ? { vorn: pos, hinten: null, flach: [{ i: pos + 1, versatz: 0 }], ziel: pos + 1 }
        : { vorn: pos - 1, hinten: null, flach: [{ i: pos, versatz: 0 }], ziel: pos - 1 };
    }
    const L = 2 * pos - 1, Rs = 2 * pos;
    return r > 0 ? { vorn: Rs, hinten: Rs + 1, flach: [{ i: L, versatz: -pw }, { i: Rs + 2, versatz: 0 }], ziel: pos + 1 }
      : { vorn: L - 1, hinten: L, flach: [{ i: L - 2, versatz: -pw }, { i: Rs, versatz: 0 }], ziel: pos - 1 };
  }
  function neuesBlatt(r, ay, ecke, opt) {
    const [pw, ph] = geo.seite;
    const s = opt && opt.seiten ? opt.seiten : blattSeiten(r);
    const b = {
      r, ecke, A: [pw, ay], B: r > 0 ? [pw, ay] : [-pw, ay], v: [0, 0],
      vorn: seitenTextur(s.vorn), hinten: s.hinten != null ? seitenTextur(s.hinten) : null,
      starr: s.vorn === 0 || (opt && opt.starr),
      hub: ecke === 'unten' ? -0.10 * ph * zufall(0.8, 1.2) : ecke === 'oben' ? 0.08 * ph * zufall(0.8, 1.2) : zufall(-0.015, 0.015) * ph,
      radius: zufall(0.92, 1.08), phase: 'ruhe', z: 0, ziel: s.ziel, gekippt: false, gelandet: false,
    };
    if (b.vorn && b.vorn.i === 0) b.starr = true;
    return b;
  }
  function flachSetzen(liste) {
    flach = liste.filter((f) => f.i >= 0 && f.i < A.n).map((f) => ({ i: f.i, versatz: f.versatz, e: seitenTextur(f.i) }));
  }

  // Ende eines Blattes: neue Lage übernehmen
  function blattFertig(b, vollendet) {
    blaetter = blaetter.filter((x) => x !== b);
    if (b.id) K.stimmeEnde(b.id);
    if (vollendet && b.ziel != null) {
      pos = b.ziel;
      geblaettert();
    }
    if (!blaetter.length) {
      flachSetzen(ruheFlach());
      if (warteschlange && blaetter.length === 0) {
        const r = warteschlange > 0 ? 1 : -1;
        warteschlange -= r;
        if (kann(r)) setTimeout(() => automatisch(r, { eilig: true }), 0);
        else warteschlange = 0;
      }
    }
    anstossen();
  }

  // Blatt nach Fahrplan (Tippen, Tasten, Vorlesen, Durchblättern)
  function automatisch(r, opt) {
    opt = opt || {};
    if (!kann(r)) { anschlag(r); return; }
    const laufend = blaetter.find((b) => b.phase === 'fahrplan' && !b.riffel);
    if (laufend) {
      if (laufend.r === r) { laufend.eile = 3.2; warteschlange += r; }
      return;
    }
    if (blaetter.length) return;
    const ph = geo.seite[1];
    const b = neuesBlatt(r, ph * zufall(0.86, 0.95), 'unten');
    const pw = geo.seite[0];
    b.phase = 'fahrplan';
    b.fahr = { t0: jetzt() + (opt.verzug || 0), dauer: (opt.dauer || (b.starr ? 760 : 520)) * zufall(0.93, 1.07) * (opt.eilig ? 0.72 : 1), von: b.B.slice(), nach: r > 0 ? [-pw, b.A[1]] : [pw, b.A[1]] };
    b.eile = 1;
    const s = blattSeiten(r);
    flachSetzen(s.flach);
    blaetter.push(b);
    if (!opt.still) {
      stimmeFuer(b, b.starr ? 0.7 : zufall(0.35, 0.55));
      if (!opt.leise) fuehle('griff');
    }
    anstossen();
  }
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // Anschlag am Buchende: kurzer Ruck und spürbares Ende
  function anschlag(r) { stossV += (r > 0 ? -1 : 1) * 260; fuehle('rand'); anstossen(); }

  function aktualisiereBlaetter(dt, t) {
    let aktiv = false;
    const pw = geo.seite[0];
    for (const b of [...blaetter]) {
      const p0 = fortschritt(b);
      if (b.phase === 'fahrplan') {
        const f = b.fahr;
        if (t < f.t0) { aktiv = true; continue; }
        if (b.riffel && !b.losgelassen) { b.losgelassen = true; stimmeFuer(b, 0.3); }
        f.lauf = (f.lauf || 0) + dt * 1000 * (b.eile || 1);
        const u = klemme(f.lauf / f.dauer, 0, 1);
        const e = ease(u);
        b.B = [f.von[0] + (f.nach[0] - f.von[0]) * e, f.von[1] + (f.nach[1] - f.von[1]) * e];
        if (u >= 1) {
          if (b.id) K.lande(b.id, b.riffel ? zufall(0.18, 0.3) : b.starr ? 0.85 : zufall(0.4, 0.62));
          if (!b.riffel) fuehle('lande');
          blattFertig(b, true);
          if (b.nachher) b.nachher();
          continue;
        }
        aktiv = true;
      } else if (b.phase === 'feder') {
        const ziel = b.zielB;
        const omega = b.vollenden ? 12.5 : 15, zeta = b.vollenden ? 0.95 : 0.78;
        const schritte = Math.ceil(dt / 0.004);
        const h = dt / schritte;
        for (let k = 0; k < schritte; k++) {
          for (let a = 0; a < 2; a++) {
            const acc = -omega * omega * (b.B[a] - ziel[a]) - 2 * zeta * omega * b.v[a];
            b.v[a] += acc * h;
            b.B[a] += b.v[a] * h;
          }
          if (b.B[0] > pw) { b.B[0] = pw; if (b.v[0] > 0) b.v[0] = 0; }
          if (b.B[0] < -pw) { b.B[0] = -pw; if (b.v[0] < 0) b.v[0] = 0; }
        }
        const p = fortschritt(b);
        if (b.vollenden && !b.gelandet && ((b.r > 0 && p > 0.965) || (b.r < 0 && p < 0.035))) {
          b.gelandet = true;
          fuehle('lande');
          if (b.id) K.lande(b.id, b.starr ? 0.9 : 0.3 + 0.7 * Math.min(1, Math.hypot(b.v[0], b.v[1]) / 1800));
        }
        if (Math.hypot(b.B[0] - ziel[0], b.B[1] - ziel[1]) < 0.6 && Math.hypot(b.v[0], b.v[1]) < 40) {
          if (!b.vollenden && b.id) K.lande(b.id, 0.12 + 0.25 * Math.min(1, (b.maxP || 0) * 2));
          blattFertig(b, b.vollenden);
          continue;
        }
        aktiv = true;
      } else if (b.phase === 'zug') {
        aktiv = true;
      }
      const p1 = fortschritt(b);
      if (!b.riffel && b.phase !== 'fahrplan' && b.phase !== 'deckel' && (p0 - 0.5) * (p1 - 0.5) < 0) fuehle('kipp');
      klingeBlatt(b, dt);
    }
    return aktiv;
  }

  // Die Stimme eines Blattes folgt seiner Bewegung: Tempo, Finger, Lage
  function klingeBlatt(b, dt) {
    if (!b.id) return;
    const p = fortschritt(b);
    const tempo = b.pL == null ? 0 : Math.abs(p - b.pL) / Math.max(0.004, dt);
    b.pL = p;
    b.maxP = Math.max(b.maxP || 0, b.r > 0 ? p : 1 - p);
    const finger = zug && zug.b === b ? (zug.fv || 0) : 0;
    K.bewege(b.id, { tempo, finger, x: (1 - 2 * p) * (modus === 'handy' ? 0.55 : 0.7), dt });
  }

  // Durchblättern zu einer entfernten Stelle
  function riffel(ziel) {
    if (blaetter.length) { for (const b of [...blaetter]) blattFertig(b, b.phase === 'fahrplan' || b.vollenden); }
    const r = ziel > pos ? 1 : -1;
    const abstand = Math.abs(ziel - pos);
    if (!abstand) return;
    if (abstand === 1) { automatisch(r); return; }
    const n = Math.min(abstand, 7);
    const [pw, ph] = geo.seite;
    const liste = [];
    for (let k = 0; k < n; k++) liste.push(Math.round(pos + r * (k * abstand / n)));
    let seiten;
    if (modus === 'handy') {
      flachSetzen([{ i: r > 0 ? ziel : pos, versatz: 0 }]);
      seiten = r > 0 ? liste.map((s) => ({ vorn: s, hinten: null }))
        : liste.map((s, k) => ({ vorn: k === n - 1 ? ziel : pos - 1 - Math.round(k * (abstand - 1) / Math.max(1, n - 1)), hinten: null }));
    } else {
      flachSetzen(r > 0 ? [{ i: 2 * pos - 1, versatz: -pw }, { i: 2 * ziel, versatz: 0 }] : [{ i: 2 * ziel - 1, versatz: -pw }, { i: 2 * pos, versatz: 0 }]);
      seiten = r > 0 ? liste.map((s, k) => { const f = k === n - 1 ? 2 * ziel - 2 : 2 * s; return { vorn: f, hinten: f + 1 }; })
        : liste.map((s, k) => { const f = k === n - 1 ? 2 * ziel : 2 * (pos - 1) - 2 * Math.round(k * (abstand - 1) / Math.max(1, n - 1)); return { vorn: f, hinten: f + 1 }; });
    }
    const takt = 62, dauer = 330;
    seiten.forEach((s, k) => {
      const b = neuesBlatt(r, ph * zufall(0.84, 0.96), 'unten', { seiten: { vorn: s.vorn, hinten: s.hinten, ziel: null } });
      b.starr = false;
      b.riffel = true;
      b.phase = 'fahrplan';
      b.hub *= 0.7;
      b.fahr = { t0: jetzt() + k * takt, dauer: dauer * zufall(0.92, 1.08), von: b.B.slice(), nach: r > 0 ? [-pw, b.A[1]] : [pw, b.A[1]] };
      b.z = r > 0 ? (n - k) * 0.8 : (k + 1) * 0.8;
      if (k === n - 1) b.nachher = () => { pos = ziel; geblaettert(); for (const x of [...blaetter]) if (x.riffel) { if (x.id) K.stimmeEnde(x.id); blaetter = blaetter.filter((y) => y !== x); } flachSetzen(ruheFlach()); anstossen(); };
      blaetter.push(b);
    });
    fuehle('riffel');
    anstossen();
  }
  function gehe(ziel, ohneRiffel) {
    ziel = modus === 'handy' ? klemme(ziel, 0, A.n - 1) : klemme(ziel, 0, letzterAufschlag());
    if (UE.offen) { uebersichtWeg(); flachSetzen(ruheFlach()); anstossen(); }
    if (ziel === pos) return;
    if (ohneRiffel) { stimmenEnde(blaetter); blaetter = []; pos = ziel; flachSetzen(ruheFlach()); geblaettert(); anstossen(); return; }
    riffel(ziel);
  }
  const seiteZuPos = (i) => modus === 'handy' ? i : Math.ceil(i / 2);

  // ---------- Buch öffnen ----------
  let oeffnung = null;
  function geschlossenZeigen(ziel) {
    const [pw, ph] = geo.seite;
    const b = neuesBlatt(1, ph * 0.5, 'mitte', { seiten: { vorn: 0, hinten: modus === 'buch' ? 1 : null, ziel: null }, starr: true });
    b.phase = 'deckel';
    b.B = [pw, ph * 0.5];
    blaetter = [b];
    flachSetzen(modus === 'handy' ? [{ i: ziel, versatz: 0 }] : [{ i: 2 * ziel, versatz: 0 }]);
    oeffnung = { b, ziel, t0: 0, lauf: false };
    skala = 0.84;
    anstossen();
  }
  function oeffnen() {
    if (!oeffnung || oeffnung.lauf) return;
    oeffnung.lauf = true;
    oeffnung.t0 = jetzt();
    anstossen();
    stimmeFuer(oeffnung.b, 0.75);
    setTimeout(() => fuehle('oeffnen'), 880);
  }
  function aktualisiereOeffnung(t) {
    if (!oeffnung) return false;
    if (!oeffnung.lauf) return false;
    const u = klemme((t - oeffnung.t0) / 1150, 0, 1);
    const pw = geo.seite[0];
    const w = Math.PI * ease(klemme(u * 1.05, 0, 1));
    oeffnung.b.B = [pw * Math.cos(w), oeffnung.b.B[1]];
    skala = 0.84 + 0.16 * (1 - Math.pow(1 - klemme(u * 1.25, 0, 1), 3));
    if (u >= 1) {
      skala = 1;
      if (oeffnung.b.id) { K.lande(oeffnung.b.id, 0.8); K.stimmeEnde(oeffnung.b.id); }
      blaetter = [];
      pos = oeffnung.ziel;
      oeffnung = null;
      flachSetzen(ruheFlach());
      geblaettert();
      setTimeout(ersterHinweis, 500);
      return true;
    }
    return true;
  }

  // ---------- Zeichnen ----------
  // ---------- Übersicht: herauszoomen, Nachbarseiten sehen und durchwischen ----------
  const UE = { offen: false, x: 0, v: 0, ziel: null, anim: null, zug: null, letzteK: null };
  const ueSkala = () => modus === 'handy' ? 0.6 : 0.64;
  const ueMax = () => modus === 'handy' ? A.n - 1 : letzterAufschlag();
  const ueAbstand = () => (modus === 'handy' ? geo.seite[0] : 2 * geo.seite[0]) + 24 / Math.max(0.3, skala);
  const ueAnteil = () => klemme((1 - skala) / (1 - ueSkala()), 0, 1);
  function uebersichtAuf() {
    if (oeffnung || blaetter.length || UE.offen || !R) { ui(true); return; }
    UE.offen = true; UE.x = pos; UE.v = 0; UE.ziel = null; UE.letzteK = pos;
    UE.anim = { t0: jetzt(), dauer: 340, sVon: skala, sNach: ueSkala(), xVon: pos, xNach: pos };
    body.classList.add('ue');
    ui(true);
    ueStand();
    fuehle('kipp');
    ueberlagerung();
    anstossen();
  }
  function uebersichtZu(k) {
    if (!UE.offen) return;
    k = klemme(k == null ? Math.round(UE.x) : k, 0, ueMax());
    UE.ziel = null; UE.v = 0; UE.zug = null;
    UE.anim = { t0: jetzt(), dauer: 320, sVon: skala, sNach: 1, xVon: UE.x, xNach: k, zu: true };
    body.classList.remove('ue');
    ui(false);
    anstossen();
  }
  function uebersichtWeg() {
    if (!UE.offen) return;
    UE.offen = false; UE.anim = null; UE.zug = null; skala = 1;
    body.classList.remove('ue');
  }
  function ueStand() {
    const k = klemme(Math.round(UE.x), 0, ueMax());
    const s = sichtbareSeitenVon(k);
    const a = s[0], b = s[s.length - 1];
    let text;
    if (a === 0 && s.length === 1) text = 'Umschlag';
    else if (a >= A.druck) text = 'Rückseite';
    else if (b !== a && b < A.druck) text = 'Seite ' + (a + 1) + ' und ' + (b + 1) + ' von ' + A.druck;
    else text = 'Seite ' + (a + 1) + ' von ' + A.druck;
    stand.textContent = text;
    regler.value = String(k + 1);
    kapitelname.textContent = kapitelVon(b + 1) || 'Handbuch des animistischen Volksglaubens';
  }
  function aktualisiereUebersicht(dt, t) {
    let aktiv = false;
    if (UE.anim) {
      const a = UE.anim;
      const u = klemme((t - a.t0) / a.dauer, 0, 1), e = ease(u);
      skala = a.sVon + (a.sNach - a.sVon) * e;
      UE.x = a.xVon + (a.xNach - a.xVon) * e;
      if (u >= 1) {
        UE.anim = null;
        if (a.zu) {
          UE.offen = false; skala = 1;
          const k = Math.round(a.xNach);
          if (k !== pos) { pos = k; geblaettert(); }
          flachSetzen(ruheFlach());
          anzeigen();
        }
      }
      aktiv = true;
    } else if (UE.offen && !UE.zug && UE.ziel != null) {
      const om = 15, ze = 0.92;
      const schritte = Math.ceil(dt / 0.004), h = dt / schritte;
      for (let i = 0; i < schritte; i++) { UE.v += (-om * om * (UE.x - UE.ziel) - 2 * ze * om * UE.v) * h; UE.x += UE.v * h; }
      if (Math.abs(UE.x - UE.ziel) < 0.002 && Math.abs(UE.v) < 0.02) { UE.x = UE.ziel; UE.v = 0; UE.ziel = null; }
      aktiv = true;
    }
    if (UE.offen) {
      const k = Math.round(UE.x);
      if (k !== UE.letzteK) { UE.letzteK = k; if (!UE.anim) fuehle('kipp'); ueStand(); }
    }
    return aktiv;
  }
  function ueTippen(x, y) {
    const sp = ueAbstand() * skala;
    const k = Math.round(UE.x + (x - geo.W / 2) / sp);
    const breite = (modus === 'handy' ? geo.seite[0] : 2 * geo.seite[0]) * skala;
    const cx = geo.W / 2 + (k - UE.x) * sp;
    const hoch = geo.seite[1] * skala;
    const treffer = k >= 0 && k <= ueMax() && Math.abs(x - cx) <= breite / 2 && Math.abs(y - geo.H / 2) <= hoch / 2;
    uebersichtZu(treffer ? k : Math.round(UE.x));
  }

  let schleife = false, letzt = 0, ersterFrame = false;
  function anstossen() { if (!schleife) { schleife = true; letzt = jetzt(); requestAnimationFrame(schritt); } }
  function schritt(t) {
    const dt = Math.min(0.1, Math.max(0.001, (t - letzt) / 1000));
    letzt = t;
    let aktiv = false;
    if (aktualisiereBlaetter(dt, t)) aktiv = true;
    if (aktualisiereOeffnung(t)) aktiv = true;
    if (aktualisiereUebersicht(dt, t)) aktiv = true;
    const nz = nachtZiel();
    if (Math.abs(nachtWert - nz) > 0.002) { nachtWert += (nz - nachtWert) * Math.min(1, dt * 5); aktiv = true; } else nachtWert = nz;
    if (Math.abs(stoss) > 0.05 || Math.abs(stossV) > 1) {
      const om = 26;
      stossV += (-om * om * stoss - 2 * 0.55 * om * stossV) * dt;
      stoss += stossV * dt;
      aktiv = true;
    } else { stoss = 0; stossV = 0; }
    zeichnen();
    if (aktiv || zug || UE.zug) requestAnimationFrame(schritt);
    else { schleife = false; ueberlagerung(); }
  }
  function nachtZiel() {
    if (E.nacht === 'an') return 1;
    if (E.nacht === 'auto') { const h = new Date().getHours(); return (h >= 20 || h < 7) ? 1 : 0; }
    return 0;
  }
  function kantenFarbe(j, n) {
    const tag = [0.86 - j * 0.035, 0.83 - j * 0.035, 0.77 - j * 0.035];
    const nacht = [0.26 - j * 0.012, 0.245 - j * 0.012, 0.22 - j * 0.012];
    return tag.map((v, k) => v + (nacht[k] - v) * nachtWert);
  }
  function zeichnen() {
    if (!R) { fallbackZeigen(); return; }
    const [pw, ph] = geo.seite;
    const ux = geo.ursprung[0] + stoss, uy = geo.ursprung[1];
    const kanten = [];
    const geschlossen = !!oeffnung;
    const rest = modus === 'handy' ? (A.n - 1 - pos) / (A.n - 1) : (letzterAufschlag() - pos) / letzterAufschlag();
    const kR = geschlossen ? 7 : (rest > 0.001 ? Math.round(1 + 5 * rest) : 0);
    for (let j = 0; j < kR; j++) {
      const c = kantenFarbe(j, kR);
      const x0 = ux + pw + 0.35 + j * 1.25;
      kanten.push([x0, uy + j * 0.35, x0 + 0.85, uy + ph - j * 0.25, c[0], c[1], c[2], 1]);
    }
    if (modus === 'buch' && !geschlossen) {
      const kL = pos > 0 ? Math.round(1 + 5 * (1 - rest)) : 0;
      for (let j = 0; j < kL; j++) {
        const c = kantenFarbe(j, kL);
        const x1 = ux - pw - 0.35 - j * 1.25;
        kanten.push([x1 - 0.85, uy + j * 0.35, x1, uy + ph - j * 0.25, c[0], c[1], c[2], 1]);
      }
    }
    if (geschlossen) {
      for (let j = 0; j < 5; j++) {
        const c = kantenFarbe(j, 5);
        const y0 = uy + ph + 0.35 + j * 1.25;
        kanten.push([ux + j * 0.4, y0, ux + pw + j * 1.25, y0 + 0.85, c[0], c[1], c[2], 1]);
      }
    }
    const links = modus === 'buch' && (pos > 0 || blaetter.length) ? ux - pw : ux;
    const buch = [links, uy, ux + pw + kR * 1.25, uy + ph + (geschlossen ? 6 : 0)];
    const m = [geo.W / 2, geo.H / 2];
    const sk = (v, k) => m[k] + (v - m[k]) * skala;
    const flachListe = flach.map((f) => ({ versatz: f.versatz, vorn: f.e, z: -1 }));
    const blattListe = [];
    let schatten = null;
    const sortiert = [...blaetter].sort((a, b) => a.z - b.z);
    for (const b of sortiert) {
      const g = geometrieBlatt(b);
      blattListe.push({ modus: g.modus, O: g.O, n: g.n, R: g.R, winkel: g.winkel, vorn: b.vorn, hinten: b.hinten, z: b.z, istBlatt: true });
    }
    const oben = blattListe[blattListe.length - 1];
    if (oben && oben.modus === 1) schatten = { modus: 1, O: oben.O, n: oben.n, R: oben.R };
    else if (oben && oben.modus === 2) schatten = { modus: 2, winkel: oben.winkel };
    let flachL = flachListe, kantenL = kanten, bund = modus === 'handy' ? 0.085 : 0.15, bs = 0.6;
    if (UE.offen || UE.anim) {
      // Übersicht: Nachbarseiten nebeneinander, jede mit weichem Schatten
      const an = ueAnteil(), sp = ueAbstand(), c = Math.round(UE.x);
      flachL = []; kantenL = [];
      const behalten = new Set();
      for (let k = c - 2; k <= c + 2; k++) {
        if (k < 0 || k > ueMax()) continue;
        const off = (k - UE.x) * sp;
        const teile = modus === 'handy' ? [[k, 0]] : [[2 * k - 1, -pw], [2 * k, 0]];
        for (const [i, vx] of teile) {
          if (i < 0 || i >= A.n) continue;
          const e = seitenTextur(i);
          behalten.add(e.k);
          flachL.push({ versatz: off + vx, vorn: e, z: -1 });
          const x0 = ux + off + vx;
          for (let j = 0; j < 4; j++) { const r = 2 + j * 5; kantenL.push([x0 - r + 2, uy - r + 7, x0 + pw + r + 2, uy + ph + r + 7, 0, 0, 0, 0.1 * an * (1 - j * 0.2)]); }
        }
      }
      aufraeumen(behalten);
      bund *= 1 - an; bs *= 1 - an;
      blattListe.length = 0; schatten = null;
    }
    for (const e of flachL) if (e.vorn) { e.vorn.zeit = jetzt(); if (e.vorn.v !== ueberV(e.vorn.dir, e.vorn.i) && e.vorn.img) belade(e.vorn); }
    R.zeichne({
      ursprung: [ux, uy], seite: [pw, ph], kamera: Math.max(geo.W, geo.H) * 2.4, skala,
      nacht: nachtWert, warm: E.warm * 0.85, dimm: dimm, bund,
      buch: [sk(buch[0], 0), sk(buch[1], 1), sk(buch[2], 0), sk(buch[3], 1)], buchSchatten: bs,
      kanten: kantenL, flach: flachL, blaetter: blattListe, schatten,
    });
    if (!ersterFrame) bereitPruefen();
  }
  function bereitPruefen() {
    if (ersterFrame) return;
    const e = oeffnung ? oeffnung.b.vorn : (flach[0] && flach[0].e);
    if (e && e.t) { ersterFrame = true; requestAnimationFrame(() => { brueck('bereit'); $('laden').hidden = true; }); }
  }

  // Ersatz ohne WebGL: einfache Bildseite
  let ersatzImg = null;
  function fallbackZeigen() {
    if (!ersatzImg) { ersatzImg = document.createElement('img'); ersatzImg.className = 'ersatz'; document.body.appendChild(ersatzImg); $('laden').hidden = true; brueck('bereit'); }
    const s = sichtbareSeiten();
    seitenQuelle(A.dir, s[s.length - 1]).then((u) => { ersatzImg.src = u; }).catch(() => {});
  }

  // ---------- Nach dem Blättern ----------
  let seitenzeit = jetzt();
  function geblaettert() {
    gelesenMarkieren();
    vorladen();
    anzeigen();
    tempoLernen();
    sucheMarkeLoeschen();
    ueberlagerung();
    const s = sichtbareSeiten();
    merke('handbuch-lesestelle', { modus, seite: s[s.length - 1] + 1 });
    sende('seite');
  }

  // ---------- Gesten ----------
  let zug = null;
  const lokal = (x, y) => [(x - geo.W / 2) / skala + geo.W / 2 - geo.ursprung[0] - stoss, (y - geo.H / 2) / skala + geo.H / 2 - geo.ursprung[1]];
  function seiteAn(x, y) {
    const [lx, ly] = lokal(x, y);
    const [pw, ph] = geo.seite;
    if (ly < 0 || ly > ph) return null;
    if (modus === 'handy') { if (lx < 0 || lx > pw) return null; return { i: pos, u: lx / pw, v: ly / ph }; }
    if (lx >= 0 && lx <= pw) { const i = 2 * pos; return i < A.n ? { i, u: lx / pw, v: ly / ph } : null; }
    if (lx < 0 && lx >= -pw) { const i = 2 * pos - 1; return i >= 0 ? { i, u: (lx + pw) / pw, v: ly / ph } : null; }
    return null;
  }
  function wortAn(x, y) {
    const s = seiteAn(x, y);
    if (!s) return null;
    const ws = woerter(A.dir, s.i);
    if (!ws) return null;
    let best = -1, bd = 1e9;
    for (let k = 0; k < ws.length; k++) {
      const w = ws[k];
      const dx = s.u < w.x0 ? w.x0 - s.u : s.u > w.x1 ? s.u - w.x1 : 0;
      const dy = (s.v < w.y0 ? w.y0 - s.v : s.v > w.y1 ? s.v - w.y1 : 0) * (A.h / A.w);
      const d = dx + dy * 1.4;
      if (d < bd) { bd = d; best = k; }
    }
    if (best < 0 || bd > 0.03) return null;
    return { i: s.i, k: best };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    sende('beruehrung');
    K.start();
    wachAuffrischen();
    if (oeffnung) { if (!oeffnung.lauf) oeffnen(); return; }
    if (UE.anim) return;
    if (UE.offen) {
      UE.zug = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: jetzt(), start: UE.x, bewegt: false, spur: [[e.clientX, e.clientY, jetzt()]] };
      UE.ziel = null; UE.v = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      return;
    }
    if (zug) return;
    karteZu();
    const t = jetzt();
    zug = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: t, phase: '?', spur: [[e.clientX, e.clientY, t]] };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    // ein laufendes Blatt auffangen
    const lauf = blaetter.length === 1 && !blaetter[0].riffel && !blaetter[0].starr && (blaetter[0].phase === 'feder' || blaetter[0].phase === 'fahrplan') ? blaetter[0] : null;
    if (lauf && fortschritt(lauf) > 0.04 && fortschritt(lauf) < 0.96) {
      lauf.phase = 'zug'; lauf.v = [0, 0]; warteschlange = 0;
      zug.phase = 'zug'; zug.b = lauf; zug.B0 = lauf.B.slice(); zug.k = 1;
      if (lauf.id) K.abheben(lauf.id, 0.25);
      return;
    }
    zug.lang = setTimeout(langDruck, 460);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (UE.zug && e.pointerId === UE.zug.id) {
      const dx = e.clientX - UE.zug.x0;
      if (Math.abs(dx) > 7) UE.zug.bewegt = true;
      UE.x = klemme(UE.zug.start - dx / (ueAbstand() * skala), -0.3, ueMax() + 0.3);
      UE.zug.spur.push([e.clientX, e.clientY, jetzt()]);
      while (UE.zug.spur.length > 2 && jetzt() - UE.zug.spur[0][2] > 90) UE.zug.spur.shift();
      anstossen();
      return;
    }
    if (!zug || e.pointerId !== zug.id) return;
    const t = jetzt();
    zug.x = e.clientX; zug.y = e.clientY;
    zug.spur.push([e.clientX, e.clientY, t]);
    while (zug.spur.length > 2 && t - zug.spur[0][2] > 90) zug.spur.shift();
    const dx = zug.x - zug.x0, dy = zug.y - zug.y0;
    if (zug.phase === '?') {
      if (Math.hypot(dx, dy) < 8) return;
      clearTimeout(zug.lang);
      const [, ly0] = lokal(zug.x0, zug.y0);
      const ph = geo.seite[1];
      if (dy > Math.abs(dx) * 1.2 && ly0 < ph * 0.12 && ly0 > -40) { zug.phase = 'band'; bandStart(); }
      else if (Math.abs(dx) > Math.abs(dy) * 0.8) {
        const r = dx < 0 ? 1 : -1;
        if (!kann(r)) { zug.phase = 'nichts'; anschlag(r); return; }
        if (blaetter.length) { for (const b of [...blaetter]) blattFertig(b, b.phase === 'fahrplan' || b.vollenden); }
        warteschlange = 0;
        const ly = klemme(ly0, 0, ph);
        const ecke = ly > ph * 0.7 ? 'unten' : ly < ph * 0.3 ? 'oben' : 'mitte';
        const ay = ecke === 'unten' ? ph : ecke === 'oben' ? 0 : ly;
        const b = neuesBlatt(r, ay, ecke);
        b.phase = 'zug';
        const s = blattSeiten(r);
        flachSetzen(s.flach);
        blaetter.push(b);
        zug.phase = 'zug'; zug.b = b; zug.B0 = b.B.slice(); zug.k = r > 0 ? 1 : 2;
        zug.x0 = e.clientX - Math.sign(dx) * 2; zug.y0 = e.clientY;
        ui(false);
        fuehle('griff');
        stimmeFuer(b, 0.6);
        ueberlagerung();
      } else { zug.phase = 'nichts'; }
    }
    if (zug.phase === 'zug') {
      const b = zug.b;
      const ddx = (zug.x - zug.x0) / skala, ddy = (zug.y - zug.y0) / skala;
      b.B = [klemme(zug.B0[0] + zug.k * ddx, -geo.seite[0], geo.seite[0]), zug.B0[1] + ddy * 0.6];
      const v = tempoSpur(zug.spur);
      zug.fv = Math.hypot(v[0], v[1]);
      anstossen();
    } else if (zug.phase === 'band') { bandZiehen(dy); }
    else if (zug.phase === 'auswahl') { auswahlErweitern(zug.x, zug.y); }
  });
  function tempoSpur(s) {
    if (s.length < 2) return [0, 0];
    const a = s[0], b = s[s.length - 1], dt = Math.max(8, b[2] - a[2]) / 1000;
    return [(b[0] - a[0]) / dt, (b[1] - a[1]) / dt];
  }
  function loslassen(e) {
    if (UE.zug && e.pointerId === UE.zug.id) {
      const z = UE.zug; UE.zug = null;
      if (!z.bewegt && jetzt() - z.t0 < 450) { ueTippen(z.x0, z.y0); return; }
      const v = tempoSpur(z.spur)[0], sp = ueAbstand() * skala;
      UE.ziel = klemme(Math.round(UE.x - v * 0.2 / sp), 0, ueMax());
      UE.v = -v / sp * 0.6;
      anstossen();
      return;
    }
    if (!zug || e.pointerId !== zug.id) return;
    const z = zug; zug = null;
    clearTimeout(z.lang);
    if (z.phase === '?') { if (jetzt() - z.t0 < 450) tippe(z.x0, z.y0); return; }
    if (z.phase === 'zug') {
      const b = z.b;
      const v = tempoSpur(z.spur);
      const vx = v[0] * z.k, vy = v[1] * 0.4;
      const p = fortschritt(b);
      const vollenden = b.r > 0 ? (vx < -280 || (p > 0.45 && vx < 320)) : (vx > 280 || (p < 0.55 && vx > -320));
      const pw = geo.seite[0];
      b.phase = 'feder';
      b.vollenden = vollenden;
      b.v = [vx, vy];
      const hin = b.r > 0 ? (vollenden ? -pw : pw) : (vollenden ? pw : -pw);
      b.zielB = [hin, b.A[1]];
      if (vollenden && Math.abs(vx) < 500) b.v[0] += (hin > b.B[0] ? 1 : -1) * 500;
      anstossen();
      return;
    }
    if (z.phase === 'band') { bandEnde(); return; }
    if (z.phase === 'auswahl') { auswahlFertig(); return; }
  }
  canvas.addEventListener('pointerup', loslassen);
  // Safari gibt Klang erst beim Loslassen frei
  document.addEventListener('pointerup', () => K.start(), true);
  canvas.addEventListener('pointercancel', (e) => {
    if (UE.zug) { UE.zug = null; UE.ziel = klemme(Math.round(UE.x), 0, ueMax()); anstossen(); return; }
    if (zug && zug.phase === 'zug') { loslassen(e); return; }
    if (zug && zug.phase === 'band') bandEnde(true);
    if (zug) clearTimeout(zug.lang);
    zug = null;
  });

  function tippe(x, y) {
    if (body.classList.contains('ui')) { ui(false); return; }
    // Verweise haben Vorrang
    const s = seiteAn(x, y);
    if (s) {
      const S = seiteInfo(A.dir, s.i);
      if (S) {
        const l = S.l.find((r) => s.u * 1e4 >= r[0] - 60 && s.u * 1e4 <= r[2] + 60 && s.v * 1e4 >= r[1] - 40 && s.v * 1e4 <= r[3] + 40);
        if (l) { verweisFolgen(s.i, l); return; }
      }
    }
    const W = geo.W;
    const rand = modus === 'handy' ? 0.28 : 0.2;
    if (x < W * rand) { automatisch(-1); return; }
    if (x > W * (1 - rand)) { automatisch(1); return; }
    if (s) {
      const w = wortAn(x, y);
      if (w) { const m = markierungBei(w.i, w.k); if (m) { markierungKarte(m, x, y); return; } }
      const S = seiteInfo(A.dir, s.i);
      if (S) {
        const b = S.b.find((r) => r[4] && s.u * 1e4 >= r[0] && s.u * 1e4 <= r[2] && s.v * 1e4 >= r[1] && s.v * 1e4 <= r[3]);
        if (b) { betrachterAuf(b, s.i); return; }
      }
    }
    uebersichtAuf();
  }

  // ---------- Verweise und Rücksprung ----------
  const sprungVerlauf = [];
  function verweisFolgen(i, l) {
    const ziel = seiteZuPos(l[4]);
    blitz(i, l);
    sprungVerlauf.push(pos);
    if (sprungVerlauf.length > 20) sprungVerlauf.shift();
    setTimeout(() => gehe(ziel), 140);
    fuehle('kipp');
  }
  function blitz(i, l) {
    const r = seitenRechteck(i, [l[0] / 1e4, l[1] / 1e4, l[2] / 1e4, l[3] / 1e4]);
    if (!r) return;
    const d = document.createElement('div');
    d.className = 'blitz';
    Object.assign(d.style, { left: r[0] - 3 + 'px', top: r[1] - 2 + 'px', width: r[2] - r[0] + 6 + 'px', height: r[3] - r[1] + 4 + 'px' });
    $('ueber').appendChild(d);
    setTimeout(() => d.remove(), 420);
  }
  function seitenRechteck(i, q) {
    const [pw, ph] = geo.seite;
    let x0 = geo.ursprung[0] + stoss, y0 = geo.ursprung[1];
    if (modus === 'buch') { if (i === 2 * pos - 1) x0 -= pw; else if (i !== 2 * pos) return null; }
    else if (i !== pos) return null;
    return [x0 + q[0] * pw, y0 + q[1] * ph, x0 + q[2] * pw, y0 + q[3] * ph];
  }

  // ---------- Bedienleisten ----------
  let uiZeit = null;
  function ui(an, dauer) {
    body.classList.toggle('ui', an);
    clearTimeout(uiZeit);
    if (an) { uhrStellen(); anzeigen(); }
    if (an && dauer) uiZeit = setTimeout(() => { if (!body.classList.contains('toc') && !body.classList.contains('bogen') && !UE.offen) ui(false); }, dauer);
  }
  const regler = $('regler'), stand = $('stand'), kapitelname = $('kapitelname'), liste = $('liste');
  function anzeigen() {
    const s = sichtbareSeiten();
    const a = s[0], b = s[s.length - 1];
    let text;
    if (a === 0 && s.length === 1) text = 'Umschlag';
    else if (a >= A.druck) text = 'Rückseite';
    else if (b !== a && b < A.druck) text = 'Seite ' + (a + 1) + ' und ' + (b + 1) + ' von ' + A.druck;
    else text = 'Seite ' + (a + 1) + ' von ' + A.druck;
    const rz = restzeit();
    stand.textContent = text + (rz ? ' · ' + rz : '');
    regler.max = String(modus === 'handy' ? A.n : letzterAufschlag() + 1);
    regler.value = String(pos + 1);
    kapitelname.textContent = kapitelVon(b + 1) || 'Handbuch des animistischen Volksglaubens';
    lzKnopf();
  }
  regler.addEventListener('input', () => {
    const z = parseInt(regler.value, 10) - 1;
    const i = modus === 'handy' ? z : Math.max(1, 2 * z);
    stand.textContent = 'Seite ' + (i + 1) + (kapitelVon(i + 1) ? ' · ' + kapitelVon(i + 1) : '');
  });
  regler.addEventListener('change', () => {
    const z = parseInt(regler.value, 10) - 1;
    if (UE.offen) { UE.ziel = klemme(z, 0, ueMax()); anstossen(); return; }
    gehe(z); ui(true, 2600);
  });
  $('vor').addEventListener('click', () => { if (UE.offen) { UE.ziel = klemme(Math.round(UE.x) + 1, 0, ueMax()); anstossen(); } else automatisch(1); });
  $('zurueck').addEventListener('click', () => { if (UE.offen) { UE.ziel = klemme(Math.round(UE.x) - 1, 0, ueMax()); anstossen(); } else automatisch(-1); });

  function kapitelVon(seite) {
    let kap = '';
    A.toc.forEach(([e, t, p]) => { if (e === 0 && p <= seite && p > 8) kap = t; });
    return kap;
  }

  // Uhr und Akku
  function uhrStellen() {
    const d = new Date();
    let t = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    const ak = brueck('akku');
    if (ak) { const [p, l] = ak.split(','); t += ' · ' + p + ' %' + (l === '1' ? ' ⚡︎' : ''); }
    $('uhr').textContent = t;
  }
  setInterval(() => { if (body.classList.contains('ui')) uhrStellen(); }, 20000);

  // Restzeit im Kapitel aus dem eigenen Lesetempo
  let wpm = hole('handbuch-lesetempo', 190);
  function wortzahl(i) { const S = seiteInfo(A.dir, i); if (!S) return 0; let n = 0; for (const c of S.a) if (c === 'b' || c === 'k') n++; return n; }
  function tempoLernen() {
    const t = jetzt(), dauer = (t - seitenzeit) / 1000;
    const vorher = tempoLernen.letzte;
    seitenzeit = t;
    tempoLernen.letzte = pos;
    if (vorher == null || pos !== vorher + 1 || V.aktiv) return;
    const w = sichtbareSeitenVon(vorher).reduce((s, i) => s + wortzahl(i), 0);
    if (w < 80 || dauer < 8 || dauer > 400) return;
    const neu = klemme(w / (dauer / 60), 80, 450);
    wpm = wpm * 0.85 + neu * 0.15;
    merke('handbuch-lesetempo', Math.round(wpm));
  }
  const sichtbareSeitenVon = (p) => modus === 'handy' ? [p] : [2 * p - 1, 2 * p].filter((i) => i >= 0 && i < A.n);
  function restzeit() {
    if (!seiteInfo(A.dir, 0)) return '';
    const s = sichtbareSeiten(), b = s[s.length - 1];
    let ende = A.druck;
    let start = 0;
    A.toc.forEach(([e, , p]) => { if (e === 0 && p > 8) { if (p <= b + 1) start = p; else if (p > b + 1 && ende === A.druck) ende = p - 1; } });
    if (!start) return '';
    let w = 0;
    for (let i = s[0]; i < ende; i++) w += wortzahl(i);
    const min = Math.round(w / wpm);
    if (min < 1) return 'Kapitelende';
    if (min < 60) return 'noch ' + min + ' Min. im Kapitel';
    return 'noch ' + Math.floor(min / 60) + ' Std. ' + (min % 60) + ' Min. im Kapitel';
  }

  // ---------- Inhaltsverzeichnis, Lesezeichen, Markierungen, Suche ----------
  function baueInhalt() {
    liste.textContent = '';
    A.toc.forEach(([e, t, s], k) => {
      const b = document.createElement('button');
      b.className = 'eintrag e' + e; b.dataset.k = k;
      const tt = document.createElement('span'); tt.className = 't'; tt.textContent = t;
      if (e === 0 && KAPITELNAMEN[t]) tt.dataset.k = KAPITELNAMEN[t];
      const ss = document.createElement('span'); ss.className = 's'; ss.textContent = s;
      b.append(tt, ss);
      b.addEventListener('click', () => { schliesseInhalt(); ui(false); sprungVerlauf.push(pos); gehe(seiteZuPos(s - 1)); });
      liste.appendChild(b);
    });
  }
  // Lesestand: gelesene Seiten je Ausgabe, im Inhaltsverzeichnis angezeigt
  const GL_KEY = 'handbuch-gelesen';
  const gelesen = hole(GL_KEY, {});
  function gelesenMarkieren() {
    const s = sichtbareSeiten();
    for (const [m, X] of Object.entries(AUS)) {
      const arr = (gelesen[X.dir] || '').padEnd(X.n, '0').split('');
      for (const i of s) { const j = umrechnen(i + 1, modus, m) - 1; if (j >= 0 && j < X.n) arr[j] = '1'; }
      gelesen[X.dir] = arr.join('');
    }
    merke(GL_KEY, gelesen);
  }
  function lesestandZeigen() {
    const str = gelesen[A.dir] || '';
    const eintr = liste.querySelectorAll('.eintrag');
    A.toc.forEach(([e, , s], k) => {
      let j = k + 1;
      while (j < A.toc.length && A.toc[j][0] > e) j++;
      const ende = j < A.toc.length ? Math.max(s, A.toc[j][2] - 1) : A.druck;
      let n = 0, g = 0;
      for (let p = s; p <= ende; p++) { n++; if (str[p - 1] === '1') g++; }
      const b = eintr[k];
      if (!b) return;
      b.classList.toggle('gelesen', n > 0 && g >= n * 0.9);
      b.classList.toggle('begonnen', g > 0 && g < n * 0.9);
    });
  }
  function markiereInhalt(seite) {
    let k = -1;
    A.toc.forEach(([, , s], i) => { if (s <= seite) k = i; });
    liste.querySelectorAll('.hier').forEach((b) => b.classList.remove('hier'));
    const b = liste.querySelector('.eintrag[data-k="' + k + '"]');
    if (b) b.classList.add('hier');
    return b;
  }
  function oeffneInhalt() {
    if (body.classList.contains('toc')) return;
    body.classList.add('toc');
    zeigeLz(); zeigeMk(); lesestandZeigen();
    const s = sichtbareSeiten();
    const b = markiereInhalt(s[s.length - 1] + 1);
    if (b) b.scrollIntoView({ block: 'center' });
  }
  function schliesseInhalt() { body.classList.remove('toc'); }
  $('knopf-inhalt').addEventListener('click', oeffneInhalt);
  $('knopf-zu').addEventListener('click', schliesseInhalt);
  $('schleier').addEventListener('click', () => { schliesseInhalt(); bogenZu(); });

  function umrechnen(seite, von, nach) {
    if (von === nach) return seite;
    const X = AUS[von], Y = AUS[nach];
    if (seite > X.druck) return Math.min(Y.n, Y.druck + (seite - X.druck));
    const ta = X.toc, tb = Y.toc;
    let i = -1;
    for (let k = 0; k < ta.length; k++) { if (ta[k][2] <= seite) i = k; else break; }
    if (i < 0) return Math.max(1, Math.round(seite * tb[0][2] / ta[0][2]));
    const a0 = ta[i][2], a1 = i + 1 < ta.length ? ta[i + 1][2] : X.druck + 1;
    const b0 = tb[i][2], b1 = i + 1 < tb.length ? tb[i + 1][2] : Y.druck + 1;
    const f = a1 > a0 ? (seite - a0) / (a1 - a0) : 0;
    return Math.max(b0, Math.min(Math.max(b0, b1 - 1), Math.round(b0 + f * (b1 - b0))));
  }

  // Lesezeichen
  const LZ = 'handbuch-lesezeichen';
  const lzLaden = () => hole(LZ, []);
  const lzSpeichern = (l) => merke(LZ, l);
  const edModus = (dir) => dir === 'h' ? 'handy' : 'buch';
  function lesezeichenAuf(dir, i) { const m = edModus(dir); return lzLaden().some((x) => umrechnen(x.seite, x.modus, m) === i + 1); }
  function lzIndex() {
    const hier = sichtbareSeiten().map((i) => i + 1);
    return lzLaden().findIndex((x) => hier.includes(umrechnen(x.seite, x.modus, modus)));
  }
  function lzKnopf() {
    const an = lzIndex() >= 0;
    const k = $('knopf-lz');
    k.setAttribute('aria-pressed', an ? 'true' : 'false');
    k.setAttribute('aria-label', an ? 'Lesezeichen entfernen' : 'Lesezeichen setzen');
  }
  function lzUmschalten(setzen) {
    const l = lzLaden(), i = lzIndex();
    const s = sichtbareSeiten();
    const seite = s[s.length - 1];
    if (i >= 0 && setzen !== true) {
      const alt = l[i]; l.splice(i, 1); lzSpeichern(l);
      const si = umrechnen(alt.seite, alt.modus, modus) - 1;
      erneuereUeber(A.dir, si);
      melde('Lesezeichen entfernt', 1600);
    } else if (i < 0 && setzen !== false) {
      l.push({ modus, seite: (modus === 'buch' && s.length > 1 ? s[0] : seite) + 1, zeit: Date.now() });
      lzSpeichern(l);
      erneuereUeber(A.dir, modus === 'buch' && s.length > 1 ? s[0] : seite);
      K.band(); fuehle('band');
      melde('Lesezeichen gesetzt', 1600);
    }
    lzKnopf(); anstossen();
  }
  $('knopf-lz').addEventListener('click', () => { lzUmschalten(); ui(true, 2200); });
  function zeigeLz() {
    const ziel = $('lz-liste');
    ziel.textContent = '';
    const l = lzLaden();
    if (!l.length) return;
    const r = document.createElement('div'); r.className = 'rubrik'; r.textContent = 'Lesezeichen';
    ziel.appendChild(r);
    l.map((x, k) => ({ k, s: umrechnen(x.seite, x.modus, modus) })).sort((a, b) => a.s - b.s).forEach(({ k, s }) => {
      const zeile = document.createElement('div'); zeile.className = 'lz';
      const b = document.createElement('button'); b.className = 'eintrag e1';
      const tt = document.createElement('span'); tt.className = 't'; tt.textContent = kapitelVon(s) || 'Vorspann';
      const ss = document.createElement('span'); ss.className = 's'; ss.textContent = s;
      b.append(tt, ss);
      b.addEventListener('click', () => { schliesseInhalt(); sprungVerlauf.push(pos); gehe(seiteZuPos(s - 1)); });
      const weg = document.createElement('button'); weg.className = 'weg'; weg.setAttribute('aria-label', 'Lesezeichen löschen');
      weg.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      weg.addEventListener('click', () => { const m = lzLaden(); m.splice(k, 1); lzSpeichern(m); erneuereUeber(A.dir, s - 1); zeigeLz(); lzKnopf(); anstossen(); });
      zeile.append(b, weg);
      ziel.appendChild(zeile);
    });
  }

  // Lesebändchen von oben herunterziehen
  const band = $('band');
  function bandStart() {
    const [pw] = geo.seite;
    const x = geo.ursprung[0] + (modus === 'handy' ? pw * 0.021 : pw * 0.045);
    Object.assign(band.style, { left: x + 'px', top: geo.ursprung[1] + 'px', width: pw * 0.036 + 'px', height: '0px' });
    band.hidden = false;
    ui(false);
  }
  function bandZiehen(dy) {
    const ph = geo.seite[1];
    const h = klemme(dy * 1.05, 0, ph * 0.875);
    band.style.height = h + 'px';
    if (!zug.bandGemeldet && h > ph * 0.3) { zug.bandGemeldet = true; fuehle('kipp'); }
  }
  function bandEnde(abbruch) {
    const h = parseFloat(band.style.height) || 0, ph = geo.seite[1];
    if (!abbruch && h > ph * 0.3) {
      band.style.transition = 'height 0.18s ease-out';
      band.style.height = ph * 0.875 + 'px';
      setTimeout(() => { band.hidden = true; band.style.transition = ''; if (lzIndex() < 0) lzUmschalten(true); else { K.band(); fuehle('band'); } }, 190);
    } else {
      band.style.transition = 'height 0.2s ease-in';
      band.style.height = '0px';
      setTimeout(() => { band.hidden = true; band.style.transition = ''; }, 210);
    }
  }

  // ---------- Markierungen und Notizen ----------
  const MK = 'handbuch-markierungen';
  let markierungen = hole(MK, []);
  const mkSpeichern = () => merke(MK, markierungen);
  const norm = (w) => w.toLowerCase().replace(/[­]/g, '').replace(/[‐-]$/, '').replace(/[^\p{L}\p{N}]/gu, '');
  function verorten(m, dir) {
    if (m[dir] !== undefined) return m[dir];
    const daten = window.DATEN && window.DATEN[dir];
    if (!daten) return undefined;
    const quelle = m.h || m.b; const qdir = m.h ? 'h' : 'b';
    const ungefaehr = umrechnen(quelle.s + 1, edModus(qdir), edModus(dir)) - 1;
    const ziel = m.text.split(/\s+/).map(norm).filter(Boolean);
    let fund = null;
    for (let d = 0; d <= 5 && !fund; d++) for (const s of [ungefaehr - d, ungefaehr + d]) {
      if (fund || s < 0 || s >= daten.length) continue;
      const ws = woerter(dir, s);
      if (!ws) continue;
      const nw = ws.map((w) => norm(w.w));
      for (let a = 0; a < nw.length && !fund; a++) {
        if (!nw[a] || !ziel[0].startsWith(nw[a]) && !nw[a].startsWith(ziel[0])) continue;
        let k = 0, b = a;
        while (b < nw.length && k < ziel.length) {
          if (!nw[b]) { b++; continue; }
          if (ziel[k].startsWith(nw[b])) { const rest = ziel[k].slice(nw[b].length); if (rest && nw[b + 1] && rest.startsWith(nw[b + 1])) { b++; } k++; b++; }
          else break;
        }
        if (k >= Math.min(ziel.length, 3) && k >= ziel.length * 0.8) fund = { s, a, b: b - 1 };
      }
    }
    m[dir] = fund;
    mkSpeichern();
    return fund;
  }
  function markierungenAuf(dir, i) { return markierungen.filter((m) => { const o = verorten(m, dir); return o && o.s === i; }); }
  function markierungBei(i, k) { return markierungen.find((m) => { const o = m[A.dir]; return o && o.s === i && k >= o.a && k <= o.b; }); }
  function teilenText() {
    let t = 'Handbuch des animistischen Volksglaubens\nMarkierungen und Notizen · Stand ' + new Date().toLocaleDateString('de-DE') + '\n';
    const lz = lzLaden().map((x) => umrechnen(x.seite, x.modus, modus)).sort((a, b) => a - b);
    if (lz.length) t += '\nLesezeichen: ' + lz.map((s) => 'S. ' + s + (kapitelVon(s) ? ' (' + kapitelVon(s) + ')' : '')).join(', ') + '\n';
    markierungen.map((m) => ({ m, o: verorten(m, A.dir) })).filter((x) => x.o).sort((a, b) => a.o.s - b.o.s || a.o.a - b.o.a).forEach(({ m, o }) => {
      const kap = kapitelVon(o.s + 1);
      t += '\nSeite ' + (o.s + 1) + (kap ? ' · ' + kap : '') + '\n„' + m.text + '“\n' + (m.notiz ? 'Notiz: ' + m.notiz + '\n' : '');
    });
    return t;
  }
  function teilen() {
    const t = teilenText();
    if (BR && BR.teilen) brueck('teilen', 'Markierungen und Notizen', t);
    else if (navigator.share && window.matchMedia('(display-mode: standalone)').matches) navigator.share({ title: 'Markierungen und Notizen', text: t }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => melde('In die Zwischenablage kopiert', 1800)).catch(() => {});
  }
  function zeigeMk() {
    const ziel = $('mk-liste');
    ziel.textContent = '';
    if (markierungen.length || lzLaden().length) {
      const k = document.createElement('button'); k.className = 'teilen-knopf';
      k.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 4v11M7.5 8.5L12 4l4.5 4.5M5 13v6h14v-6"/></svg>Markierungen und Notizen teilen';
      k.addEventListener('click', teilen);
      ziel.appendChild(k);
    }
    if (!markierungen.length) return;
    const r = document.createElement('div'); r.className = 'rubrik'; r.textContent = 'Markierungen';
    ziel.appendChild(r);
    markierungen.map((m) => ({ m, o: verorten(m, A.dir) })).filter((x) => x.o).sort((a, b) => a.o.s - b.o.s || a.o.a - b.o.a).forEach(({ m, o }) => {
      const b = document.createElement('button'); b.className = 'treffer';
      const s = document.createElement('span'); s.className = 's'; s.textContent = 'Seite ' + (o.s + 1) + (kapitelVon(o.s + 1) ? ' · ' + kapitelVon(o.s + 1) : '');
      const t = document.createElement('span'); t.className = 'mk-text'; t.textContent = m.text.length > 180 ? m.text.slice(0, 180) + ' …' : m.text;
      b.append(s, t);
      if (m.notiz) { const n = document.createElement('span'); n.className = 'mk-notiz'; n.textContent = m.notiz; b.append(n); }
      b.addEventListener('click', () => { schliesseInhalt(); sprungVerlauf.push(pos); gehe(seiteZuPos(o.s)); });
      ziel.appendChild(b);
    });
  }

  // Auswahl per langem Druck
  let auswahl = null;
  function langDruck() {
    if (!zug || zug.phase !== '?') return;
    const w = wortAn(zug.x, zug.y);
    if (w) {
      const m = markierungBei(w.i, w.k);
      if (m) { zug.phase = 'nichts'; markierungKarte(m, zug.x, zug.y); fuehle('kipp'); return; }
      zug.phase = 'auswahl';
      auswahl = { i: w.i, a: w.k, b: w.k, start: w.k };
      const sp = spanBei(w.i, w.k);
      if (sp) { auswahl.a = sp[0]; auswahl.b = sp[1]; auswahl.span = sp; }
      erweitereSilbe();
      fuehle('griff');
      ui(false);
      auswahlZeichnen();
      return;
    }
    const s = seiteAn(zug.x, zug.y);
    if (s) {
      const S = seiteInfo(A.dir, s.i);
      const b = S && S.b.find((r) => r[4] && s.u * 1e4 >= r[0] && s.u * 1e4 <= r[2] && s.v * 1e4 >= r[1] && s.v * 1e4 <= r[3]);
      if (b) { zug.phase = 'nichts'; betrachterAuf(b, s.i); }
    }
  }
  function erweitereSilbe() {
    const ws = woerter(A.dir, auswahl.i);
    if (!ws) return;
    if (/[‐-]$/.test(ws[auswahl.b].w) && ws[auswahl.b + 1] && /^\p{Ll}/u.test(ws[auswahl.b + 1].w)) auswahl.b++;
    if (auswahl.a > 0 && /[‐-]$/.test(ws[auswahl.a - 1].w) && /^\p{Ll}/u.test(ws[auswahl.a].w)) auswahl.a--;
  }
  function auswahlErweitern(x, y) {
    const w = wortAn(x, y);
    if (!w || w.i !== auswahl.i) return;
    if (auswahl.span && w.k >= auswahl.span[0] && w.k <= auswahl.span[1]) return;
    auswahl.a = Math.min(auswahl.start, w.k);
    auswahl.b = Math.max(auswahl.start, w.k);
    erweitereSilbe();
    auswahlZeichnen();
  }
  function auswahlZeichnen() {
    const u = $('ueber');
    u.querySelectorAll('.auswahl').forEach((d) => d.remove());
    if (!auswahl) return;
    const ws = woerter(A.dir, auswahl.i);
    for (const z of zeilenRechtecke(ws, auswahl.a, auswahl.b)) {
      const r = seitenRechteck(auswahl.i, z);
      if (!r) continue;
      const d = document.createElement('div'); d.className = 'auswahl';
      const h = r[3] - r[1];
      Object.assign(d.style, { left: r[0] - h * 0.12 + 'px', top: r[1] - h * 0.06 + 'px', width: r[2] - r[0] + h * 0.24 + 'px', height: h * 1.1 + 'px' });
      u.appendChild(d);
    }
  }
  function auswahlText(i, a, b) {
    const ws = woerter(A.dir, i);
    let t = '';
    for (let k = a; k <= b; k++) {
      const w = ws[k].w;
      if (/[‐-]$/.test(w) && k < b && /^\p{Ll}/u.test(ws[k + 1].w)) t += w.slice(0, -1);
      else t += w + ' ';
    }
    return t.trim();
  }
  function auswahlFertig() {
    if (!auswahl) return;
    const ws = woerter(A.dir, auswahl.i);
    const r = seitenRechteck(auswahl.i, [ws[auswahl.a].x0, ws[auswahl.a].y0, ws[auswahl.b].x1, ws[auswahl.b].y1]);
    if (auswahl.span && auswahl.a >= auswahl.span[0] && auswahl.b <= auswahl.span[1]) begriffKarte(auswahl.span[2], r);
    else wortKarte(auswahl, r);
  }
  function auswahlWeg() { auswahl = null; auswahlZeichnen(); }

  // Glossar
  const GL = M.glossar || {};
  const GL_EXTRA = { 'raunacht': 'Zwölften', 'raunächt': 'Zwölften', 'memorat': 'Erlebnisbericht', 'wechselbälg': 'Wechselbalg', 'drudenfüß': 'Drudenfuß', 'elementargeist': 'Elementargeister', 'gegengabe': 'Gabe und Gegengabe', 'passauer': 'Passauer Kunst', 'sator': 'Sator-Quadrat', 'signatur': 'Signaturenlehre', 'apotropä': 'Apotropäisch', 'animist': 'Animismus', 'bußbüch': 'Beichtspiegel', 'himmelsbrief': 'Himmelsbrief', 'hexenfläsch': 'Hexenflasche', 'notfeuer': 'Notfeuer', 'sakramentali': 'Sakramentalien', 'wandersag': 'Wandersage', 'fraisenkett': 'Fraisen', 'elfenschüss': 'Elfenschuss', 'meidungsnam': 'Meidungsname', 'kräuterweih': 'Kräuterweihe' };
  const glStaemme = Object.keys(GL).filter((k) => !k.includes(' ')).map((k) => { let s = k.toLowerCase(); while (s.length > 5 && /(en|e|n|s)$/.test(s)) s = s.replace(/(en|e|n|s)$/, ''); return [s, k]; });
  function glossarFuer(text, i, a) {
    const w = norm(text.split(/\s+/)[0] || '');
    if (!w) return null;
    for (const [s, k] of Object.entries(GL_EXTRA)) if (w.startsWith(s)) return k;
    for (const [s, k] of glStaemme) if (w.startsWith(s) && w.length <= s.length + 4) return k;
    if (w === 'herr' || w === 'herrn' || w === 'herren') {
      const ws = woerter(A.dir, i);
      if (ws && ws[a + 2] && norm(ws[a + 2].w).startsWith('ort')) return 'Herr des Ortes';
    }
    return null;
  }

  // Wortkarte
  const karte = $('wortkarte');
  function kursiv(el, text) {
    el.textContent = '';
    String(text).split(/(\*[^*]+\*)/).forEach((t) => {
      if (/^\*[^*]+\*$/.test(t)) { const i = document.createElement('i'); i.textContent = t.slice(1, -1); el.appendChild(i); }
      else if (t) el.appendChild(document.createTextNode(t));
    });
  }
  function spanBei(i, k) { const S = seiteInfo(A.dir, i); return S && S.v ? S.v.find((v) => k >= v[0] && k <= v[1]) || null : null; }
  function begriffKarte(bi, r, opt) {
    opt = opt || {};
    const b = M.begriffe && M.begriffe[bi];
    if (!b) return;
    const box = $('k-begriff');
    box.textContent = ''; box.hidden = false;
    $('k-text').hidden = true; $('k-glossar').hidden = true; $('k-notiz').hidden = true; $('k-eingabe').hidden = true;
    const el = (tag, kl, txt) => { const d = document.createElement(tag); if (kl) d.className = kl; if (txt != null) kursiv(d, txt); return d; };
    box.append(el('div', 'b-art', b.k === 'Begriff' ? 'Glossar' : b.k), el('div', 'b-name', b.n));
    if (b.u) box.append(el('div', 'b-zusatz', b.u.replace(/^\*|\*$/g, '')));
    if (b.z) { const dl = el('dl', 'b-zeilen'); for (const [k, v] of b.z) dl.append(el('dt', null, k), el('dd', null, v)); box.append(dl); }
    if (b.d) box.append(el('div', 'b-erkl', b.d));
    if (b.c) box.append(el('div', 'b-satz', '„' + b.c + '“'));
    const stellen = (b.s && b.s[A.dir]) || [];
    if (stellen.length) {
      const f = el('div', 'b-fund');
      f.append(el('div', 'b-fund-kopf', stellen.length === 1 ? 'Kommt vor auf Seite' : 'Kommt vor auf ' + stellen.length + ' Seiten'));
      const zeile = el('div', 'b-chips');
      const hier = sichtbareSeiten();
      const zeigen = (alle) => {
        zeile.textContent = '';
        (alle ? stellen : stellen.slice(0, 18)).forEach((p) => {
          const c = document.createElement('button');
          c.className = 'chip' + (hier.includes(p) ? ' hier' : '');
          c.textContent = p + 1;
          c.addEventListener('click', () => { if (!hier.includes(p)) zuStelle(bi, p, opt); });
          zeile.append(c);
        });
        if (!alle && stellen.length > 18) { const m = document.createElement('button'); m.className = 'chip mehr'; m.textContent = '+ ' + (stellen.length - 18); m.addEventListener('click', () => zeigen(true)); zeile.append(m); }
      };
      zeigen(false);
      f.append(zeile);
      box.append(f);
    }
    const kn = $('k-knoepfe'); kn.textContent = '';
    if (b.e && b.e[A.dir] != null && !sichtbareSeiten().includes(b.e[A.dir])) kn.append(knopf('Zum Eintrag', () => zuStelle(bi, b.e[A.dir], opt, true), 'haupt'));
    if (!opt.bild && auswahl) { const sel = Object.assign({}, auswahl); kn.append(knopf('Markieren', () => { markierungNeu(sel, auswahlText(sel.i, sel.a, sel.b), ''); karteZu(); })); }
    kn.hidden = !kn.childNodes.length;
    karte.classList.toggle('ueber', !!opt.bild);
    karte.scrollTop = 0;
    karteSetzen(r);
    karte.classList.add('auf');
    fuehle('kipp');
  }
  function zuStelle(bi, p, opt, eintrag) {
    const ausBild = opt && opt.bild;
    karteZu();
    if (ausBild) betrachterZu();
    const S = seiteInfo(A.dir, p);
    const v = S && S.v && S.v.find((x) => x[2] === bi);
    if (v && !eintrag) { suchMarke = { i: p, a: v[0], b: v[1] }; suchMarkeNeu = true; }
    sprungVerlauf.push(pos);
    setTimeout(() => { gehe(seiteZuPos(p)); ueberlagerung(); }, ausBild ? 300 : 60);
  }
  function karteSetzen(r) {
    karte.hidden = false;
    const kw = Math.min(360, geo.W - 24);
    karte.style.width = kw + 'px';
    const x = klemme(((r ? (r[0] + r[2]) / 2 : geo.W / 2)) - kw / 2, 12, geo.W - kw - 12);
    karte.style.left = x + 'px';
    const h = karte.offsetHeight;
    let y = r ? r[3] + 14 : geo.H / 2 - h / 2;
    if (r && y + h > geo.H - 16) y = r[1] - h - 14;
    karte.style.top = klemme(y, 12, geo.H - h - 12) + 'px';
  }
  function knopf(text, f, kl) { const b = document.createElement('button'); b.textContent = text; if (kl) b.className = kl; b.addEventListener('click', f); return b; }
  function wortKarte(sel, r) {
    $('k-begriff').hidden = true; $('k-text').hidden = false; $('k-knoepfe').hidden = false; karte.classList.remove('ueber');
    const text = auswahlText(sel.i, sel.a, sel.b);
    $('k-text').textContent = text.length > 160 ? text.slice(0, 160) + ' …' : text;
    const g = sel.b - sel.a < 3 ? glossarFuer(text, sel.i, sel.a) : null;
    const gl = $('k-glossar');
    gl.hidden = !g;
    if (g) { gl.querySelector('.k-begriff').textContent = g; gl.querySelector('.k-erkl').textContent = GL[g]; }
    $('k-notiz').hidden = true;
    $('k-eingabe').hidden = true;
    const kn = $('k-knoepfe'); kn.textContent = '';
    kn.append(
      knopf('Markieren', () => { markierungNeu(sel, text, ''); karteZu(); }),
      knopf('Notiz', () => notizEingabe((n) => { markierungNeu(sel, text, n); })),
      knopf('Suchen', () => { karteZu(); oeffneInhalt(); suchfeld.value = text.split(/\s+/).slice(0, 4).join(' '); suche(); }),
    );
    karteSetzen(r);
    karte.classList.add('auf');
  }
  function markierungKarte(m, x, y) {
    $('k-begriff').hidden = true; $('k-text').hidden = false; $('k-knoepfe').hidden = false; karte.classList.remove('ueber');
    const o = m[A.dir];
    const ws = woerter(A.dir, o.s);
    const r = ws ? seitenRechteck(o.s, [ws[o.a].x0, ws[o.a].y0, ws[o.b].x1, ws[o.b].y1]) : [x, y, x, y];
    $('k-text').textContent = m.text.length > 160 ? m.text.slice(0, 160) + ' …' : m.text;
    $('k-glossar').hidden = true;
    const n = $('k-notiz'); n.hidden = !m.notiz; n.textContent = m.notiz || '';
    $('k-eingabe').hidden = true;
    const kn = $('k-knoepfe'); kn.textContent = '';
    kn.append(
      knopf(m.notiz ? 'Notiz ändern' : 'Notiz', () => notizEingabe((t) => { m.notiz = t; mkSpeichern(); erneuereUeber(A.dir, o.s); anstossen(); }, m.notiz)),
      knopf('Entfernen', () => { markierungen = markierungen.filter((x) => x !== m); mkSpeichern(); erneuereUeber(A.dir, o.s); karteZu(); anstossen(); melde('Markierung entfernt', 1500); }),
    );
    karteSetzen(r);
    karte.classList.add('auf');
  }
  function notizEingabe(fertig, alt) {
    const ein = $('k-eingabe');
    ein.hidden = false; ein.value = alt || '';
    karte.classList.add('schreiben');
    const kn = $('k-knoepfe'); kn.textContent = '';
    kn.append(knopf('Speichern', () => { fertig(ein.value.trim()); karteZu(); }, 'haupt'), knopf('Abbrechen', karteZu));
    karteSetzen(null);
    karte.style.top = '16px';
    setTimeout(() => ein.focus(), 60);
  }
  function karteZu() {
    if (karte.hidden && !auswahl) return;
    $('k-begriff').hidden = true; $('k-text').hidden = false; $('k-knoepfe').hidden = false; karte.classList.remove('ueber');
    karte.hidden = true; karte.classList.remove('auf', 'schreiben');
    $('k-eingabe').blur();
    auswahlWeg();
  }
  function markierungNeu(sel, text, notiz) {
    const m = { id: Date.now().toString(36), zeit: Date.now(), text, notiz: notiz || '' };
    m[A.dir] = { s: sel.i, a: sel.a, b: sel.b };
    markierungen.push(m);
    mkSpeichern();
    erneuereUeber(A.dir, sel.i);
    auswahlWeg();
    fuehle('band');
    anstossen();
    melde(notiz ? 'Notiz gespeichert' : 'Markiert', 1400);
  }

  // Volltextsuche mit Fundstellen auf der Seite
  const suchfeld = $('suchfeld'), ergebnisse = $('ergebnisse'), verzeichnis = $('verzeichnis');
  const suchText = new Map();
  function seitenText(i) {
    const k = A.dir + ':' + i;
    if (suchText.has(k)) return suchText.get(k);
    const ws = woerter(A.dir, i);
    if (!ws) return null;
    let t = ''; const start = [];
    for (let k2 = 0; k2 < ws.length; k2++) {
      const w = ws[k2].w;
      start.push(t.length);
      if (/[‐-]$/.test(w) && ws[k2 + 1] && /^\p{Ll}/u.test(ws[k2 + 1].w)) t += w.slice(0, -1);
      else t += w + ' ';
    }
    const e = { t, start };
    suchText.set(k, e);
    return e;
  }
  let suchZeit = null;
  suchfeld.addEventListener('input', () => { clearTimeout(suchZeit); suchZeit = setTimeout(suche, 180); });
  function suche() {
    const q = suchfeld.value.trim();
    if (q.length < 2) { ergebnisse.hidden = true; verzeichnis.hidden = false; return; }
    ergebnisse.hidden = false; verzeichnis.hidden = true;
    ladeDaten(A.dir).then(() => {
      if (suchfeld.value.trim() !== q) return;
      ergebnisse.textContent = '';
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const funde = [];
      for (let i = 0; i < A.n && funde.length < 250; i++) {
        const e = seitenText(i); if (!e) continue;
        rx.lastIndex = 0; let m, n = 0;
        while ((m = rx.exec(e.t)) && n < 3) { funde.push([i, m.index, m[0].length]); n++; }
      }
      const kopf = document.createElement('div'); kopf.className = 'rubrik';
      kopf.textContent = funde.length ? (funde.length >= 250 ? 'Mehr als 250 Fundstellen' : funde.length === 1 ? 'Eine Fundstelle' : funde.length + ' Fundstellen') : 'Keine Fundstelle';
      ergebnisse.appendChild(kopf);
      funde.forEach(([i, a, len]) => {
        const text = seitenText(i).t;
        const von = Math.max(0, text.lastIndexOf(' ', Math.max(0, a - 70)));
        const bis = Math.min(text.length, a + len + 90);
        const b = document.createElement('button'); b.className = 'treffer';
        const s = document.createElement('span'); s.className = 's'; s.textContent = 'Seite ' + (i + 1) + (kapitelVon(i + 1) ? ' · ' + kapitelVon(i + 1) : '');
        const mk = document.createElement('mark'); mk.textContent = text.slice(a, a + len);
        b.append(s, (von > 0 ? '… ' : '') + text.slice(von, a).trimStart(), mk, text.slice(a + len, bis) + (bis < text.length ? ' …' : ''));
        b.addEventListener('click', () => { schliesseInhalt(); sprungVerlauf.push(pos); sucheMarkeSetzen(i, a, len); gehe(seiteZuPos(i)); ueberlagerung(); });
        ergebnisse.appendChild(b);
      });
    });
  }
  let suchMarke = null, suchMarkeNeu = false;
  function sucheMarkeSetzen(i, a, len) {
    const e = seitenText(i);
    let wa = 0, wb = 0;
    e.start.forEach((s, k) => { if (s <= a) wa = k; if (s < a + len) wb = k; });
    suchMarke = { i, a: wa, b: wb }; suchMarkeNeu = true;
  }
  function sucheMarkeLoeschen() { if (suchMarkeNeu) { suchMarkeNeu = false; return; } suchMarke = null; }

  // Überlagerungen (Suchtreffer, Vorlesemarke) über der ruhenden Seite
  function ueberlagerung() {
    const u = $('ueber');
    u.querySelectorAll('.marke, .vorlese, .zusatz').forEach((d) => d.remove());
    const verdeckt = blaetter.length || oeffnung || UE.offen || UE.anim;
    u.style.visibility = verdeckt ? 'hidden' : 'visible';
    if (verdeckt) return;
    const setze = (i, a, b, kl) => {
      const ws = woerter(A.dir, i);
      if (!ws) return;
      for (const z of zeilenRechtecke(ws, a, b)) {
        const r = seitenRechteck(i, z);
        if (!r) continue;
        const d = document.createElement('div'); d.className = kl;
        const h = r[3] - r[1];
        Object.assign(d.style, { left: r[0] - h * 0.1 + 'px', top: r[1] - h * 0.05 + 'px', width: r[2] - r[0] + h * 0.2 + 'px', height: h * 1.1 + 'px' });
        u.appendChild(d);
      }
    };
    if (suchMarke) setze(suchMarke.i, suchMarke.a, suchMarke.b, 'marke');
    const sicht = sichtbareSeiten();
    for (const z of zusatzMarken) if (sicht.includes(z.i)) setze(z.i, z.a, z.b, 'zusatz ' + z.kl);
    auswahlZeichnen();
  }

  // ---------- Bildbetrachter ----------
  const bet = $('betrachter'), bild = $('b-bild'), rahmen = $('b-rahmen'), punkte = $('b-punkte');
  let betZustand = null;
  function betrachterAuf(r, i) {
    betrachterOeffnen(r[4], seitenRechteck(i, [r[0] / 1e4, r[1] / 1e4, r[2] / 1e4, r[3] / 1e4]), i);
  }
  function betrachterOeffnen(q, quelle, seite) {
    const info = M.bilder[q];
    if (!info) return;
    bild.removeAttribute('src');
    bildQuelle('bilder/' + q + '.webp').then((u) => { if (betZustand && betZustand.q === q) bild.src = u; }).catch(() => {});
    $('b-unter').textContent = info.u || '';
    $('b-zur').hidden = seite == null || sichtbareSeiten().includes(seite);
    punkte.textContent = '';
    if (q === 'karte' && M.karte) for (const [u, v, n] of M.karte) {
      const d = document.createElement('div'); d.className = 'punkt'; d.title = n;
      d.style.left = u * 100 + '%'; d.style.top = v * 100 + '%';
      punkte.appendChild(d);
    }
    bet.hidden = false;
    const W = geo.W, H = geo.H - 70;
    const s = Math.min(W / info.w, H / info.h);
    const bw = info.w * s, bh = info.h * s;
    betZustand = { q, info, quelle, seite, s, bw, bh, x: 0, y: 0, z: 1, zeiger: new Map() };
    rahmen.style.width = bw + 'px'; rahmen.style.height = bh + 'px';
    rahmen.style.left = (W - bw) / 2 + 'px'; rahmen.style.top = (H - bh) / 2 + 'px';
    const von = quelle ? `translate(${quelle[0] - (W - bw) / 2}px, ${quelle[1] - (H - bh) / 2}px) scale(${(quelle[2] - quelle[0]) / bw})` : 'scale(0.9)';
    rahmen.style.transformOrigin = '0 0';
    rahmen.style.transition = 'none';
    rahmen.style.transform = von;
    bet.classList.remove('auf');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      rahmen.style.transition = 'transform 0.34s cubic-bezier(.2,.75,.25,1)';
      rahmen.style.transform = 'translate(0px,0px) scale(1)';
      bet.classList.add('auf');
    }));
    fuehle('kipp');
    ui(false);
  }
  function betrachterZu() {
    if (bet.hidden) return;
    if (karte.classList.contains('ueber')) karteZu();
    const st = betZustand;
    const W = geo.W, H = geo.H - 70;
    rahmen.style.transition = 'transform 0.28s cubic-bezier(.4,0,.6,1)';
    rahmen.style.transform = st && st.quelle ? `translate(${st.quelle[0] - (W - st.bw) / 2}px, ${st.quelle[1] - (H - st.bh) / 2}px) scale(${(st.quelle[2] - st.quelle[0]) / st.bw})` : 'scale(0.9)';
    bet.classList.remove('auf');
    setTimeout(() => { bet.hidden = true; betZustand = null; }, 290);
  }
  function betSetzen() {
    const st = betZustand;
    rahmen.style.transition = 'none';
    rahmen.style.transformOrigin = '0 0';
    const W = geo.W, H = geo.H - 70;
    // im Rahmen halten
    const bw = st.bw * st.z, bh = st.bh * st.z;
    const gx = Math.max(0, (bw - W) / 2 + 20), gy = Math.max(0, (bh - H) / 2 + 20);
    const cx = (W - st.bw) / 2, cy = (H - st.bh) / 2;
    st.x = klemme(st.x, -gx - (bw - st.bw) / 2, gx - (bw - st.bw) / 2);
    st.y = klemme(st.y, -gy - (bh - st.bh) / 2, gy - (bh - st.bh) / 2);
    rahmen.style.transform = `translate(${st.x}px, ${st.y}px) scale(${st.z})`;
    bet.style.setProperty('--zieh', '0');
    void cx; void cy;
  }
  let letzterTipp = 0;
  bet.addEventListener('pointerdown', (e) => {
    if (!betZustand) return;
    const st = betZustand;
    st.zeiger.set(e.pointerId, [e.clientX, e.clientY]);
    try { bet.setPointerCapture(e.pointerId); } catch (err) {}
    st.start = { x: st.x, y: st.y, z: st.z, p: [...st.zeiger.values()].map((p) => p.slice()), t: jetzt(), runter: 0 };
  });
  bet.addEventListener('pointermove', (e) => {
    const st = betZustand;
    if (!st || !st.zeiger.has(e.pointerId)) return;
    st.zeiger.set(e.pointerId, [e.clientX, e.clientY]);
    const p = [...st.zeiger.values()];
    const s0 = st.start;
    if (p.length >= 2 && s0.p.length >= 2) {
      const d0 = Math.hypot(s0.p[0][0] - s0.p[1][0], s0.p[0][1] - s0.p[1][1]);
      const d1 = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
      const z = klemme(s0.z * d1 / Math.max(10, d0), 1, M.bilder && st.info.w > 2000 ? 6 : 4);
      const m0 = [(s0.p[0][0] + s0.p[1][0]) / 2, (s0.p[0][1] + s0.p[1][1]) / 2];
      const m1 = [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2];
      const W = geo.W, H = geo.H - 70;
      const ox = (W - st.bw) / 2, oy = (H - st.bh) / 2;
      const lx = (m0[0] - ox - s0.x) / s0.z, ly = (m0[1] - oy - s0.y) / s0.z;
      st.z = z; st.x = m1[0] - ox - lx * z; st.y = m1[1] - oy - ly * z;
      betSetzen();
    } else if (p.length === 1 && s0.p.length === 1) {
      const dx = p[0][0] - s0.p[0][0], dy = p[0][1] - s0.p[0][1];
      if (st.z > 1.02) { st.x = s0.x + dx; st.y = s0.y + dy; betSetzen(); }
      else if (dy > 0) {
        s0.runter = dy;
        rahmen.style.transition = 'none';
        rahmen.style.transform = `translate(${dx * 0.4}px, ${dy}px) scale(${1 - Math.min(0.25, dy / 1600)})`;
        bet.style.setProperty('--zieh', String(Math.min(1, dy / 300)));
      }
    }
  });
  function betLos(e) {
    const st = betZustand;
    if (!st || !st.zeiger.has(e.pointerId)) return;
    st.zeiger.delete(e.pointerId);
    const s0 = st.start;
    if (st.zeiger.size) { st.start = { x: st.x, y: st.y, z: st.z, p: [...st.zeiger.values()].map((p) => p.slice()), t: jetzt() }; return; }
    if (s0.runter > 110) { betrachterZu(); return; }
    if (s0.runter > 0) { rahmen.style.transition = 'transform 0.2s ease-out'; rahmen.style.transform = 'translate(0,0) scale(1)'; bet.style.setProperty('--zieh', '0'); return; }
    const kurz = jetzt() - s0.t < 260 && Math.hypot(e.clientX - s0.p[0][0], e.clientY - s0.p[0][1]) < 10;
    if (kurz && st.q === 'karte' && M.karte) {
      const r = rahmen.getBoundingClientRect();
      const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
      let best = null, bd = 0.05;
      for (const k of M.karte) { const d = Math.hypot(k[0] - u, (k[1] - v) * r.height / r.width); if (d < bd) { bd = d; best = k; } }
      if (best) { clearTimeout(st.tippZeit); letzterTipp = 0; begriffKarte(best[3], [e.clientX - 12, e.clientY - 12, e.clientX + 12, e.clientY + 12], { bild: true }); return; }
    }
    if (kurz) {
      const t = jetzt();
      if (t - letzterTipp < 300) {
        letzterTipp = 0;
        clearTimeout(st.tippZeit);
        const W = geo.W, H = geo.H - 70;
        const ox = (W - st.bw) / 2, oy = (H - st.bh) / 2;
        if (st.z > 1.05) { st.z = 1; st.x = 0; st.y = 0; }
        else { const z = 2.6; const lx = (e.clientX - ox - st.x) / st.z, ly = (e.clientY - oy - st.y) / st.z; st.z = z; st.x = e.clientX - ox - lx * z; st.y = e.clientY - oy - ly * z; }
        betSetzen();
        rahmen.style.transition = 'transform 0.25s ease-out';
      } else {
        letzterTipp = t;
        st.tippZeit = setTimeout(() => { if (st.z <= 1.02) betrachterZu(); }, 310);
      }
    }
  }
  bet.addEventListener('pointerup', betLos);
  bet.addEventListener('pointercancel', betLos);

  $('b-zur').addEventListener('click', () => {
    const st = betZustand;
    const sz = st && st.seite;
    betrachterZu(); galerieZu(); schliesseInhalt();
    if (sz != null) { sprungVerlauf.push(pos); setTimeout(() => gehe(seiteZuPos(sz)), 120); }
  });

  // ---------- Bildergalerie ----------
  const galerie = $('galerie');
  let galerieDir = null;
  function galerieAuf() {
    const raster = $('galerie-raster');
    if (galerieDir !== A.dir) {
      raster.textContent = '';
      Object.entries(M.bilder).filter(([, i]) => i.seiten && i.seiten[A.dir] != null).sort((a, b) => a[1].seiten[A.dir] - b[1].seiten[A.dir]).forEach(([q, info]) => {
        const k = document.createElement('button'); k.className = 'g-bild';
        const im = document.createElement('img'); im.loading = 'lazy'; im.decoding = 'async'; im.alt = ''; bildQuelle('bilder/klein/' + q + '.webp').then((u) => { im.src = u; }).catch(() => {});
        im.style.aspectRatio = info.w + ' / ' + info.h;
        const t = document.createElement('span'); t.textContent = info.u || ('Seite ' + (info.seiten[A.dir] + 1));
        k.append(im, t);
        k.addEventListener('click', () => { const r = im.getBoundingClientRect(); betrachterOeffnen(q, [r.left, r.top, r.right, r.bottom], info.seiten[A.dir]); });
        raster.appendChild(k);
      });
      galerieDir = A.dir;
    }
    galerie.hidden = false;
  }
  function galerieZu() { galerie.hidden = true; }
  $('knopf-galerie').addEventListener('click', galerieAuf);
  $('galerie-zu').addEventListener('click', galerieZu);

  // Ohne Vorlesen: Platzhalter für die Stellen, die den Zustand abfragen
  const V = { aktiv: false, satz: null };

  // ---------- Einstellungen ----------
  function bogenAuf() { body.classList.add('bogen'); einstellungenZeigen(); }
  function bogenZu() { body.classList.remove('bogen'); }
  $('knopf-einst').addEventListener('click', () => { if (body.classList.contains('bogen')) bogenZu(); else bogenAuf(); });
  function einstellungenZeigen() {
    document.querySelectorAll('.wahl[data-e]').forEach((w) => {
      const k = w.dataset.e;
      w.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(E[k]) === b.dataset.w ? 'true' : 'false'));
    });
    document.querySelectorAll('.schalter[data-s]').forEach((b) => b.setAttribute('aria-pressed', E[b.dataset.s] ? 'true' : 'false'));
    $('e-warm').value = E.warm;
    $('e-hell').value = E.hell < 0 ? 0.6 : E.hell;
    $('e-hell').disabled = E.hell < 0;
    $('e-hell-auto').setAttribute('aria-pressed', E.hell < 0 ? 'true' : 'false');
    $('e-umg').value = E.umgLaut;
    $('umg-laut-reihe').hidden = E.umgebung === 'aus';
    $('reihe-tasten').hidden = !BR;
  }
  document.querySelectorAll('.wahl[data-e]').forEach((w) => w.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const k = w.dataset.e;
    E[k] = b.dataset.w; speichereE(); einstellungenZeigen(); anwenden();
    fuehle('kipp');
  }));
  document.querySelectorAll('.schalter[data-s]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.s; E[k] = !E[k]; speichereE(); einstellungenZeigen(); anwenden(); if (E.vib) fuehle('kipp');
  }));
  $('e-warm').addEventListener('input', (e) => { E.warm = parseFloat(e.target.value); speichereE(); anstossen(); });
  $('e-hell').addEventListener('input', (e) => { E.hell = parseFloat(e.target.value); speichereE(); helligkeit(); });
  $('e-hell-auto').addEventListener('click', () => { E.hell = E.hell < 0 ? 0.6 : -1; speichereE(); einstellungenZeigen(); helligkeit(); });
  $('e-umg').addEventListener('input', (e) => { E.umgLaut = parseFloat(e.target.value); speichereE(); K.umgebung(E.umgebung, E.umgLaut); });
  function helligkeit() {
    if (E.hell < 0) { brueck('helligkeit', -1); dimm = 1; }
    else {
      brueck('helligkeit', Math.max(0.01, E.hell));
      dimm = E.hell < 0.15 ? 0.45 + 0.55 * (E.hell / 0.15) : 1;
      if (!BR) dimm = 0.35 + 0.65 * E.hell;
    }
    anstossen();
  }
  function anwenden() {
    K.an = E.klang;
    if (E.umgebung !== 'aus') K.start();
    K.umgebung(E.umgebung, E.umgLaut);
    sende('einstellungen');
    brueck('lautTasten', !!E.tasten);
    helligkeit();
    anstossen();
  }

  // ---------- Hinweis beim ersten Lesen ----------
  function ersterHinweis() {
    if (hole('handbuch-hinweis2', 0)) return;
    merke('handbuch-hinweis2', 1);
    const h = $('hinweis');
    h.hidden = false;
    requestAnimationFrame(() => h.classList.add('auf'));
    // die Ecke hebt sich zweimal ein wenig
    const zupfen = (verz) => setTimeout(() => {
      if (blaetter.length || zug || !kann(1)) return;
      const [pw, ph] = geo.seite;
      const b = neuesBlatt(1, ph, 'unten');
      b.phase = 'feder'; b.vollenden = false; b.zielB = [pw, ph];
      b.B = [pw - 0.001, ph]; b.v = [-1500, -120];
      flachSetzen(blattSeiten(1).flach);
      blaetter.push(b);
      stimmeFuer(b, 0.25);
      anstossen();
    }, verz);
    zupfen(300); zupfen(1500);
    setTimeout(() => { h.classList.remove('auf'); setTimeout(() => { h.hidden = true; }, 600); }, 5200);
  }

  // ---------- Meldung ----------
  let meldZeit = null;
  function melde(t, dauer) {
    const m = $('meldung');
    m.textContent = t; m.hidden = false;
    requestAnimationFrame(() => m.classList.add('auf'));
    clearTimeout(meldZeit);
    meldZeit = setTimeout(() => { m.classList.remove('auf'); setTimeout(() => { m.hidden = true; }, 250); }, dauer || 1800);
  }

  // ---------- Wach halten ----------
  let wachZeit = null, wach = true, sperre = null;
  function sperreSetzen(an) {
    if (BR || !navigator.wakeLock) return;
    if (an && !sperre && !document.hidden) { navigator.wakeLock.request('screen').then((s) => { sperre = s; s.addEventListener('release', () => { if (sperre === s) sperre = null; }); }).catch(() => {}); }
    if (!an && sperre) { sperre.release().catch(() => {}); sperre = null; }
  }
  function wachAuffrischen() {
    if (!wach) { wach = true; brueck('wach', true); }
    sperreSetzen(true);
    clearTimeout(wachZeit);
    wachZeit = setTimeout(() => { if (!V.aktiv) { wach = false; brueck('wach', false); sperreSetzen(false); } }, 10 * 60 * 1000);
  }

  // ---------- Android: Zurück, Tasten, Pause ----------
  window.__zurueck = () => {
    if (!karte.hidden) { karteZu(); return true; }
    if (!bet.hidden) { betrachterZu(); return true; }
    if (!galerie.hidden) { galerieZu(); return true; }
    if (body.classList.contains('bogen')) { bogenZu(); return true; }
    if (body.classList.contains('toc')) { if (suchfeld.value) { suchfeld.value = ''; suche(); } else schliesseInhalt(); return true; }
    if (UE.offen) { uebersichtZu(); return true; }
    if (body.classList.contains('ui')) { ui(false); return true; }
    if (sprungVerlauf.length) { gehe(sprungVerlauf.pop()); return true; }
    return false;
  };
  window.__taste = (r, wiederholt) => {
    if (body.classList.contains('toc') || body.classList.contains('bogen') || !bet.hidden || UE.offen) return;
    if (wiederholt > 0 && wiederholt % 3) return;
    wachAuffrischen();
    automatisch(r);
  };
  window.__pause = () => { K.pause(); };
  window.__weiter = () => { K.weiter(); if (E.umgebung !== 'aus') K.umgebung(E.umgebung, E.umgLaut); anstossen(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) K.pause(); else { window.__weiter(); if (wach) sperreSetzen(true); } });
  document.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const r = { ArrowRight: 1, ArrowDown: 1, PageDown: 1, ' ': 1, ArrowLeft: -1, ArrowUp: -1, PageUp: -1 }[e.key];
    if (r) { e.preventDefault(); window.__taste(r, e.repeat ? 1 : 0); }
    else if (e.key === 'Escape') window.__zurueck();
  });

  // ---------- Größe und Drehung ----------
  let rz = null;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    if (!karte.hidden && karte.classList.contains('schreiben')) return;
    rz = setTimeout(() => {
      const m = waehleModus();
      uebersichtWeg();
      if (m !== modus && !oeffnung) {
        const s = sichtbareSeiten();
        const seite = umrechnen(s[s.length - 1] + 1, modus, m);
        modus = m; A = AUS[m];
        stimmenEnde(blaetter);
        blaetter = [];
        texturenLeeren();
        woerterCache.clear();
        pos = m === 'handy' ? klemme(seite - 1, 0, A.n - 1) : klemme(Math.ceil((seite - 1) / 2), 0, letzterAufschlag());
        geometrie();
        ladeDaten(A.dir).then(() => { flachSetzen(ruheFlach()); anstossen(); anzeigen(); });
        flachSetzen(ruheFlach());
        baueInhalt();
        geblaettert();
      } else geometrie();
    }, 120);
  });

  // ---------- Start ----------
  modus = waehleModus(); A = AUS[modus];
  const l = hole('handbuch-lesestelle', null);
  let startSeite = 2;
  if (l && AUS[l.modus]) startSeite = umrechnen(l.seite, l.modus, modus);
  pos = modus === 'handy' ? klemme(startSeite - 1, 0, A.n - 1) : klemme(Math.ceil((startSeite - 1) / 2), 0, letzterAufschlag());
  geometrie();
  baueInhalt();
  anwenden();
  if (!R) { $('laden').hidden = true; flachSetzen(ruheFlach()); fallbackZeigen(); }
  if (pos === 0 && l) { flachSetzen(ruheFlach()); anzeigen(); }
  else {
    if (pos === 0) pos = 1;
    geschlossenZeigen(pos);
    // erst aufschlagen, wenn Umschlag und Zielseite geladen sind und das geschlossene Buch einen Moment zu sehen war
    const t0 = jetzt();
    let gesehen = 0;
    const warten = () => {
      if (!oeffnung || oeffnung.lauf) return;
      const deckel = oeffnung.b.vorn, ziel = flach[0] && flach[0].e;
      const fertig = deckel && deckel.t && (!ziel || ziel.t);
      if (fertig && !gesehen) gesehen = jetzt();
      if ((fertig && jetzt() - gesehen > 750) || jetzt() - t0 > 5000) oeffnen();
      else setTimeout(warten, 60);
    };
    setTimeout(warten, 60);
  }
  ladeDaten(A.dir).then(() => {
    for (const e of tex.values()) { e.dunkel = istDunkel(e.i); e.bilder = bildFlaechen(e.i); }
    anzeigen();
    anstossen();
    ladeDaten(A.dir === 'h' ? 'b' : 'h');
  });
  vorladen();
  anstossen();
  window.addEventListener('error', (e) => { try { console.warn('Fehler', e.message); } catch (x) {} });

  // ---------- Schnittstelle für Erweiterungen ----------
  window.LESER = {
    an(ev, f) { (horcher[ev] = horcher[ev] || []).push(f); },
    get pos() { return pos; }, get modus() { return modus; }, get A() { return A; }, get wpm() { return wpm; },
    get offen() { return !oeffnung; }, get uebersicht() { return UE.offen; },
    get ruhig() { return !(blaetter.length || oeffnung || UE.offen || UE.anim); },
    M, E, K, AUS, body,
    sichtbar: () => sichtbareSeiten(),
    gehe(i) { sprungVerlauf.push(pos); schliesseInhalt(); gehe(seiteZuPos(i)); },
    wortzahl, seiteInfo, umrechnen, kapitelVon, ui, melde, schliesseInhalt,
    betrachter: (q, seite) => betrachterOeffnen(q, null, seite),
    marken: zusatzMarken,
    zeichne: () => ueberlagerung(),
  };
})();
