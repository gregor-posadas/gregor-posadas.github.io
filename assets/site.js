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
    cap.textContent = fc ? fc.textContent : "";
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
