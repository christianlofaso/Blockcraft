/* ========================================================= chunk manager == */
function ClientChunk(cx, cz) {
  this.cx = cx; this.cz = cz;
  this.blocks = null; this.heights = null; this.biomes = null;
  this.vaoO = null; this.vboO = null; this.cntO = 0;
  this.vaoT = null; this.vboT = null; this.cntT = 0;
  this.ready = false;
}
ClientChunk.prototype.upload = function (which, data) {
  var vao = which ? this.vaoT : this.vaoO, vbo = which ? this.vboT : this.vboO;
  var quads = data.length / 8;
  if (!quads) {
    if (which) this.cntT = 0; else this.cntO = 0;
    return;
  }
  if (!vao) {
    vao = gl.createVertexArray(); vbo = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribIPointer(0, 2, gl.UNSIGNED_INT, 8, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
    gl.bindVertexArray(null);
    if (which) { this.vaoT = vao; this.vboT = vbo; } else { this.vaoO = vao; this.vboO = vbo; }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  var n = Math.min(quads, MAX_QUADS) * 6;
  if (which) this.cntT = n; else this.cntO = n;
};
ClientChunk.prototype.dispose = function () {
  if (this.vaoO) { gl.deleteVertexArray(this.vaoO); gl.deleteBuffer(this.vboO); }
  if (this.vaoT) { gl.deleteVertexArray(this.vaoT); gl.deleteBuffer(this.vboT); }
  this.vaoO = this.vaoT = null;
};

function ChunkManager(seed, edits) {
  this.chunks = new Map();
  this.pending = new Set();
  this.seed = seed;
  this.ready = false;
  this.loadedCount = 0;
  this.initEdits = edits || null;
  var self = this;
  this.link = makeWorkerLink(function (msg) { self.onMessage(msg); },
                             function () { self.fallbackToInline(); });
  this.link.send({ t: 'init', seed: seed, edits: this.initEdits });
  /* Blob workers are blocked on file:// in several browsers, and the failure is
     asynchronous — if no 'ready' comes back promptly, run the same code inline. */
  if (this.link.mode === 'worker') {
    this.readyTimer = setTimeout(function () {
      if (!self.ready) self.fallbackToInline();
    }, 2000);
  }
}
ChunkManager.prototype.fallbackToInline = function () {
  if (this.link.mode === 'inline') return;
  clearTimeout(this.readyTimer);
  try { if (this.link.worker) this.link.worker.terminate(); } catch (e) {}
  var self = this;
  console.warn('Worker unavailable — falling back to same-thread generation.');
  var core = new WorkerCore(function (msg) { self.onMessage(msg); });
  this.link = {
    mode: 'inline',
    send: function (m) { core.handle(m); },
    tick: function (b) { core.tick(b === undefined ? 6 : b); }
  };
  this.link.send({ t: 'init', seed: this.seed, edits: this.initEdits });
  /* re-issue anything that was in flight */
  var again = [];
  this.pending.forEach(function (k) { again.push(k); });
  for (var i = 0; i < again.length; i++) {
    /* ckey packs cx in the high half and cz in the low half */
    var cx = again[i] >> 16, cz = (again[i] << 16) >> 16;
    this.link.send({ t: 'req', cx: cx, cz: cz });
  }
};
ChunkManager.prototype.onMessage = function (m) {
  if (m.t === 'ready') { this.ready = true; return; }
  if (m.t === 'chunk') {
    var key = ckey(m.cx, m.cz);
    var c = this.chunks.get(key);
    if (!c) { c = new ClientChunk(m.cx, m.cz); this.chunks.set(key, c); }
    c.blocks = m.blocks; c.light = m.light; c.heights = m.heights; c.biomes = m.biomes;
    c.upload(0, m.opaque); c.upload(1, m.trans);
    c.ready = true;
    this.pending.delete(key);
    this.loadedCount++;
  } else if (m.t === 'mesh') {
    var c2 = this.chunks.get(ckey(m.cx, m.cz));
    if (c2) { c2.upload(0, m.opaque); c2.upload(1, m.trans); if (m.light) c2.light = m.light; }
  } else if (m.t === 'editdump') {
    this.editDump = m.edits;
    if (this.onEdits) { this.onEdits(m.edits); this.onEdits = null; }
  }
};
ChunkManager.prototype.get = function (cx, cz) { return this.chunks.get(ckey(cx, cz)); };
ChunkManager.prototype.getBlock = function (x, y, z) {
  if (y < 0) return BID.bedrock;
  if (y >= CY) return 0;
  var c = this.chunks.get(ckey(x >> 4, z >> 4));
  if (!c || !c.blocks) return 0;
  return c.blocks[bIdx(x & 15, y, z & 15)];
};
ChunkManager.prototype.isLoaded = function (x, z) {
  var c = this.chunks.get(ckey(x >> 4, z >> 4));
  return !!(c && c.blocks);
};
ChunkManager.prototype.setBlock = function (x, y, z, id) {
  if (y < 0 || y >= CY) return false;
  var c = this.chunks.get(ckey(x >> 4, z >> 4));
  if (!c || !c.blocks) return false;
  var i = bIdx(x & 15, y, z & 15);
  if (c.blocks[i] === id) return false;
  c.blocks[i] = id;
  this.link.send({ t: 'set', x: x, y: y, z: z, id: id });
  return true;
};
ChunkManager.prototype.setMany = function (list) {
  for (var i = 0; i < list.length; i += 4) {
    var c = this.chunks.get(ckey(list[i] >> 4, list[i + 2] >> 4));
    if (c && c.blocks && list[i + 1] >= 0 && list[i + 1] < CY)
      c.blocks[bIdx(list[i] & 15, list[i + 1], list[i + 2] & 15)] = list[i + 3];
  }
  this.link.send({ t: 'setmany', list: list });
};
/* combined light 0..1 for entities and particles */
ChunkManager.prototype.lightAt = function (x, y, z, day) {
  if (y < 0) return 0.05;
  if (y >= CY) return day;
  var c = this.chunks.get(ckey(x >> 4, z >> 4));
  if (!c || !c.light) return day;
  var v = c.light[bIdx(x & 15, y, z & 15)];
  var sky = (v >> 4) / 15, blk = (v & 15) / 15;
  return Math.max(sky * day, blk);
};
ChunkManager.prototype.heightAt = function (x, z) {
  var c = this.chunks.get(ckey(x >> 4, z >> 4));
  if (!c || !c.heights) return -1;
  return c.heights[(x & 15) + (z & 15) * CX];
};
ChunkManager.prototype.biomeAt = function (x, z) {
  var c = this.chunks.get(ckey(x >> 4, z >> 4));
  if (!c || !c.biomes) return BIOME.PLAINS;
  return c.biomes[(x & 15) + (z & 15) * CX];
};

/* stream chunks around the player */
ChunkManager.prototype.update = function (px, pz, dist) {
  var ccx = Math.floor(px) >> 4, ccz = Math.floor(pz) >> 4;
  this.link.send({ t: 'center', cx: ccx, cz: ccz });
  var want = [];
  for (var dx = -dist; dx <= dist; dx++) {
    for (var dz = -dist; dz <= dist; dz++) {
      if (dx * dx + dz * dz > dist * dist + dist) continue;
      var cx = ccx + dx, cz = ccz + dz, key = ckey(cx, cz);
      if (this.chunks.has(key) || this.pending.has(key)) continue;
      want.push(dx * dx + dz * dz, cx, cz);
    }
  }
  /* nearest first */
  var tri = [];
  for (var i = 0; i < want.length; i += 3) tri.push([want[i], want[i + 1], want[i + 2]]);
  tri.sort(function (a, b) { return a[0] - b[0]; });
  var budget = 24;
  for (var j = 0; j < tri.length && j < budget; j++) {
    this.pending.add(ckey(tri[j][1], tri[j][2]));
    this.link.send({ t: 'req', cx: tri[j][1], cz: tri[j][2] });
  }
  /* drop distant chunks */
  var drop = [], self = this, lim = (dist + 3) * (dist + 3);
  this.chunks.forEach(function (c, key) {
    var ddx = c.cx - ccx, ddz = c.cz - ccz;
    if (ddx * ddx + ddz * ddz > lim) drop.push(key);
  });
  for (var d = 0; d < drop.length; d++) {
    var c2 = this.chunks.get(drop[d]);
    c2.dispose(); this.chunks.delete(drop[d]);
    this.link.send({ t: 'drop', cx: c2.cx, cz: c2.cz });
  }
};

/* ------------------------------------------------------------ worker link */
/* Uses a real Worker when the browser allows it (blob workers are blocked on
   file:// in some browsers) and otherwise runs the same code on a timer.     */
function makeWorkerLink(onMessage, onFail) {
  var srcEl = document.getElementById('shared-src');
  var source = srcEl ? srcEl.textContent : '';
  var worker = null;
  try {
    if (typeof Worker !== 'undefined' && source) {
      var blob = new Blob([source], { type: 'application/javascript' });
      var url = URL.createObjectURL(blob);
      worker = new Worker(url);
      worker.onmessage = function (e) { onMessage(e.data); };
      worker.onerror = function (e) {
        console.warn('worker error:', e.message || e);
        if (onFail) onFail();
      };
    }
  } catch (e) { worker = null; }
  if (worker) {
    return {
      mode: 'worker',
      worker: worker,
      send: function (m) { try { worker.postMessage(m); } catch (e) { if (onFail) onFail(); } },
      tick: function () {}
    };
  }
  var core = new WorkerCore(function (msg) { onMessage(msg); });
  return {
    mode: 'inline',
    send: function (m) { core.handle(m); },
    tick: function (budget) { core.tick(budget === undefined ? 6 : budget); }
  };
}
