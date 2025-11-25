// Matrix functions
// Perspective matrix
function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
}

// Orthographic matrix
function ortho(left, right, bottom, top, near, far) {
    const lr = 1 / (left - right), bt = 1 / (bottom - top), nf = 1 / (near - far);
    return [-2*lr,0,0,0, 0,-2*bt,0,0, 0,0,2*nf,0, (left+right)*lr,(top+bottom)*bt,(far+near)*nf,1];
}

function apply_ortho(zoom, scale, aspect, zNear, zFar) {
    let scaled_left = zoom * -scale * aspect;
    let scaled_right = zoom * scale * aspect;
    let scaled_bottom = zoom * -scale;
    let scaled_top = zoom * scale;

    let proj = ortho(scaled_left, scaled_right, scaled_bottom, scaled_top, zNear, zFar);
    return proj;
}

// Identity matrix
function mat4Identity() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function mat4Copy(matrix) {
    return new Float32Array(matrix);
}

// Matrix translation
function mat4Translate(matrix, translation) {
    const result = new Float32Array(matrix);
    result[12] = matrix[0] * translation[0] + matrix[4] * translation[1] + matrix[8] * translation[2] + matrix[12];
    result[13] = matrix[1] * translation[0] + matrix[5] * translation[1] + matrix[9] * translation[2] + matrix[13];
    result[14] = matrix[2] * translation[0] + matrix[6] * translation[1] + matrix[10] * translation[2] + matrix[14];
    result[15] = matrix[3] * translation[0] + matrix[7] * translation[1] + matrix[11] * translation[2] + matrix[15];
    return result;
}

// Matrix rotation around X axis
function mat4RotateX(matrix, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const result = new Float32Array(matrix);

    const mv1 = matrix[4], mv5 = matrix[5], mv9 = matrix[6], mv13 = matrix[7];
    const mv2 = matrix[8], mv6 = matrix[9], mv10 = matrix[10], mv14 = matrix[11];

    result[4] = mv1 * c + mv2 * s;
    result[5] = mv5 * c + mv6 * s;
    result[6] = mv9 * c + mv10 * s;
    result[7] = mv13 * c + mv14 * s;
    result[8] = mv2 * c - mv1 * s;
    result[9] = mv6 * c - mv5 * s;
    result[10] = mv10 * c - mv9 * s;
    result[11] = mv14 * c - mv13 * s;

    return result;
}

// Matrix rotation around Y axis
function mat4RotateY(matrix, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const result = new Float32Array(matrix);

    const mv0 = matrix[0], mv4 = matrix[1], mv8 = matrix[2], mv12 = matrix[3];
    const mv2 = matrix[8], mv6 = matrix[9], mv10 = matrix[10], mv14 = matrix[11];

    result[0] = mv0 * c - mv2 * s;
    result[1] = mv4 * c - mv6 * s;
    result[2] = mv8 * c - mv10 * s;
    result[3] = mv12 * c - mv14 * s;
    result[8] = mv0 * s + mv2 * c;
    result[9] = mv4 * s + mv6 * c;
    result[10] = mv8 * s + mv10 * c;
    result[11] = mv12 * s + mv14 * c;

    return result;
}

function mat4RotateZ(matrix, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const rotz = new Float32Array([
        c,  s, 0, 0,
       -s,  c, 0, 0,
        0,  0, 1, 0,
        0,  0, 0, 1
    ]);

    result = multiplyMat4(matrix, rotz);
    return result;
}

// Matrix multiplication
function multiplyMat4(a, b) {
    let r = new Float32Array(16);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
            sum += a[k * 4 + i] * b[j * 4 + k]; 
        }
        r[j * 4 + i] = sum;
    }
    return r;
}

// scales a matrix
function mat4Scale(mat, scale) {
  const [sx, sy, sz] = scale;
  const result = [...mat];
  result[0] *= sx;
  result[1] *= sx;
  result[2] *= sx;
  result[3] *= sx;
  result[4] *= sy;
  result[5] *= sy;
  result[6] *= sy;
  result[7] *= sy;
  result[8] *= sz;
  result[9] *= sz;
  result[10] *= sz;
  result[11] *= sz;
  return result;
}

function norm(vector) {
    let denom = Math.sqrt(vector[0]*vector[0] + vector[1]*vector[1] + vector[2]*vector[2]);
    let new_vector = [];
    new_vector.push(vector[0]/denom, vector[1]/denom, vector[2]/denom);
    return new_vector;
}

function mat3Transpose(matrix) {
    let transposed_mat = [...Array(3*3)];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            transposed_mat[i * 3 + j] = matrix[j * 3 + i];
        }
    }
    return transposed_mat;
}

function mat4TransposeInner(matrix) {
    let transposed_mat = [
        matrix[0], matrix[4], matrix[8],
        matrix[1], matrix[5], matrix[9],
        matrix[2], matrix[6], matrix[10]
    ];

    return transposed_mat;
}