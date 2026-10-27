// Labor für ein neues Lesen: Wege, Erkundung, Lesezustände mit Angeboten und der waltende Geist
// mit Klang, Zeitgefühl, Wiederbegegnung und passendem Bild. Jeder Versuch lässt sich einzeln
// schalten; Beobachtung, Selbstmeldung und Protokoll machen sichtbar, was trifft.
// Läuft auf dem Leser (window.LESER) mit den Labordaten (window.LABOR).
(() => {
  'use strict';
  const L = window.LESER, LD = window.LABOR;
  if (!L || !LD) return;
  const M = L.M, body = L.body;
  const $ = (id) => document.getElementById(id);
  const el = (tag, kl, txt) => { const d = document.createElement(tag); if (kl) d.className = kl; if (txt != null) d.textContent = txt; return d; };
  const hole = (k, std) => { try { const v = localStorage.getItem(k); return v == null ? std : JSON.parse(v); } catch (e) { return std; } };
  const merke = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const median = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
  const runde = (x, n) => (Math.round(x * 10 ** (n || 1)) / 10 ** (n || 1)).toLocaleString('de-DE');
  const bildUrl = (p) => window.SCHUTZ ? window.SCHUTZ.url(p) : Promise.resolve(p);

  // ---------- Schalter ----------
  const VERSUCHE = [
    ['wege', 'Wege durch das Buch'],
    ['erkundung', 'Erkundung vor dem Kapitel'],
    ['zustaende', 'Lesezustand erkennen'],
    ['klang', 'Klang folgt dem Inhalt'],
    ['zeit', 'Gespür für Stunde und Jahreszeit'],
    ['wieder', 'Wiederbegegnung'],
  ];
  const S = Object.assign({ wege: true, erkundung: true, zustaende: true, klang: true, zeit: true, wieder: true,
    beobachten: false, empfindlich: '1', wiederTage: '2', simZeit: '' }, hole('labor-schalter', {}));
  const sichern = () => merke('labor-schalter', S);
  const empf = () => parseFloat(S.empfindlich) || 1;

  // ---------- Protokoll ----------
  let prot = hole('labor-protokoll', []);
  let aktZustand = { art: '?' };
  function aktSeite() { const s = L.sichtbar(); return s[s.length - 1] + 1; }
  function notiere(art, d) {
    prot.push(Object.assign({ z: new Date().toISOString(), art, seite: aktSeite(), aus: L.A.dir, zustand: aktZustand.art }, d || {}));
    if (prot.length > 3000) prot = prot.slice(-3000);
    merke('labor-protokoll', prot);
  }

  // ---------- Aufbau des Buches ----------
  const cache = {};
  function abschnitte() {
    const A = L.A;
    if (cache[A.dir]) return cache[A.dir];
    const t = A.toc;
    const r = t.map(([e, titel, s], k) => {
      let ende = A.druck;
      for (let j = k + 1; j < t.length; j++) if (t[j][0] <= e) { ende = t[j][2] - 1; break; }
      return { e, titel, s, ende: Math.max(s, ende), k };
    });
    return (cache[A.dir] = r);
  }
  const abschnittBei = (seite, e) => { let a = null; for (const x of abschnitte()) if (x.e === e && x.s <= seite && x.ende >= seite) a = x; return a; };
  const tiefster = (seite) => abschnittBei(seite, 2) || abschnittBei(seite, 1) || abschnittBei(seite, 0);
  const suche = (titel, e) => abschnitte().find((a) => a.titel === titel && (e == null || a.e === e));
  const kapitel = (seite) => abschnittBei(seite, 0);
  const sagenlese = () => suche('Sagenlese', 0);
  const istSage = (a) => { const sl = sagenlese(); return a && sl && a.e === 2 && a.s >= sl.s && a.s <= sl.ende; };
  const buchStart = () => (suche('Die beseelte Welt', 0) || { s: 12 }).s;
  const buchEnde = () => ((suche('Zeittafel der Quellen', 0) || { s: L.A.druck }).s) - 1;
  function bilderIn(von, bis) {
    const d = L.A.dir, r = [];
    for (const [q, info] of Object.entries(M.bilder)) {
      const p = info.seiten && info.seiten[d];
      if (p != null && p + 1 >= von && p + 1 <= bis && q !== 'karte') r.push({ q, seite: p, u: info.u || '' });
    }
    return r.sort((a, b) => a.seite - b.seite);
  }
  function gestaltenAuf(i) {
    const S_ = L.seiteInfo(L.A.dir, i);
    if (!S_ || !S_.v) return [];
    return [...new Set(S_.v.map((v) => v[2]).filter((b) => M.begriffe[b] && M.begriffe[b].k === 'Gestalt'))];
  }
  function gelesen(seite) { const g = hole('handbuch-gelesen', {}); return (g[L.A.dir] || '')[seite - 1] === '1'; }

  // ---------- Zeitgefühl ----------
  const ZEITEN = { mittag: [6, 15, 12, 30], nacht: [9, 28, 23, 30], zwoelften: [11, 28, 21, 0], johannis: [5, 23, 22, 0] };
  function zeitJetzt() {
    const z = ZEITEN[S.simZeit];
    if (!z) return new Date();
    const d = new Date(); d.setMonth(z[0], z[1]); d.setHours(z[2], z[3]); return d;
  }
  function imBereich(x, a, b) { return a <= b ? x >= a && x <= b : x >= a || x <= b; }
  function zeitTreffer() {
    if (!S.zeit) return new Set();
    const d = zeitJetzt(), m = d.getMonth() + 1, tag = d.getDate(), h = d.getHours();
    const r = new Set();
    for (const z of LD.zeit) {
      if (z.monate && !z.monate.includes(m)) continue;
      if (z.stunden && !imBereich(h, z.stunden[0], z.stunden[1])) continue;
      if (z.tage) { const x = m * 100 + tag, a = z.tage[0][0] * 100 + z.tage[0][1], b = z.tage[1][0] * 100 + z.tage[1][1]; if (!imBereich(x, a, b)) continue; }
      r.add(z.titel);
    }
    return r;
  }

  // ---------- Stil ----------
  const css = el('style');
  css.textContent = `
  .lab-angebot { position: fixed; z-index: 35; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 22px); transform: translate(-50%, 12px);
    width: min(calc(100vw - 28px), 430px); display: flex; gap: 12px; align-items: center; padding: 12px 14px; background: var(--leiste);
    border: 1px solid var(--linie); border-radius: 8px; box-shadow: 0 10px 34px rgba(0,0,0,0.5); opacity: 0; transition: opacity 0.6s ease, transform 0.6s ease; }
  .lab-angebot.auf { opacity: 1; transform: translate(-50%, 0); }
  .lab-angebot .lab-a-bild { flex: none; width: 64px; min-width: 64px; height: 64px; padding: 0; display: block; border: 0; border-radius: 4px; overflow: hidden; background: var(--glut); }
  .lab-angebot .lab-a-bild img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .lab-a-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .lab-a-titel { font-size: 16.5px; line-height: 1.3; color: var(--pergament); }
  .lab-a-zeile { font-size: 15px; line-height: 1.4; font-style: italic; color: var(--gedaempft); }
  .lab-a-knoepfe { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
  .lab-a-knoepfe button, .lab-knopf { height: 34px; padding: 0 12px; border: 1px solid var(--linie); border-radius: 4px; background: transparent; color: var(--pergament);
    font-family: var(--schrift); font-size: 15px; font-variant: small-caps; letter-spacing: 0.05em; }
  .lab-a-zu { flex: none; align-self: flex-start; width: 28px; min-width: 28px; height: 28px; border: 0; background: transparent; color: var(--gedaempft); font-size: 20px; line-height: 1; padding: 0; }
  .lab-ruhe { position: fixed; inset: 0; z-index: 34; background: #000; opacity: 0; pointer-events: none; transition: opacity 2.4s ease; }
  .lab-ruhe.auf { opacity: 0.55; }
  .zusatz { position: absolute; pointer-events: none; }
  .zusatz.lab-schimmer { background: radial-gradient(ellipse at center, rgba(222, 168, 92, 0.42), rgba(222, 168, 92, 0) 72%); border-radius: 6px; opacity: 0; animation: lab-schimmer 5.2s ease-in-out forwards; }
  @keyframes lab-schimmer { 0% { opacity: 0; } 35% { opacity: 1; } 100% { opacity: 0; } }
  #lab-wege .lab-w { display: flex; height: auto; min-height: 40px; justify-content: flex-start; width: 100%; text-align: left; border: 0; border-radius: 0; background: transparent; color: var(--pergament);
    font-family: var(--schrift); font-size: 15.5px; line-height: 1.35; padding: 8px 20px 8px max(20px, env(safe-area-inset-left, 0px)); gap: 10px; align-items: baseline; }
  #lab-wege .lab-w .z { flex: none; color: var(--rost); font-variant: small-caps; letter-spacing: 0.06em; font-size: 13.5px; min-width: 58px; }
  #lab-wege .lab-w.aktiv { background: rgba(192, 133, 82, 0.12); }
  #lab-gestalten { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 20px 10px max(20px, env(safe-area-inset-left, 0px)); }
  #lab-gestalten button { height: 32px; padding: 0 10px; border: 1px solid var(--linie); border-radius: 16px; background: transparent; color: #d9ceb6; font-family: var(--schrift); font-size: 14.5px; }
  .lab-wegleiste { position: fixed; z-index: 21; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 62px); transform: translateX(-50%); display: flex; align-items: center; gap: 4px;
    max-width: calc(100vw - 24px); padding: 4px 6px; background: var(--leiste); border: 1px solid var(--linie); border-radius: 18px; opacity: 0; pointer-events: none; transition: opacity 0.25s; }
  body.ui .lab-wegleiste.an { opacity: 1; pointer-events: auto; }
  .lab-wegleiste span { font-size: 14px; color: var(--pergament); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 6px; min-width: 0; }
  .lab-wegleiste button { flex: none; width: 32px; height: 28px; border: 0; background: transparent; color: var(--gedaempft); font-size: 18px; padding: 0; }
  .lab-erk { position: fixed; inset: 0; z-index: 42; background: var(--nacht); display: flex; flex-direction: column; padding-top: env(safe-area-inset-top, 0px); }
  .lab-erk .inhalt-kopf { flex: none; }
  .lab-erk-liste { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 4px max(18px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 24px) max(18px, env(safe-area-inset-left, 0px)); }
  .lab-e-teil { display: flex; height: auto; justify-content: flex-start; align-items: flex-start; gap: 12px; width: 100%; text-align: left; border: 0; border-top: 1px solid var(--linie); background: transparent; color: var(--pergament); padding: 14px 0; font-family: var(--schrift); }
  .lab-e-teil.e2 { padding-left: 14px; border-top-color: rgba(230, 220, 198, 0.07); padding-top: 10px; padding-bottom: 10px; }
  .lab-e-teil .bild { flex: none; width: 58px; height: 58px; border-radius: 3px; overflow: hidden; background: var(--glut); }
  .lab-e-teil .bild img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .lab-e-teil .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .lab-e-teil .t { font-size: 17px; line-height: 1.3; }
  .lab-e-teil.e1 .t { font-variant: small-caps; letter-spacing: 0.04em; font-size: 17.5px; }
  .lab-e-teil .k { font-size: 15px; line-height: 1.45; color: #d4c8b0; }
  .lab-e-teil .r { font-size: 15px; line-height: 1.4; font-style: italic; color: var(--rost); }
  .lab-e-teil.lab-zeit { background: radial-gradient(ellipse at 20% 50%, rgba(192, 133, 82, 0.10), transparent 70%); }
  .lab-e-kopf { padding: 6px 0 14px; display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
  .lab-e-kopf .u { font-style: italic; color: var(--gedaempft); font-size: 15.5px; }
  .lab-beob { position: fixed; z-index: 38; left: 8px; right: 8px; top: calc(env(safe-area-inset-top, 0px) + 6px); padding: 6px 10px 8px; background: rgba(20, 19, 17, 0.88);
    border: 1px solid var(--linie); border-radius: 6px; font-size: 13px; line-height: 1.4; color: var(--pergament); font-variant-numeric: tabular-nums; }
  body.ui .lab-beob { top: calc(env(safe-area-inset-top, 0px) + 104px); }
  .lab-beob .reihe2 { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; align-items: center; }
  .lab-beob button { height: 28px; padding: 0 8px; border: 1px solid var(--linie); border-radius: 4px; background: transparent; color: var(--pergament); font-family: var(--schrift); font-size: 13.5px; }
  .lab-beob .grau { color: var(--gedaempft); }
  #lab-einst .reihe { flex-wrap: wrap; }
  #lab-einst .reihe > span { flex: 1; min-width: 0; }
  #lab-einst .lab-zwei { display: flex; gap: 6px; }
  `;
  document.head.appendChild(css);

  // ---------- Angebotskarte ----------
  const karte = el('div', 'lab-angebot'); karte.hidden = true;
  const kBild = el('button', 'lab-a-bild'); const kImg = el('img'); kImg.alt = ''; kBild.appendChild(kImg);
  const kText = el('div', 'lab-a-text'), kTitel = el('div', 'lab-a-titel'), kZeile = el('div', 'lab-a-zeile'), kKnoepfe = el('div', 'lab-a-knoepfe');
  const kZu = el('button', 'lab-a-zu', '×'); kZu.setAttribute('aria-label', 'Schließen');
  kText.append(kTitel, kZeile, kKnoepfe); karte.append(kBild, kText, kZu); document.body.appendChild(karte);
  let kZeit = null, kAktuell = null, letztesAngebot = null;
  function angebotWeg(grund) {
    if (karte.hidden) return;
    clearTimeout(kZeit);
    if (kAktuell && grund) notiere('angebot-' + grund, { angebot: kAktuell.art });
    kAktuell = null;
    karte.classList.remove('auf');
    setTimeout(() => { if (!karte.classList.contains('auf')) karte.hidden = true; }, 650);
  }
  function zeigeAngebot(o) {
    clearTimeout(kZeit);
    kAktuell = o;
    kTitel.textContent = o.titel || ''; kTitel.hidden = !o.titel;
    kZeile.textContent = o.zeile || ''; kZeile.hidden = !o.zeile;
    kKnoepfe.textContent = '';
    for (const k of o.knoepfe || []) {
      if (!k) continue;
      const b = el('button', '', k.text);
      b.addEventListener('click', () => { notiere('angebot-angenommen', { angebot: o.art, wahl: k.text }); kAktuell = null; angebotWeg(); k.f(); });
      kKnoepfe.appendChild(b);
    }
    kKnoepfe.hidden = !kKnoepfe.children.length;
    kBild.hidden = !o.bild;
    kImg.removeAttribute('src');
    if (o.bild) bildUrl('bilder/klein/' + o.bild + '.webp').then((u) => { if (kAktuell === o) kImg.src = u; }).catch(() => {});
    kBild.onclick = o.bild ? () => { notiere('angebot-angenommen', { angebot: o.art, wahl: 'Bild' }); kAktuell = null; angebotWeg(); L.betrachter(o.bild, o.bildSeite); } : null;
    karte.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => karte.classList.add('auf')));
    kZeit = setTimeout(() => angebotWeg('verstrichen'), o.dauer || 14000);
    letztesAngebot = { art: o.art, z: Date.now(), bewertet: false };
    notiere('angebot', { angebot: o.art, titel: o.titel || '', zeile: o.zeile || '' });
    beobZeigen();
  }
  kZu.addEventListener('click', () => angebotWeg('abgelehnt'));
  karte.addEventListener('pointerdown', () => clearTimeout(kZeit));

  // ---------- Ruhe am guten Ende ----------
  const ruhe = el('div', 'lab-ruhe'); document.body.appendChild(ruhe);
  ruhe.addEventListener('transitionend', () => { if (!ruhe.classList.contains('auf')) ruhe.style.pointerEvents = 'none'; });
  function ruheAuf() { ruhe.style.pointerEvents = 'auto'; ruhe.classList.add('auf'); ruhe.onclick = () => { ruhe.classList.remove('auf'); }; }

  // ---------- Wege ----------
  const KURZ = { reise: 'Reise über die Karte', sagen: 'Von Sage zu Sage' };
  function stationen(id) {
    const [art, n] = id.split(':');
    if (art === 'frage') {
      const f = LD.fragen[+n];
      return f ? f.stationen.map((t) => suche(t)).filter(Boolean).map((a) => ({ s: a.s, ende: a.ende, titel: a.titel })) : [];
    }
    if (art === 'gestalt') {
      const b = M.begriffe[+n];
      if (!b || !b.s) return [];
      const von = buchStart(), bis = buchEnde();
      const seiten = (b.s[L.A.dir] || []).map((i) => i + 1).filter((p) => p >= von && p <= bis).sort((x, y) => x - y);
      const r = [];
      for (const p of seiten) {
        const letzte = r[r.length - 1];
        if (letzte && p <= letzte.ende + 1) letzte.ende = p;
        else r.push({ s: p, ende: p });
      }
      return r.map((x) => ({ s: x.s, ende: x.ende, titel: tiefster(x.s).titel }));
    }
    if (art === 'reise') {
      const punkte = [], gesehen = new Set();
      for (const [u, v, , b] of M.karte || []) if (!gesehen.has(b) && M.begriffe[b]) { gesehen.add(b); punkte.push({ u, v, b }); }
      if (!punkte.length) return [];
      let jetzt = punkte.reduce((a, p) => (p.u + p.v < a.u + a.v ? p : a));
      const rest = punkte.filter((p) => p !== jetzt), folge = [jetzt];
      while (rest.length) {
        let k = 0, best = Infinity;
        rest.forEach((p, j) => { const d = Math.hypot(p.u - jetzt.u, p.v - jetzt.v); if (d < best) { best = d; k = j; } });
        jetzt = rest.splice(k, 1)[0]; folge.push(jetzt);
      }
      return folge.map((p) => {
        const b = M.begriffe[p.b], e = b.e && b.e[L.A.dir];
        const a = e != null ? (abschnittBei(e + 1, 2) || tiefster(e + 1)) : null;
        return a ? { s: a.s, ende: a.ende, titel: b.n } : null;
      }).filter(Boolean);
    }
    if (art === 'sagen') return abschnitte().filter(istSage).map((a) => ({ s: a.s, ende: a.ende, titel: a.titel }));
    return [];
  }
  function wegTitel(id) {
    const [art, n] = id.split(':');
    if (art === 'frage') return LD.fragen[+n].frage;
    if (art === 'gestalt') return M.begriffe[+n].n;
    return KURZ[art] || id;
  }
  let weg = hole('labor-weg', null);
  const leiste = el('div', 'lab-wegleiste');
  const lZurueck = el('button', '', '‹'), lText = el('span'), lVor = el('button', '', '›'), lAus = el('button', '', '×');
  lZurueck.setAttribute('aria-label', 'Vorige Station'); lVor.setAttribute('aria-label', 'Nächste Station'); lAus.setAttribute('aria-label', 'Weg beenden');
  leiste.append(lZurueck, lText, lVor, lAus); document.body.appendChild(leiste);
  function stationGehen(k) {
    const st = stationen(weg.id);
    if (!st[k]) return;
    weg.i = k; merke('labor-weg', weg);
    notiere('weg-station', { weg: weg.id, station: k });
    L.gehe(st[k].s - 1);
    leisteZeigen();
  }
  lZurueck.addEventListener('click', () => weg && stationGehen(Math.max(0, weg.i - 1)));
  lVor.addEventListener('click', () => weg && stationGehen(weg.i + 1));
  lAus.addEventListener('click', () => wegEnde());
  function leisteZeigen() {
    const an = !!(weg && S.wege);
    leiste.classList.toggle('an', an);
    if (!an) return;
    const st = stationen(weg.id);
    lText.textContent = wegTitel(weg.id) + ' · ' + (weg.i + 1) + ' von ' + st.length;
  }
  function wegStart(id) {
    weg = { id, i: 0 }; merke('labor-weg', weg);
    notiere('weg-start', { weg: id });
    wegeBauen();
    const st = stationen(id);
    if (st.length) L.gehe(st[0].s - 1);
    leisteZeigen();
  }
  function wegEnde() {
    if (!weg) return;
    notiere('weg-ende', { weg: weg.id, station: weg.i });
    weg = null; merke('labor-weg', null);
    leisteZeigen(); wegeBauen(); angebotWeg();
  }
  function wegNachSeite(seite) {
    if (!weg || !S.wege) return;
    const st = stationen(weg.id);
    const k = st.findIndex((x) => seite >= x.s && seite <= x.ende);
    if (k >= 0 && k !== weg.i) { weg.i = k; merke('labor-weg', weg); }
    leisteZeigen();
    const sicht = L.sichtbar().map((i) => i + 1);
    if (k >= 0 && sicht.includes(st[k].ende)) {
      if (k < st.length - 1) zeigeAngebot({ art: 'weg', titel: st[k + 1].titel, zeile: wegTitel(weg.id), knoepfe: [{ text: 'Weiter auf dem Weg', f: () => stationGehen(k + 1) }], dauer: 20000 });
      else zeigeAngebot({ art: 'weg-ziel', titel: 'Das Ende des Weges', zeile: wegTitel(weg.id), knoepfe: [{ text: 'Weg beenden', f: wegEnde }], dauer: 20000 });
    }
  }
  // Wege im Inhaltsverzeichnis
  const wegeBox = el('div'); wegeBox.id = 'lab-wege';
  $('verzeichnis').insertBefore(wegeBox, $('lz-liste'));
  let gestaltenAuf_ = false;
  function wegeBauen() {
    wegeBox.textContent = '';
    if (!S.wege && !S.erkundung) return;
    wegeBox.appendChild(el('div', 'rubrik', 'Wege'));
    const zt = zeitTreffer();
    const knopf = (z, t, f, aktiv) => { const b = el('button', 'lab-w' + (aktiv ? ' aktiv' : '')); b.append(el('span', 'z', z), el('span', 't', t)); b.addEventListener('click', f); wegeBox.appendChild(b); return b; };
    if (S.erkundung) {
      const kap = kapitel(aktSeite());
      if (kap && kap.s >= buchStart() && kap.s <= buchEnde()) knopf('Erkunden', kap.titel, () => { L.schliesseInhalt(); erkunden(kap); });
    }
    if (!S.wege) return;
    const fragen = LD.fragen.map((f, n) => ({ f, n, zeit: f.stationen.some((t) => zt.has(t)) })).sort((a, b) => b.zeit - a.zeit);
    for (const { f, n } of fragen) knopf('Frage', f.frage, () => wegStart('frage:' + n), weg && weg.id === 'frage:' + n);
    knopf('Reise', KURZ.reise, () => wegStart('reise'), weg && weg.id === 'reise');
    knopf('Sagen', KURZ.sagen, () => wegStart('sagen'), weg && weg.id === 'sagen');
    const auf = knopf('Gestalt', 'Einer Gestalt folgen …', () => { gestaltenAuf_ = !gestaltenAuf_; box.hidden = !gestaltenAuf_; });
    auf.setAttribute('aria-expanded', String(gestaltenAuf_));
    const box = el('div'); box.id = 'lab-gestalten'; box.hidden = !gestaltenAuf_;
    const g = M.begriffe.map((b, i) => ({ b, i })).filter((x) => x.b.k === 'Gestalt').sort((a, b) => zt.has(b.b.n) - zt.has(a.b.n));
    for (const { b, i } of g) { const c = el('button', '', b.n); c.addEventListener('click', () => wegStart('gestalt:' + i)); box.appendChild(c); }
    wegeBox.appendChild(box);
    if (weg) knopf('', 'Weg beenden', wegEnde);
  }
  new MutationObserver(() => { if (body.classList.contains('toc')) wegeBauen(); }).observe(body, { attributes: true, attributeFilter: ['class'] });
  // Knopf im Kopf des Inhaltsverzeichnisses: springt zu den Wegen
  const wegeKnopf = el('button'); wegeKnopf.setAttribute('aria-label', 'Wege durch das Buch');
  wegeKnopf.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 20c0-4 4-4 7-6s5-3 5-7"/><circle cx="17" cy="5" r="1.6"/><circle cx="5" cy="20" r="1.2"/></svg><span class="knopftext">Wege</span>';
  wegeKnopf.addEventListener('click', () => { $('verzeichnis').scrollTo({ top: 0, behavior: 'smooth' }); });
  $('knopf-galerie').parentNode.insertBefore(wegeKnopf, $('knopf-galerie'));

  // ---------- Erkundung ----------
  const erk = el('div', 'lab-erk'); erk.hidden = true;
  const erkKopf = el('div', 'inhalt-kopf'); const erkH = el('h2', '', 'Erkundung');
  const erkZu = el('button'); erkZu.setAttribute('aria-label', 'Schließen');
  erkZu.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  erkKopf.append(erkH, erkZu);
  const erkListe = el('div', 'lab-erk-liste');
  erk.append(erkKopf, erkListe); document.body.appendChild(erk);
  const erkundet = new Set(hole('labor-erkundet', []));
  function erkunden(kap) {
    if (!kap) return;
    erkundet.add(kap.titel); merke('labor-erkundet', [...erkundet]);
    notiere('erkundung', { kapitel: kap.titel });
    erkListe.textContent = '';
    const zt = zeitTreffer();
    const kopf = el('div', 'lab-e-kopf');
    kopf.append(el('div', 't', kap.titel));
    kopf.firstChild.style.cssText = 'font-size:22px;line-height:1.25';
    const n2 = abschnitte().filter((a) => a.e === 2 && a.s >= kap.s && a.s <= kap.ende).length;
    kopf.append(el('div', 'u', 'Ein Gang durch das Kapitel' + (n2 ? ', ' + n2 + (istSage(abschnitte().find((a) => a.e === 2 && a.s >= kap.s)) ? ' Erzählungen' : ' Gestalten und Orte') : '')));
    const lesen = el('button', 'lab-knopf', 'Kapitel von vorn lesen');
    lesen.addEventListener('click', () => { erkZu.click(); notiere('erkundung-lesen', { kapitel: kap.titel }); L.gehe(kap.s - 1); });
    kopf.append(lesen);
    erkListe.appendChild(kopf);
    const teile = abschnitte().filter((a) => a.e >= 1 && a.s >= kap.s && a.s <= kap.ende);
    for (const a of teile) {
      const b = el('button', 'lab-e-teil e' + a.e + (zt.has(a.titel) ? ' lab-zeit' : ''));
      const bild = bilderIn(a.s, a.e === 1 && teile.some((x) => x.e === 2 && x.s >= a.s && x.s <= a.ende) ? Math.min(a.ende, (teile.find((x) => x.e === 2 && x.s > a.s) || a).s - 1) : a.ende)[0];
      if (bild) {
        const f = el('div', 'bild'), im = el('img'); im.alt = ''; im.loading = 'lazy';
        bildUrl('bilder/klein/' + bild.q + '.webp').then((u) => { im.src = u; }).catch(() => {});
        f.appendChild(im); b.appendChild(f);
      }
      const tx = el('div', 'txt');
      tx.appendChild(el('div', 't', a.titel.replace(/^\d+\.\d+ /, '')));
      const kern = LD.kern[a.titel] || (a.e === 2 && !istSage(a) ? LD.gestalt[a.titel] : null);
      if (kern) tx.appendChild(el('div', 'k', kern));
      if (LD.raetsel[a.titel]) tx.appendChild(el('div', 'r', LD.raetsel[a.titel]));
      b.appendChild(tx);
      b.addEventListener('click', () => { notiere('erkundung-sprung', { ziel: a.titel }); erkZu.click(); L.gehe(a.s - 1); });
      erkListe.appendChild(b);
    }
    erk.hidden = false; erkListe.scrollTop = 0;
    L.ui(false);
  }
  erkZu.addEventListener('click', () => { erk.hidden = true; });
  const erkundungAngeboten = new Set();
  function erkundungNachSeite(seite) {
    if (!S.erkundung) return;
    const kap = kapitel(seite);
    if (!kap || kap.s < buchStart() || kap.s > buchEnde() || seite > kap.s + 1) return;
    if (erkundet.has(kap.titel) || erkundungAngeboten.has(kap.titel)) return;
    if (!abschnitte().some((a) => a.e >= 1 && a.s > kap.s && a.s <= kap.ende)) return;
    erkundungAngeboten.add(kap.titel);
    const bild = bilderIn(kap.s, kap.ende)[0];
    zeigeAngebot({ art: 'erkundung', titel: kap.titel, bild: bild && bild.q, bildSeite: bild && bild.seite, knoepfe: [{ text: 'Erkunden', f: () => erkunden(kap) }], dauer: 16000 });
  }

  // ---------- Lesespur und Zustände ----------
  const spur = [];
  let besuch = null, aktDir = L.A.dir, pauseSeit = null;
  const sitzung = { start: Date.now(), pause: 0 };
  function besuchBeginnen() {
    const s = L.sichtbar();
    const w = s.reduce((a, i) => a + L.wortzahl(i), 0);
    besuch = { pos: L.pos, seite: s[s.length - 1] + 1, seiten: s, t0: Date.now(), w, sek: w / L.wpm * 60 };
  }
  function besuchAbschliessen() {
    if (!besuch || besuch.seite < buchStart()) return;
    const dauer = (Date.now() - besuch.t0) / 1000, schritt = L.pos - besuch.pos;
    const quote = besuch.sek >= 6 ? dauer / besuch.sek : null;
    spur.push({ seite: besuch.seite, dauer, quote, schritt, t: Date.now() });
    if (spur.length > 300) spur.shift();
    if (quote != null && quote >= 0.4) begegnungMerken(besuch.seiten);
    notiere('seite-gelesen', { von: besuch.seite, dauer: Math.round(dauer), quote: quote == null ? null : Math.round(quote * 100) / 100, schritt });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { pauseSeit = Date.now(); return; }
    if (!pauseSeit) return;
    const d = Date.now() - pauseSeit; pauseSeit = null;
    if (besuch) besuch.t0 += d;
    if (d > 30 * 60000) neueSitzung(); else sitzung.pause += d;
  });
  function neueSitzung() {
    spur.length = 0; sitzung.start = Date.now(); sitzung.pause = 0;
    notiere('sitzung', { neu: true });
    setTimeout(fadenZeigen, 2500);
  }
  function zustand() {
    const k = empf();
    const min = (Date.now() - sitzung.start - sitzung.pause) / 60000;
    const vor = spur.filter((v) => v.quote != null && v.schritt === 1);
    const q = vor.slice(-6).map((v) => v.quote);
    const q3 = q.length ? median(q.slice(-3)) : null;
    const letzte = spur.slice(-6), zurueck = letzte.filter((v) => v.schritt === -1).length;
    const lauf = besuch && besuch.sek >= 6 ? (Date.now() - besuch.t0) / 1000 / besuch.sek : 0;
    const h = zeitJetzt().getHours(), spaet = h >= 23 || h < 5;
    const muedeAb = (spaet ? 10 : 20) / k;
    const hastig = spur.filter((v) => Date.now() - v.t < 25000 && Math.abs(v.schritt) === 1).length;
    const info = { min, q3, lauf, zurueck, hastig };
    if ((q.length >= 4 && q.slice(-4).filter((x) => x < 0.3 * k).length >= 3) || hastig >= Math.round(6 / k)) return Object.assign({ art: 'unruhe' }, info);
    if (min >= muedeAb && ((q.length >= 3 && q3 >= 1.6 / k) || zurueck >= 2 || lauf >= 3 / k)) return Object.assign({ art: 'ermuedung' }, info);
    const zuletzt = spur[spur.length - 1];
    if ((zuletzt && zuletzt.schritt === -1 && Date.now() - zuletzt.t < 60000) || lauf >= 2.2 / k) return Object.assign({ art: 'holperer' }, info);
    if (q.length >= 2) return Object.assign({ art: 'fluss' }, info);
    return Object.assign({ art: '?' }, info);
  }
  const NAMEN = { fluss: 'im Fluss', holperer: 'Holperer', ermuedung: 'Ermüdung', unruhe: 'Unruhe', '?': 'noch unklar' };
  function frei() {
    return L.offen && !L.uebersicht && !body.classList.contains('toc') && !body.classList.contains('bogen') && $('betrachter').hidden && $('galerie').hidden && erk.hidden && $('wortkarte').hidden && karte.hidden;
  }
  const zuletztArt = {};
  let letzteZeit = 0, zustandVorher = '?';
  function pruefen() {
    aktZustand = zustand();
    if (aktZustand.art !== zustandVorher) { notiere('zustand', { neu: aktZustand.art, vorher: zustandVorher, q3: aktZustand.q3 && Math.round(aktZustand.q3 * 100) / 100, min: Math.round(aktZustand.min) }); zustandVorher = aktZustand.art; }
    beobZeigen();
    if (!S.zustaende || !frei()) return;
    const art = aktZustand.art;
    if (!['holperer', 'ermuedung', 'unruhe'].includes(art)) return;
    const t = Date.now();
    if (t - letzteZeit < 5 * 60000 || (zuletztArt[art] && t - zuletztArt[art] < 12 * 60000)) return;
    letzteZeit = t; zuletztArt[art] = t;
    ANGEBOTE[art]();
  }
  function passendesBild(seite) {
    const a = tiefster(seite);
    if (!a) return null;
    const b = bilderIn(a.s, a.ende);
    if (!b.length) return null;
    return b.reduce((x, y) => (Math.abs(y.seite + 1 - seite) < Math.abs(x.seite + 1 - seite) ? y : x));
  }
  function passendeSage(seite) {
    const sagen = abschnitte().filter(istSage);
    if (!sagen.length) return null;
    const zt = zeitTreffer();
    let wahl = sagen.find((a) => zt.has(a.titel) && !gelesen(a.s));
    if (!wahl) {
      const g = L.sichtbar().flatMap(gestaltenAuf);
      for (const b of g) {
        const seiten = (M.begriffe[b].s[L.A.dir] || []).map((i) => i + 1);
        wahl = sagen.find((a) => !gelesen(a.s) && seiten.some((p) => p >= a.s && p <= a.ende));
        if (wahl) break;
      }
    }
    if (!wahl) {
      const raum = klangRaum(seite);
      const gruppe = raum && abschnitte().find((a) => a.e === 1 && LD.klang[a.titel] === raum && a.s >= sagenlese().s && a.s <= sagenlese().ende);
      if (gruppe) wahl = sagen.find((a) => a.s >= gruppe.s && a.s <= gruppe.ende && !gelesen(a.s));
    }
    if (!wahl) { const offen = sagen.filter((a) => !gelesen(a.s)); wahl = (offen.length ? offen : sagen)[Math.floor(Math.random() * (offen.length || sagen.length))]; }
    if (!wahl || (seite >= wahl.s && seite <= wahl.ende)) return null;
    const bild = bilderIn(wahl.s, wahl.ende)[0];
    return Object.assign({ bild }, wahl);
  }
  let endeZiel = null;
  const ANGEBOTE = {
    holperer() {
      // eine offene Frage oder ein Bild zieht zurück in den Text
      const s = aktSeite(), a = tiefster(s), a1 = abschnittBei(s, 1);
      const frage = (a && LD.raetsel[a.titel]) || (a1 && LD.raetsel[a1.titel]);
      const bild = passendesBild(s);
      if (!frage && !bild) return;
      zeigeAngebot({ art: 'holperer', bild: bild && bild.q, bildSeite: bild && bild.seite, titel: frage ? null : bild.u, zeile: frage || null });
    },
    ermuedung() {
      // zur nächsten starken Stelle führen
      const s = aktSeite();
      const weit = L.modus === 'handy' ? 8 : 10;
      const kand = abschnitte().filter((a) => a.e >= 1 && a.ende >= s && a.ende - s <= weit && a.s <= a.ende).sort((x, y) => x.ende - y.ende || y.e - x.e);
      const a = kand[0];
      if (!a) { notiere('kein-gutes-ende', {}); return; }
      const nach = abschnitte().find((x) => x.s > a.ende && x.e >= 1);
      endeZiel = { seite: a.ende, titel: a.titel, nach: nach && nach.titel, nachS: nach && nach.s };
      const d = L.modus === 'handy' ? a.ende - s : Math.ceil((a.ende - s) / 2);
      const name = a.titel.replace(/^\d+\.\d+ /, '');
      if (d <= 0) ruheZeigen();
      else zeigeAngebot({ art: 'ermuedung', titel: 'Noch ' + (d === 1 ? 'eine Seite' : d + ' Seiten') + ' bis zum Ende von „' + name + '“', zeile: 'Dort ruht das Buch gut.' });
    },
    unruhe() {
      // Szenenwechsel: eine Sage oder ein Gang durch das Kapitel
      const s = aktSeite(), sage = passendeSage(s), kap = kapitel(s);
      zeigeAngebot({ art: 'unruhe', bild: sage && sage.bild && sage.bild.q, bildSeite: sage && sage.bild && sage.bild.seite,
        titel: sage ? sage.titel : kap && kap.titel, zeile: sage ? 'Eine Sage' : null,
        knoepfe: [sage && { text: 'Zur Sage', f: () => L.gehe(sage.s - 1) }, kap && S.erkundung && { text: 'Kapitel erkunden', f: () => erkunden(kap) }] });
    },
  };
  function ruheZeigen() {
    if (!endeZiel) return;
    const z = endeZiel; endeZiel = null;
    const naechst = z.nach ? (LD.raetsel[z.nach] || LD.kern[z.nach] || LD.gestalt[z.nach] || null) : null;
    zeigeAngebot({ art: 'gutes-ende', titel: '„' + z.titel.replace(/^\d+\.\d+ /, '') + '“ ist zu Ende.', zeile: z.nach ? 'Beim nächsten Mal: ' + z.nach.replace(/^\d+\.\d+ /, '') : 'Ein guter Ort, um innezuhalten.',
      knoepfe: [{ text: 'Hier aufhören', f: () => { merke('labor-faden', { titel: z.nach, zeile: naechst, t: Date.now() }); ruheAuf(); } }, { text: 'Weiterlesen', f: () => {} }], dauer: 25000 });
  }
  function fadenZeigen() {
    const f = hole('labor-faden', null);
    if (!f || !f.titel || Date.now() - f.t < 10 * 60000) return;
    merke('labor-faden', null);
    zeigeAngebot({ art: 'faden', titel: 'Als Nächstes: ' + f.titel.replace(/^\d+\.\d+ /, ''), zeile: f.zeile, dauer: 12000 });
  }

  // ---------- Klang folgt dem Inhalt ----------
  function klangRaum(seite) {
    for (const e of [2, 1, 0]) { const a = abschnittBei(seite, e); if (a && LD.klang[a.titel]) return LD.klang[a.titel]; }
    return null;
  }
  let aktRaum = null;
  function klangAnpassen() {
    if (L.E.umgebung !== 'aus') { aktRaum = null; return; }
    const raum = S.klang ? klangRaum(aktSeite()) || 'aus' : 'aus';
    const K = L.K, laeuft = K.ctx && (raum === 'aus' || K._umgWechsel || (K._umg && K._umg.art === raum));
    if (raum === aktRaum && laeuft) return;
    if (raum !== aktRaum) notiere('klangraum', { raum });
    aktRaum = raum;
    L.K.umgebung(raum, 0.22);
  }
  L.an('einstellungen', () => { aktRaum = null; setTimeout(klangAnpassen, 30); });
  L.an('beruehrung', () => setTimeout(klangAnpassen, 80));

  // ---------- Wiederbegegnung ----------
  const begegnet = hole('labor-begegnet', {});
  let letzteWieder = 0;
  function begegnungMerken(seiten) {
    let neu = false;
    for (const i of seiten) for (const b of gestaltenAuf(i)) { begegnet[b] = { t: Date.now(), s: L.umrechnen(i + 1, L.modus, 'handy') }; neu = true; }
    if (neu) merke('labor-begegnet', begegnet);
  }
  function schimmerWeg() { for (let k = L.marken.length - 1; k >= 0; k--) if (L.marken[k].kl === 'lab-schimmer') L.marken.splice(k, 1); }
  function wiederPruefen() {
    schimmerWeg();
    if (!S.wieder) return;
    const test = S.wiederTage === '0';
    if (!test && Date.now() - letzteWieder < 8 * 60000) return;
    for (const i of L.sichtbar()) {
      const S_ = L.seiteInfo(L.A.dir, i);
      if (!S_ || !S_.v) continue;
      const handy = L.umrechnen(i + 1, L.modus, 'handy');
      for (const [wa, wb, b] of S_.v) {
        if (!M.begriffe[b] || M.begriffe[b].k !== 'Gestalt') continue;
        const g = begegnet[b];
        if (!g) continue;
        const fern = test ? Math.abs(handy - g.s) >= 30 : (Date.now() - g.t) / 86400000 >= parseFloat(S.wiederTage);
        if (!fern) continue;
        const m = { i, a: wa, b: wb, kl: 'lab-schimmer' };
        L.marken.push(m);
        // erst zeichnen, wenn kein Blatt mehr in Bewegung ist, dann nach dem Verglimmen wieder entfernen
        let n = 0;
        const zeichnen = () => {
          if (!L.marken.includes(m)) return;
          if (!L.ruhig && n++ < 40) { setTimeout(zeichnen, 100); return; }
          L.zeichne();
          setTimeout(() => { const k = L.marken.indexOf(m); if (k >= 0) L.marken.splice(k, 1); }, 5600);
        };
        setTimeout(zeichnen, 60);
        letzteWieder = Date.now();
        notiere('wiederbegegnung', { gestalt: M.begriffe[b].n, zuletztSeite: g.s, tage: Math.round((Date.now() - g.t) / 36e5) / 24 });
        g.t = Date.now(); g.s = handy; merke('labor-begegnet', begegnet);
        return;
      }
    }
  }

  // ---------- Nach jedem Blättern ----------
  function nachSeite() {
    if (L.A.dir !== aktDir) { aktDir = L.A.dir; besuch = null; }
    besuchAbschliessen();
    besuchBeginnen();
    const seite = aktSeite();
    if (kAktuell && !['gutes-ende', 'faden'].includes(kAktuell.art)) angebotWeg('weitergeblaettert');
    if (endeZiel && L.sichtbar().map((i) => i + 1).includes(endeZiel.seite)) ruheZeigen();
    wegNachSeite(seite);
    erkundungNachSeite(seite);
    klangAnpassen();
    wiederPruefen();
    pruefen();
  }
  L.an('seite', nachSeite);

  // ---------- Beobachtung ----------
  const beob = el('div', 'lab-beob'); beob.hidden = true;
  const bZeile = el('div'), bMeldung = el('div', 'reihe2'), bAngebot = el('div', 'reihe2');
  bMeldung.appendChild(el('span', 'grau', 'Ich bin gerade:'));
  for (const [k, t] of [['fluss', 'im Fluss'], ['holperer', 'holprig'], ['ermuedung', 'müde'], ['unruhe', 'unruhig']]) {
    const b = el('button', '', t);
    b.addEventListener('click', () => { notiere('meldung', { gemeldet: k, erkannt: aktZustand.art }); L.melde('Notiert: ' + t, 1200); });
    bMeldung.appendChild(b);
  }
  beob.append(bZeile, bMeldung, bAngebot); document.body.appendChild(beob);
  function beobZeigen() {
    beob.hidden = !S.beobachten;
    if (beob.hidden) return;
    const z = aktZustand, lauf = besuch && besuch.sek >= 6 ? (Date.now() - besuch.t0) / 1000 / besuch.sek : null;
    const zt = [...zeitTreffer()];
    bZeile.textContent = 'Zustand: ' + NAMEN[z.art] + ' · Tempo ' + (z.q3 != null ? runde(z.q3) + '×' : '–') + ' · diese Seite ' + (lauf != null ? runde(lauf) + '×' : '–') +
      ' · ' + Math.round(z.min || 0) + ' Min. · zurück ' + (z.zurueck || 0) + ' · Klang ' + (aktRaum || '–') + (zt.length ? ' · Zeit: ' + zt.join(', ') : '');
    bAngebot.textContent = '';
    if (letztesAngebot && !letztesAngebot.bewertet && Date.now() - letztesAngebot.z < 5 * 60000) {
      bAngebot.appendChild(el('span', 'grau', 'Angebot „' + letztesAngebot.art + '“:'));
      for (const [w, t] of [[1, 'passte'], [0, 'passte nicht']]) {
        const b = el('button', '', t);
        b.addEventListener('click', () => { notiere('bewertung', { angebot: letztesAngebot.art, passte: !!w }); letztesAngebot.bewertet = true; beobZeigen(); });
        bAngebot.appendChild(b);
      }
    }
  }
  setInterval(() => { if (!document.hidden) pruefen(); }, 4000);

  // ---------- Laborschalter in den Einstellungen ----------
  const einst = el('div'); einst.id = 'lab-einst';
  einst.appendChild(el('h2', '', 'Labor'));
  const reihe = (titel, inhalt) => { const r = el('div', 'reihe'); r.append(el('span', '', titel), inhalt); einst.appendChild(r); return r; };
  const schalter = (k) => { const b = el('button', 'schalter'); b.dataset.l = k; b.setAttribute('aria-label', k); b.addEventListener('click', () => { S[k] = !S[k]; sichern(); laborZeigen(); notiere('schalter', { [k]: S[k] }); umsetzen(k); }); return b; };
  const wahl = (k, opts) => { const w = el('div', 'wahl'); w.dataset.lw = k; for (const [v, t] of opts) { const b = el('button', '', t); b.dataset.w = v; b.addEventListener('click', () => { S[k] = v; sichern(); laborZeigen(); notiere('schalter', { [k]: v }); umsetzen(k); }); w.appendChild(b); } return w; };
  for (const [k, t] of VERSUCHE) reihe(t, schalter(k));
  reihe('Beobachtung einblenden', schalter('beobachten'));
  reihe('Empfindlichkeit', wahl('empfindlich', [['0.75', 'Weniger'], ['1', 'Mittel'], ['1.4', 'Mehr']]));
  reihe('Wiederbegegnung nach', wahl('wiederTage', [['0', '30 Seiten'], ['2', '2 Tagen'], ['7', '7 Tagen']]));
  reihe('Uhrzeit', wahl('simZeit', [['', 'Echt'], ['mittag', 'Sommermittag'], ['nacht', 'Herbstnacht'], ['zwoelften', 'Zwölften']]));
  const probe = el('div', 'wahl');
  for (const [k, t] of [['holperer', 'Holperer'], ['ermuedung', 'Müde'], ['unruhe', 'Unruhe']]) {
    const b = el('button', '', t);
    b.addEventListener('click', () => { L.body.classList.remove('bogen'); notiere('probe', { angebot: k }); setTimeout(() => ANGEBOTE[k](), 350); });
    probe.appendChild(b);
  }
  reihe('Angebot vorführen', probe);
  const zwei = el('div', 'lab-zwei');
  const teilenK = el('button', 'schalter text', 'Teilen'), leerenK = el('button', 'schalter text', 'Leeren');
  zwei.append(teilenK, leerenK);
  const protReihe = reihe('Protokoll', zwei);
  $('einstellungen').appendChild(einst);
  function laborZeigen() {
    einst.querySelectorAll('.schalter[data-l]').forEach((b) => b.setAttribute('aria-pressed', S[b.dataset.l] ? 'true' : 'false'));
    einst.querySelectorAll('.wahl[data-lw]').forEach((w) => w.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(S[w.dataset.lw]) === b.dataset.w ? 'true' : 'false')));
    protReihe.firstChild.textContent = 'Protokoll · ' + prot.length + ' Einträge';
  }
  function umsetzen(k) {
    if (k === 'klang') { aktRaum = null; klangAnpassen(); }
    if (k === 'wege') { leisteZeigen(); wegeBauen(); }
    if (k === 'wieder' && !S.wieder) { schimmerWeg(); L.zeichne(); }
    beobZeigen();
  }
  new MutationObserver(() => { if (body.classList.contains('bogen')) laborZeigen(); }).observe(body, { attributes: true, attributeFilter: ['class'] });
  teilenK.addEventListener('click', async () => {
    const daten = JSON.stringify({ stand: new Date().toISOString(), geraet: navigator.userAgent, tempo: Math.round(L.wpm), schalter: S, eintraege: prot });
    notiere('protokoll-geteilt', { eintraege: prot.length });
    try {
      const datei = new File([daten], 'laborprotokoll.txt', { type: 'text/plain' });
      if (navigator.canShare && navigator.canShare({ files: [datei] })) { await navigator.share({ files: [datei], title: 'Laborprotokoll' }); return; }
      if (navigator.share) { await navigator.share({ title: 'Laborprotokoll', text: daten }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(daten); L.melde('Protokoll in die Zwischenablage kopiert', 1800); } catch (e) { L.melde('Teilen ging nicht', 1500); }
  });
  let leerenBereit = 0;
  leerenK.addEventListener('click', () => {
    if (Date.now() - leerenBereit > 3000) { leerenBereit = Date.now(); leerenK.textContent = 'Wirklich?'; setTimeout(() => { leerenK.textContent = 'Leeren'; }, 3000); return; }
    prot = []; merke('labor-protokoll', prot); leerenK.textContent = 'Leeren'; leerenBereit = 0; laborZeigen(); L.melde('Protokoll geleert', 1200);
  });

  // ---------- Start ----------
  window.LABOR_INTERN = { zustand, ANGEBOTE, stationen, erkunden, abschnitte, spur, sitzung, S, zeitTreffer, passendeSage };
  notiere('sitzung', { neu: true, modus: L.modus, tempo: Math.round(L.wpm) });
  besuchBeginnen();
  leisteZeigen();
  laborZeigen();
  beobZeigen();
  setTimeout(fadenZeigen, 4000);
})();
