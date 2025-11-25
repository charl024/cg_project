function create_shader(gl, type, source) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
}

function create_program(gl, vsSource, fsSource) {
    let vs = create_shader(gl, gl.VERTEX_SHADER, vsSource);
    let fs = create_shader(gl, gl.FRAGMENT_SHADER, fsSource);
    let prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog));
    }
    return prog;
}

// WebGL setup
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl2");
if (!gl) alert("WebGL2 not supported");

const vertex_shader_src = document.getElementById("vertex-shader").textContent.trim();
const fragment_shader_src = document.getElementById("fragment-shader").textContent.trim();

let program, posLoc, colorLoc, uMVM, uPM, uMTM;
let uKa, uKd, uKs, uAlpha, uViewPos, uAttOn;
let uTex, uBumpStrength, uBumpOn, uTexOn;
let uLightPos1, uLightPos2, uLightColor1, uLightColor2;

const obj_uniforms = {
    uKa, 
    uKd, 
    uKs, 
    uAlpha,
    uBumpOn,
    uTexOn,
    uMTM
};

function init_shader_program() {
    try {
    program = create_program(gl, vertex_shader_src, fragment_shader_src);
    gl.useProgram(program);

    posLoc = gl.getAttribLocation(program, "aPosition");
    colorLoc = gl.getAttribLocation(program, "aColor");
    timeLoc = gl.getUniformLocation(program, "uTime");
    uMVM = gl.getUniformLocation(program, "uModelViewMatrix");
    uPM = gl.getUniformLocation(program, "uProjectionMatrix");
    obj_uniforms.uMTM = gl.getUniformLocation(program, "uModelTransformationMatrix");

    obj_uniforms.uKa = gl.getUniformLocation(program, "uKa");
    obj_uniforms.uKd = gl.getUniformLocation(program, "uKd");
    obj_uniforms.uKs = gl.getUniformLocation(program, "uKs");
    obj_uniforms.uAlpha = gl.getUniformLocation(program, "uAlpha");

    uLightPos1 = gl.getUniformLocation(program, "uLightPos1");
    uLightPos2 = gl.getUniformLocation(program, "uLightPos2");
    uLightColor1 = gl.getUniformLocation(program, "uLightColor1");
    uLightColor2 = gl.getUniformLocation(program, "uLightColor2");

    uViewPos = gl.getUniformLocation(program, "uViewPos");
    uAttOn = gl.getUniformLocation(program, "uAttBool")

    uTex = gl.getUniformLocation(program, "uTex");
    uTexOn = gl.getUniformLocation(program, "uTexOn");
    uBumpStrength = gl.getUniformLocation(program, "uBumpStrength");
    obj_uniforms.uBumpOn = gl.getUniformLocation(program, "uBumpOn");

    } catch (e) { 
        console.error(e); 
    }
}

init_shader_program();

// Mouse and keyboard interactions
let mouseDown = false, lastX, lastY, rotX = 0.1, rotY = 0.0;
let camX = 0, camY = 0, camZ = -5;

canvas.addEventListener('mousedown', e => {
    mouseDown = true;
    lastX = e.clientX; lastY = e.clientY;
});

canvas.addEventListener('mouseup', () => mouseDown = false);

canvas.addEventListener('mousemove', e => {
    if (!mouseDown) return;
    let dx = e.clientX - lastX;
    let dy = e.clientY - lastY;
    rotY += dx * 0.01;
    rotX += dy * 0.01;
    lastX = e.clientX; lastY = e.clientY;
});

// Keyboard controls for camera movement
const keys = {};
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

let targetZ = camZ;

addEventListener("wheel", (e) => {
    targetZ += (-1) * e.deltaY * 0.01;
});

function update_camera(dt) {
    const speed = 4.0;
    if (keys['w']) camY -= speed * dt;
    if (keys['s']) camY += speed * dt;
    if (keys['a']) camX += speed * dt;
    if (keys['d']) camX -= speed * dt;

    camZ += (targetZ - camZ) * 5 * dt;
}

// Projection matrix
let fov = Math.PI / 3, aspect = canvas.width / canvas.height, zNear = 0.1, zFar = 100;
let f = 1 / Math.tan(fov / 2);

let proj = perspective(fov, aspect, zNear, zFar);

// texture setup
// currently empty

// shape setup
const cube = makeShape(gl, program, cube_data, null, metal_orange_material);
const sphere = makeShape(gl, program, () => sphere_data(30, 30, 1), null, metal_red_material);

// Hierarchical model setup
let body_node = create_model_node(
    mat4Identity(),
    null,
    cube,
    obj_uniforms,
    {}
);

let head_node = create_model_node(
    mat4Translate(mat4Identity(), [0.0, 1.5, 0.0]),
    (mtm) => {
        let angle = Date.now() * 0.001 * spinrate;
        return multiplyMat4(mtm, mat4RotateY(mat4Identity(), angle));
    },
    cube,
    obj_uniforms,
    {}
);

add_children(body_node, head_node);

// lighting setup
let light_world_position1 = [0, 3, -5];
let light_world_position2 = [0, 3, 5];

let light_color1 = [0.7, 0.7, 0.7];
let light_color2 = [0.7, 0.7, 0.7];

let view_direction = [0, 0, 0];

// interactive ui variables
let spinrate = 0.1;
let bumpStrength = 100.0;
let oscillationrate = 1.0;

let temperatureLights = false;

document.getElementById("TLButton").addEventListener("click", () => {
    temperatureLights = !temperatureLights;
}); 

function update_lights_pos(angle) {
    light_world_position1 = [5 * Math.cos(angle), 5 * Math.sin(angle), 5];
    light_world_position2 = [-5 * Math.cos(angle), -5 * Math.sin(angle), -5];

    if (temperatureLights) {
        light_color1 = [1.0, 0.6, 0.4];
        light_color2 = [0.4, 0.6, 1.0];
    } else {
        light_color1 = [0.7, 0.7, 0.7];
        light_color2 = [0.7, 0.7, 0.7];
    }
}

// Animation loop
let last_time = Date.now();
let start_time = Date.now();

// rendering
function render() {
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // rotation matrices
    let cx = Math.cos(rotY), sx = Math.sin(rotY);
    let cy = Math.cos(rotX), sy = Math.sin(rotX);
    let rotX_mat = [1, 0, 0, 0, 0, cy, sy, 0, 0, -sy, cy, 0, 0, 0, 0, 1];
    let rotY_mat = [cx, 0, -sx, 0, 0, 1, 0, 0, sx, 0, cx, 0, 0, 0, 0, 1];
    let shape_rotation = multiplyMat4(rotY_mat, rotX_mat);

    // init model-view matrix as identity matrix
    let model_view_matrix = mat4Identity();
    
    // view transformations
    model_view_matrix = multiplyMat4(model_view_matrix, shape_rotation);
    model_view_matrix = mat4Translate(model_view_matrix, [camX, camY, camZ]);


    let model_transformation_matrix = mat4Identity();
    // model_transformation_matrix = multiplyMat4(model_transformation_matrix, shape_rotation);

    //delta time in ms
    let current_time = Date.now();
    let delta_time = (current_time - last_time)/1000.0;
    let elapsed_time = (current_time - start_time)/1000.0;
    last_time = current_time;
    update_camera(delta_time);
    update_lights_pos(elapsed_time);

    // set the uniforms
    gl.uniformMatrix4fv(uPM, false, proj);
    gl.uniformMatrix4fv(uMVM, false, model_view_matrix);
    // gl.uniformMatrix4fv(uMTM, false, model_transformation_matrix);

    gl.uniform3fv(uLightPos1, light_world_position1);
    gl.uniform3fv(uLightPos2, light_world_position2);
    gl.uniform3fv(uLightColor1, light_color1);
    gl.uniform3fv(uLightColor2, light_color2);

    gl.uniform3fv(uViewPos, view_direction);
    gl.uniform1f(uBumpStrength, bumpStrength);

    //set time in seconds
    gl.uniform1f(timeLoc, elapsed_time);

    // draw the model
    let mtm_stack = [];
    walk(body_node, mtm_stack, model_transformation_matrix);

    requestAnimationFrame(render);
}

// Initialize when page loads
window.onload = function () {
    requestAnimationFrame(render);
}