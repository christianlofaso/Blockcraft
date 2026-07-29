/* ============================================================ chunk store == */
function ckey(cx, cz) { return ((cx & 0xffff) << 16) | (cz & 0xffff); }

function Chunk(cx, cz) {
  this.cx = cx; this.cz = cz;
  this.blocks = new Uint8Array(CX * CY * CZ);
  this.light = new Uint8Array(CX * CY * CZ);      // hi nibble = sky, lo = block
  this.heights = null; this.biomes = null;
  this.generated = false; this.lit = false; this.dirty = true;
  this.empty = false;
}

function World(seed) {
  this.seed = seed | 0;
  this.gen = new WorldGen(seed);
  this.chunks = new Map();
  this.edits = new Map();                         // ckey -> {idx: id}
  this.dirtySet = new Set();
}
World.prototype.get = function (cx, cz) { return this.chunks.get(ckey(cx, cz)); };
World.prototype.has = function (cx, cz) { return this.chunks.has(ckey(cx, cz)); };

World.prototype.ensure = function (cx, cz) {
  var k = ckey(cx, cz), c = this.chunks.get(k);
  if (c) return c;
  c = new Chunk(cx, cz);
  var meta = this.gen.generate(cx, cz, c.blocks);
  c.heights = meta.heights; c.biomes = meta.biomes;
  var ed = this.edits.get(k);
  if (ed) for (var idx in ed) c.blocks[idx | 0] = ed[idx];
  c.generated = true;
  this.chunks.set(k, c);
  return c;
};
World.prototype.unload = function (cx, cz) { this.chunks.delete(ckey(cx, cz)); };

/* world-space accessors; y outside [0,CY) is air above / bedrock below */
World.prototype.gb = function (x, y, z) {
  if (y < 0) return BID.bedrock;
  if (y >= CY) return 0;
  var c = this.chunks.get(ckey(x >> 4, z >> 4));
  if (!c) return -1;                                // unloaded
  return c.blocks[bIdx(x & 15, y, z & 15)];
};
World.prototype.gbAir = function (x, y, z) { var b = this.gb(x, y, z); return b < 0 ? 0 : b; };
World.prototype.sky = function (x, y, z) {
  if (y >= CY) return 15;
  if (y < 0) return 0;
  var c = this.chunks.get(ckey(x >> 4, z >> 4));
  if (!c) return 0;
  return c.light[bIdx(x & 15, y, z & 15)] >> 4;
};
World.prototype.blk = function (x, y, z) {
  if (y < 0 || y >= CY) return 0;
  var c = this.chunks.get(ckey(x >> 4, z >> 4));
  if (!c) return 0;
  return c.light[bIdx(x & 15, y, z & 15)] & 15;
};
World.prototype.setSky = function (x, y, z, v) {
  var c = this.chunks.get(ckey(x >> 4, z >> 4)); if (!c) return;
  var i = bIdx(x & 15, y, z & 15);
  c.light[i] = (c.light[i] & 15) | (v << 4);
  this.touch(c, x & 15, z & 15);
};
World.prototype.setBlk = function (x, y, z, v) {
  var c = this.chunks.get(ckey(x >> 4, z >> 4)); if (!c) return;
  var i = bIdx(x & 15, y, z & 15);
  c.light[i] = (c.light[i] & 0xf0) | v;
  this.touch(c, x & 15, z & 15);
};
World.prototype.touch = function (c, lx, lz) {
  if (!c.dirty) { c.dirty = true; }
  this.dirtySet.add(ckey(c.cx, c.cz));
  /* border changes affect the neighbour's smooth lighting too */
  if (lx === 0) this.mark(c.cx - 1, c.cz);
  else if (lx === 15) this.mark(c.cx + 1, c.cz);
  if (lz === 0) this.mark(c.cx, c.cz - 1);
  else if (lz === 15) this.mark(c.cx, c.cz + 1);
};
World.prototype.mark = function (cx, cz) {
  var c = this.chunks.get(ckey(cx, cz));
  if (c) { c.dirty = true; this.dirtySet.add(ckey(cx, cz)); }
};

/* ================================================================= light == */
var _skyQ = [], _blkQ = [], _remQ = [];

World.prototype.initChunkLight = function (c) {
  var x, y, z, i;
  var lights = c.light, blocks = c.blocks;
  lights.fill(0);
  /* 1. vertical sky columns */
  for (z = 0; z < CZ; z++) {
    for (x = 0; x < CX; x++) {
      var lv = 15;
      for (y = CY - 1; y >= 0; y--) {
        i = bIdx(x, y, z);
        var op = B_OPACITY[blocks[i]];
        if (op >= 15) { lv = 0; }
        else if (op > 0) { lv = Math.max(0, lv - op); }
        if (lv <= 0) break;
        lights[i] = lv << 4;
      }
    }
  }
  /* 2. seed BFS from every lit cell in this chunk and from lit neighbour borders */
  var wx0 = c.cx * CX, wz0 = c.cz * CZ;
  _skyQ.length = 0; _blkQ.length = 0;
  for (z = 0; z < CZ; z++) for (x = 0; x < CX; x++) {
    for (y = 0; y < CY; y++) {
      i = bIdx(x, y, z);
      var s = lights[i] >> 4;
      if (s > 1) _skyQ.push(wx0 + x, y, wz0 + z);
      var em = B_LIGHT[blocks[i]];
      if (em > 0) { lights[i] = (lights[i] & 0xf0) | em; _blkQ.push(wx0 + x, y, wz0 + z); }
    }
  }
  var nb = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (var n = 0; n < 4; n++) {
    var nc = this.get(c.cx + nb[n][0], c.cz + nb[n][1]);
    if (!nc || !nc.lit) continue;
    var bx0 = nc.cx * CX, bz0 = nc.cz * CZ;
    for (var a = 0; a < CX; a++) {
      var lx = nb[n][0] === -1 ? 15 : nb[n][0] === 1 ? 0 : a;
      var lz = nb[n][1] === -1 ? 15 : nb[n][1] === 1 ? 0 : a;
      if (nb[n][0] !== 0 && a >= CZ) continue;
      if (nb[n][0] !== 0) { lz = a; } else { lx = a; }
      for (y = 0; y < CY; y++) {
        var li = nc.light[bIdx(lx, y, lz)];
        if (li >> 4 > 1) _skyQ.push(bx0 + lx, y, bz0 + lz);
        if ((li & 15) > 1) _blkQ.push(bx0 + lx, y, bz0 + lz);
      }
    }
  }
  c.lit = true;
  this.propagateSky(_skyQ);
  this.propagateBlk(_blkQ);
  c.dirty = true;
};

var DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

World.prototype.propagateSky = function (q) {
  var qi = 0;
  while (qi < q.length) {
    var x = q[qi++], y = q[qi++], z = q[qi++];
    var lv = this.sky(x, y, z);
    if (lv <= 1) continue;
    for (var d = 0; d < 6; d++) {
      var nx = x + DIRS[d][0], ny = y + DIRS[d][1], nz = z + DIRS[d][2];
      if (ny < 0 || ny >= CY) continue;
      var nbId = this.gb(nx, ny, nz);
      if (nbId < 0) continue;                        // unloaded chunk
      var op = B_OPACITY[nbId];
      if (op >= 15) continue;
      var nl = (d === 3 && lv === 15 && op === 0) ? 15 : lv - Math.max(1, op);
      if (nl <= 0) continue;
      if (this.sky(nx, ny, nz) < nl) { this.setSky(nx, ny, nz, nl); q.push(nx, ny, nz); }
    }
    if (qi > 400000) { q.splice(0, qi); qi = 0; }
  }
  q.length = 0;
};
World.prototype.propagateBlk = function (q) {
  var qi = 0;
  while (qi < q.length) {
    var x = q[qi++], y = q[qi++], z = q[qi++];
    var lv = this.blk(x, y, z);
    if (lv <= 1) continue;
    for (var d = 0; d < 6; d++) {
      var nx = x + DIRS[d][0], ny = y + DIRS[d][1], nz = z + DIRS[d][2];
      if (ny < 0 || ny >= CY) continue;
      var nbId = this.gb(nx, ny, nz);
      if (nbId < 0) continue;
      var op = B_OPACITY[nbId];
      if (op >= 15) continue;
      var nl = lv - Math.max(1, op);
      if (nl <= 0) continue;
      if (this.blk(nx, ny, nz) < nl) { this.setBlk(nx, ny, nz, nl); q.push(nx, ny, nz); }
    }
    if (qi > 400000) { q.splice(0, qi); qi = 0; }
  }
  q.length = 0;
};

/* removal (classic two-pass): clear the affected region, then re-flood */
World.prototype.removeLight = function (x, y, z, isSky) {
  var rem = [x, y, z, isSky ? this.sky(x, y, z) : this.blk(x, y, z)];
  if (isSky) this.setSky(x, y, z, 0); else this.setBlk(x, y, z, 0);
  var add = [], qi = 0;
  while (qi < rem.length) {
    var cx = rem[qi++], cy = rem[qi++], cz = rem[qi++], lv = rem[qi++];
    for (var d = 0; d < 6; d++) {
      var nx = cx + DIRS[d][0], ny = cy + DIRS[d][1], nz = cz + DIRS[d][2];
      if (ny < 0 || ny >= CY) continue;
      if (this.gb(nx, ny, nz) < 0) continue;
      var nl = isSky ? this.sky(nx, ny, nz) : this.blk(nx, ny, nz);
      if (nl === 0) continue;
      var down = isSky && d === 3 && lv === 15;
      if (nl < lv || down) {
        if (isSky) this.setSky(nx, ny, nz, 0); else this.setBlk(nx, ny, nz, 0);
        rem.push(nx, ny, nz, nl);
      } else if (nl >= lv) add.push(nx, ny, nz);
    }
  }
  return add;
};

World.prototype.setBlockLit = function (x, y, z, id) {
  var cx = x >> 4, cz = z >> 4;
  var c = this.chunks.get(ckey(cx, cz));
  if (!c || y < 0 || y >= CY) return false;
  var i = bIdx(x & 15, y, z & 15);
  var old = c.blocks[i];
  if (old === id) return false;
  c.blocks[i] = id;
  var k = ckey(cx, cz);
  var ed = this.edits.get(k); if (!ed) { ed = {}; this.edits.set(k, ed); }
  ed[i] = id;
  this.touch(c, x & 15, z & 15);
  /* also refresh the diagonal neighbours' AO */
  this.mark(cx - 1, cz - 1); this.mark(cx + 1, cz - 1);
  this.mark(cx - 1, cz + 1); this.mark(cx + 1, cz + 1);

  var oldEmit = B_LIGHT[old], newEmit = B_LIGHT[id];
  var add;
  /* --- block light --- */
  if (oldEmit > 0 || B_OPACITY[id] >= 15) {
    add = this.removeLight(x, y, z, false);
    if (newEmit > 0) { this.setBlk(x, y, z, newEmit); add.push(x, y, z); }
    this.propagateBlk(add);
  } else if (newEmit > 0) {
    this.setBlk(x, y, z, newEmit);
    this.propagateBlk([x, y, z]);
  } else {
    /* opening a hole: let neighbours flood in */
    var q = [];
    for (var d = 0; d < 6; d++) q.push(x + DIRS[d][0], y + DIRS[d][1], z + DIRS[d][2]);
    this.propagateBlk(q);
  }
  /* --- sky light --- */
  if (B_OPACITY[id] > B_OPACITY[old]) {
    add = this.removeLight(x, y, z, true);
    this.propagateSky(add);
  } else {
    var q2 = [];
    for (var d2 = 0; d2 < 6; d2++) q2.push(x + DIRS[d2][0], y + DIRS[d2][1], z + DIRS[d2][2]);
    /* re-seed the column above so sunlight can pour back down */
    var s = this.sky(x, y + 1, z);
    if (s > 0) { q2.push(x, y + 1, z); }
    this.propagateSky(q2);
  }
  return true;
};
