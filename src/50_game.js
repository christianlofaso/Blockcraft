/* ==================================================================== game == */
var GAME = {
  player: null, chunks: null, ents: null,
  renderDist: 8, seed: 0, time: 1000, paused: false, started: false,
  hurtFlash: 0, breakTarget: null, breakProgress: 0, breakTotal: 0,
  lastTick: 0, fps: 0, frames: 0, fpsT: 0, dayLight: 1,
  camYaw: 0, camPitch: 0, showDebug: false, flashSlot: 0,
  chatOpen: false, dead: false, tickAcc: 0, sunDir: [0, 1, 0], skyTop: [0, 0, 0]
};
var TICKS_PER_DAY = 24000, DAY_SECONDS = 1200;

GAME.start = function (seed, mode, dist, save) {
  this.seed = seed | 0;
  this.renderDist = dist;
  this.player = new Player();
  this.player.mode = mode;
  this.ents = new EntitySystem(this);
  this.chunks = new ChunkManager(this.seed, save ? save.edits : null);
  containers.clear();
  this.time = save ? save.time : 1000;
  this.started = true; this.dead = false;
  var p = this.player;
  if (save) {
    p.x = save.px; p.y = save.py; p.z = save.pz;
    p.yaw = save.yaw; p.pitch = save.pitch;
    p.health = save.health; p.food = save.food; p.sat = save.sat;
    p.xp = save.xp || 0; p.level = save.level || 0;
    p.mode = save.mode || mode;
    p.sel = save.sel || 0;
    p.spawn = save.spawn || null;
    p.inv = (save.inv || []).map(function (s) { return s ? new Slot(s.i, s.n, s.d) : null; });
    while (p.inv.length < 36) p.inv.push(null);
    p.armor = (save.armor || []).map(function (s) { return s ? new Slot(s.i, s.n, s.d) : null; });
    while (p.armor.length < 4) p.armor.push(null);
    if (save.containers) {
      for (var k in save.containers) {
        var c = save.containers[k];
        if (c.kind === 'chest') c.items = c.items.map(function (s) { return s ? new Slot(s.i, s.n, s.d) : null; });
        else { ['input', 'fuel', 'output'].forEach(function (f) { c[f] = c[f] ? new Slot(c[f].i, c[f].n, c[f].d) : null; }); }
        containers.set(k, c);
      }
    }
    this.spawnReady = true;
  } else {
    /* Pick a habitable spawn before any chunk exists: the generator is pure,
       so we can ask it for heights directly and spiral out until we find land. */
    var probe = new WorldGen(this.seed), sx = 0.5, sz = 0.5, sy = 80;
    for (var ring = 0; ring < 220; ring++) {
      var rad = ring * 11, steps = ring ? Math.min(24, 4 + ring) : 1, found = false;
      for (var st = 0; st < steps; st++) {
        var ang = st / steps * 6.283 + ring * 0.7;
        var tx = Math.round(Math.cos(ang) * rad), tz = Math.round(Math.sin(ang) * rad);
        var th = probe.heightAt(tx, tz);
        if (th < SEA + 2 || th > 100) continue;
        var tb = probe.biomeAt(tx, tz, th);
        if (tb === BIOME.OCEAN || tb === BIOME.DEEP_OCEAN) continue;
        sx = tx + 0.5; sz = tz + 0.5; sy = th + 1.2; found = true; break;
      }
      if (found) break;
    }
    p.x = sx; p.z = sz; p.y = sy + 6;
    this.spawnReady = false;
    if (mode === 'creative') {
      var starter = [BID.grass_block, BID.stone, BID.cobblestone, BID.oak_log, BID.planks,
                     BID.glass, BID.torch, BID.crafting_table, IID.t_diamond_pickaxe];
      for (var i = 0; i < starter.length; i++) p.inv[i] = new Slot(starter[i], stackSizeOf(starter[i]));
    }
  }
  this.camYaw = p.yaw; this.camPitch = p.pitch;
  buildHotbar(); updateHotbar(); buildHud();
};

/* place the player on solid ground once the spawn chunk exists */
GAME.tryPlaceSpawn = function () {
  if (this.spawnReady) return;
  var p = this.player;
  var bx = Math.floor(p.x), bz = Math.floor(p.z);
  if (!this.chunks.isLoaded(bx, bz)) return;
  /* drop onto the first solid surface in this column (above any trees) */
  var best = null;
  for (var y = CY - 2; y > 0; y--) {
    var id = this.chunks.getBlock(bx, y, bz);
    if (!id || id === BID.water || !B_SOLID[id]) continue;
    if (this.chunks.getBlock(bx, y + 1, bz) === 0 && this.chunks.getBlock(bx, y + 2, bz) === 0) {
      best = [bx + 0.5, y + 1.02, bz + 0.5];
      break;
    }
  }
  if (!best) return;
  p.x = best[0]; p.y = best[1]; p.z = best[2];
  p.vx = p.vy = p.vz = 0;
  if (!p.spawn) p.spawn = [p.x, p.y, p.z];
  this.spawnReady = true;
  hideLoading();
};

/* ------------------------------------------------------------ block edits */
GAME.setBlock = function (x, y, z, id, quiet) {
  if (!this.chunks.setBlock(x, y, z, id)) return false;
  if (!quiet) this.checkSupport(x, y, z);
  return true;
};
GAME.checkSupport = function (x, y, z) {
  /* drop plants whose support vanished, and start falling sand/gravel */
  for (var dy = 1; dy <= 3; dy++) {
    var above = this.chunks.getBlock(x, y + dy, z);
    if (!above) break;
    var b = BLOCKS[above];
    if (b.needsSupport) {
      var below = this.chunks.getBlock(x, y + dy - 1, z);
      var ok = b.needsSupport === 'any' ? (B_SOLID[below] && B_OPAQUE[below])
                                        : b.needsSupport.indexOf(below) >= 0;
      if (!ok) {
        this.chunks.setBlock(x, y + dy, z, 0);
        var dr = blockDrops(above, 0, Math.random);
        for (var i = 0; i < dr.length; i++) this.ents.dropItem(dr[i][0], dr[i][1], x + .5, y + dy + .3, z + .5);
      }
    }
    if (b.gravity) {
      var under = this.chunks.getBlock(x, y + dy - 1, z);
      if (!under || B_REPL[under]) {
        this.chunks.setBlock(x, y + dy, z, 0);
        this.gravityQueue.push([x, y + dy - 1, z, above]);
      }
    }
    break;
  }
};
GAME.gravityQueue = [];
GAME.processGravity = function () {
  var q = this.gravityQueue;
  this.gravityQueue = [];
  for (var i = 0; i < q.length; i++) {
    var x = q[i][0], y = q[i][1], z = q[i][2], id = q[i][3];
    while (y > 0) {
      var under = this.chunks.getBlock(x, y - 1, z);
      if (under && !B_REPL[under]) break;
      y--;
    }
    this.chunks.setBlock(x, y, z, id);
    this.ents.spawnParticles('hit', x + .5, y + .5, z + .5, id, 4);
    this.checkSupport(x, y, z);
  }
};

GAME.breakBlock = function (x, y, z) {
  var id = this.chunks.getBlock(x, y, z);
  if (!id || BLOCKS[id].hardness < 0) return;
  var p = this.player;
  this.chunks.setBlock(x, y, z, 0);
  this.ents.spawnParticles('block', x, y, z, id, 16);
  var b = BLOCKS[id];
  sfx(b.sound === 'glass' ? 'glass' : 'brk', this.volAt(x, y, z), .9 + Math.random() * .2, this.panAt(x, z));
  if (p.mode === 'survival') {
    var drops = blockDrops(id, p.heldId(), Math.random);
    for (var i = 0; i < drops.length; i++)
      this.ents.dropItem(drops[i][0], drops[i][1], x + .5, y + .35, z + .5);
    if (b.xp) this.ents.orbs.push(new XPOrb(b.xp, x + .5, y + .5, z + .5));
    p.damageTool(1);
    p.exhaust(0.005);
  }
  /* chest / furnace contents spill */
  var key = x + ',' + y + ',' + z;
  var cont = containers.get(key);
  if (cont) {
    var list = cont.kind === 'chest' ? cont.items : [cont.input, cont.fuel, cont.output];
    for (var j = 0; j < list.length; j++)
      if (list[j]) this.ents.dropItem(list[j].id, list[j].n, x + .5, y + .5, z + .5, list[j].dur);
    containers.delete(key);
  }
  this.checkSupport(x, y, z);
  this.processGravity();
};

GAME.placeBlock = function (hit, id) {
  var x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  var cur = this.chunks.getBlock(x, y, z);
  if (cur && !B_REPL[cur]) return false;
  var b = BLOCKS[id];
  if (!b) return false;
  if (b.solid && playerBlocked(this.player, x, y, z)) return false;
  if (b.needsSupport) {
    var below = this.chunks.getBlock(x, y - 1, z);
    var ok = b.needsSupport === 'any' ? (B_SOLID[below] && B_OPAQUE[below]) : b.needsSupport.indexOf(below) >= 0;
    if (!ok) return false;
  }
  if (y < 0 || y >= CY) return false;
  this.setBlock(x, y, z, id);
  sfx('place', this.volAt(x, y, z), .95 + Math.random() * .15, this.panAt(x, z));
  if (b.gravity) { this.gravityQueue.push([x, y - 1, z, id]); this.chunks.setBlock(x, y, z, 0); this.processGravity(); }
  return true;
};

/* -------------------------------------------------------------- explosion */
GAME.explode = function (x, y, z, power) {
  var r = Math.ceil(power), i, j, k;
  sfx('explode', Math.min(1, this.volAt(x, y, z) * 2.2), .9 + Math.random() * .2, this.panAt(x, z));
  this.ents.spawnParticles('explode', x, y, z, 0, 70);
  var edits = [];
  for (i = -r; i <= r; i++) for (j = -r; j <= r; j++) for (k = -r; k <= r; k++) {
    var d = Math.sqrt(i * i + j * j + k * k);
    if (d > power * (0.75 + Math.random() * 0.45)) continue;
    var bx = x + i | 0, by = Math.floor(y) + j, bz = Math.floor(z) + k;
    var id = this.chunks.getBlock(bx, by, bz);
    if (!id || BLOCKS[id].hardness < 0) continue;
    if (BLOCKS[id].hardness > 25) continue;
    edits.push(bx, by, bz, 0);
    if (Math.random() < 0.22 && this.player.mode === 'survival') {
      var dr = blockDrops(id, IID.t_diamond_pickaxe, Math.random);
      for (var q = 0; q < dr.length; q++) this.ents.dropItem(dr[q][0], dr[q][1], bx + .5, by + .5, bz + .5);
    }
    if (id === BID.tnt) {
      var self = this, tx = bx + .5, ty = by + .5, tz = bz + .5;
      setTimeout(function () { if (GAME.started) GAME.explode(tx, ty, tz, 3.1); }, 120 + Math.random() * 340);
    }
  }
  if (edits.length) this.chunks.setMany(edits);
  /* knock back and hurt anything nearby */
  var p = this.player;
  var pd = Math.hypot(p.x - x, p.y + 0.9 - y, p.z - z);
  if (pd < power * 2.2) {
    var f = 1 - pd / (power * 2.2);
    if (p.hurt(Math.round(f * 26), 'was caught in an explosion')) { this.hurtFlash = 1; sfx('hurt', .9); }
    this.knockback(p, p.x - x, p.z - z, f * 16);
    p.vy += f * 9;
  }
  for (i = this.ents.mobs.length - 1; i >= 0; i--) {
    var m = this.ents.mobs[i];
    var md = Math.hypot(m.x - x, m.y - y, m.z - z);
    if (md > power * 2.2) continue;
    var mf = 1 - md / (power * 2.2);
    this.ents.hurtMob(m, mf * 30, null, m.x - x, m.z - z);
    m.vy += mf * 8;
    if (m.hp <= 0) this.ents.killMob(m, i, p);
  }
};
GAME.knockback = function (e, dx, dz, force) {
  var l = Math.hypot(dx, dz) || 1;
  e.vx += dx / l * force; e.vz += dz / l * force;
  if (e.onGround) e.vy = Math.max(e.vy, force * 0.42);
};

/* -------------------------------------------------------------- audio aid */
GAME.volAt = function (x, y, z) {
  var p = this.player;
  var d = Math.hypot(p.x - x, p.y - y, p.z - z);
  return clamp(1 - d / 26, 0, 1);
};
GAME.panAt = function (x, z) {
  var p = this.player;
  var dx = x - p.x, dz = z - p.z;
  var rx = dx * Math.cos(-p.yaw) - dz * Math.sin(-p.yaw);
  var d = Math.hypot(dx, dz) || 1;
  return clamp(rx / d, -1, 1) * 0.8;
};
GAME.lightAt = function (x, y, z, day) { return this.chunks.lightAt(x, y, z, day === undefined ? this.dayLight : day); };

/* -------------------------------------------------------------- save/load */
var SAVE_KEY = 'blockcraft.world.v1';
GAME.save = function (cb) {
  var self = this;
  this.chunks.onEdits = function (edits) {
    var p = self.player;
    function packSlot(s) { return s ? { i: s.id, n: s.n, d: s.dur } : null; }
    var conts = {};
    containers.forEach(function (c, k) {
      if (c.kind === 'chest') {
        var any = c.items.some(function (s) { return s; });
        if (any) conts[k] = { kind: 'chest', items: c.items.map(packSlot) };
      } else {
        conts[k] = { kind: 'furnace', input: packSlot(c.input), fuel: packSlot(c.fuel),
                     output: packSlot(c.output), burn: c.burn, burnMax: c.burnMax, cook: c.cook };
      }
    });
    var data = {
      v: 1, seed: self.seed, time: self.time, mode: p.mode,
      px: p.x, py: p.y, pz: p.z, yaw: p.yaw, pitch: p.pitch,
      health: p.health, food: p.food, sat: p.sat, xp: p.xp, level: p.level,
      sel: p.sel, spawn: p.spawn,
      inv: p.inv.map(packSlot), armor: p.armor.map(packSlot),
      edits: edits, containers: conts, dist: self.renderDist
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      toast('World saved');
    } catch (e) { toast('Save failed: ' + e.message); }
    if (cb) cb();
  };
  this.chunks.link.send({ t: 'edits' });
};
GAME.hasSave = function () { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } };
GAME.loadSave = function () {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; }
};
