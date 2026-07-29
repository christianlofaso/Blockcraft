/* ================================================================= blocks == */
/* face order: 0:+X 1:-X 2:+Y(top) 3:-Y(bottom) 4:+Z 5:-Z                      */
var BLOCKS = [];
var BID = {};                                   // name -> id

function def(id, name, o) {
  o = o || {};
  var t = o.tex;
  var faces;
  if (t == null) faces = [0, 0, 0, 0, 0, 0];
  else if (typeof t === 'number') faces = [t, t, t, t, t, t];
  else if (t.length === 3) faces = [t[0], t[0], t[1], t[2], t[0], t[0]];   // side,top,bottom
  else faces = t.slice();
  var b = {
    id: id, name: name,
    label: o.label || name.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }),
    faces: faces,
    render: o.render || 'cube',                 // cube | cross | liquid | torch | cactus | none
    solid: o.solid !== false,                   // has collision
    opaque: o.opaque !== undefined ? o.opaque : (o.render ? false : true),
    opacity: o.opacity !== undefined ? o.opacity : ((o.opaque !== undefined ? o.opaque : !o.render) ? 15 : 0),
    light: o.light || 0,                        // emission 0..15
    tint: o.tint || 0,
    tintFaces: o.tintFaces || null,             // per-face tint override
    hardness: o.hardness !== undefined ? o.hardness : 1,
    tool: o.tool || null,                       // 'pickaxe'|'axe'|'shovel'|'shears'
    level: o.level || 0,                        // min tool tier for a drop
    drop: o.drop !== undefined ? o.drop : id,   // block id, item id, null, or fn
    dropCount: o.dropCount || 1,
    xp: o.xp || 0,
    liquid: !!o.liquid,
    climb: !!o.climb,
    replaceable: !!o.replaceable,               // grass/flowers get overwritten when building
    needsSupport: o.needsSupport || null,       // list of ids that may sit beneath
    flammable: !!o.flammable,
    slip: o.slip || 0,
    bounce: o.bounce || 0,
    gravity: !!o.gravity,
    sound: o.sound || 'stone',
    fuel: o.fuel || 0,
    stackSize: 64
  };
  BLOCKS[id] = b; BID[name] = id;
  return b;
}

def(0, 'air', { render: 'none', solid: false, opaque: false, opacity: 0, drop: null, replaceable: true, hardness: 0 });
def(1, 'stone',        { tex: T.stone, hardness: 1.5, tool: 'pickaxe', level: 1, drop: 4, xp: 0 });
def(2, 'grass_block',  { tex: [T.grass_side, T.grass_top, T.dirt], hardness: .6, tool: 'shovel', drop: 3,
                         tint: TINT_GRASS, tintFaces: [1, 1, 1, 0, 1, 1], sound: 'grass' });
def(3, 'dirt',         { tex: T.dirt, hardness: .5, tool: 'shovel', sound: 'gravel' });
def(4, 'cobblestone',  { tex: T.cobblestone, hardness: 2, tool: 'pickaxe', level: 1 });
def(5, 'planks',       { tex: T.planks, hardness: 2, tool: 'axe', sound: 'wood', flammable: true, fuel: 300 });
def(6, 'birch_planks', { tex: T.birch_planks, hardness: 2, tool: 'axe', sound: 'wood', flammable: true, fuel: 300 });
def(7, 'bedrock',      { tex: T.bedrock, hardness: -1, drop: null });
def(8, 'water',        { tex: T.water, render: 'liquid', solid: false, opaque: false, opacity: 2,
                         liquid: true, tint: TINT_WATER, hardness: -1, drop: null, replaceable: true, sound: 'water' });
def(9, 'lava',         { tex: T.lava, render: 'liquid', solid: false, opaque: false, opacity: 1, light: 15,
                         liquid: true, hardness: -1, drop: null, replaceable: true, sound: 'lava' });
def(10, 'sand',        { tex: T.sand, hardness: .5, tool: 'shovel', gravity: true, sound: 'sand' });
def(11, 'red_sand',    { tex: T.red_sand, hardness: .5, tool: 'shovel', gravity: true, sound: 'sand' });
def(12, 'gravel',      { tex: T.gravel, hardness: .6, tool: 'shovel', gravity: true, sound: 'gravel' });
/* tool tiers: 1 wood/gold, 2 stone, 3 iron, 4 diamond */
def(13, 'gold_ore',    { tex: T.gold_ore, hardness: 3, tool: 'pickaxe', level: 3 });
def(14, 'iron_ore',    { tex: T.iron_ore, hardness: 3, tool: 'pickaxe', level: 2 });
def(15, 'coal_ore',    { tex: T.coal_ore, hardness: 3, tool: 'pickaxe', level: 1, drop: 'i_coal', xp: 1 });
def(16, 'diamond_ore', { tex: T.diamond_ore, hardness: 3, tool: 'pickaxe', level: 3, drop: 'i_diamond', xp: 5 });
def(17, 'redstone_ore',{ tex: T.redstone_ore, hardness: 3, tool: 'pickaxe', level: 3, drop: 'i_redstone', dropCount: 4, xp: 2 });
def(18, 'emerald_ore', { tex: T.emerald_ore, hardness: 3, tool: 'pickaxe', level: 3, drop: 'i_emerald', xp: 4 });
def(19, 'lapis_ore',   { tex: T.lapis_ore, hardness: 3, tool: 'pickaxe', level: 2, drop: 'i_lapis', dropCount: 5, xp: 2 });
def(20, 'oak_log',     { tex: [T.log_side, T.log_top, T.log_top], hardness: 2, tool: 'axe', sound: 'wood', flammable: true, fuel: 300 });
def(21, 'birch_log',   { tex: [T.birch_log_side, T.birch_log_top, T.birch_log_top], hardness: 2, tool: 'axe', sound: 'wood', flammable: true, fuel: 300 });
def(22, 'oak_leaves',  { tex: T.leaves, opaque: false, opacity: 1, hardness: .2, tool: 'shears',
                         tint: TINT_LEAF, drop: 'rare_sapling', sound: 'grass', flammable: true });
def(23, 'birch_leaves',{ tex: T.birch_leaves, opaque: false, opacity: 1, hardness: .2, tool: 'shears',
                         tint: TINT_LEAF_BIRCH, drop: 'rare_sapling_birch', sound: 'grass', flammable: true });
def(24, 'glass',       { tex: T.glass, opaque: false, opacity: 0, hardness: .3, drop: null, sound: 'glass' });
def(25, 'sandstone',   { tex: [T.sandstone_side, T.sandstone_top, T.sandstone_bottom], hardness: .8, tool: 'pickaxe', level: 1 });
def(26, 'red_sandstone',{tex: T.red_sandstone, hardness: .8, tool: 'pickaxe', level: 1 });
def(27, 'snow_block',  { tex: T.snow, hardness: .2, tool: 'shovel', drop: 'i_snowball', dropCount: 4, sound: 'snow' });
def(28, 'ice',         { tex: T.ice, opaque: false, opacity: 3, hardness: .5, tool: 'pickaxe', drop: null, slip: .96, sound: 'glass' });
def(29, 'packed_ice',  { tex: T.packed_ice, hardness: .5, tool: 'pickaxe', slip: .96, sound: 'glass' });
def(30, 'cactus',      { tex: [T.cactus_side, T.cactus_top, T.cactus_top], render: 'cactus', opaque: false,
                         hardness: .4, sound: 'grass' });
def(31, 'clay',        { tex: T.clay, hardness: .6, tool: 'shovel', drop: 'i_clay_ball', dropCount: 4, sound: 'gravel' });
def(32, 'obsidian',    { tex: T.obsidian, hardness: 50, tool: 'pickaxe', level: 4 });
def(33, 'bricks',      { tex: T.bricks, hardness: 2, tool: 'pickaxe', level: 1 });
def(34, 'stone_bricks',{ tex: T.stone_bricks, hardness: 1.5, tool: 'pickaxe', level: 1 });
def(35, 'mossy_cobblestone', { tex: T.mossy_cobble, hardness: 2, tool: 'pickaxe', level: 1 });
def(36, 'glowstone',   { tex: T.glowstone, light: 15, hardness: .3, drop: 'i_glowdust', sound: 'glass' });
def(37, 'torch',       { tex: T.torch, render: 'torch', solid: false, opaque: false, light: 14, hardness: 0,
                         needsSupport: 'any', sound: 'wood' });
def(38, 'crafting_table', { tex: [T.crafting_side, T.crafting_top, T.planks], hardness: 2.5, tool: 'axe',
                            sound: 'wood', flammable: true, fuel: 300 });
def(39, 'furnace',     { tex: [T.furnace_side, T.furnace_top, T.furnace_top, T.furnace_top, T.furnace_side, T.furnace_front],
                         hardness: 3.5, tool: 'pickaxe', level: 1, drop: 39 });
def(40, 'lit_furnace',  { tex: [T.furnace_side, T.furnace_top, T.furnace_top, T.furnace_top, T.furnace_side, T.furnace_lit],
                         light: 13, hardness: 3.5, tool: 'pickaxe', level: 1, drop: 39 });
def(41, 'chest',       { tex: [T.chest_side, T.chest_top, T.chest_top, T.chest_top, T.chest_side, T.chest_front],
                         hardness: 2.5, tool: 'axe', sound: 'wood', flammable: true });
def(42, 'tnt',         { tex: [T.tnt_side, T.tnt_top, T.tnt_bottom], hardness: 0, drop: 42, sound: 'grass' });
def(43, 'bookshelf',   { tex: [T.bookshelf, T.planks, T.planks], hardness: 1.5, tool: 'axe', drop: 'i_book',
                         dropCount: 3, sound: 'wood', flammable: true, fuel: 300 });
def(44, 'iron_block',  { tex: T.iron_block, hardness: 5, tool: 'pickaxe', level: 1, sound: 'metal' });
def(45, 'gold_block',  { tex: T.gold_block, hardness: 3, tool: 'pickaxe', level: 2, sound: 'metal' });
def(46, 'diamond_block',{tex: T.diamond_block, hardness: 5, tool: 'pickaxe', level: 2, sound: 'metal' });
def(47, 'emerald_block',{tex: T.emerald_block, hardness: 5, tool: 'pickaxe', level: 2, sound: 'metal' });
def(48, 'lapis_block', { tex: T.lapis_block, hardness: 3, tool: 'pickaxe', level: 1 });
def(49, 'redstone_block',{tex: T.redstone_block, hardness: 5, tool: 'pickaxe', level: 1, sound: 'metal' });
def(50, 'granite',     { tex: T.granite, hardness: 1.5, tool: 'pickaxe', level: 1 });
def(51, 'diorite',     { tex: T.diorite, hardness: 1.5, tool: 'pickaxe', level: 1 });
def(52, 'andesite',    { tex: T.andesite, hardness: 1.5, tool: 'pickaxe', level: 1 });
def(53, 'coarse_dirt', { tex: T.coarse_dirt, hardness: .5, tool: 'shovel', sound: 'gravel' });
def(54, 'podzol',      { tex: [T.log_side, T.podzol_top, T.dirt], hardness: .5, tool: 'shovel', drop: 3, sound: 'gravel' });
def(55, 'mycelium',    { tex: [T.dirt, T.mycelium_top, T.dirt], hardness: .6, tool: 'shovel', drop: 3, sound: 'grass' });
def(56, 'quartz_block',{ tex: T.quartz_block, hardness: .8, tool: 'pickaxe', level: 1 });
def(57, 'hay_block',   { tex: [T.hay_side, T.hay_top, T.hay_top], hardness: .5, sound: 'grass', flammable: true });
def(58, 'sponge',      { tex: T.sponge, hardness: .6, sound: 'grass' });
def(59, 'slime_block', { tex: T.slime, opaque: false, opacity: 1, hardness: 0, bounce: .8, sound: 'slime' });
var WOOL_NAMES = ['white', 'orange', 'yellow', 'green', 'blue', 'purple', 'red', 'black'];
var WOOL_TEX = [T.wool_white, T.wool_orange, T.wool_yellow, T.wool_green, T.wool_blue, T.wool_purple, T.wool_red, T.wool_black];
for (var wi = 0; wi < 8; wi++)
  def(60 + wi, WOOL_NAMES[wi] + '_wool', { tex: WOOL_TEX[wi], hardness: .8, tool: 'shears', sound: 'wool', flammable: true });
def(68, 'pumpkin',     { tex: [T.pumpkin_side, T.pumpkin_top, T.pumpkin_top, T.pumpkin_top, T.pumpkin_side, T.pumpkin_face],
                         hardness: 1, tool: 'axe', sound: 'wood' });
def(69, 'melon',       { tex: [T.melon_side, T.melon_top, T.melon_top], hardness: 1, tool: 'axe',
                         drop: 'i_melon_slice', dropCount: 4, sound: 'wood' });
def(70, 'farmland',    { tex: [T.dirt, T.farmland, T.dirt], hardness: .5, tool: 'shovel', drop: 3, sound: 'gravel' });
def(71, 'wet_farmland',{ tex: [T.dirt, T.farmland_wet, T.dirt], hardness: .5, tool: 'shovel', drop: 3, sound: 'gravel' });
for (var ci = 0; ci < 4; ci++)
  def(72 + ci, 'wheat_' + ci, { tex: T['wheat' + ci], render: 'cross', solid: false, opaque: false, hardness: 0,
      drop: 'i_seeds', needsSupport: [70, 71], replaceable: false, sound: 'grass', label: 'Wheat Crop' });
def(76, 'red_flower',   { tex: T.flower_red, render: 'cross', solid: false, opaque: false, hardness: 0,
                          needsSupport: [2, 3, 53, 54, 55, 70, 71], replaceable: true, sound: 'grass' });
def(77, 'yellow_flower',{ tex: T.flower_yellow, render: 'cross', solid: false, opaque: false, hardness: 0,
                          needsSupport: [2, 3, 53, 54, 55, 70, 71], replaceable: true, sound: 'grass' });
def(78, 'blue_flower',  { tex: T.flower_blue, render: 'cross', solid: false, opaque: false, hardness: 0,
                          needsSupport: [2, 3, 53, 54, 55, 70, 71], replaceable: true, sound: 'grass' });
def(79, 'tall_grass',  { tex: T.tall_grass, render: 'cross', solid: false, opaque: false, hardness: 0,
                         tint: TINT_GRASS, drop: 'rare_seeds', tool: 'shears',
                         needsSupport: [2, 3, 53, 54, 55], replaceable: true, sound: 'grass' });
def(80, 'fern',        { tex: T.fern, render: 'cross', solid: false, opaque: false, hardness: 0,
                         tint: TINT_GRASS, drop: 'rare_seeds', tool: 'shears',
                         needsSupport: [2, 3, 53, 54, 55], replaceable: true, sound: 'grass' });
def(81, 'red_mushroom',  { tex: T.mushroom_red, render: 'cross', solid: false, opaque: false, hardness: 0,
                           needsSupport: 'any', replaceable: true, sound: 'grass' });
def(82, 'brown_mushroom',{ tex: T.mushroom_brown, render: 'cross', solid: false, opaque: false, hardness: 0, light: 1,
                           needsSupport: 'any', replaceable: true, sound: 'grass' });
def(83, 'oak_sapling',  { tex: T.sapling, render: 'cross', solid: false, opaque: false, hardness: 0, tint: TINT_LEAF,
                          needsSupport: [2, 3, 53, 54, 55, 70, 71], replaceable: true, sound: 'grass' });
def(84, 'birch_sapling',{ tex: T.sapling, render: 'cross', solid: false, opaque: false, hardness: 0, tint: TINT_LEAF_BIRCH,
                          needsSupport: [2, 3, 53, 54, 55, 70, 71], replaceable: true, sound: 'grass' });
def(85, 'dead_bush',   { tex: T.dead_bush, render: 'cross', solid: false, opaque: false, hardness: 0, drop: 'i_stick',
                         needsSupport: [10, 11, 3, 53, 2], replaceable: true, sound: 'grass' });
def(86, 'cobweb',      { tex: T.cobweb, render: 'cross', solid: false, opaque: false, hardness: 4, tool: 'shears',
                         drop: 'i_string', climb: true, sound: 'wool' });
def(87, 'netherrack',  { tex: T.netherrack, hardness: .4, tool: 'pickaxe', level: 1 });
def(88, 'soul_sand',   { tex: T.soul_sand, hardness: .5, tool: 'shovel', sound: 'sand' });
def(89, 'note_block',  { tex: T.note_block, hardness: .8, tool: 'axe', sound: 'wood' });
def(90, 'jukebox',     { tex: [T.note_block, T.jukebox_top, T.note_block], hardness: 2, tool: 'axe', sound: 'wood' });
def(91, 'lily_pad',    { tex: T.lilypad, render: 'cross', solid: false, opaque: false, hardness: 0,
                         tint: TINT_LEAF, needsSupport: [8], replaceable: true, sound: 'grass' });
def(92, 'red_glass',   { tex: T.glass_red, opaque: false, opacity: 0, hardness: .3, drop: null, sound: 'glass' });
def(93, 'blue_glass',  { tex: T.glass_blue, opaque: false, opacity: 0, hardness: .3, drop: null, sound: 'glass' });
var BLOCK_COUNT = 94;
for (var bi = 0; bi < BLOCK_COUNT; bi++) if (!BLOCKS[bi]) def(bi, 'unused_' + bi, { tex: T.stone });

/* fast lookup tables used by the hot mesh / light loops */
var B_OPAQUE = new Uint8Array(BLOCK_COUNT), B_OPACITY = new Uint8Array(BLOCK_COUNT),
    B_LIGHT = new Uint8Array(BLOCK_COUNT), B_SOLID = new Uint8Array(BLOCK_COUNT),
    B_RENDER = new Uint8Array(BLOCK_COUNT), B_LIQUID = new Uint8Array(BLOCK_COUNT),
    B_REPL = new Uint8Array(BLOCK_COUNT);
var RENDER_IDS = { none: 0, cube: 1, cross: 2, liquid: 3, torch: 4, cactus: 5 };
for (var bx = 0; bx < BLOCK_COUNT; bx++) {
  var bb = BLOCKS[bx];
  B_OPAQUE[bx] = bb.opaque ? 1 : 0;
  B_OPACITY[bx] = bb.opacity;
  B_LIGHT[bx] = bb.light;
  B_SOLID[bx] = bb.solid ? 1 : 0;
  B_RENDER[bx] = RENDER_IDS[bb.render];
  B_LIQUID[bx] = bb.liquid ? 1 : 0;
  B_REPL[bx] = bb.replaceable ? 1 : 0;
}
