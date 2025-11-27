class Shape {
    constructor(gl, program, geometry) {
        this.gl = gl;
        this.program = program;

        this.vertices   = new Float32Array(geometry.vertices);
        this.indices    = new Uint16Array(geometry.indices);
        this.colors     = new Float32Array(geometry.colors);
        this.normals    = new Float32Array(geometry.normals);
        this.tex_coords = new Float32Array(geometry.tex_coords);
        this.tangents   = new Float32Array(geometry.tangents);

        this.buffer = new ShapeBuffer(gl, program, 
            this.vertices, this.indices, 
            this.colors, this.normals, 
            this.tex_coords, this.tangents
        );
    }

    draw(uniforms, material = {}, texture_info = null, mtm) {
        const gl = this.gl;

        const resolved_material = {
            Ka: material.Ka ?? 0.5,
            Kd: material.Kd ?? 0.5,
            Ks: material.Ks ?? 0.5,
            alpha: material.alpha ?? 10.0,
            color: material.color ?? [0.5, 0.5, 0.5],
            bumpOn: material.bumpOn ?? false
        };

        gl.useProgram(this.program);

        const has_texture = !!(texture_info && texture_info.texOn);

        if (has_texture) {
            if (texture_info.isVideo) {
                update_video_texture(gl, texture_info);
            }
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture_info.texture);
            gl.uniform1i(gl.getUniformLocation(this.program, "uTex"), 0);
        }
        
        gl.uniformMatrix4fv(uniforms.uMTM, false, mtm);
        gl.uniform1f(uniforms.uKa, resolved_material.Ka);
        gl.uniform1f(uniforms.uKd, resolved_material.Kd);
        gl.uniform1f(uniforms.uKs, resolved_material.Ks);
        gl.uniform1f(uniforms.uAlpha, resolved_material.alpha);
        gl.uniform1i(uniforms.uBumpOn, resolved_material.bumpOn ? 1 : 0);
        gl.uniform1i(uniforms.uTexOn, has_texture ? 1 : 0);
        gl.uniform3fv(uniforms.uMaterialColor, resolved_material.color);

        this.buffer.render();
    }
}

function create_texture(gl, tex_src) {
    if (!tex_src) return null;

    const texture = gl.createTexture();
    const texture_info = {
        texture,
        texOn: true,
        tex_img_src: tex_src,
        isVideo: false,
        video: null
    };

    if (typeof tex_src === "string") {
        const tex_img = new Image();
        tex_img.src = tex_src;
        tex_img.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex_img);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        };
    } else if (tex_src instanceof HTMLVideoElement) {
        texture_info.video = tex_src;
        texture_info.isVideo = true;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } else {
        texture_info.texOn = false;
    }

    return texture_info;
}

function update_video_texture(gl, texture_info) {
    if (!texture_info.isVideo) return;
    if (texture_info.video.readyState < 2) return;

    gl.bindTexture(gl.TEXTURE_2D, texture_info.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture_info.video);
}

function make_shape(gl, program, geometry_func, options = {}) {
    const geo = geometry_func();
    const baseColor = options.baseColor ?? [1.0, 1.0, 1.0];
    const colors = generate_colors(baseColor, geo.vertices.length / 3);
    geo.colors = colors;

    const vertexCount = geo.vertices.length / 3;
    geo.tex_coords = geo.tex_coords ?? new Float32Array(vertexCount * 2);
    geo.tangents = geo.tangents ?? new Float32Array(vertexCount * 3);
    geo.normals = geo.normals ?? new Float32Array(vertexCount * 3);

    return new Shape(gl, program, geo);
}
