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
      var t = ctx.currentTime;
      var out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(kind === "up" ? 0.12 : 0.2, t + 0.002);
      out.gain.exponentialRampToValueAtTime(0.0001, t + (kind === "up" ? 0.035 : 0.06));
      out.connect(ctx.destination);
      /* a filtered noise burst for the click */
      var len = Math.floor(ctx.sampleRate * 0.06);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      var src = ctx.createBufferSource(); src.buffer = buf;
      var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = kind === "up" ? 2600 : 1800; bp.Q.value = 1.2;
      src.connect(bp); bp.connect(out); src.start(t); src.stop(t + 0.07);
      /* and a low thump underneath for the press */
      if (kind !== "up") {
        var o = ctx.createOscillator(); o.type = "sine";
        o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.05);
        var g = ctx.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.07);
      }
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
