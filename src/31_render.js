/* ============================================================ sky shader == */
var SKY_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
uniform mat4 uInvVP;
uniform vec3 uCam;
out vec3 vDir;
void main(){
  vec4 near = uInvVP * vec4(aPos, -1.0, 1.0);
  vec4 far  = uInvVP * vec4(aPos,  1.0, 1.0);
  vDir = normalize(far.xyz / far.w - near.xyz / near.w);
  gl_Position = vec4(aPos, 1.0, 1.0);
}`;
var SKY_FS = `#version 300 es
precision highp float;
in vec3 vDir;
uniform vec3 uSunDir;
uniform vec3 uZenith, uHorizon, uFog;
uniform float uDay;      // 0 night .. 1 day
uniform float uTime;
out vec4 frag;

float hash21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }

void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y*1.15+0.06, -1.0, 1.0);
  vec3 sky = mix(uHorizon, uZenith, pow(clamp(h,0.0,1.0), 0.55));
  if (h < 0.0) sky = mix(uHorizon, uFog*0.82, clamp(-h*3.0,0.0,1.0));

  // stars
  float night = clamp(1.0 - uDay*1.9, 0.0, 1.0);
  if (night > 0.01 && d.y > -0.05) {
    vec2 sp = d.xz / (abs(d.y)+0.35);
    vec2 cell = floor(sp*46.0);
    float r = hash21(cell);
    if (r > 0.985) {
      vec2 f = fract(sp*46.0)-0.5;
      float tw = 0.55 + 0.45*sin(uTime*2.2 + r*90.0);
      float s = smoothstep(0.36, 0.0, length(f)) * night * tw;
      sky += vec3(s);
    }
  }
  // sun
  float sd = dot(d, uSunDir);
  float sun = smoothstep(0.9975, 0.9992, sd);
  sky += vec3(1.0, 0.96, 0.82) * sun * 1.6;
  sky += vec3(1.0, 0.75, 0.42) * pow(max(sd,0.0), 220.0) * 0.45 * uDay;
  sky += vec3(1.0, 0.62, 0.30) * pow(max(sd,0.0), 12.0) * 0.16 * clamp(1.0-abs(uSunDir.y)*3.0,0.0,1.0);
  // moon opposite the sun
  float md = dot(d, -uSunDir);
  float moon = smoothstep(0.9982, 0.9994, md);
  sky += vec3(0.92, 0.94, 1.0) * moon * night * 1.5;
  frag = vec4(sky, 1.0);
}`;

/* ======================================================== textured quads == */
/* used for particles, dropped items, the held item and the break overlay     */
var SPR_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aUVL;
layout(location=2) in vec4 aCol;
uniform mat4 uVP;
uniform vec3 uCam;
out vec3 vUVL; out vec4 vCol; out float vDist;
void main(){
  vUVL = aUVL; vCol = aCol; vDist = length(aPos - uCam);
  gl_Position = uVP * vec4(aPos, 1.0);
}`;
var SPR_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec3 vUVL; in vec4 vCol; in float vDist;
uniform sampler2DArray uTex;
uniform vec3 uFog; uniform float uFogNear, uFogFar;
uniform int uUnderwater;
out vec4 frag;
void main(){
  vec4 t = texture(uTex, vUVL);
  if (t.a < 0.35) discard;
  vec3 c = t.rgb * vCol.rgb;
  float f = smoothstep(uFogNear, uFogFar, vDist);
  if (uUnderwater == 1) { c *= vec3(0.36,0.62,0.92); f = max(f, smoothstep(2.0,26.0,vDist)); }
  frag = vec4(mix(c, uFog, f), t.a * vCol.a);
}`;

/* ============================================== flat colour boxes / lines == */
var SOLID_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aCol;
uniform mat4 uVP; uniform vec3 uCam;
out vec4 vCol; out float vDist;
void main(){ vCol = aCol; vDist = length(aPos-uCam); gl_Position = uVP * vec4(aPos,1.0); }`;
var SOLID_FS = `#version 300 es
precision highp float;
in vec4 vCol; in float vDist;
uniform vec3 uFog; uniform float uFogNear, uFogFar;
out vec4 frag;
void main(){
  float f = smoothstep(uFogNear, uFogFar, vDist);
  frag = vec4(mix(vCol.rgb, uFog, f), vCol.a);
}`;

/* ================================================================ clouds == */
var CLOUD_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
uniform mat4 uVP; uniform vec3 uCam; uniform float uY; uniform float uScroll;
out vec2 vUV; out float vDist;
void main(){
  vec3 wp = vec3(uCam.x + aPos.x, uY, uCam.z + aPos.y);
  vUV = (wp.xz + vec2(uScroll, 0.0)) / 96.0;
  vDist = length(aPos);
  gl_Position = uVP * vec4(wp, 1.0);
}`;
var CLOUD_FS = `#version 300 es
precision highp float;
in vec2 vUV; in float vDist;
uniform sampler2D uTex; uniform vec3 uFog; uniform float uDay; uniform float uFar;
out vec4 frag;
void main(){
  float a = texture(uTex, vUV).a;
  if (a < 0.15) discard;
  vec3 c = mix(vec3(0.62,0.66,0.78), vec3(1.0), uDay) ;
  float fade = 1.0 - smoothstep(uFar*0.45, uFar*0.95, vDist);
  frag = vec4(mix(c, uFog, smoothstep(uFar*0.3, uFar, vDist)), a * 0.82 * fade);
}`;

/* --------------------------------------------------------------- batches -- */
function Batch(floatsPerVert, attribs) {
  this.fpv = floatsPerVert;
  this.data = new Float32Array(4096 * floatsPerVert);
  this.n = 0;                                  // vertex count
  this.vbo = gl.createBuffer();
  this.vao = gl.createVertexArray();
  gl.bindVertexArray(this.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
  var off = 0, stride = floatsPerVert * 4;
  for (var i = 0; i < attribs.length; i++) {
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i, attribs[i], gl.FLOAT, false, stride, off);
    off += attribs[i] * 4;
  }
  gl.bindVertexArray(null);
}
Batch.prototype.reset = function () { this.n = 0; };
Batch.prototype.room = function (verts) {
  var need = (this.n + verts) * this.fpv;
  if (need <= this.data.length) return;
  var cap = this.data.length; while (cap < need) cap *= 2;
  var nd = new Float32Array(cap); nd.set(this.data.subarray(0, this.n * this.fpv)); this.data = nd;
};
Batch.prototype.push = function (vals) {
  this.room(1);
  this.data.set(vals, this.n * this.fpv); this.n++;
};
Batch.prototype.upload = function () {
  if (!this.n) return false;
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, this.data.subarray(0, this.n * this.fpv), gl.DYNAMIC_DRAW);
  return true;
};

/* sprite batch: pos3 uvl3 col4 = 10 floats, drawn as quads via the shared index buffer */
function SpriteBatch() { Batch.call(this, 10, [3, 3, 4]); }
SpriteBatch.prototype = Object.create(Batch.prototype);
SpriteBatch.prototype.quad = function (p0, p1, p2, p3, layer, u0, v0, u1, v1, r, g, b, a) {
  this.room(4);
  var d = this.data, i = this.n * 10;
  var ps = [p0, p1, p2, p3], uvs = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
  for (var k = 0; k < 4; k++) {
    d[i] = ps[k][0]; d[i+1] = ps[k][1]; d[i+2] = ps[k][2];
    d[i+3] = uvs[k][0]; d[i+4] = uvs[k][1]; d[i+5] = layer;
    d[i+6] = r; d[i+7] = g; d[i+8] = b; d[i+9] = a;
    i += 10;
  }
  this.n += 4;
};
/* axis-aligned textured cube (dropped items, the block in your hand) */
var CUBE_FACES = [
  { n: [1,0,0],  v: [[1,0,1],[1,0,0],[1,1,0],[1,1,1]] },
  { n: [-1,0,0], v: [[0,0,0],[0,0,1],[0,1,1],[0,1,0]] },
  { n: [0,1,0],  v: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
  { n: [0,-1,0], v: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
  { n: [0,0,1],  v: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]] },
  { n: [0,0,-1], v: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]] }
];
var FACE_SHADE = [0.76, 0.76, 1.0, 0.52, 0.88, 0.88];

/* solid batch: pos3 col4 */
function SolidBatch() { Batch.call(this, 7, [3, 4]); }
SolidBatch.prototype = Object.create(Batch.prototype);
SolidBatch.prototype.quad = function (p0, p1, p2, p3, r, g, b, a) {
  this.room(4);
  var d = this.data, i = this.n * 7, ps = [p0, p1, p2, p3];
  for (var k = 0; k < 4; k++) {
    d[i] = ps[k][0]; d[i+1] = ps[k][1]; d[i+2] = ps[k][2];
    d[i+3] = r; d[i+4] = g; d[i+5] = b; d[i+6] = a; i += 7;
  }
  this.n += 4;
};
/* an oriented box: c = centre, s = half extents, yaw around Y */
var _bx = [0,0,0], _bz = [0,0,0];
SolidBatch.prototype.box = function (cx, cy, cz, sx, sy, sz, yaw, r, g, b, a, lit) {
  var co = Math.cos(yaw), si = Math.sin(yaw);
  var self = this;
  function P(lx, ly, lz) {
    return [cx + lx * co + lz * si, cy + ly, cz - lx * si + lz * co];
  }
  for (var f = 0; f < 6; f++) {
    var fc = CUBE_FACES[f], sh = FACE_SHADE[f] * (lit === undefined ? 1 : lit);
    var q = [];
    for (var k = 0; k < 4; k++) {
      var v = fc.v[k];
      q.push(P((v[0] * 2 - 1) * sx, (v[1] * 2 - 1) * sy, (v[2] * 2 - 1) * sz));
    }
    this.quad(q[0], q[1], q[2], q[3], r * sh, g * sh, b * sh, a);
  }
};

/* box built on an arbitrary orthonormal basis (used for the first-person arm) */
SolidBatch.prototype.boxBasis = function (cx, cy, cz, R, U, F, sx, sy, sz, r, g, b, a, lit) {
  var self = this;
  function P(lx, ly, lz) {
    return [cx + R[0] * lx + U[0] * ly + F[0] * lz,
            cy + R[1] * lx + U[1] * ly + F[1] * lz,
            cz + R[2] * lx + U[2] * ly + F[2] * lz];
  }
  for (var f = 0; f < 6; f++) {
    var fc = CUBE_FACES[f], sh = FACE_SHADE[f] * (lit === undefined ? 1 : lit);
    var q = [];
    for (var k = 0; k < 4; k++) {
      var v = fc.v[k];
      q.push(P((v[0] * 2 - 1) * sx, (v[1] * 2 - 1) * sy, (v[2] * 2 - 1) * sz));
    }
    this.quad(q[0], q[1], q[2], q[3], r * sh, g * sh, b * sh, a);
  }
};

/* ------------------------------------------------------- cloud texture ---- */
function makeCloudTexture() {
  var N = 128, data = new Uint8Array(N * N * 4);
  var nz = new Noise(9182);
  for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
    var v = nz.fbm2(x / 22, y / 22, 4) * 0.5 + 0.5;
    var v2 = nz.fbm2(x / 8 + 40, y / 8 - 40, 3) * 0.5 + 0.5;
    var a = (v * 0.75 + v2 * 0.25) > 0.58 ? 255 : 0;
    var i = (y * N + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255; data[i + 3] = a;
  }
  /* wrap-blur the edges so tiling is seamless enough */
  var t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  return t;
}

/* ------------------------------------------------------------- frustum ---- */
function Frustum() { this.p = new Float32Array(24); }
Frustum.prototype.set = function (m) {
  /* column-major matrix: row r = (m[r], m[4+r], m[8+r], m[12+r]) */
  var p = this.p, k = 0;
  for (var i = 0; i < 3; i++) {
    for (var s = 0; s < 2; s++) {
      var sg = s ? -1 : 1;
      p[k++] = m[3] + sg * m[i];
      p[k++] = m[7] + sg * m[4 + i];
      p[k++] = m[11] + sg * m[8 + i];
      p[k++] = m[15] + sg * m[12 + i];
    }
  }
  /* normalise so the distance test is in world units */
  for (var f = 0; f < 6; f++) {
    var a = p[f * 4], b = p[f * 4 + 1], c = p[f * 4 + 2];
    var len = Math.sqrt(a * a + b * b + c * c) || 1;
    p[f * 4] /= len; p[f * 4 + 1] /= len; p[f * 4 + 2] /= len; p[f * 4 + 3] /= len;
  }
};
Frustum.prototype.boxIn = function (x0, y0, z0, x1, y1, z1) {
  var p = this.p;
  for (var i = 0; i < 6; i++) {
    var a = p[i * 4], b = p[i * 4 + 1], c = p[i * 4 + 2], d = p[i * 4 + 3];
    if (a * (a > 0 ? x1 : x0) + b * (b > 0 ? y1 : y0) + c * (c > 0 ? z1 : z0) + d < 0) return false;
  }
  return true;
};
