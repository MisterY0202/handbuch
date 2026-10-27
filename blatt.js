/* Bühne: zeichnet Seiten, gebogene Blätter, Schatten und Seitenschnitt mit WebGL. */
(function () {
  'use strict';

  const SEITE_VS = `
precision highp float;
attribute vec2 a_uv;
uniform vec2 u_bild;
uniform vec2 u_ursprung;
uniform vec2 u_seite;
uniform float u_versatz;
uniform float u_modus;
uniform vec2 u_O;
uniform vec2 u_n;
uniform float u_R;
uniform float u_winkel;
uniform float u_z;
uniform float u_kamera;
uniform float u_skala;
varying vec2 v_uv;
varying vec3 v_nrm;
varying vec2 v_p;
varying float v_h;
const float PI = 3.14159265;
void main() {
  vec2 p = a_uv * u_seite + vec2(u_versatz, 0.0);
  vec3 q = vec3(p, 0.0);
  vec3 nrm = vec3(0.0, 0.0, 1.0);
  if (u_modus > 0.5 && u_modus < 1.5) {
    float d = dot(p - u_O, u_n);
    if (d > 0.0) {
      float pr = PI * u_R;
      if (d < pr) {
        float th = d / u_R;
        q.xy = p + u_n * (u_R * sin(th) - d);
        q.z = u_R * (1.0 - cos(th));
        nrm = vec3(-u_n * sin(th), cos(th));
      } else {
        q.xy = p + u_n * (pr - 2.0 * d);
        q.z = 2.0 * u_R;
        nrm = vec3(0.0, 0.0, -1.0);
      }
    }
  } else if (u_modus > 1.5) {
    float c = cos(u_winkel);
    float s = sin(u_winkel);
    q = vec3(p.x * c, p.y, p.x * s);
    nrm = vec3(-s, 0.0, c);
  }
  vec2 mitte = u_bild * 0.5;
  float f = u_kamera / max(u_kamera - q.z, 10.0);
  vec2 sp = mitte + ((u_ursprung + q.xy) - mitte) * f * u_skala;
  vec2 clip = sp / u_bild * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, clamp(-(q.z + u_z) / (u_kamera * 1.5), -0.99, 0.99), 1.0);
  v_uv = a_uv;
  v_nrm = nrm;
  v_p = p;
  v_h = q.z;
}`;

  const SEITE_FS = `
precision highp float;
uniform sampler2D u_vorn;
uniform sampler2D u_hinten;
uniform float u_echtHinten;
uniform vec2 u_seite;
uniform float u_nacht;
uniform float u_warm;
uniform float u_dimm;
uniform float u_nachtV;
uniform float u_nachtH;
uniform float u_dunkelV;
uniform vec4 u_bildV[6];
uniform vec4 u_bildH[6];
uniform float u_alpha;
uniform float u_istBlatt;
uniform float u_sModus;
uniform vec2 u_sO;
uniform vec2 u_sn;
uniform float u_sR;
uniform float u_sWinkel;
uniform float u_bund;
varying vec2 v_uv;
varying vec3 v_nrm;
varying vec2 v_p;
varying float v_h;
const vec3 TP = vec3(0.937, 0.914, 0.867);
const vec3 TI = vec3(0.114, 0.094, 0.075);
const vec3 NP = vec3(0.110, 0.102, 0.090);
const vec3 NI = vec3(0.835, 0.800, 0.728);
const vec3 LUM = vec3(0.299, 0.587, 0.114);
const float PI = 3.14159265;

vec3 umfaerben(vec3 c) {
  float lp = dot(TP, LUM);
  float li = dot(TI, LUM);
  float t = clamp((lp - dot(c, LUM)) / (lp - li), 0.0, 1.0);
  vec3 grau = mix(TP, TI, t);
  return clamp(mix(NP, NI, pow(t, 0.92)) + (c - grau) * 0.85, 0.0, 1.0);
}

void main() {
  vec3 n = normalize(v_nrm);
  vec3 farbe;
  if (gl_FrontFacing) {
    farbe = texture2D(u_vorn, v_uv).rgb;
    float k = u_nacht * u_nachtV;
    if (k > 0.0) {
      float ib = 0.0;
      for (int i = 0; i < 6; i++) {
        vec4 r = u_bildV[i];
        if (v_uv.x > r.x && v_uv.x < r.z && v_uv.y > r.y && v_uv.y < r.w) ib = 1.0;
      }
      farbe = mix(farbe, ib > 0.5 ? farbe * 0.86 : umfaerben(farbe), k);
    }
  } else {
    n = -n;
    if (u_echtHinten > 0.5) {
      vec2 uh = vec2(1.0 - v_uv.x, v_uv.y);
      farbe = texture2D(u_hinten, uh).rgb;
      float k = u_nacht * u_nachtH;
      if (k > 0.0) {
        float ib = 0.0;
        for (int i = 0; i < 6; i++) {
          vec4 r = u_bildH[i];
          if (uh.x > r.x && uh.x < r.z && uh.y > r.y && uh.y < r.w) ib = 1.0;
        }
        farbe = mix(farbe, ib > 0.5 ? farbe * 0.86 : umfaerben(farbe), k);
      }
    } else {
      vec3 vorn = texture2D(u_vorn, v_uv).rgb;
      if (u_dunkelV > 0.5) {
        farbe = mix(vec3(0.125, 0.117, 0.105), vorn, 0.10);
      } else {
        float k = u_nacht * u_nachtV;
        vec3 papier = mix(TP * 0.982, NP * 1.05, k);
        vec3 durch = mix(vorn, umfaerben(vorn), k);
        farbe = mix(papier, durch, 0.075);
      }
    }
  }
  vec3 L = normalize(vec3(-0.30, -0.42, 1.0));
  float hell = 1.0 + 0.62 * (dot(n, L) - L.z);
  if (!gl_FrontFacing) hell *= 0.965;
  vec3 Hv = normalize(L + vec3(0.0, 0.0, 1.0));
  float glanz = pow(max(dot(n, Hv), 0.0), 22.0) * 0.05 * smoothstep(0.5, 8.0, v_h);
  farbe = farbe * hell + glanz;

  if (v_h < 0.5) {
    float x = abs(v_p.x);
    farbe *= 1.0 - u_bund * (exp(-x / (u_seite.x * 0.035)) + 0.35 * exp(-x / (u_seite.x * 0.16)));
  }

  if (u_sModus > 0.5 && v_h < 0.5 && gl_FrontFacing) {
    float sch = 0.0;
    if (u_sModus < 1.5) {
      float d = dot(v_p - u_sO, u_sn);
      float pr = PI * u_sR;
      if (d <= 0.0) {
        vec2 m = v_p + u_sn * (pr - 2.0 * d) + vec2(-2.0, -4.0) * (0.3 + u_sR / 70.0);
        vec2 aussen = max(-m, m - u_seite);
        float sd = length(max(aussen, 0.0)) + min(max(aussen.x, aussen.y), 0.0);
        float weich = 3.0 + u_sR * 0.32;
        sch = 0.30 * (1.0 - smoothstep(-weich * 0.5, weich, sd));
      } else if (u_istBlatt < 0.5) {
        float w = u_sR * 1.25 + 14.0;
        sch = 0.44 * (1.0 - smoothstep(u_sR * 0.55, u_sR + w, d));
      }
    } else {
      sch = 0.30 * sin(u_sWinkel) * exp(-abs(v_p.x) / (u_seite.x * 0.42));
    }
    farbe *= 1.0 - sch;
  }

  farbe *= mix(vec3(1.0), vec3(1.0, 0.86, 0.66), u_warm);
  farbe *= u_dimm;
  gl_FragColor = vec4(farbe, u_alpha);
}`;

  const GRUND_VS = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.999, 1.0); }`;

  const GRUND_FS = `
precision highp float;
uniform vec2 u_bild;
uniform float u_dpr;
uniform vec4 u_buch;
uniform float u_schatten;
uniform float u_warm;
uniform float u_dimm;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 p = vec2(gl_FragCoord.x, u_bild.y * u_dpr - gl_FragCoord.y) / u_dpr;
  vec2 q = (p - vec2(0.5, 0.42) * u_bild) / (vec2(1.2, 0.9) * u_bild);
  float r = length(q) * 2.0;
  vec3 glut = vec3(0.169, 0.157, 0.141);
  vec3 kohle = vec3(0.110, 0.102, 0.090);
  vec3 nacht = vec3(0.071, 0.067, 0.063);
  vec3 c = r < 0.48 ? mix(glut, kohle, r / 0.48) : mix(kohle, nacht, clamp((r - 0.48) / 0.52, 0.0, 1.0));
  vec2 lo = u_buch.xy + vec2(0.0, 7.0);
  vec2 hi = u_buch.zw + vec2(0.0, 7.0);
  vec2 aussen = max(lo - p, p - hi);
  float sd = length(max(aussen, 0.0)) + min(max(aussen.x, aussen.y), 0.0);
  c *= 1.0 - u_schatten * (1.0 - smoothstep(-8.0, 30.0, sd));
  c += (hash(p) - 0.5) / 255.0;
  c *= mix(vec3(1.0), vec3(1.0, 0.86, 0.66), u_warm);
  gl_FragColor = vec4(c * u_dimm, 1.0);
}`;

  const FLAECHE_VS = `
attribute vec2 a_pos;
uniform vec2 u_bild;
uniform vec4 u_rect;
uniform float u_skala;
void main() {
  vec2 p = mix(u_rect.xy, u_rect.zw, a_pos * 0.5 + 0.5);
  vec2 mitte = u_bild * 0.5;
  p = mitte + (p - mitte) * u_skala;
  vec2 clip = p / u_bild * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.998, 1.0);
}`;

  const FLAECHE_FS = `
precision mediump float;
uniform vec4 u_farbe;
uniform float u_warm;
uniform float u_dimm;
void main() {
  vec3 c = u_farbe.rgb * mix(vec3(1.0), vec3(1.0, 0.86, 0.66), u_warm) * u_dimm;
  gl_FragColor = vec4(c, u_farbe.a);
}`;

  function programm(gl, vs, fs) {
    const mk = (typ, quelle) => {
      const s = gl.createShader(typ);
      gl.shaderSource(s, quelle);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      const name = info.name.replace(/\[0\]$/, '');
      u[name] = gl.getUniformLocation(p, info.name);
    }
    return { p, u, a: (name) => gl.getAttribLocation(p, name) };
  }

  const LEER6 = new Float32Array(24).fill(-1);

  class Buehne {
    constructor(canvas) {
      this.c = canvas;
      const opt = { alpha: false, antialias: true, depth: true, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
      let gl = canvas.getContext('webgl2', opt);
      this.gl2 = !!gl;
      if (!gl) gl = canvas.getContext('webgl', opt) || canvas.getContext('experimental-webgl', opt);
      if (!gl) throw new Error('WebGL fehlt');
      this.gl = gl;
      this.seite = programm(gl, SEITE_VS, SEITE_FS);
      this.grund = programm(gl, GRUND_VS, GRUND_FS);
      this.flaeche = programm(gl, FLAECHE_VS, FLAECHE_FS);
      // Gitter für die biegsame Seite
      const NX = 56, NY = 96;
      const uv = new Float32Array((NX + 1) * (NY + 1) * 2);
      let k = 0;
      for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { uv[k++] = i / NX; uv[k++] = j / NY; }
      const idx = new Uint16Array(NX * NY * 6);
      k = 0;
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
        idx[k++] = a; idx[k++] = b; idx[k++] = c;
        idx[k++] = b; idx[k++] = d; idx[k++] = c;
      }
      this.anzahl = idx.length;
      this.gitter = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.gitter);
      gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
      this.indizes = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indizes);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      this.quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      // Papierweiß als Ersatz, solange eine Seite lädt
      this.leer = this._neueTextur();
      gl.bindTexture(gl.TEXTURE_2D, this.leer);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([239, 233, 221, 255]));
      this.dunkel = this._neueTextur();
      gl.bindTexture(gl.TEXTURE_2D, this.dunkel);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([33, 30, 27, 255]));
      this.W = 1; this.H = 1; this.dpr = 1;
      this.verloren = false;
      canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.verloren = true; }, false);
    }

    _neueTextur() {
      const gl = this.gl;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    }

    textur(quelle, mip, alt) {
      const gl = this.gl;
      const t = alt || this._neueTextur();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, quelle);
      if (mip && this.gl2) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      return t;
    }

    loesche(t) { if (t && t !== this.leer && t !== this.dunkel) this.gl.deleteTexture(t); }

    groesse(W, H, dpr) {
      this.W = W; this.H = H; this.dpr = dpr;
      const w = Math.round(W * dpr), h = Math.round(H * dpr);
      if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
      this.c.style.width = W + 'px';
      this.c.style.height = H + 'px';
    }

    _seiteUniforms(s) {
      const gl = this.gl, u = this.seite.u;
      gl.uniform2f(u.u_bild, this.W, this.H);
      gl.uniform2f(u.u_ursprung, s.ursprung[0], s.ursprung[1]);
      gl.uniform2f(u.u_seite, s.seite[0], s.seite[1]);
      gl.uniform1f(u.u_kamera, s.kamera);
      gl.uniform1f(u.u_skala, s.skala);
      gl.uniform1f(u.u_nacht, s.nacht);
      gl.uniform1f(u.u_warm, s.warm);
      gl.uniform1f(u.u_dimm, s.dimm);
      gl.uniform1f(u.u_bund, s.bund);
      const sch = s.schatten;
      if (sch) {
        gl.uniform1f(u.u_sModus, sch.modus);
        gl.uniform2f(u.u_sO, sch.O ? sch.O[0] : 0, sch.O ? sch.O[1] : 0);
        gl.uniform2f(u.u_sn, sch.n ? sch.n[0] : 1, sch.n ? sch.n[1] : 0);
        gl.uniform1f(u.u_sR, sch.R || 1);
        gl.uniform1f(u.u_sWinkel, sch.winkel || 0);
      } else {
        gl.uniform1f(u.u_sModus, 0);
      }
    }

    _bildRechtecke(loc, liste) {
      const a = new Float32Array(24).fill(-1);
      if (liste) for (let i = 0; i < Math.min(6, liste.length); i++) a.set(liste[i], i * 4);
      this.gl.uniform4fv(loc, liste ? a : LEER6);
    }

    _zeichneSeite(e, s) {
      const gl = this.gl, u = this.seite.u;
      gl.uniform1f(u.u_versatz, e.versatz || 0);
      gl.uniform1f(u.u_modus, e.modus || 0);
      gl.uniform2f(u.u_O, e.O ? e.O[0] : 0, e.O ? e.O[1] : 0);
      gl.uniform2f(u.u_n, e.n ? e.n[0] : 1, e.n ? e.n[1] : 0);
      gl.uniform1f(u.u_R, e.R || 1);
      gl.uniform1f(u.u_winkel, e.winkel || 0);
      gl.uniform1f(u.u_z, e.z || 0);
      gl.uniform1f(u.u_alpha, e.alpha == null ? 1 : e.alpha);
      gl.uniform1f(u.u_istBlatt, e.istBlatt ? 1 : 0);
      const v = e.vorn || {};
      gl.uniform1f(u.u_nachtV, v.dunkel ? 0 : 1);
      gl.uniform1f(u.u_dunkelV, v.dunkel ? 1 : 0);
      this._bildRechtecke(u.u_bildV, v.bilder);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, v.t || (v.dunkel ? this.dunkel : this.leer));
      const h = e.hinten;
      gl.uniform1f(u.u_echtHinten, h ? 1 : 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, h ? (h.t || (h.dunkel ? this.dunkel : this.leer)) : this.leer);
      gl.uniform1f(u.u_nachtH, h && !h.dunkel ? 1 : 0);
      this._bildRechtecke(u.u_bildH, h ? h.bilder : null);
      gl.drawElements(gl.TRIANGLES, this.anzahl, gl.UNSIGNED_SHORT, 0);
    }

    zeichne(s) {
      if (this.verloren) return;
      const gl = this.gl;
      gl.viewport(0, 0, this.c.width, this.c.height);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.disable(gl.CULL_FACE);
      // Hintergrund mit Schlagschatten des Buches
      gl.useProgram(this.grund.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      let a = this.grund.a('a_pos');
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      const g = this.grund.u;
      gl.uniform2f(g.u_bild, this.W, this.H);
      gl.uniform1f(g.u_dpr, this.dpr);
      gl.uniform4f(g.u_buch, s.buch[0], s.buch[1], s.buch[2], s.buch[3]);
      gl.uniform1f(g.u_schatten, s.buchSchatten);
      gl.uniform1f(g.u_warm, s.warm);
      gl.uniform1f(g.u_dimm, s.dimm);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      // Seitenschnitt
      if (s.kanten.length) {
        gl.useProgram(this.flaeche.p);
        a = this.flaeche.a('a_pos');
        gl.enableVertexAttribArray(a);
        gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
        const f = this.flaeche.u;
        gl.uniform2f(f.u_bild, this.W, this.H);
        gl.uniform1f(f.u_skala, s.skala);
        gl.uniform1f(f.u_warm, s.warm);
        gl.uniform1f(f.u_dimm, s.dimm);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        for (const k of s.kanten) {
          gl.uniform4f(f.u_rect, k[0], k[1], k[2], k[3]);
          gl.uniform4f(f.u_farbe, k[4], k[5], k[6], k[7]);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        gl.disable(gl.BLEND);
      }
      // Seiten und Blätter
      gl.useProgram(this.seite.p);
      gl.uniform1i(this.seite.u.u_vorn, 0);
      gl.uniform1i(this.seite.u.u_hinten, 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.gitter);
      a = this.seite.a('a_uv');
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indizes);
      gl.frontFace(gl.CW);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(true);
      gl.clearDepth(1);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      this._seiteUniforms(s);
      for (const e of s.flach) {
        if (e.alpha != null && e.alpha < 1) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); }
        this._zeichneSeite(e, s);
        gl.disable(gl.BLEND);
      }
      for (const e of s.blaetter) this._zeichneSeite(e, s);
    }
  }

  window.Buehne = Buehne;
})();
