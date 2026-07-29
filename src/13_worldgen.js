/* ================================================================ worldgen == */
var BIOME = {
  DEEP_OCEAN: 0, OCEAN: 1, BEACH: 2, PLAINS: 3, FOREST: 4, BIRCH: 5, DESERT: 6,
  SAVANNA: 7, TAIGA: 8, SNOWY: 9, MOUNTAINS: 10, SWAMP: 11, JUNGLE: 12, STONE_SHORE: 13
};
var BIOME_INFO = [
  /*0 deep ocean*/ { name: 'Deep Ocean', top: 12, fill: 3, tint: TINT_GRASS_COLD, tree: 0, grass: 0, flower: 0 },
  /*1 ocean     */ { name: 'Ocean', top: 10, fill: 3, tint: TINT_GRASS_COLD, tree: 0, grass: 0, flower: 0 },
  /*2 beach     */ { name: 'Beach', top: 10, fill: 10, tint: TINT_GRASS, tree: 0, grass: 0, flower: 0 },
  /*3 plains    */ { name: 'Plains', top: 2, fill: 3, tint: TINT_GRASS, tree: .008, grass: .22, flower: .05 },
  /*4 forest    */ { name: 'Forest', top: 2, fill: 3, tint: TINT_GRASS, tree: .085, grass: .18, flower: .03 },
  /*5 birch     */ { name: 'Birch Forest', top: 2, fill: 3, tint: TINT_GRASS, tree: .075, grass: .16, flower: .03, birch: 1 },
  /*6 desert    */ { name: 'Desert', top: 10, fill: 10, tint: TINT_GRASS_DRY, tree: 0, grass: 0, flower: 0, cactus: .012, bush: .02 },
  /*7 savanna   */ { name: 'Savanna', top: 2, fill: 3, tint: TINT_GRASS_DRY, tree: .006, grass: .3, flower: .01 },
  /*8 taiga     */ { name: 'Taiga', top: 2, fill: 3, tint: TINT_GRASS_COLD, tree: .07, grass: .1, flower: .01, spruce: 1 },
  /*9 snowy     */ { name: 'Snowy Tundra', top: 2, fill: 3, tint: TINT_GRASS_COLD, tree: .012, grass: .04, flower: 0, snow: 1, spruce: 1 },
  /*10 mountains*/ { name: 'Mountains', top: 2, fill: 3, tint: TINT_GRASS_COLD, tree: .01, grass: .06, flower: .01, snow: 1, spruce: 1 },
  /*11 swamp    */ { name: 'Swamp', top: 2, fill: 3, tint: TINT_GRASS_SWAMP, tree: .03, grass: .25, flower: .01, mush: .03, lily: .1 },
  /*12 jungle   */ { name: 'Jungle', top: 2, fill: 3, tint: TINT_GRASS, tree: .13, grass: .35, flower: .04, tall: 1 },
  /*13 shore    */ { name: 'Stone Shore', top: 1, fill: 1, tint: TINT_GRASS_COLD, tree: 0, grass: 0, flower: 0 }
];

function WorldGen(seed) {
  this.seed = seed | 0;
  this.nCont = new Noise(seed + 1);
  this.nEro = new Noise(seed + 2);
  this.nDet = new Noise(seed + 3);
  this.nPeak = new Noise(seed + 4);
  this.nTemp = new Noise(seed + 5);
  this.nHum = new Noise(seed + 6);
  this.nCave = new Noise(seed + 7);
  this.nCave2 = new Noise(seed + 8);
  this.nOre = new Noise(seed + 9);
  this.nRiver = new Noise(seed + 10);
  this.nPatch = new Noise(seed + 11);
  this._hc = new Map();
}

WorldGen.prototype.heightAt = function (x, z) {
  var key = (x & 0x7fff) * 65536 + (z & 0x7fff);
  var c = this._hc.get(key);
  if (c !== undefined) return c;
  var cont = this.nCont.fbm2(x / 860, z / 860, 4);            // -1..1 land vs sea
  var ero = this.nEro.fbm2(x / 380 + 90, z / 380 - 40, 3);
  var det = this.nDet.fbm2(x / 74, z / 74, 4);
  var peak = this.nPeak.ridge2(x / 300, z / 300, 4);          // 0..1

  var land = smooth01(-0.06, 0.16, cont);
  var base = lerp(28, 66, land) + cont * 14;
  var flat = smooth01(-0.5, 0.4, ero);                        // 1 = flat plains
  var mountain = smooth01(0.55, 0.95, peak) * (1 - flat * 0.75) * land * 62;
  var h = base + det * (3 + 9 * (1 - flat)) + mountain;

  /* rivers cut through land near sea level */
  var rv = Math.abs(this.nRiver.fbm2(x / 620 + 500, z / 620 + 500, 3));
  if (rv < 0.035 && land > 0.35) {
    var t = 1 - rv / 0.035;
    h = lerp(h, SEA - 3.5, t * t * 0.92);
  }
  h = Math.floor(h);
  if (h < 3) h = 3; if (h > CY - 12) h = CY - 12;
  if (this._hc.size > 300000) this._hc.clear();
  this._hc.set(key, h);
  return h;
};

WorldGen.prototype.climateAt = function (x, z) {
  var t = this.nTemp.fbm2(x / 900 + 1000, z / 900 - 1000, 3) * .5 + .5;
  var hm = this.nHum.fbm2(x / 700 - 2000, z / 700 + 2000, 3) * .5 + .5;
  return [t, hm];
};

WorldGen.prototype.biomeAt = function (x, z, h) {
  if (h === undefined) h = this.heightAt(x, z);
  var c = this.climateAt(x, z), t = c[0], hm = c[1];
  if (h < SEA - 8) return t < .22 ? BIOME.DEEP_OCEAN : BIOME.DEEP_OCEAN;
  if (h < SEA) return BIOME.OCEAN;
  if (h <= SEA + 2) {
    if (t < .22) return BIOME.SNOWY;
    return (this.nDet.n2(x / 40, z / 40) > .25) ? BIOME.STONE_SHORE : BIOME.BEACH;
  }
  if (h > 96 + this.nDet.n2(x / 60, z / 60) * 8) return BIOME.MOUNTAINS;
  if (t < .22) return h > 74 ? BIOME.MOUNTAINS : BIOME.SNOWY;
  if (t < .38) return BIOME.TAIGA;
  if (t > .74 && hm < .34) return BIOME.DESERT;
  if (t > .62 && hm < .46) return BIOME.SAVANNA;
  if (hm > .74 && h < SEA + 6) return BIOME.SWAMP;
  if (hm > .70) return BIOME.JUNGLE;
  if (hm > .52) return (this.nHum.n2(x / 120, z / 120) > .18) ? BIOME.BIRCH : BIOME.FOREST;
  return BIOME.PLAINS;
};

/* solid-density test used for caves */
WorldGen.prototype.isCave = function (x, y, z) {
  if (y < 4 || y > 118) return false;
  var a = this.nCave.fbm3(x / 96, y / 52, z / 96, 3);
  var b = this.nCave2.fbm3(x / 96 + 300, y / 52 + 300, z / 96 - 300, 3);
  if (Math.abs(a) < 0.055 && Math.abs(b) < 0.055) return true;          // spaghetti tunnels
  if (y < 40) {                                                        // cheese caverns
    var c = this.nCave.fbm3(x / 58, y / 34, z / 58, 3);
    if (c > 0.44 - (40 - y) * 0.004) return true;
  }
  return false;
};

WorldGen.prototype.oreAt = function (x, y, z) {
  var vein = this.nOre.n3(x / 9, y / 9, z / 9);
  if (vein < 0.28) return 0;
  var r = hash3(x, y, z, this.seed ^ 0x5f3a);
  if (y < 16 && r < 0.030) return BID.diamond_ore;
  if (y < 20 && r < 0.055) return BID.redstone_ore;
  if (y < 30 && r < 0.075) return BID.gold_ore;
  if (y < 32 && r < 0.090) return BID.lapis_ore;
  if (y < 28 && r < 0.095) return BID.emerald_ore;
  if (y < 62 && r < 0.155) return BID.iron_ore;
  if (y < 100 && r < 0.290) return BID.coal_ore;
  return 0;
};

/* ---------------------------------------------------------------- chunk --- */
WorldGen.prototype.generate = function (cx, cz, blocks) {
  var wx0 = cx * CX, wz0 = cz * CZ, x, y, z, i;
  var heights = new Int16Array(CXZ), biomes = new Uint8Array(CXZ);

  for (z = 0; z < CZ; z++) {
    for (x = 0; x < CX; x++) {
      var wx = wx0 + x, wz = wz0 + z;
      var h = this.heightAt(wx, wz);
      var bi = this.biomeAt(wx, wz, h);
      var info = BIOME_INFO[bi];
      heights[x + z * CX] = h; biomes[x + z * CX] = bi;

      var stoneVar = this.nPatch.n3(wx / 26, 0, wz / 26);
      var stoneType = stoneVar > .34 ? BID.granite : stoneVar < -.34 ? BID.diorite :
                      (this.nPatch.n3(wx / 30 + 90, 3, wz / 30) > .38 ? BID.andesite : BID.stone);

      var top = info.top, fill = info.fill, depth = 4;
      if (bi === BIOME.DESERT) { top = BID.sand; fill = BID.sand; depth = 6; }
      if (bi === BIOME.MOUNTAINS && h > 92) { top = BID.stone; fill = BID.stone; }
      if (bi === BIOME.SNOWY || (bi === BIOME.MOUNTAINS && h > 84)) top = BID.grass_block;
      if (bi === BIOME.TAIGA && this.nPatch.n2(wx / 22, wz / 22) > .3) top = BID.podzol;

      for (y = 0; y <= h; y++) {
        var b;
        if (y < 2 + (hash3(wx, y, wz, 7) * 3 | 0)) b = BID.bedrock;
        else if (y === h && h >= SEA - 1) b = top;
        else if (y > h - depth && h >= SEA - 1) b = fill;
        else if (y > h - 3) b = (h < SEA ? BID.gravel : fill);
        else {
          b = stoneType;
          var ore = this.oreAt(wx, y, wz);
          if (ore) b = ore;
        }
        if (b !== BID.bedrock && this.isCave(wx, y, wz)) b = y < 11 ? BID.lava : 0;
        blocks[bIdx(x, y, z)] = b;
      }
      /* water / ice / snow cover */
      if (h < SEA) {
        for (y = h + 1; y <= SEA; y++) blocks[bIdx(x, y, z)] = BID.water;
        var cl = this.climateAt(wx, wz);
        if (cl[0] < .2) blocks[bIdx(x, SEA, z)] = BID.ice;
        if (h > SEA - 5 && this.nPatch.n2(wx / 16 + 7, wz / 16) > .45) {
          blocks[bIdx(x, h, z)] = BID.clay;
          blocks[bIdx(x, h - 1, z)] = BID.clay;
        }
      } else if (bi === BIOME.SWAMP && h <= SEA + 1) {
        blocks[bIdx(x, SEA, z)] = BID.water;
      }
      if ((bi === BIOME.SNOWY || (bi === BIOME.MOUNTAINS && h > 88)) && h >= SEA) {
        if (blocks[bIdx(x, h, z)] === BID.grass_block || blocks[bIdx(x, h, z)] === BID.stone)
          blocks[bIdx(x, h + 1, z)] = BID.snow_block;
      }
    }
  }
  this.decorate(cx, cz, blocks, heights, biomes);
  return { heights: heights, biomes: biomes };
};

/* ------------------------------------------------------------ structures -- */
WorldGen.prototype.decorate = function (cx, cz, blocks, heights, biomes) {
  var self = this;
  function setB(x, y, z, id, force) {
    if (x < 0 || x >= CX || z < 0 || z >= CZ || y < 0 || y >= CY) return;
    var cur = blocks[bIdx(x, y, z)];
    if (!force && cur !== 0 && !B_REPL[cur]) return;
    blocks[bIdx(x, y, z)] = id;
  }
  /* Trees may straddle chunk borders, so replay the 3x3 neighbourhood and clip. */
  for (var ox = -1; ox <= 1; ox++) {
    for (var oz = -1; oz <= 1; oz++) {
      var ncx = cx + ox, ncz = cz + oz;
      var rnd = mulberry(hash32(Math.imul(ncx, 341873128) + Math.imul(ncz, 132897987) + this.seed));
      var baseX = (ncx - cx) * CX, baseZ = (ncz - cz) * CZ;
      var wx0 = ncx * CX, wz0 = ncz * CZ;
      /* trees */
      for (var t = 0; t < 48; t++) {
        var lx = (rnd() * CX) | 0, lz = (rnd() * CZ) | 0;
        var wx = wx0 + lx, wz = wz0 + lz;
        var h = this.heightAt(wx, wz), bi = this.biomeAt(wx, wz, h), info = BIOME_INFO[bi];
        if (h < SEA || !info.tree) continue;
        if (rnd() > info.tree * 14) continue;
        this.tree(setB, baseX + lx, h + 1, baseZ + lz, info, rnd, wx, wz);
      }
      /* cacti + dead bushes */
      for (var c = 0; c < 26; c++) {
        var cxp = (rnd() * CX) | 0, czp = (rnd() * CZ) | 0;
        var wxc = wx0 + cxp, wzc = wz0 + czp;
        var hc = this.heightAt(wxc, wzc), bic = this.biomeAt(wxc, wzc, hc), inf = BIOME_INFO[bic];
        if (hc < SEA) continue;
        if (inf.cactus && rnd() < inf.cactus * 22) {
          var ch = 1 + (rnd() * 3 | 0);
          for (var k = 0; k < ch; k++) setB(baseX + cxp, hc + 1 + k, baseZ + czp, BID.cactus);
        } else if (inf.bush && rnd() < inf.bush * 12) {
          setB(baseX + cxp, hc + 1, baseZ + czp, BID.dead_bush);
        }
      }
    }
  }
  /* ground cover for this chunk only */
  var rnd2 = mulberry(hash32(Math.imul(cx, 6364136) + Math.imul(cz, 1442695) + this.seed + 77));
  for (var z = 0; z < CZ; z++) {
    for (var x = 0; x < CX; x++) {
      var h = heights[x + z * CX], bi = biomes[x + z * CX], info = BIOME_INFO[bi];
      if (h < SEA) {
        if (info.lily && blocks[bIdx(x, SEA, z)] === BID.water && rnd2() < 0.02)
          setB(x, SEA + 1, z, BID.lily_pad);
        continue;
      }
      var sy = h + 1;
      if (sy >= CY - 1) continue;
      if (blocks[bIdx(x, sy, z)] !== 0) continue;
      var under = blocks[bIdx(x, h, z)];
      if (under !== BID.grass_block && under !== BID.podzol && under !== BID.dirt) continue;
      var r = rnd2();
      if (r < info.grass) setB(x, sy, z, (info.spruce && rnd2() < .4) ? BID.fern : BID.tall_grass);
      else if (r < info.grass + info.flower) {
        var fr = rnd2();
        setB(x, sy, z, fr < .4 ? BID.red_flower : fr < .8 ? BID.yellow_flower : BID.blue_flower);
      } else if (info.mush && r < info.grass + info.flower + info.mush)
        setB(x, sy, z, rnd2() < .5 ? BID.red_mushroom : BID.brown_mushroom);
      else if (r > .997 && bi === BIOME.PLAINS) setB(x, sy, z, BID.pumpkin);
    }
  }
  /* rare ruined-cobble patches make the surface feel authored */
  var rr = mulberry(hash32(Math.imul(cx, 99991) ^ Math.imul(cz, 71993) ^ this.seed));
  if (rr() < 0.035) {
    var px = 3 + (rr() * 9 | 0), pz = 3 + (rr() * 9 | 0);
    var ph = heights[px + pz * CX];
    if (ph > SEA + 1 && ph < 90) {
      var w = 3 + (rr() * 3 | 0), d = 3 + (rr() * 3 | 0), ht = 2 + (rr() * 2 | 0);
      for (var ix = 0; ix < w; ix++) for (var iz = 0; iz < d; iz++) for (var iy = 0; iy < ht; iy++) {
        if (rr() < .32) continue;
        var edge = (ix === 0 || iz === 0 || ix === w - 1 || iz === d - 1);
        if (!edge && iy > 0) continue;
        setB(px + ix, ph + iy, pz + iz, rr() < .35 ? BID.mossy_cobblestone : BID.cobblestone, true);
      }
    }
  }
};

WorldGen.prototype.tree = function (setB, x, y, z, info, rnd, wx, wz) {
  var logId = info.birch ? BID.birch_log : BID.oak_log;
  var leafId = info.birch ? BID.birch_leaves : BID.oak_leaves;
  var i, j, k;
  if (info.spruce) {
    var th = 6 + (rnd() * 4 | 0);
    for (i = 0; i < th; i++) setB(x, y + i, z, logId, true);
    var layers = th - 2;
    for (i = 0; i < layers; i++) {
      var ly = y + th - 1 - i;
      var r = (i % 3 === 0) ? 0 : Math.min(2, Math.ceil(i / 2.4));
      if (i === 0) r = 0;
      for (j = -r; j <= r; j++) for (k = -r; k <= r; k++) {
        if (Math.abs(j) + Math.abs(k) > r + (r > 1 ? 1 : 0)) continue;
        setB(x + j, ly, z + k, leafId);
      }
    }
    setB(x, y + th, z, leafId);
    return;
  }
  var tall = info.tall ? 8 + (rnd() * 5 | 0) : 4 + (rnd() * 3 | 0);
  for (i = 0; i < tall; i++) setB(x, y + i, z, logId, true);
  var topY = y + tall;
  for (i = -2; i <= 2; i++) for (j = -2; j <= 2; j++) {
    var d2 = i * i + j * j;
    if (d2 > 5) continue;
    setB(x + i, topY - 2, z + j, leafId);
    setB(x + i, topY - 1, z + j, leafId);
  }
  for (i = -1; i <= 1; i++) for (j = -1; j <= 1; j++) {
    if (i && j && rnd() < .5) continue;
    setB(x + i, topY, z + j, leafId);
  }
  setB(x, topY + 1, z, leafId);
  if (info.tall) {                                   /* jungle vines-ish canopy */
    for (i = -3; i <= 3; i++) for (j = -3; j <= 3; j++) {
      if (i * i + j * j > 9 || rnd() < .5) continue;
      setB(x + i, topY - 3, z + j, leafId);
    }
  }
};
