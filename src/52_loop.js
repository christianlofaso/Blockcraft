/* ============================================================= main loop == */
var PROG = {}, BATCH = {}, quadVAO = null, cloudTex = null, cloudVAO = null;
var matP = M4.create(), matV = M4.create(), matVP = M4.create(), matInv = M4.create();
var frustum = new Frustum();

function initRender() {
  PROG.chunk = program(CHUNK_VS, CHUNK_FS);
  PROG.sky = program(SKY_VS, SKY_FS);
  PROG.spr = program(SPR_VS, SPR_FS);
  PROG.solid = program(SOLID_VS, SOLID_FS);
  PROG.cloud = program(CLOUD_VS, CLOUD_FS);
  buildIndexBuffer();
  BATCH.spr = new SpriteBatch();
  BATCH.solid = new SolidBatch();
  BATCH.hand = new SpriteBatch();
  /* fullscreen triangle for the sky */
  quadVAO = gl.createVertexArray();
  var vb = gl.createBuffer();
  gl.bindVertexArray(quadVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  /* cloud plane */
  cloudVAO = gl.createVertexArray();
  var cb = gl.createBuffer();
  var R = 460;
  gl.bindVertexArray(cloudVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, cb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-R, -R, R, -R, R, R, -R, -R, R, R, -R, R]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  cloudTex = makeCloudTexture();
}

function resize() {
  var dpr = Math.min(window.devicePixelRatio || 1, GAME.maxDPR || 1.5);
  var w = Math.floor(innerWidth * dpr), h = Math.floor(innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
  }
}

/* --------------------------------------------------------------- sky mix - */
var SKY_DAY_TOP = [0.30, 0.52, 0.95], SKY_DAY_HOR = [0.66, 0.80, 0.98];
var SKY_NIGHT_TOP = [0.015, 0.02, 0.06], SKY_NIGHT_HOR = [0.05, 0.06, 0.13];
var SKY_DUSK_HOR = [0.95, 0.48, 0.24], SKY_DUSK_TOP = [0.22, 0.24, 0.52];
function mix3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

function updateSky() {
  var frac = (GAME.time % TICKS_PER_DAY) / TICKS_PER_DAY;
  var ang = frac * Math.PI * 2;
  var sx = Math.cos(ang), syy = Math.sin(ang);
  var len = Math.hypot(sx, syy, 0.22);
  GAME.sunDir = [sx / len, syy / len, 0.22 / len];
  var d = smooth01(-0.10, 0.24, GAME.sunDir[1]);
  GAME.dayLight = 0.19 + 0.81 * d;
  var dusk = Math.max(0, 1 - Math.abs(GAME.sunDir[1]) * 5.5) * smooth01(-0.25, 0.05, GAME.sunDir[1]);
  var top = mix3(SKY_NIGHT_TOP, SKY_DAY_TOP, d);
  var hor = mix3(SKY_NIGHT_HOR, SKY_DAY_HOR, d);
  top = mix3(top, SKY_DUSK_TOP, dusk * 0.75);
  hor = mix3(hor, SKY_DUSK_HOR, dusk);
  GAME.skyTop = top; GAME.skyHor = hor;
  GAME.fogColor = [hor[0] * 0.92, hor[1] * 0.92, hor[2] * 0.95];
}

/* ------------------------------------------------------------- the frame - */
var lastTime = 0;
function frame(now) {
  requestAnimationFrame(frame);
  var dt = Math.min(0.1, (now - lastTime) / 1000) || 0;
  lastTime = now;
  GAME.frames++;
  GAME.fpsT += dt;
  if (GAME.fpsT >= 0.5) { GAME.fps = Math.round(GAME.frames / GAME.fpsT); GAME.frames = 0; GAME.fpsT = 0; }
  if (!GAME.started) return;

  if (GAME.chunks.link.tick) GAME.chunks.link.tick(GAME.paused ? 10 : 5);

  if (!GAME.paused && !GAME.dead) {
    update(dt);
  } else if (GAME.chunks) {
    GAME.chunks.update(GAME.player.x, GAME.player.z, GAME.renderDist);
  }
  render(dt);
  updateHud(dt);
}

function update(dt) {
  var p = GAME.player;
  GAME.tryPlaceSpawn();
  readInput();
  GAME.time += dt * (TICKS_PER_DAY / DAY_SECONDS);
  updateSky();

  if (GAME.spawnReady) {
    p.update(GAME.chunks, dt, INPUT);
    if (GAME._atkCd > 0) GAME._atkCd -= dt;
    if (GAME._useCd > 0) {
      GAME._useCd -= dt;
    } else if (INPUT.mouseR && !UI.open && !GAME.chatOpen) {
      var h = p.held();
      if (h && isItem(h.id) && ITEMS[h.id].food) GAME.useItem();
      else { GAME.useItem(); GAME._useCd = 0.22; }
    }
    GAME.updateMining(dt);
    GAME.ents.update(dt, p, GAME.dayLight);
    tickFurnaces(dt);
    if (UI.open === 'furnace') refreshInv();
    /* crop growth */
    GAME.cropAcc = (GAME.cropAcc || 0) + dt;
    if (GAME.cropAcc > 2.5) { GAME.cropAcc = 0; growCrops(); }
  }
  GAME.chunks.update(p.x, p.z, GAME.renderDist);

  if (p.health <= 0 && !GAME.dead) onDeath();
  if (GAME.hurtFlash > 0) GAME.hurtFlash -= dt * 2.2;
  if (GAME.flashSlot > 0) GAME.flashSlot -= dt * 3;
}

function growCrops() {
  var p = GAME.player, c = GAME.chunks;
  for (var i = 0; i < 24; i++) {
    var x = Math.floor(p.x) + (Math.random() * 32 | 0) - 16;
    var z = Math.floor(p.z) + (Math.random() * 32 | 0) - 16;
    var y = c.heightAt(x, z);
    if (y < 1) continue;
    for (var dy = 0; dy <= 2; dy++) {
      var id = c.getBlock(x, y + dy, z);
      if (id >= 72 && id <= 74) {
        var below = c.getBlock(x, y + dy - 1, z);
        if (below === BID.wet_farmland || (below === BID.farmland && Math.random() < .4))
          if (Math.random() < .35) GAME.setBlock(x, y + dy, z, id + 1);
        break;
      }
      if (id === BID.oak_sapling || id === BID.birch_sapling) {
        if (Math.random() < 0.12) {
          var birch = id === BID.birch_sapling;
          GAME.setBlock(x, y + dy, z, 0);
          growTree(x, y + dy, z, birch);
        }
        break;
      }
    }
  }
}
function growTree(x, y, z, birch) {
  var edits = [];
  var logId = birch ? BID.birch_log : BID.oak_log, leafId = birch ? BID.birch_leaves : BID.oak_leaves;
  var h = 4 + (Math.random() * 3 | 0);
  for (var i = 0; i < h; i++) edits.push(x, y + i, z, logId);
  for (var a = -2; a <= 2; a++) for (var b = -2; b <= 2; b++) {
    if (a * a + b * b > 5) continue;
    edits.push(x + a, y + h - 2, z + b, leafId);
    edits.push(x + a, y + h - 1, z + b, leafId);
  }
  for (var c2 = -1; c2 <= 1; c2++) for (var d2 = -1; d2 <= 1; d2++) {
    if (c2 && d2 && Math.random() < .5) continue;
    edits.push(x + c2, y + h, z + d2, leafId);
  }
  edits.push(x, y + h + 1, z, leafId);
  var out = [];
  for (var k = 0; k < edits.length; k += 4) {
    var cur = GAME.chunks.getBlock(edits[k], edits[k + 1], edits[k + 2]);
    if (cur === 0 || B_REPL[cur] || edits[k + 3] === logId) out.push(edits[k], edits[k + 1], edits[k + 2], edits[k + 3]);
  }
  GAME.chunks.setMany(out);
  sfx('step_grass', .5, .7);
}

/* ================================================================= render == */
function render(dt) {
  var p = GAME.player;
  resize();
  gl.viewport(0, 0, canvas.width, canvas.height);
  var aspect = canvas.width / canvas.height;
  var fov = (GAME.fovBase || 70) * Math.PI / 180;
  if (p.sprint) fov *= 1.09;
  if (p.inWater) fov *= 0.96;
  var far = Math.max(80, GAME.renderDist * 16 + 40);
  M4.perspective(matP, fov, aspect, 0.06, far * 1.6);

  /* view */
  var eyeX = p.x, eyeY = p.eyeY(), eyeZ = p.z;
  var bobAmt = (p.onGround && !p.fly) ? Math.min(1, Math.hypot(p.vx, p.vz) / 4.4) : 0;
  var bobX = Math.cos(p.bob * 1.2) * 0.045 * bobAmt;
  var bobY = Math.abs(Math.sin(p.bob * 1.2)) * 0.05 * bobAmt;
  var roll = Math.sin(p.bob * 1.2) * 0.012 * bobAmt;
  M4.identity(matV);
  M4.rotZ(matV, matV, roll);
  M4.rotX(matV, matV, -p.pitch);
  M4.rotY(matV, matV, -p.yaw);
  M4.translate(matV, matV, [-(eyeX + bobX), -(eyeY + bobY), -eyeZ]);
  if (GAME.thirdPerson) {
    var back = M4.create();
    M4.translate(back, back, [0, 0, -4]);
    var tmp = M4.create();
    M4.identity(tmp);
    M4.translate(tmp, tmp, [0, 0, -4.5]);
    M4.mul(matV, tmp, matV);
  }
  M4.mul(matVP, matP, matV);
  M4.invert(matInv, matVP);
  frustum.set(matVP);

  var uw = (p.headIn === BID.water) ? 1 : 0;
  var fog = GAME.fogColor;
  var fogNear = far * 0.55, fogFar = far * 0.98;
  if (uw) { fog = [0.10, 0.24, 0.48]; fogNear = 0.5; fogFar = 22; }
  else if (p.headIn === BID.lava) { fog = [0.55, 0.16, 0.03]; fogNear = 0.1; fogFar = 2.2; }

  gl.clearColor(fog[0], fog[1], fog[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /* ---- sky ---- */
  if (!uw && p.headIn !== BID.lava) {
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(PROG.sky);
    gl.uniformMatrix4fv(PROG.sky.u.uInvVP, false, matInv);
    gl.uniform3f(PROG.sky.u.uCam, eyeX, eyeY, eyeZ);
    gl.uniform3fv(PROG.sky.u.uSunDir, GAME.sunDir);
    gl.uniform3fv(PROG.sky.u.uZenith, GAME.skyTop);
    gl.uniform3fv(PROG.sky.u.uHorizon, GAME.skyHor);
    gl.uniform3fv(PROG.sky.u.uFog, fog);
    gl.uniform1f(PROG.sky.u.uDay, GAME.dayLight);
    gl.uniform1f(PROG.sky.u.uTime, GAME.time * 0.001);
    gl.bindVertexArray(quadVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
  }

  /* ---- clouds ---- */
  if (!uw && GAME.clouds !== false) {
    gl.useProgram(PROG.cloud);
    gl.uniformMatrix4fv(PROG.cloud.u.uVP, false, matVP);
    gl.uniform3f(PROG.cloud.u.uCam, eyeX, eyeY, eyeZ);
    gl.uniform1f(PROG.cloud.u.uY, 126);
    gl.uniform1f(PROG.cloud.u.uScroll, GAME.time * 0.09);
    gl.uniform3fv(PROG.cloud.u.uFog, fog);
    gl.uniform1f(PROG.cloud.u.uDay, GAME.dayLight);
    gl.uniform1f(PROG.cloud.u.uFar, far);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cloudTex);
    gl.uniform1i(PROG.cloud.u.uTex, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.bindVertexArray(cloudVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  /* ---- chunks ---- */
  var P = PROG.chunk;
  gl.useProgram(P);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texArray);
  gl.uniform1i(P.u.uTex, 0);
  gl.uniformMatrix4fv(P.u.uVP, false, matVP);
  gl.uniform3f(P.u.uCam, eyeX, eyeY, eyeZ);
  gl.uniform1f(P.u.uDay, GAME.dayLight);
  gl.uniform1f(P.u.uTime, (performance.now() % 100000) / 1000);
  gl.uniform3fv(P.u.uFog, fog);
  gl.uniform1f(P.u.uFogNear, fogNear);
  gl.uniform1f(P.u.uFogFar, fogFar);
  gl.uniform1i(P.u.uUnderwater, uw);
  gl.uniform1f(P.u.uAlphaTest, 0.5);
  var tintFlat = new Float32Array(24);
  for (var t = 0; t < 8; t++) { tintFlat[t * 3] = TINT_RGB[t][0]; tintFlat[t * 3 + 1] = TINT_RGB[t][1]; tintFlat[t * 3 + 2] = TINT_RGB[t][2]; }
  gl.uniform3fv(P.u.uTint, tintFlat);

  var visible = [], drawn = 0, tris = 0;
  GAME.chunks.chunks.forEach(function (c) {
    if (!c.ready) return;
    var x0 = c.cx * CX, z0 = c.cz * CZ;
    if (!frustum.boxIn(x0, 0, z0, x0 + CX, CY, z0 + CZ)) return;
    var dx = x0 + 8 - eyeX, dz = z0 + 8 - eyeZ;
    visible.push({ c: c, d: dx * dx + dz * dz });
  });
  visible.sort(function (a, b) { return a.d - b.d; });
  for (var i = 0; i < visible.length; i++) {
    var c = visible[i].c;
    if (!c.cntO) continue;
    gl.uniform3f(P.u.uOrigin, c.cx * CX, 0, c.cz * CZ);
    gl.bindVertexArray(c.vaoO);
    gl.drawElements(gl.TRIANGLES, c.cntO, gl.UNSIGNED_INT, 0);
    drawn++; tris += c.cntO / 3;
  }
  GAME.stats = { chunks: drawn, tris: tris | 0, visible: visible.length };

  /* ---- entities, particles, dropped items ---- */
  drawEntities(dt, eyeX, eyeY, eyeZ, fog, fogNear, fogFar, uw);

  /* ---- translucent chunk pass (water / ice) ---- */
  gl.useProgram(P);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.CULL_FACE);
  gl.uniform1f(P.u.uAlphaTest, 0.02);
  for (var j = visible.length - 1; j >= 0; j--) {
    var c2 = visible[j].c;
    if (!c2.cntT) continue;
    gl.uniform3f(P.u.uOrigin, c2.cx * CX, 0, c2.cz * CZ);
    gl.bindVertexArray(c2.vaoT);
    gl.drawElements(gl.TRIANGLES, c2.cntT, gl.UNSIGNED_INT, 0);
  }
  gl.enable(gl.CULL_FACE);
  gl.disable(gl.BLEND);

  /* ---- held item (drawn last, with a cleared depth range) ---- */
  drawHeld(eyeX, eyeY, eyeZ, fog, uw, aspect);
  gl.bindVertexArray(null);
}
