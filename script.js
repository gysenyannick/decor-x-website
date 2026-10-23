// DECOR-X — interacties
(() => {
  const CONTACT_EMAIL = 'info@decor-x.be'; // TODO: bevestig het juiste adres
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Header krijgt een sterkere schaduw zodra je scrolt
  const header = $('#header');
  const onScroll = () => header.classList.toggle('is-stuck', scrollY > 20);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobiel menu
  const burger = $('#burger');
  const menu = $('#menu');
  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  menu.addEventListener('click', (e) => e.target.closest('a') && setMenu(false));
  addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

  // Achtergrondvideo in de hero: lichte versie per schermformaat
  const video = $('#hero-video');
  if (video) {
    if (matchMedia('(max-width: 860px)').matches) {
      video.poster = video.dataset.posterMobiel;
      video.src = video.dataset.srcMobiel;
    } else {
      video.src = video.dataset.src;
    }
    video.autoplay = true;
    const play = () => video.play().catch(() => {});
    video.addEventListener('canplay', play, { once: true });
    document.addEventListener('visibilitychange', () => !document.hidden && play());
    play();
  }

  // Scroll reveal
  const items = $$('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.filter((e) => e.isIntersecting).forEach((e, n) => {
        e.target.style.setProperty('--d', `${n * 70}ms`);
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add('is-in'));
  }

  // FAQ: één vraag tegelijk open
  const faqs = $$('.faq details');
  faqs.forEach((d) => d.addEventListener('toggle', () => {
    if (d.open) faqs.forEach((o) => o !== d && (o.open = false));
  }));

  // Een project kiezen (keuzekaart of dienst) vinkt het meteen aan in het formulier
  const form = $('#form');
  $$('[data-dienst]').forEach((link) => link.addEventListener('click', () => {
    $$('input[name="dienst"]', form).forEach((cb) => {
      if (cb.value === link.dataset.dienst) cb.checked = true;
    });
  }));

  // Richtprijscalculator — TODO: vervang de bedragen door je echte tarieven (euro, excl. btw, incl. verf)
  const PRIJS = {
    woning: { muren: 20, plafonds: 9, plinten: 4, deuren: 4 },          // per m² woonoppervlakte
    kamer: { muren: 420, plafonds: 200, plinten: 90, deuren: 150 },     // per kamer van gemiddelde grootte
    grootte: { klein: 0.7, gemiddeld: 1, groot: 1.5 },
    gevel: { gevel: 32, houtwerk: 12, goten: 5 },                       // per m² gevel
    type: { baksteen: 1, crepi: 1.1, cementering: 0.95, beton: 0.95, hout: 1.35, geschilderd: 0.9 },
    hoogte: { 1: 1, 2: 1, 3: 1.15 },                                    // stelling of hoogwerker vanaf 3 bouwlagen
    buitenExtra: { reiniging: 5, algen: 3, herstel: 9 },                // per m² gevel
    staat: { goed: 1, matig: 1.2, slecht: 1.45 },
    gemeubeld: 1.1,                                                     // meubels verplaatsen en afdekken
    extra: { premium: 1.15, houtherstel: 150, barsten: 250 },           // premium is een factor, de rest een vast bedrag
    minimum: 450,
    marge: [0.9, 1.15],                                                 // onder- en bovengrens van de richtprijs
  };
  // Geschatte geveloppervlakte uit woonoppervlakte en bouwlagen (min. ramen en deuren)
  const gevelM2 = (woon, lagen) => { const voet = woon / lagen; return 4 * Math.sqrt(voet) * 2.8 * lagen * 0.8; };
  const DELEN = { muren: 'Muren', plafonds: 'Plafonds', plinten: 'Plinten', deuren: 'Deuren', gevel: 'Gevel', houtwerk: 'Ramen en deuren', goten: 'Dakgoten en boeidelen' };
  const calc = $('#calc');
  if (calc) {
    let step = 1;
    const steps = $$('.calc__step', calc);
    const tabs = $$('.calc__tabs li', calc);
    const next = $('#calc-next');
    const back = $('#calc-back');
    const rooms = $('#rooms');
    const val = (name, root = calc) => ($(`input[name="${name}"]:checked`, root) || {}).value;
    const vals = (name, root = calc) => $$(`input[name="${name}"]:checked`, root).map((i) => i.value);
    const text = (input) => input.nextElementSibling.textContent.toLowerCase();
    const euro = (n) => `€ ${(Math.round(n / 10) * 10).toLocaleString('nl-BE')}`;
    const roomList = () => $$('.room', rooms);

    // Kamers toevoegen en verwijderen
    let roomId = 0;
    const addRoom = () => {
      roomId += 1;
      const n = roomId;
      const chk = ['muren', 'plafonds', 'plinten', 'deuren'].map((d, i) => `<label><input type="checkbox" name="r${n}-delen" value="${d}"${i === 0 ? ' checked' : ''}><span>${DELEN[d]}</span></label>`).join('');
      const rad = ['klein', 'gemiddeld', 'groot'].map((g) => `<label><input type="radio" name="r${n}-grootte" value="${g}"${g === 'gemiddeld' ? ' checked' : ''}><span>${g[0].toUpperCase() + g.slice(1)}</span></label>`).join('');
      rooms.insertAdjacentHTML('beforeend', `<div class="room" data-room="${n}"><div class="room__head"><b></b><button class="room__del" type="button">Verwijderen</button></div><div class="chips cols cols-4 m-2">${chk}</div><p class="calc__q">Grootte van de kamer</p><div class="seg cols cols-3">${rad}</div></div>`);
    };
    $('#room-add').addEventListener('click', () => { addRoom(); render(); });
    rooms.addEventListener('click', (e) => {
      const del = e.target.closest('.room__del');
      if (del) { del.closest('.room').remove(); render(); }
    });

    const price = () => {
      let p;
      if (val('soort') === 'buiten') {
        const lagen = Number(val('lagen'));
        const m2 = gevelM2(Number($('#b-range').value), lagen);
        const rate = vals('b-delen').reduce((t, d) => t + PRIJS.gevel[d] * (d === 'gevel' ? PRIJS.type[val('gevel')] : 1), 0);
        p = rate * m2 * PRIJS.staat[val('staat')] * PRIJS.hoogte[lagen];
        vals('b-extra').forEach((x) => { if (PRIJS.buitenExtra[x]) p += PRIJS.buitenExtra[x] * m2; });
      } else if (val('omvang') === 'woning') {
        p = vals('w-delen').reduce((t, d) => t + PRIJS.woning[d], 0) * Number($('#w-range').value);
      } else {
        p = roomList().reduce((t, r) => {
          const n = r.dataset.room;
          return t + vals(`r${n}-delen`, r).reduce((sum, d) => sum + PRIJS.kamer[d], 0) * PRIJS.grootte[val(`r${n}-grootte`, r)];
        }, 0);
      }
      if (val('soort') === 'binnen' && val('inrichting') === 'gemeubeld') p *= PRIJS.gemeubeld;
      const extra = vals(val('soort') === 'buiten' ? 'b-extra' : 'extra');
      if (extra.includes('premium')) p *= PRIJS.extra.premium;
      extra.forEach((x) => { if (PRIJS.extra[x] && x !== 'premium') p += PRIJS.extra[x]; });
      const base = Math.max(PRIJS.minimum, p);
      return `${euro(base * PRIJS.marge[0])} – ${euro(base * PRIJS.marge[1])}`;
    };

    const ready = () => {
      const soort = val('soort');
      if (step === 1) return !!soort;
      if (step === 2) {
        if (soort === 'buiten') return vals('b-delen').length > 0 && !!val('lagen') && !!val('gevel') && !!val('staat');
        if (val('omvang') === 'woning') return vals('w-delen').length > 0;
        if (val('omvang') === 'kamers') return roomList().length > 0 && roomList().every((r) => vals(`r${r.dataset.room}-delen`, r).length > 0);
        return false;
      }
      if (step === 3) return soort === 'buiten' || !!val('inrichting');
      if (step === 4) return /^\d{4}$/.test($('#a-postcode').value.trim()) && $('#a-gemeente').value.trim().length > 1;
      return true;
    };

    const LABELS = ['Wat wil je laten schilderen?', '', 'Nog extra\'s?', 'Waar is je woning?', 'Dit is je richtprijs'];
    const render = () => {
      const soort = val('soort');
      calc.dataset.soort = soort || '';
      calc.dataset.omvang = val('omvang') || '';
      if (val('omvang') === 'kamers' && !roomList().length) addRoom();
      roomList().forEach((r, i) => {
        $('.room__head b', r).textContent = `Kamer ${i + 1}`;
        $('.room__del', r).hidden = roomList().length === 1;
      });
      steps.forEach((el) => el.classList.toggle('is-on', Number(el.dataset.step) === step));
      tabs.forEach((t, n) => { t.classList.toggle('is-on', n === step - 1); t.classList.toggle('is-done', n < step - 1); });
      $('#calc-label').textContent = step === 2 ? `Wat mogen we ${soort} schilderen?` : LABELS[step - 1];
      $('#extra-q').classList.toggle('calc__q--first', soort === 'buiten');
      $('#w-m2').textContent = `${$('#w-range').value} m²`;
      $('#b-m2').textContent = `${$('#b-range').value} m²`;
      back.hidden = step === 1 || step === 5;
      next.hidden = step === 1 || step === 5;   // stap 1 gaat vanzelf verder na een keuze
      next.disabled = !ready();
      next.innerHTML = step === 4 ? 'Toon mijn richtprijs ›' : 'Volgende ›';
      if (step === 5) $('#calc-price').textContent = price();
    };
    calc.addEventListener('input', render);
    calc.addEventListener('change', render);
    $$('input[name="soort"]', calc).forEach((r) => r.addEventListener('click', () => {
      if (step !== 1) return;
      step = 2;
      setTimeout(() => { render(); toTop(); }, 180);   // even de keuze laten zien
    }));
    const toTop = () => {
      const top = calc.getBoundingClientRect().top;
      if (top < 0) scrollBy({ top: top - 100, behavior: reduced ? 'auto' : 'smooth' });
    };
    next.addEventListener('click', () => { if (ready()) { step += 1; render(); toTop(); } });
    back.addEventListener('click', () => { step -= 1; render(); toTop(); });
    $('#calc-reset').addEventListener('click', () => {
      $$('input[name="soort"], input[name="omvang"], input[name="lagen"], input[name="gevel"], input[name="staat"], input[name="inrichting"], input[name="extra"], input[name="b-extra"]', calc).forEach((i) => (i.checked = false));
      rooms.innerHTML = '';
      step = 1;
      render();
      toTop();
    });

    // Plaatsbezoek vanuit de calculator: alle keuzes gaan mee in het formulier
    $('#calc-book').addEventListener('click', () => {
      const buiten = val('soort') === 'buiten';
      const dienst = buiten ? 'Buitenschilderwerk' : 'Binnenschilderwerk';
      $$('input[name="dienst"]', form).forEach((cb) => cb.value === dienst && (cb.checked = true));
      const lijst = (a) => a.map((d) => DELEN[d].toLowerCase()).join(', ');
      let wat;
      if (buiten) wat = `woning van ${$('#b-range').value} m², ${text($('input[name="lagen"]:checked', calc))}, gevel: ${text($('input[name="gevel"]:checked', calc))}, te schilderen: ${lijst(vals('b-delen'))}, staat: ${text($('input[name="staat"]:checked', calc))}`;
      else if (val('omvang') === 'woning') wat = `volledige woning van ${$('#w-range').value} m²: ${lijst(vals('w-delen'))}`;
      else wat = roomList().map((r, i) => `kamer ${i + 1} (${val(`r${r.dataset.room}-grootte`, r)}): ${lijst(vals(`r${r.dataset.room}-delen`, r))}`).join('; ');
      const extra = $$(`input[name="${buiten ? 'b-extra' : 'extra'}"]:checked`, calc).map(text);
      const plaats = `${$('#a-postcode').value.trim()} ${$('#a-gemeente').value.trim()}`;
      const regels = [`${dienst}, ${wat}.`];
      if (!buiten) regels.push(`De woning is ${val('inrichting')}.`);
      if (extra.length) regels.push(`Extra's: ${extra.join(', ')}.`);
      regels.push(`Adres: ${[$('#a-straat').value.trim(), plaats].filter(Boolean).join(', ')}.`, `Richtprijs calculator: ${price()} (excl. btw).`);
      form.elements.bericht.value = regels.join('\n');
      form.elements.gemeente.value = plaats;
    });
    render();
  }

  // Switch tussen richtprijs en AI-visualizer
  const calcBox = $('#calc');
  if (calcBox) {
    $$('.mode button').forEach((b) => b.addEventListener('click', () => {
      calcBox.dataset.mode = b.dataset.mode;
      $$('.mode button').forEach((o) => {
        o.classList.toggle('is-on', o === b);
        o.setAttribute('aria-selected', o === b);
      });
    }));

    // AI-visualizer: opent in een eigen venster. Een open segmentatiemodel verdeelt de foto in vlakken
    // (muur, plafond, deur, gevel…). Tik op een vlak en geef het een kleur.
    const AI_LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2';
    const AI_MODEL = 'Xenova/segformer-b2-finetuned-ade-512-512';
    const NAMEN = { wall: 'Muur', ceiling: 'Plafond', door: 'Deur', 'double door': 'Deur', building: 'Gevel', house: 'Gevel', windowpane: 'Raam', cabinet: 'Kast', 'chest of drawers': 'Kast', wardrobe: 'Kast', shelf: 'Rek', floor: 'Vloer', column: 'Zuil', fence: 'Omheining', railing: 'Leuning', bannister: 'Leuning', stairs: 'Trap', stairway: 'Trap', step: 'Trap', 'kitchen island': 'Keukeneiland', counter: 'Werkblad', table: 'Tafel', box: 'Kist' };
    const NIET = ['floor', 'rug', 'carpet', 'windowpane', 'sky', 'tree', 'plant', 'person', 'grass', 'water', 'sea', 'car', 'mountain', 'road', 'sidewalk', 'earth', 'field', 'flower', 'palm', 'lamp', 'light', 'television receiver', 'screen', 'crt screen', 'monitor', 'painting', 'mirror'];
    const PALET = [
      ['Warm wit', '#f1ece2'], ['Gebroken wit', '#e6e0d2'], ['Kalkwit', '#ebe7df'], ['Zandbeige', '#d6c3a3'], ['Greige', '#b7ae9f'],
      ['Taupe', '#8f8478'], ['Terracotta', '#b9765a'], ['Oker', '#c79a4b'], ['Saliegroen', '#9fab8f'], ['Olijfgroen', '#6d7055'],
      ['Flessengroen', '#2f4a3e'], ['Duifblauw', '#8c99a2'], ['Nachtblauw', '#2c3a4c'], ['Oudroze', '#c9a39a'], ['Steengrijs', '#8a8a86'], ['Antraciet', '#3a3b3c'],
    ];
    const ed = $('#ed');
    const cv = $('#ed-canvas');
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const sel = $('#ed-sel');
    const sctx = sel.getContext('2d');
    const palette = $('#ed-palette');
    const edSend = $('#ed-send');
    const status = $('#ed-status');
    let segmenter = null, orig = null, segs = [], selected = null, comparing = false, guide = null;
    const painted = new Map();   // label -> { naam, hex }
    const masks = new Map();     // label -> { m: Float32Array, meanL }

    const say = (t) => { status.hidden = !t; if (t) $('#ed-status-text').textContent = t; };
    const naam = (label) => NAMEN[label] || label.charAt(0).toUpperCase() + label.slice(1);
    palette.innerHTML = PALET.map(([n, h]) => `<button type="button" style="--c:${h}" data-hex="${h}" data-naam="${n}" title="${n}" aria-label="${n}"></button>`).join('');

    const loadModel = () => {
      if (!segmenter) {
        segmenter = import(AI_LIB).then(({ pipeline, env }) => {
          env.allowLocalModels = false;
          return pipeline('image-segmentation', AI_MODEL, {
            progress_callback: (p) => { if (p.status === 'progress' && /onnx/.test(p.file)) say(`AI laden… ${Math.round(p.progress)}%`); },
          });
        }).catch((e) => { segmenter = null; throw e; });
      }
      return segmenter;
    };

    // Box-filter via een integraalbeeld (snel, onafhankelijk van de straal)
    const boxBlur = (src, w, h, r) => {
      const I = new Float64Array((w + 1) * (h + 1));
      for (let y = 0; y < h; y++) {
        let row = 0;
        for (let x = 0; x < w; x++) { row += src[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row; }
      }
      const out = new Float32Array(w * h);
      for (let y = 0; y < h; y++) {
        const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
        for (let x = 0; x < w; x++) {
          const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
          out[y * w + x] = (I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0]) / ((y1 - y0) * (x1 - x0));
        }
      }
      return out;
    };
    // Grijswaardenbeeld van de foto, gebruikt om de randen van elk vlak strak op de echte randen te leggen
    const makeGuide = () => {
      const w = cv.width, h = cv.height, o = orig.data;
      const g = new Float32Array(w * h), g2 = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) { const v = (0.299 * o[i * 4] + 0.587 * o[i * 4 + 1] + 0.114 * o[i * 4 + 2]) / 255; g[i] = v; g2[i] = v * v; }
      const r = Math.max(4, Math.round(Math.max(w, h) / 160));
      const mI = boxBlur(g, w, h, r), mII = boxBlur(g2, w, h, r);
      return { g, mI, mII, r, w, h };
    };
    // Guided filter (He et al.): het grove AI-masker volgt de randen in de foto, daarna maken we de rand scherp
    const refine = (p) => {
      const { g, mI, mII, r, w, h } = guide;
      const eps = 1e-3;
      const n = w * h;
      const Ip = new Float32Array(n);
      for (let i = 0; i < n; i++) Ip[i] = g[i] * p[i];
      const mP = boxBlur(p, w, h, r), mIP = boxBlur(Ip, w, h, r);
      const A = new Float32Array(n), B = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const v = mII[i] - mI[i] * mI[i];
        A[i] = (mIP[i] - mI[i] * mP[i]) / (v + eps);
        B[i] = mP[i] - A[i] * mI[i];
      }
      const mA = boxBlur(A, w, h, r), mB = boxBlur(B, w, h, r);
      const q = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const v = (mA[i] * g[i] + mB[i] - 0.5) * 5 + 0.5;   // scherpe, maar niet gekartelde rand
        q[i] = v < 0 ? 0 : v > 1 ? 1 : v;
      }
      return q;
    };

    // masker van één vlak op canvasgrootte, met strakke randen
    const getMask = (label) => {
      if (masks.has(label)) return masks.get(label);
      const r = segs.find((x) => x.label === label);
      const w = cv.width, h = cv.height;
      const tmp = document.createElement('canvas'); tmp.width = r.mask.width; tmp.height = r.mask.height;
      const tc = tmp.getContext('2d');
      const id = tc.createImageData(tmp.width, tmp.height);
      for (let i = 0; i < r.mask.data.length; i++) { const v = r.mask.data[i]; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
      tc.putImageData(id, 0, 0);
      const big = document.createElement('canvas'); big.width = w; big.height = h;
      const bc = big.getContext('2d', { willReadFrequently: true });
      bc.imageSmoothingQuality = 'high';
      bc.drawImage(tmp, 0, 0, w, h);
      const d = bc.getImageData(0, 0, w, h).data;
      const p = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) p[i] = d[i * 4] / 255;
      if (!guide) guide = makeGuide();
      const m = refine(p);
      let sum = 0, n = 0;
      const o = orig.data;
      for (let i = 0; i < w * h; i++) if (m[i] > 0.5) { sum += 0.299 * o[i * 4] + 0.587 * o[i * 4 + 1] + 0.114 * o[i * 4 + 2]; n++; }
      const res = { m, meanL: n ? sum / n : 128 };
      masks.set(label, res);
      return res;
    };

    const paint = () => {
      if (!orig) return;
      if (comparing) { ctx.putImageData(orig, 0, 0); return; }
      const out = new ImageData(new Uint8ClampedArray(orig.data), orig.width, orig.height);
      const o = orig.data, d = out.data;
      painted.forEach(({ hex }, label) => {
        const { m, meanL } = getMask(label);
        const tr = parseInt(hex.slice(1, 3), 16), tg = parseInt(hex.slice(3, 5), 16), tb = parseInt(hex.slice(5, 7), 16);
        for (let i = 0; i < m.length; i++) {
          const a = m[i];
          if (a < 0.02) continue;
          const j = i * 4;
          const L = 0.299 * o[j] + 0.587 * o[j + 1] + 0.114 * o[j + 2];
          const f = 1 + (L / meanL - 1) * 0.8;   // licht en schaduw van het vlak behouden
          d[j] = d[j] * (1 - a) + Math.min(255, tr * f) * a;
          d[j + 1] = d[j + 1] * (1 - a) + Math.min(255, tg * f) * a;
          d[j + 2] = d[j + 2] * (1 - a) + Math.min(255, tb * f) * a;
        }
      });
      ctx.putImageData(out, 0, 0);
    };

    const showSel = () => {
      sctx.clearRect(0, 0, sel.width, sel.height);
      if (!selected) return;
      const { m } = getMask(selected);
      const w = sel.width, h = sel.height;
      const id = sctx.createImageData(w, h);
      const lw = Math.max(1, Math.round(w / 600));   // lijndikte
      const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] >= 0.5;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!inside(x, y)) continue;
          const j = (y * w + x) * 4;
          let edge = false;
          for (let k = 1; k <= lw && !edge; k++) edge = !inside(x - k, y) || !inside(x + k, y) || !inside(x, y - k) || !inside(x, y + k);
          id.data[j] = id.data[j + 1] = id.data[j + 2] = 255;
          id.data[j + 3] = edge ? 255 : 46;
        }
      }
      sctx.putImageData(id, 0, 0);
    };

    const updateUI = () => {
      const p = selected && painted.get(selected);
      $('#ed-sel-name').innerHTML = selected ? `${naam(selected)}<small>${p ? p.naam : 'Kies een kleur'}</small>` : 'Kies eerst een vlak<small>Tik op de foto</small>';
      palette.setAttribute('aria-disabled', !selected);
      $$('button', palette).forEach((b) => b.classList.toggle('is-on', !!p && b.dataset.hex === p.hex));
      $('#ed-hint').textContent = selected ? `${naam(selected)} geselecteerd. Kies een kleur of tik op een ander vlak.` : 'Tik op een muur of ander vlak';
      const lijst = [...painted].map(([l, v]) => `${naam(l).toLowerCase()}: ${v.naam}`);
      edSend.dataset.kleuren = lijst.join(', ');
      $('#ed-download').disabled = !painted.size || ed.classList.contains('is-locked');
      $('#ed-reset').disabled = !painted.size;
    };

    const setColor = (hex, kleurNaam) => {
      if (!selected) return;
      painted.set(selected, { hex, naam: kleurNaam });
      paint(); updateUI();
      lock();   // het resultaat zien kan pas na het formulier
    };
    palette.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setColor(b.dataset.hex, b.dataset.naam); });
    $('#ed-own').addEventListener('input', (e) => setColor(e.target.value, `eigen kleur ${e.target.value}`));

    cv.addEventListener('click', (e) => {
      if (!segs.length || ed.classList.contains('is-locked')) return;
      const r = cv.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const hit = segs.find((s) => {
        const mx = Math.min(s.mask.width - 1, Math.floor(x * s.mask.width)), my = Math.min(s.mask.height - 1, Math.floor(y * s.mask.height));
        return s.mask.data[my * s.mask.width + mx] > 127;
      });
      selected = hit && !NIET.includes(hit.label) ? hit.label : null;
      if (hit && !selected) $('#ed-hint').textContent = 'Dat vlak kunnen we niet schilderen. Tik op een muur, plafond, deur of gevel.';
      showSel();
      if (selected || !hit) updateUI();
    });

    const openEditor = async (src) => {
      ed.hidden = false;
      document.body.style.overflow = 'hidden';
      say('Foto laden…');
      let img;
      try {
        img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
      } catch (err) { say('Deze foto kunnen we niet openen. Probeer een andere.'); return; }
      const scale = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
      cv.width = sel.width = Math.round(img.naturalWidth * scale);
      cv.height = sel.height = Math.round(img.naturalHeight * scale);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      orig = ctx.getImageData(0, 0, cv.width, cv.height);
      segs = []; selected = null; painted.clear(); masks.clear(); guide = null;
      sctx.clearRect(0, 0, sel.width, sel.height);
      $('#ed-unlock').hidden = true;
      ed.classList.remove('is-locked');
      updateUI();
      say('AI laden…');
      try {
        const seg = await loadModel();
        say('Vlakken herkennen…');
        segs = await seg(cv.toDataURL('image/jpeg', 0.9));
        say('');
        // de grootste muur of gevel alvast selecteren
        const voorkeur = ['wall', 'building', 'house'];
        const best = segs.filter((s) => !NIET.includes(s.label)).map((s) => ({ s, n: s.mask.data.reduce((t, v) => t + (v > 127), 0) * (voorkeur.includes(s.label) ? 4 : 1) })).sort((a, b) => b.n - a.n)[0];
        selected = best ? best.s.label : null;
        showSel(); updateUI();
      } catch (err) {
        say('De AI kon niet laden. Controleer je internetverbinding en probeer opnieuw.');
      }
    };
    const closeEditor = () => { ed.hidden = true; document.body.style.overflow = ''; closeGate(); };

    $('#viz-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) openEditor(URL.createObjectURL(f)); e.target.value = ''; });
    $$('.viz__samples button', calcBox).forEach((b) => b.addEventListener('click', () => openEditor(b.dataset.src)));
    $('#ed-back').addEventListener('click', closeEditor);
    // Plaatsbezoek vanuit de visualizer: de gekozen kleuren gaan mee in het formulier
    edSend.addEventListener('click', () => {
      closeEditor();
      if (edSend.dataset.kleuren) form.elements.bericht.value = `Ik heb de AI-visualizer gebruikt. Mijn kleuren: ${edSend.dataset.kleuren}.`;
    });
    $('#ed-reset').addEventListener('click', () => { painted.clear(); paint(); updateUI(); });
    const cmp = $('#ed-compare');
    const cmpOn = () => { comparing = true; paint(); }, cmpOff = () => { if (comparing) { comparing = false; paint(); } };
    ['pointerdown', 'keydown'].forEach((ev) => cmp.addEventListener(ev, cmpOn));
    ['pointerup', 'pointerleave', 'keyup', 'blur'].forEach((ev) => cmp.addEventListener(ev, cmpOff));
    $('#ed-download').addEventListener('click', () => {
      cv.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'decor-x-visualisatie.jpg';
        a.click();
      }, 'image/jpeg', 0.92);
    });

    // Gegevens vragen voor het resultaat getoond wordt (zoals HueIQ)
    // TODO: zet hier een formulier-endpoint (bv. Formspree of Web3Forms) zodat de gegevens echt bij jou binnenkomen
    const LEAD_ENDPOINT = '';
    const GATE_AAN = true;    // zet op false om de visualizer zonder formulier te testen
    const gate = $('#gate');
    const gateForm = $('#gate-form');
    let unlocked = false;
    try { unlocked = localStorage.getItem('decorx-viz') === '1'; } catch (e) { /* geen opslag beschikbaar */ }
    const openGate = () => { gate.hidden = false; $('input', gateForm).focus(); };
    function closeGate() { gate.hidden = true; }
    function lock() {
      if (unlocked || !GATE_AAN || ed.classList.contains('is-locked')) return;
      ed.classList.add('is-locked');
      $('#ed-unlock').hidden = false;
      updateUI();
      openGate();
    }
    const gateValid = () => {
      const f = gateForm.elements;
      return f.voornaam.value.trim() && f.achternaam.value.trim() && f.email.checkValidity() && f.email.value.includes('.')
        && f.telefoon.value.replace(/\D/g, '').length >= 9 && /^\d{4}$/.test(f.postcode.value.trim()) && f.akkoord.checked;
    };
    ['input', 'change'].forEach((ev) => gateForm.addEventListener(ev, () => { $('#gate-go').disabled = !gateValid(); }));
    gateForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!gateValid()) return;
      const f = gateForm.elements;
      const lead = {
        naam: `${f.voornaam.value.trim()} ${f.achternaam.value.trim()}`,
        email: f.email.value.trim(), telefoon: f.telefoon.value.trim(), postcode: f.postcode.value.trim(),
        bron: 'AI-visualizer', akkoord: true,
      };
      if (LEAD_ENDPOINT) fetch(LEAD_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(lead) }).catch(() => {});
      // het contactformulier alvast invullen
      form.elements.naam.value = lead.naam;
      form.elements.email.value = lead.email;
      form.elements.telefoon.value = lead.telefoon;
      form.elements.gemeente.value = lead.postcode;
      unlocked = true;
      try { localStorage.setItem('decorx-viz', '1'); } catch (err) { /* geen opslag beschikbaar */ }
      ed.classList.remove('is-locked');
      $('#ed-unlock').hidden = true;
      closeGate();
      updateUI();
    });
    $('#ed-unlock').addEventListener('click', openGate);
    $('#gate-close').addEventListener('click', closeGate);
    gate.addEventListener('click', (e) => { if (e.target === gate) closeGate(); });
    addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!gate.hidden) closeGate(); else if (!ed.hidden) closeEditor();
    });
  }

  // Reviews — echte Google-reviews van het team achter MOS-X. Voeg hier gerust meer toe.
  const REVIEWS = [
    { naam: 'Kjenta V.', tekst: 'Heel tevreden! Vlotte samenwerking, duidelijke uitleg en mooi werk geleverd. Na de reiniging…' },
    { naam: 'Joppe D.', tekst: 'Zeer aangenaam om met Yannick samen te…' },
  ];
  const REVIEWS_URL = 'https://www.google.com/search?q=MOS-X+%7C+Dakontmossing+%26+Coating+Reviews';
  const track = $('#reviews-track');
  if (track) {
    const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    track.innerHTML = REVIEWS.map((r) => `<article class="review">
      <div class="review__head"><span class="review__avatar">${esc(r.naam[0])}</span><span class="review__name">${esc(r.naam)}<small>Google-review</small></span><span class="gword" aria-hidden="true"><i>G</i></span></div>
      <span class="review__stars" aria-label="5 op 5 sterren">★★★★★</span>
      <p>${esc(r.tekst)}</p>
      <a href="${REVIEWS_URL}" target="_blank" rel="noopener">Lees verder</a>
    </article>`).join('');
    const prev = $('.reviews__arrow--prev'), nxt = $('.reviews__arrow--next');
    const step = () => track.querySelector('.review').offsetWidth + 16;
    const arrows = () => {
      prev.hidden = track.scrollLeft < 4;
      nxt.hidden = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -step() }));
    nxt.addEventListener('click', () => track.scrollBy({ left: step() }));
    track.addEventListener('scroll', arrows, { passive: true });
    addEventListener('resize', arrows);
    arrows();
  }

  // Voor en na: schuif om te vergelijken
  const ba = $('#ba');
  if (ba) {
    const range = $('.ba__range', ba);
    range.addEventListener('input', () => ba.style.setProperty('--pos', `${range.value}%`));
    $('#ba-viz').addEventListener('click', () => { const t = $('.mode [data-mode="viz"]'); if (t) t.click(); });
  }

  // Vanaf een andere pagina: index.html#visualizer opent meteen de AI-visualizer
  if (location.hash === '#visualizer') {
    const t = $('.mode [data-mode="viz"]');
    if (t) { t.click(); $('#richtprijs').scrollIntoView(); }
  }

  // Diensten: de AI-visualizer-kaart opent meteen de visualizer
  $$('[data-open-viz]').forEach((b) => b.addEventListener('click', () => { const t = $('.mode [data-mode="viz"]'); if (t) t.click(); }));

  // Diensten: de achtergrondgloed volgt de muis
  const svcSec = $('.services');
  if (svcSec) {
    let raf = 0;
    svcSec.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = svcSec.getBoundingClientRect();
        svcSec.style.setProperty('--mx', `${e.clientX - r.left}px`);
        svcSec.style.setProperty('--my', `${e.clientY - r.top}px`);
        raf = 0;
      });
    });
  }

  // Meer info over een dienst
  const INFO = {
    binnen: {
      nr: '01', titel: 'Schilderwerken binnen', img: 'realisatie-woonkamer.jpg', dienst: 'Binnenschilderwerk',
      tekst: 'Strakke muren en plafonds, mooie deuren en trappen. We dekken alles af en laten je woning netjes achter.',
      lijst: ['Muren en plafonds', 'Binnendeuren, kozijnen en plinten', 'Trappen en leuningen', 'Herstel van barsten en gaten', 'Gratis kleuradvies'],
    },
    buiten: {
      nr: '02', titel: 'Schilderwerken buiten', img: 'dienst-buiten.jpg', dienst: 'Buitenschilderwerk',
      tekst: 'We beschermen alles wat buiten staat tegen regen, vorst en zon, met verf die bij ons klimaat past.',
      lijst: ['Gevels, crepi en buitenmuren', 'Ramen en deuren in hout, PVC of aluminium', 'Poorten en garagepoorten, ook in metaal', 'Kroonlijsten en buitenschrijnwerk', 'Tuinhuizen en poolhouses'],
    },
  };
  const info = $('#info');
  if (info) {
    let huidig = null;
    const sluit = () => { info.hidden = true; document.body.style.overflow = ''; };
    $$('[data-info]').forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      huidig = INFO[b.dataset.info];
      $('#info-nr').textContent = huidig.nr;
      $('#info-title').textContent = huidig.titel;
      $('#info-text').textContent = huidig.tekst;
      $('#info-img').src = huidig.img;
      $('#info-img').alt = huidig.titel;
      $('#info-list').innerHTML = huidig.lijst.map((x) => `<li>${x}</li>`).join('');
      info.hidden = false;
      document.body.style.overflow = 'hidden';
      $('#info-close').focus();
    }));
    $('#info-close').addEventListener('click', sluit);
    info.addEventListener('click', (e) => { if (e.target === info) sluit(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !info.hidden) sluit(); });
    $('#info-calc').addEventListener('click', sluit);
    $('#info-book').addEventListener('click', () => {
      sluit();
      $$('input[name="dienst"]', form).forEach((cb) => cb.value === huidig.dienst && (cb.checked = true));
    });
  }

  // Formulier: opent het mailprogramma met een ingevulde aanvraag
  const note = $('#note');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = form.elements;
    const bad = [f.naam, f.email].filter((el) => !el.checkValidity());
    [f.naam, f.email].forEach((el) => el.classList.toggle('is-bad', bad.includes(el)));
    if (bad.length) {
      note.textContent = 'Vul zeker je naam en een geldig e-mailadres in.';
      note.classList.add('is-err');
      bad[0].focus();
      return;
    }
    const diensten = $$('input[name="dienst"]:checked', form).map((c) => c.value).join(', ') || '—';
    const body = [
      `Naam: ${f.naam.value}`,
      `Telefoon: ${f.telefoon.value || '—'}`,
      `E-mail: ${f.email.value}`,
      `Postcode of gemeente: ${f.gemeente.value || '—'}`,
      `Diensten: ${diensten}`,
      '',
      f.bericht.value,
    ].join('\n');
    location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Aanvraag plaatsbezoek — ${f.naam.value}`)}&body=${encodeURIComponent(body)}`;
    note.classList.remove('is-err');
    note.textContent = 'Je mailprogramma opent met je aanvraag. Even op verzenden klikken en wij doen de rest.';
  });

  $('#year').textContent = new Date().getFullYear();
})();
