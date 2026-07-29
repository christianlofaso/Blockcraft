/* ==================================================================== HUD == */
function buildHud() {
  buildHudIcons();
  ['hearts', 'food', 'armorbar', 'air'].forEach(function (id) {
    document.getElementById(id).innerHTML = '';
  });
  function fillRow(id, n, kind) {
    var row = document.getElementById(id);
    for (var i = 0; i < n; i++) {
      var d = document.createElement('div');
      d.className = 'icon';
      d.dataset.kind = kind;
      row.appendChild(d);
    }
  }
  fillRow('hearts', 10, 'heart');
  fillRow('food', 10, 'food');
  fillRow('armorbar', 10, 'armor');
  fillRow('air', 10, 'air');
}
var _hudSig = '', _recTimer = 0;
function updateHud(dt) {
  var p = GAME.player;
  if (!p) return;
  /* Drive the item views from the frame loop rather than from each mutation
     site, so pickups, tool wear and crafting all show up straight away. Both
     of these are signature-cached and skip the DOM when nothing changed. */
  updateHotbar();
  if (UI.open) {
    refreshInv();
    _recTimer -= dt || 0;
    if (_recTimer <= 0) { _recTimer = 0.3; refreshRecipeList(); }
  }
  var creative = p.mode === 'creative';
  var sig = [Math.ceil(p.health * 2), Math.ceil(p.food), p.armorPoints(),
             Math.ceil(p.air / 30), p.level, Math.floor(p.xp / Math.max(1, p.xpNeeded()) * 20), creative].join(',');
  if (sig !== _hudSig) {
    _hudSig = sig;
    var st = document.getElementById('stats');
    st.style.display = creative ? 'none' : 'block';
    document.getElementById('xpbar').style.display = creative ? 'none' : 'block';
    document.getElementById('xplevel').style.display = creative ? 'none' : 'block';
    if (!creative) {
      paintRow('hearts', 'heart', p.health / 2, 10);
      paintRow('food', 'food', p.food / 2, 10);
      var ap = p.armorPoints();
      paintRow('armorbar', 'armor', ap / 2, 10, ap > 0);
      var airN = p.air < 300 ? p.air / 30 : 0;
      paintRow('air', 'air', airN, 10, p.air < 300);
      document.getElementById('xpbar').firstElementChild.style.width =
        (p.xp / Math.max(1, p.xpNeeded()) * 100) + '%';
      var lv = document.getElementById('xplevel');
      lv.textContent = p.level > 0 ? String(p.level) : '';
    }
  }
  /* damage flash */
  var hurt = document.getElementById('hurt');
  hurt.style.opacity = Math.max(0, Math.min(1, GAME.hurtFlash)) * 0.9;
  /* underwater / lava overlay */
  var ov = document.getElementById('overlaytex');
  if (p.headIn === BID.water) { ov.style.opacity = .28; ov.style.background = 'linear-gradient(rgba(30,90,180,.55),rgba(10,50,140,.7))'; }
  else if (p.headIn === BID.lava) { ov.style.opacity = .92; ov.style.background = 'radial-gradient(circle,rgba(255,140,20,.85),rgba(120,20,0,1))'; }
  else if (p.sneak) { ov.style.opacity = 0; }
  else ov.style.opacity = 0;

  if (GAME.showDebug) updateDebug();
}
function paintRow(id, kind, value, max, show) {
  var row = document.getElementById(id);
  row.style.visibility = (show === false) ? 'hidden' : 'visible';
  for (var i = 0; i < max; i++) {
    var d = row.children[i];
    var v = value - i;
    var url = v >= 0.5 ? HUD_ICONS[kind] : HUD_ICONS[kind + '_empty'];
    if (d._u !== url) { d._u = url; d.style.backgroundImage = 'url(' + url + ')'; }
    d.style.opacity = (v >= 0.5) ? 1 : (v > 0 ? 0.65 : 1);
  }
}
function updateDebug() {
  var p = GAME.player, c = GAME.chunks;
  var bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  var biome = BIOME_INFO[c.biomeAt(bx, bz)];
  var facing = ['south', 'west', 'north', 'east'][(Math.round(-p.yaw / (Math.PI / 2)) % 4 + 4) % 4];
  var light = c.lightAt(bx, by + 1, bz, 1);
  var s = GAME.stats || {};
  document.getElementById('debug').textContent =
    'Blockcraft: ' + GAME.fps + ' fps   (' + (c.link.mode) + ' worker)\n' +
    'XYZ ' + p.x.toFixed(2) + ' / ' + p.y.toFixed(2) + ' / ' + p.z.toFixed(2) + '\n' +
    'Block ' + bx + ' ' + by + ' ' + bz + '   Chunk ' + (bx >> 4) + ' ' + (bz >> 4) + '\n' +
    'Facing ' + facing + '   Biome ' + (biome ? biome.name : '?') + '\n' +
    'Light ' + (light * 15).toFixed(0) + '/15   Daylight ' + GAME.dayLight.toFixed(2) +
      '   Time ' + Math.floor(GAME.time % TICKS_PER_DAY) + '\n' +
    'Chunks ' + s.chunks + '/' + c.chunks.size + '   Tris ' + (s.tris || 0) + '\n' +
    'Entities ' + GAME.ents.mobs.length + ' mobs, ' + GAME.ents.items.length + ' items, ' +
      GAME.ents.particles.length + ' particles\n' +
    'Mode ' + p.mode + (p.fly ? ' (flying)' : '') + '   Seed ' + GAME.seed;
}

/* ------------------------------------------------------------- messages -- */
var _toastT = null;
function toast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.style.opacity = 1;
  clearTimeout(_toastT);
  _toastT = setTimeout(function () { t.style.opacity = 0; }, 2200);
}
var _nameT = null;
function showItemName() {
  var s = GAME.player.held();
  var e = document.getElementById('itemname');
  if (!s) { e.style.opacity = 0; return; }
  e.textContent = labelOf(s.id);
  e.style.opacity = 1;
  clearTimeout(_nameT);
  _nameT = setTimeout(function () { e.style.opacity = 0; }, 1600);
}
var chatLines = [];
function chat(msg, color) {
  chatLines.push({ t: msg, c: color || '#fff', time: performance.now() });
  if (chatLines.length > 9) chatLines.shift();
  var box = document.getElementById('chatlog');
  box.innerHTML = '';
  for (var i = 0; i < chatLines.length; i++) {
    var d = document.createElement('div');
    d.textContent = chatLines[i].t;
    d.style.color = chatLines[i].c;
    box.appendChild(d);
  }
  clearTimeout(chat._t);
  chat._t = setTimeout(function () { document.getElementById('chatlog').innerHTML = ''; chatLines = []; }, 9000);
}
function openChat(prefix) {
  GAME.chatOpen = true;
  var bar = document.getElementById('chatbar');
  bar.style.display = 'block';
  var inp = document.getElementById('chatinput');
  inp.value = prefix || '';
  inp.focus();
  if (document.exitPointerLock) document.exitPointerLock();
}
function closeChat() {
  GAME.chatOpen = false;
  document.getElementById('chatbar').style.display = 'none';
  document.getElementById('chatinput').blur();
  if (GAME.started && !UI.open && !GAME.paused) requestLock();
}
function initChat() {
  var inp = document.getElementById('chatinput');
  inp.addEventListener('keydown', function (e) {
    e.stopPropagation();
    if (e.key === 'Enter') {
      var v = inp.value.trim();
      closeChat();
      if (v) runCommand(v);
    } else if (e.key === 'Escape') closeChat();
  });
}
function runCommand(v) {
  if (v[0] !== '/') { chat('<you> ' + v); return; }
  var a = v.slice(1).split(/\s+/), cmd = a[0].toLowerCase();
  var p = GAME.player;
  switch (cmd) {
    case 'help':
      chat('/give <item> [n] · /tp <x> <y> <z> · /time <day|night|set n>', '#ffd');
      chat('/gamemode <survival|creative> · /seed · /kill · /clear · /spawn · /heal', '#ffd');
      break;
    case 'give': {
      var id = idOf(a[1] || '');
      if (!id) { chat('Unknown item: ' + a[1], '#f88'); break; }
      var n = parseInt(a[2] || '1', 10) || 1;
      p.give(id, n); updateHotbar();
      chat('Gave ' + n + ' × ' + labelOf(id), '#bfb');
      break;
    }
    case 'tp':
      p.x = +a[1] || p.x; p.y = +a[2] || p.y; p.z = +a[3] || p.z;
      p.vx = p.vy = p.vz = 0;
      chat('Teleported', '#bfb');
      break;
    case 'time':
      if (a[1] === 'day') GAME.time = 1000;
      else if (a[1] === 'night') GAME.time = 14000;
      else if (a[1] === 'set') GAME.time = +a[2] || 0;
      else GAME.time = 1000;
      chat('Time set to ' + Math.floor(GAME.time), '#bfb');
      break;
    case 'gamemode': case 'gm':
      p.mode = (a[1] && a[1][0] === 'c') ? 'creative' : 'survival';
      if (p.mode === 'survival') p.fly = false;
      chat('Game mode: ' + p.mode, '#bfb');
      _hudSig = '';
      break;
    case 'seed': chat('Seed: ' + GAME.seed, '#bfb'); break;
    case 'kill': p.health = 0; break;
    case 'heal': p.health = p.maxHealth; p.food = 20; chat('Healed', '#bfb'); break;
    case 'clear':
      for (var i = 0; i < 36; i++) p.inv[i] = null;
      updateHotbar(); chat('Inventory cleared', '#bfb');
      break;
    case 'spawn':
      if (p.spawn) { p.x = p.spawn[0]; p.y = p.spawn[1]; p.z = p.spawn[2]; p.vy = 0; }
      break;
    case 'dist': {
      var d = clamp(parseInt(a[1], 10) || 8, 2, 20);
      GAME.renderDist = d; chat('Render distance: ' + d, '#bfb');
      break;
    }
    default: chat('Unknown command. Try /help', '#f88');
  }
}

/* ---------------------------------------------------------------- screens */
function openUI(kind) {
  UI.open = kind;
  if (kind === 'inv' || kind === 'table') updateCraftResult(kind === 'table' ? 3 : 2, kind === 'table' ? 3 : 2);
  _recSig = '';
  buildInvPanel();
  document.getElementById('inv').classList.add('on');
  if (document.exitPointerLock) document.exitPointerLock();
  INPUT.mouseL = INPUT.mouseR = false;
}
function closeUI() {
  /* return anything left in the crafting grid or on the cursor */
  var p = GAME.player;
  for (var i = 0; i < 9; i++) {
    if (UI.grid[i]) { if (p.give(UI.grid[i].id, UI.grid[i].n, UI.grid[i].dur) > 0)
      GAME.ents.dropItem(UI.grid[i].id, UI.grid[i].n, p.x, p.y + 1, p.z); UI.grid[i] = null; }
  }
  if (p.cursor) {
    if (p.give(p.cursor.id, p.cursor.n, p.cursor.dur) > 0)
      GAME.ents.dropItem(p.cursor.id, p.cursor.n, p.x, p.y + 1, p.z);
    p.cursor = null;
  }
  UI.open = null; UI.result = null; UI.container = null;
  document.getElementById('inv').classList.remove('on');
  document.getElementById('drag').style.display = 'none';
  hideTooltip();
  updateHotbar();
  if (GAME.started && !GAME.paused && !GAME.dead) requestLock();
}
function togglePause(force) {
  if (UI.open) { closeUI(); return; }
  GAME.paused = force === true ? true : !GAME.paused;
  document.getElementById('pause').classList.toggle('on', GAME.paused);
  if (!GAME.paused) requestLock();
  else if (document.exitPointerLock) document.exitPointerLock();
}
function onDeath() {
  GAME.dead = true;
  var p = GAME.player;
  document.getElementById('deathmsg').textContent = 'You ' + (p.deathCause || 'died') + '.';
  document.getElementById('dead').classList.add('on');
  if (document.exitPointerLock) document.exitPointerLock();
  /* scatter the inventory */
  if (p.mode === 'survival') {
    for (var i = 0; i < 36; i++) {
      if (p.inv[i]) { GAME.ents.dropItem(p.inv[i].id, p.inv[i].n, p.x, p.y + 1, p.z, p.inv[i].dur); p.inv[i] = null; }
    }
    for (var j = 0; j < 4; j++) {
      if (p.armor[j]) { GAME.ents.dropItem(p.armor[j].id, p.armor[j].n, p.x, p.y + 1, p.z, p.armor[j].dur); p.armor[j] = null; }
    }
    p.xp = 0; p.level = 0;
  }
  updateHotbar();
}
function respawn() {
  var p = GAME.player;
  p.health = p.maxHealth; p.food = 20; p.sat = 5; p.air = 300;
  p.vx = p.vy = p.vz = 0; p.fallStart = null;
  var s = p.spawn || [0.5, 90, 0.5];
  p.x = s[0]; p.y = s[1] + 0.2; p.z = s[2];
  GAME.dead = false;
  document.getElementById('dead').classList.remove('on');
  requestLock();
}
function hideLoading() {
  var l = document.getElementById('loading');
  l.style.transition = 'opacity .5s';
  l.style.opacity = 0;
  setTimeout(function () { l.style.display = 'none'; }, 520);
}
