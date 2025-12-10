// webgl shader setup
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

// crt setup
const crt_vertex_src = document.getElementById("crt-vertex-shader").textContent.trim();
const crt_fragment_src = document.getElementById("crt-fragment-shader").textContent.trim();
const crtProgram = create_program(gl, crt_vertex_src, crt_fragment_src);

// retro setup
const retro_fragment_src = document.getElementById("retro-fragment-shader").textContent.trim();
const retroProgram = create_program(gl, crt_vertex_src, retro_fragment_src);

// effect states
let crtEnabled = true;
let retroEnabled = true;

// framebuffers for the other shaders
let framebuffer, renderTexture, depthBuffer;
let framebuffer2, renderTexture2;

function setupFramebuffer() {
    framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    renderTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, renderTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTexture, 0);

    depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    framebuffer2 = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer2);

    renderTexture2 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, renderTexture2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTexture2, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

let quadVAO, quadVBO;

// quad setup for textures for other shaders
function setupQuad() {
    const quadVertices = new Float32Array([
        -1.0,  1.0,    0.0, 1.0,
        -1.0, -1.0,    0.0, 0.0,
         1.0, -1.0,    1.0, 0.0,

        -1.0,  1.0,    0.0, 1.0,
         1.0, -1.0,    1.0, 0.0,
         1.0,  1.0,    1.0, 1.0
    ]);

    quadVAO = gl.createVertexArray();
    quadVBO = gl.createBuffer();

    gl.bindVertexArray(quadVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(crtProgram, "aPosition");
    const texLoc = gl.getAttribLocation(crtProgram, "aTexCoord");

    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);

    gl.bindVertexArray(null);
}

function renderCRTEffect(time, useSecondaryTexture = false) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(crtProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, useSecondaryTexture ? renderTexture2 : renderTexture);
    gl.uniform1i(gl.getUniformLocation(crtProgram, "uScreen"), 0);
    gl.uniform1f(gl.getUniformLocation(crtProgram, "uTime"), time);
    gl.uniform2f(gl.getUniformLocation(crtProgram, "uResolution"), canvas.width, canvas.height);

    gl.bindVertexArray(quadVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);

    // use main program
    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
}

function renderRetroEffect(time, outputToFramebuffer = false) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, outputToFramebuffer ? framebuffer2 : null);
    gl.disable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(retroProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, renderTexture);
    gl.uniform1i(gl.getUniformLocation(retroProgram, "uScreen"), 0);
    gl.uniform1f(gl.getUniformLocation(retroProgram, "uTime"), time);
    gl.uniform2f(gl.getUniformLocation(retroProgram, "uResolution"), canvas.width, canvas.height);

    gl.uniform1f(gl.getUniformLocation(retroProgram, "uRainIntensity"), scene_builder.get_rain_intensity());
    gl.uniform1f(gl.getUniformLocation(retroProgram, "uSnowIntensity"), scene_builder.get_snow_intensity());

    gl.bindVertexArray(quadVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);

    // use main program
    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
}

// initialize crt effect stuff
setupFramebuffer();
setupQuad();

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

const camera = {
    pos: { x: 0, y: 10, z: -15 },
    // look-at target
    lookAt: { x: 0, y: 5, z: 0 },
    // camera offset from taxi
    offsetBehind: 18,  // distance behind taxi
    offsetUp: 8,       // height above taxi
    lookAhead: 12,     // how far ahead of taxi to look
    // zoom control
    zoomLevel: 1.0,
    targetZoom: 2.0,
};

function register_input() {
    addEventListener("wheel", (e) => {
        camera.targetZoom = Math.max(0.5, Math.min(2.0, camera.targetZoom + e.deltaY * 0.001));
    });
}

function update_camera(dt) {
    const taxiX = taxiPhysics.position.x;
    const taxiY = taxiPhysics.position.y;
    const taxiZ = taxiPhysics.position.z;
    const taxiHeading = taxiPhysics.heading;

    camera.zoomLevel += (camera.targetZoom - camera.zoomLevel) * 3.0 * dt;

    // calculate forward direction from taxi heading
    const forwardX = Math.sin(taxiHeading);
    const forwardZ = Math.cos(taxiHeading);

    // calculate camera position
    const distance = camera.offsetBehind * camera.zoomLevel;
    const height = camera.offsetUp * camera.zoomLevel;

    camera.pos.x = taxiX - forwardX * distance;
    camera.pos.z = taxiZ - forwardZ * distance;
    camera.pos.y = taxiY + height;

    camera.lookAt.x = taxiX + forwardX * camera.lookAhead;
    camera.lookAt.z = taxiZ + forwardZ * camera.lookAhead;
    camera.lookAt.y = taxiY;
}

function compute_view_matrix() {
    const eyeX = camera.pos.x;
    const eyeY = camera.pos.y;
    const eyeZ = camera.pos.z;
    const targetX = camera.lookAt.x;
    const targetY = camera.lookAt.y;
    const targetZ = camera.lookAt.z;

    // z axis
    let zx = eyeX - targetX;
    let zy = eyeY - targetY;
    let zz = eyeZ - targetZ;
    let zLen = Math.sqrt(zx * zx + zy * zy + zz * zz);
    if (zLen > 0.0001) { zx /= zLen; zy /= zLen; zz /= zLen; }

    // x axis
    const upX = 0, upY = 1, upZ = 0;
    let xx = upY * zz - upZ * zy;
    let xy = upZ * zx - upX * zz;
    let xz = upX * zy - upY * zx;
    let xLen = Math.sqrt(xx * xx + xy * xy + xz * xz);
    if (xLen > 0.0001) { xx /= xLen; xy /= xLen; xz /= xLen; }

    // y axis
    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    // translation
    const tx = -(xx * eyeX + xy * eyeY + xz * eyeZ);
    const ty = -(yx * eyeX + yy * eyeY + yz * eyeZ);
    const tz = -(zx * eyeX + zy * eyeY + zz * eyeZ);

    // column-major order
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
    200
);

const scene_builder = create_scene(gl, program, uniforms);
const scene = scene_builder.state;

function set_global_uniforms(view, elapsed) {

    gl.uniformMatrix4fv(global_uniforms.uPM, false, projection);
    gl.uniformMatrix4fv(global_uniforms.uMVM, false, view);
    gl.uniform3fv(global_uniforms.uLightDir1, scene.lights.dir1);
    gl.uniform3fv(global_uniforms.uLightDir2, scene.lights.dir2);
    gl.uniform3fv(global_uniforms.uLightColor1, scene.lights.color1);
    gl.uniform3fv(global_uniforms.uLightColor2, scene.lights.color2);
    gl.uniform3fv(global_uniforms.uViewPos, scene.viewDirection);
    gl.uniform1f(global_uniforms.uBumpStrength, scene.bumpStrength);
    gl.uniform1f(global_uniforms.uTime, elapsed);
}

const taxiPhysics = {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    heading: 0,           // in radians
    turnSpeed: 1.5,       // radians per second
    thrustPower: 18.0,    // vertical thrust
    moveAccel: 12.0,      // forward/backward acceleration
    gravity: 9.8,
    maxVelocityY: 12.0,
    maxVelocityXZ: 18.0,  // max horizontal speed
    onGround: false,
    airDrag: 0.99,
    groundDrag: 0.9,
};

const gameState = {
    lives: 5,
    fuel: 100.0,  // 0-100
    maxFuel: 100.0,
    money: 0.00,
    time: 0.0,    // seconds
    fuelConsumptionRate: 4.0,  // fuel per second when thrusting
    horizontalFuelRate: 2.0,   // fuel per second when using horizontal thrust
    refuelRate: 33.0,          // fuel per second when on refuel station
    isRefueling: false,        // track if currently on refuel station
    isGameOver: false,

    passenger: {
        hasPassenger: false,
        pickupTime: 0,          // time when passenger was picked up
        pickupPlatform: null,   // platform where passenger was picked up
        dropoffPlatform: null,  // destination platform
        currentFare: 0,         // current fare (ticks down over time)
        fareDecayRate: 1.0,     // dollars per second decay
    },

    landing: {
        lastLandingQuality: null,  // "perfect", "good", "ok", "rough", "crash"
        lastLandingVelocity: 0,
        showLandingFeedback: false,
        feedbackTimer: 0,
    },

    crashVelocity: 12.0,       // velocity above this = crash
    roughLandingVelocity: 8.0, // velocity above this = rough landing
    okLandingVelocity: 5.0,    // velocity above this = ok landing
    goodLandingVelocity: 3.0,  // velocity above this = good landing
    // below goodlandingvelocity = perfect landing

    deliverCount: 0,
    deliverThreshold: 2,
    currentLevel: 1,
};

function update_ui() {
    document.getElementById("moneyDisplay").textContent = gameState.money.toFixed(2);

    const velocity = Math.sqrt(
        taxiPhysics.velocity.x ** 2 +
        taxiPhysics.velocity.y ** 2 +
        taxiPhysics.velocity.z ** 2
    );
    document.getElementById("velocityDisplay").textContent = Math.round(velocity);

    const fuelPercent = (gameState.fuel / gameState.maxFuel) * 100;
    const fuelBar = document.getElementById("fuelBar");
    fuelBar.style.width = `${Math.max(0, fuelPercent)}%`;

    if (gameState.isRefueling) {
        fuelBar.style.background = "linear-gradient(90deg, #00aaff, #00ffff)";  // blue when refueling
    } else {
        fuelBar.style.background = "linear-gradient(90deg, #ff6600, #ffcc00)";  // orange normally
    }

    const lifeIcons = document.querySelectorAll(".life-icon");
    lifeIcons.forEach((icon, index) => {
        if (index < gameState.lives) {
            icon.classList.remove("lost");
        } else {
            icon.classList.add("lost");
        }
    });

    const tripTimer = document.getElementById("tripTimer");
    if (gameState.passenger.hasPassenger) {
        const fare = gameState.passenger.currentFare;
        tripTimer.textContent = `$${fare.toFixed(2)}`;
        if (fare > 20) {
            tripTimer.style.color = "#00ff00";
        } else if (fare > 10) {
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

    if (inputKeys.thrust) {
        fuelUsed += gameState.fuelConsumptionRate * dt;
    }

    if (inputKeys.forward || inputKeys.backward) {
        fuelUsed += gameState.horizontalFuelRate * dt;
    }

    gameState.fuel = Math.max(0, gameState.fuel - fuelUsed);
    return gameState.fuel > 0;
}

function can_use_thrust() {
    return gameState.fuel > 0;
}

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

function handle_crash() {
    gameState.lives--;
    gameState.landing.lastLandingQuality = "crash";


    show_crash_animation();

    if (gameState.lives > 0) {
        taxiPhysics.position.x = scene.level.spawn_position.x;
        taxiPhysics.position.y = scene.level.spawn_position.y;
        taxiPhysics.position.z = scene.level.spawn_position.z;
        taxiPhysics.velocity.x = 0;
        taxiPhysics.velocity.y = 0;
        taxiPhysics.velocity.z = 0;
        taxiPhysics.heading = 0;

        gameState.fuel = gameState.maxFuel;

        gameState.passenger.hasPassenger = false;
        gameState.passenger.pickupPlatform = null;
        gameState.passenger.dropoffPlatform = null;
        gameState.passenger.currentFare = 0;

        scene_builder.setup_next_passenger();
    } else {
        trigger_game_over();
    }
}

function trigger_game_over() {
    gameState.isGameOver = true;

    taxiPhysics.velocity.x = 0;
    taxiPhysics.velocity.y = 0;
    taxiPhysics.velocity.z = 0;

    inputKeys.forward = false;
    inputKeys.backward = false;
    inputKeys.left = false;
    inputKeys.right = false;
    inputKeys.thrust = false;

    show_game_over_screen();
}


function show_crash_animation() {
    const overlay = document.getElementById("crashOverlay");
    const text = document.getElementById("crashText");

    overlay.classList.remove("hidden");
    text.classList.remove("hidden");

    overlay.style.animation = "none";
    text.style.animation = "none";
    overlay.offsetHeight;
    text.offsetHeight;
    overlay.style.animation = "";
    text.style.animation = "";

    setTimeout(() => {
        overlay.classList.add("hidden");
        text.classList.add("hidden");
    }, 1200);
}


function show_game_over_screen() {
    const overlay = document.getElementById("gameOverOverlay");
    const text = document.getElementById("gameOverText");

    overlay.classList.remove("hidden");
    text.classList.remove("hidden");


    overlay.style.animation = "none";
    text.style.animation = "none";
    overlay.offsetHeight; text.offsetHeight;
    overlay.style.animation = "";
    text.style.animation = "";
}



function show_level_advance_animation(level, bonusLife) {
    const overlay = document.getElementById("levelOverlay");
    const text = document.getElementById("levelText");
    const subtext = document.getElementById("levelSubtext");


    text.textContent = `LEVEL ${level}`;
    subtext.textContent = bonusLife ? "+1 LIFE" : "FUEL RESTORED";

    overlay.classList.remove("hidden");
    text.classList.remove("hidden");
    subtext.classList.remove("hidden");

    overlay.style.animation = "none";
    text.style.animation = "none";
    subtext.style.animation = "none";
    overlay.offsetHeight;
    text.offsetHeight;
    subtext.offsetHeight;
    overlay.style.animation = "";
    text.style.animation = "";
    subtext.style.animation = "";

    setTimeout(() => {
        overlay.classList.add("hidden");
        text.classList.add("hidden");
        subtext.classList.add("hidden");
    }, 2000);
}


function handle_landing(landingVelocity, landedPlatform) {
    const quality = calculate_landing_quality(landingVelocity);
    gameState.landing.lastLandingQuality = quality;
    gameState.landing.lastLandingVelocity = landingVelocity;

    if (quality === "crash") {
        handle_crash();
        return;
    }

    // check if this is a pickup or dropoff platform
    if (landedPlatform) {
        if (landedPlatform.isPickupPlatform && !gameState.passenger.hasPassenger) {
            // pick up passenger
            pickup_passenger(landedPlatform);
        } else if (landedPlatform.isDropoffPlatform && gameState.passenger.hasPassenger) {
            // check if this is the correct dropoff location
            if (landedPlatform === gameState.passenger.dropoffPlatform) {
                // deliver passenger
                deliver_passenger(quality);
            }
        }
    }
}


function pickup_passenger(platform) {
    gameState.passenger.hasPassenger = true;
    gameState.passenger.pickupTime = gameState.time;
    gameState.passenger.pickupPlatform = platform;


    gameState.passenger.currentFare = 20 + Math.random() * 10;

    const dropoffPlatform = scene_builder.get_random_dropoff_platform(platform);
    gameState.passenger.dropoffPlatform = dropoffPlatform;


    if (dropoffPlatform) {
        scene_builder.set_goal_arrow_target(dropoffPlatform);
    }

    console.log(`Passenger picked up! Fare: $${gameState.passenger.currentFare.toFixed(2)}`);
}


function deliver_passenger(landingQuality) {
    const deliveryTime = gameState.time - gameState.passenger.pickupTime;
    const multiplier = get_landing_multiplier(landingQuality);


    const totalFare = gameState.passenger.currentFare * multiplier;

    gameState.money += totalFare;

    console.log(`Passenger delivered! Time: ${deliveryTime.toFixed(1)}s, Quality: ${landingQuality}, Fare: $${totalFare.toFixed(2)}`);
    

    gameState.deliverCount++;

    if (gameState.deliverCount >= gameState.deliverThreshold) {
        go_to_next_level();
    }


    gameState.passenger.hasPassenger = false;
    gameState.passenger.pickupPlatform = null;
    gameState.passenger.dropoffPlatform = null;


    scene_builder.setup_next_passenger();
}


function generate_new_level() {

    const newSpawnPos = scene_builder.regenerate_level();


    gameState.passenger.hasPassenger = false;
    gameState.passenger.pickupPlatform = null;
    gameState.passenger.dropoffPlatform = null;
    gameState.passenger.pickupTime = 0;


    initialize_next_level(newSpawnPos);
    update_camera(0);
}

function go_to_next_level() {

    gameState.deliverCount = 0;

    console.log("Advancing to next level:", gameState.currentLevel);

    if (gameState.currentLevel % 2 == 0 && gameState.currentLevel != 2) {
        gameState.deliverThreshold += 1;
        console.log("New delivery threshold:", gameState.deliverThreshold);
    }

    const bonusLife = gameState.lives < 5 && gameState.currentLevel % 5 === 0;
    if (bonusLife) {
        gameState.lives++;
        console.log("Bonus life awarded! Lives:", gameState.lives);
    }

    gameState.currentLevel++;

    show_level_advance_animation(gameState.currentLevel, bonusLife);

    const savedVelocity = { ...taxiPhysics.velocity };
    taxiPhysics.velocity.x = 0;
    taxiPhysics.velocity.y = 0;
    taxiPhysics.velocity.z = 0;

    setTimeout(() => {
        generate_new_level();
    }, 1500);
}

const inputKeys = {
    forward: false,   // w or up
    backward: false,  // s or down
    left: false,      // a or left
    right: false,     // d or right
    thrust: false,    // space or shift
    reset: false,     // r
};

function register_taxi_input() {
    document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") inputKeys.forward = true;
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") inputKeys.backward = true;
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") inputKeys.left = true;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") inputKeys.right = true;
        if (e.key === " " || e.key === "Shift") {
            inputKeys.thrust = true;
            e.preventDefault();
        }
        if (e.key === "r" || e.key === "R") {
            reset_taxi();
        }
        if (e.key === "n" || e.key === "N") {
            generate_new_level();
        }
        if (e.key === "c" || e.key === "C") {
            // toggle retro and crt
            const newState = !crtEnabled;
            crtEnabled = newState;
            retroEnabled = newState;

            document.getElementById("crtOverlay").classList.toggle("active", newState);
            document.getElementById("gameWrapper").classList.toggle("crt-active", newState);

            console.log("Retro CRT mode:", newState ? "ON" : "OFF");
        }
        if (e.key === "t" || e.key === "T") {
            // cycle weather
            scene_builder.set_random_weather();
            console.log("Weather changed to:", scene_builder.get_weather_name());
        }
        if (e.key === "Enter" && gameState.isGameOver) {
            // restart game
            restart_game();
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

function restart_game() {
    gameState.isGameOver = false;
    gameState.lives = 5;
    gameState.money = 0;
    gameState.fuel = gameState.maxFuel;

    const spawnPos = scene.level.spawn_position;
    reset_taxi_to_spawn(spawnPos);

    startTime = performance.now();

    document.getElementById("gameOverOverlay").classList.add("hidden");
    document.getElementById("gameOverText").classList.add("hidden");
}

function reset_taxi() {
    if (gameState.lives <= 0) return;

    gameState.lives--;

    if (gameState.lives <= 0) {
        trigger_game_over();
        return;
    }

    taxiPhysics.position.x = scene.level.spawn_position.x;
    taxiPhysics.position.y = scene.level.spawn_position.y;
    taxiPhysics.position.z = scene.level.spawn_position.z;

    taxiPhysics.velocity.x = 0;
    taxiPhysics.velocity.y = 0;
    taxiPhysics.velocity.z = 0;

    taxiPhysics.heading = 0;

    gameState.fuel = gameState.maxFuel;
}

function reset_taxi_to_spawn(spawnPos) {
    taxiPhysics.position.x = spawnPos.x;
    taxiPhysics.position.y = spawnPos.y;
    taxiPhysics.position.z = spawnPos.z;
    taxiPhysics.velocity.x = 0;
    taxiPhysics.velocity.y = 0;
    taxiPhysics.velocity.z = 0;
    taxiPhysics.heading = 0;
    taxiPhysics.onGround = false;
}

function initialize_level(spawnPos) {
    reset_taxi_to_spawn(spawnPos);

    gameState.fuel = gameState.maxFuel;
    gameState.lives = 5;
    gameState.money = 0;

    startTime = performance.now();
    gameState.time = 0;
}

function initialize_next_level(spawnPos) {
    reset_taxi_to_spawn(spawnPos);

    gameState.fuel = gameState.maxFuel;
}

function update_taxi(dt) {
    if (!scene.taxi) return;

    consume_fuel(dt);
    const hasFuel = can_use_thrust();

    let currentX = taxiPhysics.position.x;
    let currentY = taxiPhysics.position.y;
    let currentZ = taxiPhysics.position.z;

    if (inputKeys.left) {
        taxiPhysics.heading += taxiPhysics.turnSpeed * dt;
    }
    if (inputKeys.right) {
        taxiPhysics.heading -= taxiPhysics.turnSpeed * dt;
    }

    while (taxiPhysics.heading > Math.PI) taxiPhysics.heading -= 2 * Math.PI;
    while (taxiPhysics.heading < -Math.PI) taxiPhysics.heading += 2 * Math.PI;

    const forwardX = Math.sin(taxiPhysics.heading);
    const forwardZ = Math.cos(taxiPhysics.heading);

    let moveInput = 0;
    if (inputKeys.forward) moveInput += 1;
    if (inputKeys.backward) moveInput -= 1;

    let accelX = 0;
    let accelZ = 0;

    if (moveInput !== 0 && hasFuel) {
        accelX = forwardX * moveInput * taxiPhysics.moveAccel;
        accelZ = forwardZ * moveInput * taxiPhysics.moveAccel;
    }

    let accelY = -taxiPhysics.gravity;
    if (inputKeys.thrust && hasFuel) {
        accelY = taxiPhysics.thrustPower - taxiPhysics.gravity;
    }

    taxiPhysics.velocity.x += accelX * dt;
    taxiPhysics.velocity.y += accelY * dt;
    taxiPhysics.velocity.z += accelZ * dt;

    const drag = taxiPhysics.onGround ? taxiPhysics.groundDrag : taxiPhysics.airDrag;
    taxiPhysics.velocity.x *= drag;
    taxiPhysics.velocity.z *= drag;

    const horizSpeed = Math.sqrt(taxiPhysics.velocity.x ** 2 + taxiPhysics.velocity.z ** 2);
    if (horizSpeed > taxiPhysics.maxVelocityXZ) {
        const scale = taxiPhysics.maxVelocityXZ / horizSpeed;
        taxiPhysics.velocity.x *= scale;
        taxiPhysics.velocity.z *= scale;
    }

    if (taxiPhysics.velocity.y > taxiPhysics.maxVelocityY) {
        taxiPhysics.velocity.y = taxiPhysics.maxVelocityY;
    }

    const modelRotOffset = Math.PI / 2;

    function applyTaxiTransform(x, y, z) {
        const posMatrix = mat4Translate(mat4Identity(), [x, y, z]);
        const rotMatrix = mat4RotateY(mat4Identity(), taxiPhysics.heading + modelRotOffset);
        scene.taxi.local = multiplyMat4(posMatrix, rotMatrix);
    }

    applyTaxiTransform(currentX, currentY, currentZ);

    let stack = [];
    walk_update(scene.root, stack, mat4Identity());

    // check for collisions
    const wasOnGround = taxiPhysics.onGround;
    const impactVelocity = Math.min(taxiPhysics.velocity.y, 0);  // downward only
    taxiPhysics.onGround = false;
    gameState.isRefueling = false;
    let landedPlatform = null;

    let newY = currentY + taxiPhysics.velocity.y * dt;

    applyTaxiTransform(currentX, newY, currentZ);
    stack = [];
    walk_update(scene.root, stack, mat4Identity());

    let colY = check_taxi_collisions(scene.taxi, scene.root);

    if (colY.length > 0) {
        const taxiCenter = scene.taxi.world_bounding.center;
        const taxiHalfY = scene.taxi.world_bounding.halfsize[1];
        const taxiBottom = taxiCenter[1] - taxiHalfY;

        for (let collision of colY) {
            const objTop = collision.max[1];

            if (taxiPhysics.velocity.y <= 0) {
                if (taxiBottom >= objTop - 0.4 && taxiBottom <= objTop + 0.4) {
                    taxiPhysics.onGround = true;
                    landedPlatform = collision.node || null;

                    if (collision.node && collision.node.isRefuelStation) {
                        gameState.isRefueling = true;
                    }

                    const desiredBottom = objTop;
                    const correction = (desiredBottom + taxiHalfY) - taxiCenter[1];
                    newY += correction;

                    taxiPhysics.velocity.y = 0;
                    break;
                }
            } else {
                newY = currentY;
                taxiPhysics.velocity.y = 0;
                break;
            }
        }

        applyTaxiTransform(currentX, newY, currentZ);
        stack = [];
        walk_update(scene.root, stack, mat4Identity());
    }

    // landing
    if (taxiPhysics.onGround) {
        if (!wasOnGround && impactVelocity < -0.5) {
            handle_landing(Math.abs(impactVelocity), landedPlatform);
        } else if (
            landedPlatform &&
            gameState.passenger.hasPassenger &&
            landedPlatform.isDropoffPlatform &&
            landedPlatform === gameState.passenger.dropoffPlatform
        ) {
            handle_landing(gameState.goodLandingVelocity, landedPlatform);
        }
    }

    let newX = currentX + taxiPhysics.velocity.x * dt;
    applyTaxiTransform(newX, newY, currentZ);
    stack = [];
    walk_update(scene.root, stack, mat4Identity());
    
    let colX = check_taxi_collisions(scene.taxi, scene.root);
    if (colX.length > 0) {
        newX = currentX;
        taxiPhysics.velocity.x = 0;
    }

    let newZ = currentZ + taxiPhysics.velocity.z * dt;
    applyTaxiTransform(newX, newY, newZ);
    stack = [];
    walk_update(scene.root, stack, mat4Identity());
    
    let colZ = check_taxi_collisions(scene.taxi, scene.root);
    if (colZ.length > 0) {
        newZ = currentZ;
        taxiPhysics.velocity.z = 0;
    }

    taxiPhysics.position.x = newX;
    taxiPhysics.position.y = newY;
    taxiPhysics.position.z = newZ;

    // reset if falls through ground
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

    applyTaxiTransform(newX, newY, newZ);

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

    if (scene.taxi.leftFlame) {
        const flameScale = (inputKeys.left && hasFuel) ? 1.0 : 0.0;

        scene.taxi.leftFlame.dynamic = mat4Scale(
            mat4Identity(),
            [0.3 * flameScale, 0.4 * flameScale, 1.0 * flameScale]
        );
    }

    if (scene.taxi.rightFlame) {
        const flameScale = (inputKeys.right && hasFuel) ? 1.0 : 0.0;

        scene.taxi.rightFlame.dynamic = mat4Scale(
            mat4Identity(),
            [0.3 * flameScale, 0.4 * flameScale, 1.0 * flameScale]
        );
    }
}

let lastTime = performance.now();
let startTime = performance.now();

function render(now) {
    let dt = (now - lastTime) / 1000.0;

    if (dt > 0.05) dt = 0.016;

    const elapsed = (now - startTime) / 1000.0;
    lastTime = now;

    if (gameState.isGameOver) {
        update_ui();
        return requestAnimationFrame(render);
    }

    gameState.time = elapsed;

    if (gameState.passenger.hasPassenger) {
        gameState.passenger.currentFare = Math.max(
            0,
            gameState.passenger.currentFare - gameState.passenger.fareDecayRate * dt
        );
    }

    scene.dt = dt;
    scene.time = elapsed;
    update_taxi(dt);

    if (taxiPhysics.position.y < scene.level.deathY && gameState.lives > 0) {
        handle_crash();
    }

    update_camera(dt);
    scene_builder.update_lights();

    update_ui();

    const stack = [];
    walk_update(scene.root, stack, mat4Identity());

    const needsPostProcess = crtEnabled || retroEnabled;

    if (needsPostProcess) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    }

    gl.enable(gl.DEPTH_TEST);
    // use weather sky color
    const skyColor = scene_builder.get_weather_sky_color();
    gl.clearColor(skyColor[0], skyColor[1], skyColor[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const view = compute_view_matrix();
    set_global_uniforms(view, elapsed);
    walk_draw(scene.root);

    if (retroEnabled && crtEnabled) {
        renderRetroEffect(elapsed, true);  // output to framebuffer2
        renderCRTEffect(elapsed, true);    // read from framebuffer2, output to screen
    } else if (retroEnabled) {
        renderRetroEffect(elapsed, false); // output directly to screen
    } else if (crtEnabled) {
        renderCRTEffect(elapsed, false);   // output directly to screen
    }

    requestAnimationFrame(render);
}

function init_camera() {
    update_camera(0);
}

register_input();
register_taxi_input();

window.onload = () => {
    generate_new_level();

    init_camera();
    requestAnimationFrame(render);
};
