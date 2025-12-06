# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WebGL2-based 3D graphics project built with vanilla JavaScript. It implements a scene graph system for rendering hierarchical 3D models with procedural level generation, collision detection, and camera controls.

## Project Goal

The goal is to create a WebGL 3D-rendered version of the classic Commodore 64 game **Space Taxi**. The project aims to faithfully recreate the original 2D side-scrolling gameplay while using 3D models for all visual elements. Players will navigate a taxi through procedurally generated platforms and obstacles in a 2.5D style - maintaining the classic side-scrolling playstyle of the original game but with modern 3D graphics rendering.

## Running the Project

This is a client-side only project with no build step. Simply open `index.html` in a web browser that supports WebGL2.

## Architecture

### Rendering Pipeline

The rendering loop in `src/main.js` follows this sequence:
1. `update_camera(dt)` - processes WASD movement and mouse rotation
2. `walk_update(scene.root, stack, mat4Identity())` - traverses scene graph to update world matrices and bounding boxes
3. `detect_collisions(scene.root)` - checks for oriented bounding box intersections
4. `set_global_uniforms(view, elapsed)` - uploads global shader uniforms (projection, view, lights)
5. `walk_draw(scene.root)` - traverses scene graph to render each node

### Scene Graph System

The scene graph is built using a hierarchical tree structure defined in `src/model_node.js`:

- **ModelNode** - contains transform matrices, shape, material, texture, and children
  - `local` - inherited transform (position/rotation) passed to children
  - `dynamic` - non-inherited transform (scale/animation) not passed to children
  - `world` - computed world transform = parent.world × local × dynamic
  - `wtransform_cb` - optional callback to compute dynamic animations

**Key functions:**
- `create_model_node(location, angle, scale, wtransform_cb, shape, uniforms, material, texture)` - creates a node
- `add_children(parent, child)` - attaches child node to parent
- `walk_update(node, stack, parent_world)` - recursively updates world matrices (call before rendering)
- `walk_draw(node)` - recursively renders nodes (call after walk_update)

### Building Scenes

Scene construction happens in `src/scene.js`:

1. Create textures with `create_texture(gl, "path/to/image.jpg")`
2. Create shapes with `make_shape(gl, program, geometry_func)` where geometry_func returns vertex data
3. Build the scene tree by creating nodes and linking them with `add_children(parent, child)`
4. Assign the root node to `state.root`

The scene is initialized via `create_scene(gl, program, uniforms)` which returns a builder object with the scene state.

### Procedural Generation

`src/generation_util.js` implements Poisson Disc Sampling for evenly-spaced point distribution:

- `get_spaced_points(bounds, min_spacing, attempts, max_points, is3D)`
  - `is3D=true`: generates 3D points (platforms in space)
  - `is3D=false`: generates 2D points on XZ plane (pillars from ground)
  - `bounds`: `{xmin, xmax, ymin, ymax, zmin, zmax}` defines generation volume
  - `min_spacing`: minimum distance between points

Used in `scene.js` for generating platform layouts.

### Collision Detection

`src/collision.js` implements Oriented Bounding Box (OBB) intersection testing:

- Each ModelNode has `bounding` (local AABB) and `world_bounding` (world-space OBB)
- `update_world_obb(node)` transforms local bounds to world space
- `oriented_bounding_box_intersection(a, b)` uses the Separating Axis Theorem
- `detect_collisions(root)` in `model_node.js` checks all node pairs

### Shapes and Materials

**Primitive shapes** (`src/primitives.js`):
- `cube_data()`, `sphere_data(rings, sectors, radius)`, `cone_data(...)` - return geometry objects

**Materials** (`src/material_data.js`):
- Predefined materials: `ground_material`, `metal_orange_material`, `metal_red_material`, etc.
- Properties: `Ka` (ambient), `Kd` (diffuse), `Ks` (specular), `alpha` (shininess), `color`, `bumpOn`

**Creating shapes:**
```javascript
const shape = make_shape(gl, program, cube_data);
```

### Camera Controls

- **Mouse drag**: rotate view (modifies `camera.rotX` and `camera.rotY`)
- **WASD**: move camera position in world space
- **Mouse wheel/trackpad scroll**: zoom forward/backward (modifies `camera.targetZ`)

Camera state and input handlers are in `src/main.js`.

### Shader System

Vertex and fragment shaders are embedded in `index.html` as script tags. The shader program is compiled in `src/main.js` with:

- `uniforms` - per-node uniforms (model transform, material properties)
- `global_uniforms` - per-frame uniforms (view, projection, lights)

The lighting model supports two lights with configurable positions and colors, including a "temperature lights" mode (warm/cool lighting).

### File Load Order

Scripts must be loaded in dependency order (as defined in `index.html`):
1. `material_data.js` - material definitions
2. `shapebuffer.js` - WebGL buffer management
3. `shape.js` - Shape class and texture creation
4. `primitives.js` - geometry generators
5. `transformations.js` - matrix utilities
6. `generation_util.js` - Poisson Disc sampling
7. `collision.js` - OBB intersection
8. `model_node.js` - scene graph nodes
9. `scene.js` - scene construction
10. `main.js` - rendering loop

## Common Patterns

### Adding a new object to the scene

Edit `src/scene.js`:
```javascript
const myNode = create_model_node(
    {x: 0, y: 0, z: 0},           // position
    {x: 0, y: 0, z: 0},           // rotation (radians)
    {x: 1, y: 1, z: 1},           // scale
    null,                          // animation callback (optional)
    shapes.cube,                   // shape
    uniforms,                      // uniform locations
    metal_orange_material,         // material
    textures.rusty_metal1          // texture (or null)
);
add_children(parent, myNode);
```

### Adding animation to a node

Provide a `wtransform_cb` function that returns the updated dynamic matrix:
```javascript
const animatedNode = create_model_node(
    {x: 0, y: 0, z: 0},
    {x: 0, y: 0, z: 0},
    {x: 1, y: 1, z: 1},
    (mtm) => {
        let mat = mat4Identity();
        mat = mat4Translate(mat, [0, 0.08 * Math.sin(Date.now() / 100), 0]);
        return multiplyMat4(mtm, mat);
    },
    shapes.sphere,
    uniforms,
    metal_red_material,
    null
);
```

### Transform inheritance rules

- Transforms in `node.local` are inherited by children (use for positioning parent-child relationships)
- Transforms in `node.dynamic` are NOT inherited by children (use for per-object scaling and animation)
- To position a node in the hierarchy: modify `initial_location` and `initial_angle` (sets `local`)
- To scale/animate a node: modify `initial_scale` or use `wtransform_cb` (sets `dynamic`)
