# Computer Graphics Final Project

## Project Goal

Create a WebGL 3D-rendered version of the classic Commodore 64 game **Space Taxi**. The game will maintain the original 2D side-scrolling gameplay mechanics while using 3D models for all visual elements (2.5D style).

### Where are things, and how do I do things?
Shapes are built via `make_shape`, materials come from `src/material_data.js`, textures from `create_texture`, and everything is glued together with `create_model_node`/`add_children` and rendered through `walk(state.root, ...)` in `main.js` after setting your root node in `scene.js`.

### Suggestions
Most of the stuff where you add an object to the scene is in `scene.js`, so start from there when building a scene. Take a look at main.js too, I spent a lot of time cleaning it up.

### Changelog

#### Latest Session Changes (UI System Implementation)
- **Game UI Overlay Created** (`index.html`):
  - Retro-styled UI bar positioned at bottom of canvas (brown/tan with green border)
  - Matches original Commodore 64 Space Taxi aesthetic
  - Positioned as absolute overlay on top of WebGL canvas
  - Z-indexed at 100 to stay on top

- **UI Components** (`index.html`):
  - **Money Display**: Shows current money with $ symbol (starts at $0.00)
  - **Lives Display**: 5 life indicators (gold circles that gray out when lost)
  - **Fuel Gauge**: Visual bar with E (Empty) to F (Full) markers
    - Gradient bar: red (empty) → yellow (half) → green (full)
    - Real-time width updates based on fuel percentage
  - **Time Display**: Game time in M:SS format

- **Game State Tracking** (`src/main.js`):
  - `gameState` object added with:
    - `lives`: 5 starting lives
    - `fuel`: 100.0 (0-100 range)
    - `money`: $0.00 starting cash
    - `time`: Elapsed game time in seconds
    - `fuelConsumptionRate`: 5 fuel/second for vertical thrust
    - `horizontalFuelRate`: 3 fuel/second for horizontal thrust

- **Fuel Mechanics** (`src/main.js`):
  - `consume_fuel(dt)`: Depletes fuel based on thrust usage
    - Up arrow: 5 fuel/second
    - Left/Right arrows (airborne): 3 fuel/second
  - `can_use_thrust()`: Checks if fuel is available
  - Taxi cannot thrust when fuel reaches 0
  - Thrust flames only visible when fuel is available
  - Integrated with existing taxi physics system

- **UI Update System** (`src/main.js`):
  - `update_ui()`: Updates all UI elements each frame
    - Money formatted to 2 decimal places
    - Time formatted as M:SS with zero-padded seconds
    - Fuel bar width dynamically adjusted (0-100%)
    - Lives icons toggled between active/lost states
  - Called every frame in render loop
  - Smooth fuel bar transitions via CSS

#### Previous Session Changes (Taxi Implementation)
- **Taxi Model Created** (`src/scene.js`):
  - Built 3D taxi using primitive shapes: yellow body and cabin, dark windshield, orange roof sign, 4 black cylinder wheels
  - Custom bounding box set to exclude flame effects from collision detection
  - Positioned at starting location (x: -6.0, y: 3.5, z: 0.0)

- **Camera Positioned for Side-Scrolling** (`src/main.js`):
  - Camera moved back to z: -25 for proper side view
  - Maintains existing mouse drag rotation and WASD movement controls

- **Arrow Key Controls Implemented** (`src/main.js`):
  - Arrow Up: Vertical thrust
  - Arrow Left/Right: Horizontal control (only works when airborne)
  - Separate input system from camera controls (WASD)

- **Taxi Physics System** (`src/main.js`):
  - Gravity: 9.8 units/s²
  - Thrust power: 15.0 units/s² (overcomes gravity when active)
  - Horizontal control: 8.0 units/s² (airborne only)
  - Max velocity: X=8.0, Y=10.0 units/s
  - Air drag on horizontal movement
  - Velocity stops when on ground

- **Taxi Orientation** (`src/main.js`):
  - Taxi flips 180° based on movement direction (like original Space Taxi)
  - Faces right by default, flips left when moving left
  - Uses Y-axis rotation (Math.PI)

- **Thrust Flame Effects** (`src/scene.js` + `src/main.js`):
  - Bottom flame (orange cone): Visible when Arrow Up pressed
  - Left side flame: Visible when moving right (Arrow Right + airborne)
  - Right side flame: Visible when moving left (Arrow Left + airborne)
  - Implemented via dynamic matrix scaling (scale 0-1 for hide/show)

- **Environment Collision System** (`src/main.js` + `src/model_node.js`):
  - `check_taxi_collisions()`: Checks taxi against all environment objects
  - `is_child_of()`: Prevents taxi from colliding with its own parts
  - Collision response: Blocks movement instead of repositioning
  - Tests Y and X movement separately each frame
  - Sets `onGround` flag when taxi bottom is near object top

#### Previous Changes
- Added collision detection between two different nodes. Check collision.js for bounding box logic.
- Added random platform generation within a given 3D space bound, using Poisson Disc sampling so that they're evenly spaced. Check generation_util.js for the code.

## What's Currently Implemented

### Core Rendering Systems
- **WebGL2 Shader Pipeline**: Phong lighting model with two lights, bump mapping, texture support
- **Scene Graph System** (`src/model_node.js`): Hierarchical transforms with `local` (inherited) and `dynamic` (non-inherited) matrices
- **Rendering Loop** (`src/main.js`): Two-pass system - `walk_update()` updates transforms/bounding boxes, then `walk_draw()` renders
- **Camera System**: Mouse drag rotation, WASD movement, mouse wheel zoom with smooth interpolation
- **Material System** (`src/material_data.js`): Predefined materials with ambient/diffuse/specular properties
- **Primitive Shapes** (`src/primitives.js`): Cube, sphere, cone, cylinder, pyramid with normals, tangents, and tex coords

### Game-Specific Systems
- **Player Taxi** (`src/scene.js`): 3D model built from primitives with custom bounding box
  - Yellow taxi body, cabin, windshield, roof sign, 4 wheels
  - Three thrust flame effects (bottom, left side, right side)
  - 180° orientation flip based on movement direction
- **Taxi Physics** (`src/main.js`): Full physics simulation system
  - Gravity (9.8), thrust (15.0), horizontal control (8.0)
  - Velocity clamping and air drag
  - Ground detection and onGround state
- **Input System** (`src/main.js`): Arrow key controls
  - Up: Thrust, Left/Right: Horizontal control (airborne only)
  - Separate from camera controls (WASD for camera)
- **Collision Detection** (`src/collision.js`, `src/model_node.js`): Oriented Bounding Box (OBB) intersection using Separating Axis Theorem
  - `check_taxi_collisions()`: Environment collision checks
  - Movement blocking instead of repositioning
  - Y and X axis tested separately each frame
- **Procedural Generation** (`src/generation_util.js`): Poisson Disc Sampling for evenly-spaced platforms
  - 3D mode: floating platforms in space
  - 2D mode: pillars/platforms on XZ plane (for side-scrolling levels)
- **Level Generation** (`src/scene.js`): Basic platform spawning system with configurable bounds
- **Game State System** (`src/main.js`): Tracks lives, fuel, money, and time
  - Fuel consumption based on thrust usage (5/sec vertical, 3/sec horizontal)
  - Fuel depletion prevents thrust when empty
  - Lives tracking (starts at 5)
  - Money accumulation system (starts at $0.00)
  - Time tracking from game start
- **UI/HUD System** (`index.html`, `src/main.js`): Retro-styled overlay display
  - HTML overlay positioned over WebGL canvas
  - Real-time fuel gauge with color gradient
  - Lives display with 5 life indicators
  - Money and time displays
  - CSS-styled to match Commodore 64 aesthetic
  - Frame-by-frame updates via `update_ui()`

### Math & Utilities
- **Transform Utilities** (`src/transformations.js`): Matrix operations, perspective/orthographic projection, vector math
- **Texture Loading** (`src/shape.js`): Image and video texture support with mipmapping

## TODO: Path to Space Taxi

### 1. Player Taxi Implementation
- [x] Design 3D taxi model (could use primitive shapes or load model)
- [x] Create taxi entity with position, velocity, rotation
- [x] Implement taxi physics
  - [x] Thrust mechanics (vertical boost)
  - [x] Horizontal momentum and air control
  - [x] Gravity
  - [x] Rotation controls (tilt left/right) - Implemented as 180° flip based on direction
- [x] Fuel system with consumption and refueling
  - [x] Fuel consumption based on thrust usage
  - [x] Prevent thrust when fuel depleted
  - [ ] Fuel refueling stations/pickups
- [x] Collision response (taxi hitting platforms/walls)

### 2. Side-Scrolling Camera System
- [ ] Lock camera to side view (2D plane, show 3D models)
- [ ] Camera follows taxi position
- [ ] Camera bounds (don't move outside level)
- [ ] Smooth camera tracking with optional lookahead

### 3. Level Design
- [ ] Design proper Space Taxi levels with:
  - [ ] Landing pads (start/destination)
  - [ ] Walls and obstacles
  - [ ] Narrow passages
  - [ ] Fuel stations
- [ ] Level data structure/format
- [ ] Level loader/parser
- [ ] Multiple level progression

### 4. Passenger & Objective System
- [ ] Passenger spawn locations (landing pads)
- [ ] Passenger pickup detection
- [ ] Passenger drop-off detection
- [ ] Objective tracking (pick up from A, deliver to B)
- [ ] Visual indicators for pickup/dropoff locations

### 5. Game States & UI
- [ ] Main menu state
- [ ] Playing state
- [ ] Pause state
- [ ] Game over state
- [ ] Level complete state
- [x] HUD overlay showing:
  - [x] Fuel gauge (visual bar with color gradient)
  - [x] Score/Money display
  - [x] Timer (M:SS format)
  - [ ] Current objective
  - [x] Lives/attempts remaining (5 life indicators)
- [x] UI rendering system (HTML overlay or WebGL text) - HTML overlay implemented

### 6. Input System Refinement
- [x] Map keyboard controls to taxi controls (thrust, left, right) - Arrow keys implemented
- [ ] Keyboard controls for menus
- [x] Input state management - Arrow key state tracking added
- [ ] Control configuration/rebinding

### 7. Visual Polish
- [x] Particle effects for:
  - [x] Taxi thrust/exhaust - Implemented as flame cones (bottom + side thrusters)
  - [ ] Collision sparks
  - [ ] Landing dust
- [x] Visual feedback for fuel low warning - Fuel gauge shows color gradient (red when low)
- [x] Smooth taxi rotation animation - 180° flip based on direction
- [ ] Landing pad highlight/animation

### 8. Audio
- [ ] Sound effects:
  - [ ] Thrust sound
  - [ ] Collision/crash
  - [ ] Pickup passenger
  - [ ] Drop off passenger
  - [ ] Low fuel warning
- [ ] Background music
- [ ] Audio system integration

### 9. Game Feel & Balance
- [ ] Tune physics constants (gravity, thrust power, etc.)
- [ ] Adjust fuel consumption rates
- [ ] Balance level difficulty progression
- [ ] Scoring system (time bonus, fuel bonus, etc.)
- [ ] Lives/retry system

### 10. Optional Enhancements
- [ ] Leaderboard/high scores
- [ ] Level editor
- [ ] Procedurally generated levels
- [ ] Different taxi types/upgrades
- [ ] Weather effects
- [ ] Day/night cycle

## How to Run

Due to browser CORS restrictions on local files, you must run a local web server:

```bash
python3 -m http.server 8000
```

Then open your browser to: `http://localhost:8000`

### Controls
- **Arrow Up**: Thrust (hold to fly, consumes fuel at 5/sec)
- **Arrow Left/Right**: Horizontal control (only works when airborne, consumes fuel at 3/sec)
- **WASD**: Move camera view
- **Mouse Drag**: Rotate camera
- **Mouse Wheel**: Zoom camera

### UI System

The game features a retro-styled HUD overlay positioned at the bottom of the screen, inspired by the original Commodore 64 Space Taxi:

**HUD Elements (Left to Right):**
1. **Money Display** (`$`): Shows current cash, starts at $0.00
   - Will increase when completing deliveries/objectives

2. **Lives Display**: Five circular indicators
   - Gold circles = lives remaining
   - Gray circles = lives lost
   - Starts with 5 lives

3. **Fuel Gauge** (`E ▬▬▬▬ F`): Visual fuel bar
   - E (Empty) on left, F (Full) on right
   - Color gradient: Red (low) → Yellow (medium) → Green (full)
   - Width adjusts in real-time as fuel is consumed
   - Fuel depletes when using thrust controls

4. **Time Display** (`TIME`): Game timer in M:SS format
   - Counts up from 0:00
   - Used for scoring/completion bonuses

**Fuel System:**
- Starts at 100% (full)
- Vertical thrust (↑): 5 fuel/second
- Horizontal thrust (← →): 3 fuel/second (airborne only)
- When fuel reaches 0, thrust is disabled
- Taxi flames disappear when out of fuel

**Technical Implementation:**
- HTML/CSS overlay positioned absolutely over WebGL canvas
- Updated every frame via `update_ui()` in main.js
- Smooth CSS transitions for fuel bar width changes
- Game state tracked in `gameState` object

### What to work on
Currently, we need:
- ~~Fuel system with consumption and refueling~~ ✓ **DONE** (consumption implemented, refueling stations still needed)
- ~~HUD overlay (fuel gauge, score, timer)~~ ✓ **DONE**
- Landing pads with passenger pickup/dropoff
- Proper level design (narrow passages, obstacles)
- Camera follow system (lock to taxi position)
- Game states (menu, playing, game over)
- Sound effects and audio integration

### Next Priority Tasks
1. **Camera Follow System**: Make camera track taxi position for proper side-scrolling gameplay
2. **Landing Pads**: Create designated landing zones for pickup/dropoff
3. **Passenger System**: Implement passenger spawning, pickup, and dropoff mechanics
4. **Fuel Refueling**: Add fuel stations or pickups to replenish fuel
5. **Level Design**: Create proper Space Taxi levels with narrow passages and obstacles
6. **Game States**: Implement menu, pause, and game over screens