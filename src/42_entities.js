/* ============================================================== entities == */
/* Mobs are built from axis-aligned boxes; `a` marks a part as animated.
   Offsets are in blocks, relative to the entity's feet centre.               */
function P(x, y, z, sx, sy, sz, col, a) {
  return { x: x, y: y, z: z, sx: sx / 2, sy: sy / 2, sz: sz / 2, c: col, a: a || 0 };
}
var C = {
  pigSkin: [0.94, 0.55, 0.55], pigSnout: [0.86, 0.44, 0.46],
  cowBody: [0.30, 0.24, 0.22], cowWhite: [0.92, 0.92, 0.90], cowHorn: [0.85, 0.82, 0.66],
  wool: [0.94, 0.94, 0.92], sheepSkin: [0.85, 0.72, 0.62],
  chick: [0.93, 0.93, 0.90], beak: [0.94, 0.66, 0.20], foot: [0.90, 0.60, 0.15],
  zSkin: [0.35, 0.60, 0.33], zShirt: [0.30, 0.52, 0.62], zPants: [0.28, 0.30, 0.55],
  bone: [0.86, 0.86, 0.82], creep: [0.35, 0.72, 0.31], creepDark: [0.24, 0.52, 0.22],
  spider: [0.22, 0.16, 0.14], spiderEye: [0.85, 0.15, 0.15], eye: [0.06, 0.06, 0.08],
  white: [1, 1, 1], nose: [0.20, 0.16, 0.14]
};
var MOBS = {
  pig: {
    hp: 10, w: 0.45, h: 0.9, speed: 1.5, hostile: false, sound: 'mob_pig',
    drop: [['i_porkchop', 1, 3]], xp: 2,
    parts: [
      P(0, 0.55, 0, 0.62, 0.55, 1.0, C.pigSkin),
      P(0, 0.62, -0.62, 0.5, 0.5, 0.4, C.pigSkin, 3),
      P(0, 0.55, -0.84, 0.25, 0.2, 0.1, C.pigSnout, 3),
      P(-0.14, 0.72, -0.84, 0.08, 0.08, 0.02, C.eye, 3),
      P(0.14, 0.72, -0.84, 0.08, 0.08, 0.02, C.eye, 3),
      P(-0.2, 0.14, -0.32, 0.22, 0.3, 0.22, C.pigSkin, 1),
      P(0.2, 0.14, -0.32, 0.22, 0.3, 0.22, C.pigSkin, 2),
      P(-0.2, 0.14, 0.32, 0.22, 0.3, 0.22, C.pigSkin, 2),
      P(0.2, 0.14, 0.32, 0.22, 0.3, 0.22, C.pigSkin, 1)
    ]
  },
  cow: {
    hp: 10, w: 0.5, h: 1.2, speed: 1.35, hostile: false, sound: 'mob_cow',
    drop: [['i_beef', 1, 3], ['i_leather', 0, 2]], xp: 2,
    parts: [
      P(0, 0.72, 0, 0.7, 0.62, 1.1, C.cowBody),
      P(0.2, 0.75, 0.2, 0.4, 0.4, 0.5, C.cowWhite),
      P(-0.25, 0.9, -0.2, 0.3, 0.3, 0.4, C.cowWhite),
      P(0, 0.92, -0.72, 0.5, 0.5, 0.42, C.cowBody, 3),
      P(0, 0.85, -0.95, 0.34, 0.26, 0.08, C.cowWhite, 3),
      P(-0.15, 1.02, -0.94, 0.08, 0.08, 0.02, C.eye, 3),
      P(0.15, 1.02, -0.94, 0.08, 0.08, 0.02, C.eye, 3),
      P(-0.26, 1.16, -0.66, 0.1, 0.1, 0.1, C.cowHorn, 3),
      P(0.26, 1.16, -0.66, 0.1, 0.1, 0.1, C.cowHorn, 3),
      P(-0.26, 0.2, -0.36, 0.24, 0.42, 0.24, C.cowBody, 1),
      P(0.26, 0.2, -0.36, 0.24, 0.42, 0.24, C.cowBody, 2),
      P(-0.26, 0.2, 0.36, 0.24, 0.42, 0.24, C.cowBody, 2),
      P(0.26, 0.2, 0.36, 0.24, 0.42, 0.24, C.cowBody, 1)
    ]
  },
  sheep: {
    hp: 8, w: 0.45, h: 1.1, speed: 1.4, hostile: false, sound: 'mob_sheep',
    drop: [['i_mutton', 1, 2], ['white_wool', 1, 1]], xp: 2,
    parts: [
      P(0, 0.68, 0, 0.72, 0.66, 1.05, C.wool),
      P(0, 0.82, -0.66, 0.42, 0.42, 0.36, C.sheepSkin, 3),
      P(0, 0.92, -0.58, 0.46, 0.34, 0.3, C.wool, 3),
      P(-0.13, 0.86, -0.83, 0.07, 0.07, 0.02, C.eye, 3),
      P(0.13, 0.86, -0.83, 0.07, 0.07, 0.02, C.eye, 3),
      P(-0.24, 0.17, -0.32, 0.2, 0.36, 0.2, C.sheepSkin, 1),
      P(0.24, 0.17, -0.32, 0.2, 0.36, 0.2, C.sheepSkin, 2),
      P(-0.24, 0.17, 0.32, 0.2, 0.36, 0.2, C.sheepSkin, 2),
      P(0.24, 0.17, 0.32, 0.2, 0.36, 0.2, C.sheepSkin, 1)
    ]
  },
  chicken: {
    hp: 4, w: 0.25, h: 0.7, speed: 1.5, hostile: false, sound: 'mob_chicken', float: true,
    drop: [['i_chicken', 1, 1], ['i_feather', 0, 2]], xp: 1,
    parts: [
      P(0, 0.42, 0, 0.38, 0.42, 0.5, C.chick),
      P(0, 0.66, -0.24, 0.28, 0.3, 0.26, C.chick, 3),
      P(0, 0.64, -0.42, 0.12, 0.1, 0.12, C.beak, 3),
      P(0, 0.76, -0.3, 0.1, 0.12, 0.08, [0.85, 0.2, 0.2], 3),
      P(-0.08, 0.7, -0.36, 0.06, 0.06, 0.02, C.eye, 3),
      P(0.08, 0.7, -0.36, 0.06, 0.06, 0.02, C.eye, 3),
      P(-0.21, 0.45, 0, 0.06, 0.34, 0.4, C.chick, 4),
      P(0.21, 0.45, 0, 0.06, 0.34, 0.4, C.chick, 5),
      P(-0.1, 0.1, 0, 0.08, 0.2, 0.08, C.foot, 1),
      P(0.1, 0.1, 0, 0.08, 0.2, 0.08, C.foot, 2)
    ]
  },
  zombie: {
    hp: 20, w: 0.3, h: 1.9, speed: 1.55, hostile: true, sound: 'mob_zombie', dmg: 3, burns: true,
    drop: [['i_rotten_flesh', 0, 2]], xp: 5,
    parts: [
      P(0, 1.1, 0, 0.55, 0.72, 0.28, C.zShirt),
      P(0, 1.68, 0, 0.52, 0.52, 0.52, C.zSkin, 3),
      P(-0.14, 1.74, -0.27, 0.12, 0.1, 0.02, [0.1, 0.1, 0.1], 3),
      P(0.14, 1.74, -0.27, 0.12, 0.1, 0.02, [0.1, 0.1, 0.1], 3),
      P(-0.4, 1.2, -0.3, 0.24, 0.72, 0.24, C.zSkin, 6),
      P(0.4, 1.2, -0.3, 0.24, 0.72, 0.24, C.zSkin, 6),
      P(-0.14, 0.37, 0, 0.26, 0.74, 0.26, C.zPants, 1),
      P(0.14, 0.37, 0, 0.26, 0.74, 0.26, C.zPants, 2)
    ]
  },
  skeleton: {
    hp: 20, w: 0.3, h: 1.9, speed: 1.6, hostile: true, sound: 'mob_skeleton', dmg: 2, burns: true,
    drop: [['i_bone', 1, 2], ['i_arrow', 0, 2]], xp: 5,
    parts: [
      P(0, 1.1, 0, 0.4, 0.72, 0.2, C.bone),
      P(0, 1.68, 0, 0.5, 0.5, 0.5, C.bone, 3),
      P(-0.13, 1.72, -0.26, 0.11, 0.11, 0.02, [0.05, 0.05, 0.05], 3),
      P(0.13, 1.72, -0.26, 0.11, 0.11, 0.02, [0.05, 0.05, 0.05], 3),
      P(-0.3, 1.2, -0.25, 0.15, 0.72, 0.15, C.bone, 6),
      P(0.3, 1.2, -0.25, 0.15, 0.72, 0.15, C.bone, 6),
      P(-0.11, 0.37, 0, 0.16, 0.74, 0.16, C.bone, 1),
      P(0.11, 0.37, 0, 0.16, 0.74, 0.16, C.bone, 2)
    ]
  },
  creeper: {
    hp: 20, w: 0.3, h: 1.7, speed: 1.5, hostile: true, sound: 'mob_creeper', dmg: 0, explodes: true,
    drop: [['i_gunpowder', 0, 2]], xp: 5,
    parts: [
      P(0, 0.95, 0, 0.5, 0.85, 0.3, C.creep),
      P(0, 1.58, 0, 0.5, 0.5, 0.5, C.creep, 3),
      P(-0.14, 1.66, -0.26, 0.14, 0.14, 0.02, [0.05, 0.05, 0.05], 3),
      P(0.14, 1.66, -0.26, 0.14, 0.14, 0.02, [0.05, 0.05, 0.05], 3),
      P(0, 1.44, -0.26, 0.16, 0.2, 0.02, [0.05, 0.05, 0.05], 3),
      P(-0.16, 1.5, -0.26, 0.12, 0.12, 0.02, [0.05, 0.05, 0.05], 3),
      P(0.16, 1.5, -0.26, 0.12, 0.12, 0.02, [0.05, 0.05, 0.05], 3),
      P(-0.16, 0.25, -0.2, 0.22, 0.5, 0.22, C.creepDark, 1),
      P(0.16, 0.25, -0.2, 0.22, 0.5, 0.22, C.creepDark, 2),
      P(-0.16, 0.25, 0.2, 0.22, 0.5, 0.22, C.creepDark, 2),
      P(0.16, 0.25, 0.2, 0.22, 0.5, 0.22, C.creepDark, 1)
    ]
  },
  spider: {
    hp: 16, w: 0.55, h: 0.85, speed: 1.9, hostile: true, sound: 'mob_spider', dmg: 2,
    drop: [['i_string', 0, 2], ['i_spider_eye', 0, 1]], xp: 5,
    parts: [
      P(0, 0.48, 0.3, 0.7, 0.6, 0.7, C.spider),
      P(0, 0.46, -0.1, 0.5, 0.44, 0.4, C.spider),
      P(0, 0.46, -0.5, 0.46, 0.42, 0.4, C.spider, 3),
      P(-0.13, 0.58, -0.7, 0.09, 0.09, 0.02, C.spiderEye, 3),
      P(0.13, 0.58, -0.7, 0.09, 0.09, 0.02, C.spiderEye, 3),
      P(-0.2, 0.64, -0.7, 0.07, 0.07, 0.02, C.spiderEye, 3),
      P(0.2, 0.64, -0.7, 0.07, 0.07, 0.02, C.spiderEye, 3),
      P(-0.55, 0.4, -0.3, 0.62, 0.12, 0.12, C.spider, 1),
      P(0.55, 0.4, -0.3, 0.62, 0.12, 0.12, C.spider, 2),
      P(-0.6, 0.4, -0.05, 0.66, 0.12, 0.12, C.spider, 2),
      P(0.6, 0.4, -0.05, 0.66, 0.12, 0.12, C.spider, 1),
      P(-0.6, 0.4, 0.2, 0.66, 0.12, 0.12, C.spider, 1),
      P(0.6, 0.4, 0.2, 0.66, 0.12, 0.12, C.spider, 2),
      P(-0.55, 0.4, 0.45, 0.62, 0.12, 0.12, C.spider, 2),
      P(0.55, 0.4, 0.45, 0.62, 0.12, 0.12, C.spider, 1)
    ]
  }
};
var PASSIVE = ['pig', 'cow', 'sheep', 'chicken'];
var HOSTILE = ['zombie', 'skeleton', 'creeper', 'spider'];

function Mob(type, x, y, z) {
  var d = MOBS[type];
  this.type = type; this.def = d;
  this.x = x; this.y = y; this.z = z;
  this.vx = 0; this.vy = 0; this.vz = 0;
  this.yaw = Math.random() * 6.28; this.headYaw = this.yaw;
  this.hp = d.hp; this.onGround = false;
  this.wander = 0; this.target = null; this.atkCd = 0;
  this.walk = 0; this.hurtT = 0; this.fuse = 0;
  this.soundCd = Math.random() * 12 + 4;
  this.jumpCd = 0; this.dead = false; this.age = 0;
  this.inWater = false;
}

/* ---------------------------------------------------------- item entities */
function ItemEnt(id, n, x, y, z, dur) {
  this.id = id; this.n = n; this.dur = dur || 0;
  this.x = x; this.y = y; this.z = z;
  this.vx = (Math.random() - .5) * 2.2; this.vy = 2.2 + Math.random();
  this.vz = (Math.random() - .5) * 2.2;
  this.age = 0; this.pickup = 0.5; this.onGround = false; this.dead = false;
}
function XPOrb(amount, x, y, z) {
  this.amount = amount; this.x = x; this.y = y; this.z = z;
  this.vx = (Math.random() - .5) * 1.6; this.vy = 1.6 + Math.random();
  this.vz = (Math.random() - .5) * 1.6;
  this.age = 0; this.dead = false; this.onGround = false;
}

/* --------------------------------------------------------------- particles */
function Particle(x, y, z, vx, vy, vz, layer, u0, v0, size, life, grav, col) {
  this.x = x; this.y = y; this.z = z;
  this.vx = vx; this.vy = vy; this.vz = vz;
  this.layer = layer; this.u0 = u0; this.v0 = v0;
  this.size = size; this.life = life; this.maxLife = life;
  this.grav = grav === undefined ? 1 : grav;
  this.col = col || [1, 1, 1];
}

function EntitySystem(game) {
  this.game = game;
  this.mobs = [];
  this.items = [];
  this.orbs = [];
  this.particles = [];
  this.spawnCd = 2;
  this.despawnCd = 4;
}

/* --------------------------------------------------------------- helpers -- */
EntitySystem.prototype.entityPhysics = function (e, dt, w, h, gravity) {
  var world = this.game.chunks;
  var inWater = world.getBlock(Math.floor(e.x), Math.floor(e.y + h * .5), Math.floor(e.z)) === BID.water;
  e.inWater = inWater;
  e.vy -= (gravity === undefined ? GRAV : gravity) * (inWater ? 0.28 : 1) * dt;
  if (inWater) { e.vy += 9 * dt; e.vx *= (1 - 3 * dt); e.vz *= (1 - 3 * dt); }
  if (e.vy < -50) e.vy = -50;
  var self = this;
  function solidAt(x, y, z) {
    var id = world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    return id && B_SOLID[id];
  }
  function tryMove(ax, d) {
    if (!d) return false;
    var nx = e.x + (ax === 0 ? d : 0), ny = e.y + (ax === 1 ? d : 0), nz = e.z + (ax === 2 ? d : 0);
    var x0 = Math.floor(nx - w), x1 = Math.floor(nx + w);
    var y0 = Math.floor(ny + 0.001), y1 = Math.floor(ny + h - 0.001);
    var z0 = Math.floor(nz - w), z1 = Math.floor(nz + w);
    for (var y = y0; y <= y1; y++) for (var z = z0; z <= z1; z++) for (var x = x0; x <= x1; x++) {
      var id = world.getBlock(x, y, z);
      if (id && B_SOLID[id]) {
        if (ax === 1) { if (d < 0) { e.y = y + 1.0001; e.onGround = true; } else e.y = y - h - 0.0001; e.vy = 0; }
        else if (ax === 0) { e.x = d > 0 ? x - w - 0.0001 : x + 1 + w + 0.0001; e.vx = 0; }
        else { e.z = d > 0 ? z - w - 0.0001 : z + 1 + w + 0.0001; e.vz = 0; }
        return true;
      }
    }
    if (ax === 0) e.x = nx; else if (ax === 1) e.y = ny; else e.z = nz;
    return false;
  }
  e.onGround = false;
  tryMove(1, e.vy * dt);
  var bx = tryMove(0, e.vx * dt);
  var bz = tryMove(2, e.vz * dt);
  return { blockedX: bx, blockedZ: bz };
};

EntitySystem.prototype.spawnParticles = function (kind, x, y, z, blockId, n) {
  var i, p;
  if (kind === 'block') {
    var layer = BLOCKS[blockId] ? BLOCKS[blockId].faces[2] : 0;
    var tint = BLOCKS[blockId] ? BLOCKS[blockId].tint : 0;
    var col = tint ? TINT_RGB[tint] : [1, 1, 1];
    for (i = 0; i < (n || 14); i++) {
      this.particles.push(new Particle(
        x + Math.random(), y + Math.random() * .9, z + Math.random(),
        (Math.random() - .5) * 3.2, Math.random() * 3.4 + 0.6, (Math.random() - .5) * 3.2,
        layer, (Math.random() * 12 | 0) / 16, (Math.random() * 12 | 0) / 16,
        0.09 + Math.random() * 0.06, 0.6 + Math.random() * 0.6, 1, col));
    }
  } else if (kind === 'hit') {
    var layer2 = BLOCKS[blockId] ? BLOCKS[blockId].faces[2] : 0;
    var t2 = BLOCKS[blockId] ? BLOCKS[blockId].tint : 0;
    var c2 = t2 ? TINT_RGB[t2] : [1, 1, 1];
    for (i = 0; i < (n || 5); i++) {
      this.particles.push(new Particle(
        x, y, z, (Math.random() - .5) * 2.4, Math.random() * 2.2, (Math.random() - .5) * 2.4,
        layer2, (Math.random() * 12 | 0) / 16, (Math.random() * 12 | 0) / 16,
        0.07 + Math.random() * 0.05, 0.35 + Math.random() * 0.35, 1, c2));
    }
  } else if (kind === 'smoke') {
    for (i = 0; i < (n || 8); i++) {
      this.particles.push(new Particle(
        x + (Math.random() - .5) * .6, y + Math.random() * .5, z + (Math.random() - .5) * .6,
        (Math.random() - .5) * .7, Math.random() * 1.4 + .5, (Math.random() - .5) * .7,
        TEX_WHITE, 0, 0, 0.2 + Math.random() * .28, 1.0 + Math.random(), -0.06,
        [0.22, 0.22, 0.24]));
    }
  } else if (kind === 'explode') {
    for (i = 0; i < (n || 60); i++) {
      var a = Math.random() * 6.283, e2 = (Math.random() - .5) * 3, sp = 3 + Math.random() * 9;
      this.particles.push(new Particle(x, y, z,
        Math.cos(a) * sp, e2 + Math.random() * 5, Math.sin(a) * sp,
        TEX_WHITE, 0, 0, 0.3 + Math.random() * .5, 0.8 + Math.random() * 1.1, 0.25,
        Math.random() < .5 ? [1, 0.86, 0.5] : [0.35, 0.33, 0.32]));
    }
  } else if (kind === 'splash') {
    for (i = 0; i < (n || 16); i++) {
      this.particles.push(new Particle(x, y, z,
        (Math.random() - .5) * 3, Math.random() * 3.5 + 1, (Math.random() - .5) * 3,
        BLOCKS[BID.water].faces[0], (Math.random() * 12 | 0) / 16, (Math.random() * 12 | 0) / 16,
        0.07, 0.5 + Math.random() * .4, 1, [0.5, 0.72, 1]));
    }
  } else if (kind === 'crit') {
    for (i = 0; i < (n || 8); i++) {
      this.particles.push(new Particle(x, y, z,
        (Math.random() - .5) * 2, Math.random() * 2, (Math.random() - .5) * 2,
        TEX_WHITE, 0, 0, 0.08, 0.4, 0.6, [1, 0.3, 0.25]));
    }
  }
};
var TINT_RGB = [
  [1, 1, 1],
  [0.55, 0.83, 0.36], [0.75, 0.72, 0.33], [0.50, 0.72, 0.55],
  [0.42, 0.60, 0.34], [0.42, 0.72, 0.28], [0.52, 0.78, 0.36], [0.30, 0.55, 0.95]
];
