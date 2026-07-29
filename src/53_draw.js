/* ========================================================== entity render == */
function setSprUniforms(prog, eyeX, eyeY, eyeZ, fog, near, far, uw) {
  gl.useProgram(prog);
  gl.uniformMatrix4fv(prog.u.uVP, false, matVP);
  gl.uniform3f(prog.u.uCam, eyeX, eyeY, eyeZ);
  gl.uniform3fv(prog.u.uFog, fog);
  if (prog.u.uFogNear) gl.uniform1f(prog.u.uFogNear, near);
  if (prog.u.uFogFar) gl.uniform1f(prog.u.uFogFar, far);
  if (prog.u.uUnderwater) gl.uniform1i(prog.u.uUnderwater, uw);
}

function drawEntities(dt, eyeX, eyeY, eyeZ, fog, fogNear, fogFar, uw) {
  var E = GAME.ents, day = GAME.dayLight, i;
  var sb = BATCH.solid; sb.reset();

  /* ---------------- mobs ---------------- */
  for (i = 0; i < E.mobs.length; i++) {
    var m = E.mobs[i], d = m.def;
    var dx = m.x - eyeX, dz = m.z - eyeZ;
    if (dx * dx + dz * dz > 6400) continue;
    if (!frustum.boxIn(m.x - 1.2, m.y - .2, m.z - 1.2, m.x + 1.2, m.y + d.h + .4, m.z + 1.2)) continue;
    var lt = GAME.lightAt(Math.floor(m.x), Math.floor(m.y + d.h * .5), Math.floor(m.z), day);
    lt = 0.14 + 0.86 * Math.pow(clamp(lt, 0, 1), 1.3);
    var hurt = m.hurtT > 0 ? 1 : 0;
    var fuse = d.explodes ? clamp(m.fuse / 1.5, 0, 1) : 0;
    var swing = Math.sin(m.walk) * 0.55;
    var yaw = m.yaw;
    for (var q = 0; q < d.parts.length; q++) {
      var pt = d.parts[q];
      var ox = pt.x, oy = pt.y, oz = pt.z, extra = 0;
      /* animation channels */
      if (pt.a === 1) { oz += Math.sin(m.walk) * 0.22; oy -= Math.abs(Math.sin(m.walk)) * 0.04; }
      else if (pt.a === 2) { oz -= Math.sin(m.walk) * 0.22; oy -= Math.abs(Math.sin(m.walk)) * 0.04; }
      else if (pt.a === 3) { oy += Math.sin(m.age * 1.7) * 0.018; }
      else if (pt.a === 4) { extra = Math.sin(m.walk * 2) * 0.3; }
      else if (pt.a === 5) { extra = -Math.sin(m.walk * 2) * 0.3; }
      else if (pt.a === 6) { oz += Math.sin(m.walk + Math.PI) * 0.12; oy += 0.0; }
      var c = pt.c;
      var r = c[0], g = c[1], b = c[2];
      if (hurt) { r = r * .45 + .55; g *= .45; b *= .45; }
      if (fuse > 0) { var f2 = Math.sin(m.fuse * 34) * .5 + .5;
        r = lerp(r, 1, fuse * f2); g = lerp(g, 1, fuse * f2 * .8); b = lerp(b, 1, fuse * f2 * .8); }
      var scale = 1 + fuse * 0.14;
      var cos = Math.cos(yaw), sin = Math.sin(yaw);
      var wx = m.x + (ox * cos + oz * sin) * scale;
      var wz = m.z + (-ox * sin + oz * cos) * scale;
      var wy = m.y + oy * scale;
      sb.box(wx, wy, wz, pt.sx * scale, pt.sy * scale, pt.sz * scale,
             yaw + (extra || 0), r, g, b, 1, lt);
    }
  }
  /* selection outline */
  var t = GAME.started && !UI.open ? GAME.pickTarget() : { hit: null };
  GAME.currentHit = t.hit;
  if (t.hit) {
    var h = t.hit, e = 0.0025, tk = 0.006;
    var bx = h.x - e, by = h.y - e, bz = h.z - e, bs = 1 + e * 2;
    var edges = [
      [0, 0, 0, 1, 0, 0], [0, 0, 1, 1, 0, 1], [0, 1, 0, 1, 1, 0], [0, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 1, 0], [1, 0, 0, 1, 1, 0], [0, 0, 1, 0, 1, 1], [1, 0, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 1], [1, 0, 0, 1, 0, 1], [0, 1, 0, 0, 1, 1], [1, 1, 0, 1, 1, 1]
    ];
    for (var k = 0; k < edges.length; k++) {
      var ed = edges[k];
      var cx = bx + (ed[0] + ed[3]) * .5 * bs, cy = by + (ed[1] + ed[4]) * .5 * bs, cz = bz + (ed[2] + ed[5]) * .5 * bs;
      var sx2 = ed[0] === ed[3] ? tk : bs * .5 + tk;
      var sy2 = ed[1] === ed[4] ? tk : bs * .5 + tk;
      var sz2 = ed[2] === ed[5] ? tk : bs * .5 + tk;
      sb.box(cx, cy, cz, sx2, sy2, sz2, 0, 0.03, 0.03, 0.04, 0.75, 1);
    }
  }
  if (sb.n) {
    setSprUniforms(PROG.solid, eyeX, eyeY, eyeZ, fog, fogNear, fogFar, uw);
    sb.upload();
    gl.bindVertexArray(sb.vao);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawElements(gl.TRIANGLES, (sb.n / 4) * 6, gl.UNSIGNED_INT, 0);
    gl.disable(gl.BLEND);
  }

  /* ---------------- textured: items, orbs, particles, break overlay ------- */
  var pb = BATCH.spr; pb.reset();
  var camR = [Math.cos(GAME.player.yaw), 0, -Math.sin(GAME.player.yaw)];
  var camU = [0, 1, 0];

  for (i = 0; i < E.items.length; i++) {
    var it = E.items[i];
    var ddx = it.x - eyeX, ddz = it.z - eyeZ;
    if (ddx * ddx + ddz * ddz > 4096) continue;
    var bobY = Math.sin(it.age * 2.2) * 0.06 + 0.16;
    var rot = it.age * 1.4;
    var li = GAME.lightAt(Math.floor(it.x), Math.floor(it.y + .2), Math.floor(it.z), day);
    li = 0.18 + 0.82 * li;
    if (isItem(it.id)) {
      pushBillboardRot(pb, it.x, it.y + bobY, it.z, 0.22, ITEMS[it.id].tex, li, rot);
    } else if (isFlatBlock(it.id)) {
      pushBillboardRot(pb, it.x, it.y + bobY, it.z, 0.2, BLOCKS[it.id].faces[0], li, rot);
    } else {
      pushCube(pb, it.x, it.y + bobY, it.z, 0.14, BLOCKS[it.id], li, rot);
    }
  }
  for (i = 0; i < E.orbs.length; i++) {
    var ob = E.orbs[i];
    var ow = 0.11 + Math.sin(ob.age * 6) * 0.02;
    pushBillboard(pb, ob.x, ob.y + 0.12, ob.z, ow, TEX_WHITE, camR, camU, 1, [0.55, 1.0, 0.35]);
  }
  for (i = 0; i < E.particles.length; i++) {
    var pp = E.particles[i];
    var pl = GAME.lightAt(Math.floor(pp.x), Math.floor(pp.y), Math.floor(pp.z), day);
    pl = 0.2 + 0.8 * pl;
    var fade = Math.min(1, pp.life / 0.25);
    pushBillboard(pb, pp.x, pp.y, pp.z, pp.size, pp.layer, camR, camU, pl * fade,
      pp.col, pp.u0, pp.v0, pp.layer === TEX_WHITE ? 1 : 0.25);
  }
  /* break overlay */
  if (GAME.breakTarget && GAME.breakTotal > 0) {
    var stage = Math.min(9, Math.floor(GAME.breakProgress / GAME.breakTotal * 10));
    var bt = GAME.breakTarget;
    pushBlockOverlay(pb, bt.x, bt.y, bt.z, DESTROY_BASE + stage);
  }
  if (pb.n) {
    setSprUniforms(PROG.spr, eyeX, eyeY, eyeZ, fog, fogNear, fogFar, uw);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texArray);
    gl.uniform1i(PROG.spr.u.uTex, 0);
    pb.upload();
    gl.bindVertexArray(pb.vao);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);
    gl.drawElements(gl.TRIANGLES, (pb.n / 4) * 6, gl.UNSIGNED_INT, 0);
    gl.enable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
  }
}

/* blocks that are drawn as flat sprites rather than cubes (plants, torches) */
function isFlatBlock(id) {
  if (id >= ITEM_BASE) return false;
  var r = B_RENDER[id];
  return r === 2 || r === 4;
}
function pushBillboard(b, x, y, z, s, layer, R, U, light, col, u0, v0, uvSize) {
  var c = col || [1, 1, 1];
  var uu = u0 === undefined ? 0 : u0, vv = v0 === undefined ? 0 : v0;
  var us = uvSize === undefined ? 1 : uvSize;
  b.quad(
    [x - R[0] * s - U[0] * s, y - R[1] * s - U[1] * s, z - R[2] * s - U[2] * s],
    [x + R[0] * s - U[0] * s, y + R[1] * s - U[1] * s, z + R[2] * s - U[2] * s],
    [x + R[0] * s + U[0] * s, y + R[1] * s + U[1] * s, z + R[2] * s + U[2] * s],
    [x - R[0] * s + U[0] * s, y - R[1] * s + U[1] * s, z - R[2] * s + U[2] * s],
    layer, uu, vv, uu + us, vv + us,
    c[0] * light, c[1] * light, c[2] * light, 1);
}
function pushBillboardRot(b, x, y, z, s, layer, light, rot) {
  var R = [Math.cos(rot), 0, -Math.sin(rot)], U = [0, 1, 0];
  pushBillboard(b, x, y, z, s, layer, R, U, light, [1, 1, 1]);
  var R2 = [Math.cos(rot + Math.PI), 0, -Math.sin(rot + Math.PI)];
  pushBillboard(b, x, y, z, s, layer, R2, U, light * 0.85, [1, 1, 1]);
}
function pushCube(b, cx, cy, cz, s, block, light, yaw) {
  var co = Math.cos(yaw), si = Math.sin(yaw);
  var tint = block.tint ? TINT_RGB[block.tint] : [1, 1, 1];
  for (var f = 0; f < 6; f++) {
    var fc = CUBE_FACES[f], sh = FACE_SHADE[f] * light;
    var tf = block.tintFaces;
    var tc = (!tf || tf[f]) && block.tint ? tint : [1, 1, 1];
    var pts = [];
    for (var k = 0; k < 4; k++) {
      var v = fc.v[k];
      var lx = (v[0] * 2 - 1) * s, ly = (v[1] * 2 - 1) * s, lz = (v[2] * 2 - 1) * s;
      pts.push([cx + lx * co + lz * si, cy + ly, cz - lx * si + lz * co]);
    }
    b.quad(pts[0], pts[1], pts[2], pts[3], block.faces[f], 0, 0, 1, 1,
      tc[0] * sh, tc[1] * sh, tc[2] * sh, 1);
  }
}
function pushBlockOverlay(b, x, y, z, layer) {
  var e = 0.004;
  for (var f = 0; f < 6; f++) {
    var fc = CUBE_FACES[f];
    var pts = [];
    for (var k = 0; k < 4; k++) {
      var v = fc.v[k];
      pts.push([x + v[0] + (v[0] ? e : -e), y + v[1] + (v[1] ? e : -e), z + v[2] + (v[2] ? e : -e)]);
    }
    b.quad(pts[0], pts[1], pts[2], pts[3], layer, 0, 0, 1, 1, 1, 1, 1, 1);
  }
}

/* ------------------------------------------------------------- held item -- */
function drawHeld(eyeX, eyeY, eyeZ, fog, uw, aspect) {
  var p = GAME.player;
  if (GAME.thirdPerson) return;
  var s = p.held();
  var hb = BATCH.hand; hb.reset();
  var swing = p.swinging ? Math.sin(p.swing * Math.PI) : 0;
  var eat = p.eatTime > 0 ? Math.sin(p.eatTime * 22) * 0.06 : 0;

  /* camera basis */
  var cp = Math.cos(p.pitch), sp2 = Math.sin(p.pitch);
  var F = [-Math.sin(p.yaw) * cp, sp2, -Math.cos(p.yaw) * cp];
  var R = [Math.cos(p.yaw), 0, -Math.sin(p.yaw)];
  var U = [F[1] * R[2] - F[2] * R[1], F[2] * R[0] - F[0] * R[2], F[0] * R[1] - F[1] * R[0]];
  U = [-U[0], -U[1], -U[2]];

  var lift = -0.30 - swing * 0.28 + eat;
  var side = 0.34 + swing * 0.06;
  var fwd = 0.52 - swing * 0.10;
  var bx = eyeX + R[0] * side + U[0] * lift + F[0] * fwd;
  var by = eyeY + R[1] * side + U[1] * lift + F[1] * fwd;
  var bz = eyeZ + R[2] * side + U[2] * lift + F[2] * fwd;
  var light = 0.30 + 0.70 * GAME.lightAt(Math.floor(eyeX), Math.floor(eyeY), Math.floor(eyeZ), GAME.dayLight);

  if (s) {
    if (isItem(s.id)) {
      /* Rotate inside the camera's right/up plane so the basis stays
         orthonormal — mixing in the forward axis skews the quad. */
      var ang = 0.42 - swing * 0.55;
      var ca = Math.cos(ang), sa = Math.sin(ang);
      var RR = [R[0] * ca + U[0] * sa, R[1] * ca + U[1] * sa, R[2] * ca + U[2] * sa];
      var UU = [U[0] * ca - R[0] * sa, U[1] * ca - R[1] * sa, U[2] * ca - R[2] * sa];
      /* culling is off for this pass, so a single quad shows from both sides */
      pushBillboard(hb, bx, by, bz, 0.16, ITEMS[s.id].tex, RR, UU, light, [1, 1, 1]);
    } else if (isFlatBlock(s.id)) {
      /* torches and plants are flat sprites, not cubes */
      var fa = 0.3 - swing * 0.5, fc = Math.cos(fa), fs = Math.sin(fa);
      var FR = [R[0] * fc + U[0] * fs, R[1] * fc + U[1] * fs, R[2] * fc + U[2] * fs];
      var FU = [U[0] * fc - R[0] * fs, U[1] * fc - R[1] * fs, U[2] * fc - R[2] * fs];
      pushBillboard(hb, bx, by, bz, 0.16, BLOCKS[s.id].faces[0], FR, FU,
        BLOCKS[s.id].light ? 1 : light, BLOCKS[s.id].tint ? TINT_RGB[BLOCKS[s.id].tint] : [1, 1, 1]);
    } else {
      pushCube(hb, bx, by, bz, 0.115, BLOCKS[s.id], light, p.yaw + 0.5 - swing * 0.7);
    }
  } else {
    /* bare arm: a forearm angled in from the lower-right corner */
    var hbb = BATCH.solid; hbb.reset();
    setSprUniforms(PROG.solid, eyeX, eyeY, eyeZ, fog, 999, 1000, uw);
    var tilt = 0.55 + swing * 0.5;
    var AF = [F[0] + U[0] * tilt, F[1] + U[1] * tilt, F[2] + U[2] * tilt];
    var al = Math.hypot(AF[0], AF[1], AF[2]) || 1;
    AF = [AF[0] / al, AF[1] / al, AF[2] / al];
    var AU = [AF[1] * R[2] - AF[2] * R[1], AF[2] * R[0] - AF[0] * R[2], AF[0] * R[1] - AF[1] * R[0]];
    var ax = eyeX + R[0] * 0.40 + U[0] * (0.02 - swing * 0.18) + F[0] * 0.30;
    var ay = eyeY + R[1] * 0.40 + U[1] * (0.02 - swing * 0.18) + F[1] * 0.30;
    var az = eyeZ + R[2] * 0.40 + U[2] * (0.02 - swing * 0.18) + F[2] * 0.30;
    hbb.boxBasis(ax, ay, az, R, AU, AF, 0.052, 0.052, 0.20,
      0.90 * light, 0.70 * light, 0.55 * light, 1, 1);
    hbb.upload();
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.bindVertexArray(hbb.vao);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
    gl.drawElements(gl.TRIANGLES, (hbb.n / 4) * 6, gl.UNSIGNED_INT, 0);
    return;
  }
  if (!hb.n) return;
  gl.clear(gl.DEPTH_BUFFER_BIT);
  setSprUniforms(PROG.spr, eyeX, eyeY, eyeZ, fog, 999, 1000, uw);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texArray);
  gl.uniform1i(PROG.spr.u.uTex, 0);
  hb.upload();
  gl.bindVertexArray(hb.vao);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.CULL_FACE);
  gl.drawElements(gl.TRIANGLES, (hb.n / 4) * 6, gl.UNSIGNED_INT, 0);
  gl.enable(gl.CULL_FACE);
  gl.disable(gl.BLEND);
}
