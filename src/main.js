// WebGL shader setup
function create_shader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
}

function create_program(gl, vsSource, fsSource) {
    const vs = create_shader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = create_shader(gl, gl.FRAGMENT_SHADER, fsSource);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(prog));
    }
    return prog;
}

const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl2");
if (!gl) alert("WebGL2 not supported");

const vertex_shader_src = document.getElementById("vertex-shader").textContent.trim();
const fragment_shader_src = document.getElementById("fragment-shader").textContent.trim();

const program = create_program(gl, vertex_shader_src, fragment_shader_src);
gl.useProgram(program);

// Uniform locations for shapes
const uniforms = {
    uMTM: gl.getUniformLocation(program, "uModelTransformationMatrix"),
    uKa: gl.getUniformLocation(program, "uKa"),
    uKd: gl.getUniformLocation(program, "uKd"),
    uKs: gl.getUniformLocation(program, "uKs"),
    uAlpha: gl.getUniformLocation(program, "uAlpha"),
    uMaterialColor: gl.getUniformLocation(program, "uMaterialColor"),
    uBumpOn: gl.getUniformLocation(program, "uBumpOn"),
    uTexOn: gl.getUniformLocation(program, "uTexOn"),
};

const global_uniforms = {
    uMVM: gl.getUniformLocation(program, "uModelViewMatrix"),
    uPM: gl.getUniformLocation(program, "uProjectionMatrix"),
    uLightPos1: gl.getUniformLocation(program, "uLightPos1"),
    uLightPos2: gl.getUniformLocation(program, "uLightPos2"),
    uLightColor1: gl.getUniformLocation(program, "uLightColor1"),
    uLightColor2: gl.getUniformLocation(program, "uLightColor2"),
    uViewPos: gl.getUniformLocation(program, "uViewPos"),
    uBumpStrength: gl.getUniformLocation(program, "uBumpStrength"),
    uTex: gl.getUniformLocation(program, "uTex"),
    uTime: gl.getUniformLocation(program, "uTime"),
};

// Camera data - positioned for side-scrolling view
const camera = {
    rotX: 0.0,
    rotY: 0.0,
    pos: { x: 0, y: 0, z: -25 },
    targetZ: -25,
    keys: {},
    mouseDown: false,
    lastX: 0,
    lastY: 0,
};

function register_input() {
    canvas.addEventListener("mousedown", (e) => {
        camera.mouseDown = true;
        camera.lastX = e.clientX;
        camera.lastY = e.clientY;
    });

    canvas.addEventListener("mouseup", () => (camera.mouseDown = false));

    canvas.addEventListener("mousemove", (e) => {
        if (!camera.mouseDown) return;
        const dx = e.clientX - camera.lastX;
        const dy = e.clientY - camera.lastY;
        camera.rotY += dx * 0.01;
        camera.rotX += dy * 0.01;
        camera.lastX = e.clientX;
        camera.lastY = e.clientY;
    });

    document.addEventListener("keydown", (e) => (camera.keys[e.key] = true));
    document.addEventListener("keyup", (e) => (camera.keys[e.key] = false));

    addEventListener("wheel", (e) => {
        camera.targetZ += -1 * e.deltaY * 0.01;
    });
}

function update_camera(dt) {
    const speed = 4.0;
    if (camera.keys["w"]) camera.pos.y -= speed * dt;
    if (camera.keys["s"]) camera.pos.y += speed * dt;
    if (camera.keys["a"]) camera.pos.x += speed * dt;
    if (camera.keys["d"]) camera.pos.x -= speed * dt;

    camera.pos.z += (camera.targetZ - camera.pos.z) * 5 * dt;
}

function compute_view_matrix() {
    const cx = Math.cos(camera.rotY);
    const sx = Math.sin(camera.rotY);
    const cy = Math.cos(camera.rotX);
    const sy = Math.sin(camera.rotX);

    const rotXMat = [1, 0, 0, 0, 0, cy, sy, 0, 0, -sy, cy, 0, 0, 0, 0, 1];
    const rotYMat = [cx, 0, -sx, 0, 0, 1, 0, 0, sx, 0, cx, 0, 0, 0, 0, 1];
    const rotation = multiplyMat4(rotYMat, rotXMat);

    let view = mat4Identity();
    view = multiplyMat4(view, rotation);
    view = mat4Translate(view, [camera.pos.x, camera.pos.y, camera.pos.z]);
    return view;
}

const projection = perspective(
    Math.PI / 4,
    canvas.width / canvas.height,
    0.1,
    100
);

// Scene setup lives in scene.js
const scene_builder = create_scene(gl, program, uniforms);
const scene = scene_builder.state;

// UI setup
function register_ui() {
    document.getElementById("TLButton").addEventListener("click", () => {
        scene_builder.toggle_temperature_lights();
    });
}

function set_global_uniforms(view, elapsed) {

    gl.uniformMatrix4fv(global_uniforms.uPM, false, projection);
    gl.uniformMatrix4fv(global_uniforms.uMVM, false, view);
    gl.uniform3fv(global_uniforms.uLightPos1, scene.lights.pos1);
    gl.uniform3fv(global_uniforms.uLightPos2, scene.lights.pos2);
    gl.uniform3fv(global_uniforms.uLightColor1, scene.lights.color1);
    gl.uniform3fv(global_uniforms.uLightColor2, scene.lights.color2);
    gl.uniform3fv(global_uniforms.uViewPos, scene.viewDirection);
    gl.uniform1f(global_uniforms.uBumpStrength, scene.bumpStrength);
    gl.uniform1f(global_uniforms.uTime, elapsed);
}

// Taxi physics state
const taxiPhysics = {
    velocity: { x: 0, y: 0 },
    acceleration: { x: 0, y: 0 },
    thrustPower: 15.0,
    horizontalControl: 8.0,
    gravity: 9.8,
    maxVelocityY: 10.0,
    maxVelocityX: 8.0,
    onGround: false,
    facingRight: true  // Track which direction taxi is facing
};

// Arrow key input state
const arrowKeys = {
    up: false,
    down: false,
    left: false,
    right: false
};

function register_taxi_input() {
    document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") arrowKeys.up = true;
        if (e.key === "ArrowDown") arrowKeys.down = true;
        if (e.key === "ArrowLeft") arrowKeys.left = true;
        if (e.key === "ArrowRight") arrowKeys.right = true;
    });

    document.addEventListener("keyup", (e) => {
        if (e.key === "ArrowUp") arrowKeys.up = false;
        if (e.key === "ArrowDown") arrowKeys.down = false;
        if (e.key === "ArrowLeft") arrowKeys.left = false;
        if (e.key === "ArrowRight") arrowKeys.right = false;
    });
}

function update_taxi(dt) {
    if (!scene.taxi) return;

    // Get current taxi position from the transformation matrix
    const currentX = scene.taxi.local[12];
    const currentY = scene.taxi.local[13];

    // Reset horizontal acceleration
    taxiPhysics.acceleration.x = 0;

    // Horizontal controls (left/right arrow keys) - ONLY when airborne
    if (!taxiPhysics.onGround) {
        if (arrowKeys.left) {
            taxiPhysics.acceleration.x = -taxiPhysics.horizontalControl;
        }
        if (arrowKeys.right) {
            taxiPhysics.acceleration.x = taxiPhysics.horizontalControl;
        }
    }

    // Vertical controls (up arrow = thrust, counteracts gravity)
    if (arrowKeys.up) {
        taxiPhysics.acceleration.y = taxiPhysics.thrustPower - taxiPhysics.gravity;
    } else {
        taxiPhysics.acceleration.y = -taxiPhysics.gravity;
    }

    // Update velocity
    taxiPhysics.velocity.x += taxiPhysics.acceleration.x * dt;
    taxiPhysics.velocity.y += taxiPhysics.acceleration.y * dt;

    // Apply air drag to horizontal movement when airborne
    if (!taxiPhysics.onGround) {
        taxiPhysics.velocity.x *= 0.98;
    } else {
        // Stop horizontal movement when on ground
        taxiPhysics.velocity.x = 0;
    }

    // Clamp velocities
    taxiPhysics.velocity.x = Math.max(-taxiPhysics.maxVelocityX, Math.min(taxiPhysics.maxVelocityX, taxiPhysics.velocity.x));
    taxiPhysics.velocity.y = Math.max(-taxiPhysics.maxVelocityY, Math.min(taxiPhysics.maxVelocityY, taxiPhysics.velocity.y));

    // Update taxi position temporarily to check for collisions
    const flipRotation = taxiPhysics.facingRight ? 0 : Math.PI;
    let posMatrix = mat4Translate(mat4Identity(), [currentX, currentY, 0]);
    const rotMatrix = mat4RotateY(mat4Identity(), flipRotation);
    scene.taxi.local = multiplyMat4(posMatrix, rotMatrix);

    // Update bounding boxes for collision detection
    let stack = [];
    walk_update(scene.root, stack, mat4Identity());

    // Check for collisions with environment
    let collisions = check_taxi_collisions(scene.taxi, scene.root);

    taxiPhysics.onGround = false;

    // If currently colliding, check which direction to block
    if (collisions.length > 0) {
        for (let collision of collisions) {
            const taxiCenter = scene.taxi.world_bounding.center;
            const objCenter = collision.center;

            // Check if taxi bottom is near object top (on ground)
            const taxiBottom = taxiCenter[1] - scene.taxi.world_bounding.halfsize[1];
            const objTop = collision.max[1];

            if (Math.abs(taxiBottom - objTop) < 0.2 && taxiPhysics.velocity.y <= 0) {
                taxiPhysics.onGround = true;
                taxiPhysics.velocity.y = 0;
            }
        }
    }

    // Try moving in Y direction
    let newY = currentY + taxiPhysics.velocity.y * dt;
    posMatrix = mat4Translate(mat4Identity(), [currentX, newY, 0]);
    scene.taxi.local = multiplyMat4(posMatrix, rotMatrix);
    stack = [];
    walk_update(scene.root, stack, mat4Identity());
    collisions = check_taxi_collisions(scene.taxi, scene.root);

    if (collisions.length > 0) {
        // Block vertical movement
        newY = currentY;
        taxiPhysics.velocity.y = 0;
        taxiPhysics.onGround = true;
    }

    // Try moving in X direction
    let newX = currentX + taxiPhysics.velocity.x * dt;
    posMatrix = mat4Translate(mat4Identity(), [newX, newY, 0]);
    scene.taxi.local = multiplyMat4(posMatrix, rotMatrix);
    stack = [];
    walk_update(scene.root, stack, mat4Identity());
    collisions = check_taxi_collisions(scene.taxi, scene.root);

    if (collisions.length > 0) {
        // Block horizontal movement
        newX = currentX;
        taxiPhysics.velocity.x = 0;
    }

    // Apply final position
    posMatrix = mat4Translate(mat4Identity(), [newX, newY, 0]);
    scene.taxi.local = multiplyMat4(posMatrix, rotMatrix);

    // Update taxi facing direction based on input
    if (arrowKeys.left && !taxiPhysics.onGround) {
        taxiPhysics.facingRight = false;
    }
    if (arrowKeys.right && !taxiPhysics.onGround) {
        taxiPhysics.facingRight = true;
    }

    // Control flame visibility using scale (0 = hidden, 1 = visible)
    if (scene.taxi.thrustFlame) {
        const thrustScale = arrowKeys.up ? 1.0 : 0.0;
        scene.taxi.thrustFlame.dynamic = mat4Scale(mat4Identity(), [0.4 * thrustScale, 0.5 * thrustScale, 0.3 * thrustScale]);
    }
    if (scene.taxi.leftFlame) {
        const leftScale = (arrowKeys.right && !taxiPhysics.onGround) ? 1.0 : 0.0;
        scene.taxi.leftFlame.dynamic = mat4Scale(mat4Identity(), [0.4 * leftScale, 0.5 * leftScale, 0.3 * leftScale]);
    }
    if (scene.taxi.rightFlame) {
        const rightScale = (arrowKeys.left && !taxiPhysics.onGround) ? 1.0 : 0.0;
        scene.taxi.rightFlame.dynamic = mat4Scale(mat4Identity(), [0.4 * rightScale, 0.5 * rightScale, 0.3 * rightScale]);
    }
}

// Main rendering loop
let lastTime = performance.now();

function render(now) {
    const dt = (now - lastTime) / 1000.0;
    const elapsed = (now - startTime) / 1000.0;
    lastTime = now;

    update_camera(dt);
    update_taxi(dt);
    scene_builder.update_lights();

    // Final update pass for rendering
    const stack = [];
    walk_update(scene.root, stack, mat4Identity());

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const view = compute_view_matrix();
    set_global_uniforms(view, elapsed);
    walk_draw(scene.root);

    requestAnimationFrame(render);
}

// init function calls
register_input();
register_taxi_input();
register_ui();

const startTime = performance.now();
window.onload = () => {
    requestAnimationFrame(render);
};
