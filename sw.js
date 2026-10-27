// Service Worker der Web-Ausgabe: Schale je Version, Inhalt (Seiten, Abbildungen) dauerhaft.
// web_bau.py setzt VERSION, SCHALE und INHALT ein.
const VERSION = '97974fa95eae';
const SCHALE = ["index.html", "tor.js", "inhalt.js", "leser.js", "blatt.js", "klang.js", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "fonts/ebg-italic.woff2", "fonts/ebg-medium.woff2", "fonts/ebg-regular.woff2", "d/e0c3a61908.bin", "d/7bf5aea479.bin", "d/44b2468891.bin", "d/3cf9491f93.bin"];
const INHALT = ["g/b23dbba48b.bin", "g/e0c0730b8b.bin", "g/959ffb5291.bin", "g/b8a2015c5e.bin", "g/f33b07fd94.bin", "g/3240fc2881.bin", "g/f7f0d0e9d9.bin", "g/e01d29330a.bin", "g/de9d7a7270.bin", "g/3cf0fd6677.bin", "g/8960749e5a.bin", "g/a3f80a0386.bin", "g/ae4f7fe329.bin", "g/11860bf7c5.bin", "g/2dcfb57865.bin", "g/8727cc3e3e.bin", "g/f395f5dc1c.bin", "g/506cd2abff.bin", "g/17bfcab304.bin", "g/11a28d077c.bin", "g/03ef2ed43a.bin", "g/273a81661c.bin", "g/7983a06fd9.bin", "g/7fc2c32543.bin", "g/f4c370a97c.bin", "g/cfdf4464bd.bin", "g/871ead07e5.bin", "g/68473848dd.bin", "g/4d10b8edd6.bin", "g/6688ee4968.bin", "g/03b9804da4.bin", "g/e1c1e1ee0f.bin", "g/25195434af.bin", "g/19b94bc4e5.bin", "g/f784d474ff.bin", "g/2ddb7aac9e.bin", "g/1c4c09b91c.bin", "g/80ba34d0a9.bin", "g/970dbc0b6f.bin", "g/dc1afc7f87.bin", "g/09d0edb609.bin", "g/9cdb3fe3eb.bin", "g/dfbd22c24a.bin", "g/421b83ce07.bin", "g/0e0a242960.bin", "g/2cdbdf69de.bin", "g/e9055fd1e8.bin", "g/712d9b4459.bin", "g/a76cf1d181.bin", "g/df982f21e7.bin", "g/6e9de2a234.bin", "g/175810d3cb.bin", "g/db5bc020a2.bin", "g/4f98796bf1.bin", "g/8fef864c9c.bin", "g/3c811bde8d.bin", "g/3a70215e0a.bin", "g/93263bfea5.bin", "g/43ff5d531d.bin", "g/dcf40ce1bb.bin", "g/dacdb1c1d5.bin", "g/5e51b02a0d.bin", "g/b085058d8d.bin", "g/2bf165dbcd.bin", "g/3a101038fa.bin", "g/3f2b1c83a3.bin", "g/6b6237e39a.bin", "g/75f524425e.bin", "g/6955568c82.bin", "g/af4bb47686.bin", "g/01fbb444f8.bin", "g/484fa90a08.bin", "g/9bea5e5553.bin", "g/9eb5c7fb6c.bin", "g/1514088a5d.bin", "g/e6a159bf28.bin", "g/66674af69d.bin", "g/6e362e7080.bin", "g/096c4960be.bin", "g/77b854faed.bin", "g/d9e6e31c26.bin", "g/5b4354acbe.bin", "g/2527a92a53.bin", "g/34f2bd4b8f.bin", "g/d2d5f7877b.bin", "g/74b7cba4cb.bin", "g/d9a5ab762f.bin", "g/92d3558676.bin", "g/d1f2738e8a.bin", "g/5266cb6950.bin", "g/eff6f14da4.bin", "g/114014e8cf.bin", "g/813bb28c08.bin", "g/5d35ce9f10.bin", "g/f63a4c7c6c.bin", "g/989b9594a7.bin", "g/816c2d9164.bin", "g/bd7b6966d4.bin", "g/2e2493fdee.bin", "g/8ad5f18469.bin", "g/ff275d602a.bin", "g/dfbb0c8054.bin", "g/8ffca7844f.bin", "g/396a389e08.bin", "g/ec63c67e5b.bin", "g/9629205863.bin", "g/b3017a0330.bin", "g/fb9d6d2b00.bin", "g/272d7be69c.bin", "g/79296fd795.bin", "g/4494307ec1.bin", "g/99be9f58d7.bin", "g/ea16d79ccc.bin", "g/46ddc96d96.bin", "g/e666eb825f.bin", "g/8c0f0a207e.bin", "g/e893f9b93b.bin", "g/69b5e49089.bin", "g/ef316db083.bin", "g/e6d0edbd1b.bin", "g/b88370ad3b.bin", "g/1953dffd3e.bin", "g/3b5256e036.bin", "g/cda5b232a2.bin", "g/289e3e10f2.bin", "g/c21e0ade00.bin", "g/586fa11f07.bin", "g/f8463e1d27.bin", "g/f80f933148.bin", "g/76485b7da0.bin", "g/1769317215.bin", "g/39b03db52f.bin", "g/eee269d095.bin", "g/663ed8a336.bin", "g/6ed271d7e2.bin", "g/881a2c221c.bin", "g/0f902361cf.bin", "g/a6845b98ed.bin", "g/a1ce1abc8f.bin", "g/e7eaa17dce.bin", "g/d6ef99e4df.bin", "g/bf70cae6a1.bin", "g/ba489bf782.bin", "g/57442cbdca.bin", "g/75b19b0cad.bin", "g/e3033cd446.bin", "g/7e14f121a3.bin", "g/93892d98f4.bin", "g/5069d240d7.bin", "g/223df66255.bin", "g/8c2b9c4ccc.bin", "g/76d8e4b489.bin", "g/c069224af3.bin", "g/51cbbe79be.bin", "g/ef3ae7c626.bin", "g/035ebba594.bin", "g/5fb19b6b86.bin", "g/af17fd1226.bin", "g/e85c0730fa.bin", "g/4423b2feba.bin", "g/4b50ca03d4.bin", "g/f359ee75ac.bin", "g/5fdf10e7f0.bin", "g/2411119e01.bin", "g/f38bf1b0c2.bin", "g/cb69448d4a.bin", "g/441e5dc3c7.bin", "g/69b0cd0dd9.bin", "g/86acbada17.bin", "g/166952c998.bin", "g/5ae7015ce4.bin", "g/60755aab25.bin", "g/fc49754b0f.bin", "g/7b3b3c4ded.bin", "g/ea28fca199.bin", "g/172434d4b8.bin", "g/2ca3b2e458.bin", "g/5b44944098.bin", "g/b9c2340b7b.bin", "g/f82c89ec3c.bin", "g/69f885c665.bin", "g/38dd937231.bin", "g/c08b73a973.bin", "g/28bdc52d8c.bin", "g/8526c9d4f2.bin", "g/22433f18bd.bin", "g/824e0f1011.bin", "g/deec85840b.bin", "g/732917938a.bin", "g/5ef10b7bc8.bin", "g/4566f65b5a.bin", "g/1b7c18652c.bin", "g/79283b7514.bin", "g/a9ffa51edc.bin", "g/52ea5340e9.bin", "g/47a5234310.bin", "g/a3fdeb2c30.bin", "g/00322e9ecc.bin", "g/eaab2e2103.bin", "g/ff97df3e9e.bin", "b/00-12e34b40.bin", "b/01-f3376fb6.bin", "b/02-dec4c339.bin", "b/03-e2d14b73.bin", "b/04-c132f82f.bin", "b/05-705ba141.bin", "b/06-9b9b9f8a.bin", "b/07-3cbdd6bf.bin", "b/08-895c96e3.bin", "b/09-d621839e.bin", "b/10-8960b759.bin", "b/11-1d438213.bin", "b/12-355d7ce7.bin", "b/13-63cda4e5.bin", "b/14-33933808.bin", "b/15-48c4fa9a.bin", "b/16-44f17abe.bin", "b/17-0c3078fc.bin", "b/18-058c5903.bin", "b/19-e8357806.bin", "b/20-69e25b6e.bin", "b/21-6b26aae8.bin", "b/22-405e7baf.bin", "h/00-b724282e.bin", "h/01-fca7b12d.bin", "h/02-efc4b259.bin", "h/03-d8fbc6a7.bin", "h/04-91d98162.bin", "h/05-d84a0ab6.bin", "h/06-41c43835.bin", "h/07-eb7674be.bin", "h/08-b0e05eb6.bin", "h/09-a4ae71fd.bin", "h/10-81aca783.bin", "h/11-3d520e1e.bin", "h/12-fe94226b.bin", "h/13-8043a6ee.bin", "h/14-9064a555.bin", "h/15-add2d0cd.bin", "h/16-487079de.bin", "h/17-ecf58c80.bin", "h/18-e5c5982f.bin", "h/19-fdc12ce9.bin", "h/20-79bab5e7.bin", "h/21-ac5e9a3c.bin", "h/22-5afe980e.bin", "h/23-60177127.bin", "h/24-a75f3299.bin", "h/25-9ac17ffa.bin", "h/26-81adc930.bin", "h/27-11e29a62.bin", "h/28-c33fb1b6.bin", "h/29-f7673df7.bin", "h/30-d684266c.bin", "h/31-1a4750e5.bin", "h/32-bbc9e6dd.bin", "h/33-f5916d90.bin", "h/34-2b1fd8c6.bin", "h/35-c8752ad0.bin", "h/36-b4b33d75.bin", "h/37-0f77ab13.bin", "h/38-6709e42c.bin", "h/39-e46d37d3.bin", "h/40-7679e4f9.bin", "h/41-0cc2637c.bin", "h/42-17fa8c27.bin", "h/43-0533f9be.bin", "h/44-97372b7f.bin", "h/45-9fd22019.bin", "h/46-ef277d30.bin", "h/47-95a04f4a.bin", "h/48-6a8316bd.bin", "h/49-5b0336e5.bin", "h/50-19daea3f.bin", "h/51-4618fd17.bin", "h/52-e96558f5.bin", "h/53-7a918e11.bin"];
const S = 'schale-' + VERSION, I = 'inhalt';
const abs = (p) => new URL(p, self.registration.scope).href;
const IN_SET = new Set(INHALT.map(abs));

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(S).then((c) => c.addAll(SCHALE.map((p) => new Request(p, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('schale-') && k !== S) await caches.delete(k);
    const c = await caches.open(I);
    for (const r of await c.keys()) if (!IN_SET.has(r.url)) await c.delete(r);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const s = await caches.open(S);
    if (r.mode === 'navigate') {
      // nur die Startseite selbst kommt aus dem Speicher, Unterseiten wie labor/ aus dem Netz
      const u = new URL(r.url), wurzel = new URL(self.registration.scope);
      if (u.pathname === wurzel.pathname || u.pathname === wurzel.pathname + 'index.html') {
        const t = await s.match(abs('index.html'));
        if (t) return t;
      }
      return fetch(r);
    }
    const t = await s.match(r, { ignoreSearch: true });
    if (t) return t;
    const c = await caches.open(I);
    const h = await c.match(r);
    if (h) return h;
    const n = await fetch(r);
    if (n.ok && IN_SET.has(r.url)) c.put(r, n.clone()).catch(() => {});
    return n;
  })());
});
