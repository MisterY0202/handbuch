// Tor der geschützten Web-Ausgabe: Passwort, Entschlüsselung, Offline-Speicher, Start des Lesers.
// Erwartet window.INHALT aus inhalt.js: schloss {salz, runden, pruef}, datei {logisch: physisch}, liste, groesse.
(() => {
  'use strict';
  const IN = window.INHALT;
  const SPEICHER = 'handbuch-schluessel';
  const $ = (id) => document.getElementById(id);
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const zuB64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b)));
  const vollbild = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const apple = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

  // ---------- Schlüssel ----------
  let schluessel = null;
  async function entschluessle(buf, k) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, k || schluessel, buf.slice(12));
  }
  async function pruefe(k) {
    try { const t = await entschluessle(b64(IN.schloss.pruef).buffer, k); return new TextDecoder().decode(t) === 'Handbuch'; } catch (e) { return false; }
  }
  async function ausPasswort(pw) {
    const roh = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(IN.schloss.salz), iterations: IN.schloss.runden, hash: 'SHA-256' },
      roh, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
  }
  async function gespeichert() {
    let s = null;
    try { s = localStorage.getItem(SPEICHER); } catch (e) {}
    if (!s) return null;
    try { const k = await crypto.subtle.importKey('raw', b64(s), 'AES-GCM', true, ['decrypt']); return (await pruefe(k)) ? k : null; } catch (e) { return null; }
  }

  // ---------- Dateien ----------
  const typ = (p) => p.endsWith('.webp') ? 'image/webp' : p.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';
  const physisch = (p) => IN.datei[p] || p;
  async function holen(p) {
    const r = await fetch(p);
    if (!r.ok) throw new Error(p);
    return entschluessle(await r.arrayBuffer());
  }
  const urls = new Map();
  window.SCHUTZ = {
    blob: async (p) => new Blob([await holen(physisch(p))], { type: typ(p) }),
    url(p) {
      if (!urls.has(p)) { const u = this.blob(p).then((b) => URL.createObjectURL(b)); u.catch(() => urls.delete(p)); urls.set(p, u); }
      return urls.get(p);
    },
    async skript(p) {
      const t = new TextDecoder().decode(await holen(physisch(p)));
      const s = document.createElement('script'); s.textContent = t; document.head.appendChild(s);
    },
  };

  // ---------- Start ----------
  const laden = (src) => new Promise((ok, f) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = f; document.body.appendChild(s); });
  async function starten() {
    $('tor').hidden = true;
    await SCHUTZ.skript('meta.js');
    for (const s of ['klang.js', 'blatt.js', 'leser.js']) await laden(s);
    for (const s of window.ZUSATZ || []) { if (s[0] === '#') await SCHUTZ.skript(s.slice(1)); else await laden(s); }
    offlineEinrichten();
    if (apple && !vollbild) hinweisZeigen();
  }

  // ---------- Tor ----------
  function torZeigen() {
    $('tor').hidden = false;
    $('tor-hinweis').hidden = !(apple && !vollbild);
    $('tor-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pw = $('tor-pw').value;
      if (!pw) return;
      $('tor-knopf').disabled = true; $('tor-fehler').hidden = true;
      const k = await ausPasswort(pw);
      if (await pruefe(k)) {
        schluessel = k;
        try { localStorage.setItem(SPEICHER, zuB64(await crypto.subtle.exportKey('raw', k))); } catch (err) {}
        $('tor-pw').blur();
        starten();
      } else {
        $('tor-fehler').hidden = false; $('tor-knopf').disabled = false; $('tor-pw').select();
      }
    });
  }
  function hinweisZeigen() {
    let n = 0;
    try { n = +sessionStorage.getItem('handbuch-hinweis') || 0; sessionStorage.setItem('handbuch-hinweis', n + 1); } catch (e) {}
    if (n) return;
    const h = $('vollbild-hinweis'); h.hidden = false;
    const weg = () => { h.hidden = true; };
    h.addEventListener('click', weg); setTimeout(weg, 9000);
  }

  // ---------- Offline ----------
  function offlineEinrichten() {
    if (!('caches' in window) || !('serviceWorker' in navigator)) return;
    const gruppe = $('gruppe-offline'), text = $('offline-text'), knopf = $('offline-knopf');
    gruppe.hidden = false;
    const mb = Math.round(IN.groesse / 1e6);
    const fehlend = async () => { const c = await caches.open('inhalt'); const da = new Set((await c.keys()).map((r) => r.url)); return IN.liste.filter((p) => !da.has(new URL(p, location.href).href)); };
    const zeigen = (f) => {
      if (!f.length) { text.textContent = 'Ganzes Buch ist auf dem Gerät'; knopf.hidden = true; }
      else { text.textContent = 'Ganzes Buch offline speichern, etwa ' + Math.max(1, Math.round(mb * f.length / IN.liste.length)) + ' MB'; knopf.hidden = false; }
    };
    fehlend().then(zeigen).catch(() => {});
    knopf.addEventListener('click', async () => {
      knopf.disabled = true;
      try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {}
      const f = await fehlend(), c = await caches.open('inhalt');
      let fertig = 0, fehler = 0;
      const schritt = () => { text.textContent = 'Wird gespeichert · ' + Math.floor(100 * fertig / f.length) + ' %'; };
      schritt();
      let i = 0;
      const arbeiter = async () => {
        while (i < f.length) {
          const p = f[i++];
          try { await c.add(p); } catch (e) { fehler++; }
          fertig++; schritt();
        }
      };
      await Promise.all([arbeiter(), arbeiter(), arbeiter(), arbeiter()]);
      knopf.disabled = false;
      if (fehler) { text.textContent = 'Unterbrochen, bitte noch einmal tippen'; knopf.textContent = 'Weiter'; }
      else zeigen(await fehlend());
    });
  }

  gespeichert().then((k) => { if (k) { schluessel = k; starten(); } else torZeigen(); });
})();
