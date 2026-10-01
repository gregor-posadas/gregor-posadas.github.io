/* Theme toggle: follows the device unless a visitor picks Light or Dark. */
(function () {
  var KEY = "gp.theme";
  var btn = document.getElementById("theme-toggle");
  if (!btn) return;
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  function current() {
    var set = document.documentElement.getAttribute("data-theme");
    if (set) return set;
    return mq.matches ? "dark" : "light";
  }
  function label() {
    var next = current() === "dark" ? "Light" : "Dark";
    btn.textContent = next + " mode";
    btn.setAttribute("aria-label", "Switch to " + next.toLowerCase() + " mode");
  }
  btn.addEventListener("click", function () {
    var next = current() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(KEY, next); } catch (e) {}
    label();
  });
  mq.addEventListener && mq.addEventListener("change", label);
  label();
})();
