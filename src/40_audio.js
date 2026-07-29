/* ================================================================= audio == */
var AC = null, masterGain = null, noiseBuf = null;
function initAudio() {
  if (AC) return;
  var Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  AC = new Ctx();
  masterGain = AC.createGain();
  masterGain.gain.value = 0.5;
  masterGain.connect(AC.destination);
  var len = AC.sampleRate * 1.2;
  noiseBuf = AC.createBuffer(1, len, AC.sampleRate);
  var d = noiseBuf.getChannelData(0);
  for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
}
function noiseSrc() { var s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; }
function env(node, t0, a, d, peak) {
  var g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  node.connect(g);
  return g;
}
/* volume falls off with distance from the camera */
function sfx(name, vol, rate, pan) {
  if (!AC) return;
  if (AC.state === 'suspended') AC.resume();
  vol = (vol === undefined ? 1 : vol) * 0.9;
  if (vol <= 0.003) return;
  rate = rate || 1;
  var t = AC.currentTime, out = masterGain;
  if (pan !== undefined && AC.createStereoPanner) {
    var p = AC.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1); p.connect(masterGain); out = p;
  }
  try { SOUNDS[name] ? SOUNDS[name](t, vol, rate, out) : SOUNDS.click(t, vol, rate, out); }
  catch (e) { /* audio hiccups must never break the frame */ }
}
var SOUNDS = {
  step_stone: function (t, v, r, out) {
    var n = noiseSrc(); var f = AC.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 900 * r; f.Q.value = 1.4;
    n.connect(f); env(f, t, 0.005, 0.07, v * 0.25).connect(out);
    n.start(t); n.stop(t + 0.1);
  },
  step_grass: function (t, v, r, out) {
    var n = noiseSrc(); var f = AC.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 2400 * r;
    n.connect(f); env(f, t, 0.006, 0.085, v * 0.2).connect(out);
    n.start(t); n.stop(t + 0.12);
  },
  step_sand: function (t, v, r, out) {
    var n = noiseSrc(); var f = AC.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 3600 * r; f.Q.value = 0.6;
    n.connect(f); env(f, t, 0.01, 0.1, v * 0.18).connect(out);
    n.start(t); n.stop(t + 0.13);
  },
  step_wood: function (t, v, r, out) {
    var o = AC.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(220 * r, t); o.frequency.exponentialRampToValueAtTime(120 * r, t + 0.06);
    env(o, t, 0.004, 0.06, v * 0.22).connect(out);
    o.start(t); o.stop(t + 0.09);
    var n = noiseSrc(); var f = AC.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1500 * r;
    n.connect(f); env(f, t, 0.004, 0.05, v * 0.12).connect(out);
    n.start(t); n.stop(t + 0.07);
  },
  step_gravel: function (t, v, r, out) {
    var n = noiseSrc(); var f = AC.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1600 * r; f.Q.value = .8;
    n.connect(f); env(f, t, 0.004, 0.09, v * 0.24).connect(out);
    n.start(t); n.stop(t + 0.12);
  },
  step_snow: function (t, v, r, out) {
    var n = noiseSrc(); var f = AC.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 700 * r;
    n.connect(f); env(f, t, 0.01, 0.1, v * 0.22).connect(out);
    n.start(t); n.stop(t + 0.13);
  },
  step_wool: function (t, v, r, out) {
    var n = noiseSrc(); var f = AC.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 500 * r;
    n.connect(f); env(f, t, 0.01, 0.08, v * 0.2).connect(out);
    n.start(t); n.stop(t + 0.11);
  },
  step_water: function (t, v, r, out) {
    var n = noiseSrc(); var f = AC.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.setValueAtTime(500 * r, t);
    f.frequency.exponentialRampToValueAtTime(2200 * r, t + 0.12); f.Q.value = 1.2;
    n.connect(f); env(f, t, 0.01, 0.16, v * 0.3).connect(out);
    n.start(t); n.stop(t + 0.2);
  },
  step_metal: function (t, v, r, out) {
    var o = AC.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(1400 * r, t);
    env(o, t, 0.003, 0.05, v * 0.1).connect(out); o.start(t); o.stop(t + 0.07);
  },
  step_slime: function (t, v, r, out) {
    var o = AC.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(420 * r, t); o.frequency.exponentialRampToValueAtTime(140 * r, t + 0.12);
    env(o, t, 0.006, 0.12, v * 0.25).connect(out); o.start(t); o.stop(t + 0.16);
  },
  step_lava: function (t, v, r, out) { SOUNDS.step_stone(t, v * .8, r * .5, out); },
  dig: function (t, v, r, out) {
    var n = noiseSrc(); var f = AC.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 600 * r; f.Q.value = .9;
    n.connect(f); env(f, t, 0.004, 0.05, v * 0.16).connect(out);
    n.start(t); n.stop(t + 0.07);
  },
  place: function (t, v, r, out) {
    var o = AC.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(300 * r, t); o.frequency.exponentialRampToValueAtTime(160 * r, t + 0.07);
    env(o, t, 0.004, 0.08, v * 0.3).connect(out); o.start(t); o.stop(t + 0.12);
    var n = noiseSrc(); var f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2000;
    n.connect(f); env(f, t, 0.003, 0.05, v * 0.12).connect(out); n.start(t); n.stop(t + 0.07);
  },
  brk: function (t, v, r, out) {
    var n = noiseSrc(); var f = AC.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.setValueAtTime(1800 * r, t);
    f.frequency.exponentialRampToValueAtTime(400 * r, t + 0.18); f.Q.value = 1.1;
    n.connect(f); env(f, t, 0.005, 0.22, v * 0.34).connect(out);
    n.start(t); n.stop(t + 0.28);
  },
  glass: function (t, v, r, out) {
    for (var i = 0; i < 5; i++) {
      var o = AC.createOscillator(); o.type = 'triangle';
      o.frequency.value = (1800 + Math.random() * 2600) * r;
      env(o, t + i * 0.012, 0.002, 0.13, v * 0.14).connect(out);
      o.start(t + i * 0.012); o.stop(t + 0.2 + i * 0.012);
    }
  },
  hurt: function (t, v, r, out) {
    var o = AC.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(360 * r, t); o.frequency.exponentialRampToValueAtTime(120 * r, t + 0.18);
    var f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
    o.connect(f); env(f, t, 0.006, 0.2, v * 0.3).connect(out);
    o.start(t); o.stop(t + 0.26);
  },
  explode: function (t, v, r, out) {
    var n = noiseSrc(); var f = AC.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(1800, t);
    f.frequency.exponentialRampToValueAtTime(90, t + 0.9);
    n.connect(f); env(f, t, 0.01, 1.0, v * 0.85).connect(out);
    n.start(t); n.stop(t + 1.1);
    var o = AC.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(28, t + 0.7);
    env(o, t, 0.01, 0.8, v * 0.6).connect(out); o.start(t); o.stop(t + 0.9);
  },
  fuse: function (t, v, r, out) {
    var n = noiseSrc(); var f = AC.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 5000;
    n.connect(f); env(f, t, 0.02, 0.5, v * 0.16).connect(out); n.start(t); n.stop(t + 0.6);
  },
  eat: function (t, v, r, out) {
    for (var i = 0; i < 3; i++) {
      var n = noiseSrc(); var f = AC.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 700 + i * 240; f.Q.value = 2;
      n.connect(f); env(f, t + i * 0.09, 0.01, 0.07, v * 0.18).connect(out);
      n.start(t + i * 0.09); n.stop(t + 0.1 + i * 0.09);
    }
  },
  pop: function (t, v, r, out) {
    var o = AC.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(500 * r, t); o.frequency.exponentialRampToValueAtTime(1300 * r, t + 0.05);
    env(o, t, 0.004, 0.06, v * 0.22).connect(out); o.start(t); o.stop(t + 0.09);
  },
  click: function (t, v, r, out) {
    var o = AC.createOscillator(); o.type = 'square'; o.frequency.value = 620 * r;
    env(o, t, 0.002, 0.04, v * 0.12).connect(out); o.start(t); o.stop(t + 0.05);
  },
  levelup: function (t, v, r, out) {
    var notes = [523, 659, 784, 1047];
    for (var i = 0; i < notes.length; i++) {
      var o = AC.createOscillator(); o.type = 'triangle'; o.frequency.value = notes[i];
      env(o, t + i * 0.08, 0.01, 0.22, v * 0.16).connect(out);
      o.start(t + i * 0.08); o.stop(t + 0.34 + i * 0.08);
    }
  },
  splash: function (t, v, r, out) {
    var n = noiseSrc(); var f = AC.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.setValueAtTime(2600, t);
    f.frequency.exponentialRampToValueAtTime(600, t + 0.3); f.Q.value = 0.8;
    n.connect(f); env(f, t, 0.008, 0.34, v * 0.4).connect(out); n.start(t); n.stop(t + 0.4);
  },
  mob_zombie: function (t, v, r, out) {
    var o = AC.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(120 * r, t);
    o.frequency.linearRampToValueAtTime(70 * r, t + 0.5);
    var f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    o.connect(f); env(f, t, 0.05, 0.55, v * 0.28).connect(out); o.start(t); o.stop(t + 0.65);
  },
  mob_pig: function (t, v, r, out) {
    var o = AC.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(300 * r, t); o.frequency.exponentialRampToValueAtTime(180 * r, t + 0.2);
    var f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 3;
    o.connect(f); env(f, t, 0.02, 0.25, v * 0.3).connect(out); o.start(t); o.stop(t + 0.3);
  },
  mob_cow: function (t, v, r, out) {
    var o = AC.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(150 * r, t); o.frequency.linearRampToValueAtTime(110 * r, t + 0.7);
    var f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    o.connect(f); env(f, t, 0.08, 0.7, v * 0.3).connect(out); o.start(t); o.stop(t + 0.85);
  },
  mob_sheep: function (t, v, r, out) {
    var o = AC.createOscillator(); o.type = 'sawtooth';
    var lfo = AC.createOscillator(); lfo.frequency.value = 22;
    var lg = AC.createGain(); lg.gain.value = 30;
    lfo.connect(lg); lg.connect(o.frequency);
    o.frequency.setValueAtTime(390 * r, t);
    env(o, t, 0.03, 0.45, v * 0.2).connect(out);
    lfo.start(t); o.start(t); o.stop(t + 0.55); lfo.stop(t + 0.55);
  },
  mob_chicken: function (t, v, r, out) {
    for (var i = 0; i < 2; i++) {
      var o = AC.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(900 * r, t + i * 0.1);
      o.frequency.exponentialRampToValueAtTime(1500 * r, t + i * 0.1 + 0.06);
      env(o, t + i * 0.1, 0.006, 0.07, v * 0.12).connect(out);
      o.start(t + i * 0.1); o.stop(t + 0.12 + i * 0.1);
    }
  },
  mob_creeper: function (t, v, r, out) {
    var n = noiseSrc(); var f = AC.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 3800;
    n.connect(f); env(f, t, 0.06, 0.7, v * 0.24).connect(out); n.start(t); n.stop(t + 0.8);
  },
  mob_skeleton: function (t, v, r, out) {
    for (var i = 0; i < 4; i++) {
      var o = AC.createOscillator(); o.type = 'square';
      o.frequency.value = (240 + Math.random() * 200) * r;
      env(o, t + i * 0.05, 0.003, 0.05, v * 0.1).connect(out);
      o.start(t + i * 0.05); o.stop(t + 0.07 + i * 0.05);
    }
  },
  mob_spider: function (t, v, r, out) {
    var n = noiseSrc(); var f = AC.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.setValueAtTime(2400, t);
    f.frequency.exponentialRampToValueAtTime(900, t + 0.25); f.Q.value = 4;
    n.connect(f); env(f, t, 0.01, 0.28, v * 0.22).connect(out); n.start(t); n.stop(t + 0.35);
  }
};
var STEP_SOUND = {
  stone: 'step_stone', grass: 'step_grass', sand: 'step_sand', wood: 'step_wood',
  gravel: 'step_gravel', snow: 'step_snow', wool: 'step_wool', water: 'step_water',
  metal: 'step_metal', slime: 'step_slime', glass: 'step_stone', lava: 'step_lava'
};
