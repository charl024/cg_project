

class Shape {
    constructor(gl, program, geometry, tex_src, material = {}) {
        this.gl = gl;
        this.program = program;

        this.vertices   = new Float32Array(geometry.vertices);
        this.indices    = new Uint16Array(geometry.indices);
        this.colors     = new Float32Array(geometry.colors);
        this.normals    = new Float32Array(geometry.normals);
        this.tex_coords = new Float32Array(geometry.tex_coords);
        this.tangents   = new Float32Array(geometry.tangents);

        this.material = {
            Ka: material.Ka ?? 0.2,
            Kd: material.Kd ?? 0.5,
            Ks: material.Ks ?? 0.5,
            alpha: material.alpha ?? 10.0,
            color: material.color ?? [0.5, 0.5, 0.5],
            bumpOn: material.bumpOn ?? false
        };

        this.buffer = new ShapeBuffer(gl, program, 
            this.vertices, this.indices, 
            this.colors, this.normals, 
            this.tex_coords, this.tangents
        );

        this.tex_on = tex_src ? true : false;

        if (this.tex_on) {
            this.texture = gl.createTexture();
            this.tex_img_src = tex_src;
            this.isVideo = false;
            this.video = null;

            if (typeof tex_src === "string") {
                this.load_texture_src(tex_src);
            } 
            else if (tex_src instanceof HTMLVideoElement) {
                this.video = tex_src;
                this.isVideo = true;
                this.init_video_texture(tex_src);
            }
        }

        
    }

    load_texture_src(tex_src) {
        const tex_img = new Image();
        tex_img.src = tex_src;
        tex_img.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex_img);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        }
    }

    init_video_texture(tex_src) {
        const gl = this.gl;
        this.video = tex_src;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    update_video_frame() {
        const gl = this.gl;
        if (!this.isVideo) return;
        if (this.video.readyState < 2) return;

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);
    }

    draw(uniforms, mtm) {
        const gl = this.gl;

        

        gl.useProgram(this.program);

        if (this.tex_on) {
            this.update_video_frame();
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.uniform1i(gl.getUniformLocation(this.program, "uTex"), 0);
        }
        
        gl.uniformMatrix4fv(uniforms.uMTM, false, mtm);
        gl.uniform1f(uniforms.uKa, this.material.Ka);
        gl.uniform1f(uniforms.uKd, this.material.Kd);
        gl.uniform1f(uniforms.uKs, this.material.Ks);
        gl.uniform1f(uniforms.uAlpha, this.material.alpha);
        gl.uniform1f(uniforms.uBumpOn, this.material.bumpOn);
        gl.uniform1f(uniforms.uTexOn, this.tex_on);

        this.buffer.render();
    }
}

function makeShape(gl, program, geometry_func, tex_img_src, material) {
    const geo = geometry_func();
    const colors = generate_colors(material.color, geo.vertices.length / 3);
    geo.colors = colors;
    return new Shape(gl, program, geo, tex_img_src, material);
}