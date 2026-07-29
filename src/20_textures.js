/* ============================================== procedural texture atlas == */
/* Every tile is painted from scratch into a 16x16 RGBA buffer, then uploaded
   as one layer of a WebGL TEXTURE_2D_ARRAY.                                  */
var TS = 16;
var _texData = new Uint8Array(TS * TS * 4 * TEX_COUNT);
var _cur = null, _rng = null;

function tset(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= TS || y >= TS) return;
  var i = ((y * TS) + x) * 4;
  _cur[i] = r < 0 ? 0 : r > 255 ? 255 : r | 0;
  _cur[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g | 0;
  _cur[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b | 0;
  _cur[i + 3] = a === undefined ? 255 : a;
}
function tget(x, y) { var i = ((y * TS) + x) * 4; return [_cur[i], _cur[i + 1], _cur[i + 2], _cur[i + 3]]; }
function clear() { for (var i = 0; i < TS * TS * 4; i++) _cur[i] = 0; }
function fill(c, vary, mono) {
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
    var d = vary ? (_rng() - .5) * 2 * vary : 0;
    if (mono) tset(x, y, c[0] + d, c[1] + d, c[2] + d);
    else tset(x, y, c[0] + d, c[1] + d * .95, c[2] + d * .9);
  }
}
function rectf(x0, y0, w, h, c, vary) {
  for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) {
    var d = vary ? (_rng() - .5) * 2 * vary : 0;
    tset(x, y, c[0] + d, c[1] + d, c[2] + d);
  }
}
function speck(n, c, vary) {
  for (var i = 0; i < n; i++) {
    var x = (_rng() * TS) | 0, y = (_rng() * TS) | 0, d = vary ? (_rng() - .5) * 2 * vary : 0;
    tset(x, y, c[0] + d, c[1] + d, c[2] + d);
  }
}
function blob(cx, cy, r, c, vary) {
  for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) {
    if (x * x + y * y > r * r + (_rng() * 1.4)) continue;
    var d = vary ? (_rng() - .5) * 2 * vary : 0;
    tset(((cx + x) + TS) % TS, ((cy + y) + TS) % TS, c[0] + d, c[1] + d, c[2] + d);
  }
}
function tline(x0, y0, x1, y1, c, th) {
  th = th || 1;
  var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
  for (var i = 0; i <= n; i++) {
    var t = i / n, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t);
    for (var oy = 0; oy < th; oy++) for (var ox = 0; ox < th; ox++) tset(x + ox, y + oy, c[0], c[1], c[2]);
  }
}
function shade(amount) {                    /* cheap bevel: light top-left, dark bottom-right */
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
    var p = tget(x, y); if (!p[3]) continue;
    var f = 0;
    if (x < 1 || y < 1) f = amount; else if (x > TS - 2 || y > TS - 2) f = -amount;
    if (f) tset(x, y, p[0] + f, p[1] + f, p[2] + f, p[3]);
  }
}
function outline(c) {
  var copy = _cur.slice();
  function A(x, y) { return (x < 0 || y < 0 || x >= TS || y >= TS) ? 0 : copy[((y * TS) + x) * 4 + 3]; }
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
    if (A(x, y)) continue;
    if (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1)) tset(x, y, c[0], c[1], c[2], 255);
  }
}

var TEXGEN = {};
function mk(name, fn) { TEXGEN[name] = fn; }

/* ------------------------------------------------------------ terrain ---- */
mk('stone', function () { fill([124, 124, 124], 16, 1); speck(30, [104, 104, 104], 8); speck(18, [142, 142, 142], 6); });
mk('cobblestone', function () {
  fill([104, 104, 104], 8, 1);
  var cells = [[0,0,7,7],[8,0,8,4],[8,5,4,5],[13,5,3,5],[0,8,5,4],[6,8,6,4],[0,13,8,3],[9,11,7,5],[8,10,0,0]];
  for (var i = 0; i < cells.length; i++) {
    var c = cells[i]; if (!c[2]) continue;
    var g = 118 + _rng() * 40;
    rectf(c[0] + 1, c[1] + 1, Math.max(1, c[2] - 1), Math.max(1, c[3] - 1), [g, g, g], 12);
  }
  speck(24, [78, 78, 78], 6);
});
mk('dirt', function () { fill([134, 96, 67], 14); speck(40, [118, 84, 58], 8); speck(18, [150, 110, 78], 8); });
mk('coarse_dirt', function () { fill([124, 88, 62], 16); speck(60, [104, 74, 52], 10); });
/* grass_top / grass_side are drawn greyscale and tinted per-biome in the
   shader, so they need real contrast or the tint flattens them to mush. */
/* Keep this high-frequency: low-frequency blobs survive into the mip chain and
   turn into soft mush at grazing angles, while fine noise averages to a clean
   flat colour the way a real 16x16 grass tile does. */
mk('grass_top', function () {
  fill([205, 205, 205], 26, 1);
  speck(60, [172, 172, 172], 16);
  speck(38, [235, 235, 235], 12);
  speck(16, [148, 148, 148], 10);
});
mk('grass_side', function () {
  TEXGEN.dirt();
  for (var x = 0; x < TS; x++) {
    var h = 3 + ((_rng() * 4) | 0);
    for (var y = 0; y < h; y++) {
      var g = 214 + (_rng() - .5) * 46 - y * 5;
      tset(x, y, g, g, g);
    }
    if (_rng() < .45) { var g2 = 190 + _rng() * 30; tset(x, h, g2, g2, g2); }
  }
});
mk('grass_side_snow', function () {
  TEXGEN.dirt();
  for (var x = 0; x < TS; x++) { var h = 4 + ((_rng() * 3) | 0);
    for (var y = 0; y < h; y++) { var g = 238 + _rng() * 16; tset(x, y, g, g, g + 4); } }
});
mk('podzol_top', function () { fill([92, 68, 38], 14); speck(50, [122, 92, 44], 10); speck(20, [70, 50, 28], 8); });
mk('mycelium_top', function () { fill([124, 108, 116], 12); speck(46, [104, 88, 100], 10); speck(16, [150, 130, 140], 8); });
mk('sand', function () { fill([219, 207, 163], 10); speck(34, [206, 193, 148], 6); speck(14, [232, 222, 180], 6); });
mk('red_sand', function () { fill([190, 105, 50], 12); speck(34, [172, 92, 42], 7); });
mk('gravel', function () {
  fill([130, 128, 126], 12, 1);
  for (var i = 0; i < 22; i++) { var g = 96 + _rng() * 70; blob((_rng() * TS) | 0, (_rng() * TS) | 0, 1 + (_rng() * 1.6 | 0), [g, g, g], 8); }
});
mk('clay', function () { fill([160, 166, 179], 8, 1); speck(28, [148, 154, 168], 6); });
mk('bedrock', function () {
  fill([85, 85, 85], 10, 1);
  for (var i = 0; i < 16; i++) { var g = 40 + _rng() * 70; blob((_rng() * TS) | 0, (_rng() * TS) | 0, 1 + (_rng() * 2 | 0), [g, g, g], 10); }
});
mk('granite', function () { fill([154, 106, 88], 12); speck(40, [172, 124, 104], 8); speck(20, [134, 90, 74], 8); });
mk('diorite', function () { fill([204, 204, 206], 12, 1); speck(40, [176, 176, 180], 8); speck(20, [226, 226, 228], 8); });
mk('andesite', function () { fill([136, 137, 136], 10, 1); speck(40, [120, 121, 120], 8); speck(20, [154, 155, 154], 8); });
mk('netherrack', function () { fill([111, 54, 52], 14); speck(50, [92, 42, 40], 10); speck(20, [130, 66, 62], 8); });
mk('soul_sand', function () { fill([84, 64, 51], 12); speck(30, [66, 50, 40], 8);
  blob(4, 5, 2, [58, 44, 36], 6); blob(11, 10, 2, [58, 44, 36], 6); });
mk('snow', function () { fill([246, 250, 252], 8, 1); speck(24, [232, 238, 246], 5); });
mk('ice', function () { fill([145, 183, 235], 10); speck(20, [168, 202, 245], 8);
  tline(2, 12, 9, 3, [190, 220, 250], 1); tline(8, 14, 14, 7, [190, 220, 250], 1); });
mk('packed_ice', function () { fill([131, 172, 232], 8); speck(30, [150, 188, 240], 6); });

/* ------------------------------------------------------------- ores ------ */
function oreTex(color, dark, n) {
  return function () {
    TEXGEN.stone();
    var spots = [[3, 3], [10, 4], [5, 10], [12, 11], [8, 7], [2, 13]];
    for (var i = 0; i < (n || 4); i++) {
      var s = spots[i % spots.length];
      var cx = s[0] + ((_rng() * 3) | 0) - 1, cy = s[1] + ((_rng() * 3) | 0) - 1;
      blob(cx, cy, 1 + ((_rng() * 1.7) | 0), color, 14);
      tset(cx - 1, cy - 1, dark[0], dark[1], dark[2]);
    }
  };
}
mk('coal_ore', oreTex([38, 38, 38], [20, 20, 20], 5));
mk('iron_ore', oreTex([206, 160, 128], [150, 106, 80], 4));
mk('gold_ore', oreTex([250, 209, 68], [190, 150, 40], 4));
mk('diamond_ore', oreTex([106, 233, 226], [60, 180, 176], 4));
mk('emerald_ore', oreTex([70, 220, 110], [36, 160, 76], 3));
mk('redstone_ore', oreTex([224, 40, 40], [150, 20, 20], 5));
mk('lapis_ore', oreTex([48, 84, 190], [28, 54, 140], 4));

/* ------------------------------------------------------------- wood ------ */
mk('log_side', function () {
  fill([104, 78, 46], 8);
  for (var x = 0; x < TS; x++) {
    var v = Math.sin(x * 1.7) * 8 + (_rng() - .5) * 10;
    for (var y = 0; y < TS; y++) tset(x, y, 108 + v, 82 + v * .8, 48 + v * .5);
  }
  for (var i = 0; i < 5; i++) { var x0 = (_rng() * TS) | 0; tline(x0, 0, x0, 15, [86, 62, 36], 1); }
  rectf(0, 0, TS, 1, [92, 68, 40], 6); rectf(0, 15, TS, 1, [92, 68, 40], 6);
});
mk('log_top', function () {
  fill([150, 118, 72], 8);
  for (var r = 7; r > 0; r -= 2) {
    for (var a = 0; a < 64; a++) {
      var th = a / 64 * Math.PI * 2;
      tset(Math.round(8 + Math.cos(th) * r), Math.round(8 + Math.sin(th) * r), 112, 84, 48);
    }
  }
  blob(8, 8, 1, [96, 70, 40], 4);
});
mk('birch_log_side', function () {
  fill([216, 214, 205], 8, 1);
  for (var i = 0; i < 7; i++) {
    var y = (_rng() * TS) | 0, w = 2 + ((_rng() * 4) | 0), x = (_rng() * (TS - w)) | 0;
    rectf(x, y, w, 1, [60, 58, 54], 8);
    if (_rng() < .5) rectf(x, y + 1, Math.max(1, w - 2), 1, [86, 84, 78], 6);
  }
});
mk('birch_log_top', function () { fill([196, 178, 130], 8);
  for (var r = 7; r > 0; r -= 2) for (var a = 0; a < 64; a++) { var th = a / 64 * 6.283;
    tset(Math.round(8 + Math.cos(th) * r), Math.round(8 + Math.sin(th) * r), 166, 148, 104); } });
mk('planks', function () {
  fill([158, 127, 80], 6);
  for (var b = 0; b < 4; b++) {
    var y0 = b * 4, base = 150 + (_rng() * 22 - 11);
    rectf(0, y0, TS, 4, [base, base * .8, base * .52], 7);
    rectf(0, y0 + 3, TS, 1, [96, 74, 44], 5);
    for (var i = 0; i < 3; i++) { var x = (_rng() * TS) | 0; tset(x, y0 + 1 + ((_rng() * 2) | 0), base - 26, base * .8 - 22, base * .52 - 14); }
  }
});
mk('birch_planks', function () {
  fill([196, 178, 133], 6);
  for (var b = 0; b < 4; b++) { var y0 = b * 4, base = 200 + (_rng() * 18 - 9);
    rectf(0, y0, TS, 4, [base, base * .9, base * .68], 6);
    rectf(0, y0 + 3, TS, 1, [150, 132, 92], 5); }
});
mk('leaves', function () {
  clear();
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
    var n = _rng();
    if (n < .16) continue;                              // holes
    var g = 200 + (_rng() - .5) * 90;
    tset(x, y, g * .72, g, g * .55, 255);
  }
  for (var i = 0; i < 18; i++) { var x2 = (_rng() * TS) | 0, y2 = (_rng() * TS) | 0;
    tset(x2, y2, 90, 130, 62, 255); }
});
mk('birch_leaves', function () {
  clear();
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
    if (_rng() < .17) continue;
    var g = 210 + (_rng() - .5) * 80;
    tset(x, y, g * .8, g, g * .6, 255);
  }
});
mk('bookshelf', function () {
  TEXGEN.planks();
  rectf(0, 2, TS, 5, [88, 64, 38], 6); rectf(0, 9, TS, 5, [88, 64, 38], 6);
  var cols = [[164, 46, 46], [50, 82, 164], [200, 176, 60], [70, 150, 70], [150, 80, 170], [200, 120, 40]];
  for (var band = 0; band < 2; band++) {
    var y0 = band ? 9 : 2, x = 0;
    while (x < TS) {
      var w = 1 + ((_rng() * 2) | 0), c = cols[(_rng() * cols.length) | 0];
      rectf(x, y0, w, 5, c, 16);
      rectf(x, y0, w, 1, [c[0] * .6, c[1] * .6, c[2] * .6], 0);
      x += w + 1;
    }
  }
});
mk('crafting_top', function () { TEXGEN.planks(); rectf(0, 0, TS, 1, [70, 52, 30], 0);
  rectf(0, 0, 1, TS, [70, 52, 30], 0);
  for (var i = 1; i < 4; i++) { tline(i * 5, 0, i * 5, 15, [96, 72, 44], 1); tline(0, i * 5, 15, i * 5, [96, 72, 44], 1); } });
mk('crafting_side', function () { TEXGEN.planks(); rectf(0, 0, TS, 4, [122, 92, 54], 8);
  for (var i = 0; i < 6; i++) tset((_rng() * TS) | 0, (_rng() * 3) | 0, 80, 60, 34); });

/* ------------------------------------------------------------- misc ------ */
mk('glass', function () {
  clear();
  rectf(0, 0, TS, 1, [225, 240, 245, 255], 0); rectf(0, 15, TS, 1, [225, 240, 245], 0);
  rectf(0, 0, 1, TS, [225, 240, 245], 0); rectf(15, 0, 1, TS, [225, 240, 245], 0);
  for (var i = 0; i < TS; i++) { tset(i, 1, 240, 250, 255, 90); tset(1, i, 240, 250, 255, 90); }
  tline(3, 11, 10, 3, [255, 255, 255], 1);
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) { var p = tget(x, y); if (p[3] && p[3] === 255 && (x > 1 && x < 15 && y > 1 && y < 15)) tset(x, y, 255, 255, 255, 120); }
});
function tintedGlass(c) { return function () { TEXGEN.glass();
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) { var p = tget(x, y);
    if (p[3]) tset(x, y, (p[0] + c[0]) / 2, (p[1] + c[1]) / 2, (p[2] + c[2]) / 2, Math.max(p[3], 150)); } }; }
mk('glass_red', tintedGlass([220, 70, 70]));
mk('glass_blue', tintedGlass([70, 110, 220]));
mk('water', function () {
  fill([58, 108, 196], 10);
  for (var i = 0; i < 5; i++) { var y = (_rng() * TS) | 0; rectf(0, y, TS, 1, [76, 128, 212], 8); }
  speck(26, [46, 92, 180], 6);
});
mk('lava', function () {
  fill([214, 92, 18], 20);
  for (var i = 0; i < 12; i++) blob((_rng() * TS) | 0, (_rng() * TS) | 0, 1 + (_rng() * 2 | 0), [250, 180, 40], 18);
  speck(30, [160, 48, 10], 12);
});
mk('sandstone_top', function () { fill([224, 213, 168], 8); speck(24, [210, 199, 155], 5); });
mk('sandstone_side', function () { fill([220, 209, 164], 8);
  rectf(0, 0, TS, 4, [232, 222, 178], 6); rectf(0, 4, TS, 1, [190, 178, 136], 4);
  rectf(0, 11, TS, 1, [190, 178, 136], 4); speck(20, [206, 195, 150], 5); });
mk('sandstone_bottom', function () { fill([214, 203, 158], 8); speck(30, [200, 189, 146], 6); });
mk('red_sandstone', function () { fill([182, 100, 46], 10); rectf(0, 0, TS, 4, [196, 112, 54], 6);
  rectf(0, 4, TS, 1, [150, 80, 36], 4); rectf(0, 11, TS, 1, [150, 80, 36], 4); });
mk('bricks', function () {
  fill([102, 60, 48], 4);
  for (var row = 0; row < 4; row++) {
    var y0 = row * 4, off = (row % 2) ? -4 : 0;
    for (var bx = 0; bx < 3; bx++) {
      var x0 = off + bx * 8;
      rectf(x0 + 1, y0 + 1, 7, 3, [152, 96, 78], 12);
    }
  }
});
mk('stone_bricks', function () {
  fill([100, 100, 100], 6, 1);
  var b = [[0,0,7,7],[8,0,7,3],[8,4,7,3],[0,8,3,7],[4,8,11,3],[4,12,7,3],[12,12,3,3]];
  for (var i = 0; i < b.length; i++) rectf(b[i][0] + 1, b[i][1] + 1, b[i][2] - 1, b[i][3] - 1, [128, 128, 128], 12);
});
mk('mossy_cobble', function () { TEXGEN.cobblestone();
  for (var i = 0; i < 34; i++) { var x = (_rng() * TS) | 0, y = (_rng() * TS) | 0;
    var p = tget(x, y); tset(x, y, p[0] * .55, p[1] * .95, p[2] * .5); } });
mk('obsidian', function () { fill([21, 16, 32], 8);
  speck(26, [40, 30, 62], 10); speck(10, [64, 48, 96], 8); });
mk('glowstone', function () { fill([148, 116, 62], 10);
  for (var i = 0; i < 14; i++) blob((_rng() * TS) | 0, (_rng() * TS) | 0, 1 + (_rng() * 1.5 | 0), [252, 226, 140], 16); });
mk('quartz_block', function () { fill([236, 232, 226], 8, 1); speck(24, [222, 218, 212], 5); });
mk('sponge', function () { fill([196, 192, 84], 10);
  for (var i = 0; i < 22; i++) blob((_rng() * TS) | 0, (_rng() * TS) | 0, 1, [156, 152, 60], 8); });
mk('slime', function () { clear();
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) tset(x, y, 110, 200, 110, 170);
  rectf(1, 1, 14, 14, [126, 216, 126], 10);
  for (var i = 0; i < 10; i++) blob((_rng() * TS) | 0, (_rng() * TS) | 0, 1, [92, 178, 92], 8);
  for (var y2 = 0; y2 < TS; y2++) for (var x2 = 0; x2 < TS; x2++) { var p = tget(x2, y2); tset(x2, y2, p[0], p[1], p[2], 175); } });
mk('cactus_top', function () { fill([86, 146, 62], 8); blob(8, 8, 5, [102, 162, 74], 8); });
mk('cactus_side', function () { fill([70, 128, 52], 8);
  rectf(0, 0, 1, TS, [56, 108, 42], 4); rectf(15, 0, 1, TS, [56, 108, 42], 4);
  for (var i = 0; i < 8; i++) { var y = 1 + i * 2; tset(3, y, 210, 210, 190); tset(11, y + 1, 210, 210, 190); } });
mk('hay_top', function () { fill([170, 140, 40], 10); blob(8, 8, 5, [186, 156, 52], 8); });
mk('hay_side', function () { fill([172, 146, 46], 8);
  for (var i = 0; i < TS; i += 2) rectf(0, i, TS, 1, [156, 130, 36], 8); });
mk('note_block', function () { TEXGEN.planks();
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) { var p = tget(x, y); tset(x, y, p[0] * .74, p[1] * .62, p[2] * .6); }
  rectf(5, 5, 6, 6, [56, 40, 34], 6); rectf(6, 6, 4, 4, [130, 100, 84], 8); });
mk('jukebox_top', function () { TEXGEN.note_block(); blob(8, 8, 4, [40, 40, 44], 6); blob(8, 8, 1, [180, 180, 190], 4); });
mk('cobweb', function () { clear();
  for (var a = 0; a < 8; a++) { var th = a / 8 * 6.283; tline(8, 8, Math.round(8 + Math.cos(th) * 8), Math.round(8 + Math.sin(th) * 8), [235, 235, 240], 1); }
  for (var r = 3; r <= 7; r += 2) for (var a2 = 0; a2 < 32; a2++) { var t2 = a2 / 32 * 6.283;
    tset(Math.round(8 + Math.cos(t2) * r), Math.round(8 + Math.sin(t2) * r), 225, 225, 232, 255); } });
mk('vine', function () { clear(); for (var i = 0; i < 5; i++) { var x = 1 + i * 3;
  for (var y = 0; y < TS; y++) if (_rng() < .8) tset(x + ((y % 3) - 1), y, 70, 130, 54, 255); } });
mk('lilypad', function () { clear();
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) { var dx = x - 8, dy = y - 8;
    if (dx * dx + dy * dy <= 49) tset(x, y, 60 + _rng() * 20, 128 + _rng() * 30, 46, 255); }
  tline(8, 8, 8, 15, [30, 70, 26], 1); });
mk('ladder', function () { clear(); tline(3, 0, 3, 15, [150, 118, 70], 1); tline(12, 0, 12, 15, [150, 118, 70], 1);
  for (var i = 1; i < 5; i++) tline(3, i * 3, 12, i * 3, [168, 134, 82], 1); });
mk('rail', function () { clear(); tline(4, 0, 4, 15, [130, 130, 138], 2); tline(10, 0, 10, 15, [130, 130, 138], 2);
  for (var i = 0; i < 5; i++) rectf(2, i * 3 + 1, 12, 1, [120, 92, 54], 8); });
mk('brown_mushroom_block', function () { fill([150, 118, 96], 8); blob(5, 5, 3, [188, 154, 120], 8); blob(11, 10, 3, [188, 154, 120], 8); });

/* metal & gem blocks */
function metalBlock(c) {
  return function () {
    fill(c, 10);
    rectf(1, 1, 14, 14, [c[0] * 1.06, c[1] * 1.06, c[2] * 1.06], 8);
    rectf(2, 2, 12, 12, c, 10);
    for (var i = 0; i < 4; i++) { var x = 3 + ((_rng() * 10) | 0), y = 3 + ((_rng() * 10) | 0);
      tset(x, y, c[0] * 1.25, c[1] * 1.25, c[2] * 1.25); }
    shade(16);
  };
}
mk('iron_block', metalBlock([220, 220, 220]));
mk('gold_block', metalBlock([246, 208, 62]));
mk('diamond_block', metalBlock([98, 224, 216]));
mk('emerald_block', metalBlock([64, 210, 100]));
mk('lapis_block', metalBlock([50, 88, 190]));
mk('redstone_block', metalBlock([190, 36, 30]));

/* wool */
function woolTex(c) {
  return function () {
    fill(c, 12);
    for (var i = 0; i < 40; i++) { var x = (_rng() * TS) | 0, y = (_rng() * TS) | 0;
      var d = (_rng() - .5) * 26; tset(x, y, c[0] + d, c[1] + d, c[2] + d); }
    for (var y2 = 1; y2 < TS; y2 += 4) for (var x2 = 0; x2 < TS; x2 += 2)
      tset(x2 + (y2 % 8 ? 0 : 1), y2, c[0] * .9, c[1] * .9, c[2] * .9);
  };
}
mk('wool_white', woolTex([233, 236, 236])); mk('wool_red', woolTex([160, 39, 34]));
mk('wool_blue', woolTex([44, 46, 143])); mk('wool_yellow', woolTex([248, 197, 39]));
mk('wool_green', woolTex([94, 124, 22])); mk('wool_black', woolTex([26, 26, 30]));
mk('wool_orange', woolTex([240, 118, 19])); mk('wool_purple', woolTex([126, 61, 181]));

/* furnace / chest / tnt */
mk('furnace_side', function () { TEXGEN.stone();
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) { var p = tget(x, y); tset(x, y, p[0] * .85, p[1] * .85, p[2] * .87); } });
mk('furnace_top', function () { TEXGEN.stone(); rectf(2, 2, 12, 12, [96, 96, 100], 8); rectf(4, 4, 8, 8, [70, 70, 74], 6); });
mk('furnace_front', function () { TEXGEN.furnace_side();
  rectf(3, 6, 10, 8, [48, 48, 50], 6); rectf(3, 5, 10, 1, [130, 130, 134], 4);
  rectf(4, 7, 8, 6, [30, 30, 32], 4); });
mk('furnace_lit', function () { TEXGEN.furnace_side();
  rectf(3, 6, 10, 8, [48, 48, 50], 6); rectf(3, 5, 10, 1, [130, 130, 134], 4);
  rectf(4, 7, 8, 6, [30, 30, 32], 4);
  for (var i = 0; i < 12; i++) { var x = 5 + ((_rng() * 6) | 0), y = 9 + ((_rng() * 4) | 0);
    tset(x, y, 250, 170 + _rng() * 60, 40); }
  rectf(5, 12, 6, 1, [252, 200, 60], 10); });
mk('chest_side', function () { TEXGEN.planks();
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) { var p = tget(x, y); tset(x, y, p[0] * .92, p[1] * .78, p[2] * .55); }
  rectf(0, 4, TS, 1, [70, 50, 28], 0); rectf(1, 1, 14, 3, [150, 112, 62], 8); });
mk('chest_top', function () { TEXGEN.chest_side(); rectf(0, 0, TS, TS, [158, 118, 66], 10); rectf(1, 1, 14, 14, [172, 130, 74], 8); });
mk('chest_front', function () { TEXGEN.chest_side();
  rectf(6, 5, 4, 5, [64, 52, 32], 4); rectf(7, 6, 2, 3, [220, 194, 90], 8); tset(8, 8, 40, 34, 22); });
mk('tnt_top', function () { fill([176, 60, 50], 8); rectf(0, 0, TS, 3, [140, 140, 145], 8);
  rectf(2, 4, 12, 9, [190, 66, 56], 8); });
mk('tnt_side', function () { fill([172, 58, 48], 8);
  rectf(0, 5, TS, 6, [238, 238, 238], 6);
  for (var i = 0; i < 5; i++) rectf(2 + i * 3, 7, 2, 2, [40, 40, 44], 6);
  rectf(0, 0, TS, 2, [128, 44, 38], 6); rectf(0, 14, TS, 2, [128, 44, 38], 6); });
mk('tnt_bottom', function () { fill([132, 46, 40], 8); rectf(1, 1, 14, 14, [150, 52, 44], 8); });

/* plants */
mk('torch', function () { clear();
  rectf(7, 8, 2, 8, [140, 106, 62], 8);
  tset(7, 8, 110, 84, 48); tset(8, 15, 96, 72, 42);
  rectf(6, 4, 4, 4, [252, 214, 84], 10);
  rectf(7, 3, 2, 1, [255, 240, 150], 6);
  rectf(6, 7, 4, 1, [236, 150, 40], 8);
  tset(6, 4, 250, 180, 60); tset(9, 4, 250, 180, 60); });
mk('flower_red', function () { clear(); tline(8, 8, 8, 15, [64, 132, 48], 1);
  tset(6, 11, 74, 150, 54); tset(10, 12, 74, 150, 54);
  blob(8, 5, 3, [206, 48, 48], 20); blob(8, 5, 1, [252, 232, 90], 10); });
mk('flower_yellow', function () { clear(); tline(8, 9, 8, 15, [64, 132, 48], 1);
  tset(6, 12, 74, 150, 54); blob(8, 6, 3, [244, 214, 46], 18); blob(8, 6, 1, [180, 140, 20], 8); });
mk('flower_blue', function () { clear(); tline(8, 9, 8, 15, [64, 132, 48], 1);
  tset(10, 12, 74, 150, 54); blob(8, 6, 3, [78, 116, 226], 18); blob(8, 6, 1, [240, 240, 250], 8); });
mk('tall_grass', function () { clear();
  /* thin blades that lean outward, drawn greyscale for biome tinting */
  for (var i = 0; i < 11; i++) {
    var x0 = 1 + ((_rng() * 14) | 0), h = 6 + ((_rng() * 9) | 0);
    var lean = (_rng() < .5 ? -1 : 1) * (0.10 + _rng() * 0.16);
    for (var k = 0; k < h; k++) {
      var y = 15 - k;
      var x = Math.round(x0 + lean * k);
      var g = 186 - k * 3 - _rng() * 34;                    // sits close to grass_top
      tset(x, y, g, g, g, 255);
      if (k < 2) tset(x, y, g * .78, g * .78, g * .78, 255);
    }
  }
});
mk('fern', function () { clear();
  for (var i = 0; i < 5; i++) tset(8, 11 + i, 150, 150, 150, 255);
  for (var k = 0; k < 6; k++) {                       // fronds fanning outward
    var y = 4 + k * 2, w = 1 + k;
    tset(8, y, 210, 210, 210, 255);
    for (var d = 1; d <= w; d++) {
      var yy = y + ((d / 2) | 0), g = 226 - d * 12 - _rng() * 20;
      tset(8 - d, yy, g, g, g, 255);
      tset(8 + d, yy, g, g, g, 255);
    }
  }
});
mk('sapling', function () { clear(); tline(8, 15, 8, 9, [110, 82, 48], 1);
  blob(8, 6, 3, [86, 156, 60], 24);
  for (var i = 0; i < 6; i++) tset(4 + ((_rng() * 9) | 0), 3 + ((_rng() * 6) | 0), 70, 132, 48, 255); });
mk('dead_bush', function () { clear();
  tline(8, 15, 8, 6, [128, 96, 46], 1); tline(8, 10, 4, 6, [128, 96, 46], 1);
  tline(8, 11, 12, 7, [128, 96, 46], 1); tline(8, 8, 6, 4, [140, 108, 54], 1); });
mk('mushroom_red', function () { clear(); rectf(7, 9, 2, 5, [222, 216, 200], 8);
  blob(8, 7, 4, [204, 44, 40], 14);
  tset(6, 6, 240, 240, 236); tset(10, 7, 240, 240, 236); tset(8, 4, 240, 240, 236); });
mk('mushroom_brown', function () { clear(); rectf(7, 10, 2, 4, [206, 190, 168], 8);
  blob(8, 8, 4, [150, 110, 78], 14); });
mk('pumpkin_top', function () { fill([200, 122, 26], 10);
  for (var i = 0; i < TS; i += 3) tline(i, 0, i, 15, [176, 104, 20], 1);
  rectf(6, 6, 4, 4, [122, 96, 40], 8); });
mk('pumpkin_side', function () { fill([206, 126, 28], 10);
  for (var i = 1; i < TS; i += 4) tline(i, 0, i, 15, [178, 106, 20], 1);
  rectf(0, 0, TS, 2, [140, 108, 44], 8); });
mk('pumpkin_face', function () { TEXGEN.pumpkin_side();
  tline(3, 5, 6, 5, [60, 34, 10], 2); tline(9, 5, 12, 5, [60, 34, 10], 2);
  tline(4, 9, 11, 9, [60, 34, 10], 1); rectf(5, 10, 2, 2, [60, 34, 10], 0);
  rectf(9, 10, 2, 2, [60, 34, 10], 0); });
mk('melon_side', function () { fill([110, 152, 42], 10);
  for (var i = 0; i < TS; i += 4) tline(i, 0, i + 2, 15, [88, 128, 32], 1); speck(30, [132, 174, 56], 8); });
mk('melon_top', function () { fill([116, 158, 46], 10); speck(40, [96, 136, 36], 8); });
mk('farmland', function () { TEXGEN.dirt(); rectf(0, 6, TS, 4, [96, 68, 44], 8);
  rectf(0, 14, TS, 2, [96, 68, 44], 8); });
mk('farmland_wet', function () { TEXGEN.dirt();
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) { var p = tget(x, y); tset(x, y, p[0] * .6, p[1] * .55, p[2] * .55); }
  rectf(0, 6, TS, 4, [58, 40, 26], 6); });
function wheatTex(stage) {
  return function () {
    clear();
    var h = 5 + stage * 3, col = stage < 2 ? [96, 156, 56] : stage < 3 ? [150, 168, 60] : [206, 178, 62];
    for (var i = 0; i < 4; i++) { var x = 2 + i * 4;
      for (var y = 15; y > 15 - h; y--) tset(x, y, col[0], col[1], col[2], 255);
      if (stage >= 2) { tset(x - 1, 15 - h + 1, col[0], col[1], col[2], 255); tset(x + 1, 15 - h + 2, col[0], col[1], col[2], 255); }
    }
  };
}
for (var ws = 0; ws < 4; ws++) mk('wheat' + ws, wheatTex(ws));
mk('cake', function () { fill([238, 238, 240], 8); rectf(0, 0, TS, 3, [214, 116, 130], 8); });
