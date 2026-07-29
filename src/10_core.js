/* ============================================================================
   BLOCKCRAFT — shared core (evaluated on the main thread AND inside the worker)
   ========================================================================= */
/* NOTE: no "use strict" here — this file is also run through an indirect eval
   so that the main thread and the Worker share one copy of the source, and a
   strict directive would keep its declarations out of the global scope.      */
var CX = 16, CY = 128, CZ = 16, SEA = 62;
var CXZ = CX * CZ;                       // 256
function bIdx(x, y, z) { return x + z * CX + y * CXZ; }

/* ---------------------------------------------------------------- random -- */
function hash32(a) {
  a |= 0; a = (a ^ 61) ^ (a >>> 16); a = (a + (a << 3)) | 0;
  a = a ^ (a >>> 4); a = Math.imul(a, 0x27d4eb2d); a = a ^ (a >>> 15);
  return a >>> 0;
}
function hash3(x, y, z, s) {
  var h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) +
          Math.imul(z | 0, 2147483647) + Math.imul(s | 0, 1274126177);
  return hash32(h) / 4294967296;
}
function mulberry(seed) {
  var t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) | 0;
    var r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* ----------------------------------------------------------------- noise -- */
function Noise(seed) {
  var p = new Uint8Array(512), perm = new Uint8Array(256), rnd = mulberry(seed), i, j, t;
  for (i = 0; i < 256; i++) perm[i] = i;
  for (i = 255; i > 0; i--) { j = (rnd() * (i + 1)) | 0; t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (i = 0; i < 512; i++) p[i] = perm[i & 255];
  this.p = p;
}
Noise.prototype.n2 = function (x, y) {
  var p = this.p;
  var X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
  x -= Math.floor(x); y -= Math.floor(y);
  var u = x * x * x * (x * (x * 6 - 15) + 10), v = y * y * y * (y * (y * 6 - 15) + 10);
  function g(h, x, y) { h &= 3; return (h < 2 ? x : -x) + (h === 0 || h === 3 ? y : -y); }
  var A = p[X] + Y, B = p[X + 1] + Y;
  var a = g(p[A], x, y), b = g(p[B], x - 1, y);
  var c = g(p[A + 1], x, y - 1), d = g(p[B + 1], x - 1, y - 1);
  return (a + u * (b - a)) + v * ((c + u * (d - c)) - (a + u * (b - a)));
};
Noise.prototype.n3 = function (x, y, z) {
  var p = this.p;
  var X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  var u = x * x * x * (x * (x * 6 - 15) + 10),
      v = y * y * y * (y * (y * 6 - 15) + 10),
      w = z * z * z * (z * (z * 6 - 15) + 10);
  function g(h, x, y, z) {
    h &= 15;
    var a = h < 8 ? x : y, b = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -a : a) + ((h & 2) ? -b : b);
  }
  function L(t, a, b) { return a + t * (b - a); }
  var A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
  var B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
  return L(w,
    L(v, L(u, g(p[AA], x, y, z), g(p[BA], x - 1, y, z)),
         L(u, g(p[AB], x, y - 1, z), g(p[BB], x - 1, y - 1, z))),
    L(v, L(u, g(p[AA + 1], x, y, z - 1), g(p[BA + 1], x - 1, y, z - 1)),
         L(u, g(p[AB + 1], x, y - 1, z - 1), g(p[BB + 1], x - 1, y - 1, z - 1))));
};
Noise.prototype.fbm2 = function (x, y, oct, gain, lac) {
  gain = gain || 0.5; lac = lac || 2;
  var a = 0, amp = 1, f = 1, norm = 0;
  for (var i = 0; i < oct; i++) { a += this.n2(x * f, y * f) * amp; norm += amp; amp *= gain; f *= lac; }
  return a / norm;
};
Noise.prototype.fbm3 = function (x, y, z, oct, gain, lac) {
  gain = gain || 0.5; lac = lac || 2;
  var a = 0, amp = 1, f = 1, norm = 0;
  for (var i = 0; i < oct; i++) { a += this.n3(x * f, y * f, z * f) * amp; norm += amp; amp *= gain; f *= lac; }
  return a / norm;
};
Noise.prototype.ridge2 = function (x, y, oct) {
  var a = 0, amp = 1, f = 1, norm = 0;
  for (var i = 0; i < oct; i++) {
    var n = 1 - Math.abs(this.n2(x * f, y * f)) * 2;
    a += n * n * amp; norm += amp; amp *= 0.5; f *= 2;
  }
  return a / norm;
};
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function smooth01(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }

/* -------------------------------------------------------------- textures -- */
/* Order defines the layer index inside the WebGL 2D-array texture. */
var TEX = ('grass_top,grass_side,dirt,stone,cobblestone,bedrock,sand,gravel,log_side,log_top,leaves,' +
  'planks,glass,water,lava,coal_ore,iron_ore,gold_ore,diamond_ore,redstone_ore,emerald_ore,lapis_ore,' +
  'sandstone_top,sandstone_side,sandstone_bottom,snow,grass_side_snow,ice,cactus_top,cactus_side,' +
  'clay,obsidian,bricks,stone_bricks,mossy_cobble,glowstone,torch,crafting_top,crafting_side,' +
  'furnace_front,furnace_side,furnace_top,furnace_lit,chest_front,chest_side,chest_top,tnt_top,' +
  'tnt_side,tnt_bottom,bookshelf,iron_block,gold_block,diamond_block,emerald_block,lapis_block,' +
  'wool_white,wool_red,wool_blue,wool_yellow,wool_green,wool_black,wool_orange,wool_purple,' +
  'flower_red,flower_yellow,flower_blue,tall_grass,fern,mushroom_red,mushroom_brown,sapling,' +
  'dead_bush,birch_log_side,birch_log_top,birch_leaves,birch_planks,pumpkin_top,pumpkin_side,' +
  'pumpkin_face,melon_side,melon_top,farmland,farmland_wet,wheat0,wheat1,wheat2,wheat3,cake,' +
  'sponge,netherrack,soul_sand,quartz_block,red_sand,red_sandstone,granite,diorite,andesite,' +
  'coarse_dirt,podzol_top,mycelium_top,packed_ice,slime,glass_red,glass_blue,ladder,rail,' +
  'redstone_block,note_block,jukebox_top,hay_top,hay_side,brown_mushroom_block,cobweb,vine,lilypad'
).split(',');
var T = {};
for (var _i = 0; _i < TEX.length; _i++) T[TEX[_i]] = _i;

/* Item sprites live in the same array texture, after the block tiles. */
var ITEMTEX = ('i_stick,i_coal,i_charcoal,i_iron,i_gold,i_diamond,i_emerald,i_lapis,i_redstone,' +
  'i_apple,i_bread,i_wheat,i_seeds,i_porkchop,i_cooked_porkchop,i_beef,i_steak,i_chicken,' +
  'i_cooked_chicken,i_mutton,i_cooked_mutton,i_string,i_gunpowder,i_feather,i_leather,i_bone,' +
  'i_flint,i_clay_ball,i_brick,i_paper,i_book,i_bucket,i_water_bucket,i_lava_bucket,i_milk,' +
  'i_egg,i_snowball,i_slimeball,i_stick_torch,i_bowl,i_mushroom_stew,i_sugar,i_cookie,i_melon_slice,' +
  'i_pumpkin_pie,i_rotten_flesh,i_spider_eye,i_ender_pearl,i_blaze_rod,i_arrow,i_bow,i_fishing_rod,' +
  'i_compass,i_clock,i_map,i_shears,i_flint_steel,i_saddle,i_name_tag,i_exp_bottle'
).split(',');
for (var _j = 0; _j < ITEMTEX.length; _j++) T[ITEMTEX[_j]] = TEX.length + _j;
var TOOL_TEX_BASE = TEX.length + ITEMTEX.length;
/* 5 materials x 5 tool kinds, generated from one template */
var TOOL_MATS = ['wood', 'stone', 'iron', 'gold', 'diamond'];
var TOOL_KINDS = ['pickaxe', 'axe', 'shovel', 'sword', 'hoe'];
for (var m = 0; m < TOOL_MATS.length; m++)
  for (var k = 0; k < TOOL_KINDS.length; k++)
    T['t_' + TOOL_MATS[m] + '_' + TOOL_KINDS[k]] = TOOL_TEX_BASE + m * 5 + k;
var ARMOR_TEX_BASE = TOOL_TEX_BASE + 25;
var DESTROY_BASE, TEX_WHITE;
var ARMOR_MATS = ['leather', 'iron', 'gold', 'diamond'];
var ARMOR_KINDS = ['helmet', 'chestplate', 'leggings', 'boots'];
for (var m2 = 0; m2 < ARMOR_MATS.length; m2++)
  for (var k2 = 0; k2 < ARMOR_KINDS.length; k2++)
    T['a_' + ARMOR_MATS[m2] + '_' + ARMOR_KINDS[k2]] = ARMOR_TEX_BASE + m2 * 4 + k2;
DESTROY_BASE = ARMOR_TEX_BASE + 16;
for (var _d = 0; _d < 10; _d++) T['destroy' + _d] = DESTROY_BASE + _d;
TEX_WHITE = DESTROY_BASE + 10;
T.white = TEX_WHITE;
var TEX_COUNT = TEX_WHITE + 1;

/* tint slots — must match the palette array in the shader */
var TINT_NONE = 0, TINT_GRASS = 1, TINT_GRASS_DRY = 2, TINT_GRASS_COLD = 3,
    TINT_GRASS_SWAMP = 4, TINT_LEAF = 5, TINT_LEAF_BIRCH = 6, TINT_WATER = 7;
