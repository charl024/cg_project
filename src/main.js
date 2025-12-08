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
    // uLightPos1: gl.getUniformLocation(program, "uLightPos1"),
    // uLightPos2: gl.getUniformLocation(program, "uLightPos2"),
    uLightDir1: gl.getUniformLocation(program, "uLightDir1"),
    uLightDir2: gl.getUniformLocation(program, "uLightDir2"),
    uLightColor1: gl.getUniformLocation(program, "uLightColor1"),
    uLightColor2: gl.getUniformLocation(program, "uLightColor2"),
    uViewPos: gl.getUniformLocation(program, "uViewPos"),
    uBumpStrength: gl.getUniformLocation(program, "uBumpStrength"),
    uTex: gl.getUniformLocation(program, "uTex"),
    uTime: gl.getUniformLocation(program, "uTime"),
    uTexScale: gl.getUniformLocation(program, "uTexScale")
};

// Camera data - 3D third-person camera attached to taxi
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
    // gl.uniform3fv(global_uniforms.uLightPos1, scene.lights.pos1);
    // gl.uniform3fv(global_uniforms.uLightPos2, scene.lights.pos2);
    gl.uniform3fv(global_uniforms.uLightDir1, scene.lights.dir1);
    gl.uniform3fv(global_uniforms.uLightDir2, scene.lights.dir2);
    gl.uniform3fv(global_uniforms.uLightColor1, scene.lights.color1);
    gl.uniform3fv(global_uniforms.uLightColor2, scene.lights.color2);
    gl.uniform3fv(global_uniforms.uViewPos, scene.viewDirection);
    gl.uniform1f(global_uniforms.uBumpStrength, scene.bumpStrength);
    gl.uniform1f(global_uniforms.uTime, elapsed);
}

// Taxi physics state - 3D movement
const taxiPhysics = {
    // Position (stored separately for reliability) - will be initialized
    position: { x: 0, y: 0, z: 0 },
    // 3D velocity
    velocity: { x: 0, y: 0, z: 0 },
    // Rotation
    heading: 0,           // Current heading (Y rotation) in radians
    turnSpeed: 1.5,       // Radians per second for A/D rotation
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
    fuelConsumptionRate: 4.0,  // fuel per second when thrusting
    horizontalFuelRate: 2.0,   // fuel per second when using horizontal thrust
    refuelRate: 33.0,          // fuel per second when on refuel station
    isRefueling: false,        // track if currently on refuel station

    // Passenger system
    passenger: {
        hasPassenger: false,
        pickupTime: 0,          // time when passenger was picked up
        pickupPlatform: null,   // platform where passenger was picked up
        dropoffPlatform: null,  // destination platform
    },

    // Landing system
    landing: {
        lastLandingQuality: null,  // "perfect", "good", "ok", "rough", "crash"
        lastLandingVelocity: 0,
        showLandingFeedback: false,
        feedbackTimer: 0,
    },

    // Crash thresholds
    crashVelocity: 12.0,       // velocity above this = crash
    roughLandingVelocity: 8.0, // velocity above this = rough landing
    okLandingVelocity: 5.0,    // velocity above this = ok landing
    goodLandingVelocity: 3.0,  // velocity above this = good landing
    // below goodLandingVelocity = perfect landing

    // Level progression
    deliverCount: 0,
    deliverThreshold: 2,
    currentLevel: 1,
};

// UI update functions
function update_ui() {
    // Update money display
    document.getElementById("moneyDisplay").textContent = gameState.money.toFixed(2);

    // Update velocity display (magnitude of velocity vector)
    const velocity = Math.sqrt(
        taxiPhysics.velocity.x ** 2 +
        taxiPhysics.velocity.y ** 2 +
        taxiPhysics.velocity.z ** 2
    );
    document.getElementById("velocityDisplay").textContent = Math.round(velocity);

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

    // Update trip timer
    const tripTimer = document.getElementById("tripTimer");
    if (gameState.passenger.hasPassenger) {
        const tripTime = gameState.time - gameState.passenger.pickupTime;
        const tripSecs = Math.floor(tripTime);
        tripTimer.textContent = `${tripSecs}s`;
        // Color based on time (green to red as time increases)
        if (tripTime < 15) {
            tripTimer.style.color = "#00ff00";
        } else if (tripTime < 25) {
            tripTimer.style.color = "#ffff00";
        } else {
            tripTimer.style.color = "#ff6600";
        }
    } else {
        tripTimer.textContent = "--";
        tripTimer.style.color = "#888";
    }
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

// Calculate landing quality based on impact velocity
function calculate_landing_quality(impactVelocity) {
    const absVel = Math.abs(impactVelocity);

    if (absVel >= gameState.crashVelocity) {
        return "crash";
    } else if (absVel >= gameState.roughLandingVelocity) {
        return "rough";
    } else if (absVel >= gameState.okLandingVelocity) {
        return "ok";
    } else if (absVel >= gameState.goodLandingVelocity) {
        return "good";
    } else {
        return "perfect";
    }
}

// Get score multiplier based on landing quality
function get_landing_multiplier(quality) {
    switch (quality) {
        case "perfect": return 2.0;
        case "good": return 1.5;
        case "ok": return 1.0;
        case "rough": return 0.5;
        case "crash": return 0.0;
        default: return 1.0;
    }
}

// Handle a crash - lose a life and reset position (keep passenger!)
function handle_crash() {
    gameState.lives--;
    gameState.landing.lastLandingQuality = "crash";

    // Show crash animation
    show_crash_animation();

    // Reset taxi position (but keep passenger and trip timer running!)
    if (gameState.lives > 0) {
        // Reset to spawn position
        taxiPhysics.position.x = scene.level.spawn_position.x;
        taxiPhysics.position.y = scene.level.spawn_position.y;
        taxiPhysics.position.z = scene.level.spawn_position.z;
        taxiPhysics.velocity.x = 0;
        taxiPhysics.velocity.y = 0;
        taxiPhysics.velocity.z = 0;
        taxiPhysics.heading = 0;
    }
}

// Show crash animation overlay
function show_crash_animation() {
    const overlay = document.getElementById("crashOverlay");
    const text = document.getElementById("crashText");

    // Remove hidden class to show
    overlay.classList.remove("hidden");
    text.classList.remove("hidden");

    // Force animation restart by removing and re-adding elements
    overlay.style.animation = "none";
    text.style.animation = "none";
    // Trigger reflow
    overlay.offsetHeight;
    text.offsetHeight;
    overlay.style.animation = "";
    text.style.animation = "";

    // Hide after animation completes
    setTimeout(() => {
        overlay.classList.add("hidden");
        text.classList.add("hidden");
    }, 1200);
}

// Handle landing on a platform
function handle_landing(landingVelocity, landedPlatform) {
    const quality = calculate_landing_quality(landingVelocity);
    gameState.landing.lastLandingQuality = quality;
    gameState.landing.lastLandingVelocity = landingVelocity;

    if (quality === "crash") {
        handle_crash();
        return;
    }

    // Check if this is a pickup or dropoff platform
    if (landedPlatform) {
        if (landedPlatform.isPickupPlatform && !gameState.passenger.hasPassenger) {
            // Pick up passenger
            pickup_passenger(landedPlatform);
        } else if (landedPlatform.isDropoffPlatform && gameState.passenger.hasPassenger) {
            // Check if this is the correct dropoff location
            if (landedPlatform === gameState.passenger.dropoffPlatform) {
                // Deliver passenger
                deliver_passenger(quality);
            }
        }
    }
}

// Pick up a passenger from a platform
function pickup_passenger(platform) {
    gameState.passenger.hasPassenger = true;
    gameState.passenger.pickupTime = gameState.time;
    gameState.passenger.pickupPlatform = platform;

    // Find a random dropoff platform (different from pickup)
    const dropoffPlatform = scene_builder.get_random_dropoff_platform(platform);
    gameState.passenger.dropoffPlatform = dropoffPlatform;

    // Update the goal arrow to point to the dropoff location
    if (dropoffPlatform) {
        scene_builder.set_goal_arrow_target(dropoffPlatform);
    }

    console.log("Passenger picked up! Deliver to dropoff platform.");
}

// Deliver a passenger to their destination
function deliver_passenger(landingQuality) {
    const deliveryTime = gameState.time - gameState.passenger.pickupTime;
    const multiplier = get_landing_multiplier(landingQuality);

    // Base fare calculation: faster delivery = more money
    // Base fare of $10, bonus for fast delivery, multiplied by landing quality
    const baseFare = 10.0;
    const timeBonus = Math.max(0, 30 - deliveryTime) * 0.5; // $0.50 per second under 30s
    const totalFare = (baseFare + timeBonus) * multiplier;

    gameState.money += totalFare;

    console.log(`Passenger delivered! Time: ${deliveryTime.toFixed(1)}s, Quality: ${landingQuality}, Fare: $${totalFare.toFixed(2)}`);
    
    // count delivery
    gameState.deliverCount++;

    if (gameState.deliverCount >= gameState.deliverThreshold) {
        go_to_next_level();
    }

    // Reset passenger state
    gameState.passenger.hasPassenger = false;
    gameState.passenger.pickupPlatform = null;
    gameState.passenger.dropoffPlatform = null;

    // Set up next passenger (new pickup location)
    scene_builder.setup_next_passenger();
}

// Generate a new level
function generate_new_level() {
    // Regenerate the level and get new spawn position
    const newSpawnPos = scene_builder.regenerate_level();

    // Reset passenger state for new level
    gameState.passenger.hasPassenger = false;
    gameState.passenger.pickupPlatform = null;
    gameState.passenger.dropoffPlatform = null;
    gameState.passenger.pickupTime = 0;

    // Initialize with the new spawn position
    initialize_level(newSpawnPos);
    update_camera(0);
}

function go_to_next_level() {
    // advance to next level
    gameState.currentLevel++;
    gameState.deliverCount = 0;

    console.log("Advancing to next level:", gameState.currentLevel);

    // every two levels, increase deliver threshold (only after level 2!)
    if (gameState.currentLevel % 2 == 0 && gameState.currentLevel != 2) {
        gameState.deliverThreshold += 1;
        console.log(gameState.deliverThreshold);
    }

    generate_new_level();
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
        if (e.key === "n" || e.key === "N") {
            generate_new_level();
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

    // Reset taxi position to dynamic spawn point from level
    taxiPhysics.position.x = scene.level.spawn_position.x;
    taxiPhysics.position.y = scene.level.spawn_position.y;
    taxiPhysics.position.z = scene.level.spawn_position.z;

    // Reset velocity
    taxiPhysics.velocity.x = 0;
    taxiPhysics.velocity.y = 0;
    taxiPhysics.velocity.z = 0;

    // Reset heading
    taxiPhysics.heading = 0;

    // Reset fuel
    gameState.fuel = gameState.maxFuel;
}

// Initialize/reset taxi and game state to spawn position
function initialize_level(spawnPos) {
    // Set taxi to spawn position
    taxiPhysics.position.x = spawnPos.x;
    taxiPhysics.position.y = spawnPos.y;
    taxiPhysics.position.z = spawnPos.z;

    // Reset velocity
    taxiPhysics.velocity.x = 0;
    taxiPhysics.velocity.y = 0;
    taxiPhysics.velocity.z = 0;

    // Reset heading
    taxiPhysics.heading = 0;

    // Reset game state
    gameState.fuel = gameState.maxFuel;
    gameState.lives = 5;
    gameState.money = 0;

    // Reset timer
    startTime = performance.now();
    gameState.time = 0;
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

    // Clamp vertical velocity - only limit upward velocity, allow unlimited falling
    if (taxiPhysics.velocity.y > taxiPhysics.maxVelocityY) {
        taxiPhysics.velocity.y = taxiPhysics.maxVelocityY;
    }

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
    const wasOnGround = taxiPhysics.onGround;
    const impactVelocity = taxiPhysics.velocity.y;  // Store velocity before it gets reset
    taxiPhysics.onGround = false;
    gameState.isRefueling = false;
    let landedPlatform = null;

    // If currently colliding, check which direction to block
    for (let collision of collisions) {
        const taxiCenter = scene.taxi.world_bounding.center;

        // Check if taxi bottom is near object top (on ground)
        const taxiBottom = taxiCenter[1] - scene.taxi.world_bounding.halfsize[1];
        const objTop = collision.max[1];

        if (Math.abs(taxiBottom - objTop) < 0.3 && taxiPhysics.velocity.y <= 0) {
            taxiPhysics.onGround = true;
            taxiPhysics.velocity.y = 0;

            // Track which platform we landed on
            if (collision.node) {
                landedPlatform = collision.node;
                
                // Check if this is a refuel station
                if (collision.node.isRefuelStation) {
                    gameState.isRefueling = true;
                }
            }
            break; // ground hit detected
        }
    }

    // Detect landing (transition from air to ground)
    if (taxiPhysics.onGround && !wasOnGround && impactVelocity < -0.5) {
        handle_landing(impactVelocity, landedPlatform);
    }

    // Try moving in Y direction
    let newY = currentY + taxiPhysics.velocity.y * dt;
    applyTaxiTransform(currentX, newY, currentZ);
    stack = [];
    walk_update(scene.root, stack, mat4Identity());
    // collisions = check_taxi_collisions(scene.taxi, scene.root);

    // if (collisions.length > 0) {
    //     newY = currentY;
    //     taxiPhysics.velocity.y = 0;
    //     taxiPhysics.onGround = true;
    // }

    // Try moving in X direction
    let newX = currentX + taxiPhysics.velocity.x * dt;
    applyTaxiTransform(newX, newY, currentZ);
    stack = [];
    walk_update(scene.root, stack, mat4Identity());
    
    let colX = check_taxi_collisions(scene.taxi, scene.root);
    if (colX.length > 0) {
        newX = currentX;
        taxiPhysics.velocity.x = 0;
    }

    // Try moving in Z direction
    let newZ = currentZ + taxiPhysics.velocity.z * dt;
    applyTaxiTransform(newX, newY, newZ);
    stack = [];
    walk_update(scene.root, stack, mat4Identity());
    
    let colZ = check_taxi_collisions(scene.taxi, scene.root);
    if (colZ.length > 0) {
        newZ = currentZ;
        taxiPhysics.velocity.z = 0;
    }

    // Update stored position
    taxiPhysics.position.x = newX;
    taxiPhysics.position.y = newY;
    taxiPhysics.position.z = newZ;

    // Safety floor: if taxi falls below minimum Y, reset to spawn position
    const MINIMUM_Y = -20;
    if (newY < MINIMUM_Y) {
        taxiPhysics.position.x = scene.level.spawn_position.x;
        taxiPhysics.position.y = scene.level.spawn_position.y;
        taxiPhysics.position.z = scene.level.spawn_position.z;
        taxiPhysics.velocity.x = 0;
        taxiPhysics.velocity.y = 0;
        taxiPhysics.velocity.z = 0;
        newX = taxiPhysics.position.x;
        newY = taxiPhysics.position.y;
        newZ = taxiPhysics.position.z;
    }

    // Apply final transform
    applyTaxiTransform(newX, newY, newZ);

    // Refuel if on refuel station
    if (gameState.isRefueling && gameState.fuel < gameState.maxFuel) {
        gameState.fuel = Math.min(gameState.maxFuel, gameState.fuel + gameState.refuelRate * dt);
    }

    //  flame visibility logic
    // back thrust flame
    if (scene.taxi.thrustFlame1 && scene.taxi.thrustFlame2) {
        const thrustScale = (inputKeys.forward && hasFuel) ? 1.0 : 0.0;

        scene.taxi.thrustFlame1.dynamic = mat4Scale(
            mat4Identity(),
            [0.3 * thrustScale, 0.3 * thrustScale, 0.5 * thrustScale]
        );

        scene.taxi.thrustFlame2.dynamic = mat4Scale(
            mat4Identity(),
            [0.3 * thrustScale, 0.3 * thrustScale, 0.5 * thrustScale]
        );
    }

    // left flame, when turning right
    if (scene.taxi.leftFlame) {
        const flameScale = (inputKeys.left && hasFuel) ? 1.0 : 0.0;

        scene.taxi.leftFlame.dynamic = mat4Scale(
            mat4Identity(),
            [0.3 * flameScale, 0.4 * flameScale, 1.0 * flameScale]
        );
    }

    // right flame, when turning left
    if (scene.taxi.rightFlame) {
        const flameScale = (inputKeys.right && hasFuel) ? 1.0 : 0.0;

        scene.taxi.rightFlame.dynamic = mat4Scale(
            mat4Identity(),
            [0.3 * flameScale, 0.4 * flameScale, 1.0 * flameScale]
        );
    }
}

// Main rendering loop
let lastTime = performance.now();
let startTime = performance.now();

function render(now) {
    let dt = (now - lastTime) / 1000.0;

    if (dt > 0.05) dt = 0.016;

    const elapsed = (now - startTime) / 1000.0;
    lastTime = now;

    // Update game time
    gameState.time = elapsed;

    // Update taxi first, then camera uses taxi's new position
    scene.dt = dt;
    scene.time = elapsed;
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

window.onload = () => {
    // Generate initial level using the same logic as pressing 'n'
    // This ensures all resources are loaded before generating the level
    generate_new_level();

    init_camera();
    requestAnimationFrame(render);
};
