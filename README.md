# Computer Graphics Final Project

### Where are things, and how do I do things? 
Shapes are built via `make_shape`, materials come from `src/material_data.js`, textures from `create_texture`, and everything is glued together with `create_model_node`/`add_children` and rendered through `walk(state.root, ...)` in `main.js` after setting your root node in `scene.js`.

### Suggestions
Most of the stuff where you add an object to the scene is in `scene.js`, so start from there when building a scene. Take a look at main.js too, I spent a lot of time cleaning it up.

### What to work on
Currently, we need:
- Particle Physics
- More UI (especially keyboard controls)
- A way to have separate scene trees (should be able to just store the root of each tree in an array, so we loop through the array and call `walk()` for each root). This allows us to have two or more different objects disconnected from one another (ie. a car, and a wall).
- Improved Perspective/Camera view (maybe switch to isometric or something, cool 3D stuff)