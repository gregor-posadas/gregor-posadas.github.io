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
      if (ctx.state === "suspended") ctx.resume();
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
      if (soundOn) tick("down");
    });
    paintSound();
  }

  /* Press feel: sound on press and release for anything that looks like a button; keyboard gets the same. */
  var SEL = ".btn, .sign, .nav a, .tool, .theme-toggle, details.more summary, .gallery a";
  function target(e) { return e.target.closest ? e.target.closest(SEL) : null; }
  document.addEventListener("pointerdown", function (e) { if (target(e)) tick("down"); });
  document.addEventListener("pointerup", function (e) { if (target(e)) tick("up"); });
  document.addEventListener("keydown", function (e) {
    if (e.repeat) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    var el = target(e); if (!el) return;
    el.classList.add("is-pressed"); tick("down");
  });
  document.addEventListener("keyup", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var el = target(e); if (!el) return;
    el.classList.remove("is-pressed"); tick("up");
  });
})();
