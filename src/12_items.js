/* ================================================================== items == */
var ITEMS = {};                                  // id -> item def (ids >= 256)
var IID = {};                                    // name -> id
var ITEM_BASE = 256, _nextItem = ITEM_BASE;

function item(name, o) {
  o = o || {};
  var id = o.id || _nextItem++;
  if (id >= _nextItem) _nextItem = id + 1;
  var it = {
    id: id, name: name, isItem: true,
    label: o.label || name.slice(2).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }),
    tex: T[name] !== undefined ? T[name] : T.i_stick,
    stackSize: o.stack || 64,
    food: o.food || 0,                            // hunger points restored
    sat: o.sat || 0,                              // saturation
    eatTime: o.eatTime || 1.4,
    fuel: o.fuel || 0,                            // seconds of smelting
    tool: o.tool || null, mat: o.mat || null,
    speed: o.speed || 1, level: o.level || 0, damage: o.damage || 1,
    durability: o.durability || 0,
    armor: o.armor || 0, slot: o.slot || null,
    place: o.place !== undefined ? o.place : null, // block id placed on use
    effect: o.effect || null
  };
  ITEMS[id] = it; IID[name] = id;
  return it;
}

item('i_stick', { fuel: 5 });
item('i_coal', { fuel: 80 });
item('i_charcoal', { fuel: 80 });
item('i_iron', { label: 'Iron Ingot' });
item('i_gold', { label: 'Gold Ingot' });
item('i_diamond', {});
item('i_emerald', {});
item('i_lapis', { label: 'Lapis Lazuli' });
item('i_redstone', { label: 'Redstone Dust' });
item('i_glowdust', { label: 'Glowstone Dust' });
item('i_apple', { food: 4, sat: 2.4 });
item('i_bread', { food: 5, sat: 6 });
item('i_wheat', {});
item('i_seeds', { place: 72, label: 'Wheat Seeds' });
item('i_porkchop', { food: 3, sat: 1.8, label: 'Raw Porkchop' });
item('i_cooked_porkchop', { food: 8, sat: 12.8 });
item('i_beef', { food: 3, sat: 1.8, label: 'Raw Beef' });
item('i_steak', { food: 8, sat: 12.8 });
item('i_chicken', { food: 2, sat: 1.2, label: 'Raw Chicken' });
item('i_cooked_chicken', { food: 6, sat: 7.2 });
item('i_mutton', { food: 2, sat: 1.2, label: 'Raw Mutton' });
item('i_cooked_mutton', { food: 6, sat: 9.6 });
item('i_string', {});
item('i_gunpowder', {});
item('i_feather', {});
item('i_leather', {});
item('i_bone', {});
item('i_flint', {});
item('i_clay_ball', {});
item('i_brick', {});
item('i_paper', {});
item('i_book', {});
item('i_bucket', { stack: 16 });
item('i_water_bucket', { stack: 1, place: 8 });
item('i_lava_bucket', { stack: 1, place: 9, fuel: 1000 });
item('i_milk', { stack: 1, food: 0, effect: 'clear' });
item('i_egg', { stack: 16 });
item('i_snowball', { stack: 16 });
item('i_slimeball', {});
item('i_bowl', { fuel: 5 });
item('i_mushroom_stew', { stack: 1, food: 6, sat: 7.2 });
item('i_sugar', {});
item('i_cookie', { food: 2, sat: 0.4 });
item('i_melon_slice', { food: 2, sat: 1.2 });
item('i_pumpkin_pie', { food: 8, sat: 4.8 });
item('i_rotten_flesh', { food: 4, sat: 0.8, effect: 'poison' });
item('i_spider_eye', { food: 2, sat: 3.2, effect: 'poison' });
item('i_shears', { stack: 1, durability: 238, tool: 'shears', speed: 5, level: 0, damage: 1 });
item('i_flint_steel', { stack: 1, durability: 64, label: 'Flint and Steel' });
item('i_arrow', {});
item('i_bow', { stack: 1, durability: 384 });

/* ---- tools: 5 materials x 5 kinds, stats derived from the material ------- */
var MAT_STATS = {
  wood:    { speed: 2,  level: 1, dur: 59,   dmg: 1, ing: 'planks' },
  stone:   { speed: 4,  level: 2, dur: 131,  dmg: 2, ing: 'cobblestone' },
  iron:    { speed: 6,  level: 3, dur: 250,  dmg: 3, ing: 'i_iron' },
  gold:    { speed: 12, level: 1, dur: 32,   dmg: 1, ing: 'i_gold' },
  diamond: { speed: 8,  level: 4, dur: 1561, dmg: 4, ing: 'i_diamond' }
};
var KIND_DMG = { pickaxe: 1, axe: 2, shovel: 0, sword: 3, hoe: 0 };
for (var tm = 0; tm < TOOL_MATS.length; tm++) {
  for (var tk = 0; tk < TOOL_KINDS.length; tk++) {
    var mat = TOOL_MATS[tm], kind = TOOL_KINDS[tk], st = MAT_STATS[mat];
    item('t_' + mat + '_' + kind, {
      stack: 1, tool: kind, mat: mat,
      speed: kind === 'sword' ? 1.5 : st.speed,
      level: st.level, durability: st.dur,
      damage: 1 + st.dmg + KIND_DMG[kind],
      fuel: mat === 'wood' ? 10 : 0,
      label: mat.charAt(0).toUpperCase() + mat.slice(1) + ' ' + kind.charAt(0).toUpperCase() + kind.slice(1)
    });
  }
}
/* ---- armor -------------------------------------------------------------- */
var ARMOR_STATS = {
  leather: { pts: [1, 3, 2, 1], dur: 55,  ing: 'i_leather' },
  iron:    { pts: [2, 6, 5, 2], dur: 165, ing: 'i_iron' },
  gold:    { pts: [2, 5, 3, 1], dur: 77,  ing: 'i_gold' },
  diamond: { pts: [3, 8, 6, 3], dur: 363, ing: 'i_diamond' }
};
for (var am = 0; am < ARMOR_MATS.length; am++) {
  for (var ak = 0; ak < ARMOR_KINDS.length; ak++) {
    var amat = ARMOR_MATS[am], akind = ARMOR_KINDS[ak], ast = ARMOR_STATS[amat];
    item('a_' + amat + '_' + akind, {
      stack: 1, armor: ast.pts[ak], slot: akind, durability: ast.dur * (ak === 1 ? 1.6 : 1) | 0,
      label: amat.charAt(0).toUpperCase() + amat.slice(1) + ' ' +
             akind.charAt(0).toUpperCase() + akind.slice(1)
    });
  }
}

/* --------------------------------------------------------- id utilities -- */
function isItem(id) { return id >= ITEM_BASE; }
function defOf(id) { return id >= ITEM_BASE ? ITEMS[id] : BLOCKS[id]; }
function idOf(nameOrId) {
  if (typeof nameOrId === 'number') return nameOrId;
  if (IID[nameOrId] !== undefined) return IID[nameOrId];
  if (BID[nameOrId] !== undefined) return BID[nameOrId];
  return 0;
}
function labelOf(id) { var d = defOf(id); return d ? d.label : '?'; }
function texOf(id) {
  if (id >= ITEM_BASE) return ITEMS[id].tex;
  return BLOCKS[id].faces[0];
}
function stackSizeOf(id) { var d = defOf(id); return d ? (d.stackSize || 64) : 64; }
function fuelOf(id) { var d = defOf(id); return d ? (d.fuel || 0) : 0; }

/* =============================================================== recipes == */
/* shaped:   { r:['XXX','.S.','.S.'], k:{X:'planks',S:'i_stick'}, out:'t_wood_pickaxe', n:1 }
   shapeless:{ any:['planks'], out:'i_stick', n:4 }                              */
var RECIPES = [];
function R(o) { RECIPES.push(o); return o; }

R({ any: ['oak_log'], out: 'planks', n: 4 });
R({ any: ['birch_log'], out: 'birch_planks', n: 4 });
R({ r: ['P', 'P'], k: { P: 'planks' }, out: 'i_stick', n: 4 });
R({ r: ['PP', 'PP'], k: { P: 'planks' }, out: 'crafting_table', n: 1 });
R({ r: ['CC', 'CC'], k: { C: 'cobblestone' }, out: 'stone_bricks', n: 4 });
R({ r: ['S', 'S'], k: { S: 'i_stick' }, out: 'torch', n: 4, note: 'needs coal' });
R({ r: ['C', 'S'], k: { C: 'i_coal', S: 'i_stick' }, out: 'torch', n: 4 });
R({ r: ['C', 'S'], k: { C: 'i_charcoal', S: 'i_stick' }, out: 'torch', n: 4 });
R({ r: ['CCC', 'C C', 'CCC'], k: { C: 'cobblestone' }, out: 'furnace', n: 1 });
R({ r: ['PPP', 'P P', 'PPP'], k: { P: 'planks' }, out: 'chest', n: 1 });
R({ r: ['GGG', 'GGG', 'GGG'], k: { G: 'i_gunpowder' }, out: 'tnt', n: 1 });
R({ r: ['PBP', 'PBP', 'PBP'], k: { P: 'planks', B: 'i_book' }, out: 'bookshelf', n: 1 });
R({ any: ['i_paper', 'i_paper', 'i_paper', 'i_leather'], out: 'i_book', n: 1 });
R({ r: ['III', 'III', 'III'], k: { I: 'i_iron' }, out: 'iron_block', n: 1 });
R({ r: ['III', 'III', 'III'], k: { I: 'i_gold' }, out: 'gold_block', n: 1 });
R({ r: ['III', 'III', 'III'], k: { I: 'i_diamond' }, out: 'diamond_block', n: 1 });
R({ r: ['III', 'III', 'III'], k: { I: 'i_emerald' }, out: 'emerald_block', n: 1 });
R({ r: ['III', 'III', 'III'], k: { I: 'i_lapis' }, out: 'lapis_block', n: 1 });
R({ r: ['III', 'III', 'III'], k: { I: 'i_redstone' }, out: 'redstone_block', n: 1 });
R({ r: ['III', 'III', 'III'], k: { I: 'i_wheat' }, out: 'hay_block', n: 1 });
R({ any: ['iron_block'], out: 'i_iron', n: 9 });
R({ any: ['gold_block'], out: 'i_gold', n: 9 });
R({ any: ['diamond_block'], out: 'i_diamond', n: 9 });
R({ any: ['emerald_block'], out: 'i_emerald', n: 9 });
R({ any: ['lapis_block'], out: 'i_lapis', n: 9 });
R({ any: ['redstone_block'], out: 'i_redstone', n: 9 });
R({ any: ['hay_block'], out: 'i_wheat', n: 9 });
R({ r: ['BB', 'BB'], k: { B: 'i_brick' }, out: 'bricks', n: 1 });
R({ r: ['SS', 'SS'], k: { S: 'sand' }, out: 'sandstone', n: 1 });
R({ r: ['SS', 'SS'], k: { S: 'red_sand' }, out: 'red_sandstone', n: 1 });
R({ r: ['SS', 'SS'], k: { S: 'i_snowball' }, out: 'snow_block', n: 1 });
R({ r: ['GGG', 'GGG', 'GGG'], k: { G: 'i_glowdust' }, out: 'glowstone', n: 1 });
R({ any: ['i_wheat', 'i_wheat', 'i_wheat'], out: 'i_bread', n: 1 });
R({ r: ['WWW', ' S ', ' S '], k: { W: 'i_wheat', S: 'i_stick' }, out: 'i_paper', n: 3 });
R({ r: ['P P', ' P '], k: { P: 'planks' }, out: 'i_bowl', n: 4 });
R({ any: ['red_mushroom', 'brown_mushroom', 'i_bowl'], out: 'i_mushroom_stew', n: 1 });
R({ any: ['i_wheat', 'i_wheat', 'i_cookie'], out: 'i_cookie', n: 8 });
R({ r: ['III', ' I ', 'III'], k: { I: 'i_iron' }, out: 'i_bucket', n: 1 });
R({ r: ['I ', ' I'], k: { I: 'i_iron' }, out: 'i_shears', n: 1 });
R({ r: ['I ', ' F'], k: { I: 'i_iron', F: 'i_flint' }, out: 'i_flint_steel', n: 1 });
R({ r: [' SS', 'S S', ' SS'], k: { S: 'i_string' }, out: 'i_bow', n: 1 });
R({ r: ['F', 'S', 'E'], k: { F: 'i_flint', S: 'i_stick', E: 'i_feather' }, out: 'i_arrow', n: 4 });
R({ any: ['i_string', 'i_string', 'i_string', 'i_string'], out: 'white_wool', n: 1 });
R({ r: ['GGG', 'GGG', 'GGG'], k: { G: 'glass' }, out: 'glass', n: 9, hidden: true });
/* dyed wool from flowers */
R({ any: ['white_wool', 'red_flower'], out: 'red_wool', n: 1 });
R({ any: ['white_wool', 'yellow_flower'], out: 'yellow_wool', n: 1 });
R({ any: ['white_wool', 'blue_flower'], out: 'blue_wool', n: 1 });
R({ any: ['white_wool', 'i_coal'], out: 'black_wool', n: 1 });
R({ any: ['white_wool', 'i_emerald'], out: 'green_wool', n: 1 });
R({ any: ['white_wool', 'i_brick'], out: 'orange_wool', n: 1 });
R({ any: ['white_wool', 'i_lapis'], out: 'purple_wool', n: 1 });
R({ any: ['glass', 'red_flower'], out: 'red_glass', n: 1 });
R({ any: ['glass', 'blue_flower'], out: 'blue_glass', n: 1 });
R({ any: ['i_slimeball', 'i_slimeball', 'i_slimeball', 'i_slimeball',
           'i_slimeball', 'i_slimeball', 'i_slimeball', 'i_slimeball', 'i_slimeball'], out: 'slime_block', n: 1 });

/* tools + armor recipes, generated */
var TOOL_SHAPES = {
  pickaxe: ['MMM', ' S ', ' S '],
  axe:     ['MM', 'MS', ' S'],
  shovel:  ['M', 'S', 'S'],
  sword:   ['M', 'M', 'S'],
  hoe:     ['MM', ' S', ' S']
};
var ARMOR_SHAPES = {
  helmet:     ['MMM', 'M M'],
  chestplate: ['M M', 'MMM', 'MMM'],
  leggings:   ['MMM', 'M M', 'M M'],
  boots:      ['M M', 'M M']
};
(function () {
  for (var i = 0; i < TOOL_MATS.length; i++) {
    var mt = TOOL_MATS[i], ing = MAT_STATS[mt].ing;
    for (var j = 0; j < TOOL_KINDS.length; j++) {
      var kd = TOOL_KINDS[j];
      R({ r: TOOL_SHAPES[kd], k: { M: ing, S: 'i_stick' }, out: 't_' + mt + '_' + kd, n: 1 });
      if (mt === 'wood') R({ r: TOOL_SHAPES[kd], k: { M: 'birch_planks', S: 'i_stick' }, out: 't_wood_' + kd, n: 1, hidden: true });
    }
  }
  for (var a = 0; a < ARMOR_MATS.length; a++) {
    var amt = ARMOR_MATS[a], aing = ARMOR_STATS[amt].ing;
    for (var b = 0; b < ARMOR_KINDS.length; b++)
      R({ r: ARMOR_SHAPES[ARMOR_KINDS[b]], k: { M: aing }, out: 'a_' + amt + '_' + ARMOR_KINDS[b], n: 1 });
  }
})();

/* resolve names -> ids once */
(function () {
  for (var i = 0; i < RECIPES.length; i++) {
    var rc = RECIPES[i];
    rc.outId = idOf(rc.out);
    if (rc.any) { rc.anyIds = rc.any.map(idOf).sort(function (a, b) { return a - b; }); }
    if (rc.r) {
      rc.grid = []; rc.w = 0; rc.h = rc.r.length;
      for (var y = 0; y < rc.r.length; y++) {
        var row = rc.r[y]; rc.w = Math.max(rc.w, row.length);
        for (var x = 0; x < row.length; x++) {
          var ch = row[x];
          rc.grid.push(ch === ' ' ? 0 : idOf(rc.k[ch]));
        }
      }
      /* pad rows to width */
      var g = [];
      for (var y2 = 0; y2 < rc.h; y2++) {
        for (var x2 = 0; x2 < rc.w; x2++) {
          var rr = rc.r[y2];
          var c2 = x2 < rr.length ? rr[x2] : ' ';
          g.push(c2 === ' ' ? 0 : idOf(rc.k[c2]));
        }
      }
      rc.grid = g;
    }
  }
  RECIPES = RECIPES.filter(function (r) { return !r.note; });
})();

/* ------------------------------------------------------------- smelting -- */
var SMELT = {};
function S(inp, out, n, xp) { SMELT[idOf(inp)] = { out: idOf(out), n: n || 1, xp: xp || 0.1 }; }
S('iron_ore', 'i_iron', 1, .7); S('gold_ore', 'i_gold', 1, 1);
S('sand', 'glass', 1, .1); S('red_sand', 'glass', 1, .1);
S('cobblestone', 'stone', 1, .1); S('stone', 'quartz_block', 1, .1);
S('oak_log', 'i_charcoal', 1, .15); S('birch_log', 'i_charcoal', 1, .15);
S('i_porkchop', 'i_cooked_porkchop', 1, .35); S('i_beef', 'i_steak', 1, .35);
S('i_chicken', 'i_cooked_chicken', 1, .35); S('i_mutton', 'i_cooked_mutton', 1, .35);
S('i_clay_ball', 'i_brick', 1, .3); S('clay', 'bricks', 1, .35);
S('i_diamond', 'i_diamond', 1, 0);
S('diamond_ore', 'i_diamond', 1, 1); S('coal_ore', 'i_coal', 1, .1);
S('emerald_ore', 'i_emerald', 1, 1); S('lapis_ore', 'i_lapis', 1, .2);
S('redstone_ore', 'i_redstone', 1, .7); S('netherrack', 'i_brick', 1, .1);
S('cactus', 'green_wool', 1, .2); S('i_potato', 'i_bread', 1, .35);

/* ------------------------------------------------- mining time / drops ---- */
var TOOL_MATCH = { pickaxe: 'pickaxe', axe: 'axe', shovel: 'shovel', shears: 'shears' };
function breakTime(blockId, heldId) {
  var b = BLOCKS[blockId];
  if (!b || b.hardness < 0) return Infinity;
  if (b.hardness === 0) return 0.02;
  var held = heldId >= ITEM_BASE ? ITEMS[heldId] : null;
  var speed = 1, level = 0;
  if (held && held.tool) {
    level = held.level || 0;
    if (b.tool && held.tool === b.tool) speed = held.speed;
    else if (held.tool === 'shears' && (b.tool === 'shears' || b.name.indexOf('leaves') >= 0)) speed = held.speed;
    else if (held.tool === 'sword' && b.render === 'cross') speed = 15;
  }
  var canHarvest = !b.tool || !b.level || level >= b.level;
  var t = b.hardness * (canHarvest ? 1.5 : 5) / speed;
  return Math.max(0.05, t);
}
function canHarvest(blockId, heldId) {
  var b = BLOCKS[blockId];
  if (!b.level) return true;
  var held = heldId >= ITEM_BASE ? ITEMS[heldId] : null;
  if (!held || !held.tool) return false;
  if (b.tool && held.tool !== b.tool) return false;
  return (held.level || 0) >= b.level;
}
function blockDrops(blockId, heldId, rnd) {
  var b = BLOCKS[blockId];
  if (b.drop === null || b.drop === undefined) {
    if (blockId === BID.glass || blockId === BID.red_glass || blockId === BID.blue_glass ||
        blockId === BID.ice) return [];
    return [];
  }
  if (!canHarvest(blockId, heldId)) return [];
  var held = heldId >= ITEM_BASE ? ITEMS[heldId] : null;
  var shears = held && held.tool === 'shears';
  var d = b.drop;
  if (d === 'rare_sapling') return shears ? [[BID.oak_leaves, 1]] : (rnd() < 0.06 ? [[BID.oak_sapling, 1]] : (rnd() < 0.02 ? [[IID.i_apple, 1]] : []));
  if (d === 'rare_sapling_birch') return shears ? [[BID.birch_leaves, 1]] : (rnd() < 0.06 ? [[BID.birch_sapling, 1]] : []);
  if (d === 'rare_seeds') return shears ? [[blockId, 1]] : (rnd() < 0.35 ? [[IID.i_seeds, 1]] : []);
  if (typeof d === 'string') d = idOf(d);
  if (blockId === BID.gravel && rnd() < 0.12) return [[IID.i_flint, 1]];
  if (BLOCKS[blockId] && BLOCKS[blockId].tool === 'shears' && shears && blockId >= 60 && blockId <= 67) return [[blockId, 1]];
  var n = b.dropCount;
  if (blockId === BID.redstone_ore) n = 4 + (rnd() * 2 | 0);
  if (blockId === BID.lapis_ore) n = 4 + (rnd() * 5 | 0);
  return [[d, n]];
}
