/* Klang: Papiergeräusche, Buchöffnung, Lesebändchen und leise Umgebung – alles mit Web Audio erzeugt. */
(function () {
  'use strict';
  const zufall = (a, b) => a + Math.random() * (b - a);
  function poisson(l) { if (l <= 0) return 0; let n = 0, p = Math.exp(-l), s = p, u = Math.random(); while (u > s && n < 40) { n++; p *= l / n; s += p; } return n; }

  class Klang {
    constructor() {
      this.ctx = null;
      this.an = true;
      this.stumm = () => false;
      this.umgebungArt = 'aus';
      this.umgebungLaut = 0.5;
      this._umg = null;
      this._rascheln = null;
      this._st = new Map();
    }

    start(ctx) {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return true; }
      const AC = window.AudioContext || window.webkitAudioContext;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      if (!AC && !ctx) return false;
      try { this.ctx = ctx || new AC({ latencyHint: 'interactive' }); } catch (e) { return false; }
      const c = this.ctx;
      this.kompressor = c.createDynamicsCompressor();
      this.kompressor.threshold.value = -14;
      this.kompressor.ratio.value = 4;
      this.kompressor.attack.value = 0.003;
      this.kompressor.release.value = 0.12;
      this.kompressor.connect(c.destination);
      this.papierBus = c.createGain();
      this.papierBus.gain.value = 0.27;
      this.papierTon = c.createBiquadFilter(); this.papierTon.type = 'lowpass'; this.papierTon.frequency.value = 4200; this.papierTon.Q.value = 0.5;
      this.papierBus.connect(this.papierTon); this.papierTon.connect(this.kompressor);
      this.umgBus = c.createGain();
      this.umgBus.gain.value = 0;
      this.umgBus.connect(this.kompressor);
      this.weiss = this._weiss(2.5);
      this.papier = this._papier(3.2, 950, 0.0017);
      this.knister = this._papier(2.0, 2400, 0.0009);
      this.braun = this._braun(4);
      this.faser = this._faser(3.0, 340, 0.004, 0.016, 0.0016, 0.16);
      this.krinkel = this._faser(2.0, 70, 0.009, 0.028, 0.0025, 0.04);
      this.rosa = this._rosa(3.2);
      this.welle = this._welle(4.0, 16);
      return true;
    }
    pause() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
    weiter() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); }

    _weiss(sek) {
      const c = this.ctx, n = Math.floor(c.sampleRate * sek), b = c.createBuffer(2, n, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
      return b;
    }
    // Papierfaser: Rauschen mit dichten, kurz verklingenden Knacksern
    _papier(sek, rate, abkl) {
      const c = this.ctx, sr = c.sampleRate, n = Math.floor(sr * sek), b = c.createBuffer(2, n, sr);
      const k = Math.exp(-1 / (sr * abkl));
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        let env = 0, langsam = 0.5, ziel = 0.5, peak = 0;
        for (let i = 0; i < n; i++) {
          if (i % 2048 === 0) ziel = 0.25 + Math.random() * 0.75;
          langsam += (ziel - langsam) * 0.0006;
          if (Math.random() < (rate * langsam) / sr) env = Math.max(env, 0.25 + Math.random() * Math.random() * 1.4);
          env *= k;
          const v = (Math.random() * 2 - 1) * (0.07 + env);
          d[i] = v;
          peak = Math.max(peak, Math.abs(v));
        }
        for (let i = 0; i < n; i++) d[i] /= peak;
      }
      return b;
    }
    // weiches Papierrascheln: dicht überlappende Körner mit sanftem Anstieg und Abklingen
    _faser(sek, rate, tMin, tMax, anstieg, grund) {
      const c = this.ctx, sr = c.sampleRate, n = Math.floor(sr * sek), b = c.createBuffer(2, n, sr);
      const taus = [tMin, (tMin + tMax) / 2, tMax].map((t) => Math.exp(-1 / (sr * t)));
      const ka = Math.exp(-1 / (sr * anstieg));
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        const e1 = [0, 0, 0], e2 = [0, 0, 0];
        let langsam = 0.7, ziel = 0.7, peak = 0;
        for (let i = 0; i < n; i++) {
          if (i % 1500 === 0) ziel = 0.35 + Math.random() * 0.65;
          langsam += (ziel - langsam) * 0.0008;
          if (Math.random() < (rate * langsam) / sr) { const k = Math.floor(Math.random() * 3), a = Math.pow(Math.random(), 1.5) * 1.1 + 0.1; e1[k] += a; e2[k] += a; }
          let env = 0;
          for (let k = 0; k < 3; k++) { e1[k] *= taus[k]; e2[k] *= ka; env += e1[k] - e2[k]; }
          const v = (Math.random() * 2 - 1) * (grund * langsam + env);
          d[i] = v; peak = Math.max(peak, Math.abs(v));
        }
        for (let i = 0; i < n; i++) d[i] /= peak;
      }
      return b;
    }
    // Hauch: Schnipsel mit eigenem, weichem Anstieg
    _hauch(puffer, t, anstieg, dauer, gain, filter, pan, rate) {
      const c = this.ctx;
      const q = c.createBufferSource(); q.buffer = puffer; q.playbackRate.value = rate || 1;
      let k = q;
      for (const [typ, f, Q] of filter) { const bq = c.createBiquadFilter(); bq.type = typ; bq.frequency.value = f; if (Q) bq.Q.value = Q; k.connect(bq); k = bq; }
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + anstieg);
      g.gain.exponentialRampToValueAtTime(0.0001, t + anstieg + dauer);
      k.connect(g);
      if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan || 0)); g.connect(p); p.connect(this.papierBus); } else g.connect(this.papierBus);
      q.start(t, zufall(0, Math.max(0, puffer.duration - anstieg - dauer - 0.05)));
      q.stop(t + anstieg + dauer + 0.02);
    }
    // rosa Rauschen: weicher und runder als weißes
    _rosa(sek) {
      const c = this.ctx, n = Math.floor(c.sampleRate * sek), b = c.createBuffer(2, n, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, peak = 0;
        for (let i = 0; i < n; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          const v = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
          d[i] = v; peak = Math.max(peak, Math.abs(v));
        }
        for (let i = 0; i < n; i++) d[i] /= peak;
      }
      return b;
    }
    // langsame, glatte Schwankung: das Biegen des Blattes
    _welle(sek, hz) {
      const c = this.ctx, sr = c.sampleRate, n = Math.floor(sr * sek), b = c.createBuffer(1, n, sr);
      const d = b.getChannelData(0), schritt = Math.floor(sr / hz);
      let a = Math.random() * 2 - 1, z = Math.random() * 2 - 1;
      for (let i = 0; i < n; i++) {
        if (i % schritt === 0) { a = z; z = Math.random() * 2 - 1; }
        const u = (i % schritt) / schritt;
        d[i] = a + (z - a) * (0.5 - 0.5 * Math.cos(Math.PI * u));
      }
      return b;
    }
    _braun(sek) {
      const c = this.ctx, n = Math.floor(c.sampleRate * sek), b = c.createBuffer(2, n, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch); let x = 0, peak = 0;
        for (let i = 0; i < n; i++) { x = (x + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = x; peak = Math.max(peak, Math.abs(x)); }
        for (let i = 0; i < n; i++) d[i] /= peak;
      }
      return b;
    }

    _darf() { return this.an && this.ctx && !this.stumm(); }

    // kurzer Schnipsel aus einem Puffer durch ein Filter mit Hüllkurve
    _schnipsel(puffer, t, dauer, gain, filter, pan, rate) {
      const c = this.ctx;
      const q = c.createBufferSource();
      q.buffer = puffer;
      q.playbackRate.value = rate || 1;
      let kette = q;
      for (const [typ, f, Q] of filter) {
        const bq = c.createBiquadFilter(); bq.type = typ; bq.frequency.value = f; if (Q) bq.Q.value = Q;
        kette.connect(bq); kette = bq;
      }
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + Math.min(0.004, dauer * 0.2));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
      kette.connect(g);
      let ziel = g;
      if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); ziel = p; }
      ziel.connect(this.papierBus);
      q.start(t, zufall(0, puffer.duration - dauer - 0.05));
      q.stop(t + dauer + 0.02);
      return g;
    }

    griff(staerke, pan) {
      if (!this._darf()) return;
      const t = this.ctx.currentTime + 0.003, s = staerke == null ? 0.7 : staerke;
      this._schnipsel(this.knister, t, 0.07, 0.30 * s, [['bandpass', zufall(2600, 3800), 0.8]], pan);
      this._schnipsel(this.papier, t + 0.01, 0.11, 0.12 * s, [['highpass', 900], ['lowpass', 6500]], pan);
    }

    kipp(staerke, pan) {
      if (!this._darf()) return;
      const c = this.ctx, t = c.currentTime + 0.003, s = staerke == null ? 0.6 : staerke;
      const q = c.createBufferSource(); q.buffer = this.weiss;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
      lp.frequency.setValueAtTime(500, t); lp.frequency.exponentialRampToValueAtTime(2600, t + 0.16);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.10 * s, t + 0.07); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      q.connect(lp); lp.connect(g);
      if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan || 0; g.connect(p); p.connect(this.papierBus); } else g.connect(this.papierBus);
      q.start(t, zufall(0, 2)); q.stop(t + 0.25);
    }

    lande(staerke, pan, t0) {
      if (!this._darf()) return;
      const c = this.ctx, t = t0 || c.currentTime + 0.003, s = Math.max(0.15, Math.min(1, staerke == null ? 0.7 : staerke));
      this._schnipsel(this.weiss, t, 0.10 + 0.04 * s, 0.34 * s, [['lowpass', 900 + 500 * s, 0.6]], pan);
      this._schnipsel(this.papier, t, 0.13, 0.16 * s, [['bandpass', 2400, 0.5]], pan);
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(65, t + 0.07);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.10 * s, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      o.connect(g); g.connect(this.papierBus); o.start(t); o.stop(t + 0.1);
    }

    // fortlaufendes Rascheln, solange der Finger das Blatt bewegt
    rascheln(tempo, pan) {
      if (!this._darf()) { this.raschelnEnde(); return; }
      const c = this.ctx;
      if (!this._rascheln) {
        const q = c.createBufferSource(); q.buffer = this.papier; q.loop = true;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
        const bp = c.createBiquadFilter(); bp.type = 'peaking'; bp.frequency.value = 2600; bp.gain.value = 5; bp.Q.value = 0.7;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
        const g = c.createGain(); g.gain.value = 0;
        q.connect(hp); hp.connect(bp); bp.connect(lp); lp.connect(g);
        let ziel = g, p = null;
        if (c.createStereoPanner) { p = c.createStereoPanner(); g.connect(p); ziel = p; }
        ziel.connect(this.papierBus);
        q.start(0, zufall(0, 2.5));
        this._rascheln = { q, g, lp, p };
      }
      const r = this._rascheln, t = c.currentTime;
      const v = Math.min(1, Math.max(0, tempo));
      r.g.gain.setTargetAtTime(0.16 * Math.pow(v, 0.85), t, 0.035);
      r.q.playbackRate.setTargetAtTime(0.75 + 0.6 * v, t, 0.05);
      r.lp.frequency.setTargetAtTime(3000 + 4000 * v, t, 0.05);
      if (r.p) r.p.pan.setTargetAtTime(pan || 0, t, 0.05);
    }
    raschelnEnde() {
      if (!this._rascheln) return;
      const r = this._rascheln, t = this.ctx.currentTime;
      this._rascheln = null;
      r.g.gain.setTargetAtTime(0, t, 0.03);
      r.q.stop(t + 0.2);
    }

    // ganzes Umblättern nach Fahrplan (Tippen, Tasten, Vorlesen)
    blaettern(dauer, pan) {
      if (!this._darf()) return;
      const c = this.ctx, t = c.currentTime + 0.004;
      this.griff(0.55, pan);
      const q = c.createBufferSource(); q.buffer = this.papier;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 800;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3000, t); lp.frequency.linearRampToValueAtTime(6500, t + dauer * 0.45); lp.frequency.linearRampToValueAtTime(3500, t + dauer);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + dauer * 0.42);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
      q.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.papierBus);
      q.start(t, zufall(0, 2)); q.stop(t + dauer + 0.05);
      setTimeout(() => this.kipp(0.5, pan), dauer * 450);
    }

    riffel(anzahl, abstand) {
      if (!this._darf()) return;
      const c = this.ctx, t = c.currentTime + 0.01;
      for (let i = 0; i < anzahl; i++) {
        const s = 0.55 * (1 - i / (anzahl + 2)) * zufall(0.8, 1.1);
        this._schnipsel(this.knister, t + i * abstand, 0.05, 0.22 * s, [['bandpass', zufall(2500, 4200), 0.9]], zufall(-0.2, 0.2));
        this._schnipsel(this.weiss, t + i * abstand + 0.02, 0.05, 0.16 * s, [['lowpass', 1600, 0.6]], 0);
      }
      this.lande(0.45, 0, t + anzahl * abstand + 0.12);
    }

    oeffnen() {
      if (!this._darf()) return;
      const c = this.ctx, t = c.currentTime + 0.01;
      // Deckel löst sich, schwingt auf und legt sich ab
      this._schnipsel(this.knister, t, 0.09, 0.16, [['bandpass', 1800, 0.7]], 0.1);
      const q = c.createBufferSource(); q.buffer = this.weiss;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(300, t + 0.1); lp.frequency.exponentialRampToValueAtTime(1500, t + 0.5); lp.frequency.exponentialRampToValueAtTime(400, t + 0.9);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t + 0.1); g.gain.exponentialRampToValueAtTime(0.07, t + 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
      q.connect(lp); lp.connect(g); g.connect(this.papierBus); q.start(t + 0.1, zufall(0, 1)); q.stop(t + 1);
      const tl = t + 0.92;
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(95, tl); o.frequency.exponentialRampToValueAtTime(48, tl + 0.12);
      const og = c.createGain(); og.gain.setValueAtTime(0.0001, tl); og.gain.exponentialRampToValueAtTime(0.22, tl + 0.006); og.gain.exponentialRampToValueAtTime(0.0001, tl + 0.16);
      o.connect(og); og.connect(this.papierBus); o.start(tl); o.stop(tl + 0.2);
      this._schnipsel(this.weiss, tl, 0.12, 0.2, [['lowpass', 420, 0.7]], 0);
    }

    band() {
      if (!this._darf()) return;
      const t = this.ctx.currentTime + 0.005;
      this._schnipsel(this.weiss, t, 0.24, 0.07, [['bandpass', 1100, 0.45]], 0);
      this._schnipsel(this.knister, t + 0.02, 0.18, 0.05, [['highpass', 2500]], 0);
    }

    // ---------- Blattstimmen: eine weiche Bewegung, die dem Blatt folgt ----------
    stimme(id, opt) {
      if (!this.ctx) return null;
      if (this._st.has(id)) return this._st.get(id);
      const c = this.ctx, t = c.currentTime;
      opt = opt || {};
      const ch = { f0: zufall(0.93, 1.07) * (opt.schwer ? 0.8 : 1), laut: (opt.leise ? 0.55 : 1) * zufall(0.92, 1.06), schwer: opt.schwer ? 1 : 0 };
      const q = c.createBufferSource(); q.buffer = this.rosa; q.loop = true;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 150; hp.Q.value = 0.5;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900 * ch.f0; lp.Q.value = 0.35;
      const koerper = c.createBiquadFilter(); koerper.type = 'peaking'; koerper.frequency.value = 480 * ch.f0; koerper.Q.value = 0.8; koerper.gain.value = 3;
      const g = c.createGain(); g.gain.value = 0;
      const w = c.createBufferSource(); w.buffer = this.welle; w.loop = true;
      const gW = c.createGain(); gW.gain.value = 0;
      w.connect(gW); gW.connect(g.gain);
      q.connect(hp); hp.connect(lp); lp.connect(koerper); koerper.connect(g);
      let pan = null;
      if (c.createStereoPanner) { pan = c.createStereoPanner(); g.connect(pan); pan.connect(this.papierBus); } else g.connect(this.papierBus);
      q.start(t, zufall(0, 3)); w.start(t, zufall(0, 3.8));
      const st = { ch, q, w, lp, g, gW, pan, x: 0 };
      this._st.set(id, st);
      return st;
    }
    bewege(id, z, t) {
      const st = this._st.get(id);
      if (!st || !this._darf()) return;
      const c = this.ctx; t = t || c.currentTime;
      const v = Math.min(1, z.tempo / 3);
      const f = Math.min(1, (z.finger || 0) / 1400);
      const pegel = st.ch.laut * (0.003 + 0.2 * Math.pow(v, 1.5) + 0.03 * f);
      st.g.gain.setTargetAtTime(pegel, t, 0.06);
      st.gW.gain.setTargetAtTime(pegel * 0.22, t, 0.06);
      st.lp.frequency.setTargetAtTime((900 + 3800 * Math.pow(v, 0.9)) * st.ch.f0, t, 0.06);
      st.x = Math.max(-0.8, Math.min(0.8, z.x || 0));
      if (st.pan) st.pan.pan.setTargetAtTime(st.x, t, 0.08);
    }
    // Abheben: kaum hörbar, nur ein Hauch
    abheben(id, staerke, t) {
      const st = this._st.get(id);
      if (!st || !this._darf()) return;
      const c = this.ctx; t = t || c.currentTime + 0.002;
      const s = staerke == null ? 0.5 : staerke;
      this._hauch(this.rosa, t, 0.03, 0.08, st.ch.laut * 0.02 * (0.5 + s), [['highpass', 200], ['lowpass', 1800 * st.ch.f0, 0.4]], st.x);
    }
    // Aufsetzen: ein weiches, kurzes Ausatmen
    lande(id, staerke, t) {
      const st = this._st.get(id);
      if (!st || !this._darf()) return;
      const c = this.ctx; t = t || c.currentTime + 0.002;
      const s = Math.max(0.12, Math.min(1, staerke));
      this._hauch(this.rosa, t, 0.015, 0.11, st.ch.laut * (0.025 + 0.04 * s), [['highpass', 200], ['lowpass', 1500 * st.ch.f0, 0.4]], st.x);
    }
    stimmeEnde(id, t) {
      const st = this._st.get(id);
      if (!st) return;
      this._st.delete(id);
      const c = this.ctx; t = t || c.currentTime;
      for (const g of [st.g, st.gW]) { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.05); }
      st.q.stop(t + 0.4); st.w.stop(t + 0.4);
    }

    // ---------- Umgebung ----------
    umgebung(art, laut) {
      this.umgebungArt = art; if (laut != null) this.umgebungLaut = laut;
      if (!this.ctx) return;
      const c = this.ctx, t = c.currentTime;
      this.umgBus.gain.setTargetAtTime(art === 'aus' || this.stumm() ? 0 : 0.5 * this.umgebungLaut, t, 0.4);
      if (this._umg && this._umg.art === art) return;
      if (this._umg) { const alt = this._umg; this._umg = null; alt.ende(); }
      if (art === 'feuer') this._umg = this._feuer();
      else if (art === 'regen') this._umg = this._regen();
    }
    _schleife(puffer, filter, gain) {
      const c = this.ctx;
      const q = c.createBufferSource(); q.buffer = puffer; q.loop = true;
      let k = q;
      for (const [typ, f, Q] of filter) { const b = c.createBiquadFilter(); b.type = typ; b.frequency.value = f; if (Q) b.Q.value = Q; k.connect(b); k = b; }
      const g = c.createGain(); g.gain.value = gain; k.connect(g); g.connect(this.umgBus);
      q.start(0, zufall(0, 2));
      return { q, g };
    }
    _feuer() {
      const c = this.ctx;
      const brummen = this._schleife(this.braun, [['lowpass', 260, 0.6]], 0.55);
      const zischen = this._schleife(this.weiss, [['bandpass', 3200, 0.5]], 0.015);
      let lauf = true;
      const knacken = () => {
        if (!lauf) return;
        const t = c.currentTime + 0.02;
        const gross = Math.random() < 0.18;
        this._umgSchnipsel(gross ? 0.025 : 0.012, gross ? 0.45 : zufall(0.06, 0.2), zufall(1200, 4800), zufall(-0.6, 0.6), t);
        if (Math.random() < 0.3) this._umgSchnipsel(0.008, zufall(0.05, 0.12), zufall(2500, 6000), zufall(-0.6, 0.6), t + zufall(0.02, 0.06));
        setTimeout(knacken, -Math.log(1 - Math.random()) * 260);
      };
      knacken();
      const flackern = setInterval(() => { brummen.g.gain.setTargetAtTime(zufall(0.4, 0.7), c.currentTime, 0.3); }, 700);
      return { art: 'feuer', ende: () => { lauf = false; clearInterval(flackern); brummen.q.stop(); zischen.q.stop(); } };
    }
    _regen() {
      const c = this.ctx;
      const flaeche = this._schleife(this.weiss, [['highpass', 500], ['lowpass', 5500, 0.5]], 0.10);
      const tief = this._schleife(this.braun, [['lowpass', 380]], 0.18);
      let lauf = true;
      const tropfen = () => {
        if (!lauf) return;
        const t = c.currentTime + 0.02;
        this._umgSchnipsel(0.006, zufall(0.02, 0.07), zufall(2500, 7000), zufall(-0.8, 0.8), t);
        setTimeout(tropfen, -Math.log(1 - Math.random()) * 45);
      };
      tropfen();
      const welle = setInterval(() => { flaeche.g.gain.setTargetAtTime(zufall(0.07, 0.13), c.currentTime, 1.2); }, 2500);
      return { art: 'regen', ende: () => { lauf = false; clearInterval(welle); flaeche.q.stop(); tief.q.stop(); } };
    }
    _umgSchnipsel(dauer, gain, f, pan, t) {
      const c = this.ctx;
      const q = c.createBufferSource(); q.buffer = this.weiss;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.2;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
      q.connect(bp); bp.connect(g);
      if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(this.umgBus); } else g.connect(this.umgBus);
      q.start(t, zufall(0, 2)); q.stop(t + dauer + 0.01);
    }
  }

  window.Klang = Klang;
})();
