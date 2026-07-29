/* ================================================================== icons == */
var _iconCache = {};
function texPixel(layer, x, y) {
  var i = (layer * TS * TS + y * TS + x) * 4;
  return [_texData[i], _texData[i + 1], _texData[i + 2], _texData[i + 3]];
}
function shadeRGB(c, f, tint) {
  var r = c[0], g = c[1], b = c[2];
  if (tint) { r *= tint[0]; g *= tint[1]; b *= tint[2]; }
  return 'rgb(' + Math.min(255, r * f | 0) + ',' + Math.min(255, g * f | 0) + ',' + Math.min(255, b * f | 0) + ')';
}
/* flat sprite (items) */
function drawFlat(ctx, layer, size) {
  var s = size / TS;
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
    var p = texPixel(layer, x, y);
    if (!p[3]) continue;
    ctx.globalAlpha = p[3] / 255;
    ctx.fillStyle = 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')';
    ctx.fillRect(Math.round(x * s), Math.round(y * s), Math.ceil(s), Math.ceil(s));
  }
  ctx.globalAlpha = 1;
}
/* isometric cube (blocks) */
function drawCube(ctx, block, s, ox, oy) {
  var topL = block.faces[2], rightL = block.faces[0], leftL = block.faces[5];
  var tf = block.tintFaces;
  var tint = block.tint ? TINT_RGB[block.tint] : null;
  var tTop = (!tf || tf[2]) ? tint : null;
  var tR = (!tf || tf[0]) ? tint : null;
  var tL = (!tf || tf[5]) ? tint : null;
  var cx = ox + 16 * s, topY = oy;
  var d = Math.ceil(s) + 1, u, w, p;
  /* top */
  for (u = 0; u < TS; u++) for (w = 0; w < TS; w++) {
    p = texPixel(topL, u, w);
    if (!p[3]) continue;
    ctx.fillStyle = shadeRGB(p, 1.0, tTop);
    ctx.fillRect(Math.round(cx + (u - w) * s), Math.round(topY + (u + w) * s * .5), d, d);
  }
  /* right (+X) */
  for (u = 0; u < TS; u++) for (w = 0; w < TS; w++) {
    p = texPixel(rightL, u, w);
    if (!p[3]) continue;
    ctx.fillStyle = shadeRGB(p, 0.72, tR);
    ctx.fillRect(Math.round(cx + u * s + s), Math.round(topY + 16 * s - u * s * .5 + w * s), d, d);
  }
  /* left (-Z) */
  for (u = 0; u < TS; u++) for (w = 0; w < TS; w++) {
    p = texPixel(leftL, TS - 1 - u, w);
    if (!p[3]) continue;
    ctx.fillStyle = shadeRGB(p, 0.55, tL);
    ctx.fillRect(Math.round(cx - u * s - s), Math.round(topY + 16 * s - u * s * .5 + w * s), d, d);
  }
}
function itemIcon(id, px) {
  px = px || 64;
  var key = id + '@' + px;
  if (_iconCache[key]) return _iconCache[key];
  var cv = document.createElement('canvas');
  cv.width = px; cv.height = px;
  var ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  if (isItem(id)) {
    drawFlat(ctx, ITEMS[id].tex, px);
  } else {
    var b = BLOCKS[id];
    if (!b) { _iconCache[key] = cv; return cv; }
    if (b.render === 'cross' || b.render === 'torch') {
      drawFlat(ctx, b.faces[0], px);
      if (b.tint) {
        ctx.globalCompositeOperation = 'multiply';
        var t = TINT_RGB[b.tint];
        ctx.fillStyle = 'rgb(' + (t[0] * 255 | 0) + ',' + (t[1] * 255 | 0) + ',' + (t[2] * 255 | 0) + ')';
        ctx.fillRect(0, 0, px, px);
        ctx.globalCompositeOperation = 'destination-in';
        drawFlat(ctx, b.faces[0], px);
        ctx.globalCompositeOperation = 'source-over';
      }
    } else {
      var s = px / 36;
      drawCube(ctx, b, s, px * 0.5 - 16 * s, px * 0.10);
    }
  }
  _iconCache[key] = cv;
  return cv;
}
function iconEl(id, px) {
  var src = itemIcon(id, px || 64);
  var cv = document.createElement('canvas');
  cv.width = src.width; cv.height = src.height;
  cv.getContext('2d').drawImage(src, 0, 0);
  return cv;
}

/* ---------------------------------------------------------- HUD sprites -- */
function makeHudIcon(kind, filled) {
  var cv = document.createElement('canvas'); cv.width = 18; cv.height = 18;
  var c = cv.getContext('2d');
  function px(x, y, col) { c.fillStyle = col; c.fillRect(x * 2, y * 2, 2, 2); }
  var body, dark, hi;
  if (kind === 'heart') { body = '#d81f1f'; dark = '#7a0d0d'; hi = '#ff6d6d'; }
  else if (kind === 'food') { body = '#a4682c'; dark = '#5d3a14'; hi = '#d19a5e'; }
  else if (kind === 'armor') { body = '#c8c8d0'; dark = '#6e6e78'; hi = '#f0f0f8'; }
  else { body = '#4aa8e0'; dark = '#1d5a80'; hi = '#a8e0ff'; }
  var shape;
  if (kind === 'heart') {
    shape = ['..XX.XX..', '.XXXXXXX.', '.XXXXXXX.', '.XXXXXXX.', '..XXXXX..', '...XXX...', '....X....'];
  } else if (kind === 'food') {
    shape = ['...XXX...', '..XXXXX..', '.XXXXXXX.', '.XXXXXXX.', '..XXXXX..', '..XX.XX..', '..X...X..'];
  } else if (kind === 'armor') {
    shape = ['..XXXXX..', '.XXXXXXX.', '.XXXXXXX.', '.XXXXXXX.', '..XXXXX..', '..XX.XX..', '..X...X..'];
  } else {
    shape = ['...XXX...', '..XXXXX..', '.XXXXXXX.', '.XXXXXXX.', '..XXXXX..', '...XXX...', '.........'];
  }
  for (var y = 0; y < shape.length; y++) {
    for (var x = 0; x < shape[y].length; x++) {
      if (shape[y][x] !== 'X') continue;
      var col = filled ? body : '#2b2b2b';
      if (filled && (y === 0 || x === 1 || (x === 2 && y < 2))) col = hi;
      if (filled && (y >= shape.length - 2)) col = dark;
      px(x, y + 1, col);
    }
  }
  /* outline */
  c.globalCompositeOperation = 'destination-over';
  for (var y2 = 0; y2 < shape.length; y2++) for (var x2 = 0; x2 < shape[y2].length; x2++) {
    if (shape[y2][x2] !== 'X') continue;
    c.fillStyle = '#000';
    c.fillRect(x2 * 2 - 2, (y2 + 1) * 2 - 2, 6, 6);
  }
  c.globalCompositeOperation = 'source-over';
  return cv.toDataURL();
}
var HUD_ICONS = {};
function buildHudIcons() {
  ['heart', 'food', 'armor', 'air'].forEach(function (k) {
    HUD_ICONS[k] = makeHudIcon(k, true);
    HUD_ICONS[k + '_empty'] = makeHudIcon(k, false);
  });
}
