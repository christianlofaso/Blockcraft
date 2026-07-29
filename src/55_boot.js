/* =================================================================== boot == */
var HELP_TEXT =
  '<b>Move</b> WASD &nbsp; <b>Jump</b> Space &nbsp; <b>Sneak</b> Shift &nbsp; <b>Sprint</b> Ctrl<br>' +
  '<b>Mine / attack</b> hold left mouse &nbsp; <b>Place / use</b> right mouse<br>' +
  '<b>Inventory</b> E &nbsp; <b>Pick block</b> middle mouse &nbsp; <b>Drop</b> Q<br>' +
  '<b>Hotbar</b> 1-9 or scroll &nbsp; <b>Chat / commands</b> T or / &nbsp; <b>Debug</b> F3<br>' +
  '<b>Fly</b> (creative) double-tap Space &nbsp; <b>Third person</b> F5 &nbsp; <b>Menu</b> Esc<br><br>' +
  'Punch a tree to get wood, craft planks, then a crafting table and tools. ' +
  'Torches keep monsters away. They spawn in the dark. Sleep is not implemented, so ' +
  'build a shelter before the first night.';

function boot() {
  document.getElementById('helptext').innerHTML = HELP_TEXT;
  document.getElementById('pausehelp').innerHTML = HELP_TEXT;
  setLoad(0.05, 'starting WebGL…');

  try { initGL(); }
  catch (e) {
    document.getElementById('loading').innerHTML =
      '<div style="max-width:520px;text-align:center;padding:20px;line-height:1.7">' +
      '<h2>WebGL 2 unavailable</h2><p style="color:#aaa;font-size:13px">' + e.message + '</p></div>';
    return;
  }
  setTimeout(function () {
    setLoad(0.2, 'painting textures…');
    buildTextures();
    uploadTextures(_texData);
    setLoad(0.55, 'compiling shaders…');
    setTimeout(function () {
      initRender();
      setLoad(0.8, 'wiring up controls…');
      initInput(); initChat(); initInvEvents();
      initMenus();
      setLoad(1, 'ready');
      setTimeout(function () {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('title').classList.add('on');
        requestAnimationFrame(frame);
      }, 200);
    }, 30);
  }, 30);
}
function setLoad(f, txt) {
  document.getElementById('loadbar').style.width = (f * 100) + '%';
  if (txt) document.getElementById('loadtxt').textContent = txt;
}

function initMenus() {
  var seedIn = document.getElementById('seedin');
  var modeIn = document.getElementById('modein');
  var distIn = document.getElementById('distin');
  var btnLoad = document.getElementById('btnload');
  btnLoad.style.display = GAME.hasSave() ? 'block' : 'none';

  document.getElementById('btnplay').onclick = function () {
    var txt = seedIn.value.trim();
    var seed;
    if (!txt) seed = (Math.random() * 2147483647) | 0;
    else if (/^-?\d+$/.test(txt)) seed = parseInt(txt, 10) | 0;
    else seed = hash32(txt.split('').reduce(function (a, c) { return (a * 31 + c.charCodeAt(0)) | 0; }, 7)) | 0;
    startGame(seed, modeIn.value, parseInt(distIn.value, 10), null);
  };
  btnLoad.onclick = function () {
    var s = GAME.loadSave();
    if (!s) { toast('No save found'); return; }
    startGame(s.seed, s.mode, s.dist || parseInt(distIn.value, 10), s);
  };
  document.getElementById('btnresume').onclick = function () { togglePause(false); };
  document.getElementById('btnsave').onclick = function () { GAME.save(); };
  document.getElementById('btnmode').onclick = function () {
    var p = GAME.player;
    p.mode = p.mode === 'creative' ? 'survival' : 'creative';
    if (p.mode === 'survival') p.fly = false;
    _hudSig = '';
    toast('Game mode: ' + p.mode);
  };
  document.getElementById('btnquit').onclick = function () {
    GAME.save(function () { location.reload(); });
  };
  document.getElementById('btnrespawn').onclick = function () { respawn(); };
  document.getElementById('btntitle').onclick = function () { GAME.save(function () { location.reload(); }); };
  document.getElementById('inv').addEventListener('mousedown', function (e) {
    if (e.target.id === 'inv') closeUI();
  });
}

function startGame(seed, mode, dist, save) {
  document.getElementById('title').classList.remove('on');
  var l = document.getElementById('loading');
  l.style.display = 'flex'; l.style.opacity = 1;
  setLoad(0.1, 'generating terrain…');
  GAME.start(seed, mode, dist, save);
  var waited = 0;
  var iv = setInterval(function () {
    waited += 0.1;
    var loaded = GAME.chunks.loadedCount;
    setLoad(Math.min(0.98, 0.1 + loaded / 30), 'generating terrain… ' + loaded + ' chunks');
    if (GAME.spawnReady || waited > 25) {
      clearInterval(iv);
      hideLoading();
      setTimeout(function () { requestLock(); }, 300);
      chat('Welcome to Blockcraft: press T for chat, /help for commands');
      if (!save) chat('Seed: ' + seed);
    }
  }, 100);
  /* autosave */
  clearInterval(GAME._autosave);
  GAME._autosave = setInterval(function () {
    if (GAME.started && !GAME.dead) GAME.save();
  }, 120000);
  window.addEventListener('beforeunload', function () {
    if (GAME.started) { try { GAME.save(); } catch (e) {} }
  });
}

/* ------------------------------------------------------------- touch UI -- */
function initTouch() {
  var isTouch = ('ontouchstart' in window) && Math.min(innerWidth, innerHeight) < 900;
  if (!isTouch) return;
  document.getElementById('touch').classList.add('on');
  GAME.maxDPR = 1;
  var stick = document.getElementById('stick'), knob = stick.firstElementChild;
  var sid = null, cx0 = 0, cy0 = 0;
  var t = INPUT.touch;
  t.active = true; t.fx = 0; t.fy = 0;

  stick.addEventListener('touchstart', function (e) {
    e.preventDefault();
    var r = stick.getBoundingClientRect();
    cx0 = r.left + r.width / 2; cy0 = r.top + r.height / 2;
    sid = e.changedTouches[0].identifier;
  }, { passive: false });
  document.addEventListener('touchmove', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var tc = e.changedTouches[i];
      if (tc.identifier === sid) {
        var dx = tc.clientX - cx0, dy = tc.clientY - cy0;
        var d = Math.min(1, Math.hypot(dx, dy) / 56);
        var a = Math.atan2(dy, dx);
        t.fx = Math.cos(a) * d; t.fy = -Math.sin(a) * d;
        knob.style.transform = 'translate(' + (Math.cos(a) * d * 40) + 'px,' + (Math.sin(a) * d * 40) + 'px)';
      } else if (tc.identifier === lookId) {
        var p = GAME.player;
        p.yaw -= (tc.clientX - lookX) * 0.006;
        p.pitch -= (tc.clientY - lookY) * 0.006;
        p.pitch = clamp(p.pitch, -1.56, 1.56);
        lookX = tc.clientX; lookY = tc.clientY;
        if (Math.abs(tc.clientX - lookStartX) + Math.abs(tc.clientY - lookStartY) > 14) lookMoved = true;
      }
    }
  }, { passive: false });
  document.addEventListener('touchend', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var tc = e.changedTouches[i];
      if (tc.identifier === sid) { sid = null; t.fx = 0; t.fy = 0; knob.style.transform = ''; }
      if (tc.identifier === lookId) {
        lookId = null;
        INPUT.mouseL = false;
        if (!lookMoved && performance.now() - lookStart < 260) { GAME.useItem(); }
      }
    }
  });
  var lookId = null, lookX = 0, lookY = 0, lookStart = 0, lookMoved = false, lookStartX = 0, lookStartY = 0;
  document.getElementById('gl').addEventListener('touchstart', function (e) {
    e.preventDefault();
    initAudio();
    var tc = e.changedTouches[0];
    if (lookId === null) {
      lookId = tc.identifier; lookX = lookStartX = tc.clientX; lookY = lookStartY = tc.clientY;
      lookStart = performance.now(); lookMoved = false;
      setTimeout(function () { if (lookId !== null && !lookMoved) INPUT.mouseL = true; }, 200);
    }
  }, { passive: false });

  function bindBtn(id, on, off) {
    var b = document.getElementById(id);
    b.addEventListener('touchstart', function (e) { e.preventDefault(); on(); }, { passive: false });
    b.addEventListener('touchend', function (e) { e.preventDefault(); if (off) off(); }, { passive: false });
  }
  bindBtn('tjump', function () { t.jump = true; }, function () { t.jump = false; });
  bindBtn('tsneak', function () { t.sneak = !t.sneak; });
  bindBtn('tinv', function () { UI.open ? closeUI() : openUI('inv'); });
  document.getElementById('hotbar').addEventListener('touchstart', function (e) {
    var s = e.target.closest('.slot');
    if (!s) return;
    e.preventDefault();
    GAME.player.sel = +s.dataset.i;
    updateHotbar(); showItemName();
  }, { passive: false });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
