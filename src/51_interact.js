/* ============================================================ interaction == */
var INPUT = {
  keys: {}, fwd: 0, strafe: 0, jump: false, sneak: false,
  mouseL: false, mouseR: false, locked: false,
  touch: { active: false, dx: 0, dy: 0 }
};
var REACH_SURVIVAL = 4.6, REACH_CREATIVE = 6.0;

GAME.pickTarget = function () {
  var p = this.player;
  var cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
  var dx = -Math.sin(p.yaw) * cp, dy = sp, dz = -Math.cos(p.yaw) * cp;
  var reach = p.mode === 'creative' ? REACH_CREATIVE : REACH_SURVIVAL;
  return { hit: raycast(this.chunks, p.x, p.eyeY(), p.z, dx, dy, dz, reach, false), dir: [dx, dy, dz] };
};
GAME.pickMob = function (dx, dy, dz, reach) {
  var p = this.player, best = null, bestT = reach;
  var ox = p.x, oy = p.eyeY(), oz = p.z;
  for (var i = 0; i < this.ents.mobs.length; i++) {
    var m = this.ents.mobs[i], d = m.def;
    var t = rayBox(ox, oy, oz, dx, dy, dz,
      m.x - d.w - .12, m.y, m.z - d.w - .12, m.x + d.w + .12, m.y + d.h, m.z + d.w + .12);
    if (t !== null && t < bestT) { bestT = t; best = m; }
  }
  return best;
};
function rayBox(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1) {
  var tmin = 0, tmax = Infinity;
  var o = [ox, oy, oz], d = [dx, dy, dz], lo = [x0, y0, z0], hi = [x1, y1, z1];
  for (var i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-8) { if (o[i] < lo[i] || o[i] > hi[i]) return null; continue; }
    var t1 = (lo[i] - o[i]) / d[i], t2 = (hi[i] - o[i]) / d[i];
    if (t1 > t2) { var tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}

GAME.updateMining = function (dt) {
  var p = this.player;
  if (!INPUT.mouseL || this.chatOpen || UI.open || p.health <= 0) {
    this.breakTarget = null; this.breakProgress = 0;
    return;
  }
  var t = this.pickTarget();
  var hit = t.hit;
  /* attacking a mob takes priority */
  var mob = this.pickMob(t.dir[0], t.dir[1], t.dir[2], p.mode === 'creative' ? 5 : 3.4);
  if (mob && (!hit || hit.dist > 3.2)) {
    if (!this._atkCd || this._atkCd <= 0) {
      this._atkCd = 0.42;
      p.swinging = true; p.swing = 0;
      var held = p.heldId();
      var dmg = (held && isItem(held) ? ITEMS[held].damage : 1);
      if (p.mode === 'creative') dmg = 1000;
      this.ents.hurtMob(mob, dmg, p, mob.x - p.x, mob.z - p.z);
      p.damageTool(1); p.exhaust(0.1);
      if (mob.hp <= 0) {
        var idx = this.ents.mobs.indexOf(mob);
        if (idx >= 0) this.ents.killMob(mob, idx, p);
      }
    }
    this.breakTarget = null; this.breakProgress = 0;
    return;
  }
  if (!hit) { this.breakTarget = null; this.breakProgress = 0; return; }
  var key = hit.x + ',' + hit.y + ',' + hit.z;
  if (!this.breakTarget || this.breakTarget.key !== key) {
    this.breakTarget = { key: key, x: hit.x, y: hit.y, z: hit.z, id: hit.id };
    this.breakProgress = 0;
    this.breakTotal = p.mode === 'creative' ? 0.06 : breakTime(hit.id, p.heldId());
  }
  p.swinging = true;
  this.breakProgress += dt;
  this._digSnd = (this._digSnd || 0) - dt;
  if (this._digSnd <= 0) {
    this._digSnd = 0.28;
    var b = BLOCKS[hit.id];
    sfx(STEP_SOUND[b.sound] || 'dig', .3, .8 + Math.random() * .2, this.panAt(hit.x, hit.z));
    this.ents.spawnParticles('hit', hit.x + .5 + hit.nx * .55, hit.y + .5 + hit.ny * .55,
      hit.z + .5 + hit.nz * .55, hit.id, 3);
  }
  if (this.breakProgress >= this.breakTotal) {
    this.breakBlock(hit.x, hit.y, hit.z);
    this.breakTarget = null; this.breakProgress = 0;
  }
};

GAME.useItem = function () {
  var p = this.player;
  if (p.health <= 0) return;
  var t = this.pickTarget(), hit = t.hit;
  var held = p.held();
  p.swinging = true; p.swing = 0;

  /* interact with a block first */
  if (hit) {
    var bid = hit.id;
    if (!INPUT.keys['ShiftLeft']) {
      if (bid === BID.crafting_table) { openUI('table'); return; }
      if (bid === BID.furnace || bid === BID.lit_furnace) {
        UI.container = containerAt(hit.x, hit.y, hit.z, 'furnace'); openUI('furnace'); return;
      }
      if (bid === BID.chest) {
        UI.container = containerAt(hit.x, hit.y, hit.z, 'chest'); openUI('chest'); return;
      }
      if (bid === BID.tnt && held && held.id === IID.i_flint_steel) {
        this.chunks.setBlock(hit.x, hit.y, hit.z, 0);
        var self = this, ex = hit.x + .5, ey = hit.y + .5, ez = hit.z + .5;
        sfx('fuse', .8);
        setTimeout(function () { if (GAME.started) GAME.explode(ex, ey, ez, 3.4); }, 1400);
        p.damageTool(1);
        return;
      }
      if (bid === BID.note_block) {
        sfx('pop', .7, 0.6 + Math.random() * 1.6); return;
      }
    }
  }
  if (!held) return;
  var def = defOf(held.id);

  /* food */
  if (isItem(held.id) && def.food) {
    if (p.food >= 20 && def.effect !== 'clear') { return; }
    p.eatTime += 1 / 60;
    if (p.eatTime < def.eatTime) { if (p.eatTime < 0.05) sfx('eat', .4); return; }
    p.eatTime = 0;
    p.food = Math.min(20, p.food + def.food);
    p.sat = Math.min(p.food, p.sat + def.sat);
    if (def.effect === 'poison') p.hurt(1, 'ate something rotten');
    if (held.id === IID.i_milk) p.give(IID.i_bucket, 1);
    if (held.id === IID.i_mushroom_stew) p.give(IID.i_bowl, 1);
    p.consumeHeld(1);
    sfx('eat', .5, 1.2);
    updateHotbar();
    return;
  }
  /* buckets */
  if (held.id === IID.i_bucket) {
    var fl = raycast(this.chunks, p.x, p.eyeY(), p.z, t.dir[0], t.dir[1], t.dir[2], REACH_SURVIVAL, true);
    if (fl && (fl.id === BID.water || fl.id === BID.lava)) {
      this.chunks.setBlock(fl.x, fl.y, fl.z, 0);
      p.consumeHeld(1);
      p.give(fl.id === BID.water ? IID.i_water_bucket : IID.i_lava_bucket, 1);
      sfx('splash', .6); updateHotbar();
    }
    return;
  }
  if (held.id === IID.i_water_bucket || held.id === IID.i_lava_bucket) {
    if (!hit) return;
    var fx = hit.x + hit.nx, fy = hit.y + hit.ny, fz = hit.z + hit.nz;
    if (this.chunks.getBlock(fx, fy, fz) === 0) {
      this.chunks.setBlock(fx, fy, fz, held.id === IID.i_water_bucket ? BID.water : BID.lava);
      p.consumeHeld(1); p.give(IID.i_bucket, 1);
      sfx('splash', .6); updateHotbar();
    }
    return;
  }
  /* hoe makes farmland */
  if (isItem(held.id) && ITEMS[held.id].tool === 'hoe' && hit) {
    var top = this.chunks.getBlock(hit.x, hit.y, hit.z);
    if ((top === BID.grass_block || top === BID.dirt) && this.chunks.getBlock(hit.x, hit.y + 1, hit.z) === 0) {
      var wet = false;
      for (var wx = -2; wx <= 2 && !wet; wx++) for (var wz = -2; wz <= 2; wz++)
        if (this.chunks.getBlock(hit.x + wx, hit.y, hit.z + wz) === BID.water) { wet = true; break; }
      this.setBlock(hit.x, hit.y, hit.z, wet ? BID.wet_farmland : BID.farmland);
      sfx('step_gravel', .6); p.damageTool(1);
    }
    return;
  }
  /* shears on sheep / leaves handled by mining; flint & steel lights TNT above */

  /* place a block */
  if (!isItem(held.id) || ITEMS[held.id].place !== null) {
    var placeId = isItem(held.id) ? ITEMS[held.id].place : held.id;
    if (!placeId || !hit) return;
    if (this.placeBlock(hit, placeId)) {
      if (p.mode === 'survival') { p.consumeHeld(1); updateHotbar(); }
      this.processGravity();
    }
  }
};

GAME.pickBlock = function () {
  var t = this.pickTarget();
  if (!t.hit) return;
  var p = this.player;
  var id = t.hit.id;
  if (id === BID.lit_furnace) id = BID.furnace;
  for (var i = 0; i < 9; i++) if (p.inv[i] && p.inv[i].id === id) { p.sel = i; updateHotbar(); return; }
  if (p.mode === 'creative') {
    p.inv[p.sel] = new Slot(id, stackSizeOf(id));
    updateHotbar();
  } else {
    for (var j = 9; j < 36; j++) if (p.inv[j] && p.inv[j].id === id) {
      var tmp = p.inv[p.sel]; p.inv[p.sel] = p.inv[j]; p.inv[j] = tmp; updateHotbar(); return;
    }
  }
};

/* ================================================================== input == */
function initInput() {
  var cv = document.getElementById('gl');
  document.addEventListener('keydown', function (e) {
    if (GAME.chatOpen) return;
    INPUT.keys[e.code] = true;
    if (e.code === 'Escape') return;
    if (!GAME.started) return;
    if (e.code.startsWith('Digit')) {
      var n = +e.code.slice(5);
      if (n >= 1 && n <= 9) { GAME.player.sel = n - 1; updateHotbar(); showItemName(); }
    }
    if (e.code === 'KeyE') { e.preventDefault(); UI.open ? closeUI() : openUI('inv'); }
    if (e.code === 'KeyQ' && !UI.open) dropHeld(e.shiftKey);
    if (e.code === 'F3') { e.preventDefault(); GAME.showDebug = !GAME.showDebug;
      document.getElementById('debug').style.display = GAME.showDebug ? 'block' : 'none'; }
    if (e.code === 'F5') { e.preventDefault(); GAME.thirdPerson = !GAME.thirdPerson; }
    if (e.code === 'KeyT' || e.code === 'Slash') { e.preventDefault(); openChat(e.code === 'Slash' ? '/' : ''); }
    if (e.code === 'KeyF' && !UI.open) { GAME.player.fly = !GAME.player.fly && GAME.player.mode === 'creative';
      if (GAME.player.mode !== 'creative') toast('Flying is creative-mode only'); }
    if (e.code === 'ShiftLeft') GAME.player.sneak = true;
    if (e.code === 'ControlLeft') GAME.player.sprint = true;
    if (e.code === 'Space') {
      var now = performance.now();
      if (GAME.player.mode === 'creative' && now - (GAME._lastSpace || 0) < 280) {
        GAME.player.fly = !GAME.player.fly;
        GAME.player.vy = 0;
        toast(GAME.player.fly ? 'Flying' : 'Falling');
      }
      GAME._lastSpace = now;
    }
  });
  document.addEventListener('keyup', function (e) {
    INPUT.keys[e.code] = false;
    if (e.code === 'ShiftLeft') GAME.player.sneak = false;
    if (e.code === 'ControlLeft') GAME.player.sprint = false;
  });
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Escape') {
      if (GAME.chatOpen) { closeChat(); return; }
      if (UI.open) { closeUI(); return; }
      if (GAME.started && !GAME.dead) togglePause();
    }
  });
  cv.addEventListener('mousedown', function (e) {
    if (!GAME.started || GAME.dead) return;
    if (!INPUT.locked) { requestLock(); return; }
    if (e.button === 0) { INPUT.mouseL = true; }
    else if (e.button === 2) { INPUT.mouseR = true; GAME.useItem(); GAME._useCd = 0.24; }
    else if (e.button === 1) { e.preventDefault(); GAME.pickBlock(); }
  });
  document.addEventListener('mouseup', function (e) {
    if (e.button === 0) INPUT.mouseL = false;
    if (e.button === 2) { INPUT.mouseR = false; GAME.player.eatTime = 0; }
  });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('wheel', function (e) {
    if (!GAME.started || UI.open || GAME.chatOpen) return;
    var p = GAME.player;
    p.sel = (p.sel + (e.deltaY > 0 ? 1 : -1) + 9) % 9;
    updateHotbar(); showItemName();
  }, { passive: true });
  document.addEventListener('pointerlockchange', function () {
    INPUT.locked = (document.pointerLockElement === cv);
    if (!INPUT.locked && GAME.started && !UI.open && !GAME.dead && !GAME.chatOpen) togglePause(true);
  });
  document.addEventListener('mousemove', function (e) {
    if (!INPUT.locked) return;
    var s = 0.0022 * (GAME.sensitivity || 1);
    var p = GAME.player;
    p.yaw -= e.movementX * s;
    p.pitch -= e.movementY * s;
    p.pitch = clamp(p.pitch, -Math.PI / 2 + 0.001, Math.PI / 2 - 0.001);
  });
  window.addEventListener('resize', resize);
  window.addEventListener('blur', function () { INPUT.keys = {}; INPUT.mouseL = INPUT.mouseR = false; });
  initTouch();
}
function requestLock() {
  var cv = document.getElementById('gl');
  if (cv.requestPointerLock) cv.requestPointerLock();
  initAudio();
}
function readInput() {
  var i = INPUT;
  if (GAME.chatOpen || UI.open) { i.fwd = 0; i.strafe = 0; i.jump = false; return; }
  i.fwd = (i.keys['KeyW'] ? 1 : 0) - (i.keys['KeyS'] ? 1 : 0);
  i.strafe = (i.keys['KeyD'] ? 1 : 0) - (i.keys['KeyA'] ? 1 : 0);
  i.jump = !!i.keys['Space'];
  i.sneak = !!i.keys['ShiftLeft'];
  if (i.touch.active) {
    i.fwd += i.touch.fy; i.strafe += i.touch.fx;
    if (i.touch.jump) i.jump = true;
    if (i.touch.sneak) i.sneak = true;
  }
  GAME.player.sneak = i.sneak && !GAME.player.fly;
}
function dropHeld(all) {
  var p = GAME.player, s = p.held();
  if (!s) return;
  var n = all ? s.n : 1;
  var cp = Math.cos(p.pitch);
  var dx = -Math.sin(p.yaw) * cp, dz = -Math.cos(p.yaw) * cp;
  var e = new ItemEnt(s.id, n, p.x + dx * .6, p.eyeY() - .3, p.z + dz * .6, s.dur);
  e.vx = dx * 6; e.vz = dz * 6; e.vy = Math.sin(p.pitch) * 6 + 2;
  e.pickup = 1.2;
  GAME.ents.items.push(e);
  s.n -= n;
  if (s.n <= 0) p.inv[p.sel] = null;
  updateHotbar();
}
