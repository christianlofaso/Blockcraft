# Blockcraft

An infinite voxel sandbox game in a **single HTML file**. No dependencies, no build
step required to play, no network access, no external assets. Every texture is
painted by code at load time and every sound is synthesized with the Web Audio API.

**To play: download `blockcraft.html` and open it in your browser.** (Requires a
browser with WebGL 2: current Chrome, Edge, Firefox or Safari.)

---

## What's in it

**World**
- Infinite procedurally generated terrain from a seed you choose
- 14 biomes: plains, forest, birch forest, jungle, savanna, desert, taiga, snowy
  tundra, mountains, swamp, beach, stone shore, ocean, deep ocean
- Rivers, oceans, beaches, caves (tunnels + caverns), lava pools, clay banks
- Depth-based ore distribution: coal, iron, gold, redstone, lapis, emerald, diamond
- Trees (oak/birch/spruce/jungle), cacti, flowers, grass, mushrooms, lily pads,
  pumpkins, and occasional ruined cobble structures
- 94 block types

**Simulation**
- Full flood-fill lighting: sunlight and coloured block light, propagated across
  chunk borders, with smooth per-vertex lighting and ambient occlusion
- Day/night cycle with a procedural sky: gradient, sun, moon, twinkling stars,
  sunset reddening, and drifting volumetric-ish clouds
- Falling sand/gravel, plants that pop when unsupported, crops that grow,
  saplings that grow into trees, TNT with chain reactions
- Water and lava you can swim in, drown in, and bucket around

**Survival**
- Health, hunger, saturation, exhaustion, air, XP and levels
- 8 mob types with distinct box models and AI: pig, cow, sheep, chicken,
  zombie, skeleton, creeper (fuses and explodes), spider. Hostiles spawn in the
  dark, burn in daylight, chase and attack; passives wander and flee
- Fall damage, drowning, suffocation, lava, starvation
- Death drops your inventory; respawn at your spawn point
- Armour (leather/iron/gold/diamond) with real damage reduction and durability
- Tools with tiers, speeds, durability, and correct harvest levels
  (iron ore needs a stone pick, diamond needs iron, obsidian needs diamond)

**Interface**
- 99 crafting recipes, shaped and shapeless, in 2×2 and 3×3 grids
- A **"can craft now"** panel that shows what your current inventory allows and
  crafts it in one click, no wiki needed
- Working furnaces (fuel burn times, smelting, XP) and chests, with contents saved
- Drag-and-drop inventory with stack splitting, shift-click transfer, armour slots
- Hotbar, hearts/hunger/armour/air/XP HUD, item tooltips, F3 debug overlay
- Chat with commands: `/give /tp /time /gamemode /seed /kill /heal /clear /spawn /dist`
- Survival and creative modes, flying, third-person view
- Autosave to `localStorage` every 2 minutes, plus save on quit
- Touch controls on mobile (virtual stick, look-drag, jump/sneak/inventory buttons)

## Controls

| | |
|---|---|
| Move / jump / sneak / sprint | `WASD` / `Space` / `Shift` / `Ctrl` |
| Mine or attack | hold **left mouse** |
| Place or use | **right mouse** |
| Inventory | `E` |
| Pick block | **middle mouse** |
| Drop item | `Q` |
| Select hotbar | `1`–`9` or scroll |
| Chat / commands | `T` or `/` |
| Debug overlay | `F3` |
| Fly (creative) | double-tap `Space` |
| Third person | `F5` |
| Menu | `Esc` |

## How it's built

`blockcraft.html` is generated from the modules in `src/`:

```
node build.js        # concatenates src/* -> blockcraft.html
```

The interesting part of the architecture is that world generation, lighting and
meshing live in **one block of source that runs in two places**. It is emitted
into a `<script type="text/x-worker">` tag, then:

- handed to a `Worker` as a Blob so terrain generation never stutters the frame, and
- evaluated on the main thread via indirect `eval` so the renderer and UI share the
  exact same block and item tables.

Because Blob workers are blocked on `file://` in some browsers, a watchdog falls
back to running that identical code on the main thread in time-sliced chunks, so
the file works whether you open it directly or serve it over HTTP.

Other notes:
- Chunks are 16×128×16. Mesh vertices are packed into **8 bytes** (two `uint32`s:
  position in ⅛-block units, texture layer, sky/block light, AO, UV, normal, biome
  tint) and drawn against one shared static index buffer, so each chunk costs a
  single buffer and a single draw call.
- Textures are uploaded as a `TEXTURE_2D_ARRAY` (227 layers), which gives correct
  mipmapping and anisotropy with zero atlas bleeding.
- `devserver.js` is a small dev helper (static files + a screenshot endpoint) used
  while building; it is not needed to play.
