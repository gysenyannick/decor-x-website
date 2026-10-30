// "Start je project": vaste knop aan de zijkant + paneel in drie stappen
// (dienst kiezen, werkgebied checken via postcode, afspraak aanvragen).
(() => {
  const LEAD_ENDPOINT = '';            // TODO: vul hier je formulier-endpoint in (bv. Formspree). Leeg = versturen via WhatsApp.
  const WHATSAPP = '32468352869';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const I = (b) => `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${b}</svg>`;
  const DIENSTEN = [
    ['Binnenschilderwerk', I('<rect x="3" y="3" width="15" height="6" rx="1.5"/><path d="M18 6h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-8v3"/><rect x="10" y="14" width="4" height="7" rx="1"/>')],
    ['Buitenschilderwerk', I('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>')],
    ['Kaleien', I('<path d="M4 3h10v6H4z"/><path d="M9 9v3"/><path d="M7 12h4l-.5 9h-3z"/>')],
    ['Iets anders', I('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5h.01"/>')],
  ];
  const TIMING = ['Zo snel mogelijk', 'Binnen 1 à 3 maanden', 'Later dit jaar', 'Ik oriënteer me nog'];

  const regio = (pc) => {
    const n = Number(pc);
    if (n >= 2000 && n <= 2999) return 'de provincie Antwerpen';
    if (n >= 3500 && n <= 3999) return 'Limburg';
    if ((n >= 1500 && n <= 1999) || (n >= 3000 && n <= 3499)) return 'Vlaams-Brabant';
    return '';
  };

  const root = document.createElement('div');
  root.innerHTML = `
  <button class="sp-tab" type="button" data-start>Start je project</button>
  <div class="sp" id="sp" hidden>
    <div class="sp__shade" data-sp-close></div>
    <aside class="sp__panel" role="dialog" aria-modal="true" aria-labelledby="sp-title">
      <header class="sp__head">
        <div><p class="sp__kicker">Gratis en vrijblijvend</p><h2 id="sp-title">Start je project</h2></div>
        <button class="sp__x" type="button" data-sp-close aria-label="Sluiten">×</button>
      </header>
      <ol class="sp__bar" aria-hidden="true"><li class="is-on">1. Dienst</li><li>2. In je buurt?</li><li>3. Plaatsbezoek</li></ol>
      <form class="sp__body" id="sp-form" novalidate>
        <section class="sp__step is-on" data-step="1">
          <h3>Wat mogen we voor je doen?</h3>
          <div class="sp__opts">
            ${DIENSTEN.map(([t, ic]) => `<label class="sp__opt"><input type="radio" name="dienst" value="${t}"><span class="sp__ic">${ic}</span><b>${t}</b><span class="sp__go" aria-hidden="true">›</span></label>`).join('')}
          </div>
        </section>
        <section class="sp__step" data-step="2">
          <h3>Werken we in je buurt?</h3>
          <p class="sp__sub">Vul je postcode in.</p>
          <label class="sp__field"><span>Postcode</span><input name="postcode" inputmode="numeric" maxlength="4" autocomplete="postal-code" placeholder="bv. 2500"></label>
          <p class="sp__check" id="sp-check" role="status"></p>
        </section>
        <section class="sp__step" data-step="3">
          <h3>Plan je gratis plaatsbezoek</h3>
          <p class="sp__sub">We komen langs, bekijken je project en geven eerlijk advies.</p>
          <div class="sp__row">
            <label class="sp__field"><span>Naam *</span><input name="naam" autocomplete="name" required></label>
            <label class="sp__field"><span>Telefoon *</span><input name="telefoon" type="tel" autocomplete="tel" required></label>
          </div>
          <label class="sp__field"><span>E-mail</span><input name="email" type="email" autocomplete="email"></label>
          <p class="sp__lab">Wanneer wil je starten?</p>
          <div class="sp__chips">${TIMING.map((t, i) => `<label><input type="radio" name="timing" value="${t}"${i === 0 ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div>
          <label class="sp__field"><span>Vertel kort iets over je project</span><textarea name="bericht" rows="3" placeholder="Bv. living en gang, of de voorgevel van een rijwoning."></textarea></label>
          <p class="sp__err" id="sp-err" role="status"></p>
        </section>
        <section class="sp__step sp__done" data-step="4">
          <span class="sp__ok" aria-hidden="true">${I('<path d="M20 6 9 17l-5-5"/>')}</span>
          <h3 id="sp-done-title">Bedankt!</h3>
          <p class="sp__sub" id="sp-done-text">We nemen zo snel mogelijk contact met je op om je plaatsbezoek in te plannen.</p>
          <button class="btn btn--line" type="button" data-sp-close>Sluiten</button>
        </section>
      </form>
      <footer class="sp__foot">
        <button class="btn btn--line" type="button" id="sp-back">‹ Vorige</button>
        <button class="btn btn--accent" type="button" id="sp-next">Volgende ›</button>
      </footer>
    </aside>
  </div>`;
  document.body.append(...root.children);

  // gsm: vaste balk onderaan met bellen, Start je project en WhatsApp
  let mbar = document.querySelector('.mobilebar');
  if (!mbar) { mbar = document.createElement('div'); mbar.className = 'mobilebar'; document.body.append(mbar); }
  mbar.innerHTML = `<a class="mobilebar__tel" href="tel:+32468352869" aria-label="Bel ons">${I('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>')}</a>
    <button class="mobilebar__start" type="button" data-start>Start je project <span aria-hidden="true">›</span></button>
    <a class="mobilebar__wa" href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener" aria-label="WhatsApp"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.3-.5.1-1 .1-3.2-.7-2.7-1.1-4.4-3.8-4.6-4-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.7-.1 1.3z"/></svg></a>`;

  const sp = document.getElementById('sp');
  const form = document.getElementById('sp-form');
  const steps = [...sp.querySelectorAll('.sp__step')];
  const bar = [...sp.querySelectorAll('.sp__bar li')];
  const back = document.getElementById('sp-back');
  const next = document.getElementById('sp-next');
  const check = document.getElementById('sp-check');
  const err = document.getElementById('sp-err');
  const tab = document.querySelector('.sp-tab');
  let step = 1;

  const pc = () => form.elements.postcode.value.trim();
  const ok = () => {
    if (step === 1) return !!form.querySelector('input[name="dienst"]:checked');
    if (step === 2) return /^\d{4}$/.test(pc());
    return true;
  };
  const render = () => {
    steps.forEach((s) => s.classList.toggle('is-on', Number(s.dataset.step) === step));
    bar.forEach((b, i) => { b.classList.toggle('is-on', i === step - 1); b.classList.toggle('is-done', i < step - 1); });
    sp.querySelector('.sp__bar').hidden = step === 4;
    back.hidden = step === 1 || step === 4;
    next.hidden = step === 4 || step === 1;
    next.disabled = !ok();
    next.innerHTML = step === 3 ? (LEAD_ENDPOINT ? 'Vraag mijn afspraak aan ›' : 'Verstuur via WhatsApp ›') : 'Volgende ›';
    if (step === 2) {
      const v = pc();
      if (!/^\d{4}$/.test(v)) { check.textContent = ''; check.className = 'sp__check'; }
      else if (regio(v)) { check.textContent = `Goed nieuws! We werken in ${regio(v)}.`; check.className = 'sp__check is-ok'; }
      else { check.textContent = 'Je postcode valt buiten ons vaste werkgebied (Antwerpen, Limburg en Vlaams-Brabant). Ga gerust verder, dan bekijken we wat mogelijk is.'; check.className = 'sp__check is-far'; }
    }
  };
  const open = () => {
    sp.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => sp.classList.add('is-open'));
    setTimeout(() => (steps[step - 1].querySelector('input') || next).focus({ preventScroll: true }), reduced ? 0 : 300);
  };
  const close = () => {
    sp.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { sp.hidden = true; if (step === 4) { form.reset(); step = 1; render(); } }, reduced ? 0 : 300);
  };

  const send = () => {
    const f = form.elements;
    const missing = [f.naam, f.telefoon].filter((el) => !el.value.trim());
    [f.naam, f.telefoon].forEach((el) => el.classList.toggle('is-bad', missing.includes(el)));
    if (missing.length) { err.textContent = 'Vul zeker je naam en telefoonnummer in.'; missing[0].focus(); return; }
    err.textContent = '';
    const diensten = [...form.querySelectorAll('input[name="dienst"]:checked')].map((c) => c.value);
    const lead = { naam: f.naam.value.trim(), telefoon: f.telefoon.value.trim(), email: f.email.value.trim(), postcode: pc(), regio: regio(pc()) || 'buiten werkgebied', diensten, timing: f.timing.value, bericht: f.bericht.value.trim(), bron: 'Start je project' };
    if (LEAD_ENDPOINT) {
      fetch(LEAD_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(lead) }).catch(() => {});
    } else {
      const txt = [`Hallo Yannick, ik wil graag een gratis plaatsbezoek.`, '', `Naam: ${lead.naam}`, `Telefoon: ${lead.telefoon}`, lead.email && `E-mail: ${lead.email}`, `Postcode: ${lead.postcode}`, `Dienst: ${diensten.join(', ')}`, `Starten: ${lead.timing}`, lead.bericht && `Project: ${lead.bericht}`].filter(Boolean).join('\n');
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
    }
    document.getElementById('sp-done-title').textContent = `Bedankt, ${lead.naam.split(' ')[0]}!`;
    document.getElementById('sp-done-text').textContent = LEAD_ENDPOINT
      ? 'We hebben je aanvraag goed ontvangen en nemen zo snel mogelijk contact met je op om je plaatsbezoek in te plannen.'
      : 'Je bericht staat klaar in WhatsApp. Even op verzenden tikken, dan nemen we zo snel mogelijk contact met je op.';
    step = 4;
    render();
  };

  next.addEventListener('click', () => { if (!ok()) return; if (step === 3) send(); else { step += 1; render(); open(); } });
  back.addEventListener('click', () => { step -= 1; render(); });
  form.addEventListener('input', render);
  form.addEventListener('change', (e) => {
    render();
    // een dienst kiezen gaat meteen door naar de volgende stap
    if (e.target.name === 'dienst' && step === 1) setTimeout(() => { step = 2; render(); form.elements.postcode.focus({ preventScroll: true }); }, 220);
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); next.click(); });
  form.elements.postcode.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4); render(); });
  sp.addEventListener('click', (e) => { if (e.target.closest('[data-sp-close]')) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sp.hidden) close(); });

  // alle "Start je project"- en plaatsbezoek-knoppen openen dit paneel
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-start], a[href$="#start"]');
    const visit = e.target.closest('a[href$="#contact"]');
    const isVisit = visit && /plaatsbezoek/i.test(visit.textContent) && !visit.closest('.sp, .mx-pick, .form');
    if (!a && !isVisit) return;
    e.preventDefault();
    open();
  });
  if (location.hash === '#start') setTimeout(open, 300);

  // de zijknop verbergen zolang de hero in beeld is? Nee: altijd zichtbaar, behalve als het paneel open is.
  render();
})();
