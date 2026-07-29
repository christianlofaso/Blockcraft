/* ======================================================== entity updates == */
EntitySystem.prototype.update = function (dt, player, dayLight) {
  var g = this.game, world = g.chunks, i;

  /* ------------------------------------------------------------- mobs --- */
  for (i = this.mobs.length - 1; i >= 0; i--) {
    var m = this.mobs[i], d = m.def;
    m.age += dt;
    if (m.hurtT > 0) m.hurtT -= dt;
    if (m.atkCd > 0) m.atkCd -= dt;
    if (m.jumpCd > 0) m.jumpCd -= dt;

    var dx = player.x - m.x, dy = (player.y + 0.9) - (m.y + d.h * .5), dz = player.z - m.z;
    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    /* despawn far away, burn in daylight */
    if (dist > g.renderDist * 16 + 24) { this.mobs.splice(i, 1); continue; }
    if (d.burns && dayLight > 0.55 && m.y > world.heightAt(Math.floor(m.x), Math.floor(m.z)) - 0.5) {
      m.burn = (m.burn || 0) + dt;
      if (m.burn > 1) { m.burn = 0; this.hurtMob(m, 1, player); this.spawnParticles('smoke', m.x, m.y + d.h * .6, m.z, 0, 2); }
    }

    var moveX = 0, moveZ = 0, want = d.speed;
    if (d.hostile && player.mode === 'survival' && player.health > 0 && dist < 22) {
      m.target = player;
      var lit = g.lightAt(Math.floor(m.x), Math.floor(m.y + 1), Math.floor(m.z), dayLight);
      if (dist < 18) {
        var inv = 1 / (dist || 1);
        moveX = dx * inv; moveZ = dz * inv;
        m.headYaw = Math.atan2(-moveX, -moveZ);
        m.yaw = m.headYaw;
        want = d.speed * (dist > 3 ? 1.15 : 0.7);
        /* creeper: prime and detonate */
        if (d.explodes) {
          if (dist < 2.6) {
            m.fuse += dt;
            if (m.fuse > 0.12 && !m.fuseSnd) { m.fuseSnd = 1; sfx('fuse', g.volAt(m.x, m.y, m.z), 1, g.panAt(m.x, m.z)); }
            moveX = moveZ = 0;
            if (m.fuse > 1.5) {
              g.explode(m.x, m.y + 0.7, m.z, 3.1);
              this.mobs.splice(i, 1); continue;
            }
          } else { m.fuse = Math.max(0, m.fuse - dt * .8); m.fuseSnd = 0; }
        } else if (dist < 1.9 && m.atkCd <= 0) {
          m.atkCd = 1.1;
          if (player.hurt(d.dmg, 'was slain by a ' + m.type)) {
            g.knockback(player, dx, dz, 5.5);
            sfx('hurt', .8, 1);
            g.hurtFlash = 1;
          }
        }
      }
    } else {
      /* wander */
      m.wander -= dt;
      if (m.wander <= 0) {
        m.wander = 2 + Math.random() * 5;
        if (Math.random() < 0.45) { m.moveDir = null; }
        else { m.moveDir = Math.random() * 6.283; }
      }
      if (m.fleeT > 0) {
        m.fleeT -= dt;
        m.moveDir = Math.atan2(-dx, -dz);
        want = d.speed * 1.9;
      }
      if (m.moveDir !== null && m.moveDir !== undefined) {
        moveX = -Math.sin(m.moveDir); moveZ = -Math.cos(m.moveDir);
        m.yaw = m.moveDir; m.headYaw = m.yaw;
      }
    }

    var tvx = moveX * want, tvz = moveZ * want;
    var acc = m.onGround ? 14 : 3;
    m.vx += (tvx - m.vx) * Math.min(1, acc * dt);
    m.vz += (tvz - m.vz) * Math.min(1, acc * dt);

    var res = this.entityPhysics(m, dt, d.w, d.h, d.float ? GRAV * 0.42 : GRAV);
    if ((res.blockedX || res.blockedZ) && m.onGround && m.jumpCd <= 0 && (moveX || moveZ)) {
      m.vy = 7.6; m.jumpCd = 0.5;
    }
    if (m.inWater && m.vy < 1.5) m.vy += 8 * dt;
    if (m.y < -4) { this.mobs.splice(i, 1); continue; }

    var sp = Math.hypot(m.vx, m.vz);
    m.walk += sp * dt * 2.6;
    m.soundCd -= dt;
    if (m.soundCd <= 0) {
      m.soundCd = 8 + Math.random() * 14;
      var vol = g.volAt(m.x, m.y, m.z);
      if (vol > 0.02) sfx(d.sound, vol * .8, 0.92 + Math.random() * .18, g.panAt(m.x, m.z));
    }
    if (m.hp <= 0) {
      this.killMob(m, i, player);
    }
  }

  /* ------------------------------------------------------- dropped items */
  for (i = this.items.length - 1; i >= 0; i--) {
    var it = this.items[i];
    it.age += dt; it.pickup -= dt;
    it.vx *= (1 - 2.4 * dt); it.vz *= (1 - 2.4 * dt);
    this.entityPhysics(it, dt, 0.12, 0.25, GRAV);
    if (it.onGround) { it.vx *= (1 - 9 * dt); it.vz *= (1 - 9 * dt); }
    if (it.age > 300 || it.y < -6) { this.items.splice(i, 1); continue; }
    if (it.pickup <= 0 && player.health > 0) {
      /* Test against the player's body as a cylinder, not a point: an item
         resting on the ground sits ~0.8 below chest height, so a small radial
         distance can never be reached (and gravity always beats an upward
         magnet). Horizontal reach + a vertical band is what actually works. */
      var pdx = player.x - it.x, pdz = player.z - it.z;
      var pdy = (player.y + 0.95) - it.y;
      var horiz = Math.sqrt(pdx * pdx + pdz * pdz), vert = Math.abs(pdy);
      if (horiz < 1.15 && vert < 1.6) {
        var left = player.give(it.id, it.n, it.dur);
        if (left < it.n) {
          sfx('pop', .35, 1 + Math.random() * .3);
          g.flashSlot = 1;
          if (left <= 0) { this.items.splice(i, 1); continue; }
          it.n = left;
        }
      } else if (horiz < 2.6 && vert < 2.6) {
        var pull = 16 * dt / (horiz || 1);
        it.vx += pdx * pull; it.vz += pdz * pull;
        /* If the drop sits below us it can be wedged against a ledge, and a
           gentle nudge just loses to gravity — climb faster than we fall. */
        if (pdy > 0.5) {
          it.vy += GRAV * 1.12 * dt;
          if (it.vy > 4.5) it.vy = 4.5;
        }
      }
    }
    /* merge nearby identical stacks */
    if ((it.age * 60 | 0) % 20 === 0) {
      for (var j = i - 1; j >= 0; j--) {
        var o = this.items[j];
        if (o.id !== it.id) continue;
        if (Math.abs(o.x - it.x) > .7 || Math.abs(o.y - it.y) > .7 || Math.abs(o.z - it.z) > .7) continue;
        var max = stackSizeOf(it.id);
        if (o.n + it.n <= max) { o.n += it.n; this.items.splice(i, 1); break; }
      }
    }
  }

  /* ------------------------------------------------------------- orbs --- */
  for (i = this.orbs.length - 1; i >= 0; i--) {
    var ob = this.orbs[i];
    ob.age += dt;
    this.entityPhysics(ob, dt, 0.1, 0.2, GRAV * .6);
    ob.vx *= (1 - 2 * dt); ob.vz *= (1 - 2 * dt);
    var odx = player.x - ob.x, odz = player.z - ob.z;
    var ody = (player.y + 0.95) - ob.y;
    var ohor = Math.sqrt(odx * odx + odz * odz), over = Math.abs(ody);
    if (ohor < 6 && ob.age > 0.4) {
      var f = 22 * dt / (ohor || 1);
      ob.vx += odx * f; ob.vz += odz * f;
      if (ody > 0.5) {                      /* orbs fall at 0.6g — out-climb it */
        ob.vy += GRAV * 0.72 * dt;
        if (ob.vy > 5) ob.vy = 5;
      }
    }
    if (ohor < 1.3 && over < 1.7) { player.addXP(ob.amount); sfx('pop', .3, 1.6); this.orbs.splice(i, 1); continue; }
    if (ob.age > 300 || ob.y < -6) this.orbs.splice(i, 1);
  }

  /* --------------------------------------------------------- particles -- */
  for (i = this.particles.length - 1; i >= 0; i--) {
    var p = this.particles[i];
    p.life -= dt;
    if (p.life <= 0) { this.particles.splice(i, 1); continue; }
    p.vy -= GRAV * p.grav * dt * 0.55;
    p.vx *= (1 - 1.6 * dt); p.vz *= (1 - 1.6 * dt);
    var nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
    var bid = world.getBlock(Math.floor(nx), Math.floor(ny), Math.floor(nz));
    if (bid && B_SOLID[bid]) {
      if (world.getBlock(Math.floor(p.x), Math.floor(ny), Math.floor(p.z))) { p.vy = 0; ny = p.y; }
      else { p.vx = 0; p.vz = 0; nx = p.x; nz = p.z; }
      p.vx *= .4; p.vz *= .4;
    }
    p.x = nx; p.y = ny; p.z = nz;
  }
  if (this.particles.length > 2600) this.particles.splice(0, this.particles.length - 2600);

  /* ---------------------------------------------------------- spawning -- */
  this.spawnCd -= dt;
  if (this.spawnCd <= 0) {
    this.spawnCd = 1.6;
    this.trySpawn(player, dayLight);
  }
};

EntitySystem.prototype.hurtMob = function (m, dmg, player, kbx, kbz) {
  if (m.hurtT > 0.25) return;
  m.hp -= dmg;
  m.hurtT = 0.4;
  m.fleeT = 8;
  if (!m.def.hostile) m.target = null;
  var g = this.game;
  sfx('hurt', g.volAt(m.x, m.y, m.z) * .7, 1.25);
  if (kbx !== undefined) {
    var l = Math.hypot(kbx, kbz) || 1;
    m.vx += kbx / l * 6.5; m.vz += kbz / l * 6.5; m.vy = Math.max(m.vy, 4.4);
  }
  this.spawnParticles('crit', m.x, m.y + m.def.h * .6, m.z, 0, 6);
};
EntitySystem.prototype.killMob = function (m, idx, player) {
  var d = m.def, g = this.game;
  for (var k = 0; k < d.drop.length; k++) {
    var spec = d.drop[k];
    var n = spec[1] + (Math.random() * (spec[2] - spec[1] + 1) | 0);
    if (n > 0) this.items.push(new ItemEnt(idOf(spec[0]), n, m.x, m.y + d.h * .4, m.z));
  }
  if (d.xp) this.orbs.push(new XPOrb(d.xp, m.x, m.y + d.h * .5, m.z));
  this.spawnParticles('smoke', m.x, m.y + d.h * .5, m.z, 0, 10);
  sfx('hurt', g.volAt(m.x, m.y, m.z), .8);
  this.mobs.splice(idx, 1);
};

EntitySystem.prototype.trySpawn = function (player, dayLight) {
  var g = this.game, world = g.chunks;
  var night = dayLight < 0.35;
  var cap = night ? 26 : 16;
  if (this.mobs.length >= cap) return;
  for (var attempt = 0; attempt < 6; attempt++) {
    var ang = Math.random() * 6.283, r = 16 + Math.random() * 26;
    var x = Math.floor(player.x + Math.cos(ang) * r);
    var z = Math.floor(player.z + Math.sin(ang) * r);
    if (!world.isLoaded(x, z)) continue;
    var h = world.heightAt(x, z);
    if (h < 1) continue;
    var y = h + 1;
    var ground = world.getBlock(x, h, z);
    if (!B_SOLID[ground] || ground === BID.water) continue;
    if (world.getBlock(x, y, z) !== 0 || world.getBlock(x, y + 1, z) !== 0) continue;
    var light = g.lightAt(x, y, z, dayLight);
    var hostile = night && light < 0.32;
    var type;
    if (hostile) {
      if (Math.random() < .3 && y < 55) type = 'spider';
      else type = HOSTILE[(Math.random() * HOSTILE.length) | 0];
    } else {
      if (light < 0.5) continue;
      if (ground !== BID.grass_block) continue;
      if (this.countPassive() >= 11) continue;
      type = PASSIVE[(Math.random() * PASSIVE.length) | 0];
    }
    var pack = hostile ? 1 : (1 + (Math.random() * 3 | 0));
    for (var p = 0; p < pack; p++) {
      var ox = x + (Math.random() * 3 | 0) - 1, oz = z + (Math.random() * 3 | 0) - 1;
      var oh = world.heightAt(ox, oz);
      if (oh < 1 || world.getBlock(ox, oh + 1, oz) !== 0) continue;
      this.mobs.push(new Mob(type, ox + .5, oh + 1, oz + .5));
    }
    return;
  }
};
EntitySystem.prototype.countPassive = function () {
  var n = 0;
  for (var i = 0; i < this.mobs.length; i++) if (!this.mobs[i].def.hostile) n++;
  return n;
};
EntitySystem.prototype.dropItem = function (id, n, x, y, z, dur) {
  if (!id || !n) return;
  this.items.push(new ItemEnt(id, n, x, y, z, dur));
};
