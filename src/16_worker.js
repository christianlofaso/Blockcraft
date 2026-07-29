/* ============================================================ worker core == */
function WorkerCore(post) {
  this.post = post;
  this.world = null;
  this.queue = [];              // [cx,cz,...]
  this.sent = new Set();
  this.center = [0, 0];
  this.busy = false;
}
WorkerCore.prototype.now = function () {
  return (typeof performance !== 'undefined' ? performance.now() : Date.now());
};
WorkerCore.prototype.handle = function (m) {
  switch (m.t) {
    case 'init':
      this.world = new World(m.seed);
      if (m.edits) {
        for (var k in m.edits) {
          var key = k | 0, src = m.edits[k], dst = {};
          for (var i in src) dst[i | 0] = src[i];
          this.world.edits.set(key, dst);
        }
      }
      this.post({ t: 'ready' });
      break;
    case 'req':
      this.queue.push(m.cx, m.cz);
      break;
    case 'center':
      this.center[0] = m.cx; this.center[1] = m.cz;
      break;
    case 'drop':
      this.world.unload(m.cx, m.cz);
      this.sent.delete(ckey(m.cx, m.cz));
      break;
    case 'set':
      this.world.setBlockLit(m.x, m.y, m.z, m.id);
      break;
    case 'setmany':
      for (var j = 0; j < m.list.length; j += 4)
        this.world.setBlockLit(m.list[j], m.list[j + 1], m.list[j + 2], m.list[j + 3]);
      break;
    case 'edits':
      this.post({ t: 'editdump', edits: this.dumpEdits() });
      break;
  }
};
WorkerCore.prototype.dumpEdits = function () {
  var o = {};
  this.world.edits.forEach(function (v, k) { o[k] = v; });
  return o;
};
WorkerCore.prototype.popNearest = function () {
  var q = this.queue, best = -1, bd = Infinity, cx = this.center[0], cz = this.center[1];
  for (var i = 0; i < q.length; i += 2) {
    var dx = q[i] - cx, dz = q[i + 1] - cz, d = dx * dx + dz * dz;
    if (d < bd) { bd = d; best = i; }
  }
  if (best < 0) return null;
  var r = [q[best], q[best + 1]];
  q.splice(best, 2);
  return r;
};
WorkerCore.prototype.tick = function (budget) {
  if (!this.world) return;
  var t0 = this.now(), w = this.world;
  /* 1. new chunks */
  while (this.queue.length && this.now() - t0 < budget) {
    var job = this.popNearest();
    if (!job) break;
    var cx = job[0], cz = job[1], key = ckey(cx, cz);
    if (this.sent.has(key)) continue;
    var c = w.ensure(cx, cz);
    for (var ox = -1; ox <= 1; ox++) for (var oz = -1; oz <= 1; oz++)
      if (ox || oz) w.ensure(cx + ox, cz + oz);
    if (!c.lit) w.initChunkLight(c);
    var mesh = meshChunk(w, c);
    c.dirty = false; w.dirtySet.delete(key);
    this.sent.add(key);
    var blocksCopy = c.blocks.slice(), lightCopy = c.light.slice();
    this.post({
      t: 'chunk', cx: cx, cz: cz, blocks: blocksCopy, light: lightCopy,
      opaque: mesh.opaque, trans: mesh.trans,
      heights: c.heights.slice(), biomes: c.biomes.slice()
    }, [blocksCopy.buffer, lightCopy.buffer, mesh.opaque.buffer, mesh.trans.buffer]);
  }
  /* 2. re-mesh dirty chunks that the client already knows about */
  var n = 0;
  if (w.dirtySet.size) {
    var list = [];
    w.dirtySet.forEach(function (k) { list.push(k); });
    for (var i = 0; i < list.length; i++) {
      if (this.now() - t0 > budget + 6 && n > 0) break;
      var k2 = list[i];
      if (!this.sent.has(k2)) { continue; }
      var cc = w.chunks.get(k2);
      w.dirtySet.delete(k2);
      if (!cc) continue;
      cc.dirty = false;
      var m2 = meshChunk(w, cc);
      n++;
      var lc = cc.light.slice();
      this.post({ t: 'mesh', cx: cc.cx, cz: cc.cz, opaque: m2.opaque, trans: m2.trans, light: lc },
                [m2.opaque.buffer, m2.trans.buffer, lc.buffer]);
    }
  }
};

/* When this file is evaluated inside a real Worker, wire up the message pump. */
if (typeof importScripts === 'function' || (typeof WorkerGlobalScope !== 'undefined' &&
    typeof self !== 'undefined' && self instanceof WorkerGlobalScope)) {
  var _core = new WorkerCore(function (msg, transfer) { self.postMessage(msg, transfer || []); });
  self.onmessage = function (e) { _core.handle(e.data); };
  (function loop() {
    _core.tick(14);
    setTimeout(loop, _core.queue.length || _core.world && _core.world.dirtySet.size ? 0 : 16);
  })();
}
