/* Concatenates src/* into a single self-contained HTML file.
   Usage: node build.js                                                      */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, 'blockcraft.html');

/* Code shared by the main thread and the Worker. This block is emitted into a
   <script type="text/x-worker"> tag, evaluated globally on the main thread and
   handed to the Worker as a Blob. */
const SHARED = [
  '10_core.js', '11_blocks.js', '12_items.js',
  '13_worldgen.js', '14_light.js', '15_mesh.js', '16_worker.js'
];
/* Main-thread only: rendering, UI, gameplay. */
const MAIN = [
  '20_textures.js', '21_itemtex.js',
  '30_gfx.js', '31_render.js', '32_chunkmgr.js',
  '40_audio.js', '41_player.js', '42_entities.js', '43_entityupdate.js',
  '44_icons.js', '45_inventory.js', '46_invdom.js',
  '50_game.js', '51_interact.js', '52_loop.js', '53_draw.js', '54_hud.js', '55_boot.js'
];

function read(f) {
  const p = path.join(SRC, f);
  if (!fs.existsSync(p)) throw new Error('missing source file: ' + f);
  return fs.readFileSync(p, 'utf8');
}
function banner(f) {
  return '\n/* ' + '='.repeat(74) + '\n   ' + f + '\n   ' + '='.repeat(74) + ' */\n';
}

const head = read('00_head.html');
let out = head;

for (const f of SHARED) out += banner(f) + read(f);

out += `
</script>

<script>
/* The block above is the single source of truth for world generation, lighting
   and meshing. Evaluate it here in global scope so the main thread can use the
   same block/item tables; the Worker receives the identical text as a Blob. */
(0, eval)(document.getElementById('shared-src').textContent);
</script>

<script>
`;

for (const f of MAIN) out += banner(f) + read(f);

out += `
</script>
</body>
</html>
`;

if (out.includes('</scr' + 'ipt>', head.length) === false) {
  /* sanity: nothing to do, just avoids an unused warning */
}
fs.writeFileSync(OUT, out, 'utf8');
const kb = (Buffer.byteLength(out, 'utf8') / 1024).toFixed(1);
console.log('wrote ' + path.basename(OUT) + '  (' + kb + ' KB, ' +
  out.split('\n').length + ' lines)');
