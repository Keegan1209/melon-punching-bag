# Punching Bag

A mobile-first 3D heavy bag you can hit in the browser. Tap the bag, a glove
throws a handcrafted punch at the nearest impact zone, and the bag swings with
weight. No menus, no accounts, no backend.

**Mobile first, and it fills whatever screen it is given.** The canvas takes
the full viewport at any aspect, and the framing adapts rather than being
locked to one shape.

Models are ["Punching bag from Poly by Google"](https://skfb.ly/6YvUS) by
IronEqual and ["Boxing Glove"](https://sketchfab.com/3d-models/boxing-glove-5b464201104949e09f77f2d1cf8b60c3)
by Incg5764, both [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
See [CREDITS.md](CREDITS.md).

Built as a reusable, brand-neutral engine: colours, models, sounds and feel are
all configuration, not code.

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Nothing else to configure — the project ships with
procedural geometry and synthesised audio, so it runs with no assets.

| Script              | Purpose                     |
| ------------------- | --------------------------- |
| `npm run dev`       | Dev server                  |
| `npm run build`     | Production build            |
| `npm run start`     | Serve the production build  |
| `npm run typecheck` | Type check without emitting |

## Deploying

Push to a Git remote and import the repo on Vercel. It is a stock Next.js App
Router project — no environment variables, no build configuration, no server
routes. The page prerenders as static content and the canvas mounts client-side.

## How it works

The load-bearing design decision is that **taps do not aim the gloves.**

A raycast against the bag is used only to classify the hit into one of six
impact zones. Each zone owns a handcrafted punch — trajectory, wrist rotation,
contact point, impulse — so every hit lands on a path someone chose. Chasing the
exact tap coordinate produces stretched, unnatural glove motion; this keeps
every punch cinematic while still feeling like you hit where you tapped.

**The tier you hit decides the punch.** Low on the bag throws an uppercut, the
middle a cross, high a hook — the three places a fighter would actually throw
each. The player never picks; the tap implies it.

Physics is slaved to the animation clock, never to the tap. The impulse is
applied on the exact frame the fist reaches the bag, along with the sound and
the haptic pulse.

```
tap → raycast → nearest zone → glove → punch timeline
                                            │
                                    (contact frame)
                                            ├── impulse → bag swing
                                            ├── sound
                                            └── haptic
```

### Project layout

```
src/
  app/          Next.js shell. The canvas is client-only by necessity.
  components/   Rendering only. No cross-cutting logic lives here.
  lib/          The engine: physics, animation, audio, framing.
  config/       Everything you are meant to edit.
  store/        UI-facing state. Never per-frame data.
```

`src/lib/GameEngine.ts` wires it together and owns the frame order: gloves are
advanced before the bag, so a contact lands on the frame it was generated.

## Configuration

### `src/config/theme.ts` — how it looks

Colours, models, sounds, fog and haptics. Nothing in `components/` or `lib/`
hardcodes a colour or an asset path, so reskinning means editing this file only.

### `src/config/zones.ts` — how the punches feel

The six impact zones. Each is pure data — trajectory, wrist rotation, contact
point, impulse direction and strength, timing. Retuning a punch, or adding a
seventh zone, never touches logic.

### `src/config/scene.ts` — where things are

Geometry and physics tuning. `PHYSICS.inertia` is the main weight knob: higher
is heavier and less responsive. `CAMERA.frameHalfHeight` sets how close the
camera sits, and `GLOVE.idle` places the gloves in viewport coordinates.

## Responsive framing

The canvas fills the viewport at every aspect. `100dvh` rather than `100vh`,
because iOS Safari's URL bar and toolbar collapse as you scroll and `vh`
measures the tallest possible viewport -- with `vh` the bottom of the canvas
ends up under the toolbar.

Two things keep the composition stable while the aspect changes:

- **Distance is driven by height, not width.** `CAMERA.frameHalfWidth` is
  deliberately slack, so the height budget decides the camera distance at every
  realistic aspect. The bag therefore occupies the same fraction of the screen
  on a phone and on a desktop; a wider window simply reveals more room to the
  sides.
- **Gloves are anchored to the viewport, not to world coordinates.** They
  resolve from the camera frustum each resize, so they hold the same on-screen
  position on any device. Fixed world positions fall straight outside a
  portrait frustum.

The tightest constraint is the strip of back wall between the bag's silhouette
and the frame edge, where the logo sits. It is narrowest on the tallest phones,
so `branding.logoWidth` and `logoPosition` are sized for that case. Moving the
camera closer widens the cone the bag hides and squeezes that strip further.

## What a landed punch does

Each archetype moves the bag differently, and all of it falls out of the
impulse rather than being animated separately:

| | swing | lateral | twist | lift | squashes |
|---|---|---|---|---|---|
| Cross | 8.9° | 3.2° | 1.5° | — | depth |
| Hook | 4.8° | 6.1° | 2.5° | — | width |
| Uppercut | 8.9° | 1.6° | 0.6° | 7.4 cm | depth |

Three degrees of freedom exist purely so the punches can differ:

- **Twist** is what makes a hook read as a hook. It has a soft spring, because
  a chain resists rotation only weakly, so the bag keeps turning after the hit.
- **Lift** is what makes an uppercut land. Most of an uppercut's force is
  upward, so on a swing-only bag it would be absorbed and read *softer* than a
  jab. Letting the bag ride up its chain and drop back fixes that.
- **Squash** compresses the bag along the axis it was hit and bulges it across,
  so a cross drives it back and a hook drives it sideways. It rebounds slightly
  past its resting shape, which is what reads as springy rather than dented.

The camera also takes a short positional kick. Positional, not rotational — at
this field of view a rotational shake swings the whole room and reads as a
glitch rather than a hit.

All of it is in `IMPACT` and `PHYSICS` in `src/config/scene.ts`, and everything
returns to exact neutral once spent.

## Glove orientation

Both gloves — procedural and GLB — share one convention: **knuckles point along
local +Y.** At rest that reads as a fist held up in guard. Each zone's
`wristRotation` then pitches the fist forward by roughly 90 degrees so the
knuckles lead the punch, with per-zone variation for the angle of attack.

If you swap the glove model, set `theme.gloves.modelRotation` so its knuckles
end up along +Y and everything else follows. Getting this backwards is not
subtle: the glove punches cuff-first.

## Replacing the assets

### Models

The bag ships as a GLB; gloves are still procedural. Drop a replacement into
`public/models` and point the theme at it:

```ts
bag:    { model: "/models/bag.glb", tintMaterials: ["lambert2SG"], ... },
gloves: { model: "/models/glove.glb", ... },
```

**Models are fitted automatically.** A bag GLB is scaled and positioned from its
own bounding box so it hangs from `BAG.pivotY` and clears the floor by
`BAG.floorClearance`, whatever size it was authored at. You do not need to
pre-scale it or centre it on its origin.

**Name the materials you want tinted.** `tintMaterials` limits the theme colour
to the bag body; without it, the chain and bracket would be painted the same
colour as the bag. Omit it to tint everything. Textures and maps survive — only
the base colour is overridden.

**Re-measure the envelope if proportions change.** `BAG.radius`, `BAG.height`
and `BAG.suspension` in `src/config/scene.ts` describe the bag body that fitting
produces, and every impact zone derives from them. A bag with a much longer
chain or a squatter body needs those three numbers updated; nothing else.

**Compress with Meshopt, not Draco.** The Meshopt decoder ships with drei and
needs no extra files. Draco would require hosting a decoder in `public/`.

**Watch texture weight.** The glove model is 1.5 MB, of which a 1 MB PNG normal
map is the bulk — for an asset that occupies a fraction of the screen. If the
budget gets tight, that map is the first thing to drop or downscale.

### Sounds

Drop mp3s into `public/sounds` matching the paths in `theme.audio.punch`. They
are picked at random, avoiding an immediate repeat, with slight pitch variation
so repeated hits do not sound mechanical.

Until you add them, punches are synthesised in WebAudio — a noise slap over a
pitch-dropping thud. Missing or undecodable files fall back silently, so the
experience is never mute.

## Performance

Roughly **2 MB** total: ~424 KB gzipped JS, a 46 KB bag model and a 1.5 MB
glove model. Comfortably inside the 3 MB budget, though the glove's normal map
is the obvious saving if more room is ever needed.

- One WebGL canvas, one `useFrame` for the entire simulation.
- **A punch costs zero React re-renders.** The animator mutates vectors in place
  and the engine writes them straight into the Object3D each frame.
- Device pixel ratio capped at 2.
- Static geometry is memoised; the room is a single inside-out box.
- Delta time is clamped, so returning from a backgrounded tab cannot fling the
  bag.

## Known limitations

- **iOS has no Web Vibration API.** Haptics are a deliberate no-op on iPhone.
  There is no reliable web workaround; real haptics there need a native shell.
- **Audio needs a gesture.** The AudioContext is resumed inside the tap that
  starts the first punch, which is the only moment iOS permits it.
- The bag swings on two axes and does not twist. Adding twist means feeding the
  Y torque, already computed in the cross product, into a third oscillator.

## Extending it

The interaction system is independent of branding, so these are additive:

- **Colour picker / skins / seasonal themes** — write to `theme`.
- **Score, combo, timer modes** — `src/store/useGameStore.ts` already counts
  punches and records the last zone hit.
- **Analytics** — `GameEngine.handleContact` is the single choke point every
  landed punch passes through.
- **Rapier** — the bag is a two-axis damped pendulum rather than a rigid-body
  sim, because one hanging body does not justify a WASM solver or its startup
  cost. Swapping it out means matching one interface: `applyImpulse()` in, an
  angle out. Worth doing if gloves ever need real collisions.

In development, the engine is exposed as `window.__punchingBag` for tuning
zone numbers from the console. That block is dead code in production builds.
