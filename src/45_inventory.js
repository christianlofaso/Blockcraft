/* ============================================================== inventory == */
var UI = {
  open: null,          // null | 'inv' | 'table' | 'furnace' | 'chest'
  grid: new Array(9).fill(null),
  result: null,
  container: null,     // {kind, key, data}
  dragEl: null,
  hoverRef: null
};

function slotCopy(s) { return s ? new Slot(s.id, s.n, s.dur) : null; }
function sameItem(a, b) { return a && b && a.id === b.id && a.dur === b.dur; }

/* --------------------------------------------------------- recipe match -- */
function gridBounds(ids, w, h) {
  var x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    if (!ids[y * w + x]) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x0: x0, y0: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
function matchRecipe(slots, w, h) {
  var ids = slots.map(function (s) { return s ? s.id : 0; });
  var nonEmpty = ids.filter(function (i) { return i; });
  if (!nonEmpty.length) return null;
  var b = gridBounds(ids, w, h);
  var sortedAll = nonEmpty.slice().sort(function (a, c) { return a - c; });
  for (var r = 0; r < RECIPES.length; r++) {
    var rc = RECIPES[r];
    if (rc.anyIds) {
      if (rc.anyIds.length !== sortedAll.length) continue;
      var ok = true;
      for (var i = 0; i < sortedAll.length; i++) if (sortedAll[i] !== rc.anyIds[i]) { ok = false; break; }
      if (ok) return rc;
      continue;
    }
    if (!b || rc.w !== b.w || rc.h !== b.h) continue;
    var good = true;
    for (var y = 0; y < rc.h && good; y++) {
      for (var x = 0; x < rc.w; x++) {
        var want = rc.grid[y * rc.w + x];
        var got = ids[(b.y0 + y) * w + (b.x0 + x)];
        if (want !== got) { good = false; break; }
      }
    }
    if (good) return rc;
  }
  return null;
}
function updateCraftResult(w, h) {
  var n = w * h;
  var sub = UI.grid.slice(0, n);
  var rc = matchRecipe(sub, w, h);
  UI.result = rc ? new Slot(rc.outId, rc.n) : null;
  UI.resultRecipe = rc;
}
function consumeCraft(w, h) {
  var n = w * h;
  for (var i = 0; i < n; i++) {
    var s = UI.grid[i];
    if (!s) continue;
    s.n--;
    if (s.n <= 0) UI.grid[i] = null;
  }
}

/* which recipes can the player make right now? */
function craftableList(player, allow3x3) {
  var have = {};
  for (var i = 0; i < 36; i++) {
    var s = player.inv[i];
    if (s) have[s.id] = (have[s.id] || 0) + s.n;
  }
  var out = [];
  for (var r = 0; r < RECIPES.length; r++) {
    var rc = RECIPES[r];
    if (rc.hidden) continue;
    var need = {}, big = false;
    if (rc.anyIds) { for (var a = 0; a < rc.anyIds.length; a++) need[rc.anyIds[a]] = (need[rc.anyIds[a]] || 0) + 1; if (rc.anyIds.length > 4) big = true; }
    else {
      if (rc.w > 2 || rc.h > 2) big = true;
      for (var g = 0; g < rc.grid.length; g++) if (rc.grid[g]) need[rc.grid[g]] = (need[rc.grid[g]] || 0) + 1;
    }
    if (big && !allow3x3) continue;
    var ok = true;
    for (var k in need) if ((have[k] || 0) < need[k]) { ok = false; break; }
    if (ok) out.push(rc);
  }
  return out;
}
function craftFromList(player, rc) {
  var need = {};
  if (rc.anyIds) for (var a = 0; a < rc.anyIds.length; a++) need[rc.anyIds[a]] = (need[rc.anyIds[a]] || 0) + 1;
  else for (var g = 0; g < rc.grid.length; g++) if (rc.grid[g]) need[rc.grid[g]] = (need[rc.grid[g]] || 0) + 1;
  for (var k in need) {
    var left = need[k];
    for (var i = 0; i < 36 && left > 0; i++) {
      var s = player.inv[i];
      if (!s || s.id !== (k | 0)) continue;
      var take = Math.min(left, s.n);
      s.n -= take; left -= take;
      if (s.n <= 0) player.inv[i] = null;
    }
  }
  var over = player.give(rc.outId, rc.n);
  if (over > 0) GAME.ents.dropItem(rc.outId, over, GAME.player.x, GAME.player.y + 1, GAME.player.z);
  sfx('click', .4, 1.3);
}

/* ------------------------------------------------------------ containers - */
var containers = new Map();
function containerAt(x, y, z, kind) {
  var key = x + ',' + y + ',' + z;
  var c = containers.get(key);
  if (!c) {
    c = kind === 'furnace'
      ? { kind: 'furnace', input: null, fuel: null, output: null, burn: 0, burnMax: 0, cook: 0 }
      : { kind: 'chest', items: new Array(27).fill(null) };
    containers.set(key, c);
  }
  return c;
}
function tickFurnaces(dt) {
  containers.forEach(function (c, key) {
    if (c.kind !== 'furnace') return;
    var parts = key.split(','), x = +parts[0], y = +parts[1], z = +parts[2];
    var recipe = c.input ? SMELT[c.input.id] : null;
    var canCook = !!recipe && (!c.output || (c.output.id === recipe.out && c.output.n + recipe.n <= stackSizeOf(recipe.out)));
    if (c.burn > 0) c.burn -= dt;
    if (c.burn <= 0 && canCook && c.fuel) {
      var f = fuelOf(c.fuel.id);
      if (f > 0) {
        c.burn = f; c.burnMax = c.burn;          /* coal = 80s ≈ 8 items */
        c.fuel.n--;
        if (c.fuel.id === IID.i_lava_bucket) c.fuel = new Slot(IID.i_bucket, 1);
        else if (c.fuel.n <= 0) c.fuel = null;
      }
    }
    if (c.burn > 0 && canCook) {
      c.cook += dt;
      if (c.cook >= 10) {
        c.cook = 0;
        c.input.n--; if (c.input.n <= 0) c.input = null;
        if (c.output) c.output.n += recipe.n;
        else c.output = new Slot(recipe.out, recipe.n);
        c.xp = (c.xp || 0) + recipe.xp;
      }
    } else c.cook = Math.max(0, c.cook - dt * 2);
    var lit = c.burn > 0;
    var cur = GAME.chunks.getBlock(x, y, z);
    if (lit && cur === BID.furnace) GAME.setBlock(x, y, z, BID.lit_furnace, true);
    else if (!lit && cur === BID.lit_furnace) GAME.setBlock(x, y, z, BID.furnace, true);
  });
}

/* ------------------------------------------------------------- slot refs - */
function getSlot(ref) {
  var p = GAME.player;
  switch (ref.k) {
    case 'inv': return p.inv[ref.i];
    case 'armor': return p.armor[ref.i];
    case 'craft': return UI.grid[ref.i];
    case 'result': return UI.result;
    case 'chest': return UI.container.items[ref.i];
    case 'fin': return UI.container.input;
    case 'ffuel': return UI.container.fuel;
    case 'fout': return UI.container.output;
  }
  return null;
}
function setSlot(ref, s) {
  var p = GAME.player;
  switch (ref.k) {
    case 'inv': p.inv[ref.i] = s; break;
    case 'armor': p.armor[ref.i] = s; break;
    case 'craft': UI.grid[ref.i] = s; break;
    case 'chest': UI.container.items[ref.i] = s; break;
    case 'fin': UI.container.input = s; break;
    case 'ffuel': UI.container.fuel = s; break;
    case 'fout': UI.container.output = s; break;
  }
}
function slotAccepts(ref, s) {
  if (!s) return true;
  if (ref.k === 'armor') {
    var d = ITEMS[s.id];
    return !!(d && d.slot === ARMOR_KINDS[ref.i]);
  }
  if (ref.k === 'result' || ref.k === 'fout') return false;
  return true;
}

function clickSlot(ref, button, shift) {
  var p = GAME.player;
  var cur = getSlot(ref), cursor = p.cursor;

  /* result slot: craft */
  if (ref.k === 'result') {
    if (!UI.result) return;
    var w = UI.open === 'table' ? 3 : 2;
    if (shift) {
      var guard = 0;
      while (UI.result && guard++ < 64) {
        if (p.give(UI.result.id, UI.result.n) > 0) break;
        consumeCraft(w, w); updateCraftResult(w, w);
      }
    } else if (!cursor) {
      p.cursor = slotCopy(UI.result);
      consumeCraft(w, w); updateCraftResult(w, w);
    } else if (cursor.id === UI.result.id && cursor.n + UI.result.n <= stackSizeOf(cursor.id)) {
      cursor.n += UI.result.n;
      consumeCraft(w, w); updateCraftResult(w, w);
    }
    sfx('click', .35, 1.2);
    return;
  }
  if (ref.k === 'fout') {
    if (!cur) return;
    if (shift) { if (p.give(cur.id, cur.n) === 0) setSlot(ref, null); }
    else if (!cursor) { p.cursor = cur; setSlot(ref, null); }
    else if (sameItem(cursor, cur) && cursor.n + cur.n <= stackSizeOf(cur.id)) { cursor.n += cur.n; setSlot(ref, null); }
    if (UI.container && UI.container.xp) { p.addXP(Math.ceil(UI.container.xp)); UI.container.xp = 0; }
    return;
  }
  /* shift-click: move between inventory and the open container */
  if (shift && cur) {
    if (ref.k === 'inv') {
      if (UI.open === 'chest') {
        for (var i = 0; i < 27 && cur; i++) {
          var d = UI.container.items[i];
          if (d && sameItem(d, cur) && d.n < stackSizeOf(d.id)) {
            var add = Math.min(cur.n, stackSizeOf(d.id) - d.n);
            d.n += add; cur.n -= add;
            if (cur.n <= 0) { setSlot(ref, null); cur = null; }
          }
        }
        for (var j = 0; j < 27 && cur; j++)
          if (!UI.container.items[j]) { UI.container.items[j] = cur; setSlot(ref, null); cur = null; }
      } else if (UI.open === 'furnace') {
        if (fuelOf(cur.id) > 0 && !UI.container.fuel) { UI.container.fuel = cur; setSlot(ref, null); }
        else if (SMELT[cur.id] && !UI.container.input) { UI.container.input = cur; setSlot(ref, null); }
      } else {
        var dd = ITEMS[cur.id];
        if (dd && dd.slot) {
          var ai = ARMOR_KINDS.indexOf(dd.slot);
          if (ai >= 0 && !p.armor[ai]) { p.armor[ai] = cur; setSlot(ref, null); }
        } else {
          /* hotbar <-> backpack */
          var from = ref.i, lo = from < 9 ? 9 : 0, hi = from < 9 ? 36 : 9;
          for (var k = lo; k < hi && cur; k++) {
            var t = p.inv[k];
            if (t && sameItem(t, cur) && t.n < stackSizeOf(t.id)) {
              var a2 = Math.min(cur.n, stackSizeOf(t.id) - t.n);
              t.n += a2; cur.n -= a2;
              if (cur.n <= 0) { p.inv[from] = null; cur = null; }
            }
          }
          for (var k2 = lo; k2 < hi && cur; k2++)
            if (!p.inv[k2]) { p.inv[k2] = cur; p.inv[from] = null; cur = null; }
        }
      }
    } else {
      if (p.give(cur.id, cur.n, cur.dur) === 0) setSlot(ref, null);
    }
    sfx('click', .3, 1.1);
    return;
  }

  /* normal pick up / put down */
  if (button === 2) {                       // right click: split / place one
    if (cursor) {
      if (!cur && slotAccepts(ref, cursor)) {
        setSlot(ref, new Slot(cursor.id, 1, cursor.dur));
        cursor.n--; if (cursor.n <= 0) p.cursor = null;
      } else if (cur && sameItem(cur, cursor) && cur.n < stackSizeOf(cur.id)) {
        cur.n++; cursor.n--; if (cursor.n <= 0) p.cursor = null;
      }
    } else if (cur) {
      var half = Math.ceil(cur.n / 2);
      p.cursor = new Slot(cur.id, half, cur.dur);
      cur.n -= half; if (cur.n <= 0) setSlot(ref, null);
    }
  } else {
    if (cursor && cur && sameItem(cur, cursor) && cur.n < stackSizeOf(cur.id)) {
      var add3 = Math.min(cursor.n, stackSizeOf(cur.id) - cur.n);
      cur.n += add3; cursor.n -= add3;
      if (cursor.n <= 0) p.cursor = null;
    } else if (slotAccepts(ref, cursor)) {
      setSlot(ref, cursor); p.cursor = cur;
    }
  }
  if (UI.open === 'inv' || UI.open === 'table') updateCraftResult(UI.open === 'table' ? 3 : 2, UI.open === 'table' ? 3 : 2);
  sfx('click', .3, 1);
}
