/* Header tools: light/dark theme, click sounds. Labels come from data attributes so each language page supplies its own words. */
(function () {
  var html = document.documentElement;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* Theme */
  var themeBtn = document.getElementById("theme-toggle");
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  function theme() { return html.getAttribute("data-theme") || (mq.matches ? "dark" : "light"); }
  function paintTheme() {
    if (!themeBtn) return;
    var dark = theme() === "dark";
    themeBtn.textContent = dark ? themeBtn.getAttribute("data-light") : themeBtn.getAttribute("data-dark");
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = theme() === "dark" ? "light" : "dark";
      html.setAttribute("data-theme", next);
      store.set("gp.theme", next);
      paintTheme();
    });
    if (mq.addEventListener) mq.addEventListener("change", paintTheme);
    paintTheme();
  }

  /* Click sound: a short synthesized tick, no audio files. Off by default for visitors who asked the OS for reduced motion. */
  var soundBtn = document.getElementById("sound-toggle");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var saved = store.get("gp.sound");
  var soundOn = saved === null ? !reduced : saved === "on";
  var ctx = null;
  function tick(kind) {
    if (!soundOn) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!ctx) ctx = new AC();
      /* Phones start audio suspended until a tap finishes; wait for it rather than dropping the sound. */
      if (ctx.state === "suspended") { ctx.resume().then(function () { play(kind); }, function () {}); return; }
      play(kind);
    } catch (e) {}
  }
  function play(kind) {
    try {
      /* A keyswitch-style click: a few milliseconds of high-passed noise for the "snap",
         plus a very short high ping for the "tick". Press is lower and fuller, release is higher and lighter.
         Nothing below ~1.5 kHz, so there is no thump. */
      var up = kind === "up";
      var t = ctx.currentTime;
      var out = ctx.createGain();
      out.gain.value = up ? 0.22 : 0.35;
      out.connect(ctx.destination);

      var dur = up ? 0.006 : 0.009;
      var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
      var src = ctx.createBufferSource(); src.buffer = buf;
      var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = up ? 4500 : 3000; hp.Q.value = 0.7;
      var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = up ? 9000 : 7000;
      src.connect(hp); hp.connect(lp); lp.connect(out); src.start(t);

      var o = ctx.createOscillator(); o.type = "triangle";
      o.frequency.setValueAtTime(up ? 3400 : 2300, t);
      o.frequency.exponentialRampToValueAtTime(up ? 2900 : 1700, t + 0.012);
      var g = ctx.createGain();
      g.gain.setValueAtTime(up ? 0.10 : 0.16, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (up ? 0.012 : 0.018));
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.03);
    } catch (e) {}
  }
  function paintSound() {
    if (!soundBtn) return;
    soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
    var state = soundBtn.querySelector(".tool__state");
    if (state) state.textContent = soundOn ? soundBtn.getAttribute("data-on") : soundBtn.getAttribute("data-off");
  }
  if (soundBtn) {
    soundBtn.addEventListener("click", function () {
      soundOn = !soundOn;
      store.set("gp.sound", soundOn ? "on" : "off");
      paintSound();
      if (soundOn) { tick("down"); setTimeout(function () { tick("up"); }, 70); }
    });
    paintSound();
  }

  /* Press feel: one click on press, one on release, for anything that looks like a button.
     The pressed element is remembered, so the release still sounds when the cursor has slipped off
     the button (it sinks 4px away from the pointer) or the finger lifts elsewhere. */
  var SEL = ".btn, .sign, .nav a, .tool, .theme-toggle, details.more summary, .gallery a";
  var RELEASE_GAP = 60; /* ms a link waits so its release click is heard before the page changes */
  function target(e) { return e.target && e.target.closest ? e.target.closest(SEL) : null; }
  var pressed = null;
  function release() { if (!pressed) return; pressed.classList.remove("is-pressed"); pressed = null; tick("up"); }
  document.addEventListener("pointerdown", function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    var el = target(e); if (!el) return;
    pressed = el; tick("down");
  });
  document.addEventListener("pointerup", release);
  document.addEventListener("pointercancel", release);
  window.addEventListener("blur", function () { if (pressed) { pressed.classList.remove("is-pressed"); pressed = null; } });

  /* Keyboard: Enter on a link fires on key-down, so play both clicks then and follow the link after the gap. */
  document.addEventListener("keydown", function (e) {
    if (e.repeat || (e.key !== "Enter" && e.key !== " ")) return;
    var el = target(e); if (!el) return;
    el.classList.add("is-pressed"); pressed = el; tick("down");
    if (e.key === "Enter" && el.tagName === "A") setTimeout(release, RELEASE_GAP - 20);
  });
  document.addEventListener("keyup", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    release();
  });

  /* Links that leave the page: hold navigation just long enough for the release click to play.
     Only plain same-tab clicks are delayed; new-tab, modified and middle clicks are left alone. */
  document.addEventListener("click", function (e) {
    if (!soundOn || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || !a.matches(SEL) || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^mailto:|^tel:/i.test(href)) return;
    e.preventDefault();
    setTimeout(function () { window.location.href = a.href; }, RELEASE_GAP);
  });
})();

/* Lightbox: any gallery or figure link to an image opens here instead of leaving the page.
   Close with the Close button, Escape, or a click on the dark area; arrows step through the same gallery. */
(function () {
  var tl = (document.documentElement.lang || "en").indexOf("tl") === 0;
  var T = tl ? { close: "Isara", of: "ng", prev: "Nakaraang larawan", next: "Susunod na larawan", label: "Tingnan ang larawan" }
             : { close: "Close", of: "of", prev: "Previous image", next: "Next image", label: "Image viewer" };
  var IMG = /\.(jpe?g|png|webp|gif)(\?.*)?$/i;
  function links(root) {
    return Array.prototype.filter.call((root || document).querySelectorAll("a[href]"), function (a) {
      return IMG.test(a.getAttribute("href")) && a.querySelector("img");
    });
  }
  if (!links().length || typeof HTMLDialogElement === "undefined") return;

  var dlg = document.createElement("dialog");
  dlg.className = "lb";
  dlg.setAttribute("aria-label", T.label);
  dlg.innerHTML =
    '<div class="lb__bar"><p class="lb__count" aria-live="polite"></p>' +
    '<button type="button" class="lb__close"><span aria-hidden="true">×</span> ' + T.close + '</button></div>' +
    '<div class="lb__stage"><button type="button" class="lb__nav lb__prev" aria-label="' + T.prev + '">‹</button>' +
    '<figure class="lb__fig"><img class="lb__img" alt=""></figure>' +
    '<button type="button" class="lb__nav lb__next" aria-label="' + T.next + '">›</button></div>' +
    '<p class="lb__cap"></p>';
  document.body.appendChild(dlg);
  var img = dlg.querySelector(".lb__img"), cap = dlg.querySelector(".lb__cap"), count = dlg.querySelector(".lb__count");
  var prev = dlg.querySelector(".lb__prev"), next = dlg.querySelector(".lb__next"), closeBtn = dlg.querySelector(".lb__close");
  var set = [], i = 0, opener = null;

  function show(n) {
    i = n; var a = set[i], thumb = a.querySelector("img");
    var fc = a.closest("figure") ? a.closest("figure").querySelector("figcaption") : null;
    if (!fc && a.parentElement) fc = a.parentElement.querySelector("figcaption");
    img.src = a.href; img.alt = thumb ? thumb.alt : "";
    var fcc = fc ? fc.cloneNode(true) : null;
    if (fcc) Array.prototype.forEach.call(fcc.querySelectorAll(".term__tip"), function (t) { t.remove(); });
    cap.textContent = fcc ? fcc.textContent.trim() : "";
    count.textContent = set.length > 1 ? (i + 1) + " " + T.of + " " + set.length : "";
    prev.disabled = i === 0; next.disabled = i === set.length - 1;
    prev.hidden = next.hidden = set.length < 2;
  }
  function open(a) {
    var group = a.closest(".gallery") || a.closest("section") || document;
    set = links(group); if (set.indexOf(a) < 0) set = [a];
    opener = a; show(set.indexOf(a)); dlg.showModal(); closeBtn.focus();
  }
  function close() { if (dlg.open) dlg.close(); }
  dlg.addEventListener("close", function () { img.removeAttribute("src"); if (opener) opener.focus(); });
  closeBtn.addEventListener("click", close);
  prev.addEventListener("click", function () { if (i > 0) show(i - 1); });
  next.addEventListener("click", function () { if (i < set.length - 1) show(i + 1); });
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg || e.target.classList.contains("lb__stage") || e.target.classList.contains("lb__fig")) { close(); return; }
    /* The image box is letterboxed to fit; a click in the empty margin around the photo also closes. */
    if (e.target === img && img.naturalWidth) {
      var r = img.getBoundingClientRect(), s = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
      var w = img.naturalWidth * s, h = img.naturalHeight * s, x = r.left + (r.width - w) / 2, y = r.top + (r.height - h) / 2;
      if (e.clientX < x || e.clientX > x + w || e.clientY < y || e.clientY > y + h) close();
    }
  });
  /* Phones: the arrow buttons are hidden for space, so a horizontal swipe steps through the group. */
  var sx = null, sy = null;
  dlg.addEventListener("touchstart", function (e) { if (e.touches.length === 1) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; } }, { passive: true });
  dlg.addEventListener("touchend", function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = sy = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0 && i < set.length - 1) show(i + 1);
    if (dx > 0 && i > 0) show(i - 1);
  });
  dlg.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); show(i - 1); }
    if (e.key === "ArrowRight" && i < set.length - 1) { e.preventDefault(); show(i + 1); }
  });
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || !IMG.test(a.getAttribute("href")) || !a.querySelector("img")) return;
    e.preventDefault(); open(a);
  }, true);
})();

/* Glossary terms (Dad page). Hover previews an explanation; click, tap, Enter or Space pins it open.
   Escape, a click elsewhere, or moving focus away closes it. Only one is open at a time. */
(function () {
  var terms = Array.prototype.slice.call(document.querySelectorAll(".term"));
  if (!terms.length) return;
  var open = null, timer = null;
  var hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  function parts(t) { return { b: t.querySelector(".term__btn"), tip: t.querySelector(".term__tip") }; }
  function place(t) {
    var tip = parts(t).tip; tip.style.left = "";
    var r = tip.getBoundingClientRect(), vw = document.documentElement.clientWidth, shift = 0;
    if (r.right > vw - 12) shift = vw - 12 - r.right;
    if (r.left + shift < 12) shift = 12 - r.left;
    if (shift) tip.style.left = shift + "px";
  }
  function show(t, pin) {
    if (open && open !== t) hide(open);
    var p = parts(t); p.tip.hidden = false; p.b.setAttribute("aria-expanded", "true");
    if (pin) t.classList.add("is-pinned");
    open = t; place(t);
  }
  function hide(t) {
    var p = parts(t); p.tip.hidden = true; p.b.setAttribute("aria-expanded", "false");
    t.classList.remove("is-pinned"); if (open === t) open = null;
  }
  terms.forEach(function (t) {
    var p = parts(t);
    p.b.addEventListener("click", function () {
      if (open === t && t.classList.contains("is-pinned")) hide(t); else show(t, true);
    });
    if (hover) {
      t.addEventListener("mouseenter", function () { clearTimeout(timer); timer = setTimeout(function () { if (open !== t) show(t, false); }, 120); });
      t.addEventListener("mouseleave", function () { clearTimeout(timer); if (!t.classList.contains("is-pinned")) timer = setTimeout(function () { if (open === t && !t.classList.contains("is-pinned")) hide(t); }, 300); });
    }
    t.addEventListener("focusout", function (e) { if (open === t && e.relatedTarget && !t.contains(e.relatedTarget)) hide(t); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && open) { var b = parts(open).b; hide(open); b.focus(); }
  });
  document.addEventListener("click", function (e) { if (open && !open.contains(e.target)) hide(open); });
  window.addEventListener("resize", function () { if (open) place(open); });
})();

/* Timelapses play, muted, while at least 60% on screen, and pause when scrolled away.
   They stay still for visitors who ask their device for reduced motion or data saving,
   and a video someone pauses by hand stays paused. */
(function () {
  var vids = Array.prototype.slice.call(document.querySelectorAll("video[data-autoplay]"));
  if (!vids.length || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (navigator.connection && navigator.connection.saveData) return;
  vids.forEach(function (v) {
    v.muted = true;
    v.addEventListener("pause", function () { if (v._autoPause) { v._autoPause = false; return; } v._userPaused = true; });
    v.addEventListener("play", function () { if (v._autoPlay) { v._autoPlay = false; return; } v._userPaused = false; });
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting && e.intersectionRatio >= 0.6) {
        if (v.paused && !v._userPaused) { v._autoPlay = true; var pr = v.play(); if (pr && pr.catch) pr.catch(function () { v._autoPlay = false; }); }
      } else if (!v.paused) { v._autoPause = true; v.pause(); }
    });
  }, { threshold: [0, 0.6] });
  vids.forEach(function (v) { io.observe(v); });
})();

/* Share: one menu on every device.
   - Share to story: a 1080 x 1920 card of the page through the phone's share sheet (Instagram Stories is a target),
     or a download where the browser cannot share files. The link is copied for a Link sticker.
   - Share link: the page's address through the share sheet (Messages, WhatsApp, email...), where available.
   - Copy link: the address to the clipboard. */
(function () {
  var btn = document.getElementById("share-btn");
  if (!btn) return;
  var tl = (document.documentElement.lang || "en").indexOf("tl") === 0;
  var T = tl ? { h: "Ibahagi ang pahinang ito", story: "Ibahagi sa story", dl: "I-download ang story image", link: "Ibahagi ang link", copy: "Kopyahin ang link", copied: "Nakopya ang link.", nocopy: "Hindi makopya. Piliin at kopyahin ang link sa itaas.", close: "Isara", alt: "Story card ng pahinang ito", urlLabel: "Link ng pahinang ito", note: "Kinokopya rin ng Ibahagi sa story ang link, kaya sa Instagram ay maaari kang magdagdag ng Link sticker at i-paste ito.", noteDesk: "Para sa Instagram Stories: i-download ang larawan, i-post ito mula sa iyong telepono, at magdagdag ng Link sticker na may link sa itaas.", toast: "Nakopya ang link. Idagdag ito gamit ang Link sticker sa Instagram." }
               : { h: "Share this page", story: "Share to story", dl: "Download story image", link: "Share link", copy: "Copy link", copied: "Link copied.", nocopy: "Could not copy. Select and copy the link above.", close: "Close", alt: "Story card for this page", urlLabel: "Link to this page", note: "Share to story also copies the link, so in Instagram you can add a Link sticker and paste it.", noteDesk: "For Instagram Stories: download the image, post it from your phone, and add a Link sticker with the link above.", toast: "Link copied. Add it with a Link sticker in Instagram." };
  /* GitHub Pages serves pages without ".html", so share the shorter address. */
  var url = btn.getAttribute("data-url").replace(/\.html$/, ""), card = btn.getAttribute("data-card"), title = btn.getAttribute("data-title");
  var file = null;
  function load() {
    if (file || !window.fetch || typeof File === "undefined") return;
    fetch(card).then(function (r) { return r.blob(); }).then(function (b) {
      file = new File([b], card.split("/").pop(), { type: "image/jpeg" });
    }).catch(function () {});
  }
  function canShareFile() { return !!(file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })); }
  var touch = window.matchMedia("(pointer: coarse)").matches;
  if (touch) { if ("requestIdleCallback" in window) requestIdleCallback(load, { timeout: 4000 }); else setTimeout(load, 2500); }
  btn.addEventListener("pointerenter", load); btn.addEventListener("focus", load);

  function copy() {
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(url); } catch (e) {}
    return Promise.reject();
  }
  var toastEl = null, toastT = null;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("p"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("is-on");
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("is-on"); }, 6000);
  }

  var dlg = null, status = null;
  function build() {
    dlg = document.createElement("dialog");
    dlg.className = "sh"; dlg.setAttribute("aria-labelledby", "sh-h");
    dlg.innerHTML =
      '<h2 id="sh-h">' + T.h + '</h2><div class="sh__body"><img class="sh__img" alt="' + T.alt + '" width="216" height="384">' +
      '<div><label class="sh__label" for="sh-url">' + T.urlLabel + '</label>' +
      '<input class="sh__url" id="sh-url" type="text" readonly value="' + url + '">' +
      '<div class="actions sh__actions">' +
      '<button type="button" class="btn btn--solid sh__story">' + T.story + '</button>' +
      '<a class="btn btn--solid sh__dl" download>' + T.dl + '</a>' +
      '<button type="button" class="btn sh__link">' + T.link + '</button>' +
      '<button type="button" class="btn sh__copy">' + T.copy + '</button>' +
      '<button type="button" class="btn sh__close">' + T.close + '</button></div>' +
      '<p class="sh__status" aria-live="polite"></p><p class="sh__note"></p></div></div>';
    document.body.appendChild(dlg);
    status = dlg.querySelector(".sh__status");
    dlg.querySelector(".sh__close").addEventListener("click", function () { dlg.close(); });
    dlg.querySelector(".sh__url").addEventListener("focus", function (e) { e.target.select(); });
    dlg.querySelector(".sh__copy").addEventListener("click", function () {
      copy().then(function () { status.textContent = T.copied; }, function () { status.textContent = T.nocopy; dlg.querySelector(".sh__url").select(); });
    });
    dlg.querySelector(".sh__link").addEventListener("click", function () {
      navigator.share({ title: title, url: url }).catch(function () {});
    });
    dlg.querySelector(".sh__story").addEventListener("click", function () {
      copy().then(function () { toast(T.toast); }, function () {});
      navigator.share({ files: [file], title: title }).catch(function () {});
    });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", function () { btn.focus(); });
  }
  btn.addEventListener("click", function () {
    if (!dlg) build();
    load();
    var fileOK = canShareFile();
    dlg.querySelector(".sh__img").src = card;
    dlg.querySelector(".sh__dl").href = card;
    /* Show only what this device can do. */
    dlg.querySelector(".sh__story").hidden = !fileOK;
    dlg.querySelector(".sh__dl").hidden = fileOK;
    dlg.querySelector(".sh__link").hidden = !navigator.share;
    dlg.querySelector(".sh__note").textContent = fileOK ? T.note : T.noteDesk;
    status.textContent = "";
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    (fileOK ? dlg.querySelector(".sh__story") : dlg.querySelector(".sh__copy")).focus();
  });
})();

/* "On this page" bar: underline the section being read, and keep that link visible in the bar. */
(function () {
  var toc = document.querySelector(".toc");
  if (!toc) return;
  var list = toc.querySelector(".toc__list");
  var pairs = Array.prototype.map.call(toc.querySelectorAll('a[href^="#"]'), function (a) {
    return { a: a, h: document.getElementById(a.getAttribute("href").slice(1)) };
  }).filter(function (p) { return p.h; });
  if (!pairs.length) return;
  var cur = null, ticking = false;
  function update() {
    ticking = false;
    var off = toc.offsetHeight + 60, idx = -1;
    for (var i = 0; i < pairs.length; i++) if (pairs[i].h.getBoundingClientRect().top - off <= 0) idx = i;
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) idx = pairs.length - 1;
    var a = idx >= 0 ? pairs[idx].a : null;
    if (a === cur) return;
    if (cur) cur.removeAttribute("aria-current");
    cur = a;
    if (!a) return;
    a.setAttribute("aria-current", "true");
    var l = a.offsetLeft, w = a.offsetWidth;
    if (l < list.scrollLeft || l + w > list.scrollLeft + list.clientWidth) list.scrollLeft = l - (list.clientWidth - w) / 2;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
