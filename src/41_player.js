/* ================================================================ player == */
var PW = 0.3, PH = 1.8, EYE = 1.62, SNEAK_EYE = 1.42;
var GRAV = 30, JUMP_V = 8.6, TERM = 60;

function Slot(id, n, dur) { this.id = id; this.n = n; this.dur = dur === undefined ? 0 : dur; }
function Player() {
  this.x = 0; this.y = 80; this.z = 0;
  this.vx = 0; this.vy = 0; this.vz = 0;
  this.yaw = 0; this.pitch = 0;
  this.onGround = false; this.inWater = false; this.inLava = false; this.headIn = 0;
  this.sneak = false; this.sprint = false; this.fly = false; this.flySpeed = 11;
  this.health = 20; this.maxHealth = 20;
  this.food = 20; this.sat = 5; this.exhaustion = 0;
  this.air = 300; this.xp = 0; this.level = 0;
  this.hurtTime = 0; this.invuln = 0; this.fallStart = null;
  this.inv = new Array(36).fill(null);
  this.armor = new Array(4).fill(null);
  this.sel = 0;
  this.cursor = null;
  this.bob = 0; this.swing = 0; this.swinging = false;
  this.mode = 'survival';
  this.spawn = null;
  this.eatTime = 0;
  this.stepDist = 0;
}
Player.prototype.eyeY = function () { return this.y + (this.sneak && this.onGround ? SNEAK_EYE : EYE); };
Player.prototype.held = function () { return this.inv[this.sel]; };
Player.prototype.heldId = function () { var s = this.inv[this.sel]; return s ? s.id : 0; };
Player.prototype.armorPoints = function () {
  var p = 0;
  for (var i = 0; i < 4; i++) if (this.armor[i]) p += ITEMS[this.armor[i].id].armor || 0;
  return p;
};

/* --------------------------------------------------------------- inventory */
Player.prototype.give = function (id, n, dur) {
  n = n === undefined ? 1 : n;
  var max = stackSizeOf(id), i;
  if (max > 1) {
    for (i = 0; i < 36 && n > 0; i++) {
      var s = this.inv[i];
      if (s && s.id === id && s.n < max) { var add = Math.min(n, max - s.n); s.n += add; n -= add; }
    }
  }
  for (i = 0; i < 36 && n > 0; i++) {
    if (!this.inv[i]) {
      var add2 = Math.min(n, max);
      this.inv[i] = new Slot(id, add2, dur || (defOf(id) && defOf(id).durability ? 0 : 0));
      n -= add2;
    }
  }
  return n;                                       // leftover that didn't fit
};
Player.prototype.count = function (id) {
  var c = 0;
  for (var i = 0; i < 36; i++) if (this.inv[i] && this.inv[i].id === id) c += this.inv[i].n;
  return c;
};
Player.prototype.consumeHeld = function (n) {
  var s = this.inv[this.sel]; if (!s) return;
  s.n -= (n || 1);
  if (s.n <= 0) this.inv[this.sel] = null;
};
Player.prototype.damageTool = function (amount) {
  if (this.mode === 'creative') return;
  var s = this.inv[this.sel];
  if (!s || !isItem(s.id)) return;
  var d = ITEMS[s.id];
  if (!d.durability) return;
  s.dur += (amount || 1);
  if (s.dur >= d.durability) { this.inv[this.sel] = null; sfx('brk', .5); }
};

/* ---------------------------------------------------------------- physics */
function blockAABBs(world, x0, y0, z0, x1, y1, z1, out) {
  out.length = 0;
  var xa = Math.floor(x0), xb = Math.floor(x1);
  var ya = Math.floor(y0), yb = Math.floor(y1);
  var za = Math.floor(z0), zb = Math.floor(z1);
  for (var y = ya; y <= yb; y++) {
    for (var z = za; z <= zb; z++) {
      for (var x = xa; x <= xb; x++) {
        var id = world.getBlock(x, y, z);
        if (!id || !B_SOLID[id]) continue;
        var r = B_RENDER[id];
        if (r === 5) out.push(x + 0.0625, y, z + 0.0625, x + 0.9375, y + 1, z + 0.9375);
        else out.push(x, y, z, x + 1, y + 1, z + 1);
      }
    }
  }
  return out;
}
var _boxes = [];

Player.prototype.move = function (world, dt) {
  var self = this;
  function sweep(axis, d) {
    if (d === 0) return;
    var nx = self.x, ny = self.y, nz = self.z;
    if (axis === 0) nx += d; else if (axis === 1) ny += d; else nz += d;
    blockAABBs(world,
      Math.min(self.x, nx) - PW, Math.min(self.y, ny), Math.min(self.z, nz) - PW,
      Math.max(self.x, nx) + PW, Math.max(self.y, ny) + PH, Math.max(self.z, nz) + PW, _boxes);
    var lo, hi;
    for (var i = 0; i < _boxes.length; i += 6) {
      var bx0 = _boxes[i], by0 = _boxes[i+1], bz0 = _boxes[i+2],
          bx1 = _boxes[i+3], by1 = _boxes[i+4], bz1 = _boxes[i+5];
      if (axis === 0) {
        if (ny + PH <= by0 || ny >= by1 || nz + PW <= bz0 || nz - PW >= bz1) continue;
        if (d > 0 && self.x + PW <= bx0 + 1e-6) { if (nx + PW > bx0) { nx = bx0 - PW - 1e-4; self.vx = 0; } }
        else if (d < 0 && self.x - PW >= bx1 - 1e-6) { if (nx - PW < bx1) { nx = bx1 + PW + 1e-4; self.vx = 0; } }
      } else if (axis === 1) {
        if (nx + PW <= bx0 || nx - PW >= bx1 || nz + PW <= bz0 || nz - PW >= bz1) continue;
        if (d > 0 && self.y + PH <= by0 + 1e-6) { if (ny + PH > by0) { ny = by0 - PH - 1e-4; self.vy = 0; } }
        else if (d < 0 && self.y >= by1 - 1e-6) {
          if (ny < by1) { ny = by1 + 1e-4; self.vy = 0; self.onGround = true; }
        }
      } else {
        if (nx + PW <= bx0 || nx - PW >= bx1 || ny + PH <= by0 || ny >= by1) continue;
        if (d > 0 && self.z + PW <= bz0 + 1e-6) { if (nz + PW > bz0) { nz = bz0 - PW - 1e-4; self.vz = 0; } }
        else if (d < 0 && self.z - PW >= bz1 - 1e-6) { if (nz - PW < bz1) { nz = bz1 + PW + 1e-4; self.vz = 0; } }
      }
    }
    self.x = nx; self.y = ny; self.z = nz;
  }
  this.onGround = false;
  sweep(1, this.vy * dt);
  var oldX = this.x, oldZ = this.z;
  sweep(0, this.vx * dt);
  sweep(2, this.vz * dt);
  /* step up a single block instead of stopping dead */
  if (this.onGround && !this.fly && !this.inWater) {
    var blockedX = Math.abs((this.x - oldX) - this.vx * dt) > 1e-5;
    var blockedZ = Math.abs((this.z - oldZ) - this.vz * dt) > 1e-5;
    if (blockedX || blockedZ) {
      var sx = this.x, sy = this.y, sz = this.z, svx = this.vx, svz = this.vz;
      this.y += 0.55;
      this.x = oldX; this.z = oldZ;
      this.vx = svx; this.vz = svz;
      sweep(0, svx * dt); sweep(2, svz * dt);
      var movedMore = Math.abs(this.x - oldX) + Math.abs(this.z - oldZ) >
                      Math.abs(sx - oldX) + Math.abs(sz - oldZ) + 1e-4;
      /* settle back down */
      var okY = this.y;
      this.vy = 0; sweep(1, -0.56);
      if (!movedMore || !this.onGround) { this.x = sx; this.y = sy; this.z = sz; }
      else { this.onGround = true; }
      this.vx = svx; this.vz = svz;
    }
  }
};

Player.prototype.update = function (world, dt, input) {
  var fwd = input.fwd, str = input.strafe;
  var ey = Math.floor(this.eyeY()), fy = Math.floor(this.y + 0.1);
  var headBlock = world.getBlock(Math.floor(this.x), ey, Math.floor(this.z));
  var feetBlock = world.getBlock(Math.floor(this.x), fy, Math.floor(this.z));
  var bodyBlock = world.getBlock(Math.floor(this.x), Math.floor(this.y + 1), Math.floor(this.z));
  this.headIn = headBlock;
  this.inWater = (feetBlock === BID.water || bodyBlock === BID.water || headBlock === BID.water);
  this.inLava = (feetBlock === BID.lava || bodyBlock === BID.lava);
  var inCobweb = (feetBlock === BID.cobweb || bodyBlock === BID.cobweb);

  /* --- horizontal input --- */
  var len = Math.hypot(fwd, str);
  if (len > 1) { fwd /= len; str /= len; }
  var speed = this.sneak ? 1.45 : (this.sprint ? 5.7 : 4.35);
  if (this.fly) speed = this.flySpeed * (this.sprint ? 1.9 : 1) * (this.sneak ? .4 : 1);
  else if (this.inWater) speed = 3.1;
  else if (this.inLava) speed = 1.6;
  if (inCobweb) speed *= .25;
  if (!this.onGround && !this.fly && !this.inWater) speed *= 1.0;

  var sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
  var wx = (fwd * -sy + str * cy) * speed;
  var wz = (fwd * -cy - str * sy) * speed;

  var slip = 0.0;
  if (this.onGround) {
    var under = world.getBlock(Math.floor(this.x), Math.floor(this.y - 0.1), Math.floor(this.z));
    slip = BLOCKS[under] ? BLOCKS[under].slip : 0;
  }
  var accel = this.fly ? 12 : (this.onGround ? (slip ? 3.2 : 26) : 7);
  var drag = this.fly ? 9 : (this.onGround ? (slip ? 1.1 : 14) : (this.inWater ? 5 : 2.2));
  this.vx += (wx - this.vx) * Math.min(1, (wx || wz ? accel : drag) * dt);
  this.vz += (wz - this.vz) * Math.min(1, (wx || wz ? accel : drag) * dt);

  /* --- vertical --- */
  if (this.fly) {
    var up = (input.jump ? 1 : 0) - (input.sneak ? 1 : 0);
    this.vy += (up * this.flySpeed - this.vy) * Math.min(1, 12 * dt);
  } else if (this.inWater || this.inLava) {
    var g = this.inLava ? GRAV * 0.28 : GRAV * 0.32;
    this.vy -= g * dt;
    if (input.jump) this.vy += (this.inLava ? 9 : 13) * dt;
    else if (this.vy < -3.2) this.vy = -3.2;
    this.vy *= (1 - 2.2 * dt);
    if (input.jump && this.vy > 3.2) this.vy = 3.2;
  } else if (inCobweb) {
    this.vy -= GRAV * 0.15 * dt;
    if (this.vy < -0.8) this.vy = -0.8;
    if (input.jump) this.vy = 1.6;
  } else {
    this.vy -= GRAV * dt;
    if (this.vy < -TERM) this.vy = -TERM;
    if (input.jump && this.onGround) {
      this.vy = JUMP_V;
      if (this.sprint) { this.vx *= 1.16; this.vz *= 1.16; }
      this.exhaust(this.sprint ? 0.2 : 0.05);
    }
  }

  var wasGround = this.onGround, prevY = this.y;
  this.move(world, dt);

  /* --- fall damage --- */
  if (this.mode === 'survival' && !this.fly) {
    if (!this.onGround && this.vy < 0 && this.fallStart === null) this.fallStart = this.y;
    if (this.onGround) {
      if (this.fallStart !== null) {
        var dist = this.fallStart - this.y;
        if (dist > 3.2 && !this.inWater) {
          var dmg = Math.floor(dist - 3);
          if (dmg > 0) { this.hurt(dmg, 'fell from a high place'); sfx('hurt', .7, .8); }
        }
        this.fallStart = null;
      }
    }
    if (this.inWater || this.fly) this.fallStart = null;
    if (this.vy > 0) this.fallStart = null;
  }

  /* --- footsteps --- */
  var dxz = Math.hypot(this.x - (this._lx || this.x), this.z - (this._lz || this.z));
  this._lx = this.x; this._lz = this.z;
  if (this.onGround && dxz > 0) {
    this.stepDist += dxz;
    if (this.stepDist > 2.1) {
      this.stepDist = 0;
      var gb = world.getBlock(Math.floor(this.x), Math.floor(this.y - 0.2), Math.floor(this.z));
      var snd = BLOCKS[gb] ? STEP_SOUND[BLOCKS[gb].sound] : 'step_stone';
      sfx(snd || 'step_stone', .5, .9 + Math.random() * .25);
      this.exhaust(this.sprint ? 0.06 : 0.02);
    }
  }
  this.bob += dxz * (this.sprint ? 1.35 : 1.1);

  /* --- drowning / lava / suffocation --- */
  if (this.mode === 'survival') {
    if (headBlock === BID.water) {
      this.air -= dt * 60;
      if (this.air < 0) { this.air = 0; this._drown = (this._drown || 0) + dt;
        if (this._drown > 1) { this._drown = 0; this.hurt(2, 'drowned'); } }
    } else { this.air = Math.min(300, this.air + dt * 180); this._drown = 0; }
    if (this.inLava) { this._burn = (this._burn || 0) + dt;
      if (this._burn > 0.5) { this._burn = 0; this.hurt(4, 'tried to swim in lava'); } }
    if (B_OPAQUE[headBlock] && B_SOLID[headBlock]) {
      this._suf = (this._suf || 0) + dt;
      if (this._suf > 0.5) { this._suf = 0; this.hurt(1, 'suffocated in a wall'); }
    } else this._suf = 0;
    /* hunger + regen */
    if (this.exhaustion >= 4) {
      this.exhaustion -= 4;
      if (this.sat > 0) this.sat = Math.max(0, this.sat - 1);
      else if (this.food > 0) this.food--;
    }
    if (this.food >= 18 && this.health < this.maxHealth) {
      this._regen = (this._regen || 0) + dt;
      if (this._regen > 3.5) { this._regen = 0; this.health = Math.min(this.maxHealth, this.health + 1); this.exhaust(3); }
    } else this._regen = 0;
    if (this.food <= 0) {
      this._starve = (this._starve || 0) + dt;
      if (this._starve > 4) { this._starve = 0; if (this.health > 1) this.hurt(1, 'starved to death'); }
    }
    if (this.sprint && (this.food <= 6)) this.sprint = false;
  }
  if (this.hurtTime > 0) this.hurtTime -= dt;
  if (this.invuln > 0) this.invuln -= dt;
  if (this.swinging) { this.swing += dt * 4.2; if (this.swing >= 1) { this.swing = 0; this.swinging = false; } }
};
Player.prototype.exhaust = function (v) { if (this.mode === 'survival') this.exhaustion += v; };
Player.prototype.hurt = function (dmg, cause) {
  if (this.mode === 'creative' || this.invuln > 0 || this.health <= 0) return false;
  var ap = this.armorPoints();
  dmg = dmg * (1 - Math.min(0.8, ap * 0.04));
  this.health -= dmg;
  this.hurtTime = 0.45; this.invuln = 0.45;
  this.deathCause = cause || 'died';
  for (var i = 0; i < 4; i++) if (this.armor[i]) {
    this.armor[i].dur += 1;
    if (this.armor[i].dur >= ITEMS[this.armor[i].id].durability) this.armor[i] = null;
  }
  if (this.health <= 0) this.health = 0;
  return true;
};
Player.prototype.addXP = function (n) {
  this.xp += n;
  var need = this.xpNeeded();
  while (this.xp >= need) { this.xp -= need; this.level++; need = this.xpNeeded(); sfx('levelup', .5); }
};
Player.prototype.xpNeeded = function () {
  var l = this.level;
  return l < 16 ? 2 * l + 7 : l < 31 ? 5 * l - 38 : 9 * l - 158;
};

/* ================================================================ raycast == */
function raycast(world, ox, oy, oz, dx, dy, dz, maxDist, fluids) {
  var x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  var stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
  var tDX = Math.abs(1 / (dx || 1e-9)), tDY = Math.abs(1 / (dy || 1e-9)), tDZ = Math.abs(1 / (dz || 1e-9));
  var tMX = ((dx > 0 ? (x + 1 - ox) : (ox - x)) || 1e-9) * tDX;
  var tMY = ((dy > 0 ? (y + 1 - oy) : (oy - y)) || 1e-9) * tDY;
  var tMZ = ((dz > 0 ? (z + 1 - oz) : (oz - z)) || 1e-9) * tDZ;
  var nx = 0, ny = 0, nz = 0, t = 0;
  for (var i = 0; i < 512; i++) {
    var id = world.getBlock(x, y, z);
    if (id && (fluids || !B_LIQUID[id]) && B_RENDER[id] !== 0) {
      if (B_SOLID[id] || fluids || B_RENDER[id] === 2 || B_RENDER[id] === 4)
        return { x: x, y: y, z: z, nx: nx, ny: ny, nz: nz, id: id, dist: t };
    }
    if (tMX < tMY) {
      if (tMX < tMZ) { x += stepX; t = tMX; tMX += tDX; nx = -stepX; ny = 0; nz = 0; }
      else { z += stepZ; t = tMZ; tMZ += tDZ; nx = 0; ny = 0; nz = -stepZ; }
    } else {
      if (tMY < tMZ) { y += stepY; t = tMY; tMY += tDY; nx = 0; ny = -stepY; nz = 0; }
      else { z += stepZ; t = tMZ; tMZ += tDZ; nx = 0; ny = 0; nz = -stepZ; }
    }
    if (t > maxDist) break;
    if (y < -1 || y > CY + 1) break;
  }
  return null;
}
/* would the player's box overlap this block? */
function playerBlocked(p, bx, by, bz) {
  return !(p.x + PW <= bx || p.x - PW >= bx + 1 ||
           p.y + PH <= by || p.y >= by + 1 ||
           p.z + PW <= bz || p.z - PW >= bz + 1);
}
