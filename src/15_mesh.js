/* ================================================================= mesher == */
/* vertex = 2 x uint32
   d0: px[0..7] pz[8..15] py[16..26]          (position in 1/8 block units)
   d1: layer[0..7] sky[8..11] blk[12..15] ao[16..17] u[18..21] v[22..25]
       normal[26..28] tint[29..31]                                            */

var PADX = 18, PADY = 130, PADZ = 18, PADXZ = PADX * PADZ;
function pIdx(x, y, z) { return (x + 1) + (z + 1) * PADX + (y + 1) * PADXZ; }
var _pb = new Uint8Array(PADX * PADY * PADZ);       // padded blocks
var _pl = new Uint8Array(PADX * PADY * PADZ);       // padded light

/* which blocks go to the translucent (blended) draw pass */
var B_TRANS = new Uint8Array(BLOCK_COUNT);
(function () {
  var t = ['water', 'ice', 'slime_block'];
  for (var i = 0; i < t.length; i++) B_TRANS[BID[t[i]]] = 1;
})();

/* face geometry table (see notes: CCW when seen from outside) */
var FACES = [
  { n: [1, 0, 0],  c: [[1,0,1],[1,0,0],[1,1,0],[1,1,1]], uv: [[0,0],[1,0],[1,1],[0,1]] }, // +X
  { n: [-1, 0, 0], c: [[0,0,0],[0,0,1],[0,1,1],[0,1,0]], uv: [[0,0],[1,0],[1,1],[0,1]] }, // -X
  { n: [0, 1, 0],  c: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], uv: [[0,0],[1,0],[1,1],[0,1]] }, // +Y
  { n: [0, -1, 0], c: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], uv: [[0,0],[1,0],[1,1],[0,1]] }, // -Y
  { n: [0, 0, 1],  c: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]], uv: [[0,0],[1,0],[1,1],[0,1]] }, // +Z
  { n: [0, 0, -1], c: [[1,0,0],[0,0,0],[0,1,0],[0,1,1 - 1]], uv: [[0,0],[1,0],[1,1],[0,1]] } // -Z (fixed below)
];
FACES[5].c = [[1,0,0],[0,0,0],[0,1,0],[1,1,0]];
/* precompute AO/light sample offsets: [vert][0..2] = {s1, s2, corner} */
(function () {
  for (var d = 0; d < 6; d++) {
    var f = FACES[d], n = f.n;
    var axis = n[0] ? 0 : n[1] ? 1 : 2;
    var t1 = (axis + 1) % 3, t2 = (axis + 2) % 3;
    f.samples = [];
    for (var v = 0; v < 4; v++) {
      var c = f.c[v];
      var s1 = [0, 0, 0], s2 = [0, 0, 0], cr = [0, 0, 0];
      s1[t1] = c[t1] * 2 - 1; s2[t2] = c[t2] * 2 - 1;
      cr[t1] = s1[t1]; cr[t2] = s2[t2];
      f.samples.push([s1, s2, cr]);
    }
  }
})();

function Buf() { this.a = new Uint32Array(8192); this.n = 0; }
Buf.prototype.need = function (k) {
  if (this.n + k <= this.a.length) return;
  var cap = this.a.length; while (cap < this.n + k) cap *= 2;
  var na = new Uint32Array(cap); na.set(this.a.subarray(0, this.n)); this.a = na;
};
Buf.prototype.quad = function (v) {          // v = 8 uint32 (4 verts)
  this.need(8);
  var a = this.a, n = this.n;
  a[n] = v[0]; a[n+1] = v[1]; a[n+2] = v[2]; a[n+3] = v[3];
  a[n+4] = v[4]; a[n+5] = v[5]; a[n+6] = v[6]; a[n+7] = v[7];
  this.n = n + 8;
};
Buf.prototype.reset = function () { this.n = 0; };
Buf.prototype.out = function () { return this.a.slice(0, this.n); };

var _bufO = new Buf(), _bufT = new Buf(), _quad = new Uint32Array(8);

function packPos(x8, y8, z8) { return (x8 & 255) | ((z8 & 255) << 8) | ((y8 & 2047) << 16); }
function packAttr(layer, sky, blk, ao, u8, v8, nrm, tint) {
  return (layer & 255) | ((sky & 15) << 8) | ((blk & 15) << 12) | ((ao & 3) << 16) |
         ((u8 & 15) << 18) | ((v8 & 15) << 22) | ((nrm & 7) << 26) | (tint << 29);
}

function meshChunk(world, c) {
  var cx = c.cx, cz = c.cz, x, y, z, d, i, j;
  /* ---- gather padded neighbourhood ---- */
  _pb.fill(0); _pl.fill(0xff);
  for (y = 0; y < CY; y++) {
    for (z = 0; z < CZ; z++) {
      var srow = bIdx(0, y, z), drow = pIdx(0, y, z);
      for (x = 0; x < CX; x++) { _pb[drow + x] = c.blocks[srow + x]; _pl[drow + x] = c.light[srow + x]; }
    }
  }
  var offs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (var o = 0; o < 8; o++) {
    var nc = world.get(cx + offs[o][0], cz + offs[o][1]);
    var ax = offs[o][0], az = offs[o][1];
    var xs = ax === 0 ? 0 : (ax < 0 ? CX - 1 : 0), xe = ax === 0 ? CX : xs + 1;
    var zs = az === 0 ? 0 : (az < 0 ? CZ - 1 : 0), ze = az === 0 ? CZ : zs + 1;
    for (y = 0; y < CY; y++) for (z = zs; z < ze; z++) for (x = xs; x < xe; x++) {
      var px = ax === 0 ? x : (ax < 0 ? -1 : CX), pz = az === 0 ? z : (az < 0 ? -1 : CZ);
      var pi = pIdx(px, y, pz);
      if (nc) { _pb[pi] = nc.blocks[bIdx(x, y, z)]; _pl[pi] = nc.light[bIdx(x, y, z)]; }
      else { _pb[pi] = 1; _pl[pi] = 0; }              // unloaded: treat as stone so we don't emit a wall
    }
  }
  /* y padding: below world = bedrock, above = bright air */
  for (z = -1; z <= CZ; z++) for (x = -1; x <= CX; x++) {
    _pb[pIdx(x, -1, z)] = BID.bedrock; _pl[pIdx(x, -1, z)] = 0;
    _pb[pIdx(x, CY, z)] = 0; _pl[pIdx(x, CY, z)] = 0xf0;
  }

  _bufO.reset(); _bufT.reset();
  var anySolid = false;

  for (y = 0; y < CY; y++) {
    for (z = 0; z < CZ; z++) {
      for (x = 0; x < CX; x++) {
        var id = _pb[pIdx(x, y, z)];
        if (id === 0) continue;
        anySolid = true;
        var rt = B_RENDER[id];
        var buf = B_TRANS[id] ? _bufT : _bufO;
        if (rt === 2) { emitCross(buf, id, x, y, z); continue; }
        if (rt === 4) { emitTorch(buf, id, x, y, z); continue; }
        emitBox(world, buf, id, x, y, z, rt);
      }
    }
  }
  return { opaque: _bufO.out(), trans: _bufT.out(), empty: !anySolid };
}

function visible(self, nb) {
  if (nb === self) return false;
  if (nb === 0) return true;
  if (B_OPAQUE[nb]) return false;
  return true;
}

function emitBox(world, buf, id, x, y, z, rt) {
  var b = BLOCKS[id], inset = (rt === 5) ? 1 : 0;      // cactus
  var liquid = (rt === 3);
  var topCut = 0;
  if (liquid) {
    var above = _pb[pIdx(x, y + 1, z)];
    topCut = (above === id) ? 0 : 1;                    // 1/8 lower surface
  }
  for (var d = 0; d < 6; d++) {
    var f = FACES[d], n = f.n;
    var nx = x + n[0], ny = y + n[1], nz = z + n[2];
    var nb = _pb[pIdx(nx, ny, nz)];
    if (liquid) { if (nb === id || B_OPAQUE[nb]) continue; }
    else if (!visible(id, nb)) continue;
    if (rt === 5 && d === 3 && !B_OPAQUE[nb]) { /* cactus bottom still drawn */ }

    var layer = b.faces[d];
    var tint = b.tintFaces ? (b.tintFaces[d] ? b.tint : 0) : b.tint;
    var nrm = d;
    var q = _quad, qi = 0;
    var aos = [0, 0, 0, 0], lts = [0, 0, 0, 0];
    for (var v = 0; v < 4; v++) {
      var s = f.samples[v];
      var b1 = _pb[pIdx(nx + s[0][0], ny + s[0][1], nz + s[0][2])];
      var b2 = _pb[pIdx(nx + s[1][0], ny + s[1][1], nz + s[1][2])];
      var bc = _pb[pIdx(nx + s[2][0], ny + s[2][1], nz + s[2][2])];
      var o1 = B_OPAQUE[b1], o2 = B_OPAQUE[b2], oc = B_OPAQUE[bc];
      aos[v] = (o1 && o2) ? 0 : (3 - (o1 + o2 + oc));
      /* smooth light: average the 4 cells touching this vertex, skipping solids */
      var ls = 0, lb = 0, cnt = 0;
      var cells = [_pl[pIdx(nx, ny, nz)],
                   _pl[pIdx(nx + s[0][0], ny + s[0][1], nz + s[0][2])],
                   _pl[pIdx(nx + s[1][0], ny + s[1][1], nz + s[1][2])],
                   _pl[pIdx(nx + s[2][0], ny + s[2][1], nz + s[2][2])]];
      var solids = [0, B_OPAQUE[b1], B_OPAQUE[b2], B_OPAQUE[bc]];
      for (var q2 = 0; q2 < 4; q2++) {
        if (solids[q2]) continue;
        ls += cells[q2] >> 4; lb += cells[q2] & 15; cnt++;
      }
      if (!cnt) { ls = _pl[pIdx(nx, ny, nz)] >> 4; lb = _pl[pIdx(nx, ny, nz)] & 15; cnt = 1; }
      lts[v] = ((ls / cnt) & 15) << 4 | ((lb / cnt) & 15);
      lts[v] = (Math.round(ls / cnt) << 4) | Math.round(lb / cnt);
    }
    /* build the 4 verts */
    var verts = [];
    for (var v2 = 0; v2 < 4; v2++) {
      var c = f.c[v2];
      var vx = x * 8 + c[0] * 8, vy = y * 8 + c[1] * 8, vz = z * 8 + c[2] * 8;
      if (inset) {
        if (n[0] === 0) { if (c[0] === 0) vx += inset; else vx -= inset; }
        if (n[2] === 0) { if (c[2] === 0) vz += inset; else vz -= inset; }
        if (n[0] !== 0) vx -= n[0] * inset;
        if (n[2] !== 0) vz -= n[2] * inset;
      }
      if (liquid && topCut && c[1] === 1) vy -= 1;
      var uvv = f.uv[v2];
      verts.push(packPos(vx, vy, vz),
        packAttr(layer, lts[v2] >> 4, lts[v2] & 15, aos[v2], uvv[0] * 8, uvv[1] * 8, nrm, tint));
    }
    /* flip the split diagonal when AO is anisotropic */
    if (aos[0] + aos[2] < aos[1] + aos[3]) {
      q[0] = verts[2]; q[1] = verts[3]; q[2] = verts[4]; q[3] = verts[5];
      q[4] = verts[6]; q[5] = verts[7]; q[6] = verts[0]; q[7] = verts[1];
    } else {
      for (var w = 0; w < 8; w++) q[w] = verts[w];
    }
    buf.quad(q);
  }
}

/* two crossed, double sided quads */
function emitCross(buf, id, x, y, z) {
  var b = BLOCKS[id], layer = b.faces[0], tint = b.tint;
  var li = _pl[pIdx(x, y, z)];
  var sk = li >> 4, bl = li & 15;
  if (li === 0xff) { sk = 15; bl = 0; }
  var x0 = x * 8 + 1, x1 = x * 8 + 7, z0 = z * 8 + 1, z1 = z * 8 + 7;
  var y0 = y * 8, y1 = y * 8 + 8;
  var quads = [
    [[x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0]],
    [[x1, y0, z1], [x0, y0, z0], [x0, y1, z0], [x1, y1, z1]],
    [[x0, y0, z1], [x1, y0, z0], [x1, y1, z0], [x0, y1, z1]],
    [[x1, y0, z0], [x0, y0, z1], [x0, y1, z1], [x1, y1, z0]]
  ];
  var uv = [[0, 0], [8, 0], [8, 8], [0, 8]];
  for (var k = 0; k < 4; k++) {
    var qd = quads[k], q = _quad;
    for (var v = 0; v < 4; v++) {
      q[v * 2] = packPos(qd[v][0], qd[v][1], qd[v][2]);
      q[v * 2 + 1] = packAttr(layer, sk, bl, 3, uv[v][0], uv[v][1], 2, tint);
    }
    buf.quad(q);
  }
}

/* small 3D post with a lit tip */
function emitTorch(buf, id, x, y, z) {
  var b = BLOCKS[id], layer = b.faces[0];
  var li = _pl[pIdx(x, y + 1, z)];
  var sk = li >> 4, bl = Math.max(li & 15, 13);
  var bx = x * 8, by = y * 8, bz = z * 8;
  var a = 3, e = 5, h = 7;
  var sides = [
    { p: [[bx+e,by,bz+e],[bx+e,by,bz+a],[bx+e,by+h,bz+a],[bx+e,by+h,bz+e]], n: 0 },
    { p: [[bx+a,by,bz+a],[bx+a,by,bz+e],[bx+a,by+h,bz+e],[bx+a,by+h,bz+a]], n: 1 },
    { p: [[bx+a,by,bz+e],[bx+e,by,bz+e],[bx+e,by+h,bz+e],[bx+a,by+h,bz+e]], n: 4 },
    { p: [[bx+e,by,bz+a],[bx+a,by,bz+a],[bx+a,by+h,bz+a],[bx+e,by+h,bz+a]], n: 5 }
  ];
  var uv = [[3, 1], [5, 1], [5, 8], [3, 8]];
  for (var s = 0; s < 4; s++) {
    var q = _quad, pp = sides[s].p;
    for (var v = 0; v < 4; v++) {
      q[v * 2] = packPos(pp[v][0], pp[v][1], pp[v][2]);
      q[v * 2 + 1] = packAttr(layer, sk, bl, 3, uv[v][0], uv[v][1], sides[s].n, 0);
    }
    buf.quad(q);
  }
  /* top */
  var tp = [[bx+a,by+h,bz+e],[bx+e,by+h,bz+e],[bx+e,by+h,bz+a],[bx+a,by+h,bz+a]];
  var tuv = [[3, 5], [5, 5], [5, 7], [3, 7]];
  var qt = _quad;
  for (var v2 = 0; v2 < 4; v2++) {
    qt[v2 * 2] = packPos(tp[v2][0], tp[v2][1], tp[v2][2]);
    qt[v2 * 2 + 1] = packAttr(layer, sk, bl, 3, tuv[v2][0], tuv[v2][1], 2, 0);
  }
  buf.quad(qt);
}
