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

const globalUniforms = {
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

// Camera data
const camera = {
    rotX: 0.1,
    rotY: 0.0,
    pos: { x: 0, y: 0, z: -5 },
    targetZ: -5,
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

// Main rendering loop
let lastTime = performance.now();

function render(now) {
    const dt = (now - lastTime) / 1000.0;
    const elapsed = (now - startTime) / 1000.0;
    lastTime = now;

    update_camera(dt);
    scene_builder.update_lights();

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const view = compute_view_matrix();
    const modelTransform = mat4Identity();

    gl.uniformMatrix4fv(globalUniforms.uPM, false, projection);
    gl.uniformMatrix4fv(globalUniforms.uMVM, false, view);
    gl.uniform3fv(globalUniforms.uLightPos1, scene.lights.pos1);
    gl.uniform3fv(globalUniforms.uLightPos2, scene.lights.pos2);
    gl.uniform3fv(globalUniforms.uLightColor1, scene.lights.color1);
    gl.uniform3fv(globalUniforms.uLightColor2, scene.lights.color2);
    gl.uniform3fv(globalUniforms.uViewPos, scene.viewDirection);
    gl.uniform1f(globalUniforms.uBumpStrength, scene.bumpStrength);
    gl.uniform1f(globalUniforms.uTime, elapsed);

    const stack = [];
    walk(scene.root, stack, modelTransform);

    requestAnimationFrame(render);
}

// init function calls
register_input();
register_ui();

const startTime = performance.now();
window.onload = () => {
    requestAnimationFrame(render);
};
