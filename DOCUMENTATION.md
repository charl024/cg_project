# Space Taxi 3D - Technical Documentation

## Overview

A WebGL2-based 3D space taxi game where players pilot a taxi through procedurally generated levels, picking up and delivering passengers for money.

**Key Features:**
- 3D physics-based flight mechanics
- Procedurally generated levels using Perlin noise
- Oriented bounding box collision detection
- Phong lighting with bump mapping
- Post-processing effects (CRT, retro pixelation)
- Three distinct level types (brick towers, mountains, lava sea)
- Dynamic weather system with 7 weather types

---

## Weather System

The game features a dynamic weather system that randomly applies different atmospheric conditions to each level.

### Weather Types

| Weather | Sky Color | Effects | Description |
|---------|-----------|---------|-------------|
| Clear | Black | None | Default neutral lighting |
| Sunset | Dark red | None | Warm orange/red atmosphere |
| Night | Dark blue | None | Dim blue moonlight |
| Space | Very dark | None | Cold space ambience |
| Foggy | Gray | Fog | Muted gray atmosphere |
| Storm | Dark gray | Heavy rain, lightning | Dark with lightning flashes |
| Rainy | Dark blue-gray | Medium rain | Steady rain with dim lighting |
| Snowy | Light gray | Snow particles | Gentle snowfall |
| Blizzard | White-gray | Heavy snow | Intense snowstorm with fog |
| Dawn | Purple tint | None | Pink/purple morning sky |

### Precipitation Effects

**Rain** (Storm, Rainy weather):
- Multi-layered falling streaks at different speeds
- 3 depth layers for parallax effect
- Blue-white color tint
- Intensity: 0.7 (Rainy) to 1.0 (Storm)

**Snow** (Snowy, Blizzard weather):
- Drifting snowflake particles
- 4 depth layers with drift animation
- White color
- Intensity: 1.0 (Snowy) to 1.5 (Blizzard)

### Weather Functions (scene.js)

#### `set_weather(weatherType)`
Sets specific weather type.
- **Parameters:** `weatherType` (string: "clear", "sunset", "night", "space", "foggy", "storm", "dawn")
- **Effects:** Updates lighting colors and sky color

#### `set_random_weather()`
Randomly selects a weather type.
- **Returns:** Selected weather type string
- **Called:** Automatically on level regeneration

#### `get_weather_sky_color()`
Returns current sky color for rendering.
- **Returns:** [r, g, b] array

#### `get_weather_name()`
Returns display name of current weather.
- **Returns:** String (e.g., "Sunset", "Storm")

#### `get_rain_intensity()`
Returns current rain intensity for shader.
- **Returns:** Float 0.0-1.0+ (0 = no rain)

#### `get_snow_intensity()`
Returns current snow intensity for shader.
- **Returns:** Float 0.0-1.5 (0 = no snow)

### Weather State
```javascript
state.weather = {
    current: "clear",           // Current weather type key
    config: WEATHER_TYPES.clear, // Full weather configuration
    stormFlicker: false         // Storm lightning state
}
```

### Storm Lightning Effect
When weather is "storm", there's a 2% chance per frame of a lightning flash that temporarily brightens the scene to near-white lighting.

### Controls
- **T key:** Cycle to random weather type (for testing)
- Weather changes automatically with each new level

---

## Architecture

### File Structure

```
/src
  main.js           - Core game loop, physics, input, rendering
  scene.js          - Level generation, taxi building, scene management
  collision.js      - Oriented bounding box collision detection
  generation_util.js - Perlin noise and Poisson disc sampling
  material_data.js  - Material definitions
  model_node.js     - Scene graph system
  primitives.js     - Geometry generation (cube, sphere, cone, cylinder)
  shape.js          - Shape rendering and texture management
  shapebuffer.js    - VAO and buffer management
  transformations.js - Matrix and vector math utilities
/index.html         - Canvas, UI, shaders, CSS
```

---

## 1. main.js - Core Game Functions

### Shader Management

#### `create_shader(gl, type, source)`
Compiles a WebGL shader from source code.
- **Parameters:** `gl` (WebGL2 context), `type` (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER), `source` (GLSL string)
- **Returns:** Compiled shader object
- **Throws:** Error with compilation log on failure

#### `create_program(gl, vsSource, fsSource)`
Links vertex and fragment shaders into a program.
- **Parameters:** `gl`, `vsSource`, `fsSource`
- **Returns:** Linked shader program

### Framebuffer Setup

#### `setupFramebuffer()`
Creates two framebuffers for post-processing pipeline.
- Creates `framebuffer` (primary) and `framebuffer2` (secondary) for effect chaining
- Creates `renderTexture`, `renderTexture2` (RGBA color attachments)
- Creates `depthBuffer` for 3D rendering

#### `setupQuad()`
Creates fullscreen quad VAO for post-processing.

### Post-Processing Effects

#### `renderCRTEffect(time, useSecondaryTexture)`
Applies CRT monitor effect.
- **Parameters:** `time` (elapsed seconds), `useSecondaryTexture` (which framebuffer to read)
- **Effects:** Screen curvature, RGB split, scanlines, vignette, flicker

#### `renderRetroEffect(time, outputToFramebuffer)`
Applies retro arcade effect.
- **Parameters:** `time`, `outputToFramebuffer` (render to framebuffer or screen)
- **Effects:** 4px pixelation, 16-color posterization, bloom on bright pixels

#### `setTextureFiltering(useNearest)`
Switches texture filtering for retro mode.
- **Parameters:** `useNearest` (boolean for pixelated vs smooth)

### Camera System

#### `update_camera(dt)`
Updates camera position to follow taxi from behind.
- Smooth zoom interpolation (3.0 * dt)
- Camera looks ahead of taxi by `camera.lookAhead` units
- Distance/height scaled by `camera.zoomLevel`

#### `compute_view_matrix()`
Constructs view matrix from camera position and look-at target.
- **Returns:** Float32Array[16] column-major view matrix

### Physics System

#### `update_taxi(dt)`
Main physics update loop for taxi movement and collision.
- **Rotation:** A/D keys turn taxi at `turnSpeed` rad/s
- **Forward/Back:** W/S apply acceleration in facing direction
- **Vertical:** Space/Shift apply upward thrust minus gravity
- **Drag:** Ground (0.9) vs air (0.98)
- **Velocity limits:** 15 units/s horizontal, 12 units/s vertical
- **Collision:** Separating axis physics with axis-by-axis movement
- **Safety floor:** Teleports taxi to spawn if Y < -20

#### `consume_fuel(dt)`
Depletes fuel based on input usage.
- **Vertical thrust:** 4.0 fuel/second
- **Horizontal movement:** 2.0 fuel/second
- **Returns:** Boolean (fuel available)

### Landing & Collision

#### `calculate_landing_quality(impactVelocity)`
Determines landing quality based on impact velocity.
- **Returns:** "perfect" (<3), "good" (<5), "ok" (<8), "rough" (<12), "crash" (>=12)

#### `get_landing_multiplier(quality)`
Returns fare multiplier for landing quality.
- **Returns:** perfect=2.0, good=1.5, ok=1.0, rough=0.5, crash=0.0

#### `handle_crash()`
Handles crash event.
- Decrements lives
- Shows crash animation
- Resets taxi to spawn position
- Resets velocity and fuel to max
- Resets passenger state
- Sets up new pickup location

### Passenger System

#### `pickup_passenger(platform)`
Picks up passenger from platform.
- Sets `hasPassenger` to true
- Assigns random initial fare $20-30
- Selects random dropoff platform (excludes refuel stations)
- Moves goal arrow to dropoff (yellow)

#### `deliver_passenger(landingQuality)`
Delivers passenger and awards fare.
- **Calculation:** `totalFare = currentFare * landingMultiplier`
- Fare decays at 1$/second while carrying passenger
- Increments delivery count, checks for level advancement

### Level Progression

#### `go_to_next_level()`
Advances to next level with bonuses.
- Increments level counter
- Increases delivery threshold every 2 levels
- Awards bonus life if < 5 lives
- Generates new level after 1.5s delay

### Input Controls

| Key | Action |
|-----|--------|
| W/Up Arrow | Forward thrust |
| S/Down Arrow | Backward thrust |
| A/Left Arrow | Turn left |
| D/Right Arrow | Turn right |
| Space/Shift | Vertical thrust |
| R | Reset taxi (lose life) |
| N | Generate new level |
| C | Toggle CRT/retro effects |
| T | Cycle random weather |
| Mouse Wheel | Zoom (0.5x - 2.0x) |

### Global State Objects

```javascript
camera = {
  pos: {x, y, z},           // World position
  lookAt: {x, y, z},        // Target position
  offsetBehind: 18,         // Distance behind taxi
  offsetUp: 8,              // Height above taxi
  lookAhead: 12,            // Look ahead distance
  zoomLevel: 1.0            // Current zoom
}

taxiPhysics = {
  position: {x, y, z},
  velocity: {x, y, z},
  heading: 0,               // Rotation in radians
  turnSpeed: 1.5,           // Rad/s
  thrustPower: 18.0,        // Upward acceleration
  moveAccel: 12.0,          // Forward/back acceleration
  gravity: 9.8,
  maxVelocityY: 12.0,
  maxVelocityXZ: 15.0,
  onGround: false,
  airDrag: 0.98,
  groundDrag: 0.9
}

gameState = {
  lives: 5,
  fuel: 100.0,
  money: 0.00,
  passenger: {
    hasPassenger: false,
    currentFare: 0,
    fareDecayRate: 1.0      // $/second
  },
  crashVelocity: 12.0,
  deliverCount: 0,
  deliverThreshold: 2,
  currentLevel: 1
}
```

---

## 2. scene.js - Level Generation

### Level Types

#### `generate_level()`
Randomly selects and generates a level type.
- **First call:** Fully random selection
- **Subsequent:** 80% chance to pick different level, 20% repeat
- **Types:** 1=Mountain, 2=Brick Tower, 3=Lava Sea

#### `generate_brick_tower_level()`
Grass terrain with brick tower platforms.
- Perlin noise terrain (8 units tall, 0.1 frequency)
- 25x25 grid, grass texture
- Brick towers (3-13 units tall)
- Blue metal refuel station

#### `generate_mountain_level()`
Snowy mountain terrain with cliff platforms.
- Perlin noise terrain (100 units tall, 0.02 frequency)
- Snow texture, thin floating platforms (4x1x4)
- Platforms 8-20 units above terrain

#### `generate_lava_sea_level()`
Floating platforms over lava sea.
- Lava sea at Y=-10 (200x1x200)
- **Death zone:** Y=-8 (touching lava kills player)
- Spawn platform: Blue 6x1x6 at (0, 5, -30)
- Refuel platform: Blue 5x1x5 at (25, 8, 25)
- 15 random floating platforms (4x1x4)

### Taxi Construction

#### `build_taxi(spawnPos)`
Constructs hierarchical taxi model.
- **Body:** Yellow cube (1.8 x 0.5 x 0.8)
- **Cabin:** Yellow cube (1.2 x 0.4 x 0.75)
- **Windshield:** Dark blue-gray, high specular
- **Taxi sign:** Orange on roof
- **4 wheels:** Black cylinders
- **Thrust flames:** Orange cones (scaled dynamically)

### Goal Arrow System

#### `create_goal_arrow()`
Creates animated goal arrow above pickup platform.
- Green for pickup, yellow for dropoff
- Bobs (sin wave) and rotates (1.5 rad/s)

#### `get_random_dropoff_platform(excludePlatform)`
Selects random dropoff different from pickup.
- **Filters:** Excludes refuel stations

---

## 3. collision.js - Collision Detection

### `oriented_bounding_box_intersection(a, b)`
Detects collision using Separating Axis Theorem (SAT).
- **15 separating axes:** 3 from box A, 3 from box B, 9 cross-products
- **Returns:** Boolean (true if collision)

**world_bounding structure:**
```javascript
{
  center: [x, y, z],                    // World space center
  axes: [[x,y,z], [x,y,z], [x,y,z]],   // Three orthonormal axes
  halfsize: [hx, hy, hz]                // Half-extents
}
```

---

## 4. generation_util.js - Procedural Generation

### Poisson Disc Sampling

#### `get_spaced_points(bounds, min_spacing, attempts, max_points, is3D)`
Generates evenly spaced points.
- **Algorithm:** Spatial grid for fast neighbor lookup, annulus sampling
- **Cell size:** `min_spacing / sqrt(is3D ? 3 : 2)`

### Perlin Noise

#### `perlin_noise(input_x, input_y)`
Computes 2D Perlin noise.
- **Returns:** Float in range approximately [-1, 1]
- **Algorithm:** Gradient vectors at 4 corners, bilinear interpolation with fade curve

#### `fade(t)`
Smoothstep curve: `6t^5 - 15t^4 + 10t^3`

---

## 5. material_data.js - Materials

### Material Structure
```javascript
{
  Ka: 0.0-1.0,              // Ambient coefficient
  Kd: 0.0-1.0,              // Diffuse coefficient
  Ks: 0.0-1.0+,             // Specular coefficient
  alpha: 1-1000+,           // Specular exponent (shininess)
  color: [r, g, b],         // RGB in [0, 1]
  bumpOn: boolean,          // Bump mapping enabled
  textureScale: [u, v]      // Optional UV scaling
}
```

### Key Materials
| Material | Purpose | Key Properties |
|----------|---------|----------------|
| `blue_material` | Platforms | Kd=0.2, Ks=0.05, blue |
| `lava_material` | Lava sea | Ka=0.6, Ks=1.2, animated |
| `metal_blue_material` | Refuel stations | Ks=0.9, alpha=500 |
| `goal_arrow_green_material` | Pickup arrow | Ks=0.9, bright green |
| `goal_arrow_yellow_material` | Dropoff arrow | Ks=0.9, yellow |
| `snow_material` | Mountain terrain | Kd=0.3, white |
| `grass_material` | Brick level terrain | Kd=0.5, green |

---

## 6. Shader Programs

### Main Vertex Shader

**Inputs:**
- `aPosition`, `aColor`, `aNormal`, `aTexCoord`, `aTangent`

**Process:**
1. Transform position: `position = MV * MTM * aPosition`
2. Compute normal matrix: `transpose(inverse(mat3(MV * MTM)))`
3. Orthogonalize tangent via Gram-Schmidt
4. Project to clip space

### Main Fragment Shader

**Blinn-Phong Lighting:**
```glsl
diffuse = Kd * max(dot(N, L), 0)
specular = Ks * pow(max(dot(V, R), 0), alpha)
ambient = Ka * light_color
final = ambient + diffuse + specular
```

**Bump Mapping:**
1. Sample height map (red channel)
2. Compute finite differences for normal perturbation
3. Transform to view space via TBN matrix

### CRT Fragment Shader

**Effects Applied:**
1. **Barrel distortion:** Curved screen simulation
2. **Black borders:** Out-of-bounds rejection
3. **Chromatic aberration:** RGB channel offset (±0.002)
4. **Scanlines:** `sin(uv.y * resolution.y * 1.5) * 0.04`
5. **Vertical lines:** `sin(uv.x * resolution.x * 1.5) * 0.02`
6. **Vignette:** Edge darkening
7. **Flicker:** `0.95 + 0.05 * sin(time * 10)`

### Retro Fragment Shader

**Constants:**
- `PIXEL_SIZE`: 4.0
- `COLOR_LEVELS`: 16.0
- `BLOOM_THRESHOLD`: 0.6
- `BLOOM_INTENSITY`: 0.3

**Uniforms:**
- `uScreen`: sampler2D - Scene render texture
- `uResolution`: vec2 - Canvas dimensions
- `uTime`: float - Elapsed time for animation
- `uRainIntensity`: float - Rain effect strength (0.0-1.0+)
- `uSnowIntensity`: float - Snow effect strength (0.0-1.5)

**Effects:**
1. **Pixelation:** Snap UV to 4px grid
2. **Posterization:** Reduce to 16 colors per channel
3. **Bloom:** 5x5 kernel on bright pixels
4. **Color grading:** Warm tint (boost red, reduce blue), increased contrast
5. **Rain:** Multi-layer falling streaks (if uRainIntensity > 0)
6. **Snow:** Drifting particle effect (if uSnowIntensity > 0)

**Shader Functions:**

#### `float rand(vec2 co)`
Pseudo-random number generator.
- **Parameters:** 2D seed coordinates
- **Returns:** Float in [0, 1]
- **Formula:** `fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453)`

#### `float rain(vec2 uv, float time)`
Generates falling rain streaks effect.
- **Parameters:** UV coordinates, elapsed time
- **Returns:** Float intensity (0.0-1.0)
- **Algorithm:**
  1. 3 layers at different speeds (2.0, 2.5, 3.0)
  2. Each layer has different density (100, 80, 60 columns)
  3. Streaks created using smoothstep for elongated shape
  4. Random visibility per column using step function
  5. Slight horizontal drift using sin(time)

#### `float snow(vec2 uv, float time)`
Generates falling snowflake particles effect.
- **Parameters:** UV coordinates, elapsed time
- **Returns:** Float intensity (0.0-1.0)
- **Algorithm:**
  1. 4 layers at different speeds (0.3, 0.45, 0.6, 0.75)
  2. Grid-based particle placement (40-70 cells)
  3. Circular snowflakes using distance field
  4. Horizontal drift: `sin(time * 0.3 + uv.y * 2.0) * 0.05`
  5. Random visibility per grid cell

#### `vec2 pixelate(vec2 uv)`
Snaps UV to pixel grid for retro effect.
- **Returns:** Pixelated UV coordinates

#### `vec3 posterize(vec3 col)`
Reduces color depth to 16 levels per channel.
- **Returns:** Quantized color

#### `vec3 bloom(vec2 uv)`
Applies bloom to bright pixels.
- **Returns:** Bloom color contribution
- **Kernel:** 5x5 samples, threshold at 0.6 brightness

#### `vec3 retroColors(vec3 col)`
Applies retro color grading.
- Slight desaturation (mix with gray at 1.4)
- Red boost (1.1x), blue reduction (0.9x)
- Contrast increase: `(col - 0.5) * 1.2 + 0.5`
- Minimum brightness floor (0.05)

---

## 7. Scene Graph System (model_node.js)

### ModelNode Structure
```javascript
{
  local: mat4,              // Static inherited transform
  dynamic: mat4,            // Non-inherited animated transform
  world: mat4,              // Computed final world transform
  wtransform_cb: function,  // Dynamic transform callback
  children: [],             // Child nodes
  shape: Shape,             // Renderable geometry
  material: object,         // Material properties
  texture: object,          // Texture info
  bounding: object,         // Local space AABB
  world_bounding: object    // World space OBB
}
```

### Traversal Functions

#### `walk_update(node, mtm_stack, parent_world)`
Recursively updates world transforms and bounding boxes.
1. Apply inherited local transform
2. Call dynamic callback if present
3. Apply dynamic transform
4. Update oriented bounding box
5. Recurse on children

#### `walk_draw(node)`
Recursively draws scene graph.

---

## 8. Rendering Pipeline

```
Scene Graph
    │
    ▼
┌─────────────────┐
│ Main Shader     │──► Framebuffer 1
│ (Phong + Bump)  │
└─────────────────┘
    │
    ▼ (if retro enabled)
┌─────────────────┐
│ Retro Shader    │──► Framebuffer 2
│ (Pixelate+Bloom)│
└─────────────────┘
    │
    ▼ (if CRT enabled)
┌─────────────────┐
│ CRT Shader      │──► Screen
│ (Scanlines+Curve)
└─────────────────┘
```

---

## 9. Game Loop

```
render(now):
  1. Calculate delta time (capped at 50ms)
  2. Update game time
  3. Decay passenger fare (1$/second)
  4. update_taxi(dt)
     - Process input
     - Apply physics
     - Handle collisions
     - Check landing/crash
  5. Check death zone (lava)
  6. update_camera(dt)
  7. walk_update() - Update scene graph transforms
  8. Render to framebuffer (if post-processing)
  9. Apply retro effect (if enabled)
  10. Apply CRT effect (if enabled)
  11. requestAnimationFrame(render)
```

---

## 10. Physics Summary

| Property | Value |
|----------|-------|
| Gravity | 9.8 units/s² |
| Thrust Power | 18.0 units/s² |
| Forward Acceleration | 12.0 units/s² |
| Turn Speed | 1.5 rad/s |
| Max Horizontal Speed | 15.0 units/s |
| Max Vertical Speed | 12.0 units/s |
| Air Drag | 0.98 |
| Ground Drag | 0.90 |
| Crash Velocity | 12.0 units/s |

---

## 11. Level Progression

| Level | Deliveries Required |
|-------|---------------------|
| 1 | 2 |
| 2 | 2 |
| 3 | 3 |
| 4 | 3 |
| 5 | 4 |
| 6 | 4 |
| ... | +1 every 2 levels |

**Bonuses on level completion:**
- Bonus life (if lives < 5)
- Fuel restored to max
