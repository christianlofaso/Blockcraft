/* =================================================================== gfx == */
var M4 = {
  create: function () { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); },
  perspective: function (o, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    o[0] = f / aspect; o[1] = 0; o[2] = 0; o[3] = 0;
    o[4] = 0; o[5] = f; o[6] = 0; o[7] = 0;
    o[8] = 0; o[9] = 0; o[10] = (far + near) * nf; o[11] = -1;
    o[12] = 0; o[13] = 0; o[14] = 2 * far * near * nf; o[15] = 0;
    return o;
  },
  ortho: function (o, l, r, b, t, n, f) {
    var lr = 1 / (l - r), bt = 1 / (b - t), nf = 1 / (n - f);
    o[0] = -2 * lr; o[1] = 0; o[2] = 0; o[3] = 0;
    o[4] = 0; o[5] = -2 * bt; o[6] = 0; o[7] = 0;
    o[8] = 0; o[9] = 0; o[10] = 2 * nf; o[11] = 0;
    o[12] = (l + r) * lr; o[13] = (t + b) * bt; o[14] = (f + n) * nf; o[15] = 1;
    return o;
  },
  identity: function (o) { o.set([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); return o; },
  mul: function (o, a, b) {
    var a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],
        a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];
    for (var i = 0; i < 4; i++) {
      var b0=b[i*4],b1=b[i*4+1],b2=b[i*4+2],b3=b[i*4+3];
      o[i*4]   = b0*a00 + b1*a10 + b2*a20 + b3*a30;
      o[i*4+1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
      o[i*4+2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
      o[i*4+3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    }
    return o;
  },
  translate: function (o, a, v) {
    var x=v[0],y=v[1],z=v[2];
    if (o !== a) o.set(a);
    o[12] = a[0]*x + a[4]*y + a[8]*z + a[12];
    o[13] = a[1]*x + a[5]*y + a[9]*z + a[13];
    o[14] = a[2]*x + a[6]*y + a[10]*z + a[14];
    o[15] = a[3]*x + a[7]*y + a[11]*z + a[15];
    return o;
  },
  scale: function (o, a, v) {
    for (var i = 0; i < 4; i++) { o[i]=a[i]*v[0]; o[4+i]=a[4+i]*v[1]; o[8+i]=a[8+i]*v[2]; o[12+i]=a[12+i]; }
    return o;
  },
  rotY: function (o, a, r) {
    var s = Math.sin(r), c = Math.cos(r);
    var a00=a[0],a01=a[1],a02=a[2],a03=a[3],a20=a[8],a21=a[9],a22=a[10],a23=a[11];
    if (o !== a) { o.set(a); }
    o[0]=a00*c-a20*s; o[1]=a01*c-a21*s; o[2]=a02*c-a22*s; o[3]=a03*c-a23*s;
    o[8]=a00*s+a20*c; o[9]=a01*s+a21*c; o[10]=a02*s+a22*c; o[11]=a03*s+a23*c;
    return o;
  },
  rotX: function (o, a, r) {
    var s = Math.sin(r), c = Math.cos(r);
    var a10=a[4],a11=a[5],a12=a[6],a13=a[7],a20=a[8],a21=a[9],a22=a[10],a23=a[11];
    if (o !== a) o.set(a);
    o[4]=a10*c+a20*s; o[5]=a11*c+a21*s; o[6]=a12*c+a22*s; o[7]=a13*c+a23*s;
    o[8]=a20*c-a10*s; o[9]=a21*c-a11*s; o[10]=a22*c-a12*s; o[11]=a23*c-a13*s;
    return o;
  },
  rotZ: function (o, a, r) {
    var s = Math.sin(r), c = Math.cos(r);
    var a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7];
    if (o !== a) o.set(a);
    o[0]=a00*c+a10*s; o[1]=a01*c+a11*s; o[2]=a02*c+a12*s; o[3]=a03*c+a13*s;
    o[4]=a10*c-a00*s; o[5]=a11*c-a01*s; o[6]=a12*c-a02*s; o[7]=a13*c-a03*s;
    return o;
  },
  lookRot: function (o, yaw, pitch) {         /* view matrix for a first-person camera */
    M4.identity(o); M4.rotX(o, o, pitch); M4.rotY(o, o, yaw);
    return o;
  },
  invert: function (o, m) {
    var a00=m[0],a01=m[1],a02=m[2],a03=m[3],a10=m[4],a11=m[5],a12=m[6],a13=m[7],
        a20=m[8],a21=m[9],a22=m[10],a23=m[11],a30=m[12],a31=m[13],a32=m[14],a33=m[15];
    var b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,
        b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,
        b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
    var det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
    if (!det) return null; det = 1/det;
    o[0]=(a11*b11-a12*b10+a13*b09)*det; o[1]=(a02*b10-a01*b11-a03*b09)*det;
    o[2]=(a31*b05-a32*b04+a33*b03)*det; o[3]=(a22*b04-a21*b05-a23*b03)*det;
    o[4]=(a12*b08-a10*b11-a13*b07)*det; o[5]=(a00*b11-a02*b08+a03*b07)*det;
    o[6]=(a32*b02-a30*b05-a33*b01)*det; o[7]=(a20*b05-a22*b02+a23*b01)*det;
    o[8]=(a10*b10-a11*b08+a13*b06)*det; o[9]=(a01*b08-a00*b10-a03*b06)*det;
    o[10]=(a30*b04-a31*b02+a33*b00)*det; o[11]=(a21*b02-a20*b04-a23*b00)*det;
    o[12]=(a11*b07-a10*b09-a12*b06)*det; o[13]=(a00*b09-a01*b07+a02*b06)*det;
    o[14]=(a31*b01-a30*b03-a32*b00)*det; o[15]=(a20*b03-a21*b01+a22*b00)*det;
    return o;
  }
};

/* --------------------------------------------------------------- context -- */
var gl = null, canvas = null;
function initGL() {
  canvas = document.getElementById('gl');
  /* NB: no `desynchronized` here. It bypasses normal compositing for lower
     latency, but this canvas sits under a DOM HUD — and every time that HUD
     changes (switching hotbar slots moves the selection outline and fades in
     the item name) the recomposite could present the canvas freshly cleared,
     flashing the sky-blue clear colour. */
  gl = canvas.getContext('webgl2', {
    antialias: false, alpha: false, depth: true, stencil: false,
    powerPreference: 'high-performance'
  });
  if (!gl) throw new Error('WebGL2 is required. Try a current Chrome, Edge, Firefox or Safari.');
  gl.clearColor(.5, .7, 1, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.frontFace(gl.CCW);
  return gl;
}
function compile(type, src) {
  var s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error('shader: ' + gl.getShaderInfoLog(s) + '\n' +
      src.split('\n').map(function (l, i) { return (i + 1) + ': ' + l; }).join('\n'));
  return s;
}
function program(vs, fs, attribs) {
  var p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  if (attribs) for (var i = 0; i < attribs.length; i++) gl.bindAttribLocation(p, i, attribs[i]);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
  p.u = {};
  var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (var j = 0; j < n; j++) {
    var nm = gl.getActiveUniform(p, j).name.replace(/\[0\]$/, '');
    p.u[nm] = gl.getUniformLocation(p, nm);
  }
  return p;
}

/* ------------------------------------------------------- texture array ---- */
var texArray = null;
function uploadTextures(data) {
  var t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
  gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, TS, TS, TEX_COUNT, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  var ext = gl.getExtension('EXT_texture_filter_anisotropic');
  /* high anisotropy keeps ground textures sharp at grazing angles */
  if (ext) gl.texParameterf(gl.TEXTURE_2D_ARRAY, ext.TEXTURE_MAX_ANISOTROPY_EXT,
    Math.min(16, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  texArray = t;
  return t;
}

/* ------------------------------------------------------- shared indices -- */
var MAX_QUADS = 262144, indexBuf = null;
function buildIndexBuffer() {
  var idx = new Uint32Array(MAX_QUADS * 6);
  for (var q = 0, v = 0, i = 0; q < MAX_QUADS; q++, v += 4) {
    idx[i++] = v; idx[i++] = v + 1; idx[i++] = v + 2;
    idx[i++] = v; idx[i++] = v + 2; idx[i++] = v + 3;
  }
  indexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
}

/* =============================================================== shaders == */
var CHUNK_VS = `#version 300 es
precision highp float;
layout(location=0) in uvec2 aData;
uniform mat4 uVP;
uniform vec3 uOrigin;
uniform vec3 uTint[8];
uniform float uDay;
uniform float uTime;
uniform vec3 uCam;
out vec3 vUVL;
out vec3 vLight;
out float vDist;
out float vY;
const float FACE[6] = float[6](0.76, 0.76, 1.0, 0.52, 0.88, 0.88);
void main(){
  float px = float(aData.x & 255u) * 0.125;
  float pz = float((aData.x >> 8) & 255u) * 0.125;
  float py = float((aData.x >> 16) & 2047u) * 0.125;
  vec3 wp = uOrigin + vec3(px, py, pz);
  uint d1 = aData.y;
  float layer = float(d1 & 255u);
  float sky   = float((d1 >> 8) & 15u) / 15.0;
  float blk   = float((d1 >> 12) & 15u) / 15.0;
  float ao    = float((d1 >> 16) & 3u);
  float u     = float((d1 >> 18) & 15u) * 0.125;
  float v     = float((d1 >> 22) & 15u) * 0.125;
  uint nrm    = (d1 >> 26) & 7u;
  uint tint   = (d1 >> 29) & 7u;

  // gentle wave for foliage and liquids
  if (tint == 1u || tint == 2u || tint == 3u || tint == 4u) {
    float w = sin(uTime * 1.7 + wp.x * 0.7 + wp.z * 0.6) * 0.035 * step(0.5, fract(py));
    wp.x += w; wp.z += w * 0.7;
  } else if (tint == 7u) {
    wp.y += sin(uTime * 1.3 + wp.x * 0.55 + wp.z * 0.5) * 0.028;
  }

  float lv = max(sky * uDay, blk);
  float bright = 0.045 + 0.955 * pow(lv, 1.42);
  bright *= FACE[nrm];
  bright *= (0.58 + 0.14 * ao);
  vec3 warm = mix(vec3(1.0), vec3(1.14, 0.94, 0.72), clamp(blk - sky * uDay, 0.0, 1.0));
  vec3 col = (tint == 0u ? vec3(1.0) : uTint[tint]) * bright * warm;

  vUVL = vec3(u, 1.0 - v, layer);
  vLight = col;
  vDist = length(wp - uCam);
  vY = wp.y;
  gl_Position = uVP * vec4(wp, 1.0);
}`;

var CHUNK_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec3 vUVL;
in vec3 vLight;
in float vDist;
in float vY;
uniform sampler2DArray uTex;
uniform vec3 uFog;
uniform float uFogNear, uFogFar;
uniform float uAlphaTest;
uniform int uUnderwater;
out vec4 frag;
void main(){
  vec4 t = texture(uTex, vUVL);
  if (t.a < uAlphaTest) discard;
  vec3 c = t.rgb * vLight;
  float f = smoothstep(uFogNear, uFogFar, vDist);
  if (uUnderwater == 1) { c *= vec3(0.36, 0.62, 0.92); f = max(f, smoothstep(2.0, 26.0, vDist)); }
  c = mix(c, uFog, f);
  frag = vec4(c, t.a);
}`;
