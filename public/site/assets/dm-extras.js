(function () {
  if (window.__dmExtras) return;
  window.__dmExtras = true;

  var TRACKS = [
    { title: "Spill Your Time", artist: "KatzPascale", art: "/site/assets/art-syt.jpg", src: null },
    { title: "I Wanna Be Yours", artist: "Arctic Monkeys", art: "/site/assets/art-iwby.jpg", src: "/__l5e/assets-v1/1101c507-263b-4c4a-974b-98599c9d20fd/i-wanna-be-yours.mp3" },
    { title: "Blinding Lights", artist: "The Weeknd", art: "/site/assets/art-bl.jpg", src: "/__l5e/assets-v1/f7c86951-f160-436f-8922-39bf041cffd8/blinding-lights.mp3" }
  ];
  var current = 0, muted = false, bypass = false;
  var alt = new Audio();
  alt.loop = true; alt.preload = "none"; alt.volume = 0.6;

  function muteBtn() { return document.querySelector(".js-global-mute-btn"); }
  function siteMuted() { var h = window.__dmHowler; return h ? !!h._muted : false; }
  function setSiteMute(m) {
    var b = muteBtn();
    if (!b || siteMuted() === m) return;
    bypass = true; b.click(); bypass = false;
  }

  // Panel
  var panel = document.createElement("div");
  panel.className = "dm-music";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Choose music");
  panel.innerHTML =
    '<p class="dm-music__label">Now playing</p><ul class="dm-music__list">' +
    TRACKS.map(function (t, i) {
      return '<li><button type="button" class="dm-music__track" data-i="' + i + '">' +
        '<img src="' + t.art + '" alt="" width="40" height="40">' +
        '<span><b>' + t.title + '</b><small>' + t.artist + '</small></span>' +
        '<i class="dm-music__eq" aria-hidden="true"><em></em><em></em><em></em></i></button></li>';
    }).join("") +
    '</ul><button type="button" class="dm-music__mute"><span class="dm-music__mute-icon" aria-hidden="true"></span><span class="dm-music__mute-text">Mute</span></button>';
  document.body.appendChild(panel);

  function render() {
    panel.querySelectorAll(".dm-music__track").forEach(function (el) {
      el.classList.toggle("is-active", +el.dataset.i === current);
    });
    panel.classList.toggle("is-muted", muted);
    panel.querySelector(".dm-music__mute-text").textContent = muted ? "Unmute" : "Mute";
    var b = muteBtn();
    if (b) b.style.setProperty("--dm-art", "url('" + TRACKS[current].art + "')");
  }
  function play() {
    if (muted) return;
    if (current === 0) { alt.pause(); setSiteMute(false); }
    else {
      setSiteMute(true);
      if (alt.dataset.i !== String(current)) { alt.src = TRACKS[current].src; alt.dataset.i = String(current); alt.currentTime = 0; }
      alt.play().catch(function () {});
    }
  }
  function open(v) {
    panel.classList.toggle("is-open", v);
    var b = muteBtn(); if (b) b.classList.toggle("dm-open", v);
  }

  document.addEventListener("click", function (e) {
    if (bypass) return;
    var b = e.target.closest && e.target.closest(".js-global-mute-btn");
    if (b) { e.preventDefault(); e.stopImmediatePropagation(); open(!panel.classList.contains("is-open")); render(); return; }
    var t = e.target.closest && e.target.closest(".dm-music__track");
    if (t) { current = +t.dataset.i; muted = false; play(); render(); return; }
    if (e.target.closest && e.target.closest(".dm-music__mute")) {
      muted = !muted;
      if (muted) { alt.pause(); setSiteMute(true); } else play();
      render(); return;
    }
    if (!e.target.closest || !e.target.closest(".dm-music")) open(false);
  }, true);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) alt.pause();
    else if (!muted && current !== 0) alt.play().catch(function () {});
  });

  // Contact: "Start a project" tab + form
  document.addEventListener("click", function (e) {
    var tb = e.target.closest && e.target.closest(".js-content-toggle-btn");
    if (!tb) return;
    var on = tb.dataset.togglecontent === "project";
    document.querySelectorAll(".dm-brief").forEach(function (f) { f.classList.toggle("is-visible", on); });
  });

  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (!f.classList || !f.classList.contains("dm-brief")) return;
    e.preventDefault();
    var err = f.querySelector(".dm-brief__error");
    var services = [].slice.call(f.querySelectorAll('input[name="service"]:checked')).map(function (x) { return x.value; });
    var name = f.name.value.trim(), phone = f.phone.value.trim(), email = f.email.value.trim();
    var msg = "";
    if (!services.length) msg = "Please choose at least one service.";
    else if (!name) msg = "Please enter your name.";
    else if (!/^\+?[0-9\s-]{7,20}$/.test(phone)) msg = "Please enter a valid phone number.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) msg = "Please enter a valid email.";
    err.textContent = msg;
    if (msg) return;
    f.querySelector(".dm-brief__done").hidden = false;
    f.querySelector(".dm-brief__submit").disabled = true;
  });

  render();
})();
