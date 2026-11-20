(function VIEWER_MAIN() {
  var M = window.Marzipano, data = window.APP_DATA, equirect = !!data.__equirect;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var panoEl = document.getElementById('pano');
  var viewer = new M.Viewer(panoEl, { controls: { mouseViewMode: (data.settings && data.settings.mouseViewMode) || 'drag' } });

// ===== ГИРОСКОП =====
var gyroBtn = document.getElementById('gyroBtn');
var gyroEnabled = data.settings && data.settings.gyroscope !== false;
var gyroActive = false;
var gyroAlpha = 0, gyroBeta = 0, gyroGamma = 0;
var gyroInitialAlpha = null;
var gyroInitialYaw = null;
var gyroInitialPitch = null;
var gyroAnimationId = null;
var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

var gyroSensitivityYaw = (data.settings && data.settings.gyroSensitivityYaw) || 1.0;
var gyroSensitivityPitch = (data.settings && data.settings.gyroSensitivityPitch) || 1.0;
var gyroInvertPitch = (data.settings && data.settings.gyroInvertPitch !== undefined) ? data.settings.gyroInvertPitch : true;
var gyroSmoothness = (data.settings && data.settings.gyroSmoothness) || 0.15;

var gyroHasSample = false;
var gyroSeeded = false;
var gyroAbsOn = false;
var gyroLastRaw = 0;
var gyroAccum = 0;
var gyroSmoothAccum = 0;
var gyroSmoothBeta = 0;
var gyroSmoothFactor = Math.max(0.05, Math.min(0.5, gyroSmoothness));
var gyroSupported = typeof DeviceOrientationEvent !== 'undefined';

function shortestDeg(from, to) {
  var d = (to - from) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}
function gyroTake(event, abs) {
  if (event.alpha == null || event.beta == null) return;
  if (abs) gyroAbsOn = true;
  else if (gyroAbsOn) return;
  gyroAlpha = event.alpha;
  gyroBeta = event.beta;
  gyroHasSample = true;
}
function gyroOnAbs(event) { gyroTake(event, true); }
function gyroOnRel(event) { gyroTake(event, false); }

function gyroUpdate() {
  if (!gyroActive || !current) return;
  if (gyroHasSample) {
    if (!gyroSeeded) {
      gyroLastRaw = gyroAlpha;
      gyroAccum = 0;
      gyroSmoothAccum = 0;
      gyroSmoothBeta = gyroBeta;
      gyroInitialYaw = current.view.yaw();
      gyroSeeded = true;
    } else {
      gyroAccum += shortestDeg(gyroLastRaw, gyroAlpha);
      gyroLastRaw = gyroAlpha;
      gyroSmoothAccum += (gyroAccum - gyroSmoothAccum) * gyroSmoothFactor;
      gyroSmoothBeta += (gyroBeta - gyroSmoothBeta) * gyroSmoothFactor;
    }
    current.view.setYaw(gyroInitialYaw - gyroSmoothAccum * Math.PI / 180 * gyroSensitivityYaw);
    var targetPitch = (gyroSmoothBeta - 90) * Math.PI / 180 * gyroSensitivityPitch;
    if (gyroInvertPitch) targetPitch = -targetPitch;
    if (targetPitch > Math.PI / 2.2) targetPitch = Math.PI / 2.2;
    if (targetPitch < -Math.PI / 2.2) targetPitch = -Math.PI / 2.2;
    current.view.setPitch(targetPitch);
  }
  gyroAnimationId = requestAnimationFrame(gyroUpdate);
}

  function gyroStart() {
    if (gyroActive) return;
    if (!gyroSupported) {
      alert('Гироскоп не поддерживается на этом устройстве.');
      return;
    }
    function handlePermission(state) {
      if (state === 'granted' || state === true) {
        window.addEventListener('deviceorientationabsolute', gyroOnAbs, true);
        window.addEventListener('deviceorientation', gyroOnRel, true);
        gyroActive = true;
        gyroHasSample = false;
        gyroSeeded = false;
        gyroAbsOn = false;
        gyroBtn.classList.add('active');
        gyroBtn.textContent = 'Гироскоп включён';
        pauseAutorotate();
        gyroUpdate();
      } else {
        alert('Для использования гироскопа нужно разрешение.');
      }
    }
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(handlePermission).catch(function () {
        alert('Ошибка доступа к датчикам.');
      });
    } else {
      handlePermission(true);
    }
  }

  function gyroStop() {
    gyroActive = false;
    gyroBtn.classList.remove('active');
    gyroBtn.textContent = 'Гироскоп';
    if (gyroAnimationId) {
      cancelAnimationFrame(gyroAnimationId);
      gyroAnimationId = null;
    }
    window.removeEventListener('deviceorientationabsolute', gyroOnAbs, true);
    window.removeEventListener('deviceorientation', gyroOnRel, true);
    if (autorotateEnabled && current && !menuOpen) {
      setTimeout(startAutorotate, 500);
    }
  }

  function gyroToggle() {
    gyroActive ? gyroStop() : gyroStart();
  }

  if (gyroEnabled && gyroBtn) gyroBtn.addEventListener('click', gyroToggle);
  else if (gyroBtn) gyroBtn.remove();

  // ===== АВТОВРАЩЕНИЕ =====
  var autorotateEnabled = data.settings && data.settings.autorotate !== false;
  var autorotateSpeed = (data.settings && data.settings.autorotateSpeed) || 50;
  var autorotateRunning = false;
  var menuOpen = false;
  var autorotateTimeout = null;
  var autorotateStartYaw = 0;
  var autorotateTargetYaw = 0;
  var autorotateStartTime = 0;
  var autorotateDuration = autorotateSpeed * 1000;

  function startAutorotate() {
    if (menuOpen || !autorotateEnabled || !current || autorotateRunning || gyroActive) return;
    autorotateRunning = true;
    autorotateStartYaw = current.view.yaw();
    autorotateTargetYaw = autorotateStartYaw + 2 * Math.PI;
    autorotateStartTime = performance.now();
    stepAutorotate();
  }

  function stepAutorotate() {
    if (menuOpen || !autorotateRunning || !current || gyroActive) { autorotateRunning = false; return; }
    var elapsed = performance.now() - autorotateStartTime;
    var progress = Math.min(elapsed / autorotateDuration, 1);
    var eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    var yaw = autorotateStartYaw + (autorotateTargetYaw - autorotateStartYaw) * eased;
    current.view.setYaw(yaw);
    if (progress < 1) { requestAnimationFrame(stepAutorotate); } else { if (autorotateRunning && !gyroActive) startAutorotate(); }
  }

  function pauseAutorotate() {
    if (autorotateRunning) {
      autorotateRunning = false;
      if (autorotateTimeout) clearTimeout(autorotateTimeout);
      autorotateTimeout = setTimeout(function() {
        autorotateTimeout = null;
        if (autorotateEnabled && current && !gyroActive) startAutorotate();
      }, 5000);
    }
  }

  function restartAutorotate() {
    autorotateRunning = false;
    if (autorotateTimeout) { clearTimeout(autorotateTimeout); autorotateTimeout = null; }
    setTimeout(function() { if (autorotateEnabled && current && !gyroActive) startAutorotate(); }, 600);
  }

  function ce(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function idealText(hex) { if (!hex) return '#fff'; var n = parseInt(hex.replace('#', ''), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#15202b' : '#fff'; }
  function stopProp(el) { ['touchstart', 'touchmove', 'touchend', 'wheel', 'mousewheel'].forEach(function (ev) { el.addEventListener(ev, function (e) { e.stopPropagation(); }); }); }
  function thumbUrl(d) { return d.thumb ? d.thumb : 'tiles/' + d.id + '/thumb.jpg'; }

  // ОЗВУЧКА
  var speechSynth = window.speechSynthesis;
  var speechUtterance = null;
  var speechActive = false;

  function speakText(text, lang) {
    if (!speechSynth) return;
    stopSpeech();
    if (!text) return;
    speechUtterance = new SpeechSynthesisUtterance(text);
    speechUtterance.lang = lang || 'ru-RU';
    speechUtterance.rate = 0.9;
    speechUtterance.pitch = 1;
    speechUtterance.volume = 1;
    speechUtterance.onend = function() { speechActive = false; };
    speechUtterance.onerror = function() { speechActive = false; };
    speechActive = true;
    speechSynth.speak(speechUtterance);
  }

  function stopSpeech() {
    if (speechSynth) { speechSynth.cancel(); }
    speechActive = false;
    speechUtterance = null;
  }

  function videoEmbed(url) {
    if (!url) return null;
    var yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    var vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (yt || vm) {
      var src = yt ? 'https://www.youtube.com/embed/' + yt[1] : 'https://player.vimeo.com/video/' + vm[1];
      var wrap = ce('div', 'ip-video'); var f = document.createElement('iframe');
      f.src = src; f.setAttribute('frameborder', '0'); f.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture'); f.setAttribute('allowfullscreen', '');
      wrap.appendChild(f); return wrap;
    }
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) { var v = document.createElement('video'); v.src = url; v.controls = true; v.className = 'ip-videofile'; return v; }
    var a = document.createElement('a'); a.href = url; a.target = '_blank'; a.className = 'ip-vlink'; a.textContent = '▶ Открыть видео'; return a;
  }

  var scenes = data.scenes.map(function (d) {
    var source, geometry;
    if (equirect) { source = M.ImageUrlSource.fromString(d.image); geometry = new M.EquirectGeometry([{ width: d.width }]); }
    else { source = M.ImageUrlSource.fromString('tiles/' + d.id + '/{z}/{f}/{y}/{x}.jpg', { cubeMapPreviewUrl: 'tiles/' + d.id + '/preview.jpg' }); geometry = new M.CubeGeometry(d.levels); }
    var limiter = M.RectilinearView.limit.traditional(d.faceSize, 100 * Math.PI / 180, 120 * Math.PI / 180);
    var view = new M.RectilinearView(d.initialViewParameters, limiter);
    var scene = viewer.createScene({ source: source, geometry: geometry, view: view, pinFirstLevel: true });
    return { data: d, scene: scene, view: view };
  });
  function findScene(id) { for (var i = 0; i < scenes.length; i++) if (scenes[i].data.id === id) return scenes[i]; return null; }
  var current = scenes[0];

  // AUDIO
  var allAudio = [];
  function stopAllAudio() { allAudio.forEach(function (o) { try { o.au.pause(); o.au.currentTime = 0; } catch (e) {} o.reset(); }); }
  function audioControl(url) {
    var wrap = ce('div', 'aud-ctl'); var btn = ce('button', 'aud-btn'); btn.innerHTML = '▶ Воспроизвести';
    var au = new Audio(url); au.preload = 'none';
    function reset() { btn.innerHTML = '▶ Воспроизвести'; btn.classList.remove('playing'); }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (au.paused) { allAudio.forEach(function (o) { if (o.au !== au) { o.au.pause(); o.au.currentTime = 0; o.reset(); } }); au.play(); btn.innerHTML = '⏹ Стоп'; btn.classList.add('playing'); }
      else { au.pause(); au.currentTime = 0; reset(); }
    });
    au.addEventListener('ended', reset);
    allAudio.push({ au: au, reset: reset });
    return wrap.appendChild(btn), wrap;
  }

  function makeButton(btn, cls) {
    if (!btn || !btn.url) return null;
    var el = document.createElement('a');
    el.className = cls || 'ip-btn';
    el.textContent = btn.text || 'Перейти';
    el.href = btn.url;
    el.target = '_blank';
    el.style.background = btn.color || '#ff7a18';
    el.style.color = idealText(btn.color || '#ff7a18');
    el.addEventListener('click', function(e) { e.stopPropagation(); });
    return el;
  }

  var transAudio = (data.settings && data.settings.transitionSound) ? new Audio(data.settings.transitionSound) : null;
  function playTransition() { if (transAudio) { try { transAudio.currentTime = 0; transAudio.play(); } catch (e) {} } }

  function closeInfoPopups() { 
    var l = document.querySelectorAll('.info-popup.open'); 
    for (var i = 0; i < l.length; i++) l[i].classList.remove('open'); 
    stopAllAudio(); 
    stopSpeech();
  }
  var arrowImg = data.settings && data.settings.arrowImage;
  
  function makeLink(hs) {
    var col = hs.color || '#27c93f';
    var w = ce('div', 'hotspot link-hotspot'); var a;
    if (arrowImg) { a = ce('div', 'link-arrow link-arrow-img'); var im = document.createElement('img'); im.src = arrowImg; im.style.transform = 'rotate(' + (hs.rotation || 0) + 'rad)'; a.appendChild(im); }
    else { a = ce('div', 'link-arrow'); a.textContent = '↑'; a.style.transform = 'rotate(' + (hs.rotation || 0) + 'rad)'; a.style.background = col; a.style.color = idealText(col); }
    a.style.opacity = (hs.opacity == null ? 1 : hs.opacity);
    var sz = hs.size || 1;
    if (sz !== 1) { var base = arrowImg ? 50 : 38, d = base * sz; a.style.width = a.style.height = d + 'px'; a.style.fontSize = (20 * sz) + 'px'; }
    w.appendChild(a);
    var tgt = findScene(hs.target);
    var prev = ce('div', 'link-preview'); var pim = ce('img'); if (tgt) pim.src = thumbUrl(tgt.data); prev.appendChild(pim);
    var cap = ce('div', 'lp-cap'); cap.textContent = hs.label || (tgt ? tgt.data.name : ''); prev.appendChild(cap);
    w.appendChild(prev);
    w.addEventListener('click', function () { var s = findScene(hs.target); if (s) warpToScene(s, hs); });
    w.addEventListener('mouseenter', pauseAutorotate);
    w.addEventListener('touchstart', pauseAutorotate);
    stopProp(w); return w;
  }
  
  function makeInfo(hs) {
    var col = hs.color || '#ff7a18', txt = idealText(col);
    var w = ce('div', 'hotspot info-hotspot'); var ic = ce('div', 'info-icon'); ic.textContent = 'i'; ic.style.background = col; ic.style.color = txt;
    var p = ce('div', 'info-popup'); var h = ce('div', 'ip-head'); h.style.background = col; h.style.color = txt;
    var ti = ce('span', 'ip-title'); ti.textContent = hs.title || ''; var cl = ce('span', 'ip-close'); cl.textContent = '✕'; cl.style.color = txt; h.appendChild(ti); h.appendChild(cl);
    var b = ce('div', 'ip-body');
    if (hs.image) { var im = ce('img', 'ip-img'); im.src = hs.image; b.appendChild(im); }
    var vid = videoEmbed(hs.video); if (vid) b.appendChild(vid);
    if (hs.audio) b.appendChild(audioControl(hs.audio));
    if (hs.text) { var tx = ce('div', 'ip-text'); tx.textContent = hs.text; b.appendChild(tx); }
    var btn = makeButton(hs.button);
    if (btn) b.appendChild(btn);
    if (hs.text) {
      var speakBtn = ce('button', 'aud-btn');
      speakBtn.innerHTML = '🔊 Озвучить';
      speakBtn.style.marginTop = '6px';
      speakBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (speechActive) { stopSpeech(); speakBtn.innerHTML = '🔊 Озвучить'; }
        else { speakText(hs.text, 'ru-RU'); speakBtn.innerHTML = '⏹ Остановить'; }
      });
      b.appendChild(speakBtn);
    }
    p.appendChild(h); p.appendChild(b);
    ic.addEventListener('click', function (e) { e.stopPropagation(); var open = p.classList.contains('open'); closeInfoPopups(); if (!open) p.classList.add('open'); pauseAutorotate(); });
    cl.addEventListener('click', function (e) { e.stopPropagation(); p.classList.remove('open'); stopSpeech(); });
    w.appendChild(ic); w.appendChild(p); stopProp(w); return w;
  }
  
  scenes.forEach(function (s) {
    var c = s.scene.hotspotContainer();
    (s.data.linkHotspots || []).forEach(function (hs) { c.createHotspot(makeLink(hs), { yaw: hs.yaw, pitch: hs.pitch }); });
    (s.data.infoHotspots || []).forEach(function (hs) { c.createHotspot(makeInfo(hs), { yaw: hs.yaw, pitch: hs.pitch }); });
  });

  // REGION LAYER
  var regionLayer = document.createElementNS(SVGNS, 'svg');
  regionLayer.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:8';
  panoEl.appendChild(regionLayer);
  regionLayer._regs = [];
  var regPopup = ce('div', 'region-popup'); regPopup.style.display = 'none'; document.body.appendChild(regPopup);
  
  function openRegionPopup(hs) {
    regPopup.innerHTML = '';
    var col = hs.color || '#a371f7', txt = idealText(col);
    var head = ce('div', 'rp-head'); head.style.background = col; head.style.color = txt;
    var ti = ce('span', 'rp-title'); ti.textContent = hs.title || ''; var cl = ce('span', 'rp-close'); cl.textContent = '✕'; cl.style.color = txt; head.appendChild(ti); head.appendChild(cl);
    var body = ce('div', 'rp-body');
    if (hs.image) { var im = ce('img', 'rp-img'); im.src = hs.image; body.appendChild(im); }
    var vid = videoEmbed(hs.video); if (vid) body.appendChild(vid);
    if (hs.audio) body.appendChild(audioControl(hs.audio));
    if (hs.text) { var tx = ce('div', 'rp-text'); tx.textContent = hs.text; body.appendChild(tx); }
    var btn = makeButton(hs.button, 'rp-btn');
    if (btn) body.appendChild(btn);
    if (hs.text) {
      var speakBtn2 = ce('button', 'aud-btn');
      speakBtn2.innerHTML = '🔊 Озвучить';
      speakBtn2.style.marginTop = '6px';
      speakBtn2.addEventListener('click', function(e) {
        e.stopPropagation();
        if (speechActive) { stopSpeech(); speakBtn2.innerHTML = '🔊 Озвучить'; }
        else { speakText(hs.text, 'ru-RU'); speakBtn2.innerHTML = '⏹ Остановить'; }
      });
      body.appendChild(speakBtn2);
    }
    regPopup.appendChild(head); regPopup.appendChild(body); regPopup.style.display = 'block';
    cl.addEventListener('click', function () { regPopup.style.display = 'none'; stopAllAudio(); stopSpeech(); });
    pauseAutorotate();
  }
  
  function projectPoints(view, points) { var out = []; for (var i = 0; i < points.length; i++) { var s = view.coordinatesToScreen({ yaw: points[i].yaw, pitch: points[i].pitch }); if (!s) return null; out.push(s); } return out; }
  function buildRegionsFor(s) {
    while (regionLayer.firstChild) regionLayer.removeChild(regionLayer.firstChild);
    regionLayer._regs = [];
    (s.data.regionHotspots || []).forEach(function (hs) {
      var col = hs.color || '#a371f7';
      var poly = document.createElementNS(SVGNS, 'polygon');
      poly.setAttribute('fill', col); poly.setAttribute('stroke', 'none');
      poly.setAttribute('class', 'reg-glow'); poly.style.color = col;
      poly.addEventListener('click', function (e) { e.stopPropagation(); openRegionPopup(hs); });
      regionLayer.appendChild(poly);
      regionLayer._regs.push({ poly: poly, hs: hs });
    });
  }
  function tick() {
    if (current) {
      regionLayer._regs.forEach(function (r) {
        var pts = projectPoints(current.view, r.hs.points);
        if (!pts) { r.poly.style.display = 'none'; }
        else { r.poly.style.display = ''; r.poly.setAttribute('points', pts.map(function (p) { return p.x + ',' + p.y; }).join(' ')); }
      });
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // SIDEBAR (на телефонах скрыта по умолчанию)
  var sidebar = ce('div', 'vsidebar', '<div class="vside-head">' + (data.name || 'Сцены') + '</div><div id="vsceneList"></div>');
  document.body.appendChild(sidebar);
  if (gyroEnabled && gyroBtn) {
    gyroBtn.className = 'vgyro';
    gyroBtn.textContent = 'Гироскоп';
    sidebar.insertBefore(gyroBtn, sidebar.querySelector('#vsceneList'));
  }
  // На телефонах панель скрыта по умолчанию
  if (isMobile) {
    sidebar.classList.add('hidden');
  }
  var toggle = ce('button', 'vside-toggle'); toggle.textContent = '☰'; document.body.appendChild(toggle);
  toggle.addEventListener('click', function () { sidebar.classList.toggle('hidden'); });
  var listEl = sidebar.querySelector('#vsceneList');
  function sceneRow(s) {
    var row = ce('div', 'vscene-row'); row.setAttribute('data-id', s.data.id);
    var im = ce('img'); im.src = thumbUrl(s.data); var sp = ce('span'); sp.textContent = s.data.name;
    row.appendChild(im); row.appendChild(sp); row.addEventListener('click', function () { switchScene(s); });
    row.addEventListener('click', pauseAutorotate);
    return row;
  }
  (function buildSidebar() {
    listEl.innerHTML = '';
    (data.groups || []).forEach(function (g) {
      var inG = scenes.filter(function (s) { return s.data.groupId === g.id && !s.data.hidden; });
      if (!inG.length) return;
      var box = ce('div', 'vgroup'); var head = ce('div', 'vgroup-head', '<span class="vcaret">▼</span>📁 ' + g.name);
      var body = ce('div', 'vgroup-body'); inG.forEach(function (s) { body.appendChild(sceneRow(s)); });
      head.addEventListener('click', function () { box.classList.toggle('collapsed'); });
      box.appendChild(head); box.appendChild(body); listEl.appendChild(box);
    });
    scenes.filter(function (s) { return !s.data.groupId && !s.data.hidden; }).forEach(function (s) { listEl.appendChild(sceneRow(s)); });
  })();
  function updateSidebar() { var rows = document.querySelectorAll('.vscene-row'); for (var i = 0; i < rows.length; i++) rows[i].classList.toggle('current', rows[i].getAttribute('data-id') === current.data.id); }

  // MINIMAP
  var maps = data.maps || (data.map ? [data.map] : []);
  var allPins = [], fullPins = [], miniIdx = 0, mini = null, fullOverlay = null, stage = null, fstage = null, zApi = null, fApi = null;
  
  function makeZoomable(stageEl, getZoom) {
    var scale = 1, tx = 0, ty = 0;
    function clamp() {
      var z = getZoom(); if (!z) return;
      var sw = stageEl.clientWidth, sh = stageEl.clientHeight, zw = z.offsetWidth * scale, zh = z.offsetHeight * scale;
      tx = zw <= sw ? (sw - zw) / 2 : Math.min(0, Math.max(sw - zw, tx));
      ty = zh <= sh ? (sh - zh) / 2 : Math.min(0, Math.max(sh - zh, ty));
    }
    function apply() {
      var z = getZoom(); if (!z) return; clamp();
      z.style.transformOrigin = '0 0'; z.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
      var pins = z.querySelectorAll('.vmini-pin'); 
      for (var i = 0; i < pins.length; i++) { 
        pins[i].style.transform = 'translate(-50%,-50%) scale(' + (1 / scale) + ')'; 
      }
      var tables = z.querySelectorAll('.vmini-table');
      for (var i = 0; i < tables.length; i++) {
        tables[i].style.transform = 'scale(' + (1 / scale) + ')';
        tables[i].style.transformOrigin = 'center center';
      }
    }
    function setScale(ns, cx, cy) { 
      ns = Math.max(1, Math.min(8, ns)); 
      if (cx == null) { var r = stageEl.getBoundingClientRect(); cx = r.width / 2; cy = r.height / 2; } 
      tx = cx - (cx - tx) * (ns / scale); 
      ty = cy - (cy - ty) * (ns / scale); 
      scale = ns; apply(); 
    }
    stageEl.addEventListener('wheel', function (e) { 
      e.preventDefault(); 
      var r = stageEl.getBoundingClientRect(); 
      setScale(scale * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX - r.left, e.clientY - r.top); 
    }, { passive: false });
    function down(cx, cy) {
      var otx = tx, oty = ty, moved = false;
      function mv(ex, ey) { if (!moved && (Math.abs(ex - cx) > 3 || Math.abs(ey - cy) > 3)) moved = true; if (!moved) return; tx = otx + (ex - cx); ty = oty + (ey - cy); apply(); }
      return mv;
    }
    stageEl.addEventListener('mousedown', function (e) {
      if (e.target.classList.contains('vmini-pin') || e.target.classList.contains('vmini-table')) return; 
      e.preventDefault();
      var mv = down(e.clientX, e.clientY);
      function m(ev) { mv(ev.clientX, ev.clientY); } 
      function u() { document.removeEventListener('mousemove', m); document.removeEventListener('mouseup', u); }
      document.addEventListener('mousemove', m); document.addEventListener('mouseup', u);
    });
    stageEl.addEventListener('touchstart', function (e) {
      if (e.target.classList.contains('vmini-pin') || e.target.classList.contains('vmini-table') || e.touches.length !== 1) return;
      var mv = down(e.touches[0].clientX, e.touches[0].clientY);
      function m(ev) { if (ev.touches.length === 1) { ev.preventDefault(); mv(ev.touches[0].clientX, ev.touches[0].clientY); } }
      function u() { stageEl.removeEventListener('touchmove', m); stageEl.removeEventListener('touchend', u); }
      stageEl.addEventListener('touchmove', m, { passive: false }); stageEl.addEventListener('touchend', u);
    }, { passive: true });
    return { apply: apply, setScale: setScale, get scale() { return scale; }, reset: function () { scale = 1; tx = 0; ty = 0; apply(); } };
  }
  
  function buildMapDom(map, pinClass, arr) {
    var zoom = ce('div', 'vmap-zoom'); var img = ce('img', 'vmap-img'); img.src = map.image; zoom.appendChild(img);
    (map.pins || []).forEach(function (p) {
      var el = ce('div', 'vmini-pin ' + pinClass); 
      el.style.left = p.xPct + '%'; el.style.top = p.yPct + '%'; 
      el.title = p.label || ''; el.setAttribute('data-target', p.target);
      if (p.icon && data.icons && data.icons[p.icon]) {
        el.classList.add('has-ico');
        el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + data.icons[p.icon] + '"/></svg>';
      }
      el.addEventListener('click', function (ev) { ev.stopPropagation(); var s = findScene(p.target); if (s) { switchScene(s); if (fullOverlay) fullOverlay.style.display = 'none'; } });
      zoom.appendChild(el); arr.push(el);
    });
    (map.tables || []).forEach(function (t) {
      var el = ce('div', 'vmini-table');
      el.className = 'vmini-table';
      el.style.position = 'absolute';
      el.style.left = (t.xPct - t.width/2) + '%';
      el.style.top = (t.yPct - t.height/2) + '%';
      el.style.width = t.width + '%';
      el.style.height = t.height + '%';
      el.style.background = t.color || '#4a8fe0';
      el.style.border = '2px solid rgba(255,255,255,0.6)';
      el.style.borderRadius = '4px';
      el.style.cursor = 'pointer';
      el.style.zIndex = 5;
      el.style.boxSizing = 'border-box';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = '9px';
      el.style.color = '#fff';
      el.style.fontWeight = '600';
      el.style.textShadow = '0 1px 3px rgba(0,0,0,0.5)';
      el.style.transition = 'transform 0.15s';
      el.textContent = t.label || 'Стол';
      el.setAttribute('data-target', t.target);
      el.addEventListener('mouseenter', function() { this.style.transform = 'scale(1.2)'; this.style.zIndex = 10; });
      el.addEventListener('mouseleave', function() { this.style.transform = 'scale(1)'; this.style.zIndex = 5; });
      el.addEventListener('click', function (ev) { 
        ev.stopPropagation(); 
        var s = findScene(t.target); 
        if (s) { switchScene(s); if (fullOverlay) fullOverlay.style.display = 'none'; } 
      });
      zoom.appendChild(el); 
    });
    return { zoom: zoom, img: img };
  }
  
  function mapSelectorHtml(cls) {
    if (maps.length < 2) return '<span class="' + cls + '-name">🗺 ' + (maps[0] ? maps[0].name : 'Карта') + '</span>';
    return '<select class="' + cls + '-sel">' + maps.map(function (m, i) { return '<option value="' + i + '">🗺 ' + m.name + '</option>'; }).join('') + '</select>';
  }
  function highlightPins() { 
    allPins.concat(fullPins).forEach(function (el) { 
      el.classList.toggle('current', current && el.getAttribute('data-target') === current.data.id); 
    }); 
  }
  
  function showMini(idx) {
    miniIdx = idx; stage.innerHTML = ''; allPins = [];
    var md = buildMapDom(maps[idx], 'mini', allPins); stage.appendChild(md.zoom);
    md.img.addEventListener('load', function () { zApi.reset(); });
    zApi.reset();
    var sel = mini.querySelector('.vmini-sel'); if (sel) sel.value = idx;
    highlightPins();
  }
  function showFull(idx) {
    fstage.innerHTML = ''; fullPins = [];
    var md = buildMapDom(maps[idx], 'full', fullPins); fstage.appendChild(md.zoom);
    md.img.addEventListener('load', function () { fApi.reset(); });
    fApi.reset();
    var sel = fullOverlay.querySelector('.vmf-sel'); if (sel) sel.value = idx;
    highlightPins();
  }
  function mapIdxForScene(id) { for (var i = 0; i < maps.length; i++) if ((maps[i].pins || []).some(function (p) { return p.target === id; }) || (maps[i].tables || []).some(function (t) { return t.target === id; })) return i; return -1; }

  if (maps.length) {
    mini = ce('div', 'vmini', '<div class="vmini-head">' + mapSelectorHtml('vmini') + '<span class="vmini-tools"><button class="vmini-bt" data-a="x2" title="2×">2×</button><button class="vmini-bt" data-a="full" title="Во весь экран">⛶</button><button class="vmini-bt vmini-close" title="Свернуть">✕</button></span></div><div class="vmini-stage"></div>');
    document.body.appendChild(mini);
    var miniBtn = ce('button', 'vmini-btn'); miniBtn.textContent = '🗺'; miniBtn.style.display = 'none'; document.body.appendChild(miniBtn);
    stage = mini.querySelector('.vmini-stage');
    zApi = makeZoomable(stage, function () { return stage.querySelector('.vmap-zoom'); });
    showMini(0);
    var msel = mini.querySelector('.vmini-sel'); if (msel) msel.addEventListener('change', function () { showMini(+msel.value); });
    mini.querySelector('[data-a="x2"]').addEventListener('click', function () { zApi.setScale(zApi.scale > 1.5 ? 1 : 2); });
    mini.querySelector('.vmini-close').addEventListener('click', function () { mini.style.display = 'none'; miniBtn.style.display = ''; });
    miniBtn.addEventListener('click', function () { mini.style.display = ''; miniBtn.style.display = 'none'; });

    fullOverlay = ce('div', 'vmap-full'); fullOverlay.style.display = 'none';
    fullOverlay.innerHTML = '<div class="vmap-full-bar">' + mapSelectorHtml('vmf') + '<span class="vmf-hint">колесо / щипок — зум · перетаскивание — двигать</span><button class="vmf-close">✕</button></div><div class="vmap-full-stage"></div>';
    document.body.appendChild(fullOverlay);
    fstage = fullOverlay.querySelector('.vmap-full-stage');
    fApi = makeZoomable(fstage, function () { return fstage.querySelector('.vmap-zoom'); });
    var fsel = fullOverlay.querySelector('.vmf-sel'); if (fsel) fsel.addEventListener('change', function () { showFull(+fsel.value); });
    mini.querySelector('[data-a="full"]').addEventListener('click', function () { fullOverlay.style.display = 'flex'; showFull(miniIdx); });
    fullOverlay.querySelector('.vmf-close').addEventListener('click', function () { fullOverlay.style.display = 'none'; });
  }
  function updateMini() {
    if (current && maps.length > 1 && mini) { var idx = mapIdxForScene(current.data.id); if (idx >= 0 && idx !== miniIdx) { showMini(idx); return; } }
    highlightPins();
  }

  function entryView(d, fromId) { return (fromId && d.entryViews && d.entryViews[fromId]) ? d.entryViews[fromId] : d.initialViewParameters; }
  function switchScene(s) { 
    closeInfoPopups(); 
    regPopup.style.display = 'none'; 
    if (current !== s) playTransition(); 
    buildRegionsFor(s); 
    s.view.setParameters(s.data.initialViewParameters); 
    s.scene.switchTo({ transitionDuration: 600 }); 
    current = s; 
    updateSidebar(); 
    updateMini(); 
    restartAutorotate();
  }

  function shortAngle(a, b) { var d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; }
  function warpToScene(s, fromHs) {
    if (!current) { switchScene(s); return; }
    var fromId = current.data.id;
    closeInfoPopups(); regPopup.style.display = 'none'; playTransition();
    var v = current.view, sy = v.yaw(), sp = v.pitch(), sf = v.fov();
    var ty = (fromHs && fromHs.yaw != null) ? fromHs.yaw : sy, tp = (fromHs && fromHs.pitch != null) ? fromHs.pitch : sp;
    var tf = sf * 0.35, dur = 420, t0 = performance.now();
    try { viewer.controls().disable(); } catch (e) {}
    function step(now) {
      var k = Math.min(1, (now - t0) / dur), e = k * k;
      v.setYaw(sy + shortAngle(sy, ty) * e); v.setPitch(sp + (tp - sp) * e); v.setFov(sf + (tf - sf) * e);
      if (k < 1) requestAnimationFrame(step); else emerge();
    }
    function emerge() {
      buildRegionsFor(s);
      var ip = entryView(s.data, fromId);
      s.view.setParameters({ yaw: ip.yaw, pitch: ip.pitch, fov: ip.fov * 0.45 });
      s.scene.switchTo({ transitionDuration: 480 });
      current = s; updateSidebar(); updateMini();
      var nv = s.view, n0 = performance.now(), nsf = nv.fov(), ntf = ip.fov;
      function step2(now2) {
        var k2 = Math.min(1, (now2 - n0) / 520), e2 = 1 - (1 - k2) * (1 - k2);
        nv.setFov(nsf + (ntf - nsf) * e2);
        if (k2 < 1) requestAnimationFrame(step2); else { try { viewer.controls().enable(); } catch (e) {} }
      }
      requestAnimationFrame(step2);
    }
    requestAnimationFrame(step);
  }

  var homeCfg = data.home;
  var homeOn = !!(homeCfg && homeCfg.enabled && homeCfg.buttons && homeCfg.buttons.length);
  var homeEl = null, sectionEl = null, menuBack = null, tourReady = false;
  function homePresetBg(preset) {
    if (preset === 'night') return 'linear-gradient(165deg,#16324d 0%,#0b121c 100%)';
    if (preset === 'steel') return 'linear-gradient(165deg,#3d4550 0%,#14181d 100%)';
    if (preset === 'plain') return '#12161c';
    return 'linear-gradient(165deg,#6a3a16 0%,#2a170c 42%,#120e0c 100%)';
  }
  function setChrome(on) {
    document.body.classList.toggle('chrome-off', !on);
    if (menuBack) menuBack.style.display = on ? '' : 'none';
  }
  function holdTour() {
    menuOpen = true;
    autorotateRunning = false;
    if (autorotateTimeout) { clearTimeout(autorotateTimeout); autorotateTimeout = null; }
  }
  var stopVr = function () {};
  var deskStop = function () {};
  function iconHtml(id) {
    var g = data.icons && data.icons[id];
    if (!g) return '';
    var inner = g.indexOf('<') >= 0 ? g : '<path d="' + g + '"/>';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }
  /* Конец ролика накрывается началом. Нижний фон в стыке не виден. */
  function mountViewerBgLoop(parent, src, fadeSec) {
    var fade = Math.max(0.1, Math.min(1, fadeSec || 0.4));
    var alive = true;
    function make() {
      var v = ce('video', 'home-bgvid');
      v.src = src; v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
      v.style.opacity = '0'; v.style.zIndex = '1';
      v.addEventListener('error', function () { v.style.display = 'none'; });
      parent.appendChild(v);
      return v;
    }
    var front = make(), back = make(), fading = false;
    front.style.opacity = '1'; front.style.zIndex = '2';
    function kick(v) {
      if (!alive || v.style.display === 'none') return;
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    }
    kick(front);
    function swap() {
      try { front.pause(); front.currentTime = 0; } catch (e) {}
      front.style.opacity = '0'; front.style.zIndex = '1';
      var tmp = front; front = back; back = tmp;
      front.style.opacity = '1'; front.style.zIndex = '2';
      fading = false;
    }
    function startFade(use) {
      if (fading || !alive) return;
      fading = true;
      back.style.zIndex = '3'; back.style.opacity = '0';
      var went = false;
      function ramp() {
        if (went || !alive) return;
        went = true;
        var t0 = performance.now();
        function step(now) {
          if (!alive) return;
          var k = Math.min(1, (now - t0) / (use * 1000));
          back.style.opacity = String(k);
          if (k < 1) requestAnimationFrame(step);
          else { swap(); requestAnimationFrame(tick); }
        }
        requestAnimationFrame(step);
      }
      function playIn() {
        function onPlay() { back.removeEventListener('playing', onPlay); ramp(); }
        back.addEventListener('playing', onPlay);
        kick(back);
        setTimeout(ramp, 280);
      }
      var armed = false;
      function go() { if (armed || !alive) return; armed = true; playIn(); }
      back.addEventListener('seeked', go);
      setTimeout(go, 320);
      try { back.currentTime = 0; } catch (e2) { go(); }
    }
    function tick() {
      if (!alive || front.style.display === 'none') return;
      var shell = front.parentNode;
      if (shell && shell.dataset.hold === '1') { setTimeout(tick, 400); return; }
      var dur = front.duration;
      if (!fading && dur && isFinite(dur)) {
        var use = Math.min(fade, Math.max(0.12, dur * 0.45));
        var left = dur - front.currentTime;
        if (left <= use) { startFade(use); return; }
        setTimeout(tick, Math.max(120, Math.min(400, (left - use) * 500)));
        return;
      }
      setTimeout(tick, 200);
    }
    tick();
    return function () { alive = false; try { front.pause(); back.pause(); } catch (e3) {} };
  }
  /* Один фон на весь тур: меню и разделы смотрят сквозь себя в этот слой, ролик не стартует заново. */
  var tourBgReady = false;
  function fillBackdrop(root) {
    if (root) root.style.background = 'transparent';
    if (tourBgReady) return function () {};
    tourBgReady = true;
    var preset = (homeCfg && (homeCfg.bg || homePresetBg(homeCfg.preset))) || 'linear-gradient(168deg,#8f877e 0%,#6a625a 48%,#3f3b37 100%)';
    var shell = ce('div', 'home-backdrop');
    shell.id = 'tourBackdrop';
    var wash = ce('div', 'home-bg');
    if (homeCfg && homeCfg.bgImage) {
      wash.style.backgroundImage = 'url("' + String(homeCfg.bgImage).replace(/"/g, '') + '")';
      wash.style.backgroundSize = 'cover';
      wash.style.backgroundPosition = 'center';
      wash.style.backgroundColor = '#3f3b37';
    } else wash.style.background = preset;
    shell.appendChild(wash);
    document.body.appendChild(shell);
    document.documentElement.style.setProperty('--icon-scale', (homeCfg && homeCfg.iconScale) || 1);
    if (homeCfg && homeCfg.bgVideo) mountViewerBgLoop(shell, homeCfg.bgVideo, homeCfg.bgFade);
    if (homeCfg && homeCfg.effect && homeCfg.effect !== 'none') {
      var glow = ce('div', 'home-fx ' + homeCfg.effect);
      glow.style.zIndex = '5';
      shell.appendChild(glow);
    }
    return function () {};
  }
  /* Экскурсия — это панорама. Ролик прячем, но не останавливаем: в меню он продолжится. */
  function showTourFilm(on) {
    var el = document.getElementById('tourBackdrop');
    if (!el) return;
    el.style.visibility = on ? 'visible' : 'hidden';
    var vids = el.querySelectorAll('video.home-bgvid');
    if (!vids.length) return;
    if (!on) {
      /* Пока человек в панораме, ролик не декодируется. Время запоминаем. */
      el.dataset.hold = '1';
      var lead = vids[0];
      for (var i = 0; i < vids.length; i++) if (parseFloat(vids[i].style.opacity) > 0.5) lead = vids[i];
      el.dataset.t = lead && isFinite(lead.currentTime) ? String(lead.currentTime) : '0';
      el.dataset.at = String(performance.now());
      for (var j = 0; j < vids.length; j++) { try { vids[j].pause(); } catch (e) {} }
      return;
    }
    el.dataset.hold = '';
    var base = parseFloat(el.dataset.t || '0') || 0;
    var passed = el.dataset.at ? (performance.now() - parseFloat(el.dataset.at)) / 1000 : 0;
    var dur = 0;
    for (var k = 0; k < vids.length; k++) if (vids[k].duration && isFinite(vids[k].duration)) dur = vids[k].duration;
    var next = dur > 0.2 ? ((base + passed) % dur) : (base + passed);
    for (var n = 0; n < vids.length; n++) {
      var v = vids[n];
      if (parseFloat(v.style.opacity) > 0.5) {
        try { if (dur) v.currentTime = next; } catch (e2) {}
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      }
    }
  }
  function openDesk(type, title) {
    deskStop();
    var old = document.getElementById('desk');
    if (old) old.remove();
    document.body.classList.add('desk-on');
    var root = ce('div', 'home-stage');
    root.id = 'desk';
    var stopBg = fillBackdrop(root);
    var stopExtra = function () {};
    deskStop = function () { stopBg(); stopExtra(); };
    document.body.appendChild(root);
    var bar = ce('div', 'lib-bar');
    var back = ce('button', 'home-back'); back.type = 'button'; back.textContent = '← Меню'; back.style.position = 'static';
    back.addEventListener('click', function () { deskStop(); root.remove(); document.body.classList.remove('desk-on'); showHome(); });
    var h = ce('div', 'home-title'); h.textContent = title || '';
    bar.appendChild(back); bar.appendChild(h);
    root.appendChild(bar);
    var body = ce('div', 'home-ui is-library');
    root.appendChild(body);
    var tilePx = (homeCfg && homeCfg.tileScale) ? homeCfg.tileScale : 160;
    function fillBar(extra) {
      bar.innerHTML = '';
      bar.appendChild(back);
      if (extra) bar.appendChild(extra);
      bar.appendChild(h);
    }
    function tiles(list, onClick) {
      var grid = ce('div', 'lib-grid');
      grid.style.setProperty('--tile', tilePx + 'px');
      list.forEach(function (item, i) {
        var node = onClick(item);
        if (node) node.style.animationDelay = (i * 0.04) + 's';
        grid.appendChild(node);
      });
      body.appendChild(grid);
    }
    if (type === 'photos' || type === 'video') {
      var folders = (type === 'photos' ? homeCfg.photoFolders : homeCfg.videoFolders) || [];
      function showFolders() {
        body.innerHTML = '';
        h.textContent = title || (type === 'photos' ? 'Фотоархив' : 'Видеоархив');
        fillBar(null);
        tiles(folders, function (f) {
          var b = ce('button', 'lib-tile'); b.type = 'button';
          b.innerHTML = iconHtml('folder') + '<span>' + (f.title || 'Папка') + '</span>';
          b.addEventListener('click', function () { showItems(f); });
          return b;
        });
        if (!folders.length) body.innerHTML = '<div class="home-sub">Папок пока нет. Добавь их в конструкторе.</div>';
      }
      function showItems(f) {
        body.innerHTML = '';
        h.textContent = f.title || 'Папка';
        var up = ce('button', 'home-back'); up.type = 'button'; up.textContent = '← Папки'; up.style.position = 'static';
        up.addEventListener('click', showFolders);
        fillBar(up);
        tiles(f.items || [], function (it) {
          var b = ce('button', 'lib-tile'); b.type = 'button';
          if (type === 'photos' && it.src) b.innerHTML = '<img src="' + it.src + '"><span>' + (it.name || '') + '</span>';
          else b.innerHTML = iconHtml('video') + '<span>' + (it.name || 'Видео') + '</span>';
          b.addEventListener('click', function () { openSheet(it.name || f.title, '', type === 'photos' ? it.src : '', type === 'video' ? it.src : '', it.lookW, it.lookH); });
          return b;
        });
      }
      showFolders();
    } else if (type === 'info') {
      body.style.display = 'none';
      var field = ce('div', 'fact-field');
      root.appendChild(field);
      var cards = (homeCfg.infoCards || []).map(function (c, i) {
        var len = ((c.text || '') + (c.title || '')).length;
        var size = Math.max(128, Math.min(240, 120 + len * 0.35));
        var el = ce('button', 'float-card'); el.type = 'button';
        el.style.width = size + 'px'; el.style.height = size + 'px';
        el.innerHTML = (c.image ? '<img alt="" src="' + c.image + '">' : '<img class="ph" alt="">') + '<b></b>';
        var cap = el.querySelector('b');
        if (c.titleHtml) cap.innerHTML = String(c.titleHtml).replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
        else cap.textContent = c.title || 'Интересный факт';
        field.appendChild(el);
        var W0 = window.innerWidth, H0 = window.innerHeight;
          var ang = Math.random() * Math.PI * 2;
          var sp = 0.55 + Math.random() * 0.4;
          return {
          el: el, data: c, w: size, h: size, sx: 1, sy: 1, drag: null,
          x: (typeof c.xPct === 'number') ? c.xPct / 100 * W0 : (48 + (i % 4) * 220),
          y: (typeof c.yPct === 'number') ? c.yPct / 100 * H0 : (96 + Math.floor(i / 4) * 200),
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp
        };
      });
      cards.forEach(function (a) {
        a.el.addEventListener('pointerdown', function (e) {
          a.drag = { x: e.clientX, y: e.clientY, ox: a.x, oy: a.y, moved: false, lx: e.clientX, ly: e.clientY, t: performance.now() };
          try { a.el.setPointerCapture(e.pointerId); } catch (err) {}
          a.vx = 0; a.vy = 0;
        });
        a.el.addEventListener('pointermove', function (e) {
          if (!a.drag) return;
          var dx = e.clientX - a.drag.x, dy = e.clientY - a.drag.y;
          if (Math.abs(dx) + Math.abs(dy) > 8) a.drag.moved = true;
          a.x = a.drag.ox + dx; a.y = a.drag.oy + dy;
          var now = performance.now(), dt = Math.max(16, now - a.drag.t);
          a.vx = (e.clientX - a.drag.lx) / dt * 16;
          a.vy = (e.clientY - a.drag.ly) / dt * 16;
          a.drag.lx = e.clientX; a.drag.ly = e.clientY; a.drag.t = now;
        });
        a.el.addEventListener('pointerup', function () {
          if (!a.drag) return;
          var moved = a.drag.moved;
          a.drag = null;
          a.vx = Math.max(-1.05, Math.min(1.05, a.vx));
          a.vy = Math.max(-1.05, Math.min(1.05, a.vy));
          if (Math.abs(a.vx) < 0.45) a.vx = a.vx < 0 ? -0.45 : 0.45;
          if (Math.abs(a.vy) < 0.45) a.vy = a.vy < 0 ? -0.45 : 0.45;
          if (!moved) {
            a.el.classList.add('is-read');
            openFact(a.data);
          }
        });
      });
      var run = true;
      function tick() {
        if (!run) return;
        var W = field.clientWidth || window.innerWidth, H = field.clientHeight || window.innerHeight;
        for (var i = 0; i < cards.length; i++) {
          var a = cards[i];
          if (!a.drag) {
            a.x += a.vx; a.y += a.vy;
            a.vx = Math.max(-1.05, Math.min(1.05, a.vx));
            a.vy = Math.max(-1.05, Math.min(1.05, a.vy));
            if (Math.abs(a.vx) < 0.45) a.vx = a.vx < 0 ? -0.45 : 0.45;
            if (Math.abs(a.vy) < 0.45) a.vy = a.vy < 0 ? -0.45 : 0.45;
            if (a.x < 8) { a.x = 8; a.vx = Math.abs(a.vx); a.sx = 0.8; a.sy = 1.14; }
            if (a.x + a.w > W - 8) { a.x = W - a.w - 8; a.vx = -Math.abs(a.vx); a.sx = 0.8; a.sy = 1.14; }
            if (a.y < 64) { a.y = 64; a.vy = Math.abs(a.vy); a.sy = 0.76; a.sx = 1.16; }
            if (a.y + a.h > H - 8) { a.y = H - a.h - 8; a.vy = -Math.abs(a.vy); a.sy = 0.76; a.sx = 1.16; }
            for (var j = i + 1; j < cards.length; j++) {
              var b = cards[j];
              if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
                var ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
                var oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
                if (ox < oy) {
                  var svx = a.vx; a.vx = b.vx; b.vx = svx;
                  a.sx = 0.82; b.sx = 0.82; a.sy = 1.12; b.sy = 1.12;
                  if (a.x < b.x) { a.x -= 3; b.x += 3; } else { a.x += 3; b.x -= 3; }
                } else {
                  var svy = a.vy; a.vy = b.vy; b.vy = svy;
                  a.sy = 0.78; b.sy = 0.78; a.sx = 1.14; b.sx = 1.14;
                  if (a.y < b.y) { a.y -= 3; b.y += 3; } else { a.y += 3; b.y -= 3; }
                }
              }
            }
          }
          a.sx += (1 - a.sx) * 0.16;
          a.sy += (1 - a.sy) * 0.16;
          a.el.style.left = a.x + 'px';
          a.el.style.top = a.y + 'px';
          a.el.style.transform = 'scale(' + a.sx.toFixed(3) + ',' + a.sy.toFixed(3) + ')';
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      stopExtra = function () { run = false; };
      if (!cards.length) field.innerHTML = '<div class="home-sub">Фактов пока нет.</div>';
    }
    function openLook(titleText, src, isVideo, lookW, lookH) {
      var sheet = ce('div', 'sheet look-sheet');
      var frame = ce('div', 'look');
      var media = ce('div', 'look-media');
      var ww = lookW || (homeCfg && (isVideo ? homeCfg.videoWinW : homeCfg.photoWinW)) || 78;
      var hh = lookH || (homeCfg && (isVideo ? homeCfg.videoWinH : homeCfg.photoWinH)) || 80;
      media.style.width = ww + 'vw';
      media.style.height = hh + 'vh';
      if (isVideo) { var v = ce('video'); v.src = src; v.controls = true; v.autoplay = true; media.appendChild(v); }
      else { var im = ce('img'); im.alt = ''; im.src = src; media.appendChild(im); }
      var cap = ce('div', 'look-cap');
      cap.textContent = titleText || '';
      var x = ce('button', 'look-x'); x.type = 'button'; x.textContent = '✕';
      x.addEventListener('click', function () { sheet.remove(); });
      frame.appendChild(media); frame.appendChild(cap);
      sheet.appendChild(frame); sheet.appendChild(x);
      sheet.addEventListener('click', function (e) { if (e.target === sheet) sheet.remove(); });
      document.body.appendChild(sheet);
    }
    function openFact(c) {
      var sheet = ce('div', 'sheet');
      var card = ce('div', 'fact-win');
      if (c.winW) card.style.width = Math.max(220, c.winW) + 'px';
      if (c.winH) card.style.height = Math.max(160, c.winH) + 'px';
      var h = ce('h2');
      if (c.titleHtml) h.innerHTML = String(c.titleHtml).replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
      else h.textContent = c.title || '';
      var body = ce('div', 'fact-body');
      if (c.textHtml) body.innerHTML = String(c.textHtml).replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
      else body.textContent = c.text || '';
      card.appendChild(h); card.appendChild(body);
      if (c.video) { var v = ce('video'); v.src = c.video; v.controls = true; card.appendChild(v); }
      else if (c.windowImage) { var im = ce('img'); im.alt = ''; im.src = c.windowImage; card.appendChild(im); }
      var x = ce('button', 'look-x'); x.type = 'button'; x.textContent = '✕';
      x.addEventListener('click', function () { sheet.remove(); });
      sheet.appendChild(card); sheet.appendChild(x);
      sheet.addEventListener('click', function (e) { if (e.target === sheet) sheet.remove(); });
      document.body.appendChild(sheet);
    }
    function openSheet(titleText, text, image, video, lookW, lookH) {
      if ((image || video) && !text) openLook(titleText, video || image, !!video, lookW, lookH);
      else openFact({ title: titleText, text: text, image: image, video: video, windowImage: image });
    }
  }
  function openGameDesk(title) {
    deskStop();
    var old = document.getElementById('desk');
    if (old) old.remove();
    var play = document.getElementById('unityPlay');
    if (play) play.remove();
    document.body.classList.add('desk-on');
    holdTour();
    if (homeEl) homeEl.style.display = 'none';
    var root = ce('div', 'home-stage');
    root.id = 'desk';
    var stopBg = fillBackdrop(root);
    deskStop = function () { stopBg(); };
    var bar = ce('div', 'lib-bar');
    var back = ce('button', 'home-back');
    back.type = 'button';
    back.textContent = '← Меню';
    back.style.position = 'static';
    back.addEventListener('click', function () { root.remove(); document.body.classList.remove('desk-on'); showHome(); });
    var h = ce('div', 'home-title');
    h.textContent = title || 'Игры';
    bar.appendChild(back); bar.appendChild(h);
    root.appendChild(bar);
    var body = ce('div', 'home-ui is-library');
    var packs = (homeCfg && homeCfg.unityGames) || [];
    if (!packs.length && homeCfg && homeCfg.unityGame && homeCfg.unityGame.length) packs = [{ id: 'g0', title: 'Игра', files: homeCfg.unityGame }];
    var grid = ce('div', 'lib-grid');
    if (!packs.length) body.innerHTML = '<div class="home-sub">Игр пока нет. Добавь папку WebGL в конструкторе.</div>';
    packs.forEach(function (g) {
      var b = ce('button', 'lib-tile');
      b.type = 'button';
      b.innerHTML = iconHtml('play') + '<span>' + (g.title || 'Игра') + '</span>';
      b.addEventListener('click', function () { openUnityGame(g); });
      grid.appendChild(b);
    });
    body.appendChild(grid);
    root.appendChild(body);
    document.body.appendChild(root);
  }
  function openUnityGame(pack) {
    stopVr();
    holdTour();
    if (homeEl) homeEl.style.display = 'none';
    if (sectionEl) sectionEl.style.display = 'none';
    setChrome(false);
    var old = document.getElementById('unityPlay');
    if (old) old.remove();
    var root = ce('div', 'unity-play'); root.id = 'unityPlay';
    var frame = ce('iframe', 'unity-frame');
    frame.setAttribute('allow', 'autoplay; fullscreen; gamepad');
    var back = ce('button', 'home-back'); back.type = 'button'; back.textContent = '\u2190 \u041c\u0435\u043d\u044e';
    back.style.position = 'absolute'; back.style.top = '14px'; back.style.left = '14px'; back.style.zIndex = '3';
    back.addEventListener('click', function () { root.remove(); showHome(); });
    root.appendChild(frame); root.appendChild(back);
    document.body.appendChild(root);
    var files = (pack && pack.files) || [];
    var index = null;
    for (var i = 0; i < files.length; i++) if (/index\.html?$/i.test(files[i].path || '')) index = files[i];
    function empty(msg) {
      frame.style.display = 'none';
      var box = ce('div', 'home-ui');
      box.innerHTML = '<div class="home-title">\u0418\u0433\u0440\u0430 \u043d\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u0430</div><div class="home-sub"></div>';
      box.querySelector('.home-sub').textContent = msg;
      root.appendChild(box);
    }
    if (!index || !index.src) { empty('\u0412 \u043a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0442\u043e\u0440\u0435 \u043d\u0430\u0436\u043c\u0438 \u00ab\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043f\u0430\u043f\u043a\u0443 WebGL\u00bb.'); return; }
    if (index.src.indexOf('blob:') !== 0) { frame.src = index.src; return; }
    var map = {};
    files.forEach(function (f) { if (f.src) map[f.path] = f.src; });
    fetch(index.src).then(function (r) { return r.text(); }).then(function (html) {
      function hit(u) {
        u = String(u || '').split('?')[0].split('#')[0];
        var keys = Object.keys(map);
        for (var k = 0; k < keys.length; k++) {
          var key = keys[k];
          if (u === key || (u.length > key.length && u.slice(-key.length) === key && u.charAt(u.length - key.length - 1) === '/')) return map[key];
        }
        return '';
      }
      html = html.replace(/(src|href)=("|')([^"']+)("|')/gi, function (all, attr, q, url) {
        var b = hit(url);
        return b ? (attr + '=' + q + b + q) : all;
      });
      var shim = '<' + 'script>(function(){var MAP=' + JSON.stringify(map) + ';function hit(u){u=String(u||"").split("?")[0].split("#")[0];var ks=Object.keys(MAP);for(var i=0;i<ks.length;i++){var k=ks[i];if(u===k||(u.length>k.length&&u.slice(-k.length)===k&&u.charAt(u.length-k.length-1)==="/"))return MAP[k];}return "";}var of=window.fetch;window.fetch=function(input,init){var u=typeof input==="string"?input:(input&&input.url)||"";var b=hit(u);return of(b||input,init);};var xo=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){var b=hit(String(u||""));var args=[m,b||u];for(var i=2;i<arguments.length;i++)args.push(arguments[i]);return xo.apply(this,args);};})();<' + '/script>';
      if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, function (m) { return m + shim; });
      else html = shim + html;
      frame.srcdoc = html;
    }).catch(function () { empty('\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043a\u0440\u044b\u0442\u044c index.html \u0438\u0433\u0440\u044b.'); });
  }
  function showHome() {
    stopVr();
    deskStop();
    deskStop = function () {};
    holdTour();
    document.body.classList.remove('desk-on');
    var desk = document.getElementById('desk');
    if (desk) desk.remove();
    if (sectionEl) sectionEl.style.display = 'none';
    if (homeEl) homeEl.style.display = 'block';
    showTourFilm(true);
    setChrome(false);
  }
  function showSection(btn) {
    stopVr();
    holdTour();
    if (homeEl) homeEl.style.display = 'none';
    if (sectionEl) sectionEl.style.display = 'none';
    showTourFilm(true);
    setChrome(false);
    var isGame = btn && (btn.type === 'scheme' || btn.type === 'game' || /интерактив/i.test(btn.label || ''));
    if (isGame) { openGameDesk(btn && btn.label); return; }
    if (btn && (btn.type === 'photos' || btn.type === 'video' || btn.type === 'info')) openDesk(btn.type, btn.label);
    else {
      if (sectionEl) {
        sectionEl.style.display = 'block';
        var t = sectionEl.querySelector('.home-title');
        if (t) t.textContent = (btn && btn.label) || '';
      }
    }
  }
  function openTour() {
    if (!scenes.length) return;
    stopVr();
    menuOpen = false;
    homeEl.style.display = 'none';
    if (sectionEl) sectionEl.style.display = 'none';
    showTourFilm(false);
    setChrome(true);
    if (!tourReady) { tourReady = true; switchScene(scenes[0]); }
    else restartAutorotate();
  }
  function openVr() {
    stopVr();
    holdTour();
    setChrome(false);
    if (homeEl) homeEl.style.display = 'none';
    if (sectionEl) sectionEl.style.display = 'none';
    var videos = (homeCfg && homeCfg.videos) || [];
    var role = isMobile ? 'glasses' : 'desk';
    var myId = (role === 'glasses' ? 'g' : 'd') + Math.random().toString(36).slice(2, 7);
    var myName = role === 'glasses' ? ('Очки ' + myId.slice(-3)) : 'Пульт';
    var room = (function (s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); })(String(data.name || 'tour'));
    var peers = {}, followId = null, curId = '', deskSeen = 0, alive = true, raf = 0, poseT = 0, tickT = 0;
    var yaw = 0, pitch = 0, gLast = 0, gAccum = 0, gBeta = 90, gSeed = false, gyroOn = false;
    var root = ce('div', 'vr-root' + (role === 'glasses' ? ' glasses' : ''));
    var canvas = ce('canvas', 'vr-view');
    var pauseEl = ce('div', 'vr-pause'); pauseEl.style.display = 'none';
    var panel = ce('aside', 'vr-panel');
    var top = ce('div', 'vr-top');
    var back = ce('button', 'vr-back'); back.type = 'button'; back.textContent = '← Меню';
    var roleBtn = ce('button', 'vr-role'); roleBtn.type = 'button'; roleBtn.style.display = 'none';
    top.appendChild(back);
    var stat = ce('div', 'vr-stat'); stat.style.display = 'none';
    var code = ce('div', 'vr-code'); code.style.display = 'none';
    var list = ce('div', 'vr-list');
    var transport = ce('div', 'vr-transport');
    var playBtn = ce('button', 'vr-play'); playBtn.type = 'button'; playBtn.textContent = '▶';
    var seek = ce('input', 'vr-seek'); seek.type = 'range'; seek.min = '0'; seek.max = '1000'; seek.value = '0';
    var timeEl = ce('span', 'vr-time'); timeEl.textContent = '0:00';
    transport.appendChild(playBtn); transport.appendChild(seek); transport.appendChild(timeEl);
    var soundRow = ce('label', 'vr-sound');
    var soundBox = document.createElement('input'); soundBox.type = 'checkbox';
    soundRow.appendChild(soundBox); soundRow.appendChild(document.createTextNode(' Звук на этом экране'));
    var gridTitle = ce('div', 'vr-stat'); gridTitle.style.display = 'none';
    var grid = ce('div', 'vr-grid'); grid.style.display = 'none';
    panel.appendChild(top); panel.appendChild(list);
    panel.appendChild(transport); panel.appendChild(soundRow);
    root.appendChild(canvas); root.appendChild(pauseEl); root.appendChild(panel);
    document.body.appendChild(root);
    var video = document.createElement('video');
    video.playsInline = true; video.setAttribute('playsinline', '');
    video.muted = role !== 'glasses';
    var view = null;
    try { view = (function () {
      var gl = canvas.getContext('webgl', { alpha: false });
      if (!gl) return null;
      function sh(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; }
      var prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p;varying vec2 uv;void main(){uv=p;gl_Position=vec4(p,0.0,1.0);}'));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, 'precision mediump float;varying vec2 uv;uniform sampler2D tex;uniform float yaw,pitch,fov,aspect;void main(){float fl=1.0/tan(fov*0.5);vec3 r=normalize(vec3(uv.x*aspect,uv.y,fl));float cp=cos(pitch),sp=sin(pitch);vec3 a=vec3(r.x,r.y*cp-r.z*sp,r.y*sp+r.z*cp);float cy=cos(yaw),sy=sin(yaw);vec3 d=vec3(a.x*cy+a.z*sy,a.y,-a.x*sy+a.z*cy);float lon=atan(d.x,d.z);float lat=asin(clamp(d.y,-1.0,1.0));gl_FragColor=texture2D(tex,vec2(lon/6.2831853+0.5,0.5-lat/3.14159265));}'));
      gl.linkProgram(prog); gl.useProgram(prog);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var uY = gl.getUniformLocation(prog, 'yaw'), uP = gl.getUniformLocation(prog, 'pitch'), uF = gl.getUniformLocation(prog, 'fov'), uA = gl.getUniformLocation(prog, 'aspect');
      return { draw: function (yy, pp) {
        var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        gl.viewport(0, 0, canvas.width, canvas.height);
        if (video.readyState >= 2) { gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video); } catch (e) {} }
        gl.useProgram(prog); gl.uniform1f(uY, yy); gl.uniform1f(uP, pp); gl.uniform1f(uF, 1.15); gl.uniform1f(uA, canvas.width / Math.max(1, canvas.height));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      } };
    })(); } catch (e) { view = null; }
    function fmt(t) { t = Math.max(0, t || 0); var m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + (s < 10 ? '0' : '') + s; }
    function pctOf() { return video.duration ? Math.round(video.currentTime / video.duration * 100) : 0; }
    function paintList() {
      list.innerHTML = '';
      if (!videos.length) { list.textContent = 'В конструкторе ещё нет роликов.'; return; }
      videos.forEach(function (v) {
        var b = ce('button', 'vr-item' + (v.id === curId ? ' on' : '')); b.type = 'button'; b.textContent = v.title || 'Ролик';
        b.addEventListener('click', function () { choose(v.id, false); if (role === 'desk') pub({ kind: 'load', role: 'desk', videoId: v.id, play: false }); });
        list.appendChild(b);
      });
    }
    function choose(id, play) {
      var v = null; for (var i = 0; i < videos.length; i++) if (videos[i].id === id) v = videos[i];
      if (!v || !v.src) return;
      curId = v.id;
      if (video.getAttribute('data-id') !== v.id) { video.src = v.src; video.setAttribute('data-id', v.id); }
      video.muted = role !== 'glasses' && !soundBox.checked;
      if (play) { var p = video.play(); if (p && p.catch) p.catch(function () { pauseEl.textContent = 'Нажмите ▶'; pauseEl.style.display = ''; }); }
      else video.pause();
      paintList();
    }
    function paintPause() {
      if (!curId) { pauseEl.style.display = 'none'; return; }
      if (video.ended) { pauseEl.textContent = 'Конец ролика'; pauseEl.style.display = ''; }
      else if (video.paused) { pauseEl.textContent = 'Пауза'; pauseEl.style.display = ''; }
      else pauseEl.style.display = 'none';
      playBtn.textContent = video.paused ? '▶' : '❚❚';
      if (video.duration) seek.value = String(Math.round(video.currentTime / video.duration * 1000));
      timeEl.textContent = fmt(video.currentTime) + ' / ' + fmt(video.duration) + ' · ' + pctOf() + '%';
    }
    var bc = null, ws = null, wsOk = false;
    function pub(obj) { obj.id = myId; obj.name = myName; try { if (bc) bc.postMessage(obj); } catch (e) {} if (wsOk) mqttSend(obj); }
    function onNet(msg) {
      if (!msg || msg.id === myId) return;
      if (msg.kind === 'bye') { delete peers[msg.id]; return; }
      var p = peers[msg.id] || (peers[msg.id] = {});
      p.id = msg.id; p.name = msg.name || p.name || 'Очки'; p.role = msg.role || p.role || 'glasses'; p.seen = Date.now();
      if (msg.yaw != null) p.yaw = msg.yaw; if (msg.pitch != null) p.pitch = msg.pitch;
      if (msg.pct != null) p.pct = msg.pct; if (msg.paused != null) p.paused = msg.paused;
      if (msg.role === 'desk') deskSeen = Date.now();
      if (role !== 'glasses' || msg.role !== 'desk') return;
      if (msg.kind === 'load') choose(msg.videoId, !!msg.play);
      if (msg.kind === 'play') { choose(msg.videoId || curId, true); if (msg.t != null) video.currentTime = msg.t; }
      if (msg.kind === 'pause') video.pause();
      if (msg.kind === 'seek' && msg.t != null) video.currentTime = msg.t;
      if (msg.kind === 'tick' && msg.videoId === curId && !video.paused && msg.t != null && Math.abs(video.currentTime - msg.t) > 0.5) video.currentTime = msg.t;
    }
    try { bc = new BroadcastChannel('tbvr-' + room); bc.onmessage = function (ev) { onNet(ev.data); }; } catch (e) {}
    function encStr(s) { var u = new TextEncoder().encode(s), b = new Uint8Array(2 + u.length); b[0] = u.length >> 8; b[1] = u.length & 255; b.set(u, 2); return b; }
    function cat(parts) { var n = 0, i, p = 0, o; for (i = 0; i < parts.length; i++) n += parts[i].length; o = new Uint8Array(n); for (i = 0; i < parts.length; i++) { o.set(parts[i], p); p += parts[i].length; } return o; }
    function pkt(type, body) { var rl = [], n = body.length, d; do { d = n % 128; n = Math.floor(n / 128); if (n) d |= 128; rl.push(d); } while (n); var o = new Uint8Array(1 + rl.length + body.length); o[0] = type; for (var i = 0; i < rl.length; i++) o[1 + i] = rl[i]; o.set(body, 1 + rl.length); return o; }
    function mqttSend(obj) { var topic = 'tbvr/' + room + '/e'; ws.send(pkt(0x30, cat([encStr(topic), new TextEncoder().encode(JSON.stringify(obj))]))); }
    try {
      ws = new WebSocket('wss://broker.hivemq.com:8884/mqtt', ['mqtt']);
      ws.binaryType = 'arraybuffer';
      ws.onopen = function () { ws.send(pkt(0x10, cat([new Uint8Array([0, 4, 77, 81, 84, 84, 4, 2, 0, 30]), encStr(myId)]))); };
      ws.onmessage = function (ev) {
        var b = new Uint8Array(ev.data), type = b[0] >> 4, i = 1, mul = 1, dgt;
        do { dgt = b[i++]; } while (dgt & 128);
        if (type === 2) { wsOk = true; ws.send(pkt(0x82, cat([new Uint8Array([0, 1]), encStr('tbvr/' + room + '/e'), new Uint8Array([0])]))); pub({ kind: 'hello', role: role, yaw: yaw, pitch: pitch }); return; }
        if (type !== 3) return;
        var tlen = (b[i] << 8) | b[i + 1]; i += 2 + tlen;
        try { onNet(JSON.parse(new TextDecoder().decode(b.subarray(i)))); } catch (e2) {}
      };
      ws.onclose = function () { wsOk = false; };
    } catch (e3) { ws = null; }
    function onOrient(e) {
      if (!gyroOn || e.alpha == null || e.beta == null) return;
      if (!gSeed) { gLast = e.alpha; gAccum = 0; gBeta = e.beta; gSeed = true; return; }
      var dlt = (e.alpha - gLast) % 360; if (dlt > 180) dlt -= 360; if (dlt < -180) dlt += 360;
      gLast = e.alpha; gAccum += dlt; gBeta += (e.beta - gBeta) * 0.25;
      yaw = -gAccum * Math.PI / 180;
      pitch = (gBeta - 90) * Math.PI / 180;
      if (data.settings && data.settings.gyroInvertPitch === false) pitch = -pitch;
      if (pitch > 1.2) pitch = 1.2; if (pitch < -1.2) pitch = -1.2;
    }
    function armGyro() {
      if (gyroOn) return;
      function go() { window.addEventListener('deviceorientation', onOrient); gyroOn = true; gSeed = false; }
      if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(function (s) { if (s === 'granted') go(); }).catch(function () {});
      } else go();
    }
    if (role === 'glasses') armGyro();
    var drag = null;
    canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, yaw: yaw, pitch: pitch }; followId = null; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      yaw = drag.yaw - (e.clientX - drag.x) * 0.005;
      pitch = Math.max(-1.2, Math.min(1.2, drag.pitch - (e.clientY - drag.y) * 0.005));
    });
    canvas.addEventListener('pointerup', function () { drag = null; });
    playBtn.addEventListener('click', function () {
      if (!curId && videos[0]) choose(videos[0].id, true);
      else if (video.paused) { video.play(); if (role === 'desk') pub({ kind: 'play', role: 'desk', videoId: curId, t: video.currentTime }); }
      else { video.pause(); if (role === 'desk') pub({ kind: 'pause', role: 'desk', videoId: curId }); }
    });
    seek.addEventListener('input', function () {
      if (!video.duration) return;
      video.currentTime = video.duration * (parseInt(seek.value, 10) / 1000);
      if (role === 'desk') pub({ kind: 'seek', role: 'desk', videoId: curId, t: video.currentTime });
    });
    soundBox.addEventListener('change', function () { video.muted = role !== 'glasses' && !soundBox.checked; });
    roleBtn.addEventListener('click', function () {
      role = role === 'glasses' ? 'desk' : 'glasses';
      myName = role === 'glasses' ? ('Очки ' + myId.slice(-3)) : 'Пульт';
      root.classList.toggle('glasses', role === 'glasses');
      roleBtn.textContent = role === 'glasses' ? 'Это пульт' : 'Это очки';
      video.muted = role !== 'glasses' && !soundBox.checked;
      if (role === 'glasses') armGyro();
      var unlock = video.play(); if (unlock && unlock.then) unlock.then(function () { if (role !== 'glasses') video.pause(); }).catch(function () {});
    });
    back.addEventListener('click', showHome);
    function frame(now) {
      if (!alive) return;
      var useY = yaw, useP = pitch;
      if (role === 'desk' && followId && peers[followId] && Date.now() - peers[followId].seen < 4000) { useY = peers[followId].yaw || 0; useP = peers[followId].pitch || 0; }
      if (view) view.draw(useY, useP);
      paintPause();
      if (role === 'glasses' && now - poseT > 250) {
        poseT = now;
        pub({ kind: 'pose', role: 'glasses', yaw: yaw, pitch: pitch, pct: pctOf(), paused: video.paused, videoId: curId });
      }
      if (role === 'desk' && curId && now - tickT > 2000) { tickT = now; pub({ kind: 'tick', role: 'desk', videoId: curId, t: video.currentTime, paused: video.paused }); }
      var n = 0, html = '';
      Object.keys(peers).forEach(function (id) {
        var p = peers[id];
        if (Date.now() - p.seen > 4000) { delete peers[id]; return; }
        if (p.role !== 'glasses') return;
        n++;
        html += '<button type="button" class="vr-cell' + (followId === id ? ' on' : '') + '" data-id="' + id + '"><span class="vr-needle"><i style="transform:rotate(' + Math.round((p.yaw || 0) * 180 / Math.PI) + 'deg)"></i></span>' + p.name + ' · ' + (p.paused ? 'пауза' : (p.pct || 0) + '%') + '</button>';
      });
      if (grid._html !== html) { grid._html = html; grid.innerHTML = html || '<div class="vr-stat">Очки ещё не подключились</div>';
        grid.querySelectorAll('.vr-cell').forEach(function (el) { el.addEventListener('click', function () { followId = el.getAttribute('data-id'); }); });
      }
      var deskOn = Date.now() - deskSeen < 4000;
      root.classList.toggle('alone', role === 'glasses' && !deskOn);
      stat.textContent = 'Подключено очков: ' + n + (n ? ' · смотрят ролик' : '') + (role === 'desk' ? ' · на мониторе ' + pctOf() + '%' : '');
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    paintList();
    pub({ kind: 'hello', role: role, yaw: 0, pitch: 0 });
    if (role === 'glasses' && videos[0]) {
      curId = videos[0].id; video.src = videos[0].src; video.setAttribute('data-id', videos[0].id);
      var unlock = video.play();
      if (unlock && unlock.then) unlock.then(function () { video.pause(); }).catch(function () {});
      paintList();
    }
    stopVr = function () {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(raf);
      try { pub({ kind: 'bye', role: role }); } catch (e) {}
      try { if (bc) bc.close(); } catch (e2) {}
      try { if (ws) ws.close(); } catch (e3) {}
      window.removeEventListener('deviceorientation', onOrient);
      video.pause(); video.removeAttribute('src'); try { video.load(); } catch (e4) {}
      root.remove();
      stopVr = function () {};
    };
  }
  var kioskScreen = window.name === 'kiosk-2' ? 2 : window.name === 'kiosk-3' ? 3 : 1;
  var kioskBus = null;
  try { kioskBus = new BroadcastChannel('tb-kiosk-' + String((data && data.name) || 'tour')); } catch (eK) {}
  function screenFor(type) {
    var count = (homeCfg && homeCfg.screenCount) || 1;
    if (count < 2 || kioskScreen > 1) return 0;
    var map = (homeCfg && homeCfg.screenMap) || {};
    for (var n = 2; n <= count; n++) if (map[String(n)] === type) return n;
    return 2;
  }
  function openKioskWindow(n) {
    var w = window.open('', 'kiosk-' + n, 'width=1100,height=700');
    if (!w) return null;
    try { if (w.document.getElementById('pano')) return w; } catch (eW) { return w; }
    var html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    var base = location.href && location.href.indexOf('about:') !== 0 ? '<base href="' + location.href.replace(/"/g, '') + '">' : '';
    if (base) html = html.replace('<head>', '<head>' + base);
    w.document.open();
    w.document.write(html);
    w.document.close();
    return w;
  }
  function showKiosk(view) {
    if (view === 'tour' && scenes[0]) {
      menuOpen = false;
      tourReady = true;
      showTourFilm(false);
      setChrome(true);
      switchScene(scenes[0]);
      return;
    }
    if (view === 'vr') { openVr(); return; }
    if (view === 'scheme' || view === 'game') { openGameDesk('Игры'); return; }
    if (view === 'photos' || view === 'video' || view === 'info') { openDesk(view, view); return; }
    setChrome(false);
    var names = { info: 'Информация', photos: 'Фотоархив', scheme: 'Как устроено', video: 'Видео' };
    var hold = document.getElementById('kioskHold');
    if (!hold) { hold = ce('div', 'home-stage'); hold.id = 'kioskHold'; document.body.appendChild(hold); }
    hold.style.display = 'block';
    hold.innerHTML = '<div class="home-ui"><div class="home-title">Экран ' + kioskScreen + '</div><div class="home-sub">' + (names[view] || 'Раздел') + '</div></div>';
  }
  if (homeOn && kioskScreen === 1) {
    menuOpen = true;
    homeEl = ce('div', 'home-stage');
    fillBackdrop(homeEl);
    var fx = null;
    var ui = ce('div', 'home-ui');
    var h1 = ce('div', 'home-title');
    h1.textContent = homeCfg.title || data.name || '';
    ui.appendChild(h1);
    if (homeCfg.subtitle) {
      var sub = ce('div', 'home-sub');
      sub.textContent = homeCfg.subtitle;
      ui.appendChild(sub);
    }
    var box = ce('div', 'home-btns lay-square');
    box.style.setProperty('--cols', 3);
    box.style.setProperty('--btn-scale', homeCfg.btnScale || 1);
    box.style.setProperty('--icon-scale', homeCfg.iconScale || 1);
    homeCfg.buttons.forEach(function (btn) {
      var b = ce('button', 'home-go');
      b.type = 'button';
      var ic = ce('span', 'hi');
      var glyph = data.icons && data.icons[btn.icon];
      if (glyph) {
        var inner = glyph.indexOf('<') >= 0 ? glyph : '<path d="' + glyph + '"/>';
        ic.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
      } else ic.textContent = btn.icon || '';
      var lb = ce('span', 'go-text');
      var shown = btn.label || '', sub = btn.sub || '';
      if (!sub) { var parts = shown.match(/^(.*?)\s*\((.+)\)\s*$/); if (parts) { shown = parts[1].trim(); sub = parts[2].trim(); } }
      var t1 = ce('span', 'go-title');
      t1.textContent = shown;
      lb.appendChild(t1);
      if (sub) { var t2 = ce('span', 'go-sub'); t2.textContent = sub; lb.appendChild(t2); }
      b.appendChild(ic); b.appendChild(lb);
      b.style.opacity = String(btn.opacity == null ? 1 : btn.opacity);
      b.style.animationDelay = (box.children.length * 0.045) + 's';
      b.addEventListener('click', function () {
        var dest = screenFor(btn.type);
        if (dest) {
          openKioskWindow(dest);
          if (kioskBus) kioskBus.postMessage({ screen: dest, view: btn.type });
          return;
        }
        if (btn.type === 'tour') openTour();
        else if (btn.type === 'vr') openVr();
        else showSection(btn);
      });
      box.appendChild(b);
    });
    ui.appendChild(box);
    if ((homeCfg.screenCount || 1) > 1) {
      var openAll = ce('button', 'home-back');
      openAll.type = 'button';
      openAll.textContent = 'Открыть остальные экраны';
      openAll.style.right = '16px';
      openAll.style.left = 'auto';
      openAll.addEventListener('click', function () {
        for (var n = 2; n <= homeCfg.screenCount; n++) {
          openKioskWindow(n);
          var view = (homeCfg.screenMap && homeCfg.screenMap[String(n)]) || 'tour';
          if (kioskBus) kioskBus.postMessage({ screen: n, view: view });
        }
      });
      homeEl.appendChild(openAll);
    }
    homeEl.appendChild(ui);
    requestAnimationFrame(function () {
      var want = homeCfg.btnScale || 1;
      function apply(s) { box.style.setProperty('--btn-scale', String(s)); }
      function over() {
        var b = box.getBoundingClientRect(), r = homeEl.getBoundingClientRect();
        return b.left < r.left + 6 || b.right > r.right - 6 || b.top < r.top + 6 || b.bottom > r.bottom - 6;
      }
      apply(want);
      if (over()) {
        var lo = 0.6, hi = want, best = 0.6;
        for (var i = 0; i < 10; i++) {
          var mid = (lo + hi) / 2; apply(mid);
          if (over()) hi = mid; else { best = mid; lo = mid; }
        }
        apply(Math.round(best * 100) / 100);
      }
      var col = Math.max(80, (box.clientWidth || 1) / 3);
      var mw = homeCfg.menuW, mh = homeCfg.menuH;
      if (mw > 0 && mh > 0) {
        var nodes = box.querySelectorAll('.home-go');
        for (var n = 0; n < nodes.length; n++) {
          nodes[n].style.width = Math.round(mw * col) + 'px';
          nodes[n].style.height = Math.round(mh * col) + 'px';
          nodes[n].style.aspectRatio = 'auto';
        }
      }
    });
    document.body.appendChild(homeEl);

    sectionEl = ce('div', 'home-stage');
    sectionEl.style.display = 'none';
    sectionEl.style.background = 'transparent';
    var back = ce('button', 'home-back');
    back.type = 'button';
    back.textContent = '← Меню';
    back.addEventListener('click', showHome);
    var sui = ce('div', 'home-ui');
    sui.appendChild(ce('div', 'home-title'));
    var empty = ce('div', 'home-sub');
    empty.textContent = 'В этом разделе пока нет материалов.';
    sui.appendChild(empty);
    sectionEl.appendChild(back);
    sectionEl.appendChild(sui);
    document.body.appendChild(sectionEl);

    menuBack = ce('button', 'vmenu-back');
    menuBack.type = 'button';
    menuBack.textContent = '☰ Меню';
    menuBack.style.display = 'none';
    menuBack.addEventListener('click', showHome);
    document.body.appendChild(menuBack);
    setChrome(false);
  }

  if (kioskScreen > 1) {
    if (homeEl) homeEl.style.display = 'none';
    showKiosk((homeCfg && homeCfg.screenMap && homeCfg.screenMap[String(kioskScreen)]) || 'tour');
    if (kioskBus) kioskBus.onmessage = function (ev) {
      if (ev.data && ev.data.screen === kioskScreen) showKiosk(ev.data.view);
    };
  }

  var vboot = document.getElementById('vboot');
  (function () {
    if (!vboot) return;
    var f = vboot.querySelector('.vboot-fill'); if (f) setTimeout(function () { f.style.width = '78%'; }, 60);
    var hidden = false;
    function hide() {
      if (hidden) return; hidden = true;
      if (f) f.style.width = '100%';
      vboot.style.opacity = '0'; setTimeout(function () { vboot.style.display = 'none'; }, 450);
    }
    if (equirect && scenes[0]) { var pre = new Image(); pre.onload = function () { setTimeout(hide, 250); }; pre.onerror = hide; pre.src = scenes[0].data.image; }
    setTimeout(hide, 1800);
  })();

  if (!homeOn && scenes[0]) {
    switchScene(scenes[0]);
    setTimeout(startAutorotate, 1000);
  }
  document.addEventListener('pointerdown', pauseAutorotate);
  document.addEventListener('wheel', pauseAutorotate);
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф')) {
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
    }
  });
  if (viewer.controls) {
    viewer.controls.addEventListener('active', pauseAutorotate);
  }

  // ===== ЗАКРЫТИЕ ПОПАПОВ ПО КЛИКУ ВНЕ =====
  document.addEventListener('click', function(e) {
    var popups = document.querySelectorAll('.info-popup.open, .region-popup');
    popups.forEach(function(popup) {
      if (popup.style.display === 'none') return;
      if (!popup.contains(e.target) && !e.target.closest('.info-hotspot') && !e.target.closest('.link-hotspot') && !e.target.closest('.reg-glow')) {
        if (popup.classList.contains('info-popup')) {
          popup.classList.remove('open');
          stopAllAudio();
          stopSpeech();
        } else if (popup.classList.contains('region-popup')) {
          popup.style.display = 'none';
          stopAllAudio();
          stopSpeech();
        }
      }
    });
  });
})();