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

// Camera data - 3D third-person camera rigidly attached to taxi
const camera = {
    // Camera position in world space
    pos: { x: 0, y: 10, z: -15 },
    // Look-at target (where camera points)
    lookAt: { x: 0, y: 5, z: 0 },
    // Camera offset from taxi (in taxi's local space)
    offsetBehind: 18,  // Distance behind taxi
    offsetUp: 8,       // Height above taxi
    lookAhead: 12,     // How far ahead of taxi to look
    // Zoom control
    zoomLevel: 1.0,
    targetZoom: 1.0,
};

function register_input() {
    // Zoom with mouse wheel
    addEventListener("wheel", (e) => {
        camera.targetZoom = Math.max(0.5, Math.min(2.0, camera.targetZoom + e.deltaY * 0.001));
    });
}

function update_camera(dt) {
    // Use taxiPhysics.position directly (more reliable than reading from matrix)
    const taxiX = taxiPhysics.position.x;
    const taxiY = taxiPhysics.position.y;
    const taxiZ = taxiPhysics.position.z;
    const taxiHeading = taxiPhysics.heading;

    // Smooth zoom only
    camera.zoomLevel += (camera.targetZoom - camera.zoomLevel) * 3.0 * dt;

    // Calculate forward direction from taxi heading
    const forwardX = Math.sin(taxiHeading);
    const forwardZ = Math.cos(taxiHeading);

    // Calculate camera position: fixed behind and above the taxi
    const distance = camera.offsetBehind * camera.zoomLevel;
    const height = camera.offsetUp * camera.zoomLevel;

    // Camera is rigidly attached BEHIND the taxi
    camera.pos.x = taxiX - forwardX * distance;
    camera.pos.z = taxiZ - forwardZ * distance;
    camera.pos.y = taxiY + height;

    // Camera looks AHEAD of the taxi (fixed, no interpolation)
    camera.lookAt.x = taxiX + forwardX * camera.lookAhead;
    camera.lookAt.z = taxiZ + forwardZ * camera.lookAhead;
    camera.lookAt.y = taxiY;
}

function compute_view_matrix() {
    // Standard OpenGL lookAt matrix
    const eyeX = camera.pos.x;
    const eyeY = camera.pos.y;
    const eyeZ = camera.pos.z;
    const targetX = camera.lookAt.x;
    const targetY = camera.lookAt.y;
    const targetZ = camera.lookAt.z;

    // Z axis = normalize(eye - target) - points away from target
    let zx = eyeX - targetX;
    let zy = eyeY - targetY;
    let zz = eyeZ - targetZ;
    let zLen = Math.sqrt(zx * zx + zy * zy + zz * zz);
    if (zLen > 0.0001) { zx /= zLen; zy /= zLen; zz /= zLen; }

    // X axis = normalize(cross(up, z))
    const upX = 0, upY = 1, upZ = 0;
    let xx = upY * zz - upZ * zy;
    let xy = upZ * zx - upX * zz;
    let xz = upX * zy - upY * zx;
    let xLen = Math.sqrt(xx * xx + xy * xy + xz * xz);
    if (xLen > 0.0001) { xx /= xLen; xy /= xLen; xz /= xLen; }

    // Y axis = cross(z, x)
    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    // Translation
    const tx = -(xx * eyeX + xy * eyeY + xz * eyeZ);
    const ty = -(yx * eyeX + yy * eyeY + yz * eyeZ);
    const tz = -(zx * eyeX + zy * eyeY + zz * eyeZ);

    // Column-major order
    return new Float32Array([
        xx, yx, zx, 0,
        xy, yy, zy, 0,
        xz, yz, zz, 0,
        tx, ty, tz, 1
    ]);
}

const projection = perspective(
    Math.PI / 4,
    canvas.width / canvas.height,
    0.1,
    200  // Increased far plane for larger play area
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

// Taxi physics state - 3D movement
const taxiPhysics = {
    // Position (stored separately for reliability)
    position: { x: 0, y: 15, z: -30 },  // Will be synced with taxi spawn position
    // 3D velocity
    velocity: { x: 0, y: 0, z: 0 },
    // Rotation
    heading: 0,           // Current heading (Y rotation) in radians
    turnSpeed: 2.5,       // Radians per second for A/D rotation
    // Movement parameters
    thrustPower: 18.0,    // Vertical thrust
    moveAccel: 12.0,      // Forward/backward acceleration
    gravity: 9.8,
    // Velocity limits
    maxVelocityY: 12.0,
    maxVelocityXZ: 15.0,  // Max horizontal speed
    // State
    onGround: false,
    // Drag coefficients
    airDrag: 0.98,
    groundDrag: 0.9,
};

// Game state
const gameState = {
    lives: 5,
    fuel: 100.0,  // 0-100
    maxFuel: 100.0,
    money: 0.00,
    time: 0.0,    // in seconds
    fuelConsumptionRate: 5.0,  // fuel per second when thrusting
    horizontalFuelRate: 3.0,   // fuel per second when using horizontal thrust
    refuelRate: 25.0,          // fuel per second when on refuel station
    isRefueling: false         // track if currently on refuel station
};

// UI update functions
function update_ui() {
    // Update money display
    document.getElementById("moneyDisplay").textContent = gameState.money.toFixed(2);

    // Update time display (format as M:SS)
    const minutes = Math.floor(gameState.time / 60);
    const seconds = Math.floor(gameState.time % 60);
    document.getElementById("timeDisplay").textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Update fuel bar
    const fuelPercent = (gameState.fuel / gameState.maxFuel) * 100;
    const fuelBar = document.getElementById("fuelBar");
    fuelBar.style.width = `${Math.max(0, fuelPercent)}%`;

    // Change fuel bar color when refueling
    if (gameState.isRefueling) {
        fuelBar.style.background = "linear-gradient(90deg, #00aaff, #00ffff)";  // Blue when refueling
    } else {
        fuelBar.style.background = "linear-gradient(90deg, #ff6600, #ffcc00)";  // Orange normally
    }

    // Update lives display
    const lifeIcons = document.querySelectorAll(".life-icon");
    lifeIcons.forEach((icon, index) => {
        if (index < gameState.lives) {
            icon.classList.remove("lost");
        } else {
            icon.classList.add("lost");
        }
    });
}

function consume_fuel(dt) {
    if (gameState.fuel <= 0) return false;

    let fuelUsed = 0;

    // Consume fuel for vertical thrust (Space/Shift)
    if (inputKeys.thrust) {
        fuelUsed += gameState.fuelConsumptionRate * dt;
    }

    // Consume fuel for forward/backward movement
    if (inputKeys.forward || inputKeys.backward) {
        fuelUsed += gameState.horizontalFuelRate * dt;
    }

    gameState.fuel = Math.max(0, gameState.fuel - fuelUsed);
    return gameState.fuel > 0;
}

function can_use_thrust() {
    return gameState.fuel > 0;
}

// Input state for 3D movement
const inputKeys = {
    forward: false,   // W or ArrowUp
    backward: false,  // S or ArrowDown
    left: false,      // A or ArrowLeft
    right: false,     // D or ArrowRight
    thrust: false,    // Space or Shift (vertical thrust)
    reset: false,     // R to reset level
};

function register_taxi_input() {
    document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") inputKeys.forward = true;
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") inputKeys.backward = true;
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") inputKeys.left = true;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") inputKeys.right = true;
        if (e.key === " " || e.key === "Shift") {
            inputKeys.thrust = true;
            e.preventDefault();  // Prevent page scroll on space
        }
        if (e.key === "r" || e.key === "R") {
            reset_taxi();
        }
    });

    document.addEventListener("keyup", (e) => {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") inputKeys.forward = false;
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") inputKeys.backward = false;
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") inputKeys.left = false;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") inputKeys.right = false;
        if (e.key === " " || e.key === "Shift") inputKeys.thrust = false;
    });
}

// Reset taxi position and lose a life
function reset_taxi() {
    if (gameState.lives <= 0) return;  // No lives left

    // Lose a life
    gameState.lives--;

    // Reset taxi position to spawn point
    taxiPhysics.position.x = 0;
    taxiPhysics.position.y = 15;
    taxiPhysics.position.z = -30;

    // Reset velocity
    taxiPhysics.velocity.x = 0;
    taxiPhysics.velocity.y = 0;
    taxiPhysics.velocity.z = 0;

    // Reset heading
    taxiPhysics.heading = 0;

    // Reset fuel
    gameState.fuel = gameState.maxFuel;
}

function update_taxi(dt) {
    if (!scene.taxi) return;

    // Consume fuel and check if thrust is available
    consume_fuel(dt);
    const hasFuel = can_use_thrust();

    // Use stored position
    let currentX = taxiPhysics.position.x;
    let currentY = taxiPhysics.position.y;
    let currentZ = taxiPhysics.position.z;

    // A/D rotate the taxi
    if (inputKeys.left) {
        taxiPhysics.heading += taxiPhysics.turnSpeed * dt;
    }
    if (inputKeys.right) {
        taxiPhysics.heading -= taxiPhysics.turnSpeed * dt;
    }

    // Keep heading in [-PI, PI]
    while (taxiPhysics.heading > Math.PI) taxiPhysics.heading -= 2 * Math.PI;
    while (taxiPhysics.heading < -Math.PI) taxiPhysics.heading += 2 * Math.PI;

    // Calculate forward direction from heading
    const forwardX = Math.sin(taxiPhysics.heading);
    const forwardZ = Math.cos(taxiPhysics.heading);

    // W/S move forward/backward in facing direction
    let moveInput = 0;
    if (inputKeys.forward) moveInput += 1;
    if (inputKeys.backward) moveInput -= 1;

    // Apply acceleration in facing direction
    let accelX = 0;
    let accelZ = 0;

    if (moveInput !== 0 && hasFuel) {
        accelX = forwardX * moveInput * taxiPhysics.moveAccel;
        accelZ = forwardZ * moveInput * taxiPhysics.moveAccel;
    }

    // Vertical thrust (Space/Shift) - only if has fuel
    let accelY = -taxiPhysics.gravity;
    if (inputKeys.thrust && hasFuel) {
        accelY = taxiPhysics.thrustPower - taxiPhysics.gravity;
    }

    // Update velocities
    taxiPhysics.velocity.x += accelX * dt;
    taxiPhysics.velocity.y += accelY * dt;
    taxiPhysics.velocity.z += accelZ * dt;

    // Apply drag
    const drag = taxiPhysics.onGround ? taxiPhysics.groundDrag : taxiPhysics.airDrag;
    taxiPhysics.velocity.x *= drag;
    taxiPhysics.velocity.z *= drag;

    // Clamp horizontal velocity
    const horizSpeed = Math.sqrt(taxiPhysics.velocity.x ** 2 + taxiPhysics.velocity.z ** 2);
    if (horizSpeed > taxiPhysics.maxVelocityXZ) {
        const scale = taxiPhysics.maxVelocityXZ / horizSpeed;
        taxiPhysics.velocity.x *= scale;
        taxiPhysics.velocity.z *= scale;
    }

    // Clamp vertical velocity
    taxiPhysics.velocity.y = Math.max(-taxiPhysics.maxVelocityY, Math.min(taxiPhysics.maxVelocityY, taxiPhysics.velocity.y));

    // Model rotation offset (taxi model faces +X, we want it to face forward direction)
    const modelRotOffset = Math.PI / 2;

    // Helper function to apply taxi transform
    function applyTaxiTransform(x, y, z) {
        const posMatrix = mat4Translate(mat4Identity(), [x, y, z]);
        const rotMatrix = mat4RotateY(mat4Identity(), taxiPhysics.heading + modelRotOffset);
        scene.taxi.local = multiplyMat4(posMatrix, rotMatrix);
    }

    // Apply current position for initial collision check
    applyTaxiTransform(currentX, currentY, currentZ);

    // Update bounding boxes for collision detection
    let stack = [];
    walk_update(scene.root, stack, mat4Identity());

    // Check for collisions with environment
    let collisions = check_taxi_collisions(scene.taxi, scene.root);

    taxiPhysics.onGround = false;
    gameState.isRefueling = false;

    // If currently colliding, check which direction to block
    if (collisions.length > 0) {
        for (let collision of collisions) {
            const taxiCenter = scene.taxi.world_bounding.center;

            // Check if taxi bottom is near object top (on ground)
            const taxiBottom = taxiCenter[1] - scene.taxi.world_bounding.halfsize[1];
            const objTop = collision.max[1];

            if (Math.abs(taxiBottom - objTop) < 0.3 && taxiPhysics.velocity.y <= 0) {
                taxiPhysics.onGround = true;
                taxiPhysics.velocity.y = 0;

                // Check if this is a refuel station
                if (collision.node && collision.node.isRefuelStation) {
                    gameState.isRefueling = true;
                }
            }
        }
    }

    // Try moving in Y direction
    let newY = currentY + taxiPhysics.velocity.y * dt;
    applyTaxiTransform(currentX, newY, currentZ);
    stack = [];
    walk_update(scene.root, stack, mat4Identity());
    collisions = check_taxi_collisions(scene.taxi, scene.root);

    if (collisions.length > 0) {
        newY = currentY;
        taxiPhysics.velocity.y = 0;
        taxiPhysics.onGround = true;
    }

    // Try moving in X direction
    let newX = currentX + taxiPhysics.velocity.x * dt;
    applyTaxiTransform(newX, newY, currentZ);
    stack = [];
    walk_update(scene.root, stack, mat4Identity());
    collisions = check_taxi_collisions(scene.taxi, scene.root);

    if (collisions.length > 0) {
        newX = currentX;
        taxiPhysics.velocity.x = 0;
    }

    // Try moving in Z direction
    let newZ = currentZ + taxiPhysics.velocity.z * dt;
    applyTaxiTransform(newX, newY, newZ);
    stack = [];
    walk_update(scene.root, stack, mat4Identity());
    collisions = check_taxi_collisions(scene.taxi, scene.root);

    if (collisions.length > 0) {
        newZ = currentZ;
        taxiPhysics.velocity.z = 0;
    }

    // Update stored position
    taxiPhysics.position.x = newX;
    taxiPhysics.position.y = newY;
    taxiPhysics.position.z = newZ;

    // Apply final transform
    applyTaxiTransform(newX, newY, newZ);

    // Refuel if on refuel station
    if (gameState.isRefueling && gameState.fuel < gameState.maxFuel) {
        gameState.fuel = Math.min(gameState.maxFuel, gameState.fuel + gameState.refuelRate * dt);
    }

    // Control flame visibility - thrust flame shows when using vertical thrust
    if (scene.taxi.thrustFlame) {
        const thrustScale = (inputKeys.thrust && hasFuel) ? 1.0 : 0.0;
        scene.taxi.thrustFlame.dynamic = mat4Scale(mat4Identity(), [0.4 * thrustScale, 0.5 * thrustScale, 0.3 * thrustScale]);
    }

    // Rear flame shows when moving forward
    if (scene.taxi.leftFlame) {
        const moveScale = (moveInput > 0 && hasFuel) ? 1.0 : 0.0;
        scene.taxi.leftFlame.dynamic = mat4Scale(mat4Identity(), [0.3 * moveScale, 0.4 * moveScale, 0.25 * moveScale]);
    }

    // Hide right flame (not used in 3D mode)
    if (scene.taxi.rightFlame) {
        scene.taxi.rightFlame.dynamic = mat4Scale(mat4Identity(), [0, 0, 0]);
    }
}

// Main rendering loop
let lastTime = performance.now();

function render(now) {
    const dt = (now - lastTime) / 1000.0;
    const elapsed = (now - startTime) / 1000.0;
    lastTime = now;

    // Update game time
    gameState.time = elapsed;

    // Update taxi first, then camera uses taxi's new position
    update_taxi(dt);
    update_camera(dt);
    scene_builder.update_lights();

    // Update UI
    update_ui();

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

// Initialize camera position based on taxi
function init_camera() {
    // Camera will be positioned on first update_camera call
    update_camera(0);
}

// init function calls
register_input();
register_taxi_input();
register_ui();

const startTime = performance.now();
window.onload = () => {
    init_camera();
    requestAnimationFrame(render);
};
