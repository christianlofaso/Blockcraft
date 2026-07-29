/* ================================================== item sprite painters == */
function ingot(c, d) {
  return function () {
    clear();
    for (var y = 5; y < 12; y++) {
      var inset = (y < 6 || y > 10) ? 2 : 1;
      for (var x = 2 + inset; x < 14 - inset; x++) tset(x, y, c[0], c[1], c[2], 255);
    }
    for (var x2 = 4; x2 < 12; x2++) tset(x2, 6, c[0] * 1.2, c[1] * 1.2, c[2] * 1.2, 255);
    for (var x3 = 4; x3 < 12; x3++) tset(x3, 10, d[0], d[1], d[2], 255);
    outline([30, 26, 22]);
  };
}
mk('i_iron', ingot([228, 228, 228], [160, 160, 160]));
mk('i_gold', ingot([252, 220, 80], [190, 152, 30]));
function gem(c, d) {
  return function () {
    clear();
    var pts = [[8, 3], [5, 6], [5, 10], [8, 13], [11, 10], [11, 6]];
    for (var y = 3; y <= 13; y++) for (var x = 4; x <= 12; x++) {
      var dx = Math.abs(x - 8) / 4.2, dy = Math.abs(y - 8) / 5.2;
      if (dx + dy > 1.02) continue;
      tset(x, y, c[0], c[1], c[2], 255);
    }
    for (var y2 = 5; y2 <= 8; y2++) for (var x2 = 6; x2 <= 8; x2++) tset(x2, y2, c[0] * 1.25, c[1] * 1.25, c[2] * 1.25, 255);
    for (var y3 = 9; y3 <= 11; y3++) for (var x3 = 8; x3 <= 10; x3++) tset(x3, y3, d[0], d[1], d[2], 255);
    outline([24, 40, 46]);
  };
}
mk('i_diamond', gem([116, 236, 228], [58, 176, 172]));
mk('i_emerald', gem([76, 226, 112], [34, 158, 74]));
mk('i_lapis', gem([64, 104, 210], [32, 60, 150]));
mk('i_coal', function () { clear();
  for (var y = 4; y < 13; y++) for (var x = 4; x < 13; x++) {
    if ((x === 4 || x === 12) && (y === 4 || y === 12)) continue;
    var g = 34 + _rng() * 26; tset(x, y, g, g, g + 3, 255); }
  for (var i = 0; i < 6; i++) tset(5 + ((_rng() * 7) | 0), 5 + ((_rng() * 7) | 0), 88, 88, 94, 255);
  outline([12, 12, 14]); });
mk('i_charcoal', function () { TEXGEN.i_coal();
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) { var p = tget(x, y);
    if (p[3]) tset(x, y, p[0] * 1.15 + 12, p[1] * 1.05 + 6, p[2] * .9, 255); } });
mk('i_redstone', function () { clear();
  for (var i = 0; i < 26; i++) { var x = 3 + ((_rng() * 10) | 0), y = 3 + ((_rng() * 10) | 0);
    var r = 170 + _rng() * 80; tset(x, y, r, 24, 24, 255); tset(x + 1, y, r * .8, 20, 20, 255); } });
mk('i_glowdust', function () { clear();
  for (var i = 0; i < 26; i++) { var x = 3 + ((_rng() * 10) | 0), y = 3 + ((_rng() * 10) | 0);
    tset(x, y, 250, 226 + _rng() * 20, 140, 255); } });
mk('i_gunpowder', function () { clear();
  for (var i = 0; i < 30; i++) { var x = 3 + ((_rng() * 10) | 0), y = 3 + ((_rng() * 10) | 0);
    var g = 100 + _rng() * 50; tset(x, y, g, g, g + 6, 255); } });
mk('i_sugar', function () { clear();
  for (var i = 0; i < 28; i++) { var x = 3 + ((_rng() * 10) | 0), y = 4 + ((_rng() * 9) | 0);
    tset(x, y, 244 + _rng() * 10, 244, 250, 255); } });
mk('i_stick', function () { clear(); tline(4, 12, 11, 4, [148, 110, 62], 2);
  tline(5, 12, 11, 5, [176, 136, 84], 1); outline([70, 52, 28]); });
mk('i_string', function () { clear();
  tline(4, 2, 9, 6, [235, 235, 235], 1); tline(9, 6, 5, 10, [235, 235, 235], 1);
  tline(5, 10, 11, 14, [235, 235, 235], 1); });
mk('i_feather', function () { clear(); tline(5, 13, 11, 4, [230, 230, 235], 1);
  for (var i = 0; i < 6; i++) { var t = i / 6; var x = 5 + (11 - 5) * t, y = 13 + (4 - 13) * t;
    tline(Math.round(x), Math.round(y), Math.round(x - 2), Math.round(y - 1), [246, 246, 250], 1); }
  outline([120, 120, 130]); });
mk('i_leather', function () { clear(); rectf(3, 4, 10, 8, [154, 106, 62], 12);
  rectf(4, 5, 8, 6, [172, 122, 74], 10); outline([90, 60, 34]); });
mk('i_bone', function () { clear(); rectf(6, 3, 4, 10, [238, 238, 226], 6);
  blob(5, 3, 1, [238, 238, 226], 4); blob(10, 3, 1, [238, 238, 226], 4);
  blob(5, 12, 1, [238, 238, 226], 4); blob(10, 12, 1, [238, 238, 226], 4); outline([150, 150, 140]); });
mk('i_flint', function () { clear();
  for (var y = 5; y < 12; y++) for (var x = 3; x < 13; x++) {
    if (Math.abs(x - 8) + Math.abs(y - 8) > 6) continue;
    var g = 60 + _rng() * 30; tset(x, y, g, g - 6, g - 10, 255); }
  outline([26, 22, 20]); });
mk('i_clay_ball', function () { clear(); blob(8, 8, 4, [162, 168, 182], 10); outline([100, 106, 118]); });
mk('i_brick', function () { clear(); rectf(3, 5, 10, 6, [150, 92, 74], 10); outline([80, 46, 36]); });
mk('i_paper', function () { clear(); rectf(3, 3, 10, 10, [244, 244, 244], 6);
  rectf(4, 5, 8, 1, [200, 200, 206], 0); rectf(4, 8, 8, 1, [200, 200, 206], 0);
  rectf(4, 11, 6, 1, [200, 200, 206], 0); outline([170, 170, 176]); });
mk('i_book', function () { clear(); rectf(3, 3, 10, 11, [140, 60, 48], 8);
  rectf(5, 3, 8, 11, [238, 236, 226], 6); rectf(4, 3, 1, 11, [96, 40, 32], 0);
  outline([60, 26, 20]); });
mk('i_apple', function () { clear(); blob(8, 9, 4, [206, 46, 40], 14);
  blob(6, 7, 1, [242, 120, 110], 6); tline(8, 5, 9, 3, [110, 76, 40], 1);
  tset(10, 4, 86, 158, 60); tset(11, 3, 86, 158, 60); outline([90, 20, 18]); });
mk('i_bread', function () { clear();
  for (var y = 5; y < 12; y++) for (var x = 2; x < 14; x++) {
    if ((x < 4 || x > 11) && (y < 6 || y > 10)) continue;
    tset(x, y, 196 + _rng() * 24, 146 + _rng() * 20, 76, 255); }
  for (var i = 0; i < 5; i++) tline(4 + i * 2, 5, 3 + i * 2, 11, [166, 118, 56], 1);
  outline([104, 70, 30]); });
mk('i_wheat', function () { clear();
  for (var i = 0; i < 3; i++) { var x = 4 + i * 4;
    tline(x, 14, x, 4, [180, 156, 60], 1);
    for (var k = 0; k < 4; k++) { tset(x - 1, 5 + k * 2, 226, 196, 74, 255); tset(x + 1, 6 + k * 2, 226, 196, 74, 255); } } });
mk('i_seeds', function () { clear();
  for (var i = 0; i < 8; i++) { var x = 3 + ((_rng() * 10) | 0), y = 4 + ((_rng() * 9) | 0);
    tset(x, y, 130, 160, 60, 255); tset(x + 1, y, 106, 136, 46, 255); tset(x, y + 1, 106, 136, 46, 255); } });
function meatTex(raw, cooked) {
  return function () {
    clear();
    blob(7, 8, 4, raw, 14); blob(10, 7, 3, raw, 12);
    for (var i = 0; i < 8; i++) tset(4 + ((_rng() * 8) | 0), 5 + ((_rng() * 7) | 0), cooked[0], cooked[1], cooked[2], 255);
    outline([70, 34, 30]);
  };
}
mk('i_porkchop', meatTex([236, 150, 148], [248, 190, 188]));
mk('i_cooked_porkchop', meatTex([190, 122, 62], [216, 158, 90]));
mk('i_beef', meatTex([200, 68, 62], [230, 110, 104]));
mk('i_steak', meatTex([154, 92, 46], [186, 124, 68]));
mk('i_chicken', meatTex([236, 190, 162], [250, 216, 190]));
mk('i_cooked_chicken', meatTex([204, 152, 82], [230, 184, 112]));
mk('i_mutton', meatTex([222, 120, 116], [242, 162, 158]));
mk('i_cooked_mutton', meatTex([182, 114, 58], [212, 148, 84]));
mk('i_rotten_flesh', meatTex([120, 92, 68], [92, 118, 64]));
mk('i_spider_eye', function () { clear(); blob(8, 8, 4, [126, 40, 34], 12);
  blob(8, 8, 2, [212, 176, 60], 8); rectf(7, 6, 2, 5, [30, 26, 24], 0); outline([50, 16, 14]); });
mk('i_melon_slice', function () { clear();
  for (var y = 3; y < 14; y++) for (var x = 3; x < 14; x++) {
    if (x + y < 9 || x - y > 5) continue;
    var d = (x + y); tset(x, y, d < 14 ? 210 : 96, d < 14 ? 60 : 150, d < 14 ? 60 : 44, 255); }
  outline([60, 90, 30]); });
mk('i_cookie', function () { clear(); blob(8, 8, 4, [186, 128, 72], 12);
  for (var i = 0; i < 5; i++) tset(5 + ((_rng() * 7) | 0), 5 + ((_rng() * 7) | 0), 74, 48, 30, 255);
  outline([110, 72, 38]); });
mk('i_pumpkin_pie', function () { clear(); blob(8, 9, 5, [214, 158, 66], 10);
  blob(8, 8, 4, [236, 190, 96], 8); for (var i = 0; i < 4; i++) tset(6 + i * 2, 7, 160, 110, 44, 255);
  outline([120, 80, 30]); });
mk('i_mushroom_stew', function () { clear(); TEXGEN.i_bowl();
  rectf(4, 8, 8, 2, [150, 108, 70], 8); blob(6, 8, 1, [200, 60, 54], 6); });
mk('i_bowl', function () { clear();
  for (var y = 8; y < 13; y++) { var w = 12 - (y - 8) * 2;
    rectf(8 - w / 2, y, w, 1, [138, 96, 54], 8); }
  rectf(3, 7, 10, 1, [166, 122, 70], 6); outline([80, 54, 28]); });
mk('i_bucket', function () { clear();
  for (var y = 5; y < 14; y++) { var w = 11 - (y - 5); rectf(8 - (w >> 1), y, w, 1, [196, 196, 202], 8); }
  tline(4, 5, 12, 5, [226, 226, 232], 1); tline(4, 3, 4, 5, [200, 200, 206], 1);
  tline(4, 3, 11, 3, [200, 200, 206], 1); outline([100, 100, 108]); });
mk('i_water_bucket', function () { TEXGEN.i_bucket(); rectf(5, 7, 6, 5, [58, 108, 196], 10); });
mk('i_lava_bucket', function () { TEXGEN.i_bucket(); rectf(5, 7, 6, 5, [222, 108, 24], 14); });
mk('i_milk', function () { TEXGEN.i_bucket(); rectf(5, 7, 6, 5, [246, 246, 250], 6); });
mk('i_egg', function () { clear();
  for (var y = 3; y < 14; y++) { var r = Math.sqrt(Math.max(0, 1 - Math.pow((y - 9) / 5.4, 2))) * 4.4 * (y < 8 ? .86 : 1);
    for (var x = Math.round(8 - r); x <= Math.round(8 + r); x++) tset(x, y, 232 + _rng() * 14, 226 + _rng() * 12, 206, 255); }
  for (var i = 0; i < 6; i++) tset(5 + ((_rng() * 7) | 0), 6 + ((_rng() * 7) | 0), 196, 186, 162, 255);
  outline([150, 142, 122]); });
mk('i_snowball', function () { clear(); blob(8, 9, 4, [244, 250, 255], 8); outline([170, 190, 210]); });
mk('i_slimeball', function () { clear(); blob(8, 9, 4, [118, 208, 118], 12);
  blob(6, 7, 1, [180, 240, 180], 6); outline([60, 130, 60]); });
mk('i_arrow', function () { clear(); tline(4, 12, 11, 5, [148, 110, 62], 1);
  tline(11, 5, 13, 3, [200, 200, 210], 1); tset(12, 3, 220, 220, 230); tset(13, 4, 220, 220, 230);
  tline(4, 12, 2, 14, [240, 240, 240], 1); tset(3, 12, 240, 240, 240); tset(5, 14, 240, 240, 240); });
mk('i_bow', function () { clear();
  for (var a = -50; a <= 50; a += 4) { var th = a / 180 * Math.PI;
    tset(Math.round(5 + Math.cos(th) * 7), Math.round(8 + Math.sin(th) * 7), 132, 96, 52, 255); }
  tline(5, 2, 5, 14, [238, 238, 238], 1); });
mk('i_fishing_rod', function () { clear(); tline(3, 13, 11, 4, [140, 102, 56], 1);
  tline(11, 4, 13, 9, [238, 238, 238], 1); tset(13, 10, 200, 60, 60); });
mk('i_shears', function () { clear();
  tline(4, 12, 10, 4, [200, 200, 208], 2); tline(11, 12, 6, 4, [176, 176, 184], 2);
  blob(4, 13, 1, [80, 80, 88], 4); blob(11, 13, 1, [80, 80, 88], 4); outline([60, 60, 66]); });
mk('i_flint_steel', function () { clear(); TEXGEN.i_flint();
  tline(9, 4, 13, 9, [190, 190, 198], 2); });
mk('i_compass', function () { clear(); blob(8, 8, 5, [180, 180, 188], 8); blob(8, 8, 3, [40, 44, 60], 6);
  tline(8, 8, 8, 5, [220, 60, 60], 1); tline(8, 8, 8, 11, [240, 240, 240], 1); outline([70, 70, 78]); });
mk('i_clock', function () { clear(); blob(8, 8, 5, [220, 196, 90], 8); blob(8, 8, 3, [60, 90, 150], 6);
  blob(8, 8, 1, [250, 250, 200], 4); outline([120, 100, 40]); });
mk('i_map', function () { TEXGEN.i_paper(); rectf(5, 6, 6, 5, [186, 170, 128], 8); });
mk('i_saddle', function () { clear(); rectf(3, 6, 10, 6, [122, 74, 42], 10);
  rectf(2, 8, 12, 2, [90, 54, 30], 8); rectf(6, 5, 4, 2, [150, 96, 56], 8); outline([60, 34, 18]); });
mk('i_name_tag', function () { clear(); rectf(4, 6, 9, 5, [222, 216, 196], 8);
  tline(3, 8, 4, 8, [180, 180, 180], 1); outline([120, 112, 92]); });
mk('i_exp_bottle', function () { clear(); blob(8, 10, 4, [110, 220, 120], 12);
  rectf(7, 3, 2, 4, [200, 200, 210], 6); outline([50, 120, 60]); });
mk('i_ender_pearl', function () { clear(); blob(8, 8, 4, [26, 90, 82], 10);
  blob(7, 7, 2, [90, 200, 180], 12); outline([12, 40, 38]); });
mk('i_blaze_rod', function () { clear(); tline(4, 13, 11, 3, [230, 176, 40], 2);
  tline(5, 12, 10, 5, [252, 220, 90], 1); outline([140, 96, 20]); });
mk('i_stick_torch', function () { TEXGEN.torch(); });

/* ---------------------------------------------------------- tools/armor -- */
var TOOL_COLORS = {
  wood:    [[160, 122, 68], [110, 80, 42]],
  stone:   [[136, 136, 136], [92, 92, 92]],
  iron:    [[228, 228, 228], [156, 156, 156]],
  gold:    [[252, 216, 74], [186, 148, 28]],
  diamond: [[112, 232, 226], [56, 172, 168]]
};
function toolTex(mat, kind) {
  return function () {
    clear();
    var c = TOOL_COLORS[mat], hi = c[0], lo = c[1];
    var stick = [140, 104, 58], stickHi = [172, 132, 78];
    if (kind === 'sword') {
      tline(4, 12, 12, 4, hi, 2); tline(5, 12, 12, 5, lo, 1);
      tline(3, 13, 6, 10, [110, 78, 40], 2);                 // hilt
      tline(3, 9, 7, 13, [180, 150, 60], 1);                 // guard
      outline([32, 28, 24]); return;
    }
    tline(3, 13, 9, 7, stick, 2); tline(4, 13, 9, 8, stickHi, 1);
    if (kind === 'pickaxe') {
      for (var i = 0; i < 9; i++) { var t = i / 8;
        var x = 4 + t * 9, y = 5 - Math.sin(t * Math.PI) * 3.2;
        tset(Math.round(x), Math.round(y) + 1, hi[0], hi[1], hi[2], 255);
        tset(Math.round(x), Math.round(y) + 2, lo[0], lo[1], lo[2], 255); }
      tset(4, 4, hi[0], hi[1], hi[2], 255); tset(13, 4, hi[0], hi[1], hi[2], 255);
    } else if (kind === 'axe') {
      rectf(7, 2, 5, 3, hi, 8); rectf(6, 3, 2, 4, hi, 8); rectf(7, 5, 5, 2, lo, 8);
      rectf(11, 3, 2, 4, lo, 8); tset(6, 2, hi[0], hi[1], hi[2], 255);
    } else if (kind === 'shovel') {
      rectf(8, 2, 5, 5, hi, 8); rectf(9, 3, 3, 3, lo, 6); tset(8, 7, lo[0], lo[1], lo[2], 255);
    } else if (kind === 'hoe') {
      rectf(8, 3, 5, 2, hi, 8); rectf(8, 5, 2, 2, lo, 8);
    }
    outline([32, 28, 24]);
  };
}
for (var _tm = 0; _tm < TOOL_MATS.length; _tm++)
  for (var _tk = 0; _tk < TOOL_KINDS.length; _tk++)
    mk('t_' + TOOL_MATS[_tm] + '_' + TOOL_KINDS[_tk], toolTex(TOOL_MATS[_tm], TOOL_KINDS[_tk]));

var ARMOR_COLORS = {
  leather: [[150, 100, 60], [110, 70, 40]],
  iron:    [[220, 220, 220], [150, 150, 150]],
  gold:    [[250, 214, 72], [186, 150, 30]],
  diamond: [[112, 232, 226], [56, 172, 168]]
};
function armorTex(mat, kind) {
  return function () {
    clear();
    var c = ARMOR_COLORS[mat], hi = c[0], lo = c[1];
    if (kind === 'helmet') {
      rectf(3, 3, 10, 7, hi, 10); rectf(4, 7, 8, 3, [0, 0, 0], 0);
      rectf(4, 7, 8, 3, lo, 8); rectf(3, 3, 10, 2, hi, 6);
      for (var y = 7; y < 10; y++) for (var x = 5; x < 11; x++) tset(x, y, 30, 30, 34, 255);
    } else if (kind === 'chestplate') {
      rectf(3, 4, 10, 8, hi, 10); rectf(2, 5, 2, 5, lo, 8); rectf(12, 5, 2, 5, lo, 8);
      rectf(6, 4, 4, 3, lo, 6);
    } else if (kind === 'leggings') {
      rectf(4, 3, 8, 4, hi, 10); rectf(4, 7, 3, 7, hi, 8); rectf(9, 7, 3, 7, hi, 8);
      rectf(7, 7, 2, 3, lo, 6);
    } else {
      rectf(3, 7, 4, 6, hi, 10); rectf(9, 7, 4, 6, hi, 10);
      rectf(3, 12, 5, 2, lo, 8); rectf(9, 12, 5, 2, lo, 8);
    }
    outline([28, 26, 24]);
  };
}
for (var _am = 0; _am < ARMOR_MATS.length; _am++)
  for (var _ak = 0; _ak < ARMOR_KINDS.length; _ak++)
    mk('a_' + ARMOR_MATS[_am] + '_' + ARMOR_KINDS[_ak], armorTex(ARMOR_MATS[_am], ARMOR_KINDS[_ak]));

/* ------------------------------------------------- mining crack overlay -- */
function destroyTex(stage) {
  return function () {
    clear();
    var rng = mulberry(1234);                       // same crack pattern every stage
    var cracks = [];
    for (var i = 0; i < 10; i++)
      cracks.push([(rng() * 16) | 0, (rng() * 16) | 0, (rng() * 16) | 0, (rng() * 16) | 0]);
    var n = 2 + Math.round(stage * 0.9);
    for (var c = 0; c < n && c < cracks.length; c++) {
      var k = cracks[c];
      tline(k[0], k[1], k[2], k[3], [20, 20, 20], 1);
      if (stage > 4) tline(k[0], k[1] + 1, k[2], k[3] + 1, [40, 40, 40], 1);
    }
    for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
      var p = tget(x, y);
      if (p[3]) tset(x, y, p[0], p[1], p[2], 150 + stage * 10);
    }
  };
}
for (var _ds = 0; _ds < 10; _ds++) mk('destroy' + _ds, destroyTex(_ds));
mk('white', function () { fill([255, 255, 255], 0); });

/* ------------------------------------------------------------- build ----- */
function buildTextures() {
  var names = Object.keys(T);
  var byIndex = [];
  for (var n in T) byIndex[T[n]] = n;
  for (var i = 0; i < TEX_COUNT; i++) {
    _cur = _texData.subarray(i * TS * TS * 4, (i + 1) * TS * TS * 4);
    _rng = mulberry(0x9e3779b9 ^ (i * 2654435761));
    var nm = byIndex[i], fn = TEXGEN[nm];
    if (fn) { try { fn(); } catch (e) { fallbackTex(i, nm); } }
    else fallbackTex(i, nm);
  }
  return _texData;
}
function fallbackTex(i, nm) {
  var h = (hash32(i * 2654435761) % 360) / 360;
  var r = Math.abs(h * 6 - 3) - 1, g = 2 - Math.abs(h * 6 - 2), b = 2 - Math.abs(h * 6 - 4);
  var col = [clamp(r, 0, 1) * 180 + 40, clamp(g, 0, 1) * 180 + 40, clamp(b, 0, 1) * 180 + 40];
  fill(col, 14);
}
