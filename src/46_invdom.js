/* ========================================================= inventory DOM == */
function el(tag, cls, txt) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  return e;
}
function slotEl(ref) {
  var d = el('div', 'islot');
  d.dataset.ref = JSON.stringify(ref);
  return d;
}
function paintSlot(d, s) {
  d.innerHTML = '';
  if (!s) return;
  d.appendChild(iconEl(s.id, 64));
  if (s.n > 1) { var c = el('div', 'cnt', String(s.n)); d.appendChild(c); }
  var def = defOf(s.id);
  if (def && def.durability && s.dur > 0) {
    var bar = el('div', 'dur'), inner = el('i');
    var frac = 1 - s.dur / def.durability;
    inner.style.width = (frac * 100) + '%';
    inner.style.background = frac > .6 ? '#3f3' : frac > .3 ? '#ff3' : '#f33';
    bar.appendChild(inner); d.appendChild(bar);
  }
}
function grid(cols, refs) {
  var g = el('div', 'invgrid');
  g.style.gridTemplateColumns = 'repeat(' + cols + ',44px)';
  for (var i = 0; i < refs.length; i++) g.appendChild(slotEl(refs[i]));
  return g;
}
function refsFor(kind, from, to) {
  var a = [];
  for (var i = from; i < to; i++) a.push({ k: kind, i: i });
  return a;
}

function buildInvPanel() {
  var panel = document.getElementById('invpanel');
  panel.innerHTML = '';
  var p = GAME.player;
  var wrap = el('div');
  wrap.style.display = 'flex'; wrap.style.gap = '16px'; wrap.style.alignItems = 'flex-start';

  var left = el('div');
  var head = el('div');
  head.style.display = 'flex'; head.style.gap = '14px'; head.style.marginBottom = '10px';

  if (UI.open === 'inv' || UI.open === 'table') {
    var isTable = UI.open === 'table';
    var n = isTable ? 3 : 2;
    var cblock = el('div');
    cblock.appendChild(el('div', 'invtitle', isTable ? 'Crafting (3×3)' : 'Crafting (2×2)'));
    var row = el('div');
    row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.gap = '10px';
    row.appendChild(grid(n, refsFor('craft', 0, n * n)));
    var arrow = el('div', null, '➜'); arrow.style.fontSize = '20px'; arrow.style.color = '#3f3f3f';
    row.appendChild(arrow);
    var rg = el('div', 'invgrid');
    rg.style.gridTemplateColumns = '44px';
    rg.appendChild(slotEl({ k: 'result' }));
    row.appendChild(rg);
    cblock.appendChild(row);
    head.appendChild(cblock);

    if (!isTable) {
      var ablock = el('div');
      ablock.appendChild(el('div', 'invtitle', 'Armor'));
      ablock.appendChild(grid(1, refsFor('armor', 0, 4)));
      head.appendChild(ablock);
    }
  } else if (UI.open === 'furnace') {
    var fblock = el('div');
    fblock.appendChild(el('div', 'invtitle', 'Furnace'));
    var frow = el('div');
    frow.style.display = 'flex'; frow.style.alignItems = 'center'; frow.style.gap = '10px';
    var col = el('div');
    col.appendChild(grid(1, [{ k: 'fin' }]));
    var flame = el('div', null, '🔥'); flame.id = 'flameic';
    flame.style.textAlign = 'center'; flame.style.fontSize = '18px'; flame.style.margin = '4px 0';
    col.appendChild(flame);
    col.appendChild(grid(1, [{ k: 'ffuel' }]));
    frow.appendChild(col);
    var prog = el('div', null, '➜'); prog.id = 'cookarrow';
    prog.style.fontSize = '22px'; prog.style.color = '#3f3f3f';
    frow.appendChild(prog);
    frow.appendChild(grid(1, [{ k: 'fout' }]));
    fblock.appendChild(frow);
    head.appendChild(fblock);
  } else if (UI.open === 'chest') {
    var chb = el('div');
    chb.appendChild(el('div', 'invtitle', 'Chest'));
    chb.appendChild(grid(9, refsFor('chest', 0, 27)));
    head.appendChild(chb);
  }
  left.appendChild(head);

  left.appendChild(el('div', 'invtitle', 'Inventory'));
  left.appendChild(grid(9, refsFor('inv', 9, 36)));
  var hb = el('div'); hb.style.marginTop = '8px';
  hb.appendChild(grid(9, refsFor('inv', 0, 9)));
  left.appendChild(hb);
  wrap.appendChild(left);

  /* recipe helper */
  if (UI.open === 'inv' || UI.open === 'table') {
    var right = el('div');
    right.style.width = '212px';
    right.appendChild(el('div', 'invtitle', 'Can craft now: click to make'));
    var list = el('div'); list.id = 'reclist';
    list.style.maxHeight = '330px'; list.style.overflowY = 'auto';
    list.style.background = '#b0b0b0'; list.style.padding = '4px';
    list.style.display = 'grid'; list.style.gridTemplateColumns = 'repeat(4,44px)'; list.style.gap = '2px';
    right.appendChild(list);
    var hint = el('div', 'invtitle', 'Tip: open a Crafting Table for 3×3 recipes.');
    hint.style.fontSize = '10px'; hint.style.marginTop = '6px';
    right.appendChild(hint);
    wrap.appendChild(right);
  }
  panel.appendChild(wrap);
  refreshInv();
  refreshRecipeList();
}

/* Safe to call every frame: the parsed slot ref and a content signature are
   cached on the element, so unchanged slots cost a string compare. */
function refreshInv() {
  var panel = document.getElementById('invpanel');
  if (!panel) return;
  var slots = panel.querySelectorAll('.islot');
  for (var i = 0; i < slots.length; i++) {
    var d = slots[i];
    if (!d.dataset.ref) continue;              // recipe buttons paint themselves
    if (!d._ref) d._ref = JSON.parse(d.dataset.ref);
    var s = getSlot(d._ref);
    var sig = s ? s.id + ':' + s.n + ':' + s.dur : '0';
    if (d._sig === sig) continue;
    d._sig = sig;
    paintSlot(d, s);
  }
  var f = UI.container;
  if (UI.open === 'furnace' && f) {
    var fl = document.getElementById('flameic');
    if (fl) fl.style.opacity = f.burn > 0 ? 1 : 0.25;
    var ca = document.getElementById('cookarrow');
    if (ca) { ca.style.color = f.cook > 0 ? '#2a7' : '#3f3f3f'; ca.style.opacity = 0.4 + 0.6 * (f.cook / 10); }
  }
}
var _recSig = '';
function refreshRecipeList() {
  var list = document.getElementById('reclist');
  if (!list) return;
  var p = GAME.player;
  var avail = craftableList(p, UI.open === 'table');
  var sig = avail.map(function (r) { return r.outId + 'x' + r.n; }).join(',') + '|' + UI.open;
  if (sig === _recSig) return;
  _recSig = sig;
  list.innerHTML = '';
  for (var i = 0; i < avail.length && i < 80; i++) {
    (function (rc) {
      var d = el('div', 'islot');
      d.appendChild(iconEl(rc.outId, 64));
      if (rc.n > 1) d.appendChild(el('div', 'cnt', String(rc.n)));
      d.title = labelOf(rc.outId);
      d.dataset.rec = '1';
      d.onmouseenter = function (e) { showTooltip(e, rc.outId, true); };
      d.onmouseleave = hideTooltip;
      d.onclick = function () {
        craftFromList(p, rc);
        refreshInv(); _recSig = ''; refreshRecipeList(); updateHotbar();
      };
      list.appendChild(d);
    })(avail[i]);
  }
  if (!avail.length) {
    var m = el('div', null, 'Nothing craftable yet. Punch a tree.');
    m.style.gridColumn = 'span 4'; m.style.fontSize = '11px'; m.style.padding = '6px';
    list.appendChild(m);
  }
}

/* --------------------------------------------------------------- tooltip - */
function showTooltip(e, id, isRecipe) {
  var t = document.getElementById('tooltip');
  var d = defOf(id);
  if (!d) return;
  var extra = '';
  if (isItem(id)) {
    var it = ITEMS[id];
    if (it.tool) extra += '<small>' + it.tool + ' · tier ' + it.level + ' · ' + it.damage + ' dmg</small>';
    if (it.armor) extra += '<small>armor +' + it.armor + '</small>';
    if (it.food) extra += '<small>restores ' + it.food + ' hunger</small>';
    if (it.durability) extra += '<small>durability ' + it.durability + '</small>';
    if (it.fuel) extra += '<small>fuel</small>';
  } else {
    var b = BLOCKS[id];
    if (b.hardness > 0) extra += '<small>hardness ' + b.hardness + (b.tool ? ' · ' + b.tool : '') + '</small>';
    if (b.light) extra += '<small>light level ' + b.light + '</small>';
  }
  t.innerHTML = '<b>' + d.label + '</b>' + extra;
  t.style.display = 'block';
  var x = e.clientX + 14, y = e.clientY + 14;
  if (x + t.offsetWidth > innerWidth) x = innerWidth - t.offsetWidth - 4;
  if (y + t.offsetHeight > innerHeight) y = innerHeight - t.offsetHeight - 4;
  t.style.left = x + 'px'; t.style.top = y + 'px';
}
function hideTooltip() { document.getElementById('tooltip').style.display = 'none'; }

/* ------------------------------------------------------------ interaction */
function initInvEvents() {
  var screen = document.getElementById('inv');
  screen.addEventListener('mousedown', function (e) {
    var s = e.target.closest ? e.target.closest('.islot') : null;
    if (!s || s.dataset.rec) return;
    e.preventDefault();
    var ref = JSON.parse(s.dataset.ref);
    clickSlot(ref, e.button === 2 ? 2 : 0, e.shiftKey);
    refreshInv(); _recSig = ''; refreshRecipeList(); updateHotbar(); updateCursorEl(e);
  });
  screen.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  screen.addEventListener('mousemove', function (e) {
    updateCursorEl(e);
    var s = e.target.closest ? e.target.closest('.islot') : null;
    if (s && !s.dataset.rec) {
      var sl = getSlot(JSON.parse(s.dataset.ref));
      if (sl) { showTooltip(e, sl.id); return; }
    }
    if (!s || !s.dataset.rec) hideTooltip();
  });
  screen.addEventListener('mouseleave', function () { hideTooltip(); });
}
function updateCursorEl(e) {
  var d = document.getElementById('drag');
  var c = GAME.player.cursor;
  if (!c) { d.style.display = 'none'; return; }
  d.style.display = 'block';
  d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px';
  if (d._id !== c.id || d._n !== c.n) {
    d._id = c.id; d._n = c.n;
    d.innerHTML = '';
    d.appendChild(iconEl(c.id, 64));
    if (c.n > 1) d.appendChild(el('div', 'cnt', String(c.n)));
  }
}

/* --------------------------------------------------------------- hotbar -- */
function buildHotbar() {
  var hb = document.getElementById('hotbar');
  hb.innerHTML = '';
  _hbSig = []; _hbSel = -1;                    // caches refer to the old nodes
  for (var i = 0; i < 9; i++) {
    var s = el('div', 'slot');
    s.dataset.i = i;
    hb.appendChild(s);
  }
}
var _hbSig = [], _hbSel = -1;
/* Also safe to call every frame — only changed slots touch the DOM. */
function updateHotbar() {
  var hb = document.getElementById('hotbar');
  var p = GAME.player;
  if (!hb || hb.children.length < 9 || !p) return;
  if (_hbSel !== p.sel) {
    /* touch only the two slots that changed — rewriting all nine repaints the
       whole overlay strip on every scroll of the mouse wheel */
    if (_hbSel >= 0 && _hbSel < 9) hb.children[_hbSel].className = 'slot';
    hb.children[p.sel].className = 'slot sel';
    _hbSel = p.sel;
  }
  for (var i = 0; i < 9; i++) {
    var d = hb.children[i], s = p.inv[i];
    var sig = s ? s.id + ':' + s.n + ':' + s.dur : '0';
    if (_hbSig[i] === sig) continue;
    _hbSig[i] = sig;
    d.innerHTML = '';
    if (!s) continue;
    d.appendChild(iconEl(s.id, 64));
    if (s.n > 1) d.appendChild(el('div', 'cnt', String(s.n)));
    var def = defOf(s.id);
    if (def && def.durability && s.dur > 0) {
      var bar = el('div', 'dur'), inner = el('i');
      var frac = 1 - s.dur / def.durability;
      inner.style.width = (frac * 100) + '%';
      inner.style.background = frac > .6 ? '#3f3' : frac > .3 ? '#ff3' : '#f33';
      bar.appendChild(inner); d.appendChild(bar);
    }
  }
}
